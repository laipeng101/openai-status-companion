// Data normalization for the public OpenAI status page. No page scripts are executed.
export const STATUS_URL = 'https://status.openai.com/';

const OVERALL = {
    none: { level: 0, tone: 'ok' },
    minor: { level: 1, tone: 'warn' },
    major: { level: 2, tone: 'bad' },
    critical: { level: 3, tone: 'bad' },
    maintenance: { level: 1, tone: 'info' },
    unknown: { level: 1, tone: 'muted' }
};
const COMPONENTS = {
    operational: { level: 0, tone: 'ok' },
    degraded_performance: { level: 1, tone: 'warn' },
    partial_outage: { level: 2, tone: 'bad' },
    major_outage: { level: 3, tone: 'bad' },
    full_outage: { level: 3, tone: 'bad' },
    under_maintenance: { level: 1, tone: 'info' },
    unknown: { level: 1, tone: 'muted' }
};
const IMPACT_LEVEL = { none: 0, minor: 1, major: 2, critical: 3 };
const ACTIVE_MAINTENANCE = new Set(['in_progress', 'ongoing', 'verifying']);
const CLOSED_INCIDENTS = new Set(['resolved', 'postmortem', 'completed']);

function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

function text(value) {
    return typeof value === 'string' ? value : '';
}

function validActivity(item) {
    return Boolean(item && typeof item === 'object' && !Array.isArray(item) && text(item.id));
}

function code(value) {
    if (typeof value === 'string') return value.toLowerCase().replace(/[\s-]+/g, '_');
    if (value && typeof value === 'object') return code(value.name || value.status || value.category);
    return '';
}

export function getOverall(indicator) {
    const normalized = Object.hasOwn(OVERALL, indicator) ? indicator : 'unknown';
    return { ...OVERALL[normalized], key: `overall_${normalized}`, shortKey: `short_${normalized}` };
}

export function getComponentStatus(status) {
    const normalized = Object.hasOwn(COMPONENTS, status) ? status : 'unknown';
    return { ...COMPONENTS[normalized], key: `component_${normalized}` };
}

export function normalizeComponentCode(status) {
    const normalized = code(status);
    return Object.hasOwn(COMPONENTS, normalized) ? normalized : 'unknown';
}

// Locate one JSON object without evaluating the surrounding React server stream.
export function extractBalancedObject(source, fromIndex = 0) {
    let start = fromIndex;
    while (/\s/.test(source[start] || '') && start < source.length) start += 1;
    if (source[start] !== '{') throw fail('errorParse', 'Status summary is not a JSON object');
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < source.length; index += 1) {
        const character = source[index];
        if (inString) {
            if (escaped) escaped = false;
            else if (character === '\\') escaped = true;
            else if (character === '"') inString = false;
            continue;
        }
        if (character === '"') inString = true;
        else if (character === '{') depth += 1;
        else if (character === '}' && --depth === 0) return source.slice(start, index + 1);
    }
    throw fail('errorIncomplete', 'Status summary is truncated');
}

export function parseOfficialPage(html) {
    if (typeof html !== 'string' || !html.trim()) throw fail('errorEmpty', 'Status page is empty');
    let stream = '';
    const scripts = html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi);
    for (const match of scripts) {
        const push = /^\s*self\.__next_f\.push\(([\s\S]*)\)\s*;?\s*$/.exec(match[1]);
        if (!push) continue;
        try {
            const chunk = JSON.parse(push[1]);
            if (Array.isArray(chunk) && typeof chunk[1] === 'string') stream += chunk[1];
        } catch {
            // A bootstrap script or malformed chunk cannot execute through JSON.parse.
        }
    }
    const summaryMarker = /"summary"\s*:/g;
    let candidateError = null;
    for (const match of stream.matchAll(summaryMarker)) {
        try {
            const summary = JSON.parse(extractBalancedObject(stream, match.index + match[0].length));
            validateOfficialSummary(summary);
            return summary;
        } catch (error) {
            candidateError = error?.code ? error : fail('errorParse', 'Status summary contains invalid JSON');
        }
    }
    throw candidateError || fail('errorSummary', 'No status summary was found');
}

function validateOfficialSummary(summary) {
    if (!summary || typeof summary !== 'object' || !Array.isArray(summary.components) ||
        !Array.isArray(summary.affected_components) || !Array.isArray(summary.ongoing_incidents) ||
        !Array.isArray(summary.scheduled_maintenances)) {
        throw fail('errorIncomplete', 'Status summary is incomplete');
    }
    if (summary.components.some(item => !item || !text(item.id) || !text(item.name))) {
        throw fail('errorSchema', 'Status components are malformed');
    }
    if (summary.ongoing_incidents.some(item => !validActivity(item)) ||
        summary.scheduled_maintenances.some(item => !validActivity(item)) ||
        summary.affected_components.some(item => !item || !text(item.component_id))) {
        throw fail('errorSchema', 'Status activity is malformed');
    }
}

