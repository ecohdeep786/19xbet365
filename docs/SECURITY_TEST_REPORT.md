# Security Test Report

**Assessment type:** development/production-foundation review, not a third-party penetration test.  
**Date:** 26 November 2026.

## Automated authorization checks

Run: `node scripts/security-smoke.mjs`

| Check | Result | Observed |
| --- | --- | --- |
| Anonymous `/api/admin/overview` | PASS | `401` “Sign in to the control room.” |
| Anonymous bet placement | PASS | `401` “Sign in to continue.” |
| Anonymous deposit config | PASS | `401` “Sign in to continue.” |
| Player `/api/admin/overview` | PASS | `403` “This area is limited to authorized staff.” |
| Player deposit review queue | PASS | `403` “This area is limited to authorized staff.” |
| Agent deposit review queue | PASS | `403` “Master Admin authorization is required.” |
| Master deposit review queue | PASS | `200`, queue available |
| Unknown game ID | PASS | `404` not found |
| Invalid Firebase token | PASS | `401 invalid_firebase_token` (`firebase-smoke.mjs`) |
| Unverified Firebase email links to an existing player | PASS | `403 email_verification_required` |
| Unverified Firebase email adds coins | PASS | `403 email_verification_required` |
| Staff email via Firebase auto-link | PASS | `403 staff_firebase_link_forbidden` (`firebase-smoke.mjs`) |
| Invalid stake | PASS | `400` stake validation |
| Settled blackjack hand replay | PASS | `409` round already closed (`blackjack-smoke.mjs`) |
| Wallet ledger reconciliation | PASS | 30/30 accounts balanced (`npm run db:audit`) |
| Direct mutation of ledger/settled records | PASS | triggers rejected transaction, settled round, settled bet and deposit amount updates |
| Master tries to enable real money | PASS | `403` “Real-money rails are hard-disabled…” |
| Agent account list | PASS | 9 accounts; roles only `agent`/`player`; no master or other admin |
| Agent overview | PASS | `global: false`, `accountCount: 9` |
| Agent `/admin/roles` | PASS | `403` permission denied |
| Agent `/admin/transfers` | PASS | `403` permission denied |
| Suspended account login | PASS | `403` rejected |
| Audit count | PASS | 10 initial events on clean seed |
| Master issues staff credentials | PASS | `201`, one-time email + temporary password |
| New admin can manage accounts | PASS | `200` scoped account list |
| New admin can view/manage games | PASS | `200` game catalogue; `games.manage` granted |
| Admin can manage fantasy contests | PASS | `200` contest list; `games.manage` |
| New admin can manage fantasy contests | PASS | `200` contest list |
| Player can access KYC and withdrawal config | PASS | `200` `/api/verification` and `/api/withdrawals/config` |
| Admin cannot open KYC/withdrawal review | PASS | `403` Master Admin authorization required |
| New admin cannot open KYC/withdrawal review | PASS | `403` Master Admin authorization required |
| Admin cannot open settings | PASS | `403` permission denied |
| New admin cannot open roles | PASS | `403` permission denied |
| New admin cannot issue staff credentials | PASS | `403` Master Admin authorization required |

## Database integrity checks

Executed directly against PostgreSQL:

```text
UPDATE audit_events SET summary='tamper' WHERE id=1;
  -> ERROR: audit_events is append-only

DELETE FROM audit_events WHERE id=1;
  -> ERROR: audit_events is append-only

UPDATE game_rounds SET payout=payout+1, ... WHERE status='settled';
  -> ERROR: settled rounds are immutable
```

Additional controls:

- Audit appends serialize with `pg_advisory_xact_lock` to avoid forked hash chains.
- Wallet operations lock the account row with `FOR UPDATE`.
- Settled rounds and audit events have database triggers rejecting mutation.
- Role/rank checks prevent acting on accounts at/above the actor's rank.
- Master Admin cannot be suspended/demoted through API routes.
- Self-suspension and self-credit adjustments are blocked.
- Scoped queries are recursive server-side; query parameters cannot expand scope.
- Real-money setting is forced false server-side regardless of UI.

## Authentication and session controls

