import {STATUS_URL, parseOfficialPage, normalizeOfficialSummary, normalizeCompatibility,
  getOverall, getComponentStatus, findLatestUpdate, validateResponse, safeStatusUrl} from './status-core.js';
import {LOCALES, resolveLocale, translate, translateComponent, translateGroup} from './locales.js';
import {ADAPTERS, adapterFor, chooseSidebar, calculatePlacement} from './layout.js';
import {createSidebarTracker, visibleSidebarRect} from './sidebar.js';
import {request} from './transport.js';
import {styles} from './styles.js';

const HOST_ID = 'openai-status-companion';
const SETTINGS_KEY = 'openai-status-companion:preferences';
const NOTICE_KEY = 'openai-status-companion:last-notice';
const REFRESH_INTERVAL = 60_000;
const MIN_REQUEST_GAP = 15_000;
const FOCUS_REFRESH_AGE = 45_000;
const DISCOVERY_INTERVAL = 2_000;
if (!document.getElementById(HOST_ID)) start();

function start() {
  const settings = readSettings();
  let locale = resolveLocale(settings.language, document.documentElement.lang, navigator.languages);
  const t = (key, params) => translate(locale, key, params);
  let data = null, error = null, fetchedAt = 0, lastRequestAt = 0;
  let loading = false, expanded = false, settingsOpen = false;
  let pollTimer = 0, layoutTimer = 0, toastTimer = 0;
  let fingerprint = '';
  let menuLocale = '', menuIds = [];
  try { fingerprint = sessionStorage.getItem(NOTICE_KEY) || ''; } catch { /* Optional deduplication. */ }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.dataset.adapter = adapterFor(location.hostname);
  document.documentElement.append(host);
  const shadow = host.attachShadow({mode:'open'});
  const style = document.createElement('style');
  style.textContent = styles;
  const launcher = el('button', 'launcher loading');
  launcher.type = 'button';
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'osc-panel');
  const launcherDot = el('span', 'dot');
  launcherDot.setAttribute('aria-hidden', 'true');
  const launcherText = el('span');
  launcher.append(launcherDot, launcherText);
  const panel = el('section', 'panel');
  panel.id = 'osc-panel';
  panel.hidden = true;
  panel.tabIndex = -1;
  const header = el('header', 'header');
  const heading = el('div');
  const title = el('h2', 'title');
  const source = el('div', 'subtitle');
  heading.append(title, source);
  const actions = el('div', 'actions');
  const settingsButton = iconButton('⚙');
  settingsButton.setAttribute('aria-expanded', 'false');
  settingsButton.setAttribute('aria-controls', 'osc-settings');
  const refreshButton = iconButton('↻');
  const closeButton = iconButton('×');
  actions.append(settingsButton, refreshButton, closeButton);
  header.append(heading, actions);
  const preferences = el('div', 'settings');
  preferences.id = 'osc-settings';
  preferences.hidden = true;
  const controls = {};
  for (const name of ['language', 'theme', 'position']) {
    const label = el('label', 'setting');
    const text = el('span');
    const select = document.createElement('select');
    select.name = name;
    label.append(text, select);
    preferences.append(label);
    controls[name] = {select, text};
    select.addEventListener('change', () => {
      settings[name] = select.value;
      saveSettings(settings);
      updateChrome();
      renderContent();
      schedulePlacement();
    });
  }
  const optionKeys = {
    language:[['auto','auto'], ...Object.entries(LOCALES).map(([id,l]) => [id,l.label])],
    theme:[['auto','themeAuto'],['light','light'],['dark','dark']],
    position:[['auto','positionAuto'],['left','positionLeft'],['right','positionRight']],
  };
  for (const [name, options] of Object.entries(optionKeys)) for (const [value, key] of options) {
    const option = document.createElement('option');
    option.value = value;
    option.dataset.message = key;
    controls[name].select.append(option);
  }
  const content = el('div', 'content');
  // Announce only a changed overall status, not all component rows every minute.
  launcherText.setAttribute('aria-live', 'polite');
  panel.append(header, preferences, content);
  shadow.append(style, launcher, panel);

  launcher.addEventListener('click', () => setExpanded(!expanded));
  closeButton.addEventListener('click', () => { setExpanded(false); launcher.focus(); });
  refreshButton.addEventListener('click', () => refresh(true));
  settingsButton.addEventListener('click', () => {
    settingsOpen = !settingsOpen;
    preferences.hidden = !settingsOpen;
    settingsButton.setAttribute('aria-expanded', String(settingsOpen));
  });
  shadow.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded) { event.stopPropagation(); setExpanded(false); launcher.focus(); }
  });
  document.addEventListener('pointerdown', event => {
    if (expanded && !event.composedPath().includes(host)) setExpanded(false);
  }, {passive:true});

  function iconButton(symbol) {
    const button = el('button', 'icon', symbol);
    button.type = 'button';
    return button;
  }
  function errorText() {
    return t(error?.code && LOCALES.en.messages[error.code] ? error.code : 'unknownError', {status:error?.status});
  }
  function setExpanded(next) {
    expanded = Boolean(next);
    panel.hidden = !expanded;
    launcher.setAttribute('aria-expanded', String(expanded));
    shadow.querySelector('.toast')?.remove();
    if (expanded) { renderContent(); panel.focus({preventScroll:true}); }
    schedulePlacement();
  }
  function updateChrome() {
    locale = resolveLocale(settings.language, document.documentElement.lang, navigator.languages);
    host.lang = LOCALES[locale].lang;
    host.dir = LOCALES[locale].dir || 'ltr';
    host.dataset.theme = siteTheme(settings.theme);
    title.textContent = t('title');
    panel.setAttribute('aria-label', t('details'));
    source.textContent = t(data?.source_mode === 'compatibility-json' ? 'sourceCompat' : 'sourceLive');
    for (const [button,key] of [[settingsButton,'settings'],[refreshButton,'refresh'],[closeButton,'close']]) {
      button.title = t(key); button.setAttribute('aria-label', t(key));
    }
    for (const [name, {select,text}] of Object.entries(controls)) {
      text.textContent = t(name);
      for (const option of select.options) {
        option.textContent = name === 'language' && option.value !== 'auto'
          ? LOCALES[option.value].label : t(option.dataset.message);
      }
      select.value = settings[name];
    }
    const overall = getOverall(data?.status.indicator || 'unknown');
    const label = data ? t(overall.shortKey) : loading ? t('loading') : t('unknown');
    const launcherLabel = error && data ? `${label} · ${t('cached')}` : label;
    if (launcherText.textContent !== launcherLabel) launcherText.textContent = launcherLabel;
    launcher.dataset.tone = data ? overall.tone : 'muted';
    launcher.classList.toggle('stale', Boolean(error && data));
    launcher.classList.toggle('loading', loading);
    launcher.title = error ? (data ? t('staleHint',{error:errorText()}) : t('unknownHint'))
      : t('launcherHint', {status:data ? t(overall.key) : t('loading')});
    refreshButton.disabled = loading;
    content.setAttribute('aria-busy', String(loading));
    updateMenus();
  }
  function date(value) {
    const result = new Date(value);
    return Number.isNaN(result.getTime()) ? t('unknownTime') : new Intl.DateTimeFormat(LOCALES[locale].lang,
      {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(result);
  }
  function renderContent() {
    const wasOpen = content.querySelector('details')?.open || false;
    const focusKey = shadow.activeElement?.dataset.focusKey;
    const previousScroll = panel.scrollTop;
    const fragment = document.createDocumentFragment();
    if (!data) {
      fragment.append(el('div', error ? 'error' : 'empty', error ? t('fetchFailed',{error:errorText()}) : t('loading')));
    } else {
      const overall = getOverall(data.status.indicator);
      const abnormal = data.components.filter(item => item.status !== 'operational')
        .sort((a,b) => getComponentStatus(b.status).level-getComponentStatus(a.status).level);
      const normal = data.components.length - abnormal.length;
      const box = el('div', 'overall');
      box.dataset.tone = overall.tone;
      const dot = el('span','dot'); dot.setAttribute('aria-hidden','true');
      const main = el('div','overall-main');
      main.append(el('div','overall-text',t(overall.key)),
        el('div','meta',t('normalCount',{normal,total:data.components.length})),
        el('div','meta',t(error ? 'lastSuccess' : 'fetchedAt',{time:date(fetchedAt)})));
      box.append(dot,main); fragment.append(box);

      const section = el('section','section');
      section.append(sectionTitle(t('components'),data.availability.components !== 'verified' ? t('partlyVerified')
        : abnormal.length ? t('abnormalCount',{count:abnormal.length}) : t('allNormal')));
      if (abnormal.length) { const list = el('div','list'); abnormal.forEach(item => list.append(component(item))); section.append(list); }
      const details = document.createElement('details'); details.open = wasOpen;
      const summary = el('summary','',t('allComponents',{count:data.components.length}));
      summary.dataset.focusKey = 'component-summary';
      details.append(summary);
      const groups = el('div','groups');
      const byId = new Map(data.components.map(item => [item.id,item]));
      for (const group of data.component_groups) {
        groups.append(el('div','group-name',`${translateGroup(locale,group.name)} · ${group.component_ids.length}`));
        const list = el('div','list');
        group.component_ids.forEach(id => { if (byId.has(id)) list.append(component(byId.get(id))); });
        groups.append(list);
      }
      details.append(groups); section.append(details); fragment.append(section);

      const incidents = data.incidents.filter(item => !['resolved','postmortem','completed'].includes(item.status));
      const maintenances = data.scheduled_maintenances.filter(item => !['completed','cancelled','canceled'].includes(item.status))
        .sort((a,b) => (Date.parse(a.scheduled_for)||0)-(Date.parse(b.scheduled_for)||0));
      const activity = el('section','section');
      const verified = data.availability.incidents === 'verified' && data.availability.maintenances === 'verified';
      activity.append(sectionTitle(t('activity'), t(verified ? 'verified' : 'partlyVerified')));
      const overview = el('div','activity');
      for (const [key,items] of [['incidents',incidents],['maintenances',maintenances]]) {
        const row = el('div','activity-row');
        row.append(el('span','',t(key)), el('span','activity-value',
          data.availability[key] === 'verified' ? items.length ? t('itemCount',{count:items.length}) : t('noItems') : t('unverified')));
        overview.append(row);
      }
      activity.append(overview);
      for (const incident of incidents) activity.append(activityCard(incident,false));
      for (const maintenance of maintenances) activity.append(activityCard(maintenance,true));
      fragment.append(activity);
      if (data.source_mode === 'compatibility-json') fragment.append(el('div','note',t('compatWarning')));
      if (error) fragment.append(el('div','note',t('staleWarning',{error:errorText(),time:date(fetchedAt)})));
      fragment.append(el('div','scope',t('scopeNote')));
    }
    const footer = el('div','footer');
    const officialLink = el('a','',t('officialPage'));
    officialLink.href = STATUS_URL; officialLink.target = '_blank'; officialLink.rel = 'noopener noreferrer';
    officialLink.dataset.focusKey = 'official-link';
    footer.append(el('span','',t('autoRefresh',{seconds:REFRESH_INTERVAL/1000})),officialLink); fragment.append(footer);
    content.replaceChildren(fragment);
    if (focusKey) [...content.querySelectorAll('[data-focus-key]')].find(item => item.dataset.focusKey === focusKey)?.focus({preventScroll:true});
    panel.scrollTop = previousScroll;
  }
  function component(item) {
    const row = el('div','component');
    const status = getComponentStatus(item.status);
    row.append(el('span','component-name',translateComponent(locale,item.name)),el('span',`badge ${status.tone}`,t(status.key)));
    return row;
  }
  function sectionTitle(left,right) {
    const row = el('div','section-title'); row.append(el('span','',left),el('span','',right)); return row;
  }
  function activityCard(item, maintenance) {
    const box = el('article',`incident ${maintenance ? 'maintenance' : ['major','critical'].includes(item.impact) ? item.impact : ''}`);
    const name = el('div','incident-name');
    name.dir = 'auto';
    const url = safeStatusUrl(item.url);
    if (url) { const link = el('a','',item.name || t(maintenance ? 'unnamedMaintenance' : 'unnamedIncident'));
      link.href=url; link.target='_blank'; link.rel='noopener noreferrer'; link.dataset.focusKey=`incident-${item.id}`; name.append(link); }
    else name.textContent = item.name || t(maintenance ? 'unnamedMaintenance' : 'unnamedIncident');
    const statusKey = `${maintenance ? 'maintenance' : 'incident'}_${item.status}`;
    const status = LOCALES.en.messages[statusKey] ? t(statusKey) : item.status || t('component_unknown');
    const impactKey = `impact_${item.impact}`;
    const impact = LOCALES.en.messages[impactKey] ? t(impactKey) : t('impact_unknown');
    box.append(name,el('div','meta',t(maintenance ? 'maintenanceStage' : 'statusAndImpact',{status,impact})));
    if (maintenance) {
      const schedule = [];
      if (item.scheduled_for) schedule.push(t('scheduleStart',{time:date(item.scheduled_for)}));
      if (item.scheduled_until) schedule.push(t('scheduleEnd',{time:date(item.scheduled_until)}));
      box.append(el('div','update',schedule.join('\n') || t('scheduleUnknown')));
    }
    const latest = findLatestUpdate(item.incident_updates);
    if (latest) {
      const update = el('div','update');
      const original = el('div','official-body',latest.body || t('noDetails'));
      original.dir = 'auto';
      update.append(el('div','',t('originalUpdate')),original,
        el('div','',date(latest.display_at || latest.updated_at || latest.created_at)));
      box.append(update);
    }
    return box;
  }

  async function refresh(force = false) {
    if (loading || (!force && Date.now()-lastRequestAt < MIN_REQUEST_GAP)) return;
    loading=true; lastRequestAt=Date.now(); updateChrome();
    try {
      let next;
      try { next=normalizeOfficialSummary(parseOfficialPage(await request(STATUS_URL))); }
      catch (pageError) {
        const [summary,components] = await Promise.allSettled([
          request(`${STATUS_URL}api/v2/summary.json`,'json'),request(`${STATUS_URL}api/v2/components.json`,'json')]);
        if (summary.status !== 'fulfilled') throw summary.reason || pageError;
        next=normalizeCompatibility(summary.value, components.status === 'fulfilled' ? components.value : null);
      }
      validateResponse(next); data=next; error=null; fetchedAt=Date.now(); maybeNotify();
    } catch (cause) { error=cause; }
    finally { loading=false; updateChrome(); if (expanded) renderContent(); schedulePlacement(); schedulePoll(); }
  }
  function maybeNotify() {
    const incidentPart = data.incidents.map(item=>`${item.id}:${item.status}:${item.updated_at}`).sort();
    const maintenancePart = data.scheduled_maintenances.map(item=>`${item.id}:${item.status}:${item.updated_at}:${item.scheduled_for}`).sort();
    const next = JSON.stringify([data.status.indicator,incidentPart,maintenancePart]);
    if (fingerprint === next || data.source_mode !== 'official-page') return;
    const previous=fingerprint; fingerprint=next;
    try { sessionStorage.setItem(NOTICE_KEY,next); } catch { /* Display does not depend on storage. */ }
    const overall=getOverall(data.status.indicator);
    if (expanded || (!previous && overall.level===0)) return;
    showToast(`${t(previous ? 'noticeUpdated' : 'noticeInitial')}: ${t(overall.key)}`,overall.tone);
  }
  function showToast(message,tone) {
    clearTimeout(toastTimer); shadow.querySelector('.toast')?.remove();
    const toast=el('div',`toast ${tone}`,message); toast.setAttribute('role','status');
    toast.addEventListener('click',()=>setExpanded(true)); shadow.append(toast);
    toastTimer=setTimeout(()=>toast.remove(),8_000);
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (!document.hidden) pollTimer=setTimeout(()=>refresh(),REFRESH_INTERVAL);
  }

  const selectors=ADAPTERS[host.dataset.adapter].join(',');
  const sidebarTracker=createSidebarTracker(document,selectors,place);
  function schedulePlacement() {
    sidebarTracker.schedule();
  }
  function place() {
    if (!host.isConnected) document.documentElement.append(host);
    host.hidden=Boolean(document.fullscreenElement);
    const viewport=window.visualViewport;
    const width=viewport?.width || innerWidth, height=viewport?.height || innerHeight;
    const offsetLeft=viewport?.offsetLeft || 0, offsetTop=viewport?.offsetTop || 0;
    const clip={left:offsetLeft,right:offsetLeft+width,top:offsetTop,bottom:offsetTop+height};
    const rects=sidebarTracker.discover().map(item=>visibleSidebarRect(item,clip)).filter(Boolean)
      .map(rect=>({...rect,left:rect.left-offsetLeft,right:rect.right-offsetLeft}));
    const sidebar=chooseSidebar(rects,width,height);
    const launcherRect=launcher.getBoundingClientRect();
    const hostStyle=getComputedStyle(host);
    const safeInset=edge=>Number.parseFloat(hostStyle.getPropertyValue(`--safe-${edge}`)) || 0;
    const placement=calculatePlacement({width,height,offsetLeft,offsetTop,sidebarRight:sidebar?.right || 0,
      launcherWidth:launcherRect.width,launcherHeight:launcherRect.height,position:settings.position,
      safeLeft:safeInset('left'),safeRight:safeInset('right'),safeTop:safeInset('top'),safeBottom:safeInset('bottom')});
    host.style.left=`${placement.left}px`; host.style.top=`${placement.top}px`; host.style.bottom='auto';
    host.style.setProperty('--panel-left',`${placement.panelLeft}px`);
    host.style.setProperty('--panel-width',`${placement.panelWidth}px`);
    host.style.setProperty('--panel-height',`${placement.panelHeight}px`);
    // Fixed positioning uses layout viewport bottom; translate the visual viewport edge for the on-screen keyboard.
    host.style.setProperty('--panel-bottom',`${Math.max(0,innerHeight-offsetTop-height)+placement.panelBottom}px`);
  }
  function layoutWatch() {
    clearTimeout(layoutTimer);
    if (document.hidden) return;
    place(); layoutTimer=setTimeout(layoutWatch,DISCOVERY_INTERVAL);
  }
  const themeObserver=new MutationObserver(()=>{
    const previousLocale=locale; updateChrome();
    if (expanded && previousLocale!==locale) renderContent();
    schedulePlacement();
  });
  const attributes={attributes:true,attributeFilter:['class','style','data-theme','lang']};
  themeObserver.observe(document.documentElement,attributes);
  if (document.body) themeObserver.observe(document.body,attributes);
  const mountObserver=new MutationObserver(()=>{if (!host.isConnected) schedulePlacement();});
  mountObserver.observe(document.documentElement,{childList:true});
  const colorScheme=matchMedia('(prefers-color-scheme: dark)');
  colorScheme.addEventListener('change',()=>{updateChrome();schedulePlacement();});
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) {clearTimeout(pollTimer);clearTimeout(layoutTimer);sidebarTracker.pause();return;}
    if (Date.now()-lastRequestAt>=FOCUS_REFRESH_AGE) refresh(); else schedulePoll();
    sidebarTracker.resume();
    layoutWatch();
  });
  const focusRefresh=()=>{if (!document.hidden && Date.now()-lastRequestAt>=FOCUS_REFRESH_AGE) refresh();};
  window.addEventListener('focus',focusRefresh,{passive:true});
  window.addEventListener('online',focusRefresh,{passive:true});
  window.addEventListener('resize',schedulePlacement,{passive:true});
  window.visualViewport?.addEventListener('resize',schedulePlacement,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedulePlacement,{passive:true});
  window.addEventListener('pageshow',()=>{sidebarTracker.resume();schedulePoll();layoutWatch();});
  window.addEventListener('pagehide',()=>{clearTimeout(pollTimer);clearTimeout(layoutTimer);sidebarTracker.pause();});
  function updateMenus() {
    if (typeof GM_registerMenuCommand!=='function' || menuLocale===locale) return;
    if (menuIds.length && typeof GM_unregisterMenuCommand!=='function') return;
    for (const id of menuIds) GM_unregisterMenuCommand(id);
    menuIds=[
      GM_registerMenuCommand(t('refresh'),()=>refresh(true)),
      GM_registerMenuCommand(t('menuToggle'),()=>setExpanded(!expanded)),
      GM_registerMenuCommand(t('menuSettings'),()=>{setExpanded(true);settingsOpen=true;preferences.hidden=false;
        settingsButton.setAttribute('aria-expanded','true');controls.language.select.focus();}),
    ].filter(id=>id!=null);
    menuLocale=locale;
  }
  updateChrome(); renderContent(); place(); layoutWatch(); refresh();
}

