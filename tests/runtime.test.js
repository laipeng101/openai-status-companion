import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { request as requestStatus } from '../src/transport.js';
import { LOCALES, translate } from '../src/locales.js';

const bundle = readFileSync(new URL('../dist/openai-status-companion.user.js', import.meta.url), 'utf8');
const HOST_ID = 'openai-status-companion';
const SETTINGS_KEY = 'openai-status-companion:preferences';
const official = (overrides = {}) => ({
    name: 'OpenAI', components: [{ id: 'chat', name: 'Conversations' }], affected_components: [],
    ongoing_incidents: [], scheduled_maintenances: [], ...overrides
});
const asRsc = (summary) => `<html><script>self.__next_f.push(${JSON.stringify([1, `0:{"summary":${JSON.stringify(summary)}}`]).replaceAll('<', '\\u003c')})</script></html>`;
const successful = (summary = official()) => ({ status: 200, responseText: asRsc(summary) });
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

function environment(t, { url = 'https://chatgpt.com/', lang = 'en', theme = 'light',
    preferences = {}, sidebarWidth = 340, width = 1280, height = 800,
    response = () => successful(), brokenStorage = false, clipWidth = null } = {}) {
    let responder = response;
    const requests = [], menus = [], activeMenus = new Map(), saved = new Map([[SETTINGS_KEY, structuredClone(preferences)]]);
    const sidebarId = new URL(url).hostname === 'chatgpt.com' ? 'app-shell-sidebar' : 'stage-slideover-sidebar';
    const dom = new JSDOM(`<!doctype html><html lang="${lang}" class="${theme}"><body><aside id="sidebar-clip" style="overflow-x:hidden;overflow-y:hidden"><div id="${sidebarId}"></div></aside><main><div id="message"></div></main></body></html>`, {
        url, runScripts: 'dangerously', pretendToBeVisual: true
    });
    const window = dom.window;
    Object.defineProperties(window, { innerWidth: { configurable: true, value: width }, innerHeight: { configurable: true, value: height } });
    Object.defineProperty(window.navigator, 'languages', { configurable: true, value: ['en-US', 'zh-CN'] });
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.ResizeObserver = class { observe() {} disconnect() {} };
    let visibleWidth = clipWidth ?? sidebarWidth;
    let geometryReads = 0;
    window.HTMLElement.prototype.getBoundingClientRect = function () {
        geometryReads += 1;
        const dimensions = this.id === 'sidebar-clip' ? [0, 0, visibleWidth, height]
            : this.id === sidebarId ? [0, 0, sidebarWidth, height]
            : this.classList.contains('launcher') ? [0, 0, 180, 38] : [0, 0, 0, 0];
        const [x, y, rectWidth, rectHeight] = dimensions;
        const result = { x, y, width: rectWidth, height: rectHeight, left: x, top: y, right: x + rectWidth, bottom: y + rectHeight };
        return { ...result, toJSON: () => ({ ...result }) };
    };
    window.GM_getValue = (key, fallback) => {
        if (brokenStorage) throw new Error('Storage unavailable');
        return structuredClone(saved.get(key) ?? fallback);
    };
    window.GM_setValue = (key, value) => {
        if (brokenStorage) throw new Error('Storage unavailable');
        saved.set(key, structuredClone(value));
    };
    window.GM_registerMenuCommand = (name, callback) => {
        const id = menus.length + 1;
        const entry = { id, name, callback };
        menus.push(entry); activeMenus.set(id, entry);
        return id;
    };
    window.GM_unregisterMenuCommand = (id) => activeMenus.delete(id);
    window.GM_xmlhttpRequest = (options) => {
        requests.push(options);
        const reply = responder(options, requests.length);
        if (reply) queueMicrotask(() => {
            if (reply.timeout) options.ontimeout();
            else if (reply.networkError) options.onerror();
            else options.onload(reply);
        });
        return { abort: () => options.onabort() };
    };
    t.after(() => dom.window.close());
    window.eval(bundle);
    const host = window.document.getElementById(HOST_ID);
    const shadow = host.shadowRoot;
    return {
        dom, window, host, shadow, requests, menus, activeMenus, saved,
        get geometryReads() { return geometryReads; },
        async frame() { await new Promise(resolve => window.requestAnimationFrame(() => resolve())); },
        clip(next) {
            visibleWidth = next;
            window.document.getElementById('sidebar-clip').style.width = `${next}px`;
        },
        setResponse(next) { responder = next; },
        async settle() { for (let index = 0; index < 5; index += 1) await nextTurn(); },
        open() { shadow.querySelector('.launcher').click(); },
        refresh() { shadow.querySelector('.actions button:nth-child(2)').click(); },
        select(name, value) {
            const select = shadow.querySelector(`select[name="${name}"]`);
            select.value = value;
            select.dispatchEvent(new window.Event('change', { bubbles: true }));
        }
    };
}

