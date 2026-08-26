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
- Accidental destructive actions require confirmation or easy undo.
- Score/clock state stays visible or immediately recoverable.
- Quick Mode removes secondary controls instead of only making them visually smaller.

## Accessibility acceptance criteria
- Every icon-only critical control has an accessible name.
- Visible keyboard focus exists for interactive elements.
- Modals trap/restore focus appropriately.
- Color is not the sole indicator for made/missed/error/active states.
- Text maintains useful contrast at small sizes.
- Critical live-game operations are operable without precision pointer input.

## PM focus-group scenarios
### First-time coach
Add five players, start clock, record rebound/assist/turnover, log a shot, correct one mistake, finish and save the game.

### Experienced stat keeper
Use Quick Mode for rapid repeated entry and verify that switching views does not lose clock/game state.

### Mobile sideline use
Complete the core workflow on a narrow viewport without blocked buttons, clipped text or hidden required controls.

### Recovery test
Make an incorrect stat/shot entry and recover quickly using undo or correction controls.

## Sign-off rule
DES-001 and DES-002 remain open until the PM can complete every scenario without a blocking usability or accessibility defect.
