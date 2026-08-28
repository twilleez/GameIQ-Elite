# GameIQ Elite — Offline-First Cloud Sync

## Goal
Keep courtside stat entry local and fast, then synchronize authenticated users to Supabase when connectivity is available. Cloud sync must never block a live game.

## Cloud hierarchy
`profiles -> organizations -> teams -> players -> games -> game_events / shots / lineup_stints`

A solo coach owns an organization. Future multi-coach programs use `organization_members` without changing the data model.

## Identity and idempotency
Every local entity is mapped to a stable `client_ref` (`team:<local-id>`, `game:<local-id>`, etc.). Unique constraints make repeated retries safe and prevent duplicate cloud rows after reconnecting.

## Conflict rule
Local writes include `local_updated_at`; cloud rows have server `updated_at`. The client should push only when the local timestamp is newer, otherwise pull the cloud version. Destructive conflict resolution is intentionally deferred until real multi-device usage is tested.

## Sync order
1. Confirm authenticated Supabase user.
2. `ensureWorkspace()` creates/loads the user's organization.
3. `syncTeam()` upserts team and roster.
4. Saved/final games are normalized and sent through `syncGameBundle()`.
5. `pullTeamCloudState()` can fetch rows changed after the client's last successful sync timestamp.
6. Persist `syncedAt` locally only after the complete pull succeeds.

## Safety rules
- Never require network access for stat entry, clock operation, shot logging, undo, or saving locally.
- Never expose service-role or secret keys in browser code.
- RLS is the authorization boundary; browser code is not trusted for access control.
- Keep Pro/Free entitlement separate from ownership of a user's basketball data.
- A failed cloud write must leave local data untouched and retryable.

## Current implementation status
- Supabase cloud schema: deployed.
- RLS and organization membership helpers: deployed and PM-tested under the `authenticated` role.
- Cross-team game/player integrity constraints: deployed.
- `src/services/cloud-sync.js`: added to the protected branch.
- Pure sync/idempotency regression tests: added.
- Existing `index.html` is not yet allowed to make cloud sync a prerequisite for the live-game workflow. Wiring should be progressive and background-only.

## Next integration gate
Wire successful local saves to a non-blocking sync queue after authentication, then test: offline game -> save -> reconnect -> one cloud game only -> second device pull -> identical stats/shot chart.
