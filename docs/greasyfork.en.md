# OpenAI Status Companion

See official OpenAI service status without leaving your chat. This independent userscript uses data from **status.openai.com**; it is not an OpenAI product and does not measure your personal account or a third-party site's availability.

## Supported sites

- `chatgpt.com`
- `leopard-x.memofun.net`
- `mana-x.aizex.net`

## What it shows

- With automatic positioning, the status button follows the left sidebar. The button, panel and notices move away from menus, text inputs and other controls, and can hide temporarily if there’s no room.
- See service components by group, open incidents, scheduled maintenance and when status data was last fetched successfully.
- Choose an [interface language](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md) or let the script follow the page or browser language. Official incident titles and messages appear in their original language.
- The script can follow the site's light or dark theme. You can also choose a theme and a screen corner. Use the keyboard to navigate and Esc to close the panel.
- Status data updates every 60 seconds while the page is visible. Updates pause in the background. Requests time out after 15 seconds. If a refresh fails, the panel labels the last available data as cached.
- If the script uses the legacy status API, sections whose data could not be checked are marked unverified.

## Install and use

Install a userscript manager such as Tampermonkey, then use **Install this script** above. Open a supported site, click the status launcher, and use the gear button for preferences. If your manager requires browser-side setup to run userscripts, follow its official installation instructions.

## Privacy and permissions

The script sends anonymous GET requests to `status.openai.com` without account cookies. It checks the position, size and visibility of page elements and reads the page’s language and theme settings. It never reads or uploads prompts, conversations or account tokens. Your settings and a record used to prevent duplicate notices are saved locally. The script contains no analytics, ads, remote executable code or third-party translation services.

## Source and support

[Source code, documentation and issue tracker](https://github.com/laipeng101/openai-status-companion). MIT license. The complete, readable userscript is hosted here; source and localized descriptions synchronize automatically through a GitHub push webhook. Install and update through Greasy Fork.

Tests include automated checks, Chrome layout checks on a local test page at desktop and 390 px widths, and layout checks on Leopard-X using previously captured public status data. The repository’s [validation notes](https://github.com/laipeng101/openai-status-companion/blob/main/docs/validation.md) describe the test results and their limits. Site updates can affect placement.

[Changelog](https://github.com/laipeng101/openai-status-companion/blob/main/CHANGELOG.md) · [Language coverage](https://github.com/laipeng101/openai-status-companion/blob/main/docs/languages.md)