function el(tag,className='',text) {
  const node=document.createElement(tag); node.className=className;
  if (text!==undefined) node.textContent=String(text); return node;
}
function readSettings() {
  let saved={};
  try { saved=typeof GM_getValue==='function' ? GM_getValue(SETTINGS_KEY,{}) : JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'); }
  catch { /* Preferences are optional. */ }
  if (!saved || typeof saved!=='object') saved={};
  return {language:saved.language==='auto' || Object.hasOwn(LOCALES,saved.language) ? saved.language : 'auto',
    theme:['auto','light','dark'].includes(saved.theme) ? saved.theme : 'auto',
    position:['auto','left','right'].includes(saved.position) ? saved.position : 'auto'};
}
function saveSettings(settings) {
  try { if (typeof GM_setValue==='function') GM_setValue(SETTINGS_KEY,settings);
    else localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)); } catch { /* Widget remains usable. */ }
}
function siteTheme(preference) {
  if (preference!=='auto') return preference;
  for (const node of [document.documentElement,document.body].filter(Boolean)) {
    const theme=node.getAttribute('data-theme');
    if (theme==='dark' || node.classList.contains('dark')) return 'dark';
    if (theme==='light' || node.classList.contains('light')) return 'light';
  }
  const scheme=getComputedStyle(document.documentElement).colorScheme.trim();
  if (scheme==='dark' || scheme==='light') return scheme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
