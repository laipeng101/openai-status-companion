// Site adapters contain only structural selectors; no conversation text is read.
export const ADAPTERS = {
  chatgpt: ['#app-shell-sidebar', '[data-app-navigation-rail="true"]', '#stage-slideover-sidebar', '#stage-sidebar-tiny-bar', '[data-testid="sidebar"]'],
  leopard: ['#stage-slideover-sidebar', '#stage-slidover-sidebar', '#stage-sidebar-tiny-bar',
    '[data-testid="stage-slideover-sidebar"]', '[data-testid="stage-slidover-sidebar"]',
    '[data-testid="stage-sidebar-tiny-bar"]', '[data-testid="sidebar"]'],
};
export const CLEARANCE = 10;

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
    panelBottom:bottomGap + launcherHeight + CLEARANCE,
    panelHeight:Math.max(40, Math.min(680, height - topGap - bottomGap - launcherHeight - CLEARANCE))};
}

const MAX_CANDIDATES = 96;
export function findClearPosition(preferred, bounds, obstacles, {
  minWidth = preferred.width, minHeight = preferred.height,
} = {}) {
  const preferredBottom = preferred.top+preferred.height;
  const queue = [], seen = new Set();
  function add(region) {
    const width = Math.min(preferred.width, region.right-region.left);
    const height = Math.min(preferred.height, region.bottom-region.top);
    if (width <= 0 || height <= 0 || width < minWidth || height < minHeight) return;
    const key = `${region.left}:${region.right}:${region.top}:${region.bottom}`;
    if (seen.has(key)) return;
    seen.add(key);
    const left = Math.max(region.left, Math.min(preferred.left, region.right-width));
    const top = Math.max(region.top, Math.min(preferredBottom-height, region.bottom-height));
    const rect = {left, top, right:left+width, bottom:top+height, width, height};
    queue.push({region, rect, area:width*height,
      distance:Math.abs(left-preferred.left)+2*Math.abs(rect.bottom-preferredBottom)});
  }
  add(bounds);
  for (let attempt = 0; queue.length && attempt < MAX_CANDIDATES; attempt += 1) {
    queue.sort((a,b) => b.area-a.area || a.distance-b.distance);
    const {region, rect} = queue.shift();
    const collision = obstacles.find(obstacle => rect.left < obstacle.right+CLEARANCE
      && rect.right > obstacle.left-CLEARANCE && rect.top < obstacle.bottom+CLEARANCE
      && rect.bottom > obstacle.top-CLEARANCE);
    if (!collision) return rect;
    // Any clear rectangle must fit entirely to one side of this obstruction.
    add({...region, right:collision.left-CLEARANCE});
    add({...region, left:collision.right+CLEARANCE});
    add({...region, bottom:collision.top-CLEARANCE});
    add({...region, top:collision.bottom+CLEARANCE});
  }
  if (queue.length && (minWidth < preferred.width || minHeight < preferred.height)) {
    // A dense layout can exhaust the size search while a smaller panel still fits.
    return findClearPosition({left:preferred.left, top:preferredBottom-minHeight,
      width:minWidth, height:minHeight},bounds,obstacles);
  }
  return null;
}
