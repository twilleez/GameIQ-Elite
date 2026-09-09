# GameIQ Elite — Privacy Draft

> Draft for product/legal review before commercial launch. This is product copy, not legal advice.

## What GameIQ stores
GameIQ Elite can store basketball rosters, game statistics, shot locations, team/game metadata, account identifiers, subscription status and AI-coaching conversations or prompts used to provide requested features.

## Local and cloud data
Game tracking is designed to continue working locally/offline. When account/cloud features are enabled, account and subscription information is processed through Supabase. Future cloud synchronization of basketball data must be described here before that feature is released.

## Authentication
If you choose to create or use an account, your email address and authentication/session information are processed by Supabase to provide sign-in and account access.

## AI Coach
When hosted AI Coach is enabled, the basketball context and prompt needed to answer your request are sent from GameIQ's authenticated server function to the configured AI provider. Provider API credentials are kept on the server and are not supplied by or exposed to the browser.

## Payments
When paid plans are enabled, checkout and subscription billing are processed by Stripe. GameIQ stores identifiers and subscription status needed to determine account entitlements; payment-card details are handled by Stripe rather than stored directly by GameIQ.

## Youth athletes
GameIQ may be used to record statistics about youth athletes. Teams and organizations are responsible for using the product in accordance with applicable school, league, organizational, parental-consent and privacy requirements. Avoid collecting unnecessary personal information.

## Data controls
The product should provide export and deletion controls appropriate to every type of data it stores. Before launch, this section must be updated to match the implemented account/cloud deletion process.

## Final review gate
This draft must be reviewed and updated whenever cloud synchronization, parent portals, organization sharing, analytics tracking or other new data flows are introduced.
