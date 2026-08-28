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
- The default live payment-method configuration exists, but Card and the other methods currently report `available: false`.
- Stripe account capability verification shows `charges_enabled: false`, `card_payments: inactive`, and account activation is incomplete.
- Stripe still requires account-holder onboarding actions, including a business website URL and Terms acceptance. GameIQ must not fabricate Terms acceptance or account-holder network/IP data.

Remaining Stripe account actions:

1. Complete Stripe account activation/onboarding so live charges and Card capability become active. Use the public GameIQ site as the business website where appropriate.
2. Accept Stripe's required account Terms directly as the account holder.
3. Activate/configure the Stripe Customer Portal/no-code portal login so paid customers can update payment methods and cancel subscriptions.
4. Do not enable Stripe Tax or choose a SaaS tax code until the business's registration/classification decision is confirmed.

## 3. Server functions

- `gameiq-stripe-webhook` is deployed and reads its webhook signing secret from Supabase Vault.
- `gameiq-create-checkout` reads the live Pro Price from Vault and requires an authenticated user. It remains Pro-only.
- `gameiq-ai-coach` requires an authenticated paid tier before invoking the AI provider.
- `gameiq-program-access` is JWT-protected and handles controlled program invite creation/acceptance.

## 4. Auth verification

Supabase currently contains one Auth user and one matching `profiles` row. The matching profile exists at tier `free`, with no Stripe customer and no subscription. This verifies that the new-user profile trigger has produced the expected Free account record for an existing signup. A fresh magic-link delivery/sign-in flow still needs an interactive end-to-end test before PM sign-off.

## 5. Cloud + collaboration verification

Implemented on the production-candidate branch:

- local-first game save with bounded cloud retry,
- reconnect/foreground retry,
- duplicate-safe `client_ref` upserts,
- second-device cloud hydration for players, games, scores, and shots,
- visible cloud sync status,
- Program Access invite/join UI,
- shared-workspace resolution for invited coaches,
- JWT-protected invite backend.

Database PM simulations have confirmed duplicate prevention, authorized coach read/update, and outsider isolation. The remaining physical-device tests are documented in `docs/REAL_DEVICE_ACCEPTANCE.md`.

## 6. Launch plan scope

Only **Pro** is purchasable in the current production candidate. Program/Team functionality remains controlled beta until real-device collaboration tests pass.

The UI displays Pro at `$9.99/month`; Stripe is configured to the same recurring amount.

## 7. Acceptance tests after remaining account configuration

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
11. Real offline save/reconnect creates exactly one cloud game.
12. A second real device hydrates the identical game/shot chart.
13. A second real coach accepts an invite and accesses only the authorized program.
14. An uninvited real account cannot access that program.

## 8. Release rule

Do not merge PR #1 until the configuration and end-to-end tests above pass and the remaining Design/Marketing PM gates are closed.
