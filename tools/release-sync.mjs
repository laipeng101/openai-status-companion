import {JSDOM} from 'jsdom';
import {setTimeout as sleep} from 'node:timers/promises';

export const SCRIPT_PATH = 'dist/openai-status-companion.user.js';
export const CODE_FIELD = 'textarea[name="script_version[code]"]';
const RETRY_DELAYS = [60_000, 300_000];
export const MAX_REDELIVERIES = RETRY_DELAYS.length;
const ADDITIONAL_INFO_FIELD = /^script_version\[additional_info\]\[\d+\]\[attribute_value\]$/;

export const normalizeSource = text => text.replaceAll('\r\n', '\n').trimEnd();

export function readStoredRelease(html, defaultLocale) {
  const {window} = new JSDOM(html);
  try {
    const code = window.document.querySelector(CODE_FIELD);
    if (!code?.value.startsWith('// ==UserScript==') || !code.form) {
      throw new Error('Greasy Fork did not return the saved version form. Sign in with npm run release:verify -- --login.');
    }
    const files = new Map([[SCRIPT_PATH, code.value]]);
    for (const field of code.form.querySelectorAll('textarea[name]')) {
      if (!ADDITIONAL_INFO_FIELD.test(field.name)) continue;
      const prefix = field.name.slice(0, -'[attribute_value]'.length);
      const localeField = code.form.elements.namedItem(prefix + '[locale]');
      const locale = localeField
        ? localeField.selectedOptions?.[0]?.textContent.match(/\(([a-zA-Z0-9-]+)\)\s*$/)?.[1]
        : defaultLocale;
      if (!locale) continue;
      const path = `docs/greasyfork.${locale}.md`;
      if (files.has(path)) throw new Error(`Greasy Fork returned duplicate saved descriptions for ${locale}.`);
      files.set(path, field.value);
    }
    return files;
  } finally {
    window.close();
  }
}

export function compareRelease(expected, stored) {
  return [...expected].flatMap(([path, text]) => {
    if (!stored.has(path)) return [`${path} is missing`];
    if (normalizeSource(text) !== normalizeSource(stored.get(path))) return [`${path} differs`];
    return [];
  });
}

export function parseDeliveries(json) {
  // GitHub delivery IDs can exceed the safe integer range of JavaScript numbers.
  return JSON.parse(json, (key, value, context) =>
    key === 'id' && typeof value === 'number' ? context.source : value);
}

export function matchesPush(delivery, commit) {
  const body = delivery.request?.payload;
  const payload = typeof body === 'string' ? JSON.parse(body) : body;
  return payload?.ref === 'refs/heads/main' && payload.after === commit;
}

export async function verifyReleaseSync({
  expected, readStored, redeliver, wait = sleep, report = console.log
}) {
  const check = async () => compareRelease(expected, await readStored());
  let issues = await check();
  for (const delay of RETRY_DELAYS) {
    if (!issues.length) return;
    report(`${issues.join(', ')}. Checking again in ${delay / 1000}s before retrying.`);
    await wait(delay);
    issues = await check();
    if (!issues.length) return;
    if (await redeliver()) issues = await check();
  }
  if (issues.length) throw new Error(`Greasy Fork still differs after the retry window. ${issues.join(', ')}.`);
}
