# GameIQ Elite — Launch Configuration

This file intentionally contains **secret names only, never secret values**. Production credentials belong in Supabase Edge Function Secrets or Supabase Vault, never GitHub or browser code.

## 1. Supabase production configuration

Active project: `vkefnajzxgdtovfjdctt`.

Already configured in **Supabase Vault**:

- `gameiq_stripe_pro_price_id` — live recurring Pro Price ID.
- `gameiq_stripe_webhook_secret` — live Stripe webhook signing secret.

Still required before commercial launch:

- `ANTHROPIC_API_KEY` — provider credential used only by `gameiq-ai-coach`.
- A Stripe server API credential **only if** GameIQ retains API-created Checkout instead of a no-code Payment Link flow.
- Optional `GAMEIQ_APP_URL=https://twilleez.github.io/GameIQ-Elite/` if an explicit Checkout return URL is needed.

Do not paste credential values into `index.html`, GitHub issues, commits, logs, or customer support messages.

## 2. Stripe live configuration

Created:

- Product: **GameIQ Elite Pro**
- Price: **$9.99 USD / month**
- Production webhook endpoint: `https://vkefnajzxgdtovfjdctt.supabase.co/functions/v1/gameiq-stripe-webhook`

Webhook events enabled:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Verified account state:

- No active Customer Portal configuration exists yet.
- With Managed Payments disabled, no eligible live payment method is currently enabled for the launch checkout path.

Remaining Stripe account actions:

1. Activate at least one eligible live payment method in Stripe payment-method settings, normally Card, **or** make a deliberate Managed Payments + product tax-code decision.
2. Activate/configure the Stripe Customer Portal/no-code portal login so paid customers can update payment methods and cancel subscriptions.
3. Do not enable Stripe Tax or choose a SaaS tax code until the business's registration/classification decision is confirmed.

## 3. Server functions

- `gameiq-stripe-webhook` is deployed and reads its webhook signing secret from Supabase Vault.
- `gameiq-create-checkout` reads the live Pro Price from Vault and requires an authenticated user. It remains Pro-only.
- `gameiq-ai-coach` requires an authenticated paid tier before invoking the AI provider.

## 4. Auth verification

Supabase currently contains one Auth user and one matching `profiles` row. The matching profile exists at tier `free`, with no Stripe customer and no subscription. This verifies that the new-user profile trigger has produced the expected Free account record for an existing signup. A fresh magic-link delivery/sign-in flow still needs an interactive end-to-end test before PM sign-off.

## 5. Launch plan scope

Only **Pro** is purchasable in the current production candidate. Program/Team functionality remains gated as beta/planned until Engineering and the Program Manager verify those workflows.

The UI displays Pro at `$9.99/month`; Stripe is configured to the same recurring amount.

## 6. Acceptance tests after remaining account configuration

The Program Manager must verify all of these before merging:

1. Fresh magic-link email arrives and creates/signs in an account.
2. The `profiles` trigger creates the user's profile at tier `free`.
3. A Free user cannot call hosted AI directly.
4. Pro Checkout opens only for a signed-in user.
5. Cancelling Checkout leaves the tier at `free`.
6. Completing Checkout causes Stripe webhook processing and changes the profile tier to `pro`.
7. A Pro user can receive a hosted AI Coach response.
8. Subscription cancellation/downgrade returns the profile tier to `free`.
9. Signing out immediately returns the browser to Free entitlement.
10. No provider credential, Stripe secret, service-role key, or secret Supabase key appears in browser source.

## 7. Release rule

Do not merge PR #1 until the configuration and end-to-end tests above pass and the remaining Design/Marketing PM gates are closed.
