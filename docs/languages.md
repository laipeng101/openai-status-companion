# Interface languages

Language resources are bundled into the userscript. Official incident titles and updates remain in their original language.

<!-- locale-table:start -->
The userscript ships with **13 interface languages**.

| Locale | Interface language | Direction |
| --- | --- | --- |
| `en` | English | `ltr` |
| `zh-CN` | 简体中文 | `ltr` |
| `zh-TW` | 繁體中文 | `ltr` |
| `es` | Español | `ltr` |
| `hi` | हिन्दी | `ltr` |
| `pt-BR` | Português (Brasil) | `ltr` |
| `ja` | 日本語 | `ltr` |
| `ko` | 한국어 | `ltr` |
| `fr` | Français | `ltr` |
| `de` | Deutsch | `ltr` |
| `id` | Bahasa Indonesia | `ltr` |
| `ar` | العربية | `rtl` |
| `ru` | Русский | `ltr` |
<!-- locale-table:end -->

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

1. Create `src/locales/<id>.js` using the same BCP 47 ID for the filename and `lang`. The default export contains `label`, `lang`, `dir`, `messages`, `componentNames` and `groupNames`. Use a native-language label and translate every message key from `src/locales/en.js`, preserving placeholder names and counts. The templates control the order and punctuation of dynamic text. Unmapped component and group names keep their official wording.
2. Export a named `userscript` object in the same file with a single-line `name` and `description`. Include `{languageCount}` in the description where the total should appear.
3. Import the pack and add it to the ordered list in `src/locales/index.js`. This list drives the language menu, script metadata and the generated table above. Its order also determines the default variant when a language has multiple packs.
4. Write `docs/greasyfork.<id>.md` and run `npm run check`. Commit the regenerated userscript and language table with the source. Check long labels, dates, cached and error views, text direction and sidebar placement before publishing.

Greasy Fork uses `greasyfork.en.md` as its default additional information. Each other language has a Markdown file and a synchronization binding to its `main` branch raw URL. See the [publishing guide](publishing.md) for setting up the binding. Keep installation, privacy, permissions, supported sites and validation limits equivalent across translations.

## Reviewing translations

- Read the text in the panel, tooltip or menu where it appears. Use everyday terms for service problems, maintenance and saved data. Explain what users can see or do when data is missing or a refresh fails.
- Check that each label preserves the distinctions the script makes between a slowdown, a partial outage and a major outage, and between an empty list and missing information.
- Use established product names from OpenAI’s localized interface or help center. Keep the official name when the localized name is unclear. Leave incident titles and updates in their original language.
- Review the userscript metadata and Greasy Fork description alongside the interface. Check their claims about refresh timing, layout and data access against the current implementation.
