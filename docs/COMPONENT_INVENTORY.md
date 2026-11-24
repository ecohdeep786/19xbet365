# Component Inventory

All paths are relative to `frontend/src/`.

## Shell and navigation

| Component | File | Responsibility |
| --- | --- | --- |
| `Logo` | `components/Layout.tsx` | 19X wordmark |
| `Header` | `components/Layout.tsx` | desktop/mobile navigation, search overlay, ticker, balance, notifications, account menu, bet slip trigger |
| `MobileNav` | `components/Layout.tsx` | drawer navigation, auth actions, search/help/admin links |
| `Footer` | `components/Layout.tsx` | brand/legal/product links, live channel status |
| `PublicLayout` | `App.tsx` | skip link, header, main, footer |
| `AdminLayout` | `pages/admin/AdminLayout.tsx` | control-room sidebar, scope card, topbar, account menu |
| `ErrorBoundary` | `components/ErrorBoundary.tsx` | recover from render failure |

## Design system

| Component | File | Responsibility |
| --- | --- | --- |
| `Button`, `Badge`, `Avatar` | `components/UI.tsx` | core controls |
| `Field`, `Input`, `Select`, `Textarea` | `components/UI.tsx` | form primitives |
| `Skeleton`, `EmptyState`, `ErrorState` | `components/UI.tsx` | state surfaces |
| `Modal`, `SectionHeading`, `Stat`, `ProgressBar`, `CopyButton`, `StatusDot`, `Segmented` | `components/UI.tsx` | overlays, data hierarchy, filters |
| `GameArt` | `components/GameArt.tsx` | category-specific SVG artwork |
| `GameCard` / `GameRail` | `components/GameCard.tsx` | catalogue tiles, provider mark, favourite action |
| `MatchRow` / `OddsButton` | `components/MatchRow.tsx` | sportsbook rows and 1X2 interaction |
| `SportIcon` | `components/SportIcon.tsx` | original per-sport SVG glyph set with fallback |
| `TeamBadge` | `components/TeamBadge.tsx` | deterministic club monogram for fixture identity |
| `ProviderMark` | `components/ProviderMark.tsx` | catalogue provider monogram |

## Global state

| Provider | File | Responsibility |
| --- | --- | --- |
| `ToastProvider` | `state/ToastContext.tsx` | transient feedback |
| `AuthProvider` | `state/AuthContext.tsx` | session, login/register/logout, 401 expiry handling |
| `DataProvider` | `state/DataContext.tsx` | bootstrap catalogue, favourites, recent, notifications, WebSocket status |
| `BetSlipProvider` | `state/BetSlipContext.tsx` | selections, stake, totals, placement |
| API client | `lib/api.ts` | typed REST wrappers, errors, 401 dispatch |
| Demo catalogue | `lib/demo.ts` | offline browser fallback |
| Simulated instant engine | `lib/simulate.ts` | browser-preview fallback only |
| Formatters | `lib/format.ts` | VC, odds, dates, relative times, labels |
| Static content | `lib/content.ts` | fallback legal content |

## Page families

- Public: `Home.tsx`, `Sports.tsx` (sports/live/esports/virtuals), `Casino.tsx` (casino/live/slots/instant), `Promotions.tsx`, `Search.tsx`.
- Game: `pages/game/GamePage.tsx`, `CrashGame.tsx`, `MinesGame.tsx`, `InstantGames.tsx`, `StakeBox.tsx`.
- Auth: `Auth.tsx` (login/register/recovery).
- Account: `AccountLayout.tsx`, `Overview.tsx`, `Profile.tsx`, `Wallet.tsx`, `Bets.tsx`, `Activity.tsx`, `Notifications.tsx`, `Security.tsx`, `Referrals.tsx`, `Responsible.tsx`.
- Support/content: `Support.tsx`, `Help.tsx`, `StaticPage.tsx`, `NotFound.tsx`.
- Admin: `Dashboard.tsx`, `Network.tsx`, `Accounts.tsx`, `Roles.tsx`, `Games.tsx`, `Content.tsx`, `Credits.tsx`, `Support.tsx`, `Transfers.tsx`, `Security.tsx`, `Audit.tsx`, `Settings.tsx`, `System.tsx`.

## Backend inventory

| Area | File |
| --- | --- |
| API entry | `backend/src/index.js` |
| DB pool/transactions | `backend/src/db.js` |
| Schema | `backend/db/schema.sql` |
| Seed | `backend/db/seed.js` |
| Auth/session/RBAC | `backend/src/middleware/auth.js`, `backend/src/routes/auth.js` |
| Public catalogue/content | `backend/src/routes/public.js` |
| Player account surfaces | `backend/src/routes/player.js` |
| Sports bets | `backend/src/routes/bets.js` |
| Games | `backend/src/routes/games.js` |
| Game engine | `backend/src/services/gameEngine.js` |
| Wallet | `backend/src/services/wallet.js` |
| Referral rewards | `backend/src/services/referrals.js` |
| Scope | `backend/src/lib/scope.js` |
| Audit chain | `backend/src/lib/audit.js` |
| WebSocket | `backend/src/ws.js` |
| Admin | `backend/src/routes/admin.js` |
