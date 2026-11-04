import {execFile} from 'node:child_process';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {chromium} from 'playwright-core';
import {DEFAULT_LOCALE} from '../src/locales/index.js';
import {
  CODE_FIELD, MAX_REDELIVERIES, SCRIPT_PATH, compareRelease, matchesPush,
  parseDeliveries, readStoredRelease, verifyReleaseSync
} from './release-sync.mjs';

const REPO = 'laipeng101/openai-status-companion';
const HOOK_ID = '706853485';
const SCRIPT_ID = '603564';
const OWNER_FORM = `https://greasyfork.org/en/scripts/${SCRIPT_ID}/versions/new`;
const PROFILE = join(homedir(), '.openai-status-companion-release', 'chrome');
const DELIVERIES = `repos/${REPO}/hooks/${HOOK_ID}/deliveries`;
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const REQUEST_TIMEOUT = 20_000;
const run = promisify(execFile);

async function command(program, args) {
  try {
    const {stdout} = await run(program, args, {
      cwd: ROOT, timeout: REQUEST_TIMEOUT, maxBuffer: 4 * 1024 * 1024, windowsHide: true
    });
    return stdout;
  } catch {
    throw new Error(`${program} ${args[0]} failed. Check the repository, network and GitHub CLI authorization.`);
  }
}

async function loadRelease(tag) {
  const commit = (await command('git', ['rev-parse', '--verify', `refs/tags/${tag}^{commit}`])).trim();
  const tree = await command('git', ['ls-tree', '-r', '--name-only', commit, '--', 'docs']);
  const paths = tree.split(/\r?\n/).filter(path => /^docs\/greasyfork\.[a-zA-Z0-9-]+\.md$/.test(path));
  if (!paths.includes(`docs/greasyfork.${DEFAULT_LOCALE}.md`)) {
    throw new Error(`The default Greasy Fork description is missing from ${tag}.`);
  }
  const expected = new Map(await Promise.all([SCRIPT_PATH, ...paths].map(async path =>
    [path, await command('git', ['show', `${commit}:${path}`])])));
  return {commit, expected};
}

async function assertPublishedRefs(tag, commit) {
  const tagRef = `refs/tags/${tag}`;
  const output = await command('git', [
    'ls-remote', `https://github.com/${REPO}.git`, 'refs/heads/main', tagRef, `${tagRef}^{}`
  ]);
  const refs = new Map(output.trim().split(/\r?\n/).map(line => line.split('\t').reverse()));
  if ((refs.get(`${tagRef}^{}`) ?? refs.get(tagRef)) !== commit || refs.get('refs/heads/main') !== commit) {
    throw new Error(`GitHub main and ${tag} must both point to ${commit}. Greasy Fork imports from main.`);
  }
}

async function readRawSource(expected) {
  const files = await Promise.all([...expected.keys()].map(async path => {
    try {
      const response = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${path}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT)
      });
      if (response.ok) return [path, await response.text()];
    } catch {
      // Missing or unreachable files are reported by compareRelease.
    }
    return null;
  }));
  return new Map(files.filter(Boolean));
}

const recentDeliveries = async () => parseDeliveries(await command('gh', ['api', DELIVERIES + '?per_page=30']));

async function redeliverRelease(tag, commit, expected) {
  const pending = compareRelease(expected, await readRawSource(expected));
  if (pending.length) {
    await assertPublishedRefs(tag, commit);
    console.log(`GitHub raw files are not ready. ${pending.join(', ')}.`);
    return false;
  }

  const deliveries = await recentDeliveries();
  let original;
  for (const entry of deliveries) {
    if (entry.event !== 'push' || entry.redelivery) continue;
    const detail = JSON.parse(await command('gh', ['api', `${DELIVERIES}/${entry.id}`]));
    if (matchesPush(detail, commit)) {
      original = entry;
      break;
    }
  }
  if (!original) throw new Error(`No recent original Greasy Fork main push delivery matches ${commit}.`);
  const retries = deliveries.filter(entry => entry.redelivery && entry.guid === original.guid);
  if ([original, ...retries].some(entry => !(entry.status_code > 0))) {
    console.log('The matching push or redelivery is still in progress.');
    return false;
  }
  if (retries.length >= MAX_REDELIVERIES) {
    throw new Error(`The matching push already used all ${MAX_REDELIVERIES} redeliveries.`);
  }
  await assertPublishedRefs(tag, commit);
  await command('gh', ['api', '--method', 'POST', `${DELIVERIES}/${original.id}/attempts`, '--silent']);
  console.log(`Queued redelivery ${retries.length + 1} of ${MAX_REDELIVERIES} for ${tag}.`);

  const seen = new Set(retries.map(entry => entry.id));
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    await sleep(3_000);
    const recent = await recentDeliveries();
    const completed = recent.find(entry => entry.redelivery && entry.guid === original.guid &&
      !seen.has(entry.id) && entry.status_code > 0);
    if (completed) {
      console.log(`GitHub redelivery ${completed.id} returned HTTP ${completed.status_code}.`);
      return true;
    }
  }
  throw new Error('The queued redelivery did not finish in time. Check its status before retrying.');
}

async function main() {
  const [arg, ...extra] = process.argv.slice(2);
  const login = arg === '--login';
  if (extra.length || (!login && !/^v\d+\.\d+\.\d+$/.test(arg ?? ''))) {
    throw new Error('Usage: npm run release:verify -- <vX.Y.Z> or --login');
  }
  const release = login ? null : await loadRelease(arg);
  if (release) await assertPublishedRefs(arg, release.commit);

  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: 'chrome', headless: !login, timeout: REQUEST_TIMEOUT
  });
  try {
    const page = context.pages()[0] ?? await context.newPage();
    const navigate = () => page.goto(OWNER_FORM, {waitUntil: 'domcontentloaded', timeout: REQUEST_TIMEOUT});
    const isOwnerForm = () => {
      const url = new URL(page.url());
      return url.origin === 'https://greasyfork.org' && url.pathname.endsWith(`/scripts/${SCRIPT_ID}/versions/new`);
    };
    const readStored = async () => {
      const response = await navigate();
      if (!response?.ok() || !isOwnerForm()) {
        throw new Error('Greasy Fork owner page is unavailable. Check access or run npm run release:verify -- --login.');
      }
      return readStoredRelease(await page.content(), DEFAULT_LOCALE);
    };
    if (login) {
      console.log('Sign in to Greasy Fork in the dedicated Chrome window. It closes once the saved version form is available.');
      await navigate();
      await page.locator(CODE_FIELD).waitFor({state: 'attached', timeout: 300_000});
      if (!isOwnerForm()) throw new Error('Sign in as an owner of the configured Greasy Fork script.');
      readStoredRelease(await page.content(), DEFAULT_LOCALE);
      console.log('Greasy Fork session ready.');
      return;
    }

    const {commit, expected} = release;
    await verifyReleaseSync({expected, readStored, redeliver: () => redeliverRelease(arg, commit, expected)});
    await assertPublishedRefs(arg, commit);
    console.log(`Greasy Fork saved script and all ${expected.size - 1} descriptions match ${arg}.`);
  } finally {
    await context.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
