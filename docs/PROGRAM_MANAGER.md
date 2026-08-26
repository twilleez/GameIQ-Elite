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

## Current release blockers

### P0 — must resolve before paid launch
- Replace client-supplied AI provider keys with authenticated server-side/Edge Function AI.
- Implement server-controlled billing and entitlement checks. UI-only plan switching is not sufficient.
- Make privacy and terms accurately describe Supabase authentication, cloud data and AI processing.
- Remove or clearly mark Team-plan promises that are not yet implemented and verified.
- Verify signup/login/profile creation and account recovery end-to-end.

### P1 — must resolve before production candidate
- Modularize the monolithic index.html progressively without breaking the live workflow.
- Add automated regression tests for basketball math and critical state transitions.
- Add continuous integration for tests.
- Correct GitHub Pages PWA paths and caching behavior.
- Run keyboard, touch, small-screen and screen-reader accessibility passes.
- Separate Game Mode from Analysis/Admin complexity through progressive disclosure.

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
- Authenticated users can only read/update rows permitted by RLS.
- Client cannot grant itself a paid tier.
- No secret/service-role/AI-provider key is shipped to browser code.

### Commercial
- Checkout success, cancellation and expiration result in correct entitlements.
- Pricing language matches actual implemented features.
- Privacy/terms match actual data flows.

### Release sign-off
A production release is approved only when all P0 and P1 items are closed, automated tests pass, Supabase advisors contain no unresolved material security warnings attributable to app schema/policies, and the Program Manager completes a full coach workflow regression.
