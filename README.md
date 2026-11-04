# OpenAI Status Companion

[简体中文](README.zh-CN.md)

A small, independent userscript that displays official OpenAI service status on **chatgpt.com**, **leopard-x.memofun.net**, and **mana-x.aizex.net**. It is not affiliated with OpenAI or the third-party sites.

## Features

- The launcher follows the left sidebar in automatic mode. Left and right corner preferences are also available. The launcher, details and notices move away from native menus, the composer and other visible controls, and temporarily hide if no clear space fits.
- See service components by group, open incidents, scheduled maintenance and when status data was last checked in your local time. Incident titles and updates appear in their original language.
- Choose an interface language or let the script follow the page or browser language. The script saves your selection. [Supported languages](docs/languages.md)
- Website theme detection, explicit light/dark options, Shadow DOM isolation, keyboard controls and reduced-motion support.
- Status updates every 60 seconds while the page is visible. Updates pause in the background and resume when you return. Requests time out after 15 seconds.
- If a refresh fails, the panel labels the last available data as cached. When the script uses the legacy status API, it marks any sections it cannot verify.

## Install and use

Install from [Greasy Fork](https://greasyfork.org/en/scripts/603564-openai-status-companion), using a userscript manager such as Tampermonkey. Open one of the supported sites and select the status launcher. The gear button opens language, theme and position preferences. Escape closes the panel.

## Data and privacy

All status requests go to `https://status.openai.com/`, anonymously and without cookies. The current official page is parsed as inert JSON data; its scripts are never executed. The legacy JSON endpoints are a fallback and carry section-by-section verification labels. Only official `status.openai.com` incident links are clickable.

The script checks the position, size and visibility of page elements and reads the page’s theme and language settings. It does not read or transmit conversations, prompts, account tokens or page text. Language, theme and position preferences are saved in userscript-manager storage. A record that prevents duplicate notices is saved in the current tab’s session storage. The script contains no analytics, ads, remote executable code or translation services.

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

Create a language pack in `src/locales/` and register it in `src/locales/index.js`. The build uses the registry and pack metadata to generate the userscript header and language table. See the [language guide](docs/languages.md#adding-a-language) for the pack format, listing description and validation steps.

## Release

See [publishing guide](docs/publishing.md) and [changelog](CHANGELOG.md). Release tags use `v2.1.0` style. Increase the package version, rebuild the generated userscript, pass checks, commit `src/` and `dist/`, then publish the tag/Release. Greasy Fork synchronizes the `main` branch raw URL through the GitHub push webhook; the userscript itself does not check for script updates.

## License

MIT.
