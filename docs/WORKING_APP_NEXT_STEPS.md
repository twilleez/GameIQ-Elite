# GameIQ Elite — Next Steps to a Working App

## Current candidate
The draft candidate is a working offline-first basketball application with local game tracking, corrected shot geometry, explicit made/missed free throws, Supabase authentication/cloud sync, Program Access, hosted AI architecture, Stripe subscription architecture, PWA support, and automated regression tests.

## Release sequence
1. **Real-device scoring acceptance**
   - Verify corner, wing, top-of-key, and deep shots against the visible 3PT line.
   - Verify `FT -> Made FT` adds 1 point and 1 FT attempt.
   - Verify `FT -> Miss FT` adds 0 points and 1 FT attempt.
   - Verify Undo restores each action correctly.
2. **Offline/cloud acceptance**
   - Record and save a full game offline.
   - Reconnect and confirm exactly one cloud game.
   - Open a second device and confirm score, players, stats, and shots match.
3. **Multi-coach acceptance**
   - Owner creates invite.
   - Second authenticated coach joins.
   - Both see the same program; outsider sees none.
4. **Production account activation**
   - Finish Stripe account-holder onboarding so live card charges are enabled.
   - Configure Stripe Customer Portal.
   - Configure `ANTHROPIC_API_KEY` in Supabase.
   - Enable Supabase leaked-password protection.
5. **Commercial E2E**
   - Fresh magic-link signup -> Free profile.
   - Pro checkout -> webhook -> Pro entitlement.
   - Hosted AI response as Pro.
   - Customer cancellation -> webhook -> Free entitlement.
6. **Final UX/QA**
   - Phone/tablet touch targets, orientation, accessibility, print/report, poor-network and recovery tests.
7. **Release**
   - PM closes remaining P0/P1 gates.
   - Mark PR ready, merge to `main`, deploy, then run production smoke test.

## PM release rule
Do not merge the production candidate until real-device scoring, cloud sync, account/billing, hosted AI, and cancellation gates pass.
