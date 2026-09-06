# GameIQ Elite — Real Device Acceptance

Run before PM production sign-off on the production-candidate branch.

## Accepted on real preview device
- [x] 3-point boundary scoring: corner, wing, top/deep straight-on, and inside-the-line 2PT behavior confirmed working by product owner on 2026-09-02.
- [x] Free throw workflow: explicit Made FT / Miss FT interaction confirmed working by product owner on 2026-09-02.

## A. Offline → reconnect
Sign in on Device A, go offline, record and save a short game, then reconnect. Include a made 2, a made top/deep 3, a missed 3, a rebound and an assist. Verify the game stays local while offline, then syncs automatically after reconnect. In Settings → Cloud Sync, verify the connection/pending/last-save diagnostics. PM verifies exactly one matching cloud game and matching shots.

## B. Second device
Sign in on a clean Device B with the same account. Verify the game appears exactly once with matching score, roster and shot chart, including the top/deep shot as a 3.

## C. Real second coach
From Teams → Program Access, create a Coach invite. A different signed-in coach enters the code on another browser/device. Verify the coach sees the program and can make one harmless shared-team edit.

## D. Unauthorized account
A never-invited signed-in account must see and modify none of the owner's organizations, teams, games, players or shots.

## E. Courtside usability
On phone and tablet verify clock controls, stat +/- controls, undo, one-handed shot entry, offline save, keyboard focus, screen-reader labels and print/PDF readability. The 3-point classification portion of this gate is already accepted above.

## F. Free throw tracking — PASSED
Made FT increases both FTM and FTA and adds exactly 1 point; Miss FT increases FTA only and adds 0 points. Explicit Made/Miss FT controls were accepted on the hosted preview. Automated regression coverage remains required.

For every remaining test record date, device/browser, account role, game ID/opponent, pass/fail and issues. Never record passwords, access tokens, payment credentials or used invite codes.
