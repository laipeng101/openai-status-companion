import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {LOCALES} from '../src/locales.js';

// This server serves only an explicit allowlist of public development artifacts.
const root = new URL('../', import.meta.url);
const bundlePath = '/dist/openai-status-companion.user.js';
const fixturePath = '/tests/fixtures/openai-official-summary.json';
const fixtureText = await readFile(new URL(`.${fixturePath}`, root), 'utf8');
const fixture = JSON.parse(fixtureText);
const port = Number(process.env.PORT || 8765);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
const jsonForScript = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const choice = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

function previewPage(params) {
  const config = {
    site: choice(params.get('site'), ['chatgpt','leopard'], 'chatgpt'),
    language: choice(params.get('language') || params.get('lang'), Object.keys(LOCALES), 'en'),
    theme: choice(params.get('theme'), ['light','dark'], 'light'),
    scene: choice(params.get('scene'), ['healthy','incident','maintenance','failure','compat'], 'healthy'),
    collapsed: params.get('sidebar') === 'collapsed' || ['1','true'].includes(params.get('collapsed')),
    peek: ['1','true'].includes(params.get('peek')),
    width: Math.max(180, Math.min(420, Number(params.get('width')) || (params.get('site') === 'leopard' ? 260 : 340))),
  };
  const options = (values, selected) => values.map(value => `<option${value===selected ? ' selected' : ''}>${value}</option>`).join('');
  return `<!doctype html>
<html lang="${config.language}" class="${config.theme}" data-theme="${config.theme}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenAI Status Companion — local preview</title>
<style>
  :root {color-scheme:${config.theme}; --bg:#f8f9fa; --surface:#fff; --sidebar:#eef0f2; --text:#20252a; --muted:#69727c; --border:#d4d9df; --sidebar-width:${config.width}px;}
  :root.dark {--bg:#151719; --surface:#242729; --sidebar:#1d2022; --text:#e9ecef; --muted:#aab2bb; --border:#42484f;}
  * {box-sizing:border-box} body {margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,sans-serif;}
  button,select,input {font:inherit} button,select {border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);padding:5px 8px;}
  button {cursor:pointer} button:focus-visible,select:focus-visible {outline:3px solid #4797ee;outline-offset:2px}
  .rail,.sidebar {position:fixed;inset:0 auto 0 0;background:var(--sidebar);border-right:1px solid var(--border);}
  .rail {width:52px;padding:18px 8px;display:grid;align-content:start;gap:20px;z-index:1;text-align:center;}
  .sidebar {width:var(--sidebar-width);padding:18px 16px;transition:width .18s,transform .18s;z-index:2;overflow:hidden;}
  .sidebar-clip {position:fixed;inset:0 auto 0 0;width:var(--sidebar-width);overflow:visible;transition:width .18s;z-index:2;}
  .site-chatgpt .sidebar {position:absolute;inset:0 auto 0 0;}
  .site-chatgpt .sidebar-content {margin-left:36px;}
  .site-chatgpt .rail {z-index:3;}
  .rail-footer {position:absolute;inset:auto 5px 8px;display:grid;gap:8px}
  .rail-footer button {border-radius:50%;height:36px;padding:0}
  .native-popover {position:fixed;z-index:50;left:48px;bottom:6px;width:min(230px,calc(100vw - 54px));}
  .native-popover.usage {bottom:52px;width:min(262px,calc(100vw - 54px));}
  .native-popover [role=menu] {display:grid;gap:4px;padding:9px 12px;border-radius:16px;background:var(--surface);border:1px solid var(--border);box-shadow:0 8px 24px #0005}
  .native-popover button {text-align:start;padding:6px 8px;border:0}
  .native-popover button:hover {background:var(--sidebar)}
  .native-popover p {margin:0;padding:7px 8px;font-size:13px}
  #native-dialog {color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:16px}
  #native-dialog::backdrop {background:#0006}
  .sidebar h2 {margin:0 0 28px;font-size:18px;white-space:nowrap}.sidebar p {color:var(--muted);white-space:nowrap}
  .sidebar nav {display:grid;gap:14px}.sidebar nav span {padding:8px;border-radius:7px;background:var(--surface);white-space:nowrap}
  .site-chatgpt.collapsed .sidebar-clip {width:52px;overflow:hidden;}
  .site-chatgpt.collapsed.peek .sidebar-clip {overflow:visible;}
  .site-leopard.collapsed .sidebar {transform:translateX(-100%)}
  .layout {margin-left:var(--sidebar-width);min-height:100vh;display:flex;flex-direction:column;transition:margin-left .18s;}
  .collapsed .layout {margin-left:52px}.toolbar {padding:12px 18px;border-bottom:1px solid var(--border);background:var(--surface);z-index:3;}
  .toolbar form {display:flex;align-items:center;gap:10px;flex-wrap:wrap}.toolbar label {font-size:12px;color:var(--muted);display:flex;align-items:center;gap:5px}
  .toolbar .note {margin:8px 0 0;color:var(--muted);font-size:12px}.controls {margin-top:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .controls label {display:flex;align-items:center;gap:6px;font-size:12px}.controls output {width:38px;display:inline-block}
  main {flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:30px 22px 150px;text-align:center;}
  main h1 {font-size:26px;font-weight:550} main p {max-width:600px;color:var(--muted)}
  .composer {position:fixed;bottom:28px;left:calc(var(--sidebar-width) + (100vw - var(--sidebar-width)) * .5);transform:translateX(-50%);width:min(700px,calc(100vw - var(--sidebar-width) - 60px));min-height:70px;padding:20px 24px;text-align:left;border:1px solid var(--border);border-radius:26px;background:var(--surface);color:var(--muted);}
  .collapsed .composer {left:calc(52px + (100vw - 52px)*.5);width:min(700px,calc(100vw - 112px))}
  @media(max-width:767px) {.layout {margin-left:52px}.site-leopard .sidebar {max-width:calc(100vw - 55px)}.toolbar {padding:10px}.toolbar form {gap:7px}.toolbar select {max-width:110px}.toolbar .note {font-size:11px}main {padding:20px 18px 130px}main h1 {font-size:20px}.composer,.collapsed .composer {left:calc(52px + (100vw - 52px)*.5);width:calc(100vw - 84px);bottom:70px;font-size:12px;padding:17px;min-height:60px}}
</style></head>
<body class="site-${config.site}${config.collapsed?' collapsed':''}${config.peek?' peek':''}">
<div class="rail" ${config.site==='leopard'?'id="stage-sidebar-tiny-bar"':'data-app-navigation-rail="true"'} aria-label="Collapsed navigation"><span>◉</span><span>＋</span><span>⌕</span><div class="rail-footer"><button id="usage-menu" aria-label="Open usage menu" aria-haspopup="menu" aria-expanded="false">◉</button><button id="account-menu" aria-label="Open account menu" aria-haspopup="menu" aria-expanded="false">A</button></div></div>
${config.site==='chatgpt'?'<div class="sidebar-clip" id="preview-sidebar-clip">':''}
<aside class="sidebar" id="${config.site==='chatgpt'?'app-shell-sidebar':'stage-slideover-sidebar'}" data-testid="sidebar">
  <div class="sidebar-content"><h2>${config.site==='chatgpt'?'ChatGPT layout fixture':'Leopard-X layout fixture'}</h2><nav><span>＋ New chat</span><span>Projects</span><span>Example conversation</span><span>Another example</span></nav><p>Public synthetic layout only</p></div>
</aside>
${config.site==='chatgpt'?'</div>':''}
<div class="layout"><header class="toolbar">
  <form id="preview-form" method="get">
    <label>Site <select name="site" aria-label="Preview site">${options(['chatgpt','leopard'],config.site)}</select></label>
    <label>Language <select name="language" aria-label="Preview language">${options(Object.keys(LOCALES),config.language)}</select></label>
    <label>Theme <select name="theme" aria-label="Preview theme">${options(['light','dark'],config.theme)}</select></label>
    <label>Scene <select name="scene" aria-label="Preview scene">${options(['healthy','incident','maintenance','failure','compat'],config.scene)}</select></label>
    <input type="hidden" name="sidebar" value="${config.collapsed?'collapsed':'expanded'}">
    <button type="submit">Apply preview</button>
  </form>
  <div class="controls"><button id="toggle-sidebar" type="button">Toggle sidebar</button>
    ${config.site==='chatgpt'?`<button id="peek-sidebar" type="button" aria-pressed="${config.peek}">Toggle collapsed peek</button>`:''}
    <label>Sidebar width <input id="sidebar-width" type="range" min="180" max="420" value="${config.width}"><output id="width-value">${config.width}</output></label>
    <label><input id="network-failure" type="checkbox"${config.scene==='failure'?' checked':''}>Simulate network failure</label>
    <button id="open-dialog" type="button">Open native dialog</button>
    <span id="request-count" role="status">Status requests: 0</span>
  </div>
  <p class="note">Local visual fixture. Status responses are synthetic snapshots; this page never contacts OpenAI. The production userscript bundle is loaded unchanged.</p>
</header><main><h1>${config.language==='zh-CN'?'我们从哪里开始？':'Where should we begin?'}</h1><p>${config.language==='zh-CN'?'用于验证状态面板、边栏定位、语言和主题。这里没有真实聊天数据。':'Use the status launcher to inspect the panel, layout, language and theme. There is no real conversation data here.'}</p><div class="composer" role="textbox" aria-label="Placeholder composer">${config.language==='zh-CN'?'询问 ChatGPT（布局占位）':'Ask ChatGPT (layout placeholder)'}</div></main></div>
<dialog id="native-dialog"><p>Native dialog fixture</p><form method="dialog"><button>Close dialog</button></form></dialog>
<script>
(() => {
  const config=${jsonForScript(config)};
  const original=${jsonForScript(fixture)};
  const settingsKey='openai-status-companion:preferences';
  const prefix='osc-preview:';
  const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(prefix+key)) ?? fallback}catch{return fallback}};
  const save=(key,value)=>{try{localStorage.setItem(prefix+key,JSON.stringify(value))}catch{}};
  const saved=get(settingsKey,{});
  // Explicit query language is the fixture's initial preference; subsequent widget changes persist.
  if(new URLSearchParams(location.search).has('language') || new URLSearchParams(location.search).has('lang')) saved.language=config.language;
  save(settingsKey,saved);
  window.GM_getValue=get; window.GM_setValue=save;
  window.GM_registerMenuCommand=()=>{};
  const summary=structuredClone(original);
  const target=summary.components.find(c=>c.name==='Conversations') || summary.components[0];
  if(config.scene==='incident') {
    summary.affected_components=[{component_id:target.id,current_status:'partial_outage'}];
    summary.ongoing_incidents=[{id:'preview-incident',name:'Example: elevated conversation errors',status:'monitoring',permalink:'https://status.openai.com/',affected_components:summary.affected_components,
      updates:[{to_status:'monitoring',message_string:'A fix has been applied. We are monitoring recovery. This is synthetic preview data.',published_at:'2026-11-03T09:30:00Z'},{to_status:'investigating',message_string:'We are investigating elevated errors.',published_at:'2026-11-03T09:00:00Z'}]}];
  }
  if(config.scene==='maintenance') {
    summary.affected_components=[{component_id:target.id,current_status:'under_maintenance'}];
    summary.scheduled_maintenances=[{id:'preview-maintenance',name:'Example: scheduled infrastructure maintenance',status:'in_progress',scheduled_for:'2026-11-03T09:00:00Z',scheduled_until:'2026-11-03T11:00:00Z',
      updates:[{to_status:'in_progress',message_string:'Maintenance is in progress. This is synthetic preview data.',published_at:'2026-11-03T09:05:00Z'}]}];
  }
  let requests=0;
  window.GM_xmlhttpRequest=options=>{
    const timer=setTimeout(()=>{
      document.getElementById('request-count').textContent='Status requests: '+(++requests);
      if(document.getElementById('network-failure').checked) return options.onerror?.({status:0});
      if(!String(options.url).startsWith('https://status.openai.com/')) return options.onerror?.({status:0});
      if(options.responseType==='json') {
        const payload={status:{indicator:'none'},components:summary.components.map(c=>({...c,status:'operational'}))};
        options.onload?.({status:200,response:payload,responseText:JSON.stringify(payload)});
      } else {
        const body=config.scene==='compat' ? '<html><body>Compatibility preview</body></html>' : '<script>self.__next_f.push('+JSON.stringify([1,'0:{"summary":'+JSON.stringify(summary)+'}'])+')<\\/script>';
        options.onload?.({status:200,response:body,responseText:body});
      }
    },50);
    return {abort(){clearTimeout(timer);options.onabort?.({status:0})}};
  };
  document.getElementById('toggle-sidebar').addEventListener('click',()=>{
    const collapsed=document.body.classList.toggle('collapsed');
    document.body.classList.remove('peek');
    document.getElementById('peek-sidebar')?.setAttribute('aria-pressed','false');
    document.querySelector('input[name="sidebar"]').value=collapsed?'collapsed':'expanded';
  });
  document.getElementById('peek-sidebar')?.addEventListener('click',event=>{
    document.body.classList.add('collapsed');
    const peek=document.body.classList.toggle('peek');
    event.currentTarget.setAttribute('aria-pressed',String(peek));
    document.querySelector('input[name="sidebar"]').value='collapsed';
  });
  document.getElementById('sidebar-width').addEventListener('input',event=>{
    document.documentElement.style.setProperty('--sidebar-width',event.target.value+'px');
    document.getElementById('width-value').value=event.target.value;
  });
  let popover, trigger;
  function closeMenu() {
    popover?.remove(); popover=undefined;
    trigger?.setAttribute('aria-expanded','false'); trigger=undefined;
  }
  for (const [id,items] of [['account-menu',['Example account','Upgrade plan','Personalization','Profile','Settings','Help','Sign out']],
    ['usage-menu',['Usage source: Your plan','Weekly limit','Credits','Manage usage']]]) {
    document.getElementById(id).addEventListener('click',event=>{
      const current=event.currentTarget;
      const alreadyOpen=trigger===current;
      closeMenu();
      if(alreadyOpen) return;
      trigger=current;
      trigger.setAttribute('aria-expanded','true');
      popover=document.createElement('div');
      popover.className='native-popover'+(id==='usage-menu'?' usage':'');
      popover.setAttribute('data-radix-popper-content-wrapper','');
      const menu=document.createElement('div');
      menu.setAttribute('role','menu');
      menu.setAttribute('aria-label',id==='usage-menu'?'Usage menu':'Account menu');
      for(const [index,label] of items.entries()) {
        const item=document.createElement(id==='usage-menu'&&index<3?'p':'button');
        if(item.tagName==='BUTTON') item.setAttribute('role','menuitem');
        item.textContent=label; menu.append(item);
      }
      popover.append(menu); document.body.append(popover);
    });
  }
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&popover) {const previous=trigger; closeMenu(); previous.focus();}
  });
  document.getElementById('open-dialog').addEventListener('click',()=>{
    closeMenu(); document.getElementById('native-dialog').showModal();
  });
})();
</script>
<script src="${bundlePath}"></script>
</body></html>`;
}

const server = createServer(async (req,res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    if(req.method!=='GET' && req.method!=='HEAD') {res.writeHead(405);res.end('Method not allowed');return;}
    let body, type;
    if(url.pathname==='/') {body=previewPage(url.searchParams);type='text/html; charset=utf-8';}
    else if(url.pathname===bundlePath || url.pathname==='/source.txt') {
      body=await readFile(new URL(`.${bundlePath}`,root));
      type=url.pathname==='/source.txt'?'text/plain; charset=utf-8':'text/javascript; charset=utf-8';
    }
    else if(url.pathname===fixturePath) {body=fixtureText;type='application/json; charset=utf-8';}
    else {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':type});res.end(req.method==='HEAD'?'':body);
  } catch(error) {
    res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});
    res.end('Preview artifact unavailable. Run npm run build first.');
    console.error(error.message);
  }
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}/\nRoot: ${fileURLToPath(root)}`));
