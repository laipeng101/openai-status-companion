# OpenAI Status Companion

[简体中文](README.zh-CN.md)

A small, independent userscript that displays official OpenAI service status on **chatgpt.com**, **leopard-x.memofun.net**, and **mana-x.aizex.net**. It is not affiliated with OpenAI or the third-party sites.

## Features

- In automatic position mode, the compact launcher docks beside the left sidebar and follows it as it expands, collapses, resizes or is replaced. On narrow screens it stays in a viewport corner. Left/right positions are also available.
- Official component groups, active incidents, scheduled maintenance and local fetch time. Incident titles and update bodies remain the original official text.
- 13 interface languages: English, Simplified and Traditional Chinese, Spanish, Hindi, Brazilian Portuguese, Japanese, Korean, French, German, Indonesian, Arabic and Russian. Automatic page/browser detection and a persistent language selector are included.
- Website theme detection, explicit light/dark options, Shadow DOM isolation, keyboard controls and reduced-motion support.
- Refreshes every 60 seconds while visible. Background tabs pause polling; returning to a tab can refresh old data. Requests have a 15-second timeout.
- Failed refreshes keep the last successful data, clearly marked as cached. A partially available compatibility feed is never presented as a verified all-clear.

## Install and use

Install from [Greasy Fork](https://greasyfork.org/en/scripts/603564-openai-status-companion), using a userscript manager such as Tampermonkey. Open one of the supported sites and select the status launcher. The gear button opens language, theme and position preferences. Escape closes the panel.

## Data and privacy

All status requests go to `https://status.openai.com/`, anonymously and without cookies. The current official page is parsed as inert JSON data; its scripts are never executed. The legacy JSON endpoints are a fallback and carry section-by-section verification labels. Only official `status.openai.com` incident links are clickable.

This script does not read or transmit conversations, prompts, account tokens or page content. It inspects only sidebar geometry and theme/language attributes. Language/theme/position preferences are saved in userscript-manager storage; a status-notice fingerprint is saved in session storage. There are no analytics, ads, remote executable dependencies or translation services. Official incident text is not machine-translated.

Official status reports aggregate availability; they cannot establish availability for an individual account, model or third-party service.

## Develop

Requires Node.js 22.12+ or 24+. Runtime code has no third-party dependencies; esbuild and jsdom are development dependencies only.

```sh
npm ci
npm run check
npm run preview
```

`src/` contains readable modules. `npm run build` produces the complete, non-minified `dist/openai-status-companion.user.js`; Greasy Fork syncs that file, not a loader. Commit generated output with source changes. Tests use public/synthetic status data and never require a ChatGPT account.

### Add a language

Add a module under `src/locales/` and register it in `src/locales.js` with `label`, `lang`, `dir`, `messages`, `componentNames` and `groupNames`. Copy all English message keys and preserve `{placeholders}`; missing keys fall back to English. Add localized userscript metadata in `tools/build.mjs`, update the listing description, run checks, and inspect narrow layouts. Arabic uses `dir: 'rtl'`; official incident text keeps its own direction. See [language coverage and selection](docs/languages.md) for regional matching and expansion priorities.

## Release

See [publishing guide](docs/publishing.md) and [changelog](CHANGELOG.md). Release tags use `v2.1.0` style. Increase the package version, rebuild the generated userscript, pass checks, commit `src/` and `dist/`, then publish the tag/Release. Greasy Fork synchronizes the `main` branch raw URL through the GitHub push webhook; the userscript itself does not check for script updates.

## License

MIT.
