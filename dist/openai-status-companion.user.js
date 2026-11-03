// ==UserScript==
// @name         OpenAI Status Companion
// @name:zh-CN   OpenAI 状态助手
// @namespace    https://github.com/laipeng101/openai-status-companion
// @version      2.0.0
// @description  Show official OpenAI status, components, incidents and maintenance on ChatGPT and Aizex / Leopard-X. English and Chinese UI.
// @description:zh-CN 在 ChatGPT 与 Aizex / Leopard-X 显示 OpenAI 官方状态、组件、事件及计划维护，支持中英文、主题和自适应布局。
// @author       laipeng101
// @license      MIT
// @homepageURL  https://github.com/laipeng101/openai-status-companion
// @supportURL   https://github.com/laipeng101/openai-status-companion/issues
// @match        https://chatgpt.com/*
// @match        https://leopard-x.memofun.net/*
// @match        https://mana-x.aizex.net/*
// @icon         https://status.openai.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      status.openai.com
// @run-at       document-idle
// @noframes
// ==/UserScript==
(() => {
  // src/status-core.js
  var STATUS_URL = "https://status.openai.com/";
  var OVERALL = {
    none: { level: 0, tone: "ok" },
    minor: { level: 1, tone: "warn" },
    major: { level: 2, tone: "bad" },
    critical: { level: 3, tone: "bad" },
    maintenance: { level: 1, tone: "info" },
    unknown: { level: 1, tone: "muted" }
  };
  var COMPONENTS = {
    operational: { level: 0, tone: "ok" },
    degraded_performance: { level: 1, tone: "warn" },
    partial_outage: { level: 2, tone: "bad" },
    major_outage: { level: 3, tone: "bad" },
    full_outage: { level: 3, tone: "bad" },
    under_maintenance: { level: 1, tone: "info" },
    unknown: { level: 1, tone: "muted" }
  };
  var IMPACT_LEVEL = { none: 0, minor: 1, major: 2, critical: 3 };
  var ACTIVE_MAINTENANCE = /* @__PURE__ */ new Set(["in_progress", "ongoing", "verifying"]);
  var CLOSED_INCIDENTS = /* @__PURE__ */ new Set(["resolved", "postmortem", "completed"]);
  function fail(code2, message) {
    const error = new Error(message);
    error.code = code2;
    return error;
  }
  function text(value) {
    return typeof value === "string" ? value : "";
  }
  function validActivity(item) {
    return Boolean(item && typeof item === "object" && !Array.isArray(item) && text(item.id));
  }
  function code(value) {
    if (typeof value === "string") return value.toLowerCase().replace(/[\s-]+/g, "_");
    if (value && typeof value === "object") return code(value.name || value.status || value.category);
    return "";
  }
  function getOverall(indicator) {
    const normalized = Object.hasOwn(OVERALL, indicator) ? indicator : "unknown";
    return { ...OVERALL[normalized], key: `overall_${normalized}`, shortKey: `short_${normalized}` };
  }
  function getComponentStatus(status) {
    const normalized = Object.hasOwn(COMPONENTS, status) ? status : "unknown";
    return { ...COMPONENTS[normalized], key: `component_${normalized}` };
  }
  function normalizeComponentCode(status) {
    const normalized = code(status);
    return Object.hasOwn(COMPONENTS, normalized) ? normalized : "unknown";
  }
  function extractBalancedObject(source, fromIndex = 0) {
    let start2 = fromIndex;
    while (/\s/.test(source[start2] || "") && start2 < source.length) start2 += 1;
    if (source[start2] !== "{") throw fail("errorParse", "Status summary is not a JSON object");
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start2; index < source.length; index += 1) {
      const character = source[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}" && --depth === 0) return source.slice(start2, index + 1);
    }
    throw fail("errorIncomplete", "Status summary is truncated");
  }
  function parseOfficialPage(html) {
    if (typeof html !== "string" || !html.trim()) throw fail("errorEmpty", "Status page is empty");
    let stream = "";
    const scripts = html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi);
    for (const match of scripts) {
      const push = /^\s*self\.__next_f\.push\(([\s\S]*)\)\s*;?\s*$/.exec(match[1]);
      if (!push) continue;
      try {
        const chunk = JSON.parse(push[1]);
        if (Array.isArray(chunk) && typeof chunk[1] === "string") stream += chunk[1];
      } catch {
      }
    }
    const summaryMarker = /"summary"\s*:/g;
    let candidateError = null;
    for (const match of stream.matchAll(summaryMarker)) {
      try {
        const summary = JSON.parse(extractBalancedObject(stream, match.index + match[0].length));
        validateOfficialSummary(summary);
        return summary;
      } catch (error) {
        candidateError = error?.code ? error : fail("errorParse", "Status summary contains invalid JSON");
      }
    }
    throw candidateError || fail("errorSummary", "No status summary was found");
  }
  function validateOfficialSummary(summary) {
    if (!summary || typeof summary !== "object" || !Array.isArray(summary.components) || !Array.isArray(summary.affected_components) || !Array.isArray(summary.ongoing_incidents) || !Array.isArray(summary.scheduled_maintenances)) {
      throw fail("errorIncomplete", "Status summary is incomplete");
    }
    if (summary.components.some((item) => !item || !text(item.id) || !text(item.name))) {
      throw fail("errorSchema", "Status components are malformed");
    }
    if (summary.ongoing_incidents.some((item) => !validActivity(item)) || summary.scheduled_maintenances.some((item) => !validActivity(item)) || summary.affected_components.some((item) => !item || !text(item.component_id))) {
      throw fail("errorSchema", "Status activity is malformed");
    }
  }
  function uniqueComponents(items, statusFor) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const [position, item] of items.entries()) {
      if (!item || !text(item.id) || seen.has(item.id)) continue;
      seen.add(item.id);
      result.push({ id: item.id, name: text(item.name), position, status: statusFor(item) });
    }
    return result;
  }
  function hiddenComponentIds(structure) {
    const hidden = /* @__PURE__ */ new Set();
    const visible = /* @__PURE__ */ new Set();
    for (const item of Array.isArray(structure?.items) ? structure.items : []) {
      if (item?.group) {
        for (const component of Array.isArray(item.group.components) ? item.group.components : []) {
          (item.hidden || item.group.hidden || component.hidden ? hidden : visible).add(component.component_id);
        }
      } else if (item?.component) {
        (item.hidden || item.component.hidden ? hidden : visible).add(item.component.component_id);
      }
    }
    for (const id of visible) hidden.delete(id);
    return hidden;
  }
  function buildComponentGroups(structure, components) {
    const known = new Set(components.map((item) => item.id));
    const assigned = /* @__PURE__ */ new Set();
    const groups = [];
    for (const item of Array.isArray(structure?.items) ? structure.items : []) {
      if (item?.hidden || item?.group?.hidden || item?.component?.hidden) continue;
      const references = item?.group ? (Array.isArray(item.group.components) ? item.group.components : []).filter((component) => !component?.hidden) : item?.component ? [item.component] : [];
      const ids = [];
      for (const reference of references) {
        const id = reference?.component_id;
        if (!known.has(id) || assigned.has(id)) continue;
        assigned.add(id);
        ids.push(id);
      }
      if (ids.length) groups.push({
        id: text(item.group?.id) || `group-${groups.length}`,
        name: text(item.group?.name) || "Other",
        component_ids: ids
      });
    }
    const unassigned = components.filter((item) => !assigned.has(item.id)).map((item) => item.id);
    if (unassigned.length) groups.push({ id: "other", name: "Other", component_ids: unassigned });
    return groups;
  }
  function updateTime(update) {
    for (const field of ["display_at", "updated_at", "created_at", "published_at"]) {
      const timestamp = Date.parse(update?.[field] || "");
      if (Number.isFinite(timestamp)) return timestamp;
    }
    return -Infinity;
  }
  function findLatestUpdate(updates) {
    if (!Array.isArray(updates) || !updates.length) return null;
    let latest = null;
    for (const update of updates) {
      if (!update || typeof update !== "object") continue;
      if (!latest || updateTime(update) > updateTime(latest)) latest = update;
    }
    return latest;
  }
  function safeStatusUrl(value) {
    if (!text(value)) return "";
    try {
      const url = new URL(value, STATUS_URL);
      return url.protocol === "https:" && url.hostname === "status.openai.com" && !url.username && !url.password ? url.href : "";
    } catch {
      return "";
    }
  }
  function impactFromAffected(items) {
    const affected = Array.isArray(items) ? items : [];
    const worst = affected.reduce((level, item) => {
      const status = normalizeComponentCode(item?.current_status || item?.status);
      if (status === "under_maintenance") return level;
      return Math.max(level, getComponentStatus(status).level);
    }, 0);
    return worst >= 3 ? "critical" : worst >= 2 ? "major" : "minor";
  }
  function normalizeIncident(item, compatibility = false) {
    const updates = (Array.isArray(compatibility ? item?.incident_updates : item?.updates) ? compatibility ? item.incident_updates : item.updates : []).filter(Boolean).map((update) => ({
      id: text(update.id),
      status: code(update.to_status || update.status),
      body: text(update.body) || text(update.message_string) || text(update.message?.markdown),
      display_at: text(update.display_at) || text(update.published_at),
      updated_at: text(update.updated_at) || text(update.published_at),
      created_at: text(update.created_at) || text(update.published_at)
    }));
    const latest = findLatestUpdate(updates);
    const suppliedImpact = code(item?.impact);
    return {
      id: text(item?.id),
      name: text(item?.name),
      status: code(item?.status) || latest?.status || "investigating",
      impact: Object.hasOwn(IMPACT_LEVEL, suppliedImpact) ? suppliedImpact : impactFromAffected(item?.affected_components),
      updated_at: latest?.display_at || latest?.updated_at || latest?.created_at || text(item?.updated_at) || text(item?.published_at),
      incident_updates: updates,
      url: safeStatusUrl(item?.permalink || item?.url || item?.shortlink)
    };
  }
  function normalizeMaintenance(item, compatibility = false) {
    const normalized = normalizeIncident(item, compatibility);
    return {
      ...normalized,
      status: code(item?.status) || findLatestUpdate(normalized.incident_updates)?.status || "scheduled",
      impact: "maintenance",
      scheduled_for: text(item?.scheduled_for) || text(item?.starts_at) || text(item?.start_at) || text(item?.scheduled_at),
      scheduled_until: text(item?.scheduled_until) || text(item?.ends_at) || text(item?.end_at)
    };
  }
  function deriveOverallIndicator(components, incidents = [], maintenances = []) {
    const activeIncidents = incidents.filter((item) => !CLOSED_INCIDENTS.has(item.status));
    const componentWorst = components.reduce((level, item) => {
      if (item.status === "under_maintenance" || item.status === "unknown") return level;
      return Math.max(level, getComponentStatus(item.status).level);
    }, 0);
    const incidentWorst = activeIncidents.reduce((level, item) => Math.max(level, IMPACT_LEVEL[item.impact] || 1), 0);
    const worst = Math.max(componentWorst, incidentWorst);
    if (worst >= 3) return "critical";
    if (worst >= 2) return "major";
    if (worst >= 1) return "minor";
    if (!components.length || components.some((item) => item.status === "unknown")) return "unknown";
    if (components.some((item) => item.status === "under_maintenance") || maintenances.some((item) => ACTIVE_MAINTENANCE.has(item.status))) return "maintenance";
    return "none";
  }
  function normalizeOfficialSummary(summary) {
    validateOfficialSummary(summary);
    const affected = new Map(summary.affected_components.filter(Boolean).map((item) => [
      item.component_id,
      normalizeComponentCode(item.current_status || item.status)
    ]));
    const hiddenIds = hiddenComponentIds(summary.structure);
    const components = uniqueComponents(summary.components.filter((item) => !hiddenIds.has(item.id)), (item) => affected.get(item.id) || (item.status ? normalizeComponentCode(item.status) : "operational"));
    const incidents = summary.ongoing_incidents.filter(Boolean).map((item) => normalizeIncident(item));
    const maintenances = summary.scheduled_maintenances.filter(Boolean).map((item) => normalizeMaintenance(item));
    return {
      page: { name: text(summary.name) || "OpenAI", url: safeStatusUrl(summary.public_url) || STATUS_URL },
      status: { indicator: deriveOverallIndicator(components, incidents, maintenances) },
      components,
      component_groups: buildComponentGroups(summary.structure, components),
      incidents,
      scheduled_maintenances: maintenances,
      availability: { components: components.length ? "verified" : "partial", incidents: "verified", maintenances: "verified" },
      source_mode: "official-page"
    };
  }
  function normalizeCompatibility(summary, componentsPayload) {
    validateResponse(summary);
    const separateComponents = Array.isArray(componentsPayload?.components) && componentsPayload.components.every((item) => item && text(item.id) && text(item.name));
    const rawComponents = separateComponents ? componentsPayload.components : summary.components;
    const components = uniqueComponents(rawComponents.filter((item) => !item?.group), (item) => normalizeComponentCode(item.status));
    const incidentsVerified = Array.isArray(summary.incidents) && summary.incidents.every(validActivity);
    const maintenancesVerified = Array.isArray(summary.scheduled_maintenances) && summary.scheduled_maintenances.every(validActivity);
    const incidents = (Array.isArray(summary.incidents) ? summary.incidents : []).filter(validActivity).map((item) => normalizeIncident(item, true));
    const maintenances = (Array.isArray(summary.scheduled_maintenances) ? summary.scheduled_maintenances : []).filter(validActivity).map((item) => normalizeMaintenance(item, true));
    const derived = deriveOverallIndicator(components, incidents, maintenances);
    const declared = code(summary.status.indicator);
    const declaredKnown = Object.hasOwn(OVERALL, declared);
    let indicator = derived;
    if (["minor", "major", "critical"].includes(declared) && getOverall(declared).level >= getOverall(derived).level) indicator = declared;
    else if (declared === "maintenance" && derived === "none") indicator = "maintenance";
    const activityVerified = incidentsVerified && maintenancesVerified;
    if (indicator === "none" && (!declaredKnown || declared === "unknown" || !activityVerified)) indicator = "unknown";
    const groupItems = rawComponents.filter((item) => item?.group).map((group) => ({ group: {
      id: group.id,
      name: group.name,
      components: rawComponents.filter((item) => item?.group_id === group.id).map((item) => ({ component_id: item.id }))
    } }));
    return {
      page: { name: text(summary.page?.name) || "OpenAI", url: STATUS_URL },
      status: { indicator },
      components,
      component_groups: buildComponentGroups({ items: groupItems }, components),
      incidents,
      scheduled_maintenances: maintenances,
      availability: {
        components: separateComponents && components.length ? "verified" : "partial",
        incidents: incidentsVerified ? "verified" : "unknown",
        maintenances: maintenancesVerified ? "verified" : "unknown"
      },
      source_mode: "compatibility-json"
    };
  }
  function validateResponse(data) {
    if (!data || typeof data !== "object" || !data.status || typeof data.status !== "object" || !Array.isArray(data.components) || data.components.some((item) => !item || !text(item.id) || !text(item.name))) {
      throw fail("errorSchema", "Status data has an unexpected format");
    }
    return data;
  }

  // src/locales.js
  var EN_MESSAGES = {
    title: "OpenAI Status",
    details: "OpenAI status details",
    loading: "Fetching OpenAI status…",
    unknown: "OpenAI status unknown",
    refresh: "Refresh now",
    close: "Close panel",
    open: "Open status panel",
    language: "Language",
    auto: "Follow page / browser",
    theme: "Theme",
    themeAuto: "Follow website",
    light: "Light",
    dark: "Dark",
    position: "Position",
    positionAuto: "Beside sidebar",
    positionLeft: "Bottom left",
    positionRight: "Bottom right",
    components: "Official components",
    activity: "Official activity",
    allNormal: "All operational",
    abnormalCount: "{count} affected",
    normalCount: "{normal}/{total} components operational",
    allComponents: "View all {count} components",
    expand: "Expand",
    collapse: "Collapse",
    incidents: "Unresolved incidents",
    maintenances: "Scheduled maintenance",
    ongoingIncidents: "Ongoing incidents",
    verified: "Verified",
    partlyVerified: "Partly unverified",
    unverified: "Unverified",
    noItems: "None",
    itemCount: "{count}",
    fetchedAt: "Fetched (local): {time}",
    lastSuccess: "Last successful fetch (local): {time}",
    autoRefresh: "Refreshes every {seconds} seconds",
    officialPage: "Open official status page ↗",
    sourceLive: "Live data from status.openai.com",
    sourceCompat: "Compatibility data from status.openai.com",
    compatWarning: "The current status page could not be read. Compatibility data is shown; check each section’s verification label.",
    fetchFailed: "Could not fetch OpenAI status: {error}. Check your connection and try refreshing.",
    staleWarning: "Refresh failed ({error}). Showing data successfully fetched at {time}.",
    cached: "cached",
    scopeNote: "Official availability is aggregated across plans, models and error types. Your experience may vary by plan and feature. This is an independent userscript, not an OpenAI product.",
    originalUpdate: "Latest official update (original text)",
    unknownTime: "Time unknown",
    unknownComponent: "Unknown component",
    unnamedIncident: "Unnamed incident",
    unnamedMaintenance: "Unnamed maintenance",
    noDetails: "No details available",
    statusAndImpact: "Status: {status} · Impact: {impact}",
    maintenanceStage: "Status: {status} · Scheduled maintenance",
    scheduleStart: "Scheduled start: {time}",
    scheduleEnd: "Scheduled end: {time}",
    scheduleUnknown: "Maintenance time has not been announced",
    noticeUpdated: "OpenAI status updated",
    noticeInitial: "OpenAI status notice",
    launcherHint: "{status}. Open official status details.",
    unknownHint: "OpenAI status is unavailable. Open details to retry.",
    staleHint: "Could not refresh OpenAI status: {error}. Open the last successful data or retry.",
    unknownError: "Unknown error",
    errorHttp: "Official status request returned HTTP {status}",
    errorTimeout: "Official status request timed out",
    errorNetwork: "Could not connect to the official status page",
    errorParse: "Official status data could not be parsed",
    errorSchema: "Official status data has an unexpected format",
    errorEmpty: "The official status page was empty",
    errorSummary: "No official status summary was found",
    errorIncomplete: "The official status summary was incomplete",
    oldVersionNotice: "The old “OpenAI 官方状态中文提示（aizex）” script is also running. Disable version 1.6.2 in your userscript manager to avoid duplicate widgets.",
    menuToggle: "Toggle OpenAI status panel",
    menuSettings: "OpenAI status preferences",
    settings: "Preferences",
    preferencesSaved: "Preferences saved",
    exportLayout: "Export safe page layout",
    exported: "Safe page layout exported",
    privacyLayout: "Only structural layout information is exported. No page text, form values, links, cookies, storage contents or network data are included.",
    overall_none: "All systems operational",
    short_none: "OpenAI operational",
    overall_minor: "Minor service disruption",
    short_minor: "Minor disruption",
    overall_major: "Partial system outage",
    short_major: "Service outage",
    overall_critical: "Major service outage",
    short_critical: "Major outage",
    overall_maintenance: "Service maintenance in progress",
    short_maintenance: "Maintenance",
    overall_unknown: "Official status unknown",
    short_unknown: "Status unknown",
    component_operational: "Operational",
    component_degraded_performance: "Degraded performance",
    component_partial_outage: "Partial outage",
    component_major_outage: "Major outage",
    component_full_outage: "Full outage",
    component_under_maintenance: "Under maintenance",
    component_unknown: "Unknown status",
    incident_investigating: "Investigating",
    incident_identified: "Identified",
    incident_fixing: "Fixing",
    incident_monitoring: "Monitoring recovery",
    incident_observing: "Observing recovery",
    incident_resolved: "Resolved",
    incident_postmortem: "Postmortem",
    maintenance_scheduled: "Scheduled",
    maintenance_upcoming: "Upcoming",
    maintenance_in_progress: "In progress",
    maintenance_ongoing: "In progress",
    maintenance_verifying: "Verifying",
    maintenance_completed: "Completed",
    impact_none: "No impact",
    impact_minor: "Minor impact",
    impact_major: "Major impact",
    impact_critical: "Critical impact",
    impact_maintenance: "Scheduled maintenance",
    impact_unknown: "Unknown impact"
  };
  var ZH_CN_MESSAGES = {
    title: "OpenAI 官方状态",
    details: "OpenAI 官方状态详情",
    loading: "正在获取 OpenAI 状态…",
    unknown: "OpenAI 状态未知",
    refresh: "立即刷新",
    close: "收起面板",
    open: "打开状态面板",
    language: "语言",
    auto: "跟随网页 / 浏览器",
    theme: "主题",
    themeAuto: "跟随网站",
    light: "浅色",
    dark: "深色",
    position: "位置",
    positionAuto: "边栏外侧",
    positionLeft: "左下角",
    positionRight: "右下角",
    components: "官方组件",
    activity: "官方动态",
    allNormal: "全部正常",
    abnormalCount: "{count} 项异常",
    normalCount: "{normal}/{total} 个组件运行正常",
    allComponents: "查看全部 {count} 个组件",
    expand: "展开",
    collapse: "收起",
    incidents: "未解决事件",
    maintenances: "计划维护",
    ongoingIncidents: "进行中的事件",
    verified: "已核验",
    partlyVerified: "部分未核验",
    unverified: "未核验",
    noItems: "无",
    itemCount: "{count} 项",
    fetchedAt: "获取时间（本地）：{time}",
    lastSuccess: "上次成功获取（本地）：{time}",
    autoRefresh: "每 {seconds} 秒自动刷新",
    officialPage: "打开官方状态页 ↗",
    sourceLive: "status.openai.com 实时数据",
    sourceCompat: "status.openai.com 兼容数据",
    compatWarning: "官方新版页面暂时无法读取，已切换兼容数据源；各部分是否完整请以核验标记为准。",
    fetchFailed: "无法获取 OpenAI 官方状态：{error}。请检查网络后点击刷新。",
    staleWarning: "本次刷新失败（{error}），当前显示 {time} 成功获取的数据。",
    cached: "缓存",
    scopeNote: "官方可用性按所有套餐、模型和错误类型汇总；你的实际体验可能因套餐及所用功能而异。本脚本为独立项目，并非 OpenAI 官方产品。",
    originalUpdate: "官方最新原文",
    unknownTime: "时间未知",
    unknownComponent: "未知组件",
    unnamedIncident: "未命名事件",
    unnamedMaintenance: "未命名维护",
    noDetails: "暂无说明",
    statusAndImpact: "状态：{status} · 影响：{impact}",
    maintenanceStage: "状态：{status} · 计划维护",
    scheduleStart: "计划开始：{time}",
    scheduleEnd: "计划结束：{time}",
    scheduleUnknown: "维护时间尚未公布",
    noticeUpdated: "OpenAI 官方状态已更新",
    noticeInitial: "OpenAI 官方状态提醒",
    launcherHint: "{status}；点击查看官方详情",
    unknownHint: "暂时无法获取 OpenAI 官方状态；点击查看详情或重试",
    staleHint: "暂时无法刷新 OpenAI 官方状态：{error}；点击查看上次成功数据或重试",
    unknownError: "未知错误",
    errorHttp: "官方状态请求返回 HTTP {status}",
    errorTimeout: "请求官方状态超时",
    errorNetwork: "无法连接 OpenAI 官方状态页",
    errorParse: "官方状态数据无法解析",
    errorSchema: "官方状态数据格式不符合预期",
    errorEmpty: "官方状态页面内容为空",
    errorSummary: "未找到官方状态摘要",
    errorIncomplete: "官方状态摘要不完整",
    oldVersionNotice: "旧版“OpenAI 官方状态中文提示（aizex）”也在运行。请在脚本管理器中停用 1.6.2 版，避免重复显示。",
    menuToggle: "展开 / 收起 OpenAI 状态面板",
    menuSettings: "OpenAI 状态偏好设置",
    settings: "偏好设置",
    preferencesSaved: "偏好设置已保存",
    exportLayout: "导出安全页面结构",
    exported: "安全页面结构已导出",
    privacyLayout: "仅导出页面布局结构，不含页面文字、表单值、链接、Cookie、存储内容或网络数据。",
    overall_none: "所有系统运行正常",
    short_none: "OpenAI 正常",
    overall_minor: "轻微服务中断",
    short_minor: "轻微中断",
    overall_major: "部分系统中断",
    short_major: "服务中断",
    overall_critical: "重大服务中断",
    short_critical: "严重中断",
    overall_maintenance: "服务维护中",
    short_maintenance: "维护中",
    overall_unknown: "官方状态未知",
    short_unknown: "状态未知",
    component_operational: "运行正常",
    component_degraded_performance: "性能下降",
    component_partial_outage: "部分中断",
    component_major_outage: "严重中断",
    component_full_outage: "完全中断",
    component_under_maintenance: "维护中",
    component_unknown: "状态未知",
    incident_investigating: "正在调查",
    incident_identified: "已定位问题",
    incident_fixing: "正在修复",
    incident_monitoring: "正在监控恢复",
    incident_observing: "正在观察恢复情况",
    incident_resolved: "事件已解决",
    incident_postmortem: "事后复盘",
    maintenance_scheduled: "已安排",
    maintenance_upcoming: "即将开始",
    maintenance_in_progress: "进行中",
    maintenance_ongoing: "进行中",
    maintenance_verifying: "正在验证",
    maintenance_completed: "已完成",
    impact_none: "无影响",
    impact_minor: "轻微影响",
    impact_major: "重大影响",
    impact_critical: "严重影响",
    impact_maintenance: "计划维护",
    impact_unknown: "影响未知"
  };
  var ZH_CN_COMPONENT_NAMES = {
    ChatGPT: "ChatGPT",
    Login: "登录",
    Images: "图像",
    Responses: "Responses API",
    Audio: "音频",
    Files: "文件",
    Search: "搜索",
    Sora: "Sora",
    "Fine-tuning": "微调",
    "Deep Research": "深度研究",
    Realtime: "实时 API",
    "Voice mode": "语音模式",
    Batch: "批处理",
    Embeddings: "嵌入",
    Moderations: "内容审核",
    "Codex Web": "Codex 网页版",
    "Codex in ChatGPT Desktop": "ChatGPT 桌面版 Codex",
    "Connectors/Apps": "连接器 / 应用",
    "VS Code extension": "VS Code 扩展",
    "Codex API": "Codex API",
    Sites: "站点",
    Agent: "智能体",
    Agents: "Agents API",
    Decisions: "Decisions API",
    "Compliance API": "合规 API",
    "Ads API": "广告 API",
    FedRAMP: "FedRAMP",
    "ChatGPT Atlas": "ChatGPT Atlas",
    "Chat Completions": "Chat Completions",
    "File uploads": "文件上传",
    "Ads Manager": "广告管理器",
    CLI: "命令行工具（CLI）",
    Conversations: "对话",
    GPTs: "GPTs",
    "Image Generation": "图像生成",
    "ChatGPT Work": "ChatGPT Work",
    Live: "Live",
    dots: "dots",
    Space: "资料空间"
  };
  var LOCALES = {
    en: {
      label: "English",
      lang: "en",
      dir: "ltr",
      messages: EN_MESSAGES,
      componentNames: {},
      groupNames: { Other: "Other components" }
    },
    "zh-CN": {
      label: "简体中文",
      lang: "zh-CN",
      dir: "ltr",
      messages: ZH_CN_MESSAGES,
      componentNames: ZH_CN_COMPONENT_NAMES,
      groupNames: {
        APIs: "APIs",
        ChatGPT: "ChatGPT",
        Codex: "Codex",
        FedRAMP: "FedRAMP",
        "Ads Platform": "广告平台",
        Other: "其他组件"
      }
    }
  };
  function normalizeLanguage(value) {
    return typeof value === "string" ? value.trim().replaceAll("_", "-").toLowerCase() : "";
  }
  function matchLocale(language) {
    const normalized = normalizeLanguage(language);
    if (!normalized || normalized === "auto") return null;
    const entries = Object.entries(LOCALES);
    const exact = entries.find(([id, locale]) => normalizeLanguage(id) === normalized || normalizeLanguage(locale.lang) === normalized);
    if (exact) return exact[0];
    const base = normalized.split("-")[0];
    return entries.find(([, locale]) => normalizeLanguage(locale.lang).split("-")[0] === base)?.[0] || null;
  }
  function resolveLocale(preference = "auto", pageLanguage = "", navigatorLanguages = []) {
    const preferred = matchLocale(preference);
    if (preferred) return preferred;
    const page = matchLocale(pageLanguage);
    if (page) return page;
    const languages = Array.isArray(navigatorLanguages) ? navigatorLanguages : [navigatorLanguages];
    for (const language of languages) {
      const matched = matchLocale(language);
      if (matched) return matched;
    }
    return "en";
  }
  function ownValue(object, key) {
    return object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : void 0;
  }
  function translate(localeId, key, params = {}) {
    const locale = LOCALES[matchLocale(localeId) || "en"];
    const message = ownValue(locale.messages, key) ?? ownValue(EN_MESSAGES, key) ?? String(key);
    return String(message).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name) => {
      const value = ownValue(params, name);
      return value == null ? placeholder : String(value);
    });
  }
  function translateComponent(localeId, name) {
    if (typeof name !== "string" || !name) return translate(localeId, "unknownComponent");
    const locale = LOCALES[matchLocale(localeId) || "en"];
    return ownValue(locale.componentNames, name) ?? ownValue(LOCALES.en.componentNames, name) ?? name;
  }
  function translateGroup(localeId, name) {
    const group = typeof name === "string" && name ? name : "Other";
    const locale = LOCALES[matchLocale(localeId) || "en"];
    return ownValue(locale.groupNames, group) ?? ownValue(LOCALES.en.groupNames, group) ?? group;
  }

  // src/layout.js
  var ADAPTERS = {
    chatgpt: ["#app-shell-sidebar", "#stage-slideover-sidebar", "#stage-sidebar-tiny-bar", '[data-testid="sidebar"]'],
    leopard: [
      "#stage-slideover-sidebar",
      "#stage-slidover-sidebar",
      "#stage-sidebar-tiny-bar",
      '[data-testid="stage-slideover-sidebar"]',
      '[data-testid="stage-slidover-sidebar"]',
      '[data-testid="stage-sidebar-tiny-bar"]',
      '[data-testid="sidebar"]'
    ]
  };
  function adapterFor(hostname) {
    return hostname === "chatgpt.com" ? "chatgpt" : "leopard";
  }
  function chooseSidebar(rects, width, height) {
    return rects.filter((r) => r.visible && r.width > 0 && r.height > Math.min(160, height * 0.25) && r.right > 0 && r.left <= width * 0.15 && r.right <= width * 0.65).sort((a, b) => b.right - a.right)[0] || null;
  }
  function calculatePlacement({
    width,
    height,
    offsetLeft = 0,
    offsetTop = 0,
    sidebarRight = 0,
    launcherWidth = 180,
    launcherHeight = 38,
    position = "auto",
    safeLeft = 0,
    safeRight = 0,
    safeTop = 0,
    safeBottom = 0
  }) {
    const gap = width < 768 ? 10 : 14;
    const leftGap = Math.max(gap, safeLeft), rightGap = Math.max(gap, safeRight);
    const topGap = Math.max(gap, safeTop), bottomGap = Math.max(gap, safeBottom);
    const panelWidth = Math.max(0, Math.min(392, width - leftGap - rightGap));
    const desired = position === "right" ? width - rightGap - launcherWidth : position === "left" || width < 768 ? leftGap : Math.max(leftGap, sidebarRight + gap);
    const left = Math.max(leftGap, Math.min(desired, width - rightGap - launcherWidth));
    const panelLeft = Math.max(leftGap, Math.min(left, width - rightGap - panelWidth));
    return {
      left: offsetLeft + left,
      top: offsetTop + Math.max(topGap, height - bottomGap - launcherHeight),
      panelLeft: offsetLeft + panelLeft,
      panelTop: offsetTop + topGap,
      panelWidth,
      panelBottom: bottomGap + launcherHeight + 9,
      panelHeight: Math.max(40, Math.min(680, height - topGap - bottomGap - launcherHeight - 9))
    };
  }

  // src/transport.js
  var REQUEST_TIMEOUT = 15e3;
  function request(url, responseType = "text") {
    const error = (code2, status) => Object.assign(new Error(code2), { code: code2, status });
    if (new URL(url).origin !== "https://status.openai.com") return Promise.reject(error("errorNetwork"));
    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          timeout: REQUEST_TIMEOUT,
          responseType,
          anonymous: true,
          nocache: true,
          headers: { Accept: responseType === "json" ? "application/json" : "text/html" },
          onload(response) {
            if (response.status < 200 || response.status >= 300) return reject(error("errorHttp", response.status));
            if (responseType === "text") return resolve(String(response.responseText || response.response || ""));
            if (response.response && typeof response.response === "object") return resolve(response.response);
            try {
              resolve(JSON.parse(response.responseText));
            } catch {
              reject(error("errorParse"));
            }
          },
          ontimeout: () => reject(error("errorTimeout")),
          onerror: () => reject(error("errorNetwork")),
          onabort: () => reject(error("errorNetwork"))
        });
      });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    return fetch(url, { signal: controller.signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" }).then(async (response) => {
      if (!response.ok) throw error("errorHttp", response.status);
      try {
        return await (responseType === "json" ? response.json() : response.text());
      } catch {
        throw error(controller.signal.aborted ? "errorTimeout" : "errorParse");
      }
    }).catch((cause) => {
      throw cause?.code ? cause : error(controller.signal.aborted ? "errorTimeout" : "errorNetwork");
    }).finally(() => clearTimeout(timer));
  }

  // src/styles.js
  var styles = `
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
.launcher {display:flex; align-items:center; gap:8px; min-height:38px; max-width:240px;
  padding:8px 13px; border:1px solid var(--border); border-radius:24px;
  background:var(--card); color:var(--text); box-shadow:0 4px 16px #0002;
  font-weight:650; font-size:13px; line-height:1.35; user-select:none;
}
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
.note,.error,.empty {padding:10px; border:1px dashed var(--border); border-radius:9px;
  font-size:12px; color:var(--subtle)}
.note {margin-top:10px; border-color:var(--warn)} .error {color:var(--bad)}
.scope {color:var(--subtle); font-size:11px; margin-top:12px}
.footer {display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px;
  margin-top:12px; padding-top:10px; border-top:1px solid var(--border); font-size:11px; color:var(--subtle)}
a {color:var(--info); text-decoration:none} a:hover {text-decoration:underline}
.settings {padding:10px 14px; border-bottom:1px solid var(--border); display:grid; gap:8px}
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
  .launcher {min-height:36px; padding:8px 10px; max-width:160px; font-size:12px}
  .header {padding:11px 12px} .content {padding:11px 12px}
  .panel {border-radius:13px}
}
@media(prefers-reduced-motion:reduce) {*,*::before,*::after {animation:none!important; transition:none!important}}
`;

  // src/main.js
  var HOST_ID = "openai-status-companion";
  var OLD_HOST_ID = "openai-official-status-zh-widget";
  var SETTINGS_KEY = "openai-status-companion:preferences";
  var NOTICE_KEY = "openai-status-companion:last-notice";
  var REFRESH_INTERVAL = 6e4;
  var MIN_REQUEST_GAP = 15e3;
  var FOCUS_REFRESH_AGE = 45e3;
  var DISCOVERY_INTERVAL = 2e3;
  if (!document.getElementById(HOST_ID)) start();
  function start() {
    const settings = readSettings();
    let locale = resolveLocale(settings.language, document.documentElement.lang, navigator.languages);
    const t = (key, params) => translate(locale, key, params);
    let data = null, error = null, fetchedAt = 0, lastRequestAt = 0;
    let loading = false, expanded = false, settingsOpen = false;
    let pollTimer = 0, layoutTimer = 0, placementFrame = 0, toastTimer = 0;
    let fingerprint = "";
    let menuLocale = "", menuIds = [];
    try {
      fingerprint = sessionStorage.getItem(NOTICE_KEY) || "";
    } catch {
    }
    const host = document.createElement("div");
    host.id = HOST_ID;
    host.dataset.adapter = adapterFor(location.hostname);
    document.documentElement.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = styles;
    const launcher = el("button", "launcher loading");
    launcher.type = "button";
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "osc-panel");
    const launcherDot = el("span", "dot");
    launcherDot.setAttribute("aria-hidden", "true");
    const launcherText = el("span");
    launcher.append(launcherDot, launcherText);
    const panel = el("section", "panel");
    panel.id = "osc-panel";
    panel.hidden = true;
    panel.tabIndex = -1;
    const header = el("header", "header");
    const heading = el("div");
    const title = el("h2", "title");
    const source = el("div", "subtitle");
    heading.append(title, source);
    const actions = el("div", "actions");
    const settingsButton = iconButton("⚙");
    settingsButton.setAttribute("aria-expanded", "false");
    settingsButton.setAttribute("aria-controls", "osc-settings");
    const refreshButton = iconButton("↻");
    const closeButton = iconButton("×");
    actions.append(settingsButton, refreshButton, closeButton);
    header.append(heading, actions);
    const preferences = el("div", "settings");
    preferences.id = "osc-settings";
    preferences.hidden = true;
    const controls = {};
    for (const name of ["language", "theme", "position"]) {
      const label = el("label", "setting");
      const text2 = el("span");
      const select = document.createElement("select");
      select.name = name;
      label.append(text2, select);
      preferences.append(label);
      controls[name] = { select, text: text2 };
      select.addEventListener("change", () => {
        settings[name] = select.value;
        saveSettings(settings);
        updateChrome();
        renderContent();
        schedulePlacement();
      });
    }
    const optionKeys = {
      language: [["auto", "auto"], ...Object.entries(LOCALES).map(([id, l]) => [id, l.label])],
      theme: [["auto", "themeAuto"], ["light", "light"], ["dark", "dark"]],
      position: [["auto", "positionAuto"], ["left", "positionLeft"], ["right", "positionRight"]]
    };
    for (const [name, options] of Object.entries(optionKeys)) for (const [value, key] of options) {
      const option = document.createElement("option");
      option.value = value;
      option.dataset.message = key;
      controls[name].select.append(option);
    }
    const content = el("div", "content");
    launcherText.setAttribute("aria-live", "polite");
    panel.append(header, preferences, content);
    shadow.append(style, launcher, panel);
    launcher.addEventListener("click", () => setExpanded(!expanded));
    closeButton.addEventListener("click", () => {
      setExpanded(false);
      launcher.focus();
    });
    refreshButton.addEventListener("click", () => refresh(true));
    settingsButton.addEventListener("click", () => {
      settingsOpen = !settingsOpen;
      preferences.hidden = !settingsOpen;
      settingsButton.setAttribute("aria-expanded", String(settingsOpen));
    });
    shadow.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && expanded) {
        event.stopPropagation();
        setExpanded(false);
        launcher.focus();
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (expanded && !event.composedPath().includes(host)) setExpanded(false);
    }, { passive: true });
    function iconButton(symbol) {
      const button = el("button", "icon", symbol);
      button.type = "button";
      return button;
    }
    function errorText() {
      return t(error?.code && LOCALES.en.messages[error.code] ? error.code : "unknownError", { status: error?.status });
    }
    function setExpanded(next) {
      expanded = Boolean(next);
      panel.hidden = !expanded;
      launcher.setAttribute("aria-expanded", String(expanded));
      shadow.querySelector(".toast")?.remove();
      if (expanded) {
        renderContent();
        panel.focus({ preventScroll: true });
      }
      schedulePlacement();
    }
    function updateChrome() {
      locale = resolveLocale(settings.language, document.documentElement.lang, navigator.languages);
      host.lang = LOCALES[locale].lang;
      host.dir = LOCALES[locale].dir || "ltr";
      host.dataset.theme = siteTheme(settings.theme);
      title.textContent = t("title");
      panel.setAttribute("aria-label", t("details"));
      source.textContent = t(data?.source_mode === "compatibility-json" ? "sourceCompat" : "sourceLive");
      for (const [button, key] of [[settingsButton, "settings"], [refreshButton, "refresh"], [closeButton, "close"]]) {
        button.title = t(key);
        button.setAttribute("aria-label", t(key));
      }
      for (const [name, { select, text: text2 }] of Object.entries(controls)) {
        text2.textContent = t(name);
        for (const option of select.options) {
          option.textContent = name === "language" && option.value !== "auto" ? LOCALES[option.value].label : t(option.dataset.message);
        }
        select.value = settings[name];
      }
      const overall = getOverall(data?.status.indicator || "unknown");
      const label = data ? t(overall.shortKey) : loading ? t("loading") : t("unknown");
      const launcherLabel = error && data ? `${label} · ${t("cached")}` : label;
      if (launcherText.textContent !== launcherLabel) launcherText.textContent = launcherLabel;
      launcher.dataset.tone = data ? overall.tone : "muted";
      launcher.classList.toggle("stale", Boolean(error && data));
      launcher.classList.toggle("loading", loading);
      launcher.title = error ? data ? t("staleHint", { error: errorText() }) : t("unknownHint") : t("launcherHint", { status: data ? t(overall.key) : t("loading") });
      refreshButton.disabled = loading;
      content.setAttribute("aria-busy", String(loading));
      updateMenus();
    }
    function date(value) {
      const result = new Date(value);
      return Number.isNaN(result.getTime()) ? t("unknownTime") : new Intl.DateTimeFormat(
        LOCALES[locale].lang,
        { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }
      ).format(result);
    }
    function renderContent() {
      const wasOpen = content.querySelector("details")?.open || false;
      const focusKey = shadow.activeElement?.dataset.focusKey;
      const previousScroll = panel.scrollTop;
      const fragment = document.createDocumentFragment();
      if (document.getElementById(OLD_HOST_ID)) fragment.append(el("div", "note", t("oldVersionNotice")));
      if (!data) {
        fragment.append(el("div", error ? "error" : "empty", error ? t("fetchFailed", { error: errorText() }) : t("loading")));
      } else {
        const overall = getOverall(data.status.indicator);
        const abnormal = data.components.filter((item) => item.status !== "operational").sort((a, b) => getComponentStatus(b.status).level - getComponentStatus(a.status).level);
        const normal = data.components.length - abnormal.length;
        const box = el("div", "overall");
        box.dataset.tone = overall.tone;
        const dot = el("span", "dot");
        dot.setAttribute("aria-hidden", "true");
        const main = el("div", "overall-main");
        main.append(
          el("div", "overall-text", t(overall.key)),
          el("div", "meta", t("normalCount", { normal, total: data.components.length })),
          el("div", "meta", t(error ? "lastSuccess" : "fetchedAt", { time: date(fetchedAt) }))
        );
        box.append(dot, main);
        fragment.append(box);
        const section = el("section", "section");
        section.append(sectionTitle(t("components"), data.availability.components !== "verified" ? t("partlyVerified") : abnormal.length ? t("abnormalCount", { count: abnormal.length }) : t("allNormal")));
        if (abnormal.length) {
          const list = el("div", "list");
          abnormal.forEach((item) => list.append(component(item)));
          section.append(list);
        }
        const details = document.createElement("details");
        details.open = wasOpen;
        const summary = el("summary", "", t("allComponents", { count: data.components.length }));
        summary.dataset.focusKey = "component-summary";
        details.append(summary);
        const groups = el("div", "groups");
        const byId = new Map(data.components.map((item) => [item.id, item]));
        for (const group of data.component_groups) {
          groups.append(el("div", "group-name", `${translateGroup(locale, group.name)} · ${group.component_ids.length}`));
          const list = el("div", "list");
          group.component_ids.forEach((id) => {
            if (byId.has(id)) list.append(component(byId.get(id)));
          });
          groups.append(list);
        }
        details.append(groups);
        section.append(details);
        fragment.append(section);
        const incidents = data.incidents.filter((item) => !["resolved", "postmortem", "completed"].includes(item.status));
        const maintenances = data.scheduled_maintenances.filter((item) => !["completed", "cancelled", "canceled"].includes(item.status)).sort((a, b) => (Date.parse(a.scheduled_for) || 0) - (Date.parse(b.scheduled_for) || 0));
        const activity = el("section", "section");
        const verified = data.availability.incidents === "verified" && data.availability.maintenances === "verified";
        activity.append(sectionTitle(t("activity"), t(verified ? "verified" : "partlyVerified")));
        const overview = el("div", "activity");
        for (const [key, items] of [["incidents", incidents], ["maintenances", maintenances]]) {
          const row = el("div", "activity-row");
          row.append(el("span", "", t(key)), el(
            "span",
            "activity-value",
            data.availability[key] === "verified" ? items.length ? t("itemCount", { count: items.length }) : t("noItems") : t("unverified")
          ));
          overview.append(row);
        }
        activity.append(overview);
        for (const incident of incidents) activity.append(activityCard(incident, false));
        for (const maintenance of maintenances) activity.append(activityCard(maintenance, true));
        fragment.append(activity);
        if (data.source_mode === "compatibility-json") fragment.append(el("div", "note", t("compatWarning")));
        if (error) fragment.append(el("div", "note", t("staleWarning", { error: errorText(), time: date(fetchedAt) })));
        fragment.append(el("div", "scope", t("scopeNote")));
      }
      const footer = el("div", "footer");
      const officialLink = el("a", "", t("officialPage"));
      officialLink.href = STATUS_URL;
      officialLink.target = "_blank";
      officialLink.rel = "noopener noreferrer";
      officialLink.dataset.focusKey = "official-link";
      footer.append(el("span", "", t("autoRefresh", { seconds: REFRESH_INTERVAL / 1e3 })), officialLink);
      fragment.append(footer);
      content.replaceChildren(fragment);
      if (focusKey) [...content.querySelectorAll("[data-focus-key]")].find((item) => item.dataset.focusKey === focusKey)?.focus({ preventScroll: true });
      panel.scrollTop = previousScroll;
    }
    function component(item) {
      const row = el("div", "component");
      const status = getComponentStatus(item.status);
      row.append(el("span", "component-name", translateComponent(locale, item.name)), el("span", `badge ${status.tone}`, t(status.key)));
      return row;
    }
    function sectionTitle(left, right) {
      const row = el("div", "section-title");
      row.append(el("span", "", left), el("span", "", right));
      return row;
    }
    function activityCard(item, maintenance) {
      const box = el("article", `incident ${maintenance ? "maintenance" : ["major", "critical"].includes(item.impact) ? item.impact : ""}`);
      const name = el("div", "incident-name");
      const url = safeStatusUrl(item.url);
      if (url) {
        const link = el("a", "", item.name || t(maintenance ? "unnamedMaintenance" : "unnamedIncident"));
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.dataset.focusKey = `incident-${item.id}`;
        name.append(link);
      } else name.textContent = item.name || t(maintenance ? "unnamedMaintenance" : "unnamedIncident");
      const statusKey = `${maintenance ? "maintenance" : "incident"}_${item.status}`;
      const status = LOCALES.en.messages[statusKey] ? t(statusKey) : item.status || t("component_unknown");
      const impactKey = `impact_${item.impact}`;
      const impact = LOCALES.en.messages[impactKey] ? t(impactKey) : t("impact_unknown");
      box.append(name, el("div", "meta", t(maintenance ? "maintenanceStage" : "statusAndImpact", { status, impact })));
      if (maintenance) {
        const schedule = [];
        if (item.scheduled_for) schedule.push(t("scheduleStart", { time: date(item.scheduled_for) }));
        if (item.scheduled_until) schedule.push(t("scheduleEnd", { time: date(item.scheduled_until) }));
        box.append(el("div", "update", schedule.join("\n") || t("scheduleUnknown")));
      }
      const latest = findLatestUpdate(item.incident_updates);
      if (latest) box.append(el("div", "update", `${t("originalUpdate")}: ${latest.body || t("noDetails")}
${date(latest.display_at || latest.updated_at || latest.created_at)}`));
      return box;
    }
    async function refresh(force = false) {
      if (loading || !force && Date.now() - lastRequestAt < MIN_REQUEST_GAP) return;
      loading = true;
      lastRequestAt = Date.now();
      updateChrome();
      try {
        let next;
        try {
          next = normalizeOfficialSummary(parseOfficialPage(await request(STATUS_URL)));
        } catch (pageError) {
          const [summary, components] = await Promise.allSettled([
            request(`${STATUS_URL}api/v2/summary.json`, "json"),
            request(`${STATUS_URL}api/v2/components.json`, "json")
          ]);
          if (summary.status !== "fulfilled") throw summary.reason || pageError;
          next = normalizeCompatibility(summary.value, components.status === "fulfilled" ? components.value : null);
        }
        validateResponse(next);
        data = next;
        error = null;
        fetchedAt = Date.now();
        maybeNotify();
      } catch (cause) {
        error = cause;
      } finally {
        loading = false;
        updateChrome();
        if (expanded) renderContent();
        schedulePlacement();
        schedulePoll();
      }
    }
    function maybeNotify() {
      const incidentPart = data.incidents.map((item) => `${item.id}:${item.status}:${item.updated_at}`).sort();
      const maintenancePart = data.scheduled_maintenances.map((item) => `${item.id}:${item.status}:${item.updated_at}:${item.scheduled_for}`).sort();
      const next = JSON.stringify([data.status.indicator, incidentPart, maintenancePart]);
      if (fingerprint === next || data.source_mode !== "official-page") return;
      const previous = fingerprint;
      fingerprint = next;
      try {
        sessionStorage.setItem(NOTICE_KEY, next);
      } catch {
      }
      const overall = getOverall(data.status.indicator);
      if (expanded || !previous && overall.level === 0) return;
      showToast(`${t(previous ? "noticeUpdated" : "noticeInitial")}: ${t(overall.key)}`, overall.tone);
    }
    function showToast(message, tone) {
      clearTimeout(toastTimer);
      shadow.querySelector(".toast")?.remove();
      const toast = el("div", `toast ${tone}`, message);
      toast.setAttribute("role", "status");
      toast.addEventListener("click", () => setExpanded(true));
      shadow.append(toast);
      toastTimer = setTimeout(() => toast.remove(), 8e3);
    }
    function schedulePoll() {
      clearTimeout(pollTimer);
      if (!document.hidden) pollTimer = setTimeout(() => refresh(), REFRESH_INTERVAL);
    }
    const selectors = ADAPTERS[host.dataset.adapter].join(",");
    let observedSidebars = [];
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(schedulePlacement) : null;
    function discoverSidebars() {
      const next = [...document.querySelectorAll(selectors)];
      if (next.length !== observedSidebars.length || next.some((item, i) => item !== observedSidebars[i])) {
        resizeObserver?.disconnect();
        for (const item of observedSidebars) item.removeEventListener("transitionend", schedulePlacement);
        observedSidebars = next;
        for (const item of next) {
          resizeObserver?.observe(item);
          item.addEventListener("transitionend", schedulePlacement, { passive: true });
        }
      }
    }
    function schedulePlacement() {
      if (!placementFrame) placementFrame = requestAnimationFrame(() => {
        placementFrame = 0;
        place();
      });
    }
    function place() {
      if (!host.isConnected) document.documentElement.append(host);
      host.hidden = Boolean(document.fullscreenElement);
      discoverSidebars();
      const viewport = window.visualViewport;
      const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
      const offsetLeft = viewport?.offsetLeft || 0, offsetTop = viewport?.offsetTop || 0;
      const rects = observedSidebars.map((item) => {
        const rect = item.getBoundingClientRect();
        const computed = getComputedStyle(item);
        return { ...rect.toJSON(), visible: !item.hidden && computed.visibility !== "hidden" && computed.display !== "none" };
      });
      const sidebar = chooseSidebar(rects, width, height);
      const launcherRect = launcher.getBoundingClientRect();
      const hostStyle = getComputedStyle(host);
      const safeInset = (edge) => Number.parseFloat(hostStyle.getPropertyValue(`--safe-${edge}`)) || 0;
      const predecessor = document.getElementById(OLD_HOST_ID);
      const oldPanel = predecessor?.shadowRoot?.querySelector(".panel.open");
      const position = oldPanel?.getBoundingClientRect().height ? "right" : settings.position;
      const placement = calculatePlacement({
        width,
        height,
        offsetLeft,
        offsetTop,
        sidebarRight: sidebar?.right || 0,
        launcherWidth: launcherRect.width,
        launcherHeight: launcherRect.height,
        position,
        safeLeft: safeInset("left"),
        safeRight: safeInset("right"),
        safeTop: safeInset("top"),
        safeBottom: safeInset("bottom")
      });
      const oldRect = predecessor?.getBoundingClientRect();
      if (oldRect?.width && oldRect.height && placement.left < oldRect.right && placement.left + launcherRect.width > oldRect.left && placement.top + launcherRect.height > oldRect.top && placement.top < oldRect.bottom) {
        const lift = Math.min(placement.top - offsetTop - 10, launcherRect.height + 10);
        placement.top -= Math.max(0, lift);
        placement.panelBottom += Math.max(0, lift);
        placement.panelHeight = Math.max(40, placement.panelHeight - Math.max(0, lift));
      }
      host.style.left = `${placement.left}px`;
      host.style.top = `${placement.top}px`;
      host.style.bottom = "auto";
      host.style.setProperty("--panel-left", `${placement.panelLeft}px`);
      host.style.setProperty("--panel-width", `${placement.panelWidth}px`);
      host.style.setProperty("--panel-height", `${placement.panelHeight}px`);
      host.style.setProperty("--panel-bottom", `${Math.max(0, innerHeight - offsetTop - height) + placement.panelBottom}px`);
    }
    function layoutWatch() {
      clearTimeout(layoutTimer);
      if (document.hidden) return;
      place();
      layoutTimer = setTimeout(layoutWatch, DISCOVERY_INTERVAL);
    }
    const themeObserver = new MutationObserver(() => {
      const previousLocale = locale;
      updateChrome();
      if (expanded && previousLocale !== locale) renderContent();
      schedulePlacement();
    });
    const attributes = { attributes: true, attributeFilter: ["class", "style", "data-theme", "lang"] };
    themeObserver.observe(document.documentElement, attributes);
    if (document.body) themeObserver.observe(document.body, attributes);
    const mountObserver = new MutationObserver(() => {
      if (!host.isConnected) schedulePlacement();
    });
    mountObserver.observe(document.documentElement, { childList: true });
    const colorScheme = matchMedia("(prefers-color-scheme: dark)");
    colorScheme.addEventListener("change", () => {
      updateChrome();
      schedulePlacement();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearTimeout(pollTimer);
        clearTimeout(layoutTimer);
        return;
      }
      if (Date.now() - lastRequestAt >= FOCUS_REFRESH_AGE) refresh();
      else schedulePoll();
      layoutWatch();
    });
    const focusRefresh = () => {
      if (!document.hidden && Date.now() - lastRequestAt >= FOCUS_REFRESH_AGE) refresh();
    };
    window.addEventListener("focus", focusRefresh, { passive: true });
    window.addEventListener("online", focusRefresh, { passive: true });
    window.addEventListener("resize", schedulePlacement, { passive: true });
    window.visualViewport?.addEventListener("resize", schedulePlacement, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedulePlacement, { passive: true });
    window.addEventListener("pageshow", () => {
      schedulePoll();
      layoutWatch();
    });
    window.addEventListener("pagehide", () => {
      clearTimeout(pollTimer);
      clearTimeout(layoutTimer);
    });
    function updateMenus() {
      if (typeof GM_registerMenuCommand !== "function" || menuLocale === locale) return;
      if (menuIds.length && typeof GM_unregisterMenuCommand !== "function") return;
      for (const id of menuIds) GM_unregisterMenuCommand(id);
      menuIds = [
        GM_registerMenuCommand(t("refresh"), () => refresh(true)),
        GM_registerMenuCommand(t("menuToggle"), () => setExpanded(!expanded)),
        GM_registerMenuCommand(t("menuSettings"), () => {
          setExpanded(true);
          settingsOpen = true;
          preferences.hidden = false;
          settingsButton.setAttribute("aria-expanded", "true");
          controls.language.select.focus();
        })
      ].filter((id) => id != null);
      menuLocale = locale;
    }
    updateChrome();
    renderContent();
    place();
    layoutWatch();
    refresh();
  }
  function el(tag, className = "", text2) {
    const node = document.createElement(tag);
    node.className = className;
    if (text2 !== void 0) node.textContent = String(text2);
    return node;
  }
  function readSettings() {
    let saved = {};
    try {
      saved = typeof GM_getValue === "function" ? GM_getValue(SETTINGS_KEY, {}) : JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
    }
    if (!saved || typeof saved !== "object") saved = {};
    return {
      language: saved.language === "auto" || Object.hasOwn(LOCALES, saved.language) ? saved.language : "auto",
      theme: ["auto", "light", "dark"].includes(saved.theme) ? saved.theme : "auto",
      position: ["auto", "left", "right"].includes(saved.position) ? saved.position : "auto"
    };
  }
  function saveSettings(settings) {
    try {
      if (typeof GM_setValue === "function") GM_setValue(SETTINGS_KEY, settings);
      else localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
    }
  }
  function siteTheme(preference) {
    if (preference !== "auto") return preference;
    for (const node of [document.documentElement, document.body].filter(Boolean)) {
      const theme = node.getAttribute("data-theme");
      if (theme === "dark" || node.classList.contains("dark")) return "dark";
      if (theme === "light" || node.classList.contains("light")) return "light";
    }
    const scheme = getComputedStyle(document.documentElement).colorScheme.trim();
    if (scheme === "dark" || scheme === "light") return scheme;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
})();
