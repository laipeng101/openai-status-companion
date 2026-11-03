# OpenAI Status Companion

[简体中文](README.zh-CN.md)

A small, independent userscript that displays official OpenAI service status on **chatgpt.com**, **leopard-x.memofun.net**, and **mana-x.aizex.net**. It is not affiliated with OpenAI or the third-party sites.

## Features

- Compact launcher beside the desktop sidebar; follows sidebar resizing, collapse and replacement. On narrow screens it stays in a viewport corner. Left/right positions are also available.
- Official component groups, active incidents, scheduled maintenance and local fetch time. Incident titles and update bodies remain the original official text.
- English and Simplified Chinese UI, automatic page/browser language detection, and a persistent language selector.
- Website theme detection, explicit light/dark options, Shadow DOM isolation, keyboard controls and reduced-motion support.
- Refreshes every 60 seconds while visible. Background tabs pause polling; returning to a tab can refresh old data. Requests have a 15-second timeout.
- Failed refreshes keep the last successful data, clearly marked as cached. A partially available compatibility feed is never presented as a verified all-clear.

## Install and use

Install from [Greasy Fork](https://greasyfork.org/en/scripts/603564-openai-status-companion), using a userscript manager such as Tampermonkey. Open one of the supported sites and select the status launcher. The gear button opens language, theme and position preferences. Escape closes the panel.

**Migrating from “OpenAI 官方状态中文提示（aizex）” 1.6.2:** the new name/namespace creates a separate script identity. Disable the old script after installing this one. The new widget warns when the old widget is present; it does not change another script's settings.

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

Add a registry entry in `src/locales.js` with `label`, `lang`, `dir`, `messages`, `componentNames` and `groupNames`. Copy all English message keys and preserve `{placeholders}`; missing keys fall back to English. Add localized userscript metadata in `tools/build.mjs` and a localized listing description before publishing the new language. Run the locale key/placeholder tests, build, and inspect the UI at narrow widths. `dir: 'rtl'` is reserved for future RTL translations; each new language still needs visual verification.

## Release

See [publishing guide](docs/publishing.md) and [changelog](CHANGELOG.md). Release tags use `v2.0.0` style. Increase the package and userscript versions together, pass checks, commit `src/` and `dist/`, then publish the tag/Release. Greasy Fork imports the `main` branch raw URL and checks automatically; the userscript itself does not check for script updates.

## License and origin

MIT. Successor to the owner's locally installed, Codex-assisted 1.6.2 Aizex status script, supplied by the owner for this adaptation.
