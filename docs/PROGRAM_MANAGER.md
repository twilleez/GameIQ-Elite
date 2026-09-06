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
| ENG-001 | P1 | Engineering | Monolithic `index.html` | IN PROGRESS — domain/services extracted; progressive modularization continues |
| ENG-002 | P1 | Engineering | Automated regression gate | SIGNED OFF — tests + GitHub Actions active |
| ENG-003 | P1 | Engineering | GitHub Pages PWA paths/missing icons | SIGNED OFF on branch |
| ENG-004 | P0 | Engineering | Browser-held AI provider key | IN PROGRESS — authenticated hosted Edge Function deployed; provider credential and real Pro AI test remain |
| ENG-005 | P0 | Engineering | Client could attempt tier/subscription writes | SIGNED OFF — authenticated access is SELECT-only; anon has no table grants |
| ENG-006 | P0 | Engineering | Real billing server path | IN PROGRESS — authenticated Checkout + signature-verified webhook deployed; Stripe account activation remains |
| ENG-007 | P0 | Engineering | Full authenticated workflow regression | OPEN — real browser/device pass required |
| ENG-008 | P1 | Engineering | Supabase leaked-password protection warning | OPEN — dashboard setting required |
| ENG-009 | P1 | Engineering | Offline-first cloud game sync | IMPLEMENTED — retry, duplicate prevention, cloud hydration and shared workspace resolver; real device acceptance remains |
| ENG-010 | P1 | Engineering | Program collaboration | IMPLEMENTED — invite/join UI + Edge Function + RLS tests; real second-coach acceptance remains |
| ENG-011 | P1 | Engineering | 3-point geometry | SIGNED OFF in automated regression — corner/wing/top/deep shots beyond arc count as 3; real-device visual check remains |
| ENG-012 | P1 | Engineering | Free-throw stat integrity | SIGNED OFF in Quality Gate — Made FT increments FTM+FTA and score +1; Missed FT increments FTA only |
| DES-001 | P1 | Design | Live screen has high control density | OPEN — real phone/tablet test required |
| DES-002 | P1 | Design | Keyboard/screen-reader/touch acceptance pass | OPEN |
| MKT-001 | P0 | Marketing | Privacy copy must match Auth/cloud/server data flow | IN PROGRESS |
| MKT-002 | P0 | Marketing | Team-plan claims must match verified functionality | IN PROGRESS |
| MKT-003 | P1 | Marketing | Launch funnel/positioning validation | OPEN |

## Acceptance tests

### Live game
- Add/remove player.
- Record and undo every supported stat.
- Made FT increases FTM and FTA together and adds exactly 1 point.
- Missed FT increases FTA only and adds 0 points.
- FT corrections never allow FTM to exceed FTA.
- Clock start/stop/reset remains stable through navigation.
- Quarter/OT totals are correct.
- Shot chart classifies representative 2PT and 3PT locations correctly, including top/deep 3s.
- Saved game can be reopened/reported without data loss.

### Accounts/security
- Unauthenticated users cannot read another user's server data.
- Authenticated users can only read rows permitted by RLS.
- Browser clients cannot write `profiles.tier` or subscription state.
- No secret/service-role/AI-provider key is shipped to browser code.

### Cloud/collaboration
- Offline save succeeds before any network request.
- Reconnect creates exactly one cloud copy of a saved game.
- A second device can recover the same game, roster, score and shots.
- An invited coach resolves the shared organization instead of creating a duplicate personal workspace.
- An unrelated authenticated account sees none of the owner's data.

### Commercial
- Checkout success, cancellation and subscription changes result in correct entitlements.
- Stripe webhook requests are rejected unless the Stripe signature verifies.
- Pricing language matches actual implemented features.
- Privacy/terms match actual data flows.

## Release sign-off
A production release is approved only when all P0 and P1 items are closed, automated tests pass, Supabase advisors contain no unresolved material security warnings attributable to app schema/policies, and the Program Manager completes a full real-browser coach workflow regression.

## Current decision
**NO-GO for commercial production merge.** The production candidate is materially stronger and the latest free-throw behavior passed the Quality Gate, but real-device/browser acceptance, Stripe live-account activation, Customer Portal, hosted AI credential/testing, leaked-password protection and final commercial workflow validation remain.
