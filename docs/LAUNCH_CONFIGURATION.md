# GameIQ Elite — Launch Configuration

This file intentionally contains **secret names only, never secret values**. Production secrets belong in Supabase Edge Function Secrets, not GitHub or browser code.

## 1. Supabase Edge Function secrets

In the active GameIQ Supabase project (`vkefnajzxgdtovfjdctt`), configure these production secrets:

- `ANTHROPIC_API_KEY` — provider credential used only by `gameiq-ai-coach`.
- `STRIPE_SECRET_KEY` — Stripe server credential used only by billing functions.
- `STRIPE_PRO_PRICE_ID` — recurring Stripe Price for the launch Pro subscription shown in the application.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the Stripe webhook endpoint.
- `GAMEIQ_APP_URL` — optional explicit value `https://twilleez.github.io/GameIQ-Elite/` for Checkout return URLs.

Do not paste these values into `index.html`, GitHub issues, commits, logs, or customer support messages.

## 2. Stripe webhook

Configure Stripe to send subscription events to:

`https://vkefnajzxgdtovfjdctt.supabase.co/functions/v1/gameiq-stripe-webhook`

Required events for the current implementation:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the webhook endpoint's Stripe signing secret into Supabase as `STRIPE_WEBHOOK_SECRET`.

## 3. Launch plan scope

Only **Pro** is purchasable in the current production candidate. Program/Team functionality remains gated as beta/planned until Engineering and the Program Manager verify those workflows.

The UI currently displays Pro at `$9.99/month`. The Stripe Price configured as `STRIPE_PRO_PRICE_ID` must match the final approved price/currency/billing interval before PM sign-off.

## 4. Acceptance tests after configuration

The Program Manager must verify all of these against a real test account before merging:

1. Magic-link email arrives and creates/signs in the account.
2. The `profiles` trigger creates the user's profile at tier `free`.
3. A Free user cannot call hosted AI directly.
4. Pro Checkout opens only for a signed-in user.
5. Cancelling Checkout leaves the tier at `free`.
6. Completing Checkout causes Stripe webhook processing and changes the profile tier to `pro`.
7. A Pro user can receive a hosted AI Coach response.
8. Subscription cancellation/downgrade returns the profile tier to `free`.
9. Signing out immediately returns the browser to Free entitlement.
10. No provider, Stripe secret, service-role key, or secret Supabase key appears in browser source.

## 5. Release rule

Do not merge PR #1 until the configuration and end-to-end tests above pass and the remaining Design/Marketing PM gates are closed.
