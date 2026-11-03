import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
    buildComponentGroups, deriveOverallIndicator, extractBalancedObject, findLatestUpdate,
    getComponentStatus, getOverall, normalizeCompatibility, normalizeComponentCode,
    normalizeOfficialSummary, parseOfficialPage, safeStatusUrl, validateResponse
} from '../src/status-core.js';

const component = (status = 'operational', id = 'a') => ({ id, name: `Component ${id}`, status });
const official = (overrides = {}) => ({
    name: 'OpenAI', components: [component()], affected_components: [],
    ongoing_incidents: [], scheduled_maintenances: [], ...overrides
});
const compatibility = (overrides = {}) => ({
    status: { indicator: 'none' }, components: [component()],
    incidents: [], scheduled_maintenances: [], ...overrides
});
const asRsc = summary => `<html><script>self.__next_f.push(${JSON.stringify([1, `0:{"summary":${JSON.stringify(summary)}}`])})</script></html>`;

test('parses live-schema RSC summary across multiple data chunks without execution', () => {
    const summary = official();
    const stream = `0:{"summary":${JSON.stringify(summary)}}`;
    const midpoint = Math.floor(stream.length / 2);
    const html = '<script>globalThis.pwned = true</script>' + [stream.slice(0, midpoint), stream.slice(midpoint)]
        .map(chunk => `<script nonce="example">self.__next_f.push(${JSON.stringify([1, chunk])});</script>`).join('');
    assert.deepEqual(parseOfficialPage(html), summary);
    assert.equal(globalThis.pwned, undefined);
});

test('ignores executable-looking push arguments instead of evaluating them', () => {
    assert.throws(() => parseOfficialPage('<script>self.__next_f.push((globalThis.pwned=true,[1,"summary"]))</script>'),
        error => error.code === 'errorSummary');
    assert.equal(globalThis.pwned, undefined);
});

test('balanced extraction handles braces, quotes and escapes inside string values', () => {
    const object = { title: 'A } \\ " quoted { string', nested: { values: [1, 2] } };
    const encoded = JSON.stringify(object);
    assert.equal(extractBalancedObject(`  ${encoded},"after":1`), encoded);
    assert.throws(() => extractBalancedObject('{"truncated":'), error => error.code === 'errorIncomplete');
    assert.throws(() => extractBalancedObject('[]'), error => error.code === 'errorParse');
});

test('classifies empty, missing, invalid and incomplete status summaries', () => {
    assert.throws(() => parseOfficialPage(''), error => error.code === 'errorEmpty');
    assert.throws(() => parseOfficialPage('<html>network verification page</html>'), error => error.code === 'errorSummary');
    assert.throws(() => parseOfficialPage(asRsc({ components: [] })), error => error.code === 'errorIncomplete');
    assert.throws(() => parseOfficialPage(asRsc(official({ components: [null] }))), error => error.code === 'errorSchema');
    const badJson = '<script>self.__next_f.push([1,"0:{\\\"summary\\\":{bad}}"])</script>';
    assert.throws(() => parseOfficialPage(badJson), error => error.code === 'errorParse');
});

test('normalizes a snapshot from the public official page captured on 2026-11-03', () => {
    const summary = JSON.parse(readFileSync(new URL('./fixtures/openai-official-summary.json', import.meta.url)));
    const result = normalizeOfficialSummary(parseOfficialPage(asRsc(summary)));
    assert.equal(result.source_mode, 'official-page');
    assert.equal(result.components.length, 38);
    assert.equal(result.component_groups.length, 6);
    assert.equal(result.status.indicator, 'none');
    assert.deepEqual(result.availability, { components: 'verified', incidents: 'verified', maintenances: 'verified' });
    assert.equal(new Set(result.component_groups.flatMap(group => group.component_ids)).size, result.components.length);
});

test('official affected-component list overrides operational default', () => {
    const result = normalizeOfficialSummary(official({
        affected_components: [{ component_id: 'a', current_status: 'partial_outage' }]
    }));
    assert.equal(result.components[0].status, 'partial_outage');
    assert.equal(result.status.indicator, 'major');
});

