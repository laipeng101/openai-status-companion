import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { visibleSidebarRect, createSidebarTracker } from '../src/sidebar.js';
import { chooseSidebar, calculatePlacement } from '../src/layout.js';

const VIEWPORT = { left: 0, top: 0, right: 1280, bottom: 800 };
const box = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

function page(t, markup = '<div id="outer"><div id="parent"><div id="sidebar"></div></div></div>') {
    const dom = new JSDOM(`<!doctype html><html><body>${markup}</body></html>`, { pretendToBeVisual: true });
    const { window } = dom;
    const { document } = window;
    const rects = new Map([
        ['outer', box(0, 0, 340, 800)], ['parent', box(0, 0, 340, 800)], ['sidebar', box(0, 0, 340, 800)]
    ]);
    window.HTMLElement.prototype.getBoundingClientRect = function () {
        const rect = rects.get(this.id) || box(0, 0, 1280, 800);
        return { ...rect, x: rect.left, y: rect.top, toJSON: () => ({ ...rect }) };
    };
    t.after(() => window.close());
    return { dom, window, document, rects, sidebar: document.getElementById('sidebar'), outer: document.getElementById('outer'), parent: document.getElementById('parent') };
}

function trackerPage(t, markup) {
    const app = page(t, markup);
    const frames = new Map(), resizeInstances = [];
    let frameId = 0, now = 0;
    app.window.requestAnimationFrame = (callback) => { frames.set(++frameId, callback); return frameId; };
    app.window.cancelAnimationFrame = (id) => frames.delete(id);
    Object.defineProperty(app.window.performance, 'now', { configurable: true, value: () => now });
    app.window.ResizeObserver = class {
        nodes = new Set();
        constructor(callback) { this.callback = callback; resizeInstances.push(this); }
        observe(node) { this.nodes.add(node); }
        disconnect() { this.nodes.clear(); }
    };
    return {
        ...app, frames, resizeInstances,
        frame(at) {
            now = at;
            const pending = [...frames.values()]; frames.clear();
            for (const callback of pending) callback(now);
        },
        setTime(at) { now = at; },
        event(node, type, fields = {}) {
            const event = new app.window.Event(type, { bubbles: true });
            Object.assign(event, fields); node.dispatchEvent(event);
        }
    };
}

test('actual ChatGPT collapse clips a 340px sidebar through its 52px grandparent', (t) => {
    const app = page(t);
    app.outer.style.overflowX = 'hidden'; app.outer.style.overflowY = 'hidden';
    app.rects.set('outer', box(0, 0, 52, 800));
    const visible = visibleSidebarRect(app.sidebar, VIEWPORT);
    assert.equal(app.sidebar.getBoundingClientRect().width, 340);
    assert.deepEqual(visible, { ...box(0, 0, 52, 800), visible: true });
    const sidebar = chooseSidebar([visible], 1280, 800);
    assert.equal(calculatePlacement({ width: 1280, height: 800, sidebarRight: sidebar.right }).left, 66);
    app.rects.set('outer', box(0, 0, 340, 800));
    assert.equal(visibleSidebarRect(app.sidebar, VIEWPORT).right, 340);
});

test('each overflow clipping mode limits the horizontal edge through an ancestor', (t) => {
    const app = page(t);
    app.rects.set('outer', box(0, 0, 52, 800));
    for (const mode of ['hidden', 'clip', 'auto', 'scroll', 'overlay']) {
        app.outer.style.overflowX = mode;
        assert.equal(visibleSidebarRect(app.sidebar, VIEWPORT).right, 52, mode);
    }
});

test('vertical-only overflow does not clip the horizontal sidebar edge', (t) => {
    const app = page(t);
    app.outer.style.overflowX = 'visible'; app.outer.style.overflowY = 'hidden';
    app.rects.set('outer', box(0, 100, 52, 500));
    const visible = visibleSidebarRect(app.sidebar, VIEWPORT);
    assert.equal(visible.right, 340);
    assert.equal(visible.top, 100); assert.equal(visible.bottom, 600);
});

