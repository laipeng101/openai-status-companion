# Validation

## 2.1.1

- `npm run check` built the userscript and passed all 78 tests. The runtime tests cover late portal insertion and removal, restoring the preferred dock, modal and full-viewport obstructions, narrow sidebar drawers and notice placement around the composer.
- Inspected the account and usage menus in live ChatGPT. Both are portaled menus with Radix positioning wrappers. Reproduced their geometry with the production bundle and synthetic data in the Chrome preview.
- At 2560×1271, both menus and the status button were visible without overlap. The open details panel fit beside the usage menu. The widget was hidden during a native dialog and returned to its preferred dock when the dialog closed.
- At 390×844, the menu and launcher stayed clear and the details could use a compact scrollable panel. Opening the drawer hid the widget until the drawer closed. At 320×740, the launcher hid while the usage menu left no clear space.

## 2.1.0

Performed on 2026-11-03 with Node.js 24.20.0 and Chrome.

### Automated checks

`npm run check` rebuilds the complete userscript and runs Node/jsdom regression tests. All 75 tests passed locally. Tests cover:

- Public current-schema status snapshot; inert RSC parsing; schema changes and malformed data; unknown statuses; maintenance/outage severity; unordered incident updates; visible groups and safe incident URLs.
- All 13 locales' complete message keys and placeholder parity; regional matching, Chinese script/region precedence, private-use extension isolation and extensible English fallback.
- Switching every bundled language in the production bundle, saved preferences, translated menus, status severity, Arabic RTL and original official text direction.
- Package/lockfile/bundle version consistency, localized publication metadata and the unchanged network scope.
- All three matched hosts; initial HTTP/network/timeout failure; partial JSON verification; stale successful data; anonymous request options; denied storage; duplicate execution and host remount.
- Preferences, dynamic menu translation, reduced live-region updates, keyboard dismissal, disclosure/focus/scroll preservation.
- Visible ancestor clipping, independent horizontal/vertical overflow, paint containment, nested clip intersections and hidden ancestors.
- The ChatGPT regression where an inner sidebar remains 340px wide while its ancestor clips it to 52px. Both launcher and open panel follow the actual visible edge on all three matched hosts.
- Intermediate animation frames, animation completion/cancellation and bounded tracking; sidebar replacement and observer rebinding; hidden-page pause/resume; fixed corner settings, mobile bounds, visual viewport offsets and safe-area insets.
- Changes inside the conversation subtree do not trigger sidebar layout tracking.

The committed fixture is reduced public status data. Live API inspection found that the compatibility feed omits incident and maintenance arrays; these are explicitly unverified, not zero.

### Chrome layout checks

- Exercised the unchanged 2.1.0 production bundle with synthetic status responses in Chrome: all 13 languages at 390×844, and all 13 in both light and dark themes at 320×740. The open panels stayed within the viewport with no horizontal content overflow.
- Verified Arabic interface direction is RTL while the English incident title and original update body use LTR direction. The translated label and local time remain separate from the original body.
- Rechecked current-bundle desktop docking in Hindi/ChatGPT and Traditional Chinese/Leopard-X fixtures: ChatGPT collapsed x=66, expanded x=354; Leopard-X expanded x=274, collapsed x=66.
- Independently reviewed the translations and integration; corrected Korean service-incident terminology and excluded private-use language subtags from Chinese script matching.

The earlier 2.0.1 sidebar investigation established these regression cases, which remain covered:

- Inspected current live ChatGPT structure: the 340px `#app-shell-sidebar` is clipped by a 52px ancestor when collapsed. During temporary expansion, that ancestor permits visible overflow. This established the regression's actual DOM and CSS behavior.
- Exercised the unchanged 2.0.1 production bundle on a loopback fixture reproducing that structure. Collapsed: visible edge x=52, launcher and panel x=66. Expanded or temporary peek: visible edge x=340, launcher x=354.
- Exercised the Leopard-X fixture with the unchanged bundle. Expanded: sidebar x=260, launcher x=274. Collapsed: the sidebar translates off screen, the rail ends at x=52 and launcher moves to x=66.
- Checked English/dark and Chinese/light layouts. At 390×844 in Chinese/dark mode, launcher x=10 and the open panel remained between x=10 and x=380, with a 370px width. Temporary viewport changes were reset.
- The local fixture labels its synthetic status responses and makes no OpenAI requests. It also supports incident, maintenance, unavailable and compatibility-data scenarios.
- An independent review found no blocking issue in ancestor clipping, animation tracking, observer rebinding or runtime integration.

### Limits

This revision's browser rendering checks use the production bundle with synthetic transport on a local fixture; they do not claim a newly installed-manager test. Authenticated Mana-X was not exercised live. Translation review and structural tests are not native-speaker review of every language. Tests do not establish future manager-update timing, all mobile keyboards, all browsers, future site layouts, or actual service availability for an individual account.
