# Phase 4 acceptance

Completed in the production-candidate branch:
- Bounded offline-first upload retry and duplicate-safe client references.
- Second-device cloud hydration for players, saved games, scores, and shot charts.
- Cloud pull on authenticated restore, reconnect, and foreground return.
- Explicit offline/waiting/syncing/cloud-up-to-date status messaging.
- Organization-scoped multi-coach membership model.
- JWT-protected `gameiq-program-access` Edge Function and one-time 8-character coach/viewer invites.
- Transactional RLS tests: authorized coach can read/update shared team; outsider sees zero rows.
- Transactional invite test: invite creates exactly one coach membership; outsider sees zero organization rows.
- 3-point geometry regression remains protected, including top/deep straight-on shots.

Still requires physical acceptance testing:
- Complete a game offline on a real phone/tablet, reconnect, and confirm exactly one cloud game.
- Sign in on a second physical device and compare score, players, and shot chart.
- Have a second real coach account accept an invite and collaborate.
- Verify a real unrelated account cannot access the program.

No PM transaction test data was retained; database tests were rolled back.
