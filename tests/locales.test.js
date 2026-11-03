import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCALES, resolveLocale, translate, translateComponent, translateGroup } from '../src/locales.js';

const placeholders = (message) => [...message.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)]
    .map((match) => match[1]).sort();

test('every shipped locale has message and placeholder parity with English', () => {
    const englishKeys = Object.keys(LOCALES.en.messages).sort();
    for (const [id, locale] of Object.entries(LOCALES)) {
        assert.deepEqual(Object.keys(locale.messages).sort(), englishKeys, `${id} message keys`);
        assert.ok(locale.label && locale.lang && ['ltr', 'rtl'].includes(locale.dir));
        for (const key of englishKeys) {
            assert.equal(typeof locale.messages[key], 'string', `${id}.${key}`);
            assert.ok(locale.messages[key].length, `${id}.${key} is nonempty`);
            assert.deepEqual(placeholders(locale.messages[key]), placeholders(LOCALES.en.messages[key]), `${id}.${key} placeholders`);
        }
    }
});

test('explicit supported preference overrides page and browser language', () => {
    assert.equal(resolveLocale('en', 'zh-CN', ['zh-CN']), 'en');
    assert.equal(resolveLocale('zh-CN', 'en', ['en']), 'zh-CN');
    assert.equal(resolveLocale('EN_gb', 'zh-CN'), 'en');
    assert.equal(resolveLocale('zh-Hant-TW', 'en'), 'zh-TW');
});

test('auto language follows page first, then first supported browser language', () => {
    assert.equal(resolveLocale('auto', 'zh-CN', ['en-US']), 'zh-CN');
    assert.equal(resolveLocale('auto', 'en-GB', ['zh-CN']), 'en');
    assert.equal(resolveLocale('auto', 'fr-FR', ['de', 'zh-TW', 'en']), 'fr');
    assert.equal(resolveLocale('auto', '', ['fr', 'en-US', 'zh-CN']), 'fr');
    assert.equal(resolveLocale('auto', '', ['zz', 'xx']), 'en');
    assert.equal(resolveLocale('auto', null, null), 'en');
    assert.equal(resolveLocale('missing-locale', 'zh_CN', 'en-US'), 'zh-CN');
});

test('translation interpolates zero and preserves unresolved placeholders', () => {
    assert.equal(translate('en', 'normalCount', { normal: 0, total: 8 }), '0/8 components operational');
    assert.equal(translate('zh-CN', 'normalCount', { normal: 5, total: 8 }), '5/8 个组件运行正常');
    assert.equal(translate('en', 'normalCount', { total: 8 }), '{normal}/8 components operational');
    assert.equal(translate('en', 'errorHttp', { status: 503 }), 'Official status request returned HTTP 503');
    assert.equal(translate('en', 'fetchFailed', { error: '<img onerror=alert(1)>' }),
        'Could not fetch OpenAI status: <img onerror=alert(1)>. Check your connection and try refreshing.');
});

test('missing locale and missing message fall back without inherited object properties', () => {
    assert.equal(translate('zz', 'refresh'), 'Refresh now');
    assert.equal(translate('en-US', 'refresh'), 'Refresh now');
    assert.equal(translate('zh-TW', 'refresh'), '立即重新整理');
    assert.equal(translate('en', 'unregisteredKey'), 'unregisteredKey');
    assert.equal(translate('en', 'constructor'), 'constructor');
    assert.equal(translate('en', '__proto__'), '__proto__');
});

test('future partial locale can use per-key English fallback', () => {
    LOCALES.test = {
        label: 'Test locale', lang: 'test', dir: 'rtl', messages: { refresh: 'Test refresh' },
        componentNames: {}, groupNames: {}
    };
    try {
        assert.equal(resolveLocale('test', 'en'), 'test');
        assert.equal(translate('test', 'refresh'), 'Test refresh');
        assert.equal(translate('test', 'close'), 'Close panel');
        assert.equal(translateGroup('test', 'Other'), 'Other components');
    } finally {
        delete LOCALES.test;
    }
});

test('official proper names remain intact and unknown component names are preserved', () => {
    assert.equal(translateComponent('en', 'Login'), 'Login');
    assert.equal(translateComponent('zh-CN', 'Login'), '登录');
    assert.equal(translateComponent('zh-CN', 'ChatGPT Work'), 'ChatGPT Work');
    assert.equal(translateComponent('zh-CN', 'Future Service'), 'Future Service');
    assert.equal(translateComponent('zh-CN', ''), '未知组件');
    assert.equal(translateComponent('en', null), 'Unknown component');
    assert.equal(translateComponent('en', 'constructor'), 'constructor');
    assert.equal(translateGroup('zh-CN', 'Ads Platform'), '广告平台');
    assert.equal(translateGroup('en', null), 'Other components');
    assert.equal(translateGroup('zh-CN', 'Future Group'), 'Future Group');
});

test('Chinese script and region tags select the appropriate writing system', () => {
    for (const language of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-TW', 'ZH_hans_HK', 'zh-CN-x-hant']) {
        assert.equal(resolveLocale('auto', language, ['en']), 'zh-CN', language);
    }
    for (const language of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN', 'zh-Hant-TW-u-nu-hanidec', 'zh-TW-x-hans']) {
        assert.equal(resolveLocale('auto', language, ['en']), 'zh-TW', language);
    }
});

test('regional languages and legacy Indonesian tags use the bundled language variant', () => {
    for (const [language, expected] of [
        ['es-MX','es'], ['es-419','es'], ['pt','pt-BR'], ['pt-PT','pt-BR'],
        ['hi-IN','hi'], ['ja-JP','ja'], ['ko-KR','ko'], ['fr-CA','fr'],
        ['de-AT','de'], ['id-ID','id'], ['in-ID','id'], ['ar-EG','ar'], ['ru-RU','ru']
    ]) assert.equal(resolveLocale('auto', language, ['en']), expected, language);
    assert.equal(resolveLocale('es', 'ar', ['hi']), 'es');
    assert.equal(resolveLocale('auto', 'zz', ['xx','ar-SA','en']), 'ar');
});

test('every bundled language preserves unrecognized official component and group names', () => {
    for (const id of Object.keys(LOCALES)) {
        for (const name of ['ChatGPT','Sora','Codex API','ChatGPT Work','Future Service']) {
            assert.equal(translateComponent(id, name), name, `${id}.${name}`);
        }
        assert.equal(translateGroup(id, 'Future Group'), 'Future Group', id);
    }
});