test('unknown affected status remains unknown instead of healthy', () => {
    const result = normalizeOfficialSummary(official({
        affected_components: [{ component_id: 'a', current_status: 'new_vendor_status' }]
    }));
    assert.equal(result.components[0].status, 'unknown');
    assert.equal(result.status.indicator, 'unknown');
    assert.equal(normalizeComponentCode(undefined), 'unknown');
    assert.equal(getComponentStatus('toString').key, 'component_unknown');
    assert.equal(getOverall('constructor').key, 'overall_unknown');
});

test('active maintenance produces maintenance, while future maintenance keeps healthy status', () => {
    assert.equal(deriveOverallIndicator([component('under_maintenance')]), 'maintenance');
    assert.equal(deriveOverallIndicator([component()], [], [{ status: 'in_progress' }]), 'maintenance');
    assert.equal(deriveOverallIndicator([component()], [], [{ status: 'scheduled' }]), 'none');
    assert.equal(deriveOverallIndicator([component('partial_outage')], [], [{ status: 'in_progress' }]), 'major');
});

test('resolved incidents do not cause an outage, ongoing incidents do', () => {
    assert.equal(deriveOverallIndicator([component()], [{ status: 'resolved', impact: 'critical' }]), 'none');
    assert.equal(deriveOverallIndicator([component()], [{ status: 'postmortem', impact: 'major' }]), 'none');
    assert.equal(deriveOverallIndicator([component()], [{ status: 'investigating', impact: 'none' }]), 'minor');
});

test('latest update is selected by valid timestamps, regardless of array order', () => {
    const updates = [
        { status: 'monitoring', body: 'latest', published_at: '2026-11-03T10:00:00Z' },
        { status: 'investigating', body: 'old', published_at: '2026-11-03T08:00:00Z' },
        { status: 'identified', body: 'invalid', published_at: 'not a date' }
    ];
    const result = normalizeOfficialSummary(official({ ongoing_incidents: [{ id: 'i', name: 'incident', updates }] }));
    assert.equal(result.incidents[0].status, 'monitoring');
    assert.equal(result.incidents[0].updated_at, '2026-11-03T10:00:00Z');
    assert.equal(findLatestUpdate(result.incidents[0].incident_updates).body, 'latest');
    assert.equal(findLatestUpdate([null, updates[1], updates[0]]), updates[0]);
    assert.equal(findLatestUpdate([]), null);
});

test('maintenance gets schedule aliases and latest update instead of default incident stage', () => {
    const result = normalizeOfficialSummary(official({ scheduled_maintenances: [{
        id: 'm', name: 'Upgrade', starts_at: '2026-11-04T08:00:00Z', ends_at: '2026-11-04T10:00:00Z',
        updates: [{ to_status: 'in_progress', message: { markdown: 'Working' }, published_at: '2026-11-04T08:01:00Z' }]
    }] }));
    assert.equal(result.scheduled_maintenances[0].status, 'in_progress');
    assert.equal(result.scheduled_maintenances[0].scheduled_for, '2026-11-04T08:00:00Z');
    assert.equal(result.scheduled_maintenances[0].scheduled_until, '2026-11-04T10:00:00Z');
    assert.equal(result.scheduled_maintenances[0].incident_updates[0].body, 'Working');
    assert.equal(result.status.indicator, 'maintenance');
});

test('groups cover every visible component once and preserve unknown groups', () => {
    const components = [component('operational', 'a'), component('operational', 'b'), component('operational', 'c')];
    const groups = buildComponentGroups({ items: [
        { group: { id: 'new', name: 'New Product', components: [{ component_id: 'a' }, { component_id: 'a' }, { component_id: 'missing' }] } },
        { group: { id: 'other', name: 'Another', components: [{ component_id: 'a' }, { component_id: 'b' }] } }
    ] }, components);
    assert.deepEqual(groups.map(group => group.component_ids), [['a'], ['b'], ['c']]);
    assert.equal(groups[0].name, 'New Product');
});

test('explicitly hidden component groups stay hidden instead of reappearing under Other', () => {
    const result = normalizeOfficialSummary(official({
        components: [component('operational', 'a'), component('operational', 'b')],
        structure: { items: [{ group: { id: 'hidden', name: 'Hidden', hidden: true, components: [{ component_id: 'b' }] } }] }
    }));
    assert.deepEqual(result.components.map(item => item.id), ['a']);
});