function uniqueComponents(items, statusFor) {
    const seen = new Set();
    const result = [];
    for (const [position, item] of items.entries()) {
        if (!item || !text(item.id) || seen.has(item.id)) continue;
        seen.add(item.id);
        result.push({ id: item.id, name: text(item.name), position, status: statusFor(item) });
    }
    return result;
}

function hiddenComponentIds(structure) {
    const hidden = new Set();
    const visible = new Set();
    for (const item of Array.isArray(structure?.items) ? structure.items : []) {
        if (item?.group) {
            for (const component of Array.isArray(item.group.components) ? item.group.components : []) {
                (item.hidden || item.group.hidden || component.hidden ? hidden : visible).add(component.component_id);
            }
        } else if (item?.component) {
            (item.hidden || item.component.hidden ? hidden : visible).add(item.component.component_id);
        }
    }
    for (const id of visible) hidden.delete(id);
    return hidden;
}

export function buildComponentGroups(structure, components) {
    const known = new Set(components.map(item => item.id));
    const assigned = new Set();
    const groups = [];
    for (const item of Array.isArray(structure?.items) ? structure.items : []) {
        if (item?.hidden || item?.group?.hidden || item?.component?.hidden) continue;
        const references = item?.group
            ? (Array.isArray(item.group.components) ? item.group.components : []).filter(component => !component?.hidden)
            : item?.component ? [item.component] : [];
        const ids = [];
        for (const reference of references) {
            const id = reference?.component_id;
            if (!known.has(id) || assigned.has(id)) continue;
            assigned.add(id);
            ids.push(id);
        }
        if (ids.length) groups.push({
            id: text(item.group?.id) || `group-${groups.length}`,
            name: text(item.group?.name) || 'Other',
            component_ids: ids
        });
    }
    const unassigned = components.filter(item => !assigned.has(item.id)).map(item => item.id);
    if (unassigned.length) groups.push({ id: 'other', name: 'Other', component_ids: unassigned });
    return groups;
}

function updateTime(update) {
    for (const field of ['display_at', 'updated_at', 'created_at', 'published_at']) {
        const timestamp = Date.parse(update?.[field] || '');
        if (Number.isFinite(timestamp)) return timestamp;
    }
    return -Infinity;
}

export function findLatestUpdate(updates) {
    if (!Array.isArray(updates) || !updates.length) return null;
    let latest = null;
    for (const update of updates) {
        if (!update || typeof update !== 'object') continue;
        if (!latest || updateTime(update) > updateTime(latest)) latest = update;
    }
    return latest;
}

export function safeStatusUrl(value) {
    if (!text(value)) return '';
    try {
        const url = new URL(value, STATUS_URL);
        return url.protocol === 'https:' && url.hostname === 'status.openai.com' && !url.username && !url.password
            ? url.href : '';
    } catch {
        return '';
    }
}

function impactFromAffected(items) {
    const affected = Array.isArray(items) ? items : [];
    const worst = affected.reduce((level, item) => {
        const status = normalizeComponentCode(item?.current_status || item?.status);
        if (status === 'under_maintenance') return level;
        return Math.max(level, getComponentStatus(status).level);
    }, 0);
    return worst >= 3 ? 'critical' : worst >= 2 ? 'major' : 'minor';
}

function normalizeIncident(item, compatibility = false) {
    const updates = (Array.isArray(compatibility ? item?.incident_updates : item?.updates)
        ? (compatibility ? item.incident_updates : item.updates) : []).filter(Boolean).map(update => ({
        id: text(update.id),
        status: code(update.to_status || update.status),
        body: text(update.body) || text(update.message_string) || text(update.message?.markdown),
        display_at: text(update.display_at) || text(update.published_at),
        updated_at: text(update.updated_at) || text(update.published_at),
        created_at: text(update.created_at) || text(update.published_at)
    }));
    const latest = findLatestUpdate(updates);
    const suppliedImpact = code(item?.impact);
    return {
        id: text(item?.id),
        name: text(item?.name),
        status: code(item?.status) || latest?.status || 'investigating',
        impact: Object.hasOwn(IMPACT_LEVEL, suppliedImpact) ? suppliedImpact : impactFromAffected(item?.affected_components),
        updated_at: latest?.display_at || latest?.updated_at || latest?.created_at || text(item?.updated_at) || text(item?.published_at),
        incident_updates: updates,
        url: safeStatusUrl(item?.permalink || item?.url || item?.shortlink)
    };
}

function normalizeMaintenance(item, compatibility = false) {
    const normalized = normalizeIncident(item, compatibility);
    return {
        ...normalized,
        status: code(item?.status) || findLatestUpdate(normalized.incident_updates)?.status || 'scheduled',
        impact: 'maintenance',
        scheduled_for: text(item?.scheduled_for) || text(item?.starts_at) || text(item?.start_at) || text(item?.scheduled_at),
        scheduled_until: text(item?.scheduled_until) || text(item?.ends_at) || text(item?.end_at)
    };
}

