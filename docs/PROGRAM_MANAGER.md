# GameIQ Elite — Program Manager Quality Gate

## Product goal
GameIQ Elite is a courtside basketball command center that must let a coach or stat keeper capture a game quickly, preserve accurate basketball data, and turn that data into useful coaching decisions.

## Team ownership

### Software Engineering
Owns reliability, data integrity, authentication, authorization, billing, hosted AI, offline synchronization, performance, testing, deployment and security.

### Design
Owns live-game speed, hierarchy, accessibility, responsive behavior, onboarding, interaction states and visual consistency. Live-game capture must take priority over secondary analytics and administrative controls.

### Marketing
Owns positioning, pricing communication, onboarding copy, acquisition, activation and retention messaging. Marketing may only advertise functionality that Engineering has implemented and the Program Manager has verified.

## Program Manager role
The Program Manager acts as QA, usability test group and focus-group proxy. Every issue remains open until its acceptance criteria pass. Failed items return to the owning team.

## Acceptance queue

| ID | Priority | Owner | Issue | PM status |
|---|---|---|---|---|
| ENG-001 | P1 | Engineering | Monolithic `index.html` | IN PROGRESS — basketball domain extracted |
| ENG-002 | P1 | Engineering | No automated regression gate | SIGNED OFF — tests + GitHub Actions added |
| ENG-003 | P1 | Engineering | GitHub Pages PWA paths/missing icons | SIGNED OFF on branch |
| ENG-004 | P0 | Engineering | Browser-held AI provider key | IN PROGRESS — authenticated hosted Edge Function deployed; provider secret + UI wiring remain |
| ENG-005 | P0 | Engineering | Client could attempt tier/subscription writes | SIGNED OFF — authenticated access is SELECT-only; anon has no table grants |
| ENG-006 | P0 | Engineering | Real billing server path missing | IN PROGRESS — authenticated Checkout + signature-verified webhook deployed; Stripe configuration remains |
| ENG-007 | P0 | Engineering | Full authenticated workflow not regression-tested | OPEN |
| ENG-008 | P1 | Engineering | Supabase leaked-password protection warning | OPEN — dashboard setting required |
| DES-001 | P1 | Design | Live screen has high control density | OPEN |
| DES-002 | P1 | Design | Keyboard/screen-reader/touch acceptance pass | OPEN |
| MKT-001 | P0 | Marketing | Privacy copy does not match current server/Auth data flow | OPEN |
| MKT-002 | P0 | Marketing | Team-plan claims exceed currently verified functionality | OPEN |
| MKT-003 | P1 | Marketing | Launch funnel/positioning validation | OPEN |

## Acceptance tests

### Live game
- Add/remove player.
- Record and undo every supported stat.
- Clock start/stop/reset remains stable through navigation.
- Quarter/OT totals are correct.
- Shot chart classifies representative 2PT and 3PT locations correctly.
- Saved game can be reopened/reported without data loss.

### Accounts/security
- Unauthenticated users cannot read another user's server data.
- Authenticated users can only read rows permitted by RLS.
- Browser clients cannot write `profiles.tier` or subscription state.
- No secret/service-role/AI-provider key is shipped to browser code.

### Commercial
- Checkout success, cancellation and subscription changes result in correct entitlements.
- Stripe webhook requests are rejected unless the Stripe signature verifies.
- Pricing language matches actual implemented features.
- Privacy/terms match actual data flows.

## Release sign-off
A production release is approved only when all P0 and P1 items are closed, automated tests pass, Supabase advisors contain no unresolved material security warnings attributable to app schema/policies, and the Program Manager completes a full coach workflow regression.

## Current decision
**NO-GO for commercial production merge.** The foundation is materially stronger, but the live browser still needs to be wired to hosted AI/checkout, privacy and plan copy must be corrected, Stripe/provider secrets must be configured, and end-to-end account/billing tests must pass.
