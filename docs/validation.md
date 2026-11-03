# Validation — 2.0.1

Performed on 2026-11-03 with Node.js 24.20.0 and Chrome.

## Automated checks

`npm run check` rebuilds the complete userscript and runs Node/jsdom regression tests. All 70 tests passed locally. Tests cover:

- Public current-schema status snapshot; inert RSC parsing; schema changes and malformed data; unknown statuses; maintenance/outage severity; unordered incident updates; visible groups and safe incident URLs.
- English/Chinese key and placeholder parity, locale detection and extensible English fallback.
- All three matched hosts; initial HTTP/network/timeout failure; partial JSON verification; stale successful data; anonymous request options; denied storage; duplicate execution and host remount.
- Preferences, dynamic menu translation, reduced live-region updates, keyboard dismissal, disclosure/focus/scroll preservation.
- Visible ancestor clipping, independent horizontal/vertical overflow, paint containment, nested clip intersections and hidden ancestors.
- The ChatGPT regression where an inner sidebar remains 340px wide while its ancestor clips it to 52px. Both launcher and open panel follow the actual visible edge on all three matched hosts.
- Intermediate animation frames, animation completion/cancellation and bounded tracking; sidebar replacement and observer rebinding; hidden-page pause/resume; fixed corner settings, mobile bounds, visual viewport offsets and safe-area insets.
- Changes inside the conversation subtree do not trigger sidebar layout tracking.

The committed fixture is reduced public status data. Live API inspection found that the compatibility feed omits incident and maintenance arrays; these are explicitly unverified, not zero.

## Chrome layout checks

- Inspected current live ChatGPT structure: the 340px `#app-shell-sidebar` is clipped by a 52px ancestor when collapsed. During temporary expansion, that ancestor permits visible overflow. This established the regression's actual DOM and CSS behavior.
- Exercised the unchanged 2.0.1 production bundle on a loopback fixture reproducing that structure. Collapsed: visible edge x=52, launcher and panel x=66. Expanded or temporary peek: visible edge x=340, launcher x=354.
- Exercised the Leopard-X fixture with the unchanged bundle. Expanded: sidebar x=260, launcher x=274. Collapsed: the sidebar translates off screen, the rail ends at x=52 and launcher moves to x=66.
- Checked English/dark and Chinese/light layouts. At 390×844 in Chinese/dark mode, launcher x=10 and the open panel remained between x=10 and x=380, with a 370px width. Temporary viewport changes were reset.
- The local fixture labels its synthetic status responses and makes no OpenAI requests. It also supports incident, maintenance, unavailable and compatibility-data scenarios.
- An independent review found no blocking issue in ancestor clipping, animation tracking, observer rebinding or runtime integration.

## Limits

This revision's browser rendering checks use the production bundle with synthetic transport on a local fixture; they do not claim a newly installed-manager test. Authenticated Mana-X was not exercised live. Tests do not establish future manager-update timing, all mobile keyboards, all browsers, future site layouts, or actual service availability for an individual account.