test('multiple clipping ancestors and viewport use their actual geometric intersection', (t) => {
    const app = page(t);
    app.outer.style.overflowX = 'hidden'; app.outer.style.overflowY = 'hidden';
    app.parent.style.overflowX = 'clip'; app.parent.style.overflowY = 'clip';
    app.rects.set('sidebar', box(-20, -10, 360, 850));
    app.rects.set('parent', box(20, 10, 220, 780));
    app.rects.set('outer', box(50, 30, 110, 730));
    assert.deepEqual(visibleSidebarRect(app.sidebar, VIEWPORT), { ...box(50, 30, 110, 730), visible: true });
    app.rects.set('outer', box(700, 0, 100, 800));
    assert.equal(visibleSidebarRect(app.sidebar, VIEWPORT), null);
});

test('hidden or transparent ancestors and off-screen transforms are excluded', (t) => {
    const app = page(t);
    for (const css of ['display:none', 'visibility:hidden', 'content-visibility:hidden', 'opacity:0']) {
        app.outer.style.cssText = css;
        assert.equal(visibleSidebarRect(app.sidebar, VIEWPORT), null, css);
    }
    app.outer.style.cssText = ''; app.outer.hidden = true;
    assert.equal(visibleSidebarRect(app.sidebar, VIEWPORT), null);
    app.outer.hidden = false;
    app.rects.set('sidebar', box(-340, 0, 340, 800));
    assert.equal(visibleSidebarRect(app.sidebar, VIEWPORT), null);
});

test('paint containment clips descendants while layout containment alone does not', (t) => {
    const app = page(t); app.rects.set('outer', box(0, 0, 52, 800));
    for (const containment of ['paint', 'strict', 'content', 'layout paint']) {
        app.outer.style.contain = containment;
        assert.equal(visibleSidebarRect(app.sidebar, VIEWPORT).right, 52, containment);
    }
    app.outer.style.contain = 'layout';
    assert.equal(visibleSidebarRect(app.sidebar, VIEWPORT).right, 340);
});

test('ancestor attribute changes schedule immediate tracking without observing streamed conversation descendants', async (t) => {
    const app = trackerPage(t, '<div id="outer"><div id="parent"><div id="sidebar"><div id="history"><span id="text">old</span></div></div></div><main><div id="conversation"></div></main>');
    let layouts = 0;
    const tracker = createSidebarTracker(app.document, '#sidebar', () => { layouts += 1; });
    t.after(() => tracker.pause());
    app.document.getElementById('text').textContent = 'streamed title';
    app.document.getElementById('conversation').append(app.document.createElement('p'));
    await nextTurn();
    assert.equal(app.frames.size, 0);
    app.outer.className = 'collapsed'; await nextTurn();
    assert.equal(app.frames.size, 1);
    app.frame(16); assert.equal(layouts, 1);
    app.frame(250); assert.equal(app.frames.size, 0);
    const observed = app.resizeInstances[0].nodes;
    assert.ok(observed.has(app.outer)); assert.ok(observed.has(app.parent)); assert.ok(observed.has(app.sidebar));
    assert.equal(observed.has(app.document.body), false); assert.equal(observed.has(app.document.documentElement), false);
});

test('CSS collapse animation follows intermediate visible edges and settles after the final frame', (t) => {
    const app = trackerPage(t); app.outer.style.overflowX = 'hidden'; app.outer.style.overflowY = 'hidden';
    const edges = [];
    const tracker = createSidebarTracker(app.document, '#sidebar', () => edges.push(visibleSidebarRect(app.sidebar, VIEWPORT).right));
    t.after(() => tracker.pause());
    app.event(app.outer, 'transitionrun', { propertyName: 'width', pseudoElement: '' });
    app.rects.set('outer', box(0, 0, 260, 800)); app.frame(16);
    app.rects.set('outer', box(0, 0, 160, 800)); app.frame(32);
    app.rects.set('outer', box(0, 0, 52, 800)); app.setTime(48);
    app.event(app.outer, 'transitionend', { propertyName: 'width', pseudoElement: '' }); app.frame(48);
    assert.deepEqual(edges, [260, 160, 52]);
    app.frame(260); assert.equal(app.frames.size, 0);
});

