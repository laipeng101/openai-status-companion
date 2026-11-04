export const styles = `
:host {
  all: initial;
  --ok:#10a37f; --warn:#bd7900; --bad:#c83349; --info:#2563eb;
  --text:#19211f; --subtle:#606c67; --card:#fff; --raised:#f5f7f6;
  --border:#dbe2de; --shadow:0 16px 48px #0003;
  --safe-left:env(safe-area-inset-left,0px); --safe-right:env(safe-area-inset-right,0px);
  --safe-top:env(safe-area-inset-top,0px); --safe-bottom:env(safe-area-inset-bottom,0px);
  position:fixed; left:14px; bottom:14px; z-index:2147483000;
  font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  font-size:13px; line-height:1.5; color:var(--text); color-scheme:light;
  pointer-events:none; text-align:start;
}
:host([data-theme="dark"]) {
  --text:#eef2f0; --subtle:#abb7b0; --card:#202522; --raised:#292f2b;
  --border:#424b45; --shadow:0 16px 48px #0008;
  --warn:#eeb44c; --bad:#ff8a9b; --info:#91b4ff; color-scheme:dark;
}
:host([data-suppressed]),.toast[data-suppressed] {visibility:hidden!important}
*,*::before,*::after {box-sizing:border-box}
button,select {font:inherit; color:inherit}
button,select,a,summary {touch-action:manipulation}
button,a,select,summary {pointer-events:auto}
button {cursor:pointer}
button:disabled {cursor:wait; opacity:.5}
button:focus-visible,a:focus-visible,select:focus-visible,summary:focus-visible {
  outline:3px solid var(--info); outline-offset:3px;
}
[hidden] {display:none!important}
.launcher {display:flex; align-items:center; gap:8px; min-height:38px; max-width:min(240px,var(--available-width,240px));
  padding:8px 13px; border:1px solid var(--border); border-radius:24px;
  background:var(--card); color:var(--text); box-shadow:0 4px 16px #0002;
  font-weight:650; font-size:13px; line-height:1.35; user-select:none;
}
.launcher>span:last-child {min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.launcher:hover {background:var(--raised)}
.launcher.stale {border-style:dashed}
.dot {width:9px; height:9px; flex:none; border-radius:50%; background:var(--subtle)}
[data-tone="ok"]>.dot,.dot.ok {background:var(--ok)}
[data-tone="warn"]>.dot,.dot.warn {background:var(--warn)}
[data-tone="bad"]>.dot,.dot.bad {background:var(--bad)}
[data-tone="info"]>.dot,.dot.info {background:var(--info)}
.loading>.dot {animation:pulse 1s ease-in-out infinite}
@keyframes pulse {50% {opacity:.3}}
.panel {position:fixed; left:var(--panel-left,14px); bottom:var(--panel-bottom,62px);
  width:var(--panel-width,392px); max-height:var(--panel-height,600px);
  overflow:auto; overscroll-behavior:contain; scrollbar-width:thin;
  border:1px solid var(--border); border-radius:16px; background:var(--card);
  box-shadow:var(--shadow); pointer-events:auto; color:var(--text);
}
.header {position:sticky; top:0; z-index:2; display:flex; align-items:center;
  justify-content:space-between; gap:10px; padding:13px 14px;
  background:var(--card); border-bottom:1px solid var(--border)}
.header>div:first-child {min-width:0; overflow-wrap:anywhere}
.title {margin:0; font-size:15px; line-height:1.4; font-weight:750}
.subtitle {font-size:11px; color:var(--subtle); margin-top:3px}
.actions {display:flex; gap:5px; flex:none}
.icon {display:grid; place-items:center; width:32px; height:32px; padding:0;
  font-size:18px; line-height:1; border:1px solid var(--border); border-radius:8px;
  background:transparent}
.icon:hover {background:var(--raised)}
.content {padding:13px 14px 14px; overflow-wrap:anywhere}
.overall {display:flex; align-items:flex-start; gap:10px; padding:12px;
  border:1px solid var(--border); border-radius:12px; background:var(--raised)}
.overall>.dot {margin-top:6px}
.overall-main {min-width:0; flex:1}
.overall-text {font-size:14px; font-weight:750}
.meta {color:var(--subtle); font-size:11px; margin-top:4px}
.section {margin-top:14px}
.section-title {display:flex; justify-content:space-between; gap:10px;
  margin:0 0 7px; color:var(--subtle); font-size:12px; font-weight:650}
.section-title>span {min-width:0}
.list {display:grid; gap:6px}
.component {display:flex; justify-content:space-between; align-items:center; gap:12px;
  padding:7px 8px; border:1px solid var(--border); border-radius:8px; background:var(--card)}
.component-name {min-width:0; font-size:12px; font-weight:600}
.badge {flex:none; max-width:55%; padding:2px 7px; border-radius:10px;
  background:var(--raised); color:var(--subtle); font-size:11px; text-align:end}
.badge.warn {color:var(--warn)} .badge.bad {color:var(--bad)} .badge.info {color:var(--info)}
details {margin-top:7px; border:1px solid var(--border); border-radius:10px; background:var(--raised)}
summary {cursor:pointer; padding:10px; font-size:12px; font-weight:650}
.groups {padding:0 8px 8px}
.group-name {margin:10px 0 5px; font-size:11px; color:var(--subtle); font-weight:650}
.activity {border:1px solid var(--border); border-radius:10px; overflow:hidden}
.activity-row {display:flex; justify-content:space-between; gap:10px; padding:9px 10px}
.activity-row+.activity-row {border-top:1px solid var(--border)}
.activity-value {font-size:12px; color:var(--subtle)}
.incident {margin-top:8px; padding:10px 11px; border-inline-start:3px solid var(--warn);
  border-radius:4px 9px 9px 4px; background:var(--raised)}
.incident.major,.incident.critical {border-color:var(--bad)}
.incident.maintenance {border-color:var(--info)}
.incident-name {font-weight:700}
.update {margin-top:8px; padding-top:8px; border-top:1px solid var(--border);
  font-size:12px; white-space:pre-wrap; color:var(--subtle)}
.official-body {margin-top:4px; unicode-bidi:plaintext}
.note,.error,.empty {padding:10px; border:1px dashed var(--border); border-radius:9px;
  font-size:12px; color:var(--subtle)}
.note {margin-top:10px; border-color:var(--warn)} .error {color:var(--bad)}
.scope {color:var(--subtle); font-size:11px; margin-top:12px}
.footer {display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px;
  margin-top:12px; padding-top:10px; border-top:1px solid var(--border); font-size:11px; color:var(--subtle)}
a {color:var(--info); text-decoration:none} a:hover {text-decoration:underline}
.settings {padding:10px 14px; border-bottom:1px solid var(--border); display:grid; gap:8px; overflow-wrap:anywhere}
.setting {display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:12px}
select {min-height:32px; max-width:64%; padding:4px 8px; border:1px solid var(--border);
  border-radius:7px; background:var(--card)}
.toast {position:fixed; left:var(--panel-left,14px); bottom:var(--panel-bottom,62px);
  width:var(--panel-width,330px); max-height:var(--panel-height,600px); overflow:auto;
  padding:11px 13px; border:1px solid var(--border); border-inline-start:4px solid var(--warn);
  border-radius:11px; background:var(--card); box-shadow:var(--shadow); font-size:13px;
  pointer-events:auto; cursor:pointer}
.toast.ok {border-inline-start-color:var(--ok)} .toast.bad {border-inline-start-color:var(--bad)}
@media(max-width:767px) {
  .launcher {min-height:36px; padding:8px 10px; max-width:min(160px,var(--available-width,160px)); font-size:12px}
  .header {padding:11px 12px} .content {padding:11px 12px}
  .panel {border-radius:13px}
}
@media(prefers-reduced-motion:reduce) {*,*::before,*::after {animation:none!important; transition:none!important}}
`;
