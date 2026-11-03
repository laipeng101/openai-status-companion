// Site adapters contain only structural selectors; no conversation text is read.
export const ADAPTERS = {
  chatgpt: ['#app-shell-sidebar', '[data-app-navigation-rail="true"]', '#stage-slideover-sidebar', '#stage-sidebar-tiny-bar', '[data-testid="sidebar"]'],
  leopard: ['#stage-slideover-sidebar', '#stage-slidover-sidebar', '#stage-sidebar-tiny-bar',
    '[data-testid="stage-slideover-sidebar"]', '[data-testid="stage-slidover-sidebar"]',
    '[data-testid="stage-sidebar-tiny-bar"]', '[data-testid="sidebar"]'],
};
export function adapterFor(hostname) {
  return hostname === 'chatgpt.com' ? 'chatgpt' : 'leopard';
}
export function chooseSidebar(rects, width, height) {
  return rects.filter(r => r.visible && r.width > 0 && r.height > Math.min(160, height * .25)
    && r.right > 0 && r.left <= width * .15 && r.right <= width * .65)
    .sort((a, b) => b.right - a.right)[0] || null;
}
export function calculatePlacement({width, height, offsetLeft=0, offsetTop=0, sidebarRight=0,
  launcherWidth=180, launcherHeight=38, position='auto', safeLeft=0, safeRight=0, safeTop=0, safeBottom=0}) {
  const gap = width < 768 ? 10 : 14;
  const leftGap=Math.max(gap,safeLeft), rightGap=Math.max(gap,safeRight);
  const topGap=Math.max(gap,safeTop), bottomGap=Math.max(gap,safeBottom);
  const panelWidth = Math.max(0, Math.min(392, width - leftGap - rightGap));
  const desired = position === 'right' ? width - rightGap - launcherWidth
    : position === 'left' || width < 768 ? leftGap : Math.max(leftGap, sidebarRight + gap);
  const left = Math.max(leftGap, Math.min(desired, width - rightGap - launcherWidth));
  const panelLeft = Math.max(leftGap, Math.min(left, width - rightGap - panelWidth));
  return {left:offsetLeft + left, top:offsetTop + Math.max(topGap, height - bottomGap - launcherHeight),
    panelLeft:offsetLeft + panelLeft, panelTop:offsetTop + topGap, panelWidth,
    panelBottom:bottomGap + launcherHeight + 9, panelHeight:Math.max(40, Math.min(680, height - topGap - bottomGap - launcherHeight - 9))};
}