test('runtime boots on ChatGPT and original Leopard-X without reading conversation data', async (t) => {
    for (const url of ['https://chatgpt.com/', 'https://leopard-x.memofun.net/', 'https://mana-x.aizex.net/']) {
        const app = environment(t, { url, sidebarWidth: url.includes('chatgpt.com') ? 340 : 260 });
        await app.settle();
        assert.equal(app.host.dataset.adapter, url.includes('chatgpt.com') ? 'chatgpt' : 'leopard');
        assert.equal(app.shadow.querySelector('.launcher').textContent, 'OpenAI operational');
        assert.equal(app.shadow.querySelector('.panel').hidden, true);
        assert.equal(app.requests.length, 1);
        const request = app.requests[0];
        assert.equal(request.url, 'https://status.openai.com/');
        assert.equal(request.method, 'GET');
        assert.equal(request.anonymous, true);
        assert.equal(request.timeout, 15_000);
        assert.equal(Object.hasOwn(request, 'data'), false);
        assert.equal(Object.hasOwn(request, 'cookie'), false);
        app.open();
        assert.match(app.shadow.textContent, /1\/1 components operational/);
    }
});

test('failed initial request shows unknown status and useful HTTP error after fallback fails', async (t) => {
    const app = environment(t, { response: () => ({ status: 503 }) });
    await app.settle(); app.open();
    assert.equal(app.shadow.querySelector('.launcher').textContent, 'OpenAI status unknown');
    assert.equal(app.shadow.querySelector('.launcher').dataset.tone, 'muted');
    assert.match(app.shadow.querySelector('.error').textContent, /HTTP 503/);
    assert.equal(app.requests.length, 3);
    assert.equal(app.shadow.querySelector('.actions button:nth-child(2)').disabled, false);
    assert.equal(app.shadow.querySelector('.content').getAttribute('aria-busy'), 'false');
});

test('compatibility fallback labels missing event arrays unverified instead of healthy zero', async (t) => {
    const payload = { status: { indicator: 'none' }, components: [{ id: 'chat', name: 'Conversations', status: 'operational' }] };
    const app = environment(t, { response: (request) => request.url.endsWith('/')
        ? { status: 200, responseText: '<html>Changed official layout</html>' }
        : { status: 200, response: payload } });
    await app.settle(); app.open();
    assert.equal(app.shadow.querySelector('.launcher').textContent, 'Status unknown');
    assert.equal(app.shadow.querySelector('.subtitle').textContent, 'Compatibility data from status.openai.com');
    assert.deepEqual([...app.shadow.querySelectorAll('.activity-value')].map((item) => item.textContent), ['Unverified', 'Unverified']);
    assert.match(app.shadow.querySelector('.note').textContent, /Compatibility data/);
});

