# Changelog

## 2.1.2 — 2026-11-05

- Revise interface text, script descriptions and installation instructions across all 13 languages. Clarify service incidents, cached data and sections that could not be verified when using the legacy status API.
- Give every language its own pack, including English and Simplified Chinese. Let each pack control wording, order and punctuation for status notices, cached labels, component groups and maintenance times.
- Generate localized script metadata and the supported-language table from the same registry. Match registered regional variants when a language tag includes extensions or a legacy alias.

## 2.1.1 — 2026-11-04

- Move the status button, details and notices away from native menus, including ChatGPT's account and usage menus, and from the composer and other page controls.
- Temporarily hide the widget during modal dialogs or when no clear space fits. Restore the preferred position when space becomes available.

## 2.1.0 — 2026-11-03

- Add Spanish, Hindi, Brazilian Portuguese, Japanese, Korean, French, German, Indonesian, Arabic, Russian and Traditional Chinese, bringing the interface to 13 languages.
- Match Chinese script/region tags to Simplified or Traditional Chinese and support regional language variants.
- Support Arabic right-to-left layout while preserving official incident titles and update text in their original direction.
- Keep long translated headings and settings within narrow panels; verify locale switching and published metadata alongside sidebar docking regressions.
- Derive the userscript version from the package version to keep release artifacts aligned.

## 2.0.1 — 2026-11-03

- Dock the launcher beside the visible left sidebar as it expands or collapses, following width and position changes.
- Keep automatic positioning aligned when the application replaces the sidebar.

## 2.0.0 — 2026-11-03

- Release OpenAI Status Companion / OpenAI 状态助手.
- Support ChatGPT's current app-shell sidebar and the Leopard-X / Aizex layouts.
- Add English/Chinese locale resources, page/browser detection and persistent preferences.
- Add website theme following, manual theme/position controls, bounded panels and visual-viewport handling.
- Preserve component expansion, keyboard focus and panel scroll across data refreshes.
- Normalize unordered incident updates; distinguish unknown data, partial feeds, maintenance and outages.
- Keep complete readable runtime code in the generated userscript; add regression tests and reproducible build.

