# Publishing

The canonical source is `laipeng101/openai-status-companion`. `laipeng101/UserScript` is a directory/index only for this project; do not maintain a second copy of the runtime there.

## GitHub

1. Change the version in `package.json` and `package-lock.json`, and update `CHANGELOG.md`. The build reads the userscript version from `package.json`.
2. Run `npm ci` and `npm run check`. Review the generated `.user.js`; it must remain readable and self-contained.
3. Exercise ChatGPT and Leopard-X / Aizex layouts, narrow/wide screens, theme/language switching, missing/failed data, sidebar expansion/collapse, docking during sidebar motion, sidebar replacement and keyboard controls.
4. Commit source, tests, lockfile and generated output. Push `main` and the matching version tag so the existing GitHub push webhook can import them.
5. Run `npm run release:verify -- vX.Y.Z` against the pushed tag. Publish the GitHub Release after this check and GitHub Actions pass.

## Greasy Fork

Import the branch-based raw URL:

`https://raw.githubusercontent.com/laipeng101/openai-status-companion/main/dist/openai-status-companion.user.js`

Choose JavaScript and English as the default metadata language. Use `docs/greasyfork.en.md` for default additional information. Bind a localized `docs/greasyfork.<locale>.md` for each remaining entry in the [language table](languages.md). All descriptions use Markdown and `main` branch raw URLs. Verify author, version, MIT license, supported sites and rendered descriptions on the public listing. The imported code must contain the whole script. Keep installation links pointed at Greasy Fork so its update history and checks remain authoritative.

An active GitHub push webhook is configured for this repository, using Greasy Fork's account-specific HTTPS endpoint, JSON payloads, the existing signing secret and enabled TLS certificate verification. The script and all localized description URLs follow `main`.

Keep the secret in GitHub's webhook settings; do not include it in code, documentation or screenshots. Reuse the account's existing Greasy Fork secret when configuring another repository, because regenerating it would affect other integrations.

Run the release check on a workstation with Chrome and the GitHub CLI. Set up the Greasy Fork session once with `npm run release:verify -- --login`. Sign in as a script owner in the window it opens. The command saves the session in a dedicated Chrome profile under `~/.openai-status-companion-release/chrome` and uses that profile for subsequent checks. Sign in to `gh` with permission to read and redeliver this repository's webhooks.

The check compares the script and every Markdown description from the pushed tag with the content saved by Greasy Fork. It reads the owner form because Greasy Fork can store languages such as Hindi without exposing a public page in that language. When it finds a difference, it waits and checks again before retrying. It redelivers the original push only when GitHub's raw files match the tag and both remote `main` and the tag point to the release commit. It waits 60 seconds before the first possible retry and five minutes before the second to allow raw caches to refresh. The check counts prior redeliveries of the same push toward its limit of two and reports any remaining mismatches. Keep `main` at the release commit until the check finishes.

For a new locale, publish its description file and save its synchronization binding before releasing. A subsequent push that modifies the bound file can exercise the webhook. Use GitHub's Recent Deliveries to diagnose connectivity or signature errors. The stored content check is the release criterion.

During the v2.1.2 release, the original push included the changed Hindi file. The webhook returned HTTP 200 with the script in `updated_scripts` and an empty `updated_failed` list, while the saved Hindi description still matched v2.1.1. Redelivering the same push later updated the description. Greasy Fork downloads each description separately and keeps the prior value if that download throws an error. Its response reports the overall script result, so the delivery record cannot distinguish an individual download failure from a successful fetch of stale raw content. [Importer](https://github.com/greasyfork-org/greasyfork/blob/main/lib/script_importer/base_script_importer.rb) · [Script sync](https://github.com/greasyfork-org/greasyfork/blob/main/lib/script_importer/script_syncer.rb)

Do not claim that the script itself is official; only its status data is official.

Primary references: [code rules](https://greasyfork.org/en/help/code-rules), [metadata](https://greasyfork.org/en/help/meta-keys), [sync/API](https://greasyfork.org/en/help/api).
