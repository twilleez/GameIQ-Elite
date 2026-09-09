# GameIQ Elite Beta Acceptance Gate

A candidate is beta-ready only after all P0/P1 checks below are verified.

## P0 — must pass before external beta
- First launch: Welcome → Sign In / Start Free → team setup.
- Account: create account, sign out, email/password sign in, password recovery, sign out again.
- Live game: roster, 2PT/3PT, made/missed FT, rebounds, assists, turnovers, fouls, undo, clock, save.
- Free plan: local save works and quota is based only on qualifying Free-plan games.
- Offline: game can be completed and saved without a network connection.
- Reconnect: pending game syncs exactly once after connectivity returns.
- Second device: same signed-in account hydrates the saved team/game.
- Program access: invited coach can access the shared program; an outsider cannot.
- PWA: install/open, refresh, and offline shell work on supported mobile browsers.
- No uncaught console errors during the primary game workflow.

## P1 — beta quality
- Phone layouts remain readable at common iPhone/Android widths.
- Keyboard focus and accessible labels work for primary controls.
- Export/backup works.
- Cloud Sync diagnostics accurately show online/offline, pending, last save, and errors.
- Legal/privacy copy accurately describes local/cloud data behavior.

## Commercial features
Stripe checkout and hosted AI are not beta launch gates for a Free-plan beta. They must remain clearly gated until their separate production acceptance tests pass.
