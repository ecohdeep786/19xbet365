# Route Inventory

## Frontend routes

| Route | Page | Access | Purpose |
| --- | --- | --- | --- |
| `/` | Home | Public | branded landing, live feed, originals, promotions |
| `/sports` | Sports | Public | all demo fixtures, sport/search/status filters |
| `/live` | LiveSports | Public | in-play spotlight + live fixture board |
| `/esports` | Esports | Public | esports-filtered fixtures |
| `/virtuals` | VirtualSports | Public | virtual titles + racing schedule |
| `/casino` | Casino | Public | full lobby, search/sort/favourites |
| `/live-casino` | LiveCasino | Public | integration-required table previews |
| `/slots` | Slots | Public | slot catalogue |
| `/instant` | InstantGames | Public | playable 19X Originals |
| `/promotions` | Promotions | Public | virtual-credit campaign cards and terms |
| `/tournaments` | Tournaments | Public | live/upcoming/finished leaderboards |
| `/search` | SearchPage | Public | games, fixtures, help search |
| `/game/:id` | GamePage | Public | playable game or provider-required preview |
| `/help`, `/help/:slug` | HelpPage | Public | help centre and article |
| `/support` | SupportPage | Authenticated player | tickets, messages, new ticket |
| `/login` | Login | Public | session login + demo buttons |
| `/register` | Register | Public | player registration |
| `/forgot-password` | ForgotPassword | Public | recovery request |
| `/account` | AccountOverview | Auth | player dashboard |
| `/account/profile` | AccountProfile | Auth | profile details |
| `/account/wallet` | AccountWallet | Auth | virtual-credit ledger |
| `/account/bets` | AccountBets | Auth | sports bet history |
| `/account/activity` | AccountActivity | Auth | game round history |
| `/account/notifications` | AccountNotifications | Auth | inbox |
| `/account/security` | AccountSecurity | Auth | password, sessions, 2FA preference |
| `/account/referrals` | AccountReferrals | Auth | code and referral status |
| `/account/responsible` | AccountResponsible | Auth | limits, cool-off, exclusion |
| `/about` | StaticPage | Public | company information |
| `/terms` | StaticPage | Public | terms |
| `/privacy` | StaticPage | Public | privacy |
| `/cookies` | StaticPage | Public | cookies |
| `/aml` | StaticPage | Public | AML/KYC policy |
| `/bonus-terms` | StaticPage | Public | bonus terms |
| `/affiliates` | StaticPage | Public | affiliate programme |
| `/responsible-gaming` | StaticPage | Public | responsible play |
| `/admin` | AdminDashboard | Staff | scoped command centre |
| `/admin/network` | AdminNetworkPage | Staff | hierarchy tree |
| `/admin/accounts` | AdminAccountsPage | Staff | accounts + actions |
| `/admin/roles` | AdminRolesPage | Master | role permissions |
| `/admin/games` | AdminGamesPage | Staff with games.view | catalogue operations |
| `/admin/content` | AdminContentPage | Staff with content.manage | pages/promotions |
| `/admin/credits` | AdminCreditsPage | Staff with credits.adjust | adjustment ledger |
| `/admin/support` | AdminSupportPage | Staff with support.view | support desk |
| `/admin/transfers` | AdminTransfersPage | Staff with transfers.approve | moves/approval |
| `/admin/security` | AdminSecurityPage | Staff with security.view | sessions/failures |
| `/admin/audit` | AdminAuditPage | Staff with audit.view.scope | immutable events |
| `/admin/settings` | AdminSettingsPage | Master | configuration |
| `/admin/system` | AdminSystemPage | Staff with system.view | health |
| `*` | NotFound | Public | 404 |

`frontend/src/App.tsx` is the authoritative route table. HashRouter is used so deep links survive static previews; Express also provides an SPA fallback.

## Backend route groups

- `/api/auth/*` — registration, login, logout, me, recovery, profile, sessions, 2FA preference.
- `/api` — health, bootstrap, matches, games, promotions, tournaments, content, public settings, responsible info.
- `/api/player/*` — overview, transactions, bets, rounds, notifications, favourites, recent, responsible, referrals, support.
- `/api/bets` — sports bet placement.
- `/api/games/*` — instant play, activity, Crash and Mines multi-step routes.
- `/api/admin/*` — dashboard, network, accounts, invitations, roles, games, content, credits, support, transfers, security, audit, settings, system, broadcast.

Full method and payload details are in `docs/API_SPECIFICATION.md`.
