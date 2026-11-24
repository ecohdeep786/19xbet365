# 19XBET365 Design System

## Brand direction

The public product now uses a **bookmaker light theme** aligned with the reference’s information hierarchy: deep-blue chrome, pale blue page surfaces, white cards, green primary actions, and blue odds. The internal Master Admin remains a dark control-room theme so it is visually distinct from the player-facing product.

Sora is the display typeface and Manrope is the body typeface, both served locally from `frontend/public/fonts/`. All artwork and iconography are original or licensed open-source icons; no 1xBet visual assets are used.

## Theme scopes

- `body` default / admin: dark control-room tokens in `theme.css`.
- `.bookmaker` public wrapper: light tokens in `bookmaker.css`.
- `.auth-page.bookmaker`: light auth panel with deep-blue brand artwork.

The `PublicLayout` wraps the header, pages, footer and overlays in `.bookmaker`; `AdminLayout` stays outside it.

## Public colour tokens

| Token | Value | Use |
| --- | --- | --- |
| page background | `#eef3f9` | public canvas |
| soft background | `#f6f9fd` | secondary surface |
| surface | `#ffffff` | panels/cards |
| line | `#d7e2ee` | borders/dividers |
| line strong | `#b9cadd` | emphasis |
| text | `#10243d` | primary copy |
| text soft | `#304660` | secondary |
| muted | `#5f748a` | helper |
| blue | `#1266d6` | information/active/odds |
| blue deep | `#0d4fae` | primary gradient |
| green | `#1c9b4b` | CTA/win |
| coral | `#d84b5d` | live/danger/bust |
| violet | `#6d56d9` | tournament/secondary |
| amber | `#b77b13` | warning/integration |

Header chrome uses `#0c3a6c`, ticker `#082c53`, with white navigation and lime-green active accents.

## Admin colour tokens

Admin keeps the original dark navy/cyan/lime instrumentation palette for a distinct operational context. Public light tokens do not bleed into admin because `.bookmaker` is not applied there.

## Typography

| Role | Font | Scale |
| --- | --- | --- |
| Display / h1 | Sora | `clamp(2.6rem, 5.2vw, 4.7rem)` |
| Section h2 | Sora | `clamp(1.55rem, 2.6vw, 2.3rem)` |
| Card title | Sora | `.82–1.3rem` |
| Body | Manrope | `15px` base, `.7–.95rem` UI |
| Labels / eyebrows | Sora | `.6–.78rem`, spaced uppercase |
| Odds | Sora | `.6–.9rem`, tabular presentation |

Numeric odds remain compact and aligned; all labels use the supplied Sora/Manrope pair. The public theme applies `tabular-nums` and `lining-nums` so odds, balances and timestamps keep a stable column rhythm. Headings use `text-wrap: balance`, body copy uses `text-wrap: pretty`, and font smoothing/optical sizing are enabled. No reference font files are used.

## Iconography and graphics

The interface uses three complementary, original mark systems:

- **SportGlyph** (`frontend/src/components/SportIcon.tsx`): a hand-drawn 24px set for football, cricket, tennis, table tennis, basketball, ice hockey, esports, horse racing, volleyball, MMA, baseball, badminton, darts, motor sport, snooker, handball and Australian rules. Distinct silhouettes replace the previous reused generic icons; a neutral ball mark is the fallback.
- **TeamBadge** (`frontend/src/components/TeamBadge.tsx`): deterministic two-letter club mark in a generated circular colour field. It gives every fixture a recognisable identity without copying real club crests.
- **ProviderMark** (`frontend/src/components/ProviderMark.tsx`): a small square monogram on catalogue cards, replacing plain provider text with a scannable mark while keeping the provider name visible.

Navigation categories (Top Events, Cricket, Sports, Live, 1xGames, Slots, Live Casino, More), casino filter chips and the mobile drawer use the same 13–17px icon scale. Icons that sit next to a visible label are `aria-hidden`; icon-only controls retain an accessible name. No third-party sports, provider, payment or operator artwork is bundled.

Icon sizing follows a 13/15/17/22px ladder. `currentColor` is used so marks inherit the blue bookmaker ink on light surfaces and white/green ink in the dark header and control room.

## Header and navigation

- Deep-blue utility header with brand wordmark (`19` mark + `XBET365`).
- Reference-style categories: Top Events, Cricket, Sports, Live, 1xGames, Slots, Live Casino, More.
- Green registration CTA, blue login, search, locale (`EN · VC`), notifications, balance, account menu, bet slip.
- Mega-menu panels are white, with dark copy and pale hover states.
- Mobile: drawer with sections, search, account, support and admin links; header collapses search at ≤480px and avatar at ≤380px.

## Surfaces and data density

- White panels with light borders and low shadows.
- Dark blue ticker and footer.
- Pale blue page heroes with a subtle grid.
- Game cards retain dark artwork inside white card frames so original art stays legible.
- Sports rows use pale-blue odds buttons, green selected state, blue active underline.
- Account panels, wallet, support, legal, help and admin content use the same surface hierarchy.

## Motion

| Motion | Implementation |
| --- | --- |
| Card entrance | `fadeUp .35s ease both`, stagger |
| Hover lift | `translateY(-3px)` 220ms |
| Drawer | slide in 220ms |
| Modal/toast | fade/fade-up 160–220ms |
| Live pulse | 1.8s pulse |
| Hero orbit | 22s / 34s rotation, floating cards 6s |
| Reduced motion | all animation/transition durations collapse under `prefers-reduced-motion` |

No fake urgency countdowns or flashing alerts.

## Components

- `Button`: primary blue, lime/green action, secondary light blue, ghost, danger, outline.
- `Badge`: light green/blue/coral/violet/amber/outline.
- `Input`, `Field`, `Select`, `Textarea`, `checkline`.
- `Avatar`, `Modal`, `Segmented`, `Skeleton`, `EmptyState`, `ErrorState`, `Stat`, `ProgressBar`, `CopyButton`, `StatusDot`.
- `ToastProvider`.
- `BetSlipDrawer` + persistent `BetSlipRail`.
- `GameCard` + category-specific original SVG `GameArt`.
- `MatchRow` / `OddsButton` with pressed, selected, live and finished states. Finished rows show an `FT · settled` badge, final scores and disabled odds.
- `Bet settlement` toast driven by the WebSocket `bet.settled` event and filtered to the owning account.
- `AdminHeader`, `AdminScopePill`, `AdminBreadcrumb`.
- `ErrorBoundary`.

## Accessibility

- Skip-to-content on public and admin shells.
- Visible focus rings.
- Reduced-motion media query.
- Semantic buttons, field labels, `aria-label` on icon controls, `aria-pressed` on odds, dialog `aria-modal`, live toast region.
- Responsive controls retain 31–50px target heights.
- Contrast corrected for light surfaces, promo cards, game-card overlays, tournament cards, help hero, support badges and legal pages.
