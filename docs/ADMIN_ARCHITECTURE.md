# Admin Architecture

## Role hierarchy

```text
master_admin (rank 0)
  └── admin (rank 1)
        └── sub_admin (rank 2)
              └── agent (rank 3)
                    └── player (rank 4)
```

`accounts.parent_id` is the authoritative hierarchy. A Master Admin has global scope; every other staff account receives a recursive descendant scope from `backend/src/lib/scope.js`. Scope is recalculated server-side on every request; no client-provided ID list is trusted.

## Permissions

Permissions are stored in `roles.permissions` and enforced by `requirePermission` after a staff check. The Master Admin bypasses individual permission checks but remains unable to bypass database immutability triggers. Role permissions are configurable by the Master Admin except for the protected `master_admin` role.

Important permissions:

- `network.view.scope`, `network.manage`
- `accounts.suspend`, `accounts.restore`, `accounts.create.*`, `credits.adjust`
- `roles.manage`
- `games.view`, `games.manage`
- `content.manage`, `promotions.manage`
- `support.view`, `support.manage`
- `transfers.approve`
- `security.view`
- `audit.view.scope`, `audit.view.global`
- `settings.manage`
- `reports.view.scope`, `reports.view.global`
- `notifications.broadcast`
- `system.view`

## Screens and operations

| Screen | Path | Key operations | Scope |
| --- | --- | --- | --- |
| Command centre | `/admin` | metrics, 7-day series, role counts, alerts, audit tip, JSON export | actor scope |
| Revenue & risk | `/admin/revenue` | GGR, sports/game product mix, open exposure, deposits, bonus cost, NGR, active players | `reports.view.scope`; actor scope |
| Hierarchy | `/admin/network` | recursive tree, role/status/balance, search | actor branch |
| Accounts | `/admin/accounts` | search/filter/paginate, manage modal | actor branch |
| Account actions | modal | suspend/restore, credit adjustment, role change, revoke sessions | target must be descendant; rank checks |
| Staff credentials | `/admin/accounts` modal | create account/login ID, one-time temporary password, copy handoff; staff account is created immediately | **Master Admin only** |
| Roles | `/admin/roles` | permission matrix, save per role | Master only |
| Game catalogue | `/admin/games` | status, featured, badge/copy; no outcome edits | `games.view/manage` |
| Content | `/admin/content` | page title/body/status; promotion title/terms/active | `content.manage`, `promotions.manage` |
| Credit activity | `/admin/credits` | summary, chart, searchable adjustment ledger | `credits.adjust` |
| Support desk | `/admin/support` | filter, assign to me, status/priority, staff reply, internal note | support scope |
| Transfers | `/admin/transfers` | request move, approve/reject, reason | `transfers.approve` |
| Security | `/admin/security` | failed logins, active sessions, suspended accounts, credit events, chain status, revoke sessions | scope |
| Audit | `/admin/audit` | pagination, action filter, expand before/after/hash, CSV export | scope |
| Configuration | `/admin/settings` | grouped settings including sports stake/payout caps; `realMoneyEnabled` hard locked false | Master only |
| Health | `/admin/system` | API, DB latency/size, memory, counts, integrations, audit chain, rails | scope/system |

## Protections

- A staff account cannot suspend or change an account at or above its rank.
- Self-suspension and self-credit adjustments are blocked.
- Master Admin cannot be suspended, demoted, or role-changed through the API.
- Credit adjustments are limited to player accounts and require a reason of at least 8 characters.
- Target accounts are checked against the actor's recursive scope.
- Only the Master Admin can create any staff login or issue a temporary password. Administrators can manage scoped users and the game catalogue but cannot create staff accounts, issue credentials, change roles, open settings, review deposits or access other Master-only controls.
- Transfer approval checks destination branch scope and records a reason.
- All privileged changes append an audit event with actor, action, entity, before/after, IP, and hash chain.
- Audit and settled rounds are protected by PostgreSQL triggers.
- The admin navigation filters unavailable links using the actor's permissions, but route/API authorization remains authoritative.

## Delegated administration evidence

`scripts/security-smoke.mjs` logs in as agent Luca Moretti:

- 9 scoped accounts, roles only `agent` + `player`.
- No Master Admin or other Admin appears.
- Scoped overview: `global: false`, `accountCount: 9`.
- `/api/admin/roles` and `/api/admin/transfers` return permission denied.
- A player gets `staff_required` for `/api/admin/overview`.
- Anonymous admin access is `401`.
- Master credential issuance returns a one-time email/password; the new admin can access scoped accounts and the game catalogue but receives `403` for settings, roles and further staff issuance.
- A branch admin is blocked from staff credential creation by `requireMaster`.

## Files

- `backend/src/middleware/auth.js` — sessions and guards.
- `backend/src/routes/admin.js` — all admin operations.
- `backend/src/lib/scope.js` — recursive scope.
- `backend/src/lib/audit.js` — chain append/verify.
- `frontend/src/pages/admin/*` — control-room UI.
- `frontend/src/pages/admin/AdminLayout.tsx` — nav/scope shell.
