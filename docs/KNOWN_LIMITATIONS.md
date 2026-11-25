# Known Limitations

19xbet365 is a production-oriented sandbox coin foundation, not a licensed real-money operator. The following are intentionally incomplete or require external authorization.

## Legal / financial

1. **The financial rail is sandbox/manual-review only.** Deposit requests, QR instructions, Master Admin review, percentage bonuses, KYC submission, withdrawal requests and mark-paid states are implemented. Live collection is rejected unless `PAYMENTS_LIVE_ENABLED=true`; automated withdrawal execution, cash redemption and cash commissions are disabled, and `realMoneyEnabled` remains hard-locked server-side.
2. **No licence, merchant account, payment webhook or KYC/AML provider.** A real-money launch requires jurisdiction-specific legal review, licensing, a business-owned payment QR/merchant account, KYC/sanctions checks, transaction monitoring, responsible-gaming approvals, withdrawal policy, reconciliation and external testing.
3. **Deposit bonuses are sandbox-simple.** The server calculates the configured percentage tier and credits it immediately. Production bonus terms still need wagering/playthrough rules, caps, expiry, forfeiture, prohibited-play rules and jurisdiction-specific legal review.
4. **Affiliate commissions disabled.** Referral rewards are virtual credits only and never grant staff access.
5. **Legal pages are demonstration documents** and require jurisdiction-specific legal review.

## Product / functional

6. **Sportsbook foundation supports 1X2 only.** No double chance, totals, BTTS, team wins, live market suspension engine, or cash-out.
7. **Sports settlement is demo-only.** A server-side worker starts upcoming fixtures, finishes live fixtures after a simulated duration, and settles 1X2 singles/accumulators with generated final scores. There is no real sports feed, live-market suspension, or multi-market settlement; results are demonstration data and are recorded in the audit trail.
8. **Provider games are integration-ready, not playable.** They return `409 provider_required`; no provider sessions, live dealer feeds, or certified outcomes exist.
9. **Live casino is a preview.** No dealer video, live table, or wagering session is active.
10. **Language selection is not implemented.** Content is English-only; translation catalogues and locale persistence are required.
11. **Save/load bet slip is not implemented.** Current slip is in-memory; refreshing clears it.
12. **Registration is email/password only.** No SMS, social, phone, or email verification flow.
13. **Password reset is manual.** The request is recorded in account notifications; no transactional email delivery.
14. **2FA is only a stored preference.** No authenticator/SMS challenge is provisioned.
15. **KYC document upload is absent.** Only the policy and disabled-state messaging exist.
16. **Provider game art is CSS/SVG**, not licensed provider artwork; this is deliberate to avoid unauthorized assets.
17. **No live chat provider.** Support is ticket/thread based.
18. **No automated promo engine.** Promotions communicate terms but do not pay automatically.
19. **No automated tournament qualification.** Standings are seeded demo data.

## Technical / operational

20. **HashRouter** keeps static preview deep links working but is not ideal for SEO. A production web deployment should consider BrowserRouter plus server rewrites.
21. **Single-process rate limiting** (in-memory). Use Redis for multi-instance deployments.
22. **No CSRF token**; SameSite=Lax and JSON requests are the current mitigation. Add origin checks/tokens.
23. **CSP is disabled** for the SPA build. Configure a production CSP with asset hashes/nonces.
24. **No automated visual regression suite** (Percy/Chromatic). Browser QA was manual plus controlled iframe measurement.
25. **No real-device touch/landscape QA.** The responsive harness covers widths, not physical gestures.
26. **No full WCAG audit** with screen readers; skip links, focus rings, labels, and reduced motion are implemented.
27. **No external penetration test.**
28. **No PITR/backup automation** in the repo; recommendations are documented.
29. **No image generation/stock assets** were used; artwork is hand-built CSS/SVG. Some promotional compositions are intentionally simpler than a licensed art team would deliver.
30. **Seeded demo data is reset by `backend/db/seed.js`.** There is no admin data-reset UI.

## External dependencies

- PostgreSQL 16 at `127.0.0.1:5433` for the default development configuration.
- No npm on PATH in the build environment; commands used `tools/package/bin/npm-cli.js`.
- Image-generation tool unavailable (insufficient balance), so no generated raster assets.
- Reference login/account/wallet/ticket pages were gated; no restricted access was bypassed.

## Acceptance position

The public, player, game-engine, support, account, RBAC, admin, audit, and responsive foundations are implemented and tested. Real-money, provider, email/SMS, KYC, multilingual, and automated campaign/settlement capabilities remain external or explicitly disabled. These blockers must stay visible in any production review.
