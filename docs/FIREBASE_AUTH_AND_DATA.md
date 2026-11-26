# Firebase Authentication and Production Data Architecture

**Date:** 26 November 2026  
**Firebase project:** `xbet365-ab8fb`  
**Status:** Firebase email/password authentication is implemented for players. PostgreSQL remains the system of record for wallets, game rounds, bets, payments, KYC, audit events and admin controls.

## 1. What is live

- Firebase Authentication email/password sign-up and sign-in for players.
- Server-side Firebase ID-token verification using Google's public signing certificates.
- Automatic linking of a verified Firebase identity to an existing player account with the same email.
- New player creation with the standard 10,500-coin welcome allocation, referral handling, welcome notification, responsible-play defaults and audit record.
- Existing HttpOnly server sessions remain the API authorization mechanism. Firebase is the identity provider; it is not trusted to authorize wallet actions directly.
- Firebase session restoration: if the server session expires but Firebase still has a valid user, the client silently exchanges a fresh ID token for a new server session.
- Email-verification gate: unverified accounts can play with coins but cannot add coins or request withdrawals.
- Seeded demo and staff accounts continue to use issued passwords. Firebase auto-linking is refused for staff roles.
- Invalid, revoked or disabled Firebase identities are rejected server-side.
- Firebase SDK is code-split and loaded only when a secure identity flow is used; public pages keep the original bundle profile.

## 2. Why the wallet is not in Firestore

Firestore is a good real-time document database, but it is the wrong authority for a gambling ledger:

1. **Atomic multi-row settlement.** A game round, wallet debit/credit, transaction ledger entry, referral reward, notification and audit event must commit or roll back together. PostgreSQL transactions and row locks provide this; a document store would require fragile distributed compensation.
2. **Invariants.** `CHECK (balance >= 0)`, foreign keys, unique indexes and the settled-round immutability trigger are enforced by the database. Equivalent Firestore rules cannot protect server-side aggregate invariants.
3. **Audit integrity.** The hash-chained `audit_events` table and append-only trigger are part of the control model. Firestore has no equivalent database-level append-only guarantee.
4. **Reporting and reconciliation.** GGR, NGR, exposure, deposit/withdrawal reconciliation and role-scoped admin queries are SQL workloads.
5. **Split-brain risk.** Mirroring balances into Firestore creates two sources of truth and a race between them. A player could see a stale or divergent balance.

**Decision:** Firebase handles identity. PostgreSQL handles money, game state, compliance and audit. If Firestore is added later, it should be a read-only projection for low-risk real-time surfaces (public live scores, presence, notification badges), written only by the backend with the Admin SDK and protected by deny-by-default security rules. It must never accept client writes for balances, bets, rounds or withdrawals.

## 3. Request flow

```text
Player
  │  email/password or Google
  ▼
Firebase Authentication
  │  signed ID token (JWT, ~1 hour)
  ▼
Frontend POST /api/auth/firebase { idToken }
  │
  ▼
Express verifies signature, issuer, audience and expiry
  │
  ├─ existing firebase_uid ──► issue server session
  ├─ existing player email + verified email ──► link firebase_uid, issue session
  ├─ staff email ──► reject; staff use issued password
  └─ new email ──► create player, welcome ledger, audit, issue session
  │
  ▼
HttpOnly xbet_session cookie
  │
  ▼
All wallet/game/admin APIs use the existing server session + RBAC
```

The browser never supplies a balance, role, account ID, game outcome or settlement amount.

## 4. Database changes

`accounts` now includes:

| Column | Purpose |
| --- | --- |
| `firebase_uid` | Unique Firebase identity UID; nullable for password-only/demo accounts |
| `auth_provider` | `password` or `firebase`; new Firebase-only accounts use `firebase` |
| `email_verified` | Mirrors the Firebase email-verification state; defaults true for seeded accounts |

`accounts_firebase_uid_idx` is a partial unique index. This prevents one Firebase identity from being attached to multiple accounts.

## 5. Security controls

