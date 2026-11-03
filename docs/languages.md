# Interface languages

Version 2.1.0 provides 13 interface languages. Language resources are bundled into the userscript; official incident titles and updates remain in their original language.

| Locale | Interface language |
| --- | --- |
| `en` | English |
| `zh-CN` | Simplified Chinese — 简体中文 |
| `zh-TW` | Traditional Chinese — 繁體中文 |
| `es` | Spanish — Español |
| `hi` | Hindi — हिन्दी |
| `pt-BR` | Brazilian Portuguese — Português (Brasil) |
| `ja` | Japanese — 日本語 |
| `ko` | Korean — 한국어 |
| `fr` | French — Français |
| `de` | German — Deutsch |
| `id` | Indonesian — Bahasa Indonesia |
| `ar` | Arabic — العربية |
| `ru` | Russian — Русский |

Arabic uses right-to-left layout. The other bundled languages use left-to-right layout.

## Selection basis

This set is a release-priority estimate informed by external market signals, not statistics about this userscript’s users. Country and language are different measures: countries can be multilingual, and Hindi does not cover all users in India.

- [Similarweb’s ChatGPT profile](https://www.similarweb.com/website/chatgpt.com/), using September 2026 desktop traffic, highlights the United States, India, Brazil, Japan and South Korea as major markets. This informed the English, Hindi, Brazilian Portuguese, Japanese and Korean priorities.
- A [2025 World Bank study](https://documents1.worldbank.org/curated/en/099856110152535288/pdf/IDU-42736e6b-48fb-45e6-8638-cec68a650f40.pdf) identifies markets including Germany, France and Indonesia, supporting German, French and Indonesian coverage.
- [OBDILCI’s Internet language indicators](https://www.obdilci.org/projects/main/) from July 2025 informed Spanish, Hindi, Arabic, Russian, French and Portuguese coverage using estimates of Internet users by language.

Existing English and Chinese coverage is retained. These signals guide the initial release set; they do not measure the language distribution of all ChatGPT users.

## Language selection

An explicit supported preference wins. Automatic selection follows the page language, then the first supported browser language, then English.

- Bare `zh` defaults to Simplified Chinese. `Hans` selects `zh-CN`; `Hant` selects `zh-TW`. Without an explicit script, `TW`, `HK` and `MO` select Traditional Chinese. Script takes precedence over region, so `zh-Hans-TW` uses Simplified Chinese.
- Portuguese regions currently share `pt-BR`; Spanish regions share `es`.
- Unknown official component and group names are preserved. Interface localization does not translate official incident text.

## Adding a language

1. Create `src/locales/<id>.js` with a default export containing `label`, `lang`, `dir`, `messages`, `componentNames` and `groupNames`. Use a native-language label and the appropriate BCP 47 locale ID. Translate every English message key from `src/locales.js`, preserving placeholder names and counts. Retain branded product/API names; translate generic feature labels consistently. Unchanged component and group names may use the original-name fallback.
2. Import the module and add it to the `LOCALES` registry in `src/locales.js`. Add matching tests for any region or script fallback.
3. Add localized `@name:<id>` and `@description:<id>` entries in `tools/build.mjs`; update the stated language count and documentation.
4. Run `npm run check` to rebuild the complete userscript and validate translations. Check long labels, dates, cached/error views, text direction and sidebar placement in ChatGPT and Leopard-X before publishing.

Every supported locale also needs a complete `docs/greasyfork.<id>.md` listing description. Greasy Fork uses `greasyfork.en.md` as its default additional information and one Markdown synchronization row for each of the other 12 locales. Bind each row to the corresponding `main` branch raw URL. After saving the bindings, a push modifying those files must update their localized listing text through the existing webhook. Keep installation, privacy, permissions, supported sites and validation limits equivalent across translations.
