# Reference inventory — 1xBet

This foundation was researched against the public 1xBet experience, which redirected to `https://1xlite-12669.pro/en` during the session. The goal was to understand structure, density, and interaction patterns, not to copy assets, wording, branding, or proprietary artwork.

## Public surfaces inspected

- Home / sportsbook shell
- Registration form
- Login form
- Live casino lobby
- 1xGames lobby
- Slots lobby
- Sports line
- Live betting
- Virtual sports
- Crash game page
- Crash Point page

Ticket, betting, deposit, withdrawal, and account surfaces were login-gated or region-gated. No access controls were bypassed; the build therefore uses an independent account and coin model.

## Design observations

1. **Dense information, clear hierarchy.** The reference packs sports and markets into rows with strong league grouping and a persistent bet slip.
2. **Dark casino lobbies.** Game tiles rely on saturated branded art, provider labels, badges, and a persistent left/top category system.
3. **Sportsbook utility.** The header prioritises sports, live, casino, promotions, and account actions; balance and bet slip are always reachable.
4. **Registration/login split.** Auth screens use a narrow card with prominent fields, social/partner buttons, and legal copy.
5. **Live and provider distinctions.** The reference mixes first-party instant games with third-party provider products; its catalogue is much larger than the public shell can communicate in one view.
6. **Mobile compression.** Navigation collapses to a drawer; game tiles remain two-up; odds remain immediately actionable.

## 19xbet365 original interpretation

- Brand: **19X / 19xbet365**, deep-blue header chrome, pale blue/white bookmaker surfaces, green primary actions, Roboto Condensed display type, Roboto body type.
- All hero art, game-card art, orbit graphics, icons, copy, layout, and CSS are original to this project. No 1xBet image files, logos, fonts, or text were reused.
- The sportsbook model is illustrative demo fixtures, not copied live odds.
- The casino catalogue contains 11 playable server-authoritative 19X Originals plus 33 clearly labelled integration-ready provider titles.
- The Master Admin control room and hierarchical RBAC model are original requirements from this project, not public reference features.

## Reference limitations documented in the build

- No real-money deposits, withdrawals, wagering, or cash redemption.
- No certified provider sessions; provider titles show `provider_required` and explain the missing integration.
- No copied live dealer video, live odds feed, or proprietary game artwork.
- Public reference pages may change and may differ by region, currency, or login state.
- The reference site's public shell is not a complete specification for a licensed sportsbook; any production launch would require jurisdiction-specific licensing, KYC/AML, responsible-gaming approvals, provider contracts, independent testing, and legal review.

## Capture folder

`capture/` contains reference screenshots and layout notes used during the visual comparison. `capture/screenshot-1440.png` and `capture/screenshot-390.png` are the desktop/mobile reference captures. These files are research artifacts and are not shipped to the frontend.