- Firebase ID tokens are verified server-side; a client cannot mint a session by claiming an email.
- Unverified Firebase email addresses cannot link to an existing account, which blocks account takeover by email squatting.
- Staff/admin accounts are never auto-linked from a Firebase identity. A staff member must use the issued password until an explicit, authenticated linking workflow is added.
- Email verification is required for deposits and withdrawals. Play with sandbox coins remains available while verification is pending.
- Firebase password reset emails are used for Firebase-managed passwords; seeded accounts keep the existing notification-based recovery path.
- The Firebase web API key is a public identifier, not a server secret. Protect the project with authorized domains, API-key referrer restrictions, Firebase App Check where applicable, email-enumeration protection and MFA.
- Optional `FIREBASE_SERVICE_ACCOUNT_JSON` enables token-revocation checks and future server-side Firestore writes. The service-account JSON must never be shipped to the browser.
- Rate limits apply to `/api/auth/firebase`; general API limits also apply.

## 6. Firebase console setup required

1. **Authentication → Sign-in method:** Email/Password is enabled. Enable Google/Apple only when the provider is configured; set `VITE_FIREBASE_GOOGLE_ENABLED=true` for the Google button.
2. **Authentication → Settings → Authorized domains:** add every production hostname (for example `19xbet365.com`, `www.19xbet365.com`). `localhost` is used for local verification links; `127.0.0.1` is not an authorized domain.
3. **Authentication → Templates:** customise verification and password-reset emails with the production sender and support address.
4. **Authentication → Settings:** enable email-enumeration protection and a password policy.
5. **Google Cloud Console → API credentials:** restrict the Firebase browser key by HTTP referrer to the production domains.
6. **Firebase App Check:** enable reCAPTCHA Enterprise/App Check for any Firestore, Storage or Cloud Functions surface added later.
7. **Billing/quotas:** configure budgets and quotas before marketing traffic.
8. **MFA:** enable TOTP/SMS for players; require a stronger staff process before production money is enabled.
9. **Service account:** create a least-privilege service account only if revocation checks or backend Firestore writes are required. Store it in a secret manager, not in Git.

## 7. Environment variables

Backend:

```text
FIREBASE_PROJECT_ID=xbet365-ab8fb
# Optional, server-only. Enables revocation checks and Admin SDK writes.
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Frontend (public identifiers):

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=xbet365-ab8fb.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xbet365-ab8fb
VITE_FIREBASE_STORAGE_BUCKET=xbet365-ab8fb.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1079337385097
VITE_FIREBASE_APP_ID=1:1079337385097:web:f4d24b600520555bb0da58
VITE_FIREBASE_MEASUREMENT_ID=G-F342CYS1YK
VITE_FIREBASE_GOOGLE_ENABLED=false
```

The app has local fallbacks for the public web config, but production should set its own environment values explicitly.

## 8. Verification

- `scripts/firebase-smoke.mjs`: creates a real Firebase test identity, exchanges the ID token, verifies session issuance, welcome coins, idempotent re-login, unverified deposit gate, takeover protection and invalid-token rejection. The Firebase test user is deleted afterwards.
- `scripts/firebase-ui-smoke.mjs`: signs in through the real UI, checks the verification banner and deposit gate, restores the session after the server session is cleared, registers a new Firebase player, and confirms seeded password login still works. Firebase test users are deleted afterwards.
- Evidence screenshots: `capture/firebase-audit/`.

## 9. What Firebase does not solve

Firebase is not a payment processor, gambling licence, KYC/AML provider or certified RNG. A real-money launch still requires:

- jurisdiction-specific gambling licence and legal sign-off;
- merchant account and PSP (for example Razorpay/Stripe) with signed webhooks and reconciliation;
- KYC/AML, sanctions/PEP screening and liveness/document handling;
- responsible-gaming controls approved for the target jurisdiction;
- independently certified game maths and RNG;
- payment/withdrawal limits, chargeback handling and treasury controls;
- production observability, backups/PITR, incident response and external penetration testing.

The platform therefore remains a sandbox coin economy with manual deposit/KYC/withdrawal review. `PAYMENTS_LIVE_ENABLED=false`, `realMoneyEnabled=false` and automated payouts remain disabled until those external gates are complete.
