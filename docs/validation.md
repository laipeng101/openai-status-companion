# Validation — 2.0.0

Performed on 2026-11-03 with Node.js 24.20.0 and the user's Chrome session.

## Automated checks

`npm run check` rebuilds the complete userscript and runs Node/jsdom regression tests. All 56 tests passed locally. GitHub Actions also passed on the published source commit. Tests cover:

- Public current-schema status snapshot; inert RSC parsing; schema changes and malformed data; unknown statuses; maintenance/outage severity; unordered incident updates; visible groups and safe incident URLs.
- English/Chinese key and placeholder parity, locale detection and extensible English fallback.
- All three matched hosts; initial HTTP/network/timeout failure; partial JSON verification; stale successful data; anonymous request options; denied storage; duplicate execution and host remount.
- Preferences, dynamic menu translation, reduced live-region updates, keyboard dismissal, disclosure/focus/scroll preservation, predecessor launcher/open-panel collisions.
- Sidebar/rail selection, independent panel bounds, narrow viewports, visual viewport offsets and safe-area insets.

The committed fixture is reduced public status data. Live API inspection found that the compatibility feed omits incident and maintenance arrays; these are explicitly unverified, not zero.

## Chrome visual and integration checks

- The unchanged production bundle was exercised on a loopback fixture using explicit synthetic incident, maintenance, healthy and unavailable data. English/light and Chinese/dark displays were inspected; a 390×844 viewport was verified through the browser developer interface. The fixture is clearly labeled as synthetic and sends no requests to OpenAI.
- Current live ChatGPT DOM was inspected to confirm `#app-shell-sidebar` and the app shell's structure. Its authenticated page did not permit developer injection through the available browser interface. Its current layout was therefore covered by the matching fixture plus runtime/geometry regression tests, not by a claimed Tampermonkey installation test.
- The unchanged production bundle was injected into an isolated developer world on the live Leopard-X homepage, replaying the public official snapshot. Both old and new widgets were present; the new launcher and migration advice were reachable. The live expanded sidebar ended at x=260 and the new launcher started at x=274. After collapsing, the rail ended at x=52 and the new launcher moved to x=66. The original expanded state was restored.
- Mana-X has the preserved adapter and runtime regression coverage; no authenticated Mana-X live session was exercised.

## Limits

Developer replay verifies rendering and integration, while controlled transport tests verify request options. It does not establish live userscript-manager installation/update behavior, all mobile keyboards, all browsers, future site layouts, or actual service availability for an individual account. The browser interface blocks extension-page automation, so the existing local 1.6.2 script is not silently modified. Users must install the new listing and disable the predecessor as documented.