test('later network failure preserves cached data and displays the failed refresh honestly', async (t) => {
    const app = environment(t);
    await app.settle(); app.open();
    const previousOverall = app.shadow.querySelector('.overall-text').textContent;
    app.setResponse(() => ({ networkError: true })); app.refresh(); await app.settle();
    assert.equal(app.shadow.querySelector('.overall-text').textContent, previousOverall);
    assert.equal(app.shadow.querySelector('.launcher').classList.contains('stale'), true);
    assert.match(app.shadow.querySelector('.launcher').textContent, /cached/);
    assert.match(app.shadow.querySelector('.note').textContent, /Refresh failed.*Could not connect/);
    assert.match(app.shadow.querySelector('.overall .meta:last-child').textContent, /Last successful fetch/);
});

test('request timeout becomes a localized error and loading state always clears', async (t) => {
    const app = environment(t, { lang: 'zh-CN', response: () => ({ timeout: true }) });
    await app.settle(); app.open();
    assert.match(app.shadow.querySelector('.error').textContent, /请求官方状态超时/);
    assert.equal(app.shadow.querySelector('.launcher').classList.contains('loading'), false);
    assert.equal(app.shadow.querySelector('.actions button:nth-child(2)').disabled, false);
});

test('language, theme and position preferences override website settings and persist', async (t) => {
    const app = environment(t, { lang: 'zh-CN', theme: 'dark', preferences: { language: 'en', theme: 'light', position: 'left' } });
    await app.settle();
    assert.equal(app.host.lang, 'en'); assert.equal(app.host.dataset.theme, 'light');
    assert.equal(app.host.style.left, '14px');
    app.open(); app.select('language', 'zh-CN'); app.select('theme', 'dark'); app.select('position', 'right');
    await app.settle();
    assert.equal(app.host.lang, 'zh-CN'); assert.equal(app.host.dir, 'ltr');
    assert.equal(app.host.dataset.theme, 'dark');
    assert.match(app.shadow.querySelector('.title').textContent, /官方状态/);
    assert.deepEqual(app.saved.get(SETTINGS_KEY), { language: 'zh-CN', theme: 'dark', position: 'right' });
});

test('auto language and theme react to page changes while explicit language stays fixed', async (t) => {
    const app = environment(t);
    await app.settle(); app.open();
    app.window.document.documentElement.lang = 'zh-CN';
    app.window.document.documentElement.className = 'dark'; await app.settle();
    assert.equal(app.host.lang, 'zh-CN'); assert.equal(app.host.dataset.theme, 'dark');
    assert.equal(app.shadow.querySelector('.title').textContent, 'OpenAI 官方状态');
    app.select('language', 'en');
    app.window.document.documentElement.lang = 'zh-TW'; await app.settle();
    assert.equal(app.host.lang, 'en');
    assert.equal(app.shadow.querySelector('.title').textContent, 'OpenAI Status');
});

