import test from 'node:test';
import assert from 'node:assert/strict';
import { ADAPTERS, adapterFor, chooseSidebar, calculatePlacement } from '../src/layout.js';

const rect = (width, extra = {}) => ({ left: 0, right: width, width, height: 800, visible: true, ...extra });

test('site adapters cover ChatGPT and both original Aizex / Leopard-X hosts', () => {
    assert.equal(adapterFor('chatgpt.com'), 'chatgpt');
    assert.equal(adapterFor('leopard-x.memofun.net'), 'leopard');
    assert.equal(adapterFor('mana-x.aizex.net'), 'leopard');
    assert.ok(ADAPTERS.chatgpt.includes('#app-shell-sidebar'));
    assert.ok(ADAPTERS.leopard.includes('#stage-slideover-sidebar'));
    assert.ok(ADAPTERS.leopard.includes('#stage-sidebar-tiny-bar'));
});

test('expanded sidebar wins over an overlapping narrow rail on both site layouts', () => {
    assert.equal(chooseSidebar([rect(52), rect(260)], 2560, 1215).right, 260);
    assert.equal(chooseSidebar([rect(340), rect(52)], 2560, 1271).right, 340);
    assert.equal(chooseSidebar([rect(260, { visible: false }), rect(52)], 2560, 1215).right, 52);
});

test('off-screen, hidden, tiny and non-sidebar rectangles are ignored', () => {
    assert.equal(chooseSidebar([
        rect(260, { right: 0, left: -260 }), rect(260, { visible: false }),
        rect(260, { height: 20 }), rect(900), rect(260, { left: 500, right: 760 })
    ], 1024, 800), null);
    assert.equal(chooseSidebar([], 1024, 800), null);
});

test('desktop auto placement follows expanded and collapsed sidebar edges', () => {
    const desktop = { width: 2560, height: 1271, launcherWidth: 180, launcherHeight: 38 };
    assert.equal(calculatePlacement({ ...desktop, sidebarRight: 340 }).left, 354);
    assert.equal(calculatePlacement({ ...desktop, sidebarRight: 260 }).left, 274);
    assert.equal(calculatePlacement({ ...desktop, sidebarRight: 52 }).left, 66);
    assert.equal(calculatePlacement({ ...desktop }).left, 14);
});

test('narrow mobile placement ignores drawer width and keeps launcher and panel on screen', () => {
    for (const width of [280, 320, 360, 390, 540, 767]) {
        const placement = calculatePlacement({ width, height: 640, sidebarRight: 340, launcherWidth: 160, launcherHeight: 36 });
        assert.equal(placement.left, 10, `left at ${width}px`);
        assert.ok(placement.left + 160 <= width - 10, `launcher at ${width}px`);
        assert.ok(placement.panelLeft >= 10, `panel left at ${width}px`);
        assert.ok(placement.panelLeft + placement.panelWidth <= width - 10, `panel right at ${width}px`);
        assert.ok(placement.panelBottom + placement.panelHeight <= 640 - 10, `panel top at ${width}px`);
    }
});

test('panel is clamped separately when a sidebar leaves too little horizontal space', () => {
    const placement = calculatePlacement({ width: 900, height: 700, sidebarRight: 580, launcherWidth: 180, launcherHeight: 38 });
    assert.equal(placement.left, 594);
    assert.equal(placement.panelLeft, 494);
    assert.ok(placement.panelLeft + placement.panelWidth <= 886);
});

test('explicit corner settings and visual viewport offsets are respected', () => {
    const viewport = { width: 1000, height: 500, offsetLeft: 20, offsetTop: 40, sidebarRight: 340, launcherWidth: 180, launcherHeight: 38 };
    assert.equal(calculatePlacement({ ...viewport, position: 'left' }).left, 34);
    const right = calculatePlacement({ ...viewport, position: 'right' });
    assert.equal(right.left, 826);
    assert.equal(right.top, 488);
    assert.ok(right.panelLeft + right.panelWidth <= 1006);
    assert.ok(right.panelBottom + right.panelHeight <= viewport.height - 14);
});

test('notched phone safe areas keep launcher and panel clear of cutouts and home indicator', () => {
    const landscape = calculatePlacement({ width: 844, height: 390, launcherWidth: 180, launcherHeight: 38,
        position: 'right', safeLeft: 47, safeRight: 47, safeBottom: 21 });
    assert.ok(landscape.left >= 47);
    assert.ok(landscape.left + 180 <= 844 - 47);
    assert.ok(landscape.top + 38 <= 390 - 21);
    assert.ok(landscape.panelLeft >= 47);
    assert.ok(landscape.panelLeft + landscape.panelWidth <= 844 - 47);
    assert.ok(390 - landscape.panelBottom - landscape.panelHeight >= 14);
    const portrait = calculatePlacement({ width: 390, height: 844, launcherWidth: 160, launcherHeight: 36, safeBottom: 34 });
    assert.equal(portrait.top + 36, 844 - 34);
    assert.equal(portrait.panelBottom, 34 + 36 + 9);
});
