# Security Policy

## Reporting a vulnerability
Do not publish suspected vulnerabilities, private customer data, credentials, tokens, or exploit details in a public GitHub issue.

For pre-launch testing, the repository owner should receive reports privately and record only sanitized remediation tasks in the public tracker. Before commercial launch, GameIQ must publish a dedicated monitored security contact address and replace this temporary owner-routing instruction.

Include the affected GameIQ build/commit, browser/device, reproduction steps, expected behavior, observed behavior, and impact. Never include live secrets or another customer's private data.

## Response targets
- P0 — active data exposure, auth bypass, payment/entitlement bypass, secret exposure: stop release immediately; contain first; investigate and remediate before release resumes.
- P1 — serious security/privacy weakness without confirmed active exposure: prioritize ahead of feature work and retest before release.
- P2 — hardening/defense-in-depth: track with an owner and target release.

## Release security baseline
- Supabase RLS on private application data.
- Least-privilege organization/team roles.
- Stripe and AI provider secrets server-side only.
- No production secrets committed to public GitHub or shipped to the browser.
- Production authentication redirect allowlist reviewed.
- Dependency and Supabase security-advisor findings reviewed before release.
- Account/data deletion procedure documented and tested.
- Security/privacy claims match actual production data flows.

## Incident handling
Preserve evidence, revoke/rotate exposed credentials, contain affected access, identify impacted data/users, remediate the root cause, retest isolation, document decisions, and complete any legally required notification with qualified counsel. Do not make legal or breach-notification conclusions from this document alone.
