# Production Readiness

**Status: production-oriented foundation — NOT approved for real-money launch.**  
This is a virtual-credit release with deliberate legal, provider, and operational blockers.

## Acceptance checklist

| Criterion | Status | Evidence / note |
| --- | --- | --- |
| Reference sections documented | PASS | `REFERENCE_PRODUCT_ANALYSIS.md` |
| Approved product sections implemented | PARTIAL | Public, player, games, support, admin complete; multi-market/provider/money rails not |
| Supplied font used consistently | PASS | local Sora/Manrope, `fonts.css`, theme tokens |
| Design system consistent | PASS | `DESIGN_SYSTEM.md`; shared tokens/components |
| Enabled buttons function | PASS | tested journeys; provider/locked controls clear |
| Device layouts tested | PASS (widths) | 320–2560, 0 overflow; physical devices not tested |
| Game interfaces function | PASS | 11 server-authoritative originals; smoke test |
| Demo sports settlement | PASS | 1X2 singles/accumulators auto-settle with generated scores, wallet credit, notification and audit; `settlement-smoke.mjs` |
| Deposit/bonus flow | PASS (sandbox) | QR request, Master review, configurable bonus, wallet/audit/notification path; `deposit-smoke.mjs` |
| Player workflows E2E | PASS | registration, login, bet, wallet, games, support/help |
| Master Admin workflows | PASS | dashboard, accounts, credit, roles, content, settings, support, transfers, audit, health |
| Delegated Admin workflows | PASS | scope/permission tests in `security-smoke.mjs` |
| Network isolation | PASS | agent sees 9 accounts, no master/other admin |
| Database persistence | PASS | PostgreSQL schema/seed, wallet/round/bet records |
| Auth/authorization | PASS | session, RBAC, scope, trigger tests |
| Security tests | PASS with findings | `SECURITY_TEST_REPORT.md` |
| Production build | PASS | `tsc --noEmit && vite build` |
| Performance | PARTIAL | ~168 KB gzip JS; no load test; illustrated SVG covers add no image payloads |
| Critical defects | NONE KNOWN | recent bug fixes covered in E2E report |
| Restricted functionality disabled | PASS | money locked, provider session required |
| Legal/licensing satisfied | FAIL / BLOCKED | no licence; no real-money operation |

## Go/no-go by capability

| Capability | Decision |
| --- | --- |
| Virtual-credit demo/public preview | **GO** |
| Player account + virtual wallet | **GO** (with security hardening) |
| 19X Originals | **GO** for demo; independent certification not done |
| 1X2 demo sportsbook settlement | **GO** for demo; results are server-generated demonstration data |
| Manual QR deposit review | **GO** for sandbox; **NO-GO** for live collection until merchant QR, licensing, KYC/AML, `PAYMENTS_LIVE_ENABLED` and reconciliation are approved |
| Provider/live dealer | **NO-GO** until contracts/certification/session adapter |
| Sports market expansion | **NO-GO** until multi-market model and real-feed settlement; 1X2 demo settlement worker now exists |
| Real-money deposits/withdrawals/wagering | **NO-GO** until licensing, KYC/AML, payments, legal sign-off |
| Production internet exposure | **CONDITIONAL** — TLS, CSP, CSRF, distributed rate limit, backups, monitoring, external pen test first |

## Required before production exposure

1. TLS + HSTS + CSP + secure headers.
2. CSRF/origin checks and Redis rate limiting.
3. Central secrets and restricted DB role.
4. Backup/PITR and restore drill.
5. Email/SMS provider for verification/reset.
6. MFA challenge, not just preference.
7. Monitoring, error tracking, audit alerting, uptime checks.
8. Load/performance test and bundle budget.
9. Accessibility audit (WCAG 2.2 AA target).
10. External penetration test and legal review.
11. Multi-market sports model and settlement worker if claiming that parity.
12. Provider adapter/certification or remove those pages before launch.

## Metrics and SLO recommendations

- API p95 latency `< 250 ms` for read routes, `< 600 ms` for transactional play routes.
- Error rate `< 0.5%` excluding validation.
- Availability target `99.9%` for public/API.
- Zero unauthorized cross-scope data returned; alert on repeated 401/403 spikes.
- Audit chain verification every hour; alarm on broken links.
- Wallet reconciliation job must confirm ledger sums vs account balances.

## Sign-off

- Product engineering: implemented foundation.
- QA: manual + smoke + responsive/security evidence in docs.
- Security: unresolved medium findings documented above.
- Legal/licensing: not approved for real-money operations.
- Provider integrations: not configured.
