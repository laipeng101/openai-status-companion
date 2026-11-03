# OpenAI Status Companion

See official OpenAI service status without leaving your chat. This independent userscript uses data from **status.openai.com**; it is not an OpenAI product and does not measure your personal account or a third-party site's availability.

## Supported sites

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## What it shows

- In automatic position mode, a compact status launcher docks beside the left sidebar and follows it as it expands, collapses or changes width. At narrow widths the launcher stays in a corner and the panel is bounded by the viewport.
- Official component groups, current incidents, scheduled maintenance and the last successful fetch time.
- 13 interface languages: English, Simplified and Traditional Chinese, Spanish, Hindi, Brazilian Portuguese, Japanese, Korean, French, German, Indonesian, Arabic and Russian. Automatic page/browser detection and a manual selector are included. Arabic uses a right-to-left layout. Official incident titles and messages remain in their original language; there is no translation service.
- Website light/dark theme following, manual theme and corner controls, keyboard access and Escape to close.
- Visible pages refresh every 60 seconds; background polling pauses. Requests time out after 15 seconds. Failed refreshes retain clearly marked cached data.
- Incomplete compatibility data is explicitly marked unverified rather than being displayed as a verified all-clear.

## Install and use

Install a userscript manager such as Tampermonkey, then use **Install this script** above. Open a supported site, click the status launcher, and use the gear button for preferences. If your manager requires browser-side setup to run userscripts, follow its official installation instructions.

## Privacy and permissions

Status requests are anonymous GETs to `status.openai.com`, without account cookies. The script inspects sidebar geometry plus page language/theme attributes; it does not read or upload prompts, conversations or account tokens. Only its preferences and a status-notice fingerprint are saved locally. No analytics, ads, remote executable dependencies or third-party translation services are included.

## Source and support

[Source code, documentation and issue tracker](https://github.com/laipeng101/openai-status-companion). MIT license. The complete, readable userscript is hosted here; source and localized descriptions synchronize automatically through a GitHub push webhook. Install and update through Greasy Fork.

Testing includes automated regressions, Chrome fixture checks at desktop and 390px widths, and live Leopard-X layout integration using replayed public status data. See the repository's [validation document](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md) for results and tested boundaries. Layouts may change as the supported sites evolve.