export function deriveOverallIndicator(components, incidents = [], maintenances = []) {
    const activeIncidents = incidents.filter(item => !CLOSED_INCIDENTS.has(item.status));
    const componentWorst = components.reduce((level, item) => {
        if (item.status === 'under_maintenance' || item.status === 'unknown') return level;
        return Math.max(level, getComponentStatus(item.status).level);
    }, 0);
    const incidentWorst = activeIncidents.reduce((level, item) => Math.max(level, IMPACT_LEVEL[item.impact] || 1), 0);
    const worst = Math.max(componentWorst, incidentWorst);
    if (worst >= 3) return 'critical';
    if (worst >= 2) return 'major';
    if (worst >= 1) return 'minor';
    if (!components.length || components.some(item => item.status === 'unknown')) return 'unknown';
    if (components.some(item => item.status === 'under_maintenance') ||
        maintenances.some(item => ACTIVE_MAINTENANCE.has(item.status))) return 'maintenance';
    return 'none';
}

export function normalizeOfficialSummary(summary) {
    validateOfficialSummary(summary);
    const affected = new Map(summary.affected_components.filter(Boolean).map(item => [
        item.component_id, normalizeComponentCode(item.current_status || item.status)
    ]));
    const hiddenIds = hiddenComponentIds(summary.structure);
    const components = uniqueComponents(summary.components.filter(item => !hiddenIds.has(item.id)), item =>
        affected.get(item.id) || (item.status ? normalizeComponentCode(item.status) : 'operational'));
    const incidents = summary.ongoing_incidents.filter(Boolean).map(item => normalizeIncident(item));
    const maintenances = summary.scheduled_maintenances.filter(Boolean).map(item => normalizeMaintenance(item));
    return {
        page: { name: text(summary.name) || 'OpenAI', url: safeStatusUrl(summary.public_url) || STATUS_URL },
        status: { indicator: deriveOverallIndicator(components, incidents, maintenances) },
        components,
        component_groups: buildComponentGroups(summary.structure, components),
        incidents,
        scheduled_maintenances: maintenances,
        availability: { components: components.length ? 'verified' : 'partial', incidents: 'verified', maintenances: 'verified' },
        source_mode: 'official-page'
    };
}

export function normalizeCompatibility(summary, componentsPayload) {
    validateResponse(summary);
    const separateComponents = Array.isArray(componentsPayload?.components) &&
        componentsPayload.components.every(item => item && text(item.id) && text(item.name));
    const rawComponents = separateComponents ? componentsPayload.components : summary.components;
    const components = uniqueComponents(rawComponents.filter(item => !item?.group), item => normalizeComponentCode(item.status));
    const incidentsVerified = Array.isArray(summary.incidents) && summary.incidents.every(validActivity);
    const maintenancesVerified = Array.isArray(summary.scheduled_maintenances) && summary.scheduled_maintenances.every(validActivity);
    const incidents = (Array.isArray(summary.incidents) ? summary.incidents : []).filter(validActivity).map(item => normalizeIncident(item, true));
    const maintenances = (Array.isArray(summary.scheduled_maintenances) ? summary.scheduled_maintenances : [])
        .filter(validActivity).map(item => normalizeMaintenance(item, true));
    const derived = deriveOverallIndicator(components, incidents, maintenances);
    const declared = code(summary.status.indicator);
    const declaredKnown = Object.hasOwn(OVERALL, declared);
    let indicator = derived;
    // Confirmed outages outrank maintenance, healthy components, and incomplete data.
    if (['minor', 'major', 'critical'].includes(declared) &&
        getOverall(declared).level >= getOverall(derived).level) indicator = declared;
    else if (declared === 'maintenance' && derived === 'none') indicator = 'maintenance';
    const activityVerified = incidentsVerified && maintenancesVerified;
    if (indicator === 'none' && (!declaredKnown || declared === 'unknown' || !activityVerified)) indicator = 'unknown';
    const groupItems = rawComponents.filter(item => item?.group).map(group => ({ group: {
        id: group.id, name: group.name,
        components: rawComponents.filter(item => item?.group_id === group.id).map(item => ({ component_id: item.id }))
    } }));
    return {
        page: { name: text(summary.page?.name) || 'OpenAI', url: STATUS_URL },
        status: { indicator },
        components,
        component_groups: buildComponentGroups({ items: groupItems }, components),
        incidents,
        scheduled_maintenances: maintenances,
        availability: {
            components: separateComponents && components.length ? 'verified' : 'partial',
            incidents: incidentsVerified ? 'verified' : 'unknown',
            maintenances: maintenancesVerified ? 'verified' : 'unknown'
        },
        source_mode: 'compatibility-json'
    };
}

export function validateResponse(data) {
    if (!data || typeof data !== 'object' || !data.status || typeof data.status !== 'object' ||
        !Array.isArray(data.components) || data.components.some(item => !item || !text(item.id) || !text(item.name))) {
        throw fail('errorSchema', 'Status data has an unexpected format');
    }
    return data;
}
