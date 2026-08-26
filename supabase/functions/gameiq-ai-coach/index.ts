import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getPublishableKey() {
  const modern = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (modern) {
    try { return JSON.parse(modern)?.default || ""; } catch { /* fall through */ }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publishableKey = getPublishableKey();
  if (!authHeader || !supabaseUrl || !publishableKey) return json({ error: "Authentication unavailable" }, 401);

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("tier")
    .single();

  if (profileError || !profile) return json({ error: "Unable to verify subscription" }, 403);
  if (profile.tier !== "pro" && profile.tier !== "team") return json({ error: "Pro subscription required" }, 403);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return json({ error: "AI service is not configured" }, 503);

  let payload: any;
  try { payload = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const message = String(payload?.message || "").trim();
  const context = String(payload?.context || "").trim();
  const history = Array.isArray(payload?.history) ? payload.history.slice(-8) : [];

  if (!message) return json({ error: "Message is required" }, 400);
  if (message.length > 1500 || context.length > 8000) return json({ error: "Request too large" }, 413);

  const messages = history
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
    .map((m: any) => ({ role: m.role, content: String(m.content || "").slice(0, 2000) }));
  messages.push({ role: "user", content: message });

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 900,
        thinking: { type: "disabled" },
        system: context || "You are GameIQ Elite, a concise basketball coaching assistant. Give specific, actionable advice grounded only in the supplied game data.",
        messages,
      }),
    });

    if (!aiRes.ok) {
      console.error("Anthropic error", aiRes.status, (await aiRes.text()).slice(0, 500));
      return json({ error: "AI provider request failed" }, 502);
    }

    const data = await aiRes.json();
    const reply = data?.content?.find((part: any) => part?.type === "text")?.text;
    if (!reply) return json({ error: "AI provider returned no text" }, 502);
    return json({ reply });
  } catch (error) {
    console.error("AI coach function error", error);
    return json({ error: "AI service unavailable" }, 503);
  }
});
