import {visibleSidebarRect} from './sidebar.js';

// Structural selectors only: never read messages, field values or menu labels.
const OVERLAYS = '[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],'
  + '[role="tooltip"],[aria-modal="true"],dialog[open],[popover],'
  + '[data-radix-popper-content-wrapper],[data-radix-portal],[data-headlessui-portal]';
const CONTENT = 'button,a[href],input:not([type="hidden"]),textarea,select,summary,'
  + '[contenteditable]:not([contenteditable="false"]),[role="button"],[role="textbox"],'
  + '[role="combobox"],[role="slider"],[role="switch"],[role="checkbox"],[role="tab"],'
  + 'form,header,footer,[role="toolbar"],[role="navigation"],[role="alert"],[role="status"],'
  + 'article,p,h1,h2,h3,h4,h5,h6,pre,blockquote,table,img,video,canvas,iframe,'
  + '[data-message-author-role],[data-testid^="conversation-turn-"]';
const SELECTOR_ATTRIBUTES = new Set(['role','aria-modal','open','popover','href','type','contenteditable','data-testid',
  'id','data-app-navigation-rail','data-message-author-role','data-radix-popper-content-wrapper','data-radix-portal','data-headlessui-portal']);
const ATTRIBUTES = ['class','style','hidden','inert','aria-hidden','aria-expanded','data-state',...SELECTOR_ATTRIBUTES];
const MAX_ANIMATION_TIME = 5_000;

export function createObstructionTracker(document, host, sidebarSelectors, onChange) {
  const view = document.defaultView;
  const selector = `${OVERLAYS},${CONTENT},${sidebarSelectors}`;
  let candidates = [], dirty = true;
  const animations = new Map();
  const resizeObserver = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(() => onChange(true)) : null;
  const owned = node => node === host || host.contains(node);
  const relevant = node => node?.nodeType === 1 && !owned(node)
    && (node.matches(selector) || node.querySelector(selector));

  const observer = new view.MutationObserver(records => {
    let changed = false;
    for (const record of records) {
      if (owned(record.target)) continue;
      if (record.type === 'childList') {
        if ([...record.addedNodes,...record.removedNodes].some(relevant)) { dirty = true; changed = true; }
      } else if (relevant(record.target) || candidates.some(node => record.target.contains(node))) {
        dirty ||= SELECTOR_ATTRIBUTES.has(record.attributeName);
        changed = true;
      }
    }
    if (changed) onChange(true);
  });
  observer.observe(document.documentElement, {subtree:true,childList:true,attributes:true,attributeFilter:ATTRIBUTES});

  function discover() {
    if (!dirty) return;
    dirty = false;
    candidates = [...document.querySelectorAll(selector)].filter(node => !owned(node));
    resizeObserver?.disconnect();
    // Observe complete protected surfaces, not every child of a menu or sidebar.
    for (const node of candidates) {
      if (node.matches(OVERLAYS) || !node.parentElement?.closest(selector)) resizeObserver?.observe(node);
    }
  }
  function read(viewport) {
    discover();
    const now = view.performance.now();
    for (const [node,running] of animations) {
      for (const [key,started] of running) if (now-started >= MAX_ANIMATION_TIME) running.delete(key);
      if (!running.size || !node.isConnected) animations.delete(node);
    }
    if (animations.size) onChange(true);
    const regions = [];
    const visible = new Map();
    for (const node of candidates) {
      const rect = visibleSidebarRect(node,viewport,!node.matches(OVERLAYS));
      if (!rect) continue;
      if (node.getAttribute('aria-modal') === 'true' || node.matches('dialog[open]')) return {regions:[], modal:true};
      visible.set(node,rect);
      let ancestor = node.parentElement;
      while (ancestor) {
        const container = visible.get(ancestor);
        if (container && container.left <= rect.left && container.right >= rect.right
          && container.top <= rect.top && container.bottom >= rect.bottom) break;
        ancestor = ancestor.parentElement;
      }
      if (!ancestor) regions.push(rect);
    }
    return {regions, modal:false};
  }
  function interaction(event) {
    if (!event.composedPath().includes(host)) onChange(true);
  }
  for (const name of ['pointerdown','pointerover','focusin','keydown','scroll','toggle','beforetoggle']) {
    document.addEventListener(name,interaction,{capture:true,passive:true});
  }
  function animation(event) {
    if (!relevant(event.target)) return;
    const key = `${event.type.startsWith('transition') ? 'transition' : 'animation'}:${event.propertyName || event.animationName}:${event.pseudoElement || ''}`;
    let running = animations.get(event.target);
    if (event.type === 'transitionrun' || event.type === 'animationstart') {
      if (!running) { running = new Map(); animations.set(event.target,running); }
      running.set(key,view.performance.now());
    } else {
      running?.delete(key);
      if (!running?.size) animations.delete(event.target);
    }
    onChange(true);
  }
  for (const name of ['transitionrun','transitionend','transitioncancel','animationstart','animationend','animationcancel']) {
    document.addEventListener(name,animation,{capture:true,passive:true});
  }
  return {read, invalidate() { dirty = true; onChange(true); }, pause() { animations.clear(); }};
}
