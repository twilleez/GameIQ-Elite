import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyStripeSignature(raw: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.trim().split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  const expected = hex(signed);
  return signatures.some((sig) => safeEqual(sig, expected));
}

const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
const sql = postgres(dbUrl, { max: 1, prepare: false });
async function vaultSecret(name: string) {
  const rows = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name} limit 1`;
  return rows?.[0]?.decrypted_secret ? String(rows[0].decrypted_secret) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const webhookSecret = await vaultSecret("gameiq_stripe_webhook_secret");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceRole) return new Response("Server not configured", { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("stripe-signature") || "";
  if (!(await verifyStripeSignature(raw, signature, webhookSecret))) return new Response("Invalid signature", { status: 400 });

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const obj = event?.data?.object || {};

  try {
    if (event.type === "checkout.session.completed") {
      const profileId = obj.client_reference_id || obj.metadata?.profile_id;
      const plan = obj.metadata?.plan;
      if (profileId && plan === "pro") {
        const { error } = await supabase.from("profiles").update({ tier: "pro", stripe_customer_id: typeof obj.customer === "string" ? obj.customer : null }).eq("id", profileId);
        if (error) throw error;
      }
    }
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const profileId = obj.metadata?.profile_id;
      const plan = obj.metadata?.plan;
      if (profileId && plan === "pro") {
        const { error: subError } = await supabase.from("subscriptions").upsert({
          profile_id: profileId,
          stripe_subscription_id: obj.id,
          status: obj.status,
          price_id: obj.items?.data?.[0]?.price?.id || "",
          current_period_end: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : new Date(0).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });
        if (subError) throw subError;
        const active = ["active", "trialing"].includes(obj.status);
        const { error: profileError } = await supabase.from("profiles").update({ tier: active ? "pro" : "free" }).eq("id", profileId);
        if (profileError) throw profileError;
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const profileId = obj.metadata?.profile_id;
      if (profileId) {
        const { error: subError } = await supabase.from("subscriptions").upsert({
          profile_id: profileId,
          stripe_subscription_id: obj.id,
          status: obj.status || "canceled",
          price_id: obj.items?.data?.[0]?.price?.id || "",
          current_period_end: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : new Date(0).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_subscription_id" });
        if (subError) throw subError;
        const { error: profileError } = await supabase.from("profiles").update({ tier: "free" }).eq("id", profileId);
        if (profileError) throw profileError;
      }
    }
  } catch (error) {
    console.error("Stripe webhook processing error", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