test('Escape closes panel and restores launcher focus; outside pointer closes panel', async (t) => {
    const app = environment(t); await app.settle(); app.open();
    assert.equal(app.shadow.querySelector('.panel').hidden, false);
    app.shadow.querySelector('.panel').dispatchEvent(new app.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(app.shadow.querySelector('.panel').hidden, true);
    assert.equal(app.shadow.activeElement, app.shadow.querySelector('.launcher'));
    assert.equal(app.shadow.querySelector('.launcher').getAttribute('aria-expanded'), 'false');
    app.open(); app.window.document.body.dispatchEvent(new app.window.Event('pointerdown', { bubbles: true, composed: true }));
    assert.equal(app.shadow.querySelector('.panel').hidden, true);
});

test('component disclosure state, focus and scroll survive an asynchronous refresh', async (t) => {
    const app = environment(t); await app.settle(); app.open();
    app.shadow.querySelector('details').open = true;
    app.shadow.querySelector('summary').focus();
    app.shadow.querySelector('.panel').scrollTop = 90;
    app.refresh(); await app.settle();
    assert.equal(app.shadow.querySelector('details').open, true);
    assert.equal(app.shadow.activeElement, app.shadow.querySelector('summary'));
    assert.equal(app.shadow.querySelector('.panel').scrollTop, 90);
});

test('duplicate execution creates no extra host or requests', async (t) => {
    const app = environment(t); await app.settle(); app.open();
    const before = app.requests.length; app.window.eval(bundle); await app.settle();
    assert.equal(app.window.document.querySelectorAll(`#${HOST_ID}`).length, 1);
    assert.equal(app.requests.length, before);
    assert.equal(app.host.shadowRoot, app.shadow);
});

test('incident names, original messages and unsafe links cannot become executable HTML', async (t) => {
    const app = environment(t, { response: () => successful(official({ ongoing_incidents: [{
        id: 'unsafe', name: '<img src=x onerror=alert(1)>', status: 'investigating', permalink: 'javascript:alert(1)',
        updates: [{ published_at: '2026-11-03T08:00:00Z', message_string: '<script>window.pwned=true</script>' }]
    }] })) });
    await app.settle(); app.open();
    assert.equal(app.shadow.querySelector('.incident-name').textContent, '<img src=x onerror=alert(1)>');
    assert.match(app.shadow.querySelector('.update').textContent, /<script>window\.pwned=true<\/script>/);
    assert.equal(app.shadow.querySelector('.incident img'), null);
    assert.equal(app.shadow.querySelector('.incident script'), null);
    assert.equal(app.shadow.querySelector('.incident a'), null);
    assert.equal(app.window.pwned, undefined);
});

test('unavailable preference storage does not prevent display or live preference changes', async (t) => {
    const app = environment(t, { brokenStorage: true }); await app.settle(); app.open();
    app.select('language', 'zh-CN'); await app.settle();
    assert.equal(app.host.lang, 'zh-CN');
    assert.equal(app.shadow.querySelector('.launcher').textContent, 'OpenAI 正常');
});

test('widget remounts after an application shell replaces its root child', async (t) => {
    const app = environment(t); await app.settle();
    app.host.remove(); await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(app.host.isConnected, true);
    assert.equal(app.window.document.getElementById(HOST_ID), app.host);
});

test('manager menus change language without leaving duplicate commands', async (t) => {
    const app = environment(t); await app.settle();
    assert.equal(app.activeMenus.size, 3);
    assert.deepEqual([...app.activeMenus.values()].map((item) => item.name),
        ['Refresh now', 'Toggle OpenAI status panel', 'OpenAI status preferences']);
    app.select('language', 'zh-CN'); await app.settle();
    assert.equal(app.activeMenus.size, 3);
    assert.deepEqual([...app.activeMenus.values()].map((item) => item.name),
        ['立即刷新', '展开 / 收起 OpenAI 状态面板', 'OpenAI 状态偏好设置']);
    [...app.activeMenus.values()][2].callback();
    assert.equal(app.shadow.querySelector('.panel').hidden, false);
    assert.equal(app.shadow.querySelector('.settings').hidden, false);
    assert.equal(app.shadow.activeElement, app.shadow.querySelector('select[name="language"]'));
});

test('unchanged background status does not repeatedly mutate the live announcement label', async (t) => {
    const app = environment(t); await app.settle();
    const label = app.shadow.querySelector('[aria-live="polite"]');
    let mutations = 0;
    const observer = new app.window.MutationObserver((records) => { mutations += records.length; });
    observer.observe(label, { subtree: true, characterData: true, childList: true });
    app.refresh(); await app.settle(); observer.disconnect();
    assert.equal(mutations, 0);
    assert.equal(label.textContent, 'OpenAI operational');
});

test('launcher and open panel dock to the visible clipped sidebar edge immediately on all matched hosts', async (t) => {
    for (const url of ['https://chatgpt.com/', 'https://leopard-x.memofun.net/', 'https://mana-x.aizex.net/']) {
        const fullWidth = url.includes('chatgpt.com') ? 340 : 260;
        const app = environment(t, { url, sidebarWidth: fullWidth, clipWidth: 52 });
        await app.settle(); app.open();
        assert.equal(app.host.style.left, '66px');
        assert.equal(app.host.style.getPropertyValue('--panel-left'), '66px');
        for (const visible of [fullWidth, 180, 52]) {
            app.clip(visible); await app.settle(); await app.frame();
            assert.equal(app.host.style.left, `${visible+14}px`);
            assert.equal(app.host.style.getPropertyValue('--panel-left'), `${visible+14}px`);
        }
        assert.equal(app.shadow.querySelector('.panel').hidden, false);
    }
});

test('fixed corner preferences and narrow mobile placement stay stable during sidebar collapse', async (t) => {
    for (const [preferences,width,left] of [[{position:'left'},1280,14],[{position:'right'},1280,1086],[{},390,10]]) {
        const app = environment(t, { preferences, width });
        await app.settle();
        app.clip(52); await app.settle(); await app.frame();
        assert.equal(app.host.style.left, `${left}px`);
    }
});

test('native fetch fallback omits credentials and distinguishes response-body timeout', async (t) => {
    let fetchOptions;
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
        fetchOptions = options;
        return { ok: true, status: 200, json: async () => ({ status: { indicator: 'none' } }) };
    });
    assert.deepEqual(await requestStatus('https://status.openai.com/api/v2/summary.json', 'json'), { status: { indicator: 'none' } });
    assert.equal(fetchOptions.credentials, 'omit');
    assert.equal(fetchOptions.referrerPolicy, 'no-referrer');
    assert.equal(fetchOptions.cache, 'no-store');
    assert.equal(fetchOptions.signal.aborted, false);

    const nativeSetTimeout = globalThis.setTimeout;
    t.mock.method(globalThis, 'setTimeout', (callback, delay, ...args) =>
        nativeSetTimeout(callback, delay === 15_000 ? 0 : delay, ...args));
    t.mock.method(globalThis, 'fetch', async (_url, options) => ({
        ok: true, status: 200,
        text: () => new Promise((_resolve, reject) => {
            if (options.signal.aborted) reject(new Error('aborted'));
            else options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        })
    }));
    await assert.rejects(requestStatus('https://status.openai.com/'), (error) => error.code === 'errorTimeout');
});

