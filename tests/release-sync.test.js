import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_REDELIVERIES, SCRIPT_PATH, compareRelease, matchesPush, parseDeliveries,
  readStoredRelease, verifyReleaseSync
} from '../tools/release-sync.mjs';

const source = '// ==UserScript==\n// @version 2.1.2\n// ==/UserScript==\n';
const english = 'Latest description & examples.';
const hindiPath = 'docs/greasyfork.hi.md';
const hindi = 'नया विवरण';
const expected = new Map([
  [SCRIPT_PATH, source],
  ['docs/greasyfork.en.md', english],
  [hindiPath, hindi]
]);

function ownerForm(hindiText) {
  return `<form>
    <textarea name="script_version[code]">${source}</textarea>
    <select name="script_version[additional_info][7][locale]">
      <option value="42" selected>印地语 (hi)</option>
    </select>
    <textarea name="script_version[additional_info][7][attribute_value]">${hindiText}</textarea>
    <input name="script_version[additional_info][0][attribute_default]" value="true">
    <textarea name="script_version[additional_info][0][attribute_value]">Latest description &amp; examples.</textarea>
  </form>`;
}

test('a new script version can still have a stale Hindi description in the saved form', () => {
  const stale = readStoredRelease(ownerForm('पुराना विवरण'), 'en');
  assert.deepEqual(compareRelease(expected, stale), [hindiPath + ' differs']);
  const current = readStoredRelease(ownerForm(hindi).replaceAll('\n', '\r\n'), 'en');
  assert.deepEqual(compareRelease(expected, current), []);
});

test('one confirmed redelivery recovers a stale description', async () => {
  let attempts = 0;
  const waits = [];
  await verifyReleaseSync({
    expected,
    readStored: async () => readStoredRelease(ownerForm(attempts ? hindi : 'पुराना विवरण'), 'en'),
    redeliver: async () => { attempts++; return true; },
    wait: async delay => waits.push(delay),
    report: () => {}
  });
  assert.equal(attempts, 1);
  assert.deepEqual(waits, [60_000]);
});

test('a late initial sync is accepted before any redelivery', async () => {
  let settled = false;
  await verifyReleaseSync({
    expected,
    readStored: async () => readStoredRelease(ownerForm(settled ? hindi : 'पुराना विवरण'), 'en'),
    redeliver: async () => assert.fail('the initial sync already finished'),
    wait: async () => { settled = true; },
    report: () => {}
  });
});

test('a persistent mismatch fails after the bounded retry window', async () => {
  let attempts = 0;
  const waits = [];
  await assert.rejects(verifyReleaseSync({
    expected,
    readStored: async () => readStoredRelease(ownerForm('पुराना विवरण'), 'en'),
    redeliver: async () => { attempts++; return true; },
    wait: async delay => waits.push(delay),
    report: () => {}
  }), /greasyfork\.hi\.md differs/);
  assert.equal(attempts, MAX_REDELIVERIES);
  assert.deepEqual(waits, [60_000, 300_000]);
});

test('a sign-in page cannot be mistaken for stale content and trigger redelivery', async () => {
  await assert.rejects(verifyReleaseSync({
    expected,
    readStored: async () => readStoredRelease('<form>Sign in</form>', 'en'),
    redeliver: async () => assert.fail('an unavailable owner page cannot authorize a retry')
  }), /saved version form/);
});

test('delivery IDs retain all digits and only the matching main push is eligible', () => {
  const [original] = parseDeliveries('[{"id":3852180908050227200,"redelivery":false}]');
  assert.equal(original.id, '3852180908050227200');
  const after = 'release-commit';
  assert.equal(matchesPush({request: {payload: {ref: 'refs/heads/main', after}}}, after), true);
  assert.equal(matchesPush({request: {payload: {ref: 'refs/tags/v2.1.2', after}}}, after), false);
  assert.equal(matchesPush({request: {payload: '{"ref":"refs/heads/main","after":"another"}'}}, after), false);
});
