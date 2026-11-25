# Production Readiness

**Status: production-oriented foundation — NOT approved for real-money launch.**
This is a sandbox coin release with deliberate legal, provider, and operational blockers.

## Acceptance checklist

| Criterion | Status | Evidence / note |
| --- | --- | --- |
| Reference sections documented | PASS | `REFERENCE_PRODUCT_ANALYSIS.md` |
| Approved product sections implemented | PARTIAL | Public, player, games, support, admin complete; multi-market/provider/money rails not |
| Supplied font used consistently | PASS | local Roboto + Roboto Condensed, `fonts.css`, theme tokens |
| Design system consistent | PASS | `DESIGN_SYSTEM.md`; shared tokens/components |
| Enabled buttons function | PASS | tested journeys; provider/locked controls clear |
| Device layouts tested | PASS (widths) | 320–2560, 0 overflow; physical devices not tested |
| Game interfaces function | PASS | 44 server-authoritative 19X Originals; all-games API and UI smoke |
| Demo sports settlement | PASS | 1X2 singles/accumulators auto-settle with generated scores, wallet credit, notification and audit; `settlement-smoke.mjs` |
| Deposit/bonus flow | PASS (sandbox) | QR request, Master review, configurable bonus, wallet/audit/notification path; `deposit-smoke.mjs` |
| Fantasy contests | PASS (sandbox) | Salary-cap lineup builder, transactional entries, scoring, settlement, cancel/refund, admin controls; `fantasy-smoke.mjs` |
| KYC flow | PASS (manual) | Player submission, Master review queue, approve/reject, withdrawal gate; provider/encrypted document handling still required |
| Withdrawal flow | PASS (manual review) | Player request, KYC gate, approve/reject/mark-paid, ledger/audit; no automated payment execution |
| Player workflows E2E | PASS | registration, login, bet, wallet, games, support/help |
| Master Admin workflows | PASS | dashboard, revenue/risk, accounts, credit, roles, content, settings, support, transfers, audit, health |
| Scoped Admin revenue access | PASS | `/admin/revenue` scoped to actor branch; 403 for players |
| Sports risk caps | PASS | Master-only `maxSportsStake`/`maxSportsPayout`; server-enforced and audited; `risk-smoke.mjs` |
| Delegated Admin workflows | PASS | scope/permission tests in `security-smoke.mjs` |
| Network isolation | PASS | agent sees 9 accounts, no master/other admin |
| Database persistence | PASS | PostgreSQL schema/seed, wallet/round/bet records |
| Auth/authorization | PASS | session, RBAC, scope, trigger tests |
| Security tests | PASS with findings | `SECURITY_TEST_REPORT.md` |
| Production build | PASS | `tsc --noEmit && vite build` |
| Performance | PARTIAL | ~183 KB gzip JS after all-game and blackjack additions; no load test; illustrated SVG covers add no image payloads |
| Critical defects | NONE KNOWN | recent bug fixes covered in E2E report |
| Restricted functionality disabled | PASS | money locked; no certified provider session claimed |
| Legal/licensing satisfied | FAIL / BLOCKED | no licence; no real-money operation |

## Go/no-go by capability

| Capability | Decision |
| --- | --- |
| Sandbox coin demo/public preview | **GO** |
| Player account + coin wallet | **GO** (with security hardening) |
| 19X Originals | **GO** for demo; all 44 catalogue titles playable; independent certification not done |
| 1X2 demo sportsbook settlement | **GO** for demo; results are server-generated demonstration data |
| Manual QR deposit review | **GO** for sandbox; **NO-GO** for live collection until merchant QR, licensing, KYC/AML, `PAYMENTS_LIVE_ENABLED` and reconciliation are approved |
| Fantasy contests | **GO** for sandbox coins; **NO-GO** for paid contests until legal review, real player data and scoring provider |
| Manual KYC review | **GO** for sandbox; production requires an approved KYC provider, encrypted documents and sanctions screening |
| Manual withdrawals | **GO** for sandbox review; **NO-GO** for live payout until merchant rails, reconciliation and approval controls are live |
| Provider/live dealer | **NO-GO** until contracts/certification/session adapter; not claimed |
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
9. Independent WCAG 2.2 AA audit; automated Lighthouse and responsive checks pass.
10. External penetration test and legal review.
11. Multi-market sports model and settlement worker if claiming that parity.
12. Provider adapter/certification if certified or live-dealer parity is claimed; the current catalogue is explicitly 19X Originals.

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