test('all bundled languages render and persist in the production bundle without changing status meaning', async (t) => {
    const app = environment(t, { response: () => successful(official({
        affected_components: [{component_id:'chat',current_status:'partial_outage'}],
        ongoing_incidents: [{id:'incident',name:'Elevated errors',status:'monitoring',
            updates:[{published_at:'2026-11-03T08:00:00Z',message_string:'Recovery is being monitored.'}]}]
    })) });
    await app.settle(); app.open();
    const languageSelect = app.shadow.querySelector('select[name="language"]');
    assert.equal(languageSelect.options.length, Object.keys(LOCALES).length+1);
    for (const [id, resource] of Object.entries(LOCALES)) {
        app.select('language',id); await app.settle();
        assert.equal(app.host.lang,resource.lang,id);
        assert.equal(app.host.dir,resource.dir,id);
        assert.equal(app.saved.get(SETTINGS_KEY).language,id);
        assert.equal(app.shadow.querySelector('.title').textContent,translate(id,'title'));
        assert.equal(app.shadow.querySelector('.overall-text').textContent,translate(id,'overall_major'));
        assert.equal(app.shadow.querySelector('.badge').textContent,translate(id,'component_partial_outage'));
        assert.equal(app.shadow.querySelector('.official-body').textContent,'Recovery is being monitored.');
        assert.equal(app.shadow.querySelector('.official-body').dir,'auto');
        assert.equal(app.shadow.querySelector('.incident-name').dir,'auto');
        assert.equal(app.activeMenus.size,3);
        assert.equal([...app.activeMenus.values()][0].name,translate(id,'refresh'));
    }
    app.select('language','auto');
    app.window.document.documentElement.lang='zh-Hant-HK'; await app.settle();
    assert.equal(app.host.lang,'zh-TW');
    app.window.document.documentElement.lang='ar-EG'; await app.settle();
    assert.equal(app.host.dir,'rtl');
    app.window.document.documentElement.lang='en'; await app.settle();
    assert.equal(app.host.dir,'ltr');
});