test('animation cancellation and missing end events cannot leave an unbounded RAF loop', (t) => {
    const app = trackerPage(t);
    const tracker = createSidebarTracker(app.document, '#sidebar', () => {});
    t.after(() => tracker.pause());
    app.event(app.outer, 'animationstart', { animationName: 'sidebar-slide', pseudoElement: '' }); app.frame(16);
    assert.equal(app.frames.size, 1);
    app.setTime(20); app.event(app.outer, 'animationcancel', { animationName: 'sidebar-slide', pseudoElement: '' }); app.frame(240);
    assert.equal(app.frames.size, 0);
    app.setTime(300); app.event(app.outer, 'transitionrun', { propertyName: 'transform', pseudoElement: '' }); app.frame(316);
    assert.equal(app.frames.size, 1); app.frame(5_301); assert.equal(app.frames.size, 0);
});

test('pause clears pending animation frames and resume rediscovers the current shell', async (t) => {
    const app = trackerPage(t);
    let layouts = 0;
    const tracker = createSidebarTracker(app.document, '#sidebar', () => { layouts += 1; });
    t.after(() => tracker.pause());
    app.event(app.outer, 'transitionrun', { propertyName: 'width' });
    assert.equal(app.frames.size, 1); tracker.pause(); assert.equal(app.frames.size, 0);
    app.outer.className = 'collapsed'; await nextTurn(); assert.equal(app.frames.size, 0);
    tracker.resume(); assert.equal(app.frames.size, 1); app.frame(16); assert.equal(layouts, 1);
    app.frame(250); assert.equal(app.frames.size, 0);
});

test('replaced sidebar is rebound and its detached sidebar no longer triggers work', async (t) => {
    const app = trackerPage(t);
    const tracker = createSidebarTracker(app.document, '#sidebar', () => {});
    t.after(() => tracker.pause());
    const replacement = app.document.createElement('div'); replacement.id = 'sidebar';
    app.sidebar.replaceWith(replacement); await nextTurn();
    assert.deepEqual(tracker.discover(), [replacement]);
    assert.equal(app.resizeInstances[0].nodes.has(app.sidebar), false);
    assert.equal(app.resizeInstances[0].nodes.has(replacement), true);
    app.frame(250); assert.equal(app.frames.size, 0);
    app.sidebar.className = 'detached-change'; await nextTurn(); assert.equal(app.frames.size, 0);
    replacement.style.width = '52px'; await nextTurn(); assert.equal(app.frames.size, 1);
});

test('new selector match on an already-observed ancestor is included in candidate discovery', async (t) => {
    const app = trackerPage(t);
    const tracker = createSidebarTracker(app.document, '#sidebar,.also-sidebar', () => {});
    t.after(() => tracker.pause());
    assert.deepEqual(tracker.discover(), [app.sidebar]);
    app.outer.className = 'also-sidebar'; await nextTurn();
    assert.deepEqual(tracker.discover(), [app.outer, app.sidebar]);
});

test('a hidden page performs no layout work and resumes from fresh geometry when visible', (t) => {
    const app = trackerPage(t);
    Object.defineProperty(app.document, 'hidden', { configurable: true, value: false, writable: true });
    let layouts = 0;
    const tracker = createSidebarTracker(app.document, '#sidebar', () => { layouts += 1; });
    t.after(() => tracker.pause());
    tracker.schedule(true); app.document.hidden = true; app.frame(16);
    assert.equal(layouts, 0); assert.equal(app.frames.size, 0);
    tracker.resume(); assert.equal(app.frames.size, 0);
    app.document.hidden = false; tracker.resume(); app.frame(32);
    assert.equal(layouts, 1); app.frame(250); assert.equal(app.frames.size, 0);
});

test('several shell resize notifications coalesce into a single frame', (t) => {
    const app = trackerPage(t);
    let layouts = 0;
    const tracker = createSidebarTracker(app.document, '#sidebar', () => { layouts += 1; });
    t.after(() => tracker.pause());
    app.resizeInstances[0].callback(); app.resizeInstances[0].callback(); app.resizeInstances[0].callback();
    assert.equal(app.frames.size, 1); app.frame(16);
    assert.equal(layouts, 1); assert.equal(app.frames.size, 0);
});