test('missing compatibility event arrays are unknown, never verified zero or fully healthy', () => {
    const raw = { status: { indicator: 'none' }, components: [component()] };
    const result = normalizeCompatibility(raw, { components: raw.components });
    assert.equal(result.status.indicator, 'unknown');
    assert.deepEqual(result.availability, { components: 'verified', incidents: 'unknown', maintenances: 'unknown' });
    assert.equal(result.source_mode, 'compatibility-json');
});

test('only the missing activity field becomes unverified', () => {
    const result = normalizeCompatibility({ status: { indicator: 'none' }, components: [component()], incidents: [] });
    assert.equal(result.availability.incidents, 'verified');
    assert.equal(result.availability.maintenances, 'unknown');
    assert.equal(result.status.indicator, 'unknown');
});

test('new compatibility indicator remains unknown when components appear healthy', () => {
    const result = normalizeCompatibility(compatibility({ status: { indicator: 'new_vendor_status' } }));
    assert.equal(result.status.indicator, 'unknown');
    assert.equal(normalizeCompatibility(compatibility({ status: {} })).status.indicator, 'unknown');
});

test('malformed activity arrays cannot be reported as verified empty activity', () => {
    assert.throws(() => normalizeOfficialSummary(official({ ongoing_incidents: [null] })), error => error.code === 'errorSchema');
    assert.throws(() => normalizeOfficialSummary(official({ scheduled_maintenances: [{}] })), error => error.code === 'errorSchema');
    const result = normalizeCompatibility(compatibility({ incidents: [null], scheduled_maintenances: [{}] }));
    assert.equal(result.status.indicator, 'unknown');
    assert.equal(result.availability.incidents, 'unknown');
    assert.equal(result.availability.maintenances, 'unknown');
    assert.deepEqual(result.incidents, []);
    assert.deepEqual(result.scheduled_maintenances, []);
});

test('confirmed compatibility outage is preserved with incomplete activity lists', () => {
    const result = normalizeCompatibility({ status: { indicator: 'major' }, components: [component()] });
    assert.equal(result.status.indicator, 'major');
    assert.equal(result.availability.incidents, 'unknown');
    assert.equal(normalizeCompatibility(compatibility({ status: { indicator: 'minor' }, components: [component('under_maintenance')] })).status.indicator, 'minor');
});

test('malformed separate component payload falls back to validated summary components', () => {
    const result = normalizeCompatibility(compatibility(), { components: [null] });
    assert.equal(result.components.length, 1);
    assert.equal(result.availability.components, 'partial');
    assert.equal(result.status.indicator, 'none');
});

test('compatibility statuspage groups are excluded from component counts and grouped correctly', () => {
    const raw = compatibility({ components: [{ id: 'g', name: 'Group', group: true }, { ...component(), group_id: 'g' }] });
    const result = normalizeCompatibility(raw, { components: raw.components });
    assert.equal(result.components.length, 1);
    assert.equal(result.component_groups[0].name, 'Group');
    assert.deepEqual(result.component_groups[0].component_ids, ['a']);
});

test('validation rejects malformed payloads before rendering', () => {
    for (const payload of [null, {}, { status: {}, components: [null] }, { status: 'none', components: [] }]) {
        assert.throws(() => validateResponse(payload), error => error.code === 'errorSchema');
    }
    assert.equal(validateResponse(compatibility()).status.indicator, 'none');
});

test('only HTTPS official status links can become incident hyperlinks', () => {
    assert.equal(safeStatusUrl('/incidents/example'), 'https://status.openai.com/incidents/example');
    for (const unsafe of ['javascript:alert(1)', 'https://evil.example/', 'http://status.openai.com/', '//evil.example/', 'https://user:pass@status.openai.com/']) {
        assert.equal(safeStatusUrl(unsafe), '');
    }
});

test('incident text remains text data rather than HTML or executable content', () => {
    const result = normalizeOfficialSummary(official({ ongoing_incidents: [{
        id: 'i', name: '<img src=x onerror=alert(1)>',
        updates: [{ message_string: '<script>alert(1)</script>' }], permalink: 'javascript:alert(1)'
    }] }));
    assert.equal(result.incidents[0].name, '<img src=x onerror=alert(1)>');
    assert.equal(result.incidents[0].incident_updates[0].body, '<script>alert(1)</script>');
    assert.equal(result.incidents[0].url, '');
});