- Password hashes: scrypt with per-account salt, N=16384, r=8, p=1.
- Session tokens: 32 random bytes; only SHA-256 hash stored in DB.
- Cookie: HttpOnly, SameSite=Lax, `Secure` when `NODE_ENV=production`, path `/`.
- Login rate limit: per IP+email, 8 attempts / 15 minutes.
- General API rate limit: 300 requests/minute in memory.
- Suspensions revoke all active sessions.
- Password change revokes other sessions.
- Session expiry: 7 days.

## Deposit controls

- Deposit configuration and requests require a player session; players can only see their own requests.
- The review queue, approval and rejection endpoints require **Master Admin**. Player/agent access is denied.
- Approval locks the request and account row, credits the deposit and server-calculated bonus in one transaction, inserts both ledger rows, a notification and an audit event, and prevents double review.
- `manual_review` mode still rejects live collection unless `PAYMENTS_LIVE_ENABLED=true`; sandbox mode is the default.
- No withdrawal endpoint exists; `realMoneyEnabled` remains hard-locked.
- Player cancellation is limited to their own pending request.

## Input and API controls

- Parameterized SQL throughout.
- Request body limit: 256 KB.
- Helmet headers enabled; CSP disabled for SPA compatibility (must be re-enabled/tuned with a nonce/hash policy in production).
- Server validation of email, password strength, names, reasons, amounts, selection IDs, statuses, roles, and scopes.
- Errors do not expose SQL or stack details to clients.
- Unknown game IDs return `404`; invalid stakes return `400`; settled multi-step rounds reject replay.

## Findings / residual risks

| Severity | Finding | Status / recommendation |
| --- | --- | --- |
| Medium | No CSRF token; SameSite=Lax protects most cross-site POSTs but is not a complete CSRF strategy | Add CSRF tokens/origin checks before production |
| Medium | Rate limits are in-memory and single-process | Use Redis-backed limiter across instances |
| Medium | No MFA challenge; 2FA is only a preference | Add TOTP/WebAuthn challenge and recovery codes |
| Medium | Password reset is notification-only for legacy seeded accounts; Firebase accounts use secure email reset | Keep the legacy fallback limited to demo/staff accounts; add transactional mail for staff recovery |
| Medium | Firebase token revocation checks require optional Admin credentials | Configure `FIREBASE_SERVICE_ACCOUNT_JSON` and enforce revocation checks before high-risk money flows |
| Medium | Fixed Firebase web API key configuration relies on console restrictions, not secrecy | Restrict by HTTP referrer, configure authorized domains and App Check; monitor Identity Toolkit quotas |
| Medium | npm audit reports known transitive issues in the optional Firestore/grpc tree and React Router 6 | Firestore is not imported by the app; plan a React Router 7 migration and refresh Firebase dependencies before launch |
| Low | CSP disabled in Helmet configuration | Define CSP for production assets |
| Low | Session cookie lacks explicit `domain` and `__Host-` prefix | Use `__Host-xbet_session` on HTTPS |
| Low | Audit hash chain is application-level plus trigger; DB superuser can still disable triggers | Use restricted app DB role, immutable backups, external anchoring for high assurance |
| Low | No account lockout beyond rate limit | Add alerting/step-up verification |
| Low | Admin ITP/UA fields stored unvalidated (bounded strings) | Normalize/retain only what is needed |
| Informational | All 44 games are in-house 19X RNG products; no certified provider/live-dealer session is connected | Keep explicit "19X Originals" labels; never fake live sessions |

## Production security prerequisites

1. TLS reverse proxy with HSTS, secure headers, CSP.
2. Restricted PostgreSQL role; no DDL/trigger ownership in app runtime.
3. Central secret manager; rotate DB/session secrets.
4. Redis rate limiting and audit alerting.
5. CSRF/origin protection and bot detection on auth.
6. Mail/SMS provider with verified templates.
7. Backups/PITR and restore drills.
8. KYC/AML/payment controls before any real-money capability.
9. Firebase authorized domains, API-key referrer restrictions, email templates, enumeration protection, MFA and App Check for added surfaces.
10. External penetration test and responsible disclosure channel.
