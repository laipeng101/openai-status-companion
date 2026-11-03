# Publishing

The canonical source is `laipeng101/openai-status-companion`. `laipeng101/UserScript` is a directory/index only for this project; do not maintain a second copy of the runtime there.

## GitHub

1. Change the version in `package.json` and `package-lock.json`, and update `CHANGELOG.md`. The build reads the userscript version from `package.json`.
2. Run `npm ci` and `npm run check`. Review the generated `.user.js`; it must remain readable and self-contained.
3. Exercise ChatGPT and Leopard-X / Aizex layouts, narrow/wide screens, theme/language switching, missing/failed data, sidebar expansion/collapse, docking during sidebar motion, sidebar replacement and keyboard controls.
4. Commit source, tests, lockfile and generated output. Publish the matching tag and GitHub Release after checks pass.

## Greasy Fork

Import the branch-based raw URL:

`https://raw.githubusercontent.com/laipeng101/openai-status-companion/main/dist/openai-status-companion.user.js`

Choose JavaScript and English as the default metadata language. Use `docs/greasyfork.en.md` for default additional information; supply a localized `docs/greasyfork.<locale>.md` for every other supported UI locale. All descriptions use Markdown and `main` branch raw URLs. There are 13 descriptions: default English plus `zh-CN`, `zh-TW`, `es`, `hi`, `pt-BR`, `ja`, `ko`, `fr`, `de`, `id`, `ar` and `ru`. Verify author, version, MIT license, supported sites and rendered descriptions on the public listing. The imported code must contain the whole script. Keep installation links pointed at Greasy Fork so its update history and checks remain authoritative.

An active GitHub push webhook is configured for this repository, using Greasy Fork's account-specific HTTPS endpoint, JSON payloads, the existing signing secret and enabled TLS certificate verification. The script and all localized description URLs follow `main`.

Keep the secret in GitHub's webhook settings; do not include it in code, documentation or screenshots. Reuse the account's existing Greasy Fork secret when configuring another repository, because regenerating it would affect other integrations.

Verify a new webhook in GitHub's Recent Deliveries: a successful ping establishes connectivity and signature validation; a real push must also return HTTP 200 with this script under `updated_scripts` and no `updated_failed` entries. Confirm the corresponding content changed on Greasy Fork. A push changing bound descriptions validates description synchronization; modifying `dist/openai-status-companion.user.js` exercises code synchronization and sets Greasy Fork's synchronization type to Webhook. Follow the version/build/check steps above for code releases. For new description files, first publish the complete files and save their synchronization bindings; then push a real content update to verify them. Greasy Fork currently handles modified-file webhook entries, so adding an unbound file alone does not prove that its localized information was synchronized.

Do not claim that the script itself is official; only its status data is official.

Primary references: [code rules](https://greasyfork.org/en/help/code-rules), [metadata](https://greasyfork.org/en/help/meta-keys), [sync/API](https://greasyfork.org/en/help/api).
