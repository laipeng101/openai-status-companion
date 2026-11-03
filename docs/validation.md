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
- Before publication, current live ChatGPT DOM was inspected to confirm `#app-shell-sidebar`; its authenticated page did not permit developer injection through the available interface. The unchanged bundle was covered by the matching fixture and runtime/geometry tests.
- The unchanged production bundle was injected into an isolated developer world on the live Leopard-X homepage, replaying the public official snapshot. Both old and new widgets were present; the new launcher and migration advice were reachable. The live expanded sidebar ended at x=260 and the new launcher started at x=274. After collapsing, the rail ended at x=52 and the new launcher moved to x=66. The original expanded state was restored.
- Mana-X has the preserved adapter and runtime regression coverage; no authenticated Mana-X live session was exercised.

## Installed-manager smoke checks after publication

The owner installed 2.0.0 from the Greasy Fork listing and disabled local 1.6.2. The following checks then used the real installed userscript and real official requests, without injected code or replay stubs:

- ChatGPT at 2560×1215 and 390×844 fetched current official-page data and displayed 38/38 operational components, with incident/maintenance sections verified. Only the new host was present.
- On desktop ChatGPT, the expanded sidebar's right edge was x=340 and the launcher x=354. The 390px panel stayed between x=10 and x=380. English/light preferences switched live and were restored to automatic page language and website theme.
- A manual live refresh completed with component disclosure still expanded and no lingering busy state.
- Installed Leopard-X fetched current official-page data, followed its 260px expanded sidebar at x=274, and moved to x=66 beside the 52px collapsed rail after its transition. The expanded sidebar state was restored, and the predecessor widget was absent.

## Limits

Developer replay verifies rendering and integration; controlled transport tests verify request options; installed-manager smoke checks verify this Chrome installation. These checks do not establish future automatic manager-update behavior, all mobile keyboards, all browsers, future site layouts, or actual service availability for an individual account. Extension-page automation is blocked, so the owner performed installation and predecessor deactivation as documented.
