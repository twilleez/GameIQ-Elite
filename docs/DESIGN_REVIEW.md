# GameIQ Elite — Courtside Design Review

## Design principle
During a live game, speed and error prevention outrank feature visibility. Secondary analytics and administrative controls should be progressively disclosed.

## Game Mode hierarchy
1. Score and game clock.
2. Current quarter/OT and timeout state.
3. Current lineup/player cards.
4. Fast stat entry and undo.
5. Shot entry.
6. Save/end game.

Everything else should be visually secondary while Game Mode is active.

## Analysis Mode hierarchy
1. Game summary and efficiency.
2. Player comparison and lineup analysis.
3. Shot chart/heat views.
4. Season trends and development arcs.
5. Reports/export.
6. AI coaching assistance.

## Mobile acceptance criteria
- Primary stat actions remain reachable without horizontal page scrolling.
- Critical tap targets should be large enough for fast one-handed use.
- Made FT and Missed FT must be distinguishable and reachable without entering a hidden admin flow.
- Accidental destructive actions require confirmation or easy undo.
- Score/clock state stays visible or immediately recoverable.
- Quick Mode removes secondary controls instead of only making them visually smaller.
- Shot entry must visually support corner, wing, top-of-key and deep straight-on attempts without ambiguity about 2PT vs 3PT classification.

## Accessibility acceptance criteria
- Every icon-only critical control has an accessible name.
- Visible keyboard focus exists for interactive elements.
- Modals trap/restore focus appropriately.
- Color is not the sole indicator for made/missed/error/active states.
- Made FT and Missed FT controls have explicit text/accessible labels.
- Text maintains useful contrast at small sizes.
- Critical live-game operations are operable without precision pointer input.

## PM focus-group scenarios
### First-time coach
Add five players, start clock, record rebound/assist/turnover, record one Made FT and one Missed FT, log a shot, correct one mistake, finish and save the game.

### Experienced stat keeper
Use Quick Mode for rapid repeated entry and verify that switching views does not lose clock/game state. Confirm Made FT adds one point and one attempt; Missed FT adds only one attempt.

### Shot-chart geometry
Record a corner 3, wing 3, top-of-key 3 and deep straight-on 3. Any location beyond the drawn three-point boundary must count as 3.

### Mobile sideline use
Complete the core workflow on a narrow viewport without blocked buttons, clipped text or hidden required controls.

### Recovery test
Make an incorrect stat/shot/free-throw entry and recover quickly using undo or correction controls.

## Sign-off rule
DES-001 and DES-002 remain open until the PM can complete every scenario on real phone/tablet hardware without a blocking usability or accessibility defect.
