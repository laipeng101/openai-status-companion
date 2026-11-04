import {DEFAULT_LOCALE, LOCALES} from './locales/index.js';

export {LOCALES};

function normalizeLanguage(value) {
    return typeof value === 'string' ? value.trim().replaceAll('_', '-').toLowerCase() : '';
}

function matchLocale(language) {
    const normalized = normalizeLanguage(language);
    if (!normalized || normalized === 'auto') return null;
    const entries = Object.entries(LOCALES);
    const matchExact = tag => entries.find(([id, locale]) =>
        normalizeLanguage(id) === tag || normalizeLanguage(locale.lang) === tag)?.[0];
    const exact = matchExact(normalized);
    if (exact) return exact;
    const allParts = normalized.split('-');
    const extensionAt = allParts.findIndex((part,index) => index > 0 && part.length === 1);
    const parts = extensionAt < 0 ? allParts : allParts.slice(0,extensionAt);
    const base = parts[0] === 'in' ? 'id' : parts[0];
    if (extensionAt >= 0 || base !== parts[0]) {
        const variant = matchExact([base, ...parts.slice(1)].join('-'));
        if (variant) return variant;
    }
    // An explicit Chinese script takes precedence over region, including mixed tags.
    // Bare zh and all other regions retain Simplified Chinese as the default.
    if (base === 'zh') {
        if (parts.includes('hant')) return 'zh-TW';
        if (parts.includes('hans')) return 'zh-CN';
        return parts.some(part => ['tw', 'hk', 'mo'].includes(part)) ? 'zh-TW' : 'zh-CN';
    }
    return entries.find(([, locale]) => normalizeLanguage(locale.lang).split('-')[0] === base)?.[0] || null;
}

/** An explicit supported preference wins; auto follows the page, then the browser. */
export function resolveLocale(preference = 'auto', pageLanguage = '', navigatorLanguages = []) {
    const preferred = matchLocale(preference);
    if (preferred) return preferred;
    const page = matchLocale(pageLanguage);
    if (page) return page;
    const languages = Array.isArray(navigatorLanguages) ? navigatorLanguages : [navigatorLanguages];
    for (const language of languages) {
        const matched = matchLocale(language);
        if (matched) return matched;
    }
    return DEFAULT_LOCALE;
}

function ownValue(object, key) {
    return object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
}

export function hasMessage(key) {
    return Object.hasOwn(LOCALES[DEFAULT_LOCALE].messages, key);
}

/** Values are plain text; the UI must insert them with textContent, never innerHTML. */
export function translate(localeId, key, params = {}) {
    const locale = LOCALES[matchLocale(localeId) || DEFAULT_LOCALE];
    const message = ownValue(locale.messages, key) ?? ownValue(LOCALES[DEFAULT_LOCALE].messages, key) ?? String(key);
    return String(message).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name) => {
        const value = ownValue(params, name);
        return value == null ? placeholder : String(value);
    });
}

export function translateComponent(localeId, name) {
    if (typeof name !== 'string' || !name) return translate(localeId, 'unknownComponent');
    const locale = LOCALES[matchLocale(localeId) || DEFAULT_LOCALE];
    return ownValue(locale.componentNames, name) ?? ownValue(LOCALES[DEFAULT_LOCALE].componentNames, name) ?? name;
}

export function translateGroup(localeId, name) {
    const group = typeof name === 'string' && name ? name : 'Other';
    const locale = LOCALES[matchLocale(localeId) || DEFAULT_LOCALE];
    return ownValue(locale.groupNames, group) ?? ownValue(LOCALES[DEFAULT_LOCALE].groupNames, group) ?? group;
}
