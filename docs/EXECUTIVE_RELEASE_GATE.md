# GameIQ Elite — Executive Release Gate

Status: **NO-GO until every P0 gate is evidenced**

## Release principle
A feature is not complete because it exists. It is complete when its user path, failure path, security boundary, mobile behavior, persistence behavior, and commercial claim have been verified on the exact release candidate.

## P0 — Customer-critical
- Authentication: magic-link sign-in returns to production HTTPS and creates/restores the correct profile.
- Courtside: roster -> clock -> made/missed FT -> 2PT/3PT boundary -> undo -> save works without ambiguity.
- Persistence: offline save survives reload and reconnect uploads exactly once.
- Multi-device: second device reproduces score, player stats and shot chart.
- Authorization: coach can collaborate; viewer is read-only; unrelated account sees no private program data.
- Free plan: quota is understandable, Continue with Free works, existing cloud history does not incorrectly consume transitional quota.
- Pro: checkout -> webhook -> entitlement -> AI -> customer portal cancellation -> Free is verified end-to-end.
- Security: no client secrets, app-schema advisor clean, leaked-password protection enabled, production redirect allowlist reviewed.
- Reliability: no uncaught console errors in startup/auth/game/save/reconnect/pricing/Teams/AI paths.

## P1 — Executive quality
- Phone and tablet touch targets pass real-device use.
- Keyboard and screen-reader critical paths pass.
- Print/PDF/CSV output is readable and accurate.
- PWA install, offline reload and service-worker update behavior pass.
- Privacy copy matches actual Supabase/Stripe/AI data flows.
- Account/data deletion and incident-response procedures are documented.
- Marketing claims are limited to verified production behavior.

## Release evidence
For each gate record: exact commit SHA, device/browser, test account role, result, defect link if failed, retest result, PM sign-off.

## Decision rule
No P0 may be waived silently. Any accepted risk must name the owner, customer impact, mitigation and expiry date. The Program Manager publishes the final GO/NO-GO decision against one immutable release-candidate SHA.
