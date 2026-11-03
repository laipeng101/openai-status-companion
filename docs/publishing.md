# Publishing

The canonical source is `laipeng101/openai-status-companion`. `laipeng101/UserScript` is a directory/index only for this project; do not maintain a second copy of the runtime there.

## GitHub

1. Change `package.json` version, the userscript metadata in `tools/build.mjs`, and `CHANGELOG.md` together.
2. Run `npm ci` and `npm run check`. Review the generated `.user.js`; it must remain readable and self-contained.
3. Exercise ChatGPT and Leopard-X / Aizex layouts, narrow/wide screens, theme/language switching, missing/failed data, sidebar expansion/collapse, docking during sidebar motion, sidebar replacement and keyboard controls.
4. Commit source, tests, lockfile and generated output. Publish the matching tag and GitHub Release after checks pass.

## Greasy Fork

Import the branch-based raw URL:

`https://raw.githubusercontent.com/laipeng101/openai-status-companion/main/dist/openai-status-companion.user.js`

Choose JavaScript, English as the default metadata language, and automatic synchronization. Supply English and Chinese descriptions. Verify author, version, MIT license, supported sites and rendered descriptions on the public listing. The imported code must contain the whole script. Keep installation links pointed at Greasy Fork so its update history and checks remain authoritative.

Automatic polling is sufficient for source synchronization. A repository push/release webhook may optionally trigger it sooner; do not expose webhook credentials in the repository or documentation.

Do not claim that the script itself is official; only its status data is official.

Primary references: [code rules](https://greasyfork.org/en/help/code-rules), [metadata](https://greasyfork.org/en/help/meta-keys), [sync/API](https://greasyfork.org/en/help/api).
