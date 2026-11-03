// Observe the sidebar shell only; conversation content is never inspected.
const SETTLE_TIME = 200;
const MAX_ANIMATION_TIME = 5_000;
const ATTRIBUTES = ['class', 'style', 'hidden', 'inert', 'aria-hidden', 'aria-expanded', 'data-state',
  'data-app-shell-sidebar-open', 'data-slate-sidebar-peeking'];

export function visibleSidebarRect(element, viewport) {
  const view = element.ownerDocument.defaultView;
  const bounds = element.getBoundingClientRect();
  let left = Math.max(bounds.left, viewport.left), right = Math.min(bounds.right, viewport.right);
  let top = Math.max(bounds.top, viewport.top), bottom = Math.min(bounds.bottom, viewport.bottom);
  for (let node = element; node; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    if (node.hidden || style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility)
      || style.contentVisibility === 'hidden' || Number.parseFloat(style.opacity) === 0) return null;
    if (node === element) continue;
    const paintClip = /\b(paint|strict|content)\b/.test(style.contain);
    const clipX = paintClip || ['hidden', 'clip', 'auto', 'scroll', 'overlay'].includes(style.overflowX || style.overflow);
    const clipY = paintClip || ['hidden', 'clip', 'auto', 'scroll', 'overlay'].includes(style.overflowY || style.overflow);
    if (!clipX && !clipY) continue;
    const rect = node.getBoundingClientRect();
    if (clipX) { left = Math.max(left, rect.left); right = Math.min(right, rect.right); }
    if (clipY) { top = Math.max(top, rect.top); bottom = Math.min(bottom, rect.bottom); }
  }
  if (right <= left || bottom <= top) return null;
  return {left, right, top, bottom, width:right-left, height:bottom-top, visible:true};
}

export function createSidebarTracker(document, selectors, onLayout) {
  const view = document.defaultView;
  let sidebars = [], shell = new Set(), frame = 0, settleUntil = 0, paused = false;
  const animations = new Map();
  const observer = new view.MutationObserver(() => { discover(); schedule(true); });
  const resizeObserver = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(() => schedule()) : null;
  const events = ['transitionrun', 'transitionend', 'transitioncancel', 'animationstart', 'animationend', 'animationcancel'];

  function schedule(settle = false) {
    if (paused || document.hidden) return;
    if (settle) settleUntil = view.performance.now() + SETTLE_TIME;
    if (!frame) frame = view.requestAnimationFrame(tick);
  }
  function tick(now) {
    frame = 0;
    if (paused || document.hidden) return;
    for (const [node, running] of animations) {
      for (const [key, started] of running) if (now-started >= MAX_ANIMATION_TIME) running.delete(key);
      if (!running.size) animations.delete(node);
    }
    onLayout();
    if (animations.size || now < settleUntil) schedule();
  }
  function animation(event) {
    if (event.target !== event.currentTarget) return;
    const key = `${event.type.startsWith('transition') ? 'transition' : 'animation'}:${event.propertyName || event.animationName}:${event.pseudoElement || ''}`;
    if (event.type === 'transitionrun' || event.type === 'animationstart') {
      if (!animations.has(event.target)) animations.set(event.target, new Map());
      animations.get(event.target).set(key, view.performance.now());
    } else {
      animations.get(event.target)?.delete(key);
      if (!animations.get(event.target)?.size) animations.delete(event.target);
    }
    schedule(true);
  }
  function discover() {
    const next = [...document.querySelectorAll(selectors)];
    const nodes = new Set();
    for (const sidebar of next) for (let node = sidebar; node; node = node.parentElement) nodes.add(node);
    if (next.length === sidebars.length && next.every((node, index) => node === sidebars[index])
      && nodes.size === shell.size && [...nodes].every(node => shell.has(node))) return sidebars;
    observer.disconnect(); resizeObserver?.disconnect();
    for (const node of shell) for (const name of events) node.removeEventListener(name, animation);
    sidebars = next; shell = nodes; animations.clear();
    for (const node of shell) {
      // Direct shell children detect replacement without watching streamed messages.
      observer.observe(node, {attributes:true, attributeFilter:ATTRIBUTES, childList:true});
      if (node !== document.body && node !== document.documentElement) resizeObserver?.observe(node);
      for (const name of events) node.addEventListener(name, animation, {passive:true});
    }
    return sidebars;
  }
  function pause() {
    paused = true;
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0; settleUntil = 0; animations.clear();
  }
  function resume() { paused = false; discover(); schedule(true); }
  discover();
  return {discover, schedule, pause, resume};
}
