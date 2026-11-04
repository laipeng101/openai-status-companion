// ==UserScript==
// @name         OpenAI Status Companion
// @name:zh-CN   OpenAI 状态助手
// @name:zh-TW   OpenAI 狀態助手
// @name:es      Estado de OpenAI
// @name:hi      OpenAI स्थिति सहायक
// @name:pt-BR   Status da OpenAI
// @name:ja      OpenAI ステータスアシスタント
// @name:ko      OpenAI 상태 도우미
// @name:fr      État des services OpenAI
// @name:de      OpenAI-Statusanzeige
// @name:id      Pendamping Status OpenAI
// @name:ar      مساعد حالة OpenAI
// @name:ru      Статус OpenAI
// @namespace    https://github.com/laipeng101/openai-status-companion
// @version      2.1.2
// @description  Check OpenAI service status, incidents and scheduled maintenance on ChatGPT, Leopard-X and Mana-X. Choose from 13 interface languages and set the theme and button position.
// @description:zh-CN 在 ChatGPT、Leopard-X 和 Mana-X 查看 OpenAI 服务状态、异常和计划维护。支持 13 种界面语言，可设置主题和按钮位置。
// @description:zh-TW 在 ChatGPT、Leopard-X 和 Mana-X 查看 OpenAI 服務狀態、異常及預定維護。支援 13 種介面語言，可設定主題和按鈕位置。
// @description:es Consulta el estado de los servicios de OpenAI, los incidentes y el mantenimiento programado en ChatGPT, Leopard-X y Mana-X. Elige entre 13 idiomas y ajusta el tema y la posición del botón.
// @description:hi ChatGPT, Leopard-X और Mana-X में OpenAI सेवाओं की स्थिति, समस्याएँ और तय रखरखाव देखें। इंटरफ़ेस 13 भाषाओं में उपलब्ध है। थीम और बटन की जगह चुनें।
// @description:pt-BR Confira o status dos serviços da OpenAI, os incidentes e a manutenção programada no ChatGPT, Leopard-X e Mana-X. Escolha entre 13 idiomas e ajuste o tema e a posição do botão.
// @description:ja ChatGPT、Leopard-X、Mana-X で OpenAI の稼働状況、障害、メンテナンス予定を確認できます。表示言語は 13 種類から選べます。テーマとボタンの位置も変更できます。
// @description:ko ChatGPT, Leopard-X, Mana-X에서 OpenAI 서비스 상태, 장애 및 예정된 점검을 확인하세요. 13개 언어를 지원하며 테마와 버튼 위치를 바꿀 수 있습니다.
// @description:fr Consultez l’état des services OpenAI, les incidents et les maintenances planifiées dans ChatGPT, Leopard-X et Mana-X. Choisissez parmi 13 langues et réglez le thème et la position du bouton.
// @description:de Dienststatus, Störungen und geplante Wartungen von OpenAI in ChatGPT, Leopard-X und Mana-X anzeigen. 13 Sprachen sowie Einstellungen für Design und Schaltflächenposition.
// @description:id Lihat status layanan OpenAI, gangguan, dan jadwal pemeliharaan di ChatGPT, Leopard-X, dan Mana-X. Pilih dari 13 bahasa serta atur tema dan posisi tombol.
// @description:ar اعرض حالة خدمات OpenAI ومشكلاتها ومواعيد الصيانة في ChatGPT وLeopard-X وMana-X. اختر من بين 13 لغة للواجهة وحدد المظهر وموضع الزر.
// @description:ru Статус сервисов OpenAI, текущие сбои и плановое техобслуживание в ChatGPT, Leopard-X и Mana-X. Выберите язык интерфейса (всего 13), тему и положение кнопки.
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

  // src/locales/en.js
  var en_default = {
    label: "English",
    lang: "en",
    dir: "ltr",
    messages: {
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
      components: "Service components",
      activity: "Incidents and maintenance",
      allNormal: "All operational",
      abnormalCount: "{count} affected",
      normalCount: "{normal}/{total} components operational",
      allComponents: "View all {count} components",
      componentGroup: "{group} · {count}",
      expand: "Expand",
      collapse: "Collapse",
      incidents: "Unresolved incidents",
      maintenances: "Scheduled maintenance",
      ongoingIncidents: "Ongoing incidents",
      verified: "Verified",
      partlyVerified: "Some data unverified",
      unverified: "Unverified",
      noItems: "None",
      itemCount: "{count}",
      fetchedAt: "Last checked (local time): {time}",
      lastSuccess: "Last successful check (local time): {time}",
      autoRefresh: "Status updates every {seconds} seconds",
      officialPage: "Open official status page ↗",
      sourceLive: "Source: status.openai.com",
      sourceCompat: "Source: status.openai.com (legacy API)",
      compatWarning: "The status page could not be read, so data from the legacy status API is shown. Some sections may be incomplete.",
      fetchFailed: "Could not fetch OpenAI status: {error}. Check your connection and try refreshing.",
      staleWarning: "Refresh failed ({error}). Showing data from {time}.",
      cachedStatus: "{status} · cached",
      scopeNote: "OpenAI reports overall availability across all plans, models and types of errors. Your experience may vary by plan and feature. This userscript is an independent project.",
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
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "Maintenance times unavailable",
      noticeUpdated: "OpenAI status updated: {status}",
      noticeInitial: "OpenAI status notice: {status}",
      launcherHint: "{status}. Open the panel for details.",
      unknownHint: "Could not check OpenAI status. Open the panel to retry.",
      staleHint: "Refresh failed ({error}). Open the panel to see cached data or retry.",
      unknownError: "Unknown error",
      errorHttp: "Official status request returned HTTP {status}",
      errorTimeout: "Official status request timed out",
      errorNetwork: "Could not connect to the official status page",
      errorParse: "Official status data could not be parsed",
      errorSchema: "Official status data has an unexpected format",
      errorEmpty: "The official status page was empty",
      errorSummary: "No official status summary was found",
      errorIncomplete: "The official status summary was incomplete",
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
      short_major: "Partial outage",
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
    },
    componentNames: {},
    groupNames: { Other: "Other components" }
  };

  // src/locales/zh-CN.js
  var zh_CN_default = {
    label: "简体中文",
    lang: "zh-CN",
    dir: "ltr",
    messages: {
      title: "OpenAI 服务状态",
      details: "OpenAI 服务状态详情",
      loading: "正在查询 OpenAI 服务状态…",
      unknown: "暂时无法获取状态",
      refresh: "立即刷新",
      close: "收起面板",
      open: "打开状态面板",
      language: "语言",
      auto: "自动（优先跟随网页）",
      theme: "主题",
      themeAuto: "跟随网站",
      light: "浅色",
      dark: "深色",
      position: "位置",
      positionAuto: "跟随侧边栏",
      positionLeft: "左下角",
      positionRight: "右下角",
      components: "服务组件",
      activity: "服务异常与维护",
      allNormal: "全部正常",
      abnormalCount: "{count} 个组件受影响",
      normalCount: "{normal}/{total} 个组件运行正常",
      allComponents: "查看全部 {count} 个组件",
      componentGroup: "{group}（{count} 项）",
      expand: "展开",
      collapse: "收起",
      incidents: "尚未解决的服务异常",
      maintenances: "计划维护",
      ongoingIncidents: "尚未解决的服务异常",
      verified: "已核验",
      partlyVerified: "有数据未核验",
      unverified: "未核验",
      noItems: "无",
      itemCount: "{count} 项",
      fetchedAt: "查询时间（本地时间）：{time}",
      lastSuccess: "上次查询成功（本地时间）：{time}",
      autoRefresh: "每 {seconds} 秒更新状态",
      officialPage: "打开官方状态页 ↗",
      sourceLive: "数据来源：status.openai.com",
      sourceCompat: "数据来源：status.openai.com（旧版接口）",
      compatWarning: "暂时无法读取官方状态页，现显示旧版接口提供的数据。部分信息可能缺失。",
      fetchFailed: "无法获取 OpenAI 服务状态（{error}）。请检查网络连接后重试。",
      staleWarning: "刷新失败（{error}）。当前显示 {time} 获取的数据。",
      cachedStatus: "{status}（缓存）",
      scopeNote: "OpenAI 汇总各套餐、模型和错误类型的数据，公布整体服务可用性。实际使用情况可能因套餐和功能而异。本脚本由第三方独立开发。",
      originalUpdate: "最新官方通报（原文）",
      unknownTime: "时间未知",
      unknownComponent: "未知组件",
      unnamedIncident: "服务异常（无标题）",
      unnamedMaintenance: "维护（无标题）",
      noDetails: "暂无说明",
      statusAndImpact: "状态：{status} · 影响：{impact}",
      maintenanceStage: "状态：{status} · 计划维护",
      scheduleStart: "计划开始：{time}",
      scheduleEnd: "计划结束：{time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "暂无维护时间信息",
      noticeUpdated: "OpenAI 服务状态已更新：{status}",
      noticeInitial: "OpenAI 服务状态提醒：{status}",
      launcherHint: "{status}。打开面板查看详情。",
      unknownHint: "暂时无法获取 OpenAI 服务状态。打开面板后可重试。",
      staleHint: "刷新失败（{error}）。打开面板可查看缓存数据或重试。",
      unknownError: "未知错误",
      errorHttp: "官方服务器返回 HTTP {status}",
      errorTimeout: "获取官方状态超时",
      errorNetwork: "无法连接 OpenAI 官方状态页",
      errorParse: "官方状态数据无法解析",
      errorSchema: "官方状态数据格式不符合预期",
      errorEmpty: "官方状态页面内容为空",
      errorSummary: "未找到官方状态摘要",
      errorIncomplete: "官方状态摘要不完整",
      menuToggle: "展开 / 收起 OpenAI 状态面板",
      menuSettings: "OpenAI 状态偏好设置",
      settings: "偏好设置",
      preferencesSaved: "偏好设置已保存",
      exportLayout: "导出安全页面结构",
      exported: "安全页面结构已导出",
      privacyLayout: "仅导出页面布局结构，不含页面文字、表单值、链接、Cookie、存储内容或网络数据。",
      overall_none: "所有系统运行正常",
      short_none: "OpenAI 正常",
      overall_minor: "服务轻微异常",
      short_minor: "轻微异常",
      overall_major: "部分系统中断",
      short_major: "部分中断",
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
      incident_monitoring: "正在监测服务恢复情况",
      incident_observing: "正在观察恢复情况",
      incident_resolved: "已解决",
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
    },
    componentNames: {
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
      "Codex in ChatGPT Desktop": "ChatGPT 桌面应用中的 Codex",
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
    },
    groupNames: {
      APIs: "APIs",
      ChatGPT: "ChatGPT",
      Codex: "Codex",
      FedRAMP: "FedRAMP",
      "Ads Platform": "广告平台",
      Other: "其他组件"
    }
  };

  // src/locales/zh-TW.js
  var zh_TW_default = {
    label: "繁體中文",
    lang: "zh-TW",
    dir: "ltr",
    messages: {
      title: "OpenAI 服務狀態",
      details: "OpenAI 服務狀態詳情",
      loading: "正在查詢 OpenAI 服務狀態…",
      unknown: "暫時無法取得狀態",
      refresh: "立即重新整理",
      close: "收合面板",
      open: "開啟狀態面板",
      language: "語言",
      auto: "自動（優先跟隨網頁）",
      theme: "主題",
      themeAuto: "跟隨網站",
      light: "淺色",
      dark: "深色",
      position: "位置",
      positionAuto: "跟隨側邊欄",
      positionLeft: "左下角",
      positionRight: "右下角",
      components: "服務元件",
      activity: "服務異常與維護",
      allNormal: "全部正常",
      abnormalCount: "{count} 個元件受影響",
      normalCount: "{normal}/{total} 個元件正常運作",
      allComponents: "檢視全部 {count} 個元件",
      componentGroup: "{group}（{count} 項）",
      expand: "展開",
      collapse: "收合",
      incidents: "尚未解決的服務異常",
      maintenances: "預定維護",
      ongoingIncidents: "處理中的服務異常",
      verified: "已核實",
      partlyVerified: "有資料未核實",
      unverified: "未核實",
      noItems: "無",
      itemCount: "{count} 項",
      fetchedAt: "查詢時間（本機時間）：{time}",
      lastSuccess: "上次查詢成功（本機時間）：{time}",
      autoRefresh: "每 {seconds} 秒更新狀態",
      officialPage: "開啟官方狀態頁 ↗",
      sourceLive: "資料來源：status.openai.com",
      sourceCompat: "資料來源：status.openai.com（舊版 API）",
      compatWarning: "暫時無法讀取官方狀態頁，目前顯示舊版 API 提供的資料。部分資訊可能缺漏。",
      fetchFailed: "無法取得 OpenAI 服務狀態（{error}）。請檢查網路連線後再試一次。",
      staleWarning: "重新整理失敗（{error}）。目前顯示 {time} 取得的資料。",
      cachedStatus: "{status}（快取）",
      scopeNote: "OpenAI 彙整各方案、模型與錯誤類型的資料，公布整體服務可用性。實際使用情況可能因方案及功能而異。本腳本由第三方獨立開發。",
      originalUpdate: "最新官方公告（原文）",
      unknownTime: "時間未知",
      unknownComponent: "未知元件",
      unnamedIncident: "服務異常（無標題）",
      unnamedMaintenance: "維護（無標題）",
      noDetails: "暫無說明",
      statusAndImpact: "狀態：{status} · 影響：{impact}",
      maintenanceStage: "狀態：{status} · 預定維護",
      scheduleStart: "預定開始：{time}",
      scheduleEnd: "預定結束：{time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "目前沒有維護時間資訊",
      noticeUpdated: "OpenAI 官方狀態已更新：{status}",
      noticeInitial: "OpenAI 官方狀態通知：{status}",
      launcherHint: "{status}。開啟面板可查看詳情。",
      unknownHint: "暫時無法取得 OpenAI 服務狀態。開啟面板後可再試一次。",
      staleHint: "重新整理失敗（{error}）。開啟面板可查看快取資料或再試一次。",
      unknownError: "未知錯誤",
      errorHttp: "官方伺服器傳回 HTTP {status}",
      errorTimeout: "取得官方狀態逾時",
      errorNetwork: "無法連線至官方狀態頁",
      errorParse: "無法解析官方狀態資料",
      errorSchema: "官方狀態資料格式不符預期",
      errorEmpty: "官方狀態頁內容為空",
      errorSummary: "找不到官方狀態摘要",
      errorIncomplete: "官方狀態摘要不完整",
      menuToggle: "展開 / 收合 OpenAI 狀態面板",
      menuSettings: "OpenAI 狀態偏好設定",
      settings: "偏好設定",
      preferencesSaved: "已儲存偏好設定",
      exportLayout: "匯出安全頁面結構",
      exported: "已匯出安全頁面結構",
      privacyLayout: "僅匯出頁面配置結構，不含頁面文字、表單值、連結、Cookie、儲存內容或網路資料。",
      overall_none: "所有系統正常運作",
      short_none: "OpenAI 正常",
      overall_minor: "服務輕微異常",
      short_minor: "輕微異常",
      overall_major: "部分系統中斷",
      short_major: "部分中斷",
      overall_critical: "重大服務中斷",
      short_critical: "嚴重中斷",
      overall_maintenance: "服務維護中",
      short_maintenance: "維護中",
      overall_unknown: "官方狀態未知",
      short_unknown: "狀態未知",
      component_operational: "正常運作",
      component_degraded_performance: "效能下降",
      component_partial_outage: "部分中斷",
      component_major_outage: "重大中斷",
      component_full_outage: "完全中斷",
      component_under_maintenance: "維護中",
      component_unknown: "狀態未知",
      incident_investigating: "調查中",
      incident_identified: "已確認問題",
      incident_fixing: "修復中",
      incident_monitoring: "監測服務復原狀況",
      incident_observing: "正在觀察復原狀況",
      incident_resolved: "已解決",
      incident_postmortem: "事後檢討",
      maintenance_scheduled: "已排定",
      maintenance_upcoming: "即將開始",
      maintenance_in_progress: "進行中",
      maintenance_ongoing: "進行中",
      maintenance_verifying: "驗證中",
      maintenance_completed: "已完成",
      impact_none: "無影響",
      impact_minor: "輕微影響",
      impact_major: "重大影響",
      impact_critical: "嚴重影響",
      impact_maintenance: "排定維護",
      impact_unknown: "影響未知"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "登入",
      Images: "圖片",
      Responses: "Responses API",
      Audio: "音訊",
      Files: "檔案",
      Search: "搜尋",
      Sora: "Sora",
      "Fine-tuning": "微調",
      "Deep Research": "深度研究",
      Realtime: "Realtime API",
      "Voice mode": "語音模式",
      Batch: "批次處理",
      Embeddings: "嵌入",
      Moderations: "內容審核",
      "Codex Web": "Codex 網頁版",
      "Codex in ChatGPT Desktop": "ChatGPT 桌面應用程式中的 Codex",
      "Connectors/Apps": "連接器 / 應用程式",
      "VS Code extension": "VS Code 擴充功能",
      "Codex API": "Codex API",
      Sites: "工作站",
      Agent: "智慧體",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "檔案上傳",
      "Ads Manager": "廣告管理員",
      CLI: "命令列工具（CLI）",
      Conversations: "對話",
      GPTs: "GPTs",
      "Image Generation": "圖片生成",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "空間"
    },
    groupNames: { APIs: "APIs", ChatGPT: "ChatGPT", Codex: "Codex", FedRAMP: "FedRAMP", "Ads Platform": "廣告平台", Other: "其他元件" }
  };

  // src/locales/es.js
  var es_default = {
    label: "Español",
    lang: "es",
    dir: "ltr",
    messages: {
      title: "Estado de OpenAI",
      details: "Detalles del estado de OpenAI",
      loading: "Consultando el estado de OpenAI…",
      unknown: "Estado de OpenAI desconocido",
      refresh: "Actualizar ahora",
      close: "Cerrar panel",
      open: "Abrir panel de estado",
      language: "Idioma",
      auto: "Automático",
      theme: "Tema",
      themeAuto: "Según el sitio web",
      light: "Claro",
      dark: "Oscuro",
      position: "Posición",
      positionAuto: "Junto a la barra lateral",
      positionLeft: "Esquina inferior izquierda",
      positionRight: "Esquina inferior derecha",
      components: "Componentes oficiales",
      activity: "Incidentes y mantenimiento",
      allNormal: "Todos operativos",
      abnormalCount: "Componentes afectados: {count}",
      normalCount: "{normal}/{total} componentes operativos",
      allComponents: "Ver los {count} componentes",
      componentGroup: "{group} · {count}",
      expand: "Expandir",
      collapse: "Contraer",
      incidents: "Incidentes sin resolver",
      maintenances: "Mantenimiento programado",
      ongoingIncidents: "Incidentes en curso",
      verified: "Verificado",
      partlyVerified: "Datos sin verificar",
      unverified: "Sin verificar",
      noItems: "Ninguno",
      itemCount: "{count}",
      fetchedAt: "Consultado (hora local): {time}",
      lastSuccess: "Última actualización correcta (hora local): {time}",
      autoRefresh: "El estado se actualiza cada {seconds} segundos",
      officialPage: "Abrir página oficial de estado ↗",
      sourceLive: "Fuente: status.openai.com",
      sourceCompat: "Fuente: status.openai.com (API anterior)",
      compatWarning: "No se pudo leer la página de estado. Se muestran los datos de la API anterior. Es posible que falte información en algunas secciones.",
      fetchFailed: "No se pudo consultar el estado de OpenAI: {error}. Comprueba la conexión e intenta actualizar.",
      staleWarning: "Error al actualizar ({error}). Se muestran los datos obtenidos correctamente el {time}.",
      cachedStatus: "{status} · en caché",
      scopeNote: "OpenAI publica la disponibilidad general de sus servicios a partir de datos de todos los planes, modelos y tipos de error. Tu experiencia puede variar según el plan y las funciones que uses. Este script es un proyecto independiente.",
      originalUpdate: "Última actualización oficial (texto original)",
      unknownTime: "Hora desconocida",
      unknownComponent: "Componente desconocido",
      unnamedIncident: "Incidente sin nombre",
      unnamedMaintenance: "Mantenimiento sin nombre",
      noDetails: "No hay detalles disponibles",
      statusAndImpact: "Estado: {status} · Impacto: {impact}",
      maintenanceStage: "Estado: {status} · Mantenimiento programado",
      scheduleStart: "Inicio programado: {time}",
      scheduleEnd: "Fin programado: {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "Horario de mantenimiento no disponible",
      noticeUpdated: "Estado de OpenAI actualizado: {status}",
      noticeInitial: "Aviso de estado de OpenAI: {status}",
      launcherHint: "{status}. Abre el panel para ver los detalles.",
      unknownHint: "No se pudo consultar el estado de OpenAI. Abre el panel para volver a intentarlo.",
      staleHint: "No se pudo actualizar el estado de OpenAI: {error}. Abre el panel para ver los últimos datos o volver a intentarlo.",
      unknownError: "Error desconocido",
      errorHttp: "La consulta del estado oficial devolvió HTTP {status}",
      errorTimeout: "Se agotó el tiempo de espera de la consulta del estado oficial",
      errorNetwork: "No se pudo conectar con la página oficial de estado",
      errorParse: "No se pudieron interpretar los datos oficiales de estado",
      errorSchema: "Los datos oficiales de estado tienen un formato inesperado",
      errorEmpty: "La página oficial de estado estaba vacía",
      errorSummary: "No se encontró el resumen oficial del estado",
      errorIncomplete: "El resumen oficial del estado estaba incompleto",
      menuToggle: "Mostrar / ocultar el panel de estado de OpenAI",
      menuSettings: "Preferencias del estado de OpenAI",
      settings: "Preferencias",
      preferencesSaved: "Preferencias guardadas",
      exportLayout: "Exportar estructura segura de la página",
      exported: "Estructura segura de la página exportada",
      privacyLayout: "Solo se exporta información estructural de la página. No se incluyen textos, valores de formularios, enlaces, cookies, contenido almacenado ni datos de red.",
      overall_none: "Todos los sistemas funcionan con normalidad",
      short_none: "OpenAI operativo",
      overall_minor: "Incidencia leve en el servicio",
      short_minor: "Incidencia leve",
      overall_major: "Interrupción parcial de los sistemas",
      short_major: "Interrupción parcial",
      overall_critical: "Interrupción crítica del servicio",
      short_critical: "Fallo crítico",
      overall_maintenance: "Mantenimiento del servicio en curso",
      short_maintenance: "Mantenimiento",
      overall_unknown: "Estado oficial desconocido",
      short_unknown: "Estado desconocido",
      component_operational: "Operativo",
      component_degraded_performance: "Rendimiento reducido",
      component_partial_outage: "Interrupción parcial",
      component_major_outage: "Interrupción grave",
      component_full_outage: "Interrupción total",
      component_under_maintenance: "En mantenimiento",
      component_unknown: "Estado desconocido",
      incident_investigating: "En investigación",
      incident_identified: "Problema identificado",
      incident_fixing: "Corrección en curso",
      incident_monitoring: "Supervisando la recuperación",
      incident_observing: "Observando la recuperación",
      incident_resolved: "Resuelto",
      incident_postmortem: "Análisis posterior al incidente",
      maintenance_scheduled: "Programado",
      maintenance_upcoming: "Próximamente",
      maintenance_in_progress: "En curso",
      maintenance_ongoing: "En curso",
      maintenance_verifying: "En verificación",
      maintenance_completed: "Completado",
      impact_none: "Sin impacto",
      impact_minor: "Impacto leve",
      impact_major: "Impacto alto",
      impact_critical: "Impacto crítico",
      impact_maintenance: "Mantenimiento programado",
      impact_unknown: "Impacto desconocido"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "Inicio de sesión",
      Images: "Imágenes",
      Responses: "Responses API",
      Audio: "Audio",
      Files: "Archivos",
      Search: "Búsqueda",
      Sora: "Sora",
      "Fine-tuning": "Ajuste fino",
      "Deep Research": "Investigación en profundidad",
      Realtime: "Realtime API",
      "Voice mode": "Modo de voz",
      Batch: "Batch API",
      Embeddings: "Embeddings",
      Moderations: "Moderación",
      "Codex Web": "Codex web",
      "Codex in ChatGPT Desktop": "Codex en ChatGPT de escritorio",
      "Connectors/Apps": "Conectores / Aplicaciones",
      "VS Code extension": "Extensión de VS Code",
      "Codex API": "Codex API",
      Sites: "Sitios",
      Agent: "Agente",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "Carga de archivos",
      "Ads Manager": "Administrador de anuncios",
      CLI: "Línea de comandos (CLI)",
      Conversations: "Conversaciones",
      GPTs: "GPTs",
      "Image Generation": "Generación de imágenes",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "ChatGPT Espacio"
    },
    groupNames: {
      APIs: "APIs",
      ChatGPT: "ChatGPT",
      Codex: "Codex",
      FedRAMP: "FedRAMP",
      "Ads Platform": "Plataforma de anuncios",
      Other: "Otros componentes"
    }
  };

  // src/locales/hi.js
  var hi_default = {
    label: "हिन्दी",
    lang: "hi",
    dir: "ltr",
    messages: {
      title: "OpenAI सेवाओं की स्थिति",
      details: "OpenAI सेवाओं की स्थिति का विवरण",
      loading: "OpenAI सेवाओं की स्थिति देख रहे हैं…",
      unknown: "OpenAI की स्थिति अज्ञात",
      refresh: "अभी रीफ़्रेश करें",
      close: "पैनल बंद करें",
      open: "स्थिति पैनल खोलें",
      language: "भाषा",
      auto: "पेज / ब्राउज़र के अनुसार",
      theme: "थीम",
      themeAuto: "वेबसाइट के अनुसार",
      light: "हल्की",
      dark: "गहरी",
      position: "स्थान",
      positionAuto: "साइडबार के पास",
      positionLeft: "नीचे बाईं ओर",
      positionRight: "नीचे दाईं ओर",
      components: "सेवा के घटकों की स्थिति",
      activity: "सेवा की समस्याएँ और रखरखाव",
      allNormal: "सभी घटक ठीक से काम कर रहे हैं",
      abnormalCount: "प्रभावित घटक: {count}",
      normalCount: "{total} में से {normal} घटक ठीक से काम कर रहे हैं",
      allComponents: "सभी {count} घटक देखें",
      componentGroup: "{group} · {count}",
      expand: "खोलें",
      collapse: "समेटें",
      incidents: "सेवा की अनसुलझी समस्याएँ",
      maintenances: "निर्धारित रखरखाव",
      ongoingIncidents: "सेवा की मौजूदा समस्याएँ",
      verified: "सत्यापित",
      partlyVerified: "कुछ जानकारी की पुष्टि नहीं हो सकी",
      unverified: "पुष्टि नहीं हो सकी",
      noItems: "कोई नहीं",
      itemCount: "{count}",
      fetchedAt: "डेटा मिलने का समय (स्थानीय समय): {time}",
      lastSuccess: "पिछला सफल अपडेट (स्थानीय समय): {time}",
      autoRefresh: "स्थिति हर {seconds} सेकंड में अपडेट होती है",
      officialPage: "आधिकारिक स्थिति पेज खोलें ↗",
      sourceLive: "डेटा का स्रोत: status.openai.com",
      sourceCompat: "डेटा का स्रोत: status.openai.com (पुराना API)",
      compatWarning: "स्थिति पेज पढ़ा नहीं जा सका। यहाँ पुराने API से मिला डेटा दिख रहा है। कुछ जानकारी उपलब्ध नहीं हो सकती।",
      fetchFailed: "OpenAI की स्थिति प्राप्त नहीं हुई: {error}। अपना कनेक्शन जाँचें और फिर रीफ़्रेश करें।",
      staleWarning: "रीफ़्रेश विफल ({error})। {time} पर सफलतापूर्वक प्राप्त डेटा दिखाया जा रहा है।",
      cachedStatus: "{status} · कैश",
      scopeNote: "आधिकारिक उपलब्धता सभी प्लान, मॉडल और त्रुटि प्रकारों को मिलाकर बताई जाती है। आपका अनुभव प्लान और सुविधा के अनुसार अलग हो सकता है। यह एक स्वतंत्र यूज़रस्क्रिप्ट है, OpenAI का उत्पाद नहीं।",
      originalUpdate: "नवीनतम आधिकारिक अपडेट (मूल पाठ)",
      unknownTime: "समय अज्ञात",
      unknownComponent: "अज्ञात घटक",
      unnamedIncident: "बिना शीर्षक की समस्या",
      unnamedMaintenance: "बिना नाम का रखरखाव",
      noDetails: "कोई विवरण उपलब्ध नहीं",
      statusAndImpact: "स्थिति: {status} · प्रभाव: {impact}",
      maintenanceStage: "स्थिति: {status} · निर्धारित रखरखाव",
      scheduleStart: "निर्धारित शुरुआत: {time}",
      scheduleEnd: "निर्धारित समाप्ति: {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "रखरखाव का समय उपलब्ध नहीं है",
      noticeUpdated: "OpenAI की स्थिति अपडेट हुई: {status}",
      noticeInitial: "OpenAI की स्थिति की सूचना: {status}",
      launcherHint: "{status}। विवरण देखने के लिए पैनल खोलें।",
      unknownHint: "OpenAI सेवाओं की स्थिति नहीं देखी जा सकी। फिर से कोशिश करने के लिए पैनल खोलें।",
      staleHint: "OpenAI की स्थिति अपडेट नहीं हो सकी: {error}। पिछला डेटा देखने या फिर से कोशिश करने के लिए पैनल खोलें।",
      unknownError: "अज्ञात त्रुटि",
      errorHttp: "आधिकारिक स्थिति पेज से HTTP {status} मिला",
      errorTimeout: "आधिकारिक स्थिति पेज ने समय पर जवाब नहीं दिया",
      errorNetwork: "आधिकारिक स्थिति पेज से कनेक्ट नहीं हो सका",
      errorParse: "आधिकारिक स्थिति डेटा का प्रारूप पढ़ा नहीं जा सका",
      errorSchema: "आधिकारिक स्थिति डेटा का प्रारूप अपेक्षा से अलग है",
      errorEmpty: "आधिकारिक स्थिति पेज खाली था",
      errorSummary: "आधिकारिक स्थिति का सारांश नहीं मिला",
      errorIncomplete: "आधिकारिक स्थिति का सारांश अधूरा था",
      menuToggle: "OpenAI स्थिति पैनल खोलें / बंद करें",
      menuSettings: "OpenAI स्थिति की सेटिंग्स",
      settings: "सेटिंग्स",
      preferencesSaved: "सेटिंग्स सहेजी गईं",
      exportLayout: "सुरक्षित पेज लेआउट निर्यात करें",
      exported: "सुरक्षित पेज लेआउट निर्यात हुआ",
      privacyLayout: "केवल संरचनात्मक लेआउट की जानकारी निर्यात होती है। पेज का पाठ, फ़ॉर्म के मान, लिंक, कुकी, स्टोरेज सामग्री या नेटवर्क डेटा शामिल नहीं होते।",
      overall_none: "सभी प्रणालियाँ सामान्य रूप से चालू हैं",
      short_none: "OpenAI चालू",
      overall_minor: "सेवा में मामूली बाधा",
      short_minor: "मामूली बाधा",
      overall_major: "प्रणालियों में आंशिक रुकावट",
      short_major: "सेवा में आंशिक रुकावट",
      overall_critical: "सेवा में गंभीर रुकावट",
      short_critical: "गंभीर रुकावट",
      overall_maintenance: "सेवा का रखरखाव जारी है",
      short_maintenance: "रखरखाव",
      overall_unknown: "आधिकारिक स्थिति अज्ञात",
      short_unknown: "स्थिति अज्ञात",
      component_operational: "चालू",
      component_degraded_performance: "प्रदर्शन में गिरावट",
      component_partial_outage: "आंशिक रुकावट",
      component_major_outage: "गंभीर रुकावट",
      component_full_outage: "पूर्ण रुकावट",
      component_under_maintenance: "रखरखाव जारी",
      component_unknown: "स्थिति अज्ञात",
      incident_investigating: "जाँच जारी",
      incident_identified: "समस्या पहचानी गई",
      incident_fixing: "समस्या ठीक की जा रही है",
      incident_monitoring: "सेवा की बहाली पर नज़र रखी जा रही है",
      incident_observing: "सेवा की स्थिति पर नज़र रखी जा रही है",
      incident_resolved: "हल हो गई",
      incident_postmortem: "घटना के बाद की समीक्षा",
      maintenance_scheduled: "निर्धारित",
      maintenance_upcoming: "जल्द शुरू होगा",
      maintenance_in_progress: "जारी है",
      maintenance_ongoing: "जारी है",
      maintenance_verifying: "सत्यापन जारी",
      maintenance_completed: "पूरा हुआ",
      impact_none: "कोई प्रभाव नहीं",
      impact_minor: "मामूली प्रभाव",
      impact_major: "बड़ा प्रभाव",
      impact_critical: "गंभीर प्रभाव",
      impact_maintenance: "निर्धारित रखरखाव",
      impact_unknown: "प्रभाव अज्ञात"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "लॉगिन",
      Images: "चित्र",
      Responses: "Responses API",
      Audio: "ऑडियो",
      Files: "फ़ाइलें",
      Search: "खोज",
      Sora: "Sora",
      "Fine-tuning": "फ़ाइन-ट्यूनिंग",
      "Deep Research": "गहन शोध",
      Realtime: "Realtime API",
      "Voice mode": "वॉइस मोड",
      Batch: "Batch API",
      Embeddings: "Embeddings",
      Moderations: "सामग्री मॉडरेशन",
      "Codex Web": "Codex वेब",
      "Codex in ChatGPT Desktop": "ChatGPT डेस्कटॉप में Codex",
      "Connectors/Apps": "कनेक्टर / ऐप",
      "VS Code extension": "VS Code एक्सटेंशन",
      "Codex API": "Codex API",
      Sites: "Sites",
      Agent: "एजेंट",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "फ़ाइल अपलोड",
      "Ads Manager": "विज्ञापन प्रबंधक",
      CLI: "कमांड लाइन (CLI)",
      Conversations: "बातचीत",
      GPTs: "GPTs",
      "Image Generation": "चित्र निर्माण",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "Space"
    },
    groupNames: {
      APIs: "APIs",
      ChatGPT: "ChatGPT",
      Codex: "Codex",
      FedRAMP: "FedRAMP",
      "Ads Platform": "विज्ञापन प्लेटफ़ॉर्म",
      Other: "अन्य घटक"
    }
  };

  // src/locales/pt-BR.js
  var pt_BR_default = {
    label: "Português (Brasil)",
    lang: "pt-BR",
    dir: "ltr",
    messages: {
      title: "Status da OpenAI",
      details: "Detalhes do status da OpenAI",
      loading: "Obtendo status da OpenAI…",
      unknown: "Status da OpenAI desconhecido",
      refresh: "Atualizar agora",
      close: "Fechar painel",
      open: "Abrir painel de status",
      language: "Idioma",
      auto: "Automático",
      theme: "Tema",
      themeAuto: "Usar o tema do site",
      light: "Claro",
      dark: "Escuro",
      position: "Posição",
      positionAuto: "Ao lado da barra lateral",
      positionLeft: "Canto inferior esquerdo",
      positionRight: "Canto inferior direito",
      components: "Componentes oficiais",
      activity: "Incidentes e manutenção",
      allNormal: "Todos operacionais",
      abnormalCount: "Componentes afetados: {count}",
      normalCount: "{normal}/{total} componentes operacionais",
      allComponents: "Ver todos os {count} componentes",
      componentGroup: "{group} · {count}",
      expand: "Expandir",
      collapse: "Recolher",
      incidents: "Incidentes não resolvidos",
      maintenances: "Manutenção programada",
      ongoingIncidents: "Incidentes em andamento",
      verified: "Verificado",
      partlyVerified: "Há dados não verificados",
      unverified: "Não verificado",
      noItems: "Nenhum",
      itemCount: "{count}",
      fetchedAt: "Obtido (horário local): {time}",
      lastSuccess: "Última atualização bem-sucedida (hora local): {time}",
      autoRefresh: "O status é atualizado a cada {seconds} segundos",
      officialPage: "Abrir página oficial de status ↗",
      sourceLive: "Fonte: status.openai.com",
      sourceCompat: "Fonte: status.openai.com (API antiga)",
      compatWarning: "Não foi possível ler a página de status. Os dados exibidos vêm da API antiga. Algumas seções podem estar incompletas.",
      fetchFailed: "Não foi possível obter o status da OpenAI: {error}. Verifique sua conexão e tente atualizar.",
      staleWarning: "Falha ao atualizar ({error}). Exibindo dados obtidos com sucesso em {time}.",
      cachedStatus: "{status} · em cache",
      scopeNote: "A OpenAI publica a disponibilidade geral dos serviços com base em dados de todos os planos, modelos e tipos de erro. Sua experiência pode variar conforme o plano e os recursos que você usa. Este script é um projeto independente.",
      originalUpdate: "Última atualização oficial (texto original)",
      unknownTime: "Horário desconhecido",
      unknownComponent: "Componente desconhecido",
      unnamedIncident: "Incidente sem nome",
      unnamedMaintenance: "Manutenção sem nome",
      noDetails: "Nenhum detalhe disponível",
      statusAndImpact: "Status: {status} · Impacto: {impact}",
      maintenanceStage: "Status: {status} · Manutenção programada",
      scheduleStart: "Início programado: {time}",
      scheduleEnd: "Fim programado: {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "Horário da manutenção indisponível",
      noticeUpdated: "Status da OpenAI atualizado: {status}",
      noticeInitial: "Aviso de status da OpenAI: {status}",
      launcherHint: "{status}. Abra o painel para ver os detalhes.",
      unknownHint: "Não foi possível consultar o status da OpenAI. Abra o painel para tentar novamente.",
      staleHint: "Não foi possível atualizar o status da OpenAI: {error}. Abra o painel para ver os últimos dados ou tentar novamente.",
      unknownError: "Erro desconhecido",
      errorHttp: "A solicitação de status oficial retornou HTTP {status}",
      errorTimeout: "O tempo limite da solicitação de status oficial foi excedido",
      errorNetwork: "Não foi possível conectar à página oficial de status",
      errorParse: "Não foi possível interpretar os dados oficiais de status",
      errorSchema: "Os dados oficiais de status têm um formato inesperado",
      errorEmpty: "A página oficial de status estava vazia",
      errorSummary: "O resumo oficial do status não foi encontrado",
      errorIncomplete: "O resumo oficial do status estava incompleto",
      menuToggle: "Mostrar / ocultar painel de status da OpenAI",
      menuSettings: "Preferências de status da OpenAI",
      settings: "Preferências",
      preferencesSaved: "Preferências salvas",
      exportLayout: "Exportar estrutura segura da página",
      exported: "Estrutura segura da página exportada",
      privacyLayout: "Apenas informações estruturais da página são exportadas. Não são incluídos textos, valores de formulários, links, cookies, conteúdo armazenado ou dados de rede.",
      overall_none: "Todos os sistemas estão operacionais",
      short_none: "OpenAI operacional",
      overall_minor: "Instabilidade leve no serviço",
      short_minor: "Instabilidade leve",
      overall_major: "Interrupção parcial dos sistemas",
      short_major: "Interrupção parcial",
      overall_critical: "Interrupção grave do serviço",
      short_critical: "Interrupção grave",
      overall_maintenance: "Manutenção do serviço em andamento",
      short_maintenance: "Manutenção",
      overall_unknown: "Status oficial desconhecido",
      short_unknown: "Status desconhecido",
      component_operational: "Operacional",
      component_degraded_performance: "Desempenho reduzido",
      component_partial_outage: "Interrupção parcial",
      component_major_outage: "Interrupção grave",
      component_full_outage: "Interrupção total",
      component_under_maintenance: "Em manutenção",
      component_unknown: "Status desconhecido",
      incident_investigating: "Em investigação",
      incident_identified: "Problema identificado",
      incident_fixing: "Correção em andamento",
      incident_monitoring: "Monitorando a recuperação",
      incident_observing: "Observando a recuperação",
      incident_resolved: "Resolvido",
      incident_postmortem: "Análise pós-incidente",
      maintenance_scheduled: "Programada",
      maintenance_upcoming: "Em breve",
      maintenance_in_progress: "Em andamento",
      maintenance_ongoing: "Em andamento",
      maintenance_verifying: "Em verificação",
      maintenance_completed: "Concluída",
      impact_none: "Sem impacto",
      impact_minor: "Impacto leve",
      impact_major: "Impacto alto",
      impact_critical: "Impacto crítico",
      impact_maintenance: "Manutenção programada",
      impact_unknown: "Impacto desconhecido"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "Login",
      Images: "Imagens",
      Responses: "Responses API",
      Audio: "Áudio",
      Files: "Arquivos",
      Search: "Busca",
      Sora: "Sora",
      "Fine-tuning": "Ajuste fino",
      "Deep Research": "Pesquisa aprofundada",
      Realtime: "Realtime API",
      "Voice mode": "Modo de voz",
      Batch: "Batch API",
      Embeddings: "Embeddings",
      Moderations: "Moderação",
      "Codex Web": "Codex na web",
      "Codex in ChatGPT Desktop": "Codex no ChatGPT para desktop",
      "Connectors/Apps": "Conectores / Aplicativos",
      "VS Code extension": "Extensão do VS Code",
      "Codex API": "Codex API",
      Sites: "Sites",
      Agent: "Agente",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "Envio de arquivos",
      "Ads Manager": "Gerenciador de anúncios",
      CLI: "Linha de comando (CLI)",
      Conversations: "Conversas",
      GPTs: "GPTs",
      "Image Generation": "Geração de imagens",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "ChatGPT Space"
    },
    groupNames: {
      APIs: "APIs",
      ChatGPT: "ChatGPT",
      Codex: "Codex",
      FedRAMP: "FedRAMP",
      "Ads Platform": "Plataforma de anúncios",
      Other: "Outros componentes"
    }
  };

  // src/locales/ja.js
  var ja_default = {
    label: "日本語",
    lang: "ja",
    dir: "ltr",
    messages: {
      title: "OpenAI の稼働状況",
      details: "OpenAI の稼働状況の詳細",
      loading: "OpenAI の状態を取得中…",
      unknown: "OpenAI の状態は不明",
      refresh: "今すぐ更新",
      close: "パネルを閉じる",
      open: "状態パネルを開く",
      language: "言語",
      auto: "ページ / ブラウザーに合わせる",
      theme: "テーマ",
      themeAuto: "サイトに合わせる",
      light: "ライト",
      dark: "ダーク",
      position: "位置",
      positionAuto: "サイドバーの横",
      positionLeft: "左下",
      positionRight: "右下",
      components: "公式コンポーネント",
      activity: "障害・メンテナンス情報",
      allNormal: "すべて正常",
      abnormalCount: "{count} 件に影響",
      normalCount: "{normal}/{total} 個のコンポーネントが正常",
      allComponents: "全 {count} 個のコンポーネントを表示",
      componentGroup: "{group} · {count}",
      expand: "展開",
      collapse: "折りたたむ",
      incidents: "未解決の障害",
      maintenances: "メンテナンス予定",
      ongoingIncidents: "対応中の障害",
      verified: "確認済み",
      partlyVerified: "未確認の項目あり",
      unverified: "未確認",
      noItems: "なし",
      itemCount: "{count} 件",
      fetchedAt: "取得日時（現地時間）：{time}",
      lastSuccess: "前回取得できた日時（現地時間）：{time}",
      autoRefresh: "{seconds} 秒ごとに稼働状況を更新",
      officialPage: "公式ステータスページを開く ↗",
      sourceLive: "データ提供元：status.openai.com",
      sourceCompat: "データ提供元：status.openai.com（旧 API）",
      compatWarning: "公式ステータスページを読み取れなかったため、旧 API のデータを表示しています。一部の情報が表示されない場合があります。",
      fetchFailed: "OpenAI の状態を取得できませんでした：{error}。接続を確認して再度更新してください。",
      staleWarning: "更新に失敗しました（{error}）。{time} に取得できたデータを表示しています。",
      cachedStatus: "{status}（キャッシュ）",
      scopeNote: "OpenAI は、各プラン、モデル、エラーの種類をまとめた稼働状況を公開しています。実際の利用状況はプランや機能によって異なります。このユーザースクリプトは第三者が開発しています。",
      originalUpdate: "公式の最新情報（原文）",
      unknownTime: "日時不明",
      unknownComponent: "不明なコンポーネント",
      unnamedIncident: "障害（タイトルなし）",
      unnamedMaintenance: "名称未設定のメンテナンス",
      noDetails: "詳細情報はありません",
      statusAndImpact: "状態：{status} · 影響：{impact}",
      maintenanceStage: "状況：{status} · メンテナンス",
      scheduleStart: "開始予定：{time}",
      scheduleEnd: "終了予定：{time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "メンテナンス日時の情報はありません",
      noticeUpdated: "OpenAI の稼働状況が更新されました：{status}",
      noticeInitial: "OpenAI の稼働状況のお知らせ：{status}",
      launcherHint: "{status}。パネルを開くと詳細を確認できます。",
      unknownHint: "OpenAI の稼働状況を取得できません。パネルを開いて再試行してください。",
      staleHint: "更新に失敗しました（{error}）。パネルを開くと前回のデータを確認したり、再試行したりできます。",
      unknownError: "不明なエラー",
      errorHttp: "公式ステータスへのリクエストが HTTP {status} を返しました",
      errorTimeout: "公式ステータスへのリクエストがタイムアウトしました",
      errorNetwork: "公式ステータスページに接続できませんでした",
      errorParse: "公式ステータスデータを解析できませんでした",
      errorSchema: "公式ステータスデータの形式が想定と異なります",
      errorEmpty: "公式ステータスページの内容が空でした",
      errorSummary: "公式ステータスの概要が見つかりませんでした",
      errorIncomplete: "公式ステータスの概要が不完全でした",
      menuToggle: "OpenAI 状態パネルの表示を切り替える",
      menuSettings: "OpenAI 状態の設定",
      settings: "設定",
      preferencesSaved: "設定を保存しました",
      exportLayout: "安全なページ構造をエクスポート",
      exported: "安全なページ構造をエクスポートしました",
      privacyLayout: "レイアウト構造のみをエクスポートします。ページの文章、フォームの入力値、リンク、Cookie、ストレージの内容、ネットワークデータは含まれません。",
      overall_none: "すべてのシステムが正常に稼働しています",
      short_none: "OpenAI 正常",
      overall_minor: "軽微なサービス障害",
      short_minor: "軽微な障害",
      overall_major: "一部システムで障害",
      short_major: "一部サービス停止",
      overall_critical: "大規模なサービス障害",
      short_critical: "大規模障害",
      overall_maintenance: "サービスのメンテナンス中",
      short_maintenance: "メンテナンス",
      overall_unknown: "公式の稼働状況は不明です",
      short_unknown: "状態不明",
      component_operational: "正常稼働",
      component_degraded_performance: "パフォーマンス低下",
      component_partial_outage: "一部停止",
      component_major_outage: "重大な障害",
      component_full_outage: "完全停止",
      component_under_maintenance: "メンテナンス中",
      component_unknown: "状態不明",
      incident_investigating: "調査中",
      incident_identified: "問題を特定",
      incident_fixing: "復旧作業中",
      incident_monitoring: "復旧状況を監視中",
      incident_observing: "復旧状況を確認中",
      incident_resolved: "解決済み",
      incident_postmortem: "事後分析",
      maintenance_scheduled: "実施予定",
      maintenance_upcoming: "まもなく開始",
      maintenance_in_progress: "実施中",
      maintenance_ongoing: "実施中",
      maintenance_verifying: "検証中",
      maintenance_completed: "完了",
      impact_none: "影響なし",
      impact_minor: "軽微な影響",
      impact_major: "大きな影響",
      impact_critical: "深刻な影響",
      impact_maintenance: "予定メンテナンス",
      impact_unknown: "影響不明"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "ログイン",
      Images: "画像",
      Responses: "Responses API",
      Audio: "音声",
      Files: "ファイル",
      Search: "検索",
      Sora: "Sora",
      "Fine-tuning": "ファインチューニング",
      "Deep Research": "Deep Research",
      Realtime: "Realtime API",
      "Voice mode": "音声モード",
      Batch: "バッチ処理",
      Embeddings: "埋め込み",
      Moderations: "モデレーション",
      "Codex Web": "Codex Web",
      "Codex in ChatGPT Desktop": "ChatGPT デスクトップ版の Codex",
      "Connectors/Apps": "コネクター / アプリ",
      "VS Code extension": "VS Code 拡張機能",
      "Codex API": "Codex API",
      Sites: "Sites",
      Agent: "エージェント",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "ファイルアップロード",
      "Ads Manager": "広告マネージャー",
      CLI: "コマンドラインツール（CLI）",
      Conversations: "会話",
      GPTs: "GPTs",
      "Image Generation": "画像生成",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "Space"
    },
    groupNames: { APIs: "APIs", ChatGPT: "ChatGPT", Codex: "Codex", FedRAMP: "FedRAMP", "Ads Platform": "広告プラットフォーム", Other: "その他のコンポーネント" }
  };

  // src/locales/ko.js
  var ko_default = {
    label: "한국어",
    lang: "ko",
    dir: "ltr",
    messages: {
      title: "OpenAI 서비스 상태",
      details: "OpenAI 서비스 상태 세부 정보",
      loading: "OpenAI 상태를 가져오는 중…",
      unknown: "OpenAI 상태를 알 수 없음",
      refresh: "지금 새로고침",
      close: "패널 닫기",
      open: "상태 패널 열기",
      language: "언어",
      auto: "페이지 / 브라우저 설정 따르기",
      theme: "테마",
      themeAuto: "웹사이트 설정 따르기",
      light: "밝게",
      dark: "어둡게",
      position: "위치",
      positionAuto: "사이드바 옆",
      positionLeft: "왼쪽 아래",
      positionRight: "오른쪽 아래",
      components: "공식 구성 요소",
      activity: "장애 및 점검",
      allNormal: "모두 정상",
      abnormalCount: "영향을 받은 구성 요소 {count}개",
      normalCount: "구성 요소 {normal}/{total}개 정상",
      allComponents: "구성 요소 {count}개 모두 보기",
      componentGroup: "{group} · {count}",
      expand: "펼치기",
      collapse: "접기",
      incidents: "해결되지 않은 장애",
      maintenances: "예정된 점검",
      ongoingIncidents: "진행 중인 장애",
      verified: "확인됨",
      partlyVerified: "일부 데이터 미확인",
      unverified: "미확인",
      noItems: "없음",
      itemCount: "{count}건",
      fetchedAt: "가져온 시각(현지): {time}",
      lastSuccess: "마지막 데이터 조회(현지 시각): {time}",
      autoRefresh: "{seconds}초마다 상태 업데이트",
      officialPage: "공식 상태 페이지 열기 ↗",
      sourceLive: "데이터 출처: status.openai.com",
      sourceCompat: "데이터 출처: status.openai.com(이전 API)",
      compatWarning: "공식 상태 페이지를 읽을 수 없어 이전 API의 데이터를 표시합니다. 일부 정보가 누락될 수 있습니다.",
      fetchFailed: "OpenAI 상태를 가져올 수 없습니다: {error}. 연결 상태를 확인한 후 다시 새로고침하세요.",
      staleWarning: "새로고침에 실패했습니다({error}). {time}에 성공적으로 가져온 데이터를 표시합니다.",
      cachedStatus: "{status} · 캐시",
      scopeNote: "OpenAI는 요금제, 모델, 오류 유형을 종합한 서비스 가용성을 공개합니다. 실제 사용 환경은 요금제와 기능에 따라 다를 수 있습니다. 이 사용자 스크립트는 제3자가 개발했습니다.",
      originalUpdate: "최신 공식 업데이트(원문)",
      unknownTime: "시각을 알 수 없음",
      unknownComponent: "알 수 없는 구성 요소",
      unnamedIncident: "이름 없는 장애",
      unnamedMaintenance: "이름 없는 점검",
      noDetails: "상세 정보 없음",
      statusAndImpact: "상태: {status} · 영향: {impact}",
      maintenanceStage: "상태: {status} · 예정된 점검",
      scheduleStart: "시작 예정 시각: {time}",
      scheduleEnd: "종료 예정 시각: {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "점검 시간 정보가 없습니다",
      noticeUpdated: "OpenAI 서비스 상태가 업데이트되었습니다: {status}",
      noticeInitial: "OpenAI 서비스 상태 알림: {status}",
      launcherHint: "{status}. 패널을 열어 자세한 내용을 확인하세요.",
      unknownHint: "OpenAI 서비스 상태를 확인할 수 없습니다. 패널을 열어 다시 시도하세요.",
      staleHint: "상태를 새로 고치지 못했습니다({error}). 패널을 열어 이전 데이터를 확인하거나 다시 시도하세요.",
      unknownError: "알 수 없는 오류",
      errorHttp: "공식 상태 페이지 응답 코드: HTTP {status}",
      errorTimeout: "공식 상태 요청 시간이 초과되었습니다",
      errorNetwork: "공식 상태 페이지에 연결할 수 없습니다",
      errorParse: "공식 상태 데이터를 분석할 수 없습니다",
      errorSchema: "공식 상태 데이터 형식이 예상과 다릅니다",
      errorEmpty: "공식 상태 페이지 내용이 비어 있습니다",
      errorSummary: "공식 상태 요약을 찾을 수 없습니다",
      errorIncomplete: "공식 상태 요약이 불완전합니다",
      menuToggle: "OpenAI 상태 패널 열기 / 닫기",
      menuSettings: "OpenAI 상태 설정",
      settings: "설정",
      preferencesSaved: "설정을 저장했습니다",
      exportLayout: "안전한 페이지 구조 내보내기",
      exported: "안전한 페이지 구조를 내보냈습니다",
      privacyLayout: "레이아웃 구조만 내보냅니다. 페이지 텍스트, 입력 값, 링크, Cookie, 저장소 내용, 네트워크 데이터는 포함하지 않습니다.",
      overall_none: "모든 시스템이 정상 작동 중입니다",
      short_none: "OpenAI 정상",
      overall_minor: "경미한 서비스 장애",
      short_minor: "경미한 장애",
      overall_major: "일부 시스템 장애",
      short_major: "일부 서비스 중단",
      overall_critical: "대규모 서비스 장애",
      short_critical: "대규모 장애",
      overall_maintenance: "서비스 점검 중",
      short_maintenance: "점검 중",
      overall_unknown: "공식 서비스 상태를 알 수 없습니다",
      short_unknown: "상태 미확인",
      component_operational: "정상 작동",
      component_degraded_performance: "성능 저하",
      component_partial_outage: "일부 중단",
      component_major_outage: "심각한 중단",
      component_full_outage: "전체 중단",
      component_under_maintenance: "점검 중",
      component_unknown: "상태 미확인",
      incident_investigating: "조사 중",
      incident_identified: "원인 확인됨",
      incident_fixing: "복구 중",
      incident_monitoring: "복구 상태 모니터링 중",
      incident_observing: "복구 상태 관찰 중",
      incident_resolved: "해결됨",
      incident_postmortem: "사후 분석",
      maintenance_scheduled: "예정됨",
      maintenance_upcoming: "곧 시작",
      maintenance_in_progress: "진행 중",
      maintenance_ongoing: "진행 중",
      maintenance_verifying: "검증 중",
      maintenance_completed: "완료",
      impact_none: "영향 없음",
      impact_minor: "경미한 영향",
      impact_major: "큰 영향",
      impact_critical: "심각한 영향",
      impact_maintenance: "예정된 점검",
      impact_unknown: "영향 미확인"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "로그인",
      Images: "이미지",
      Responses: "Responses API",
      Audio: "오디오",
      Files: "파일",
      Search: "검색",
      Sora: "Sora",
      "Fine-tuning": "파인 튜닝",
      "Deep Research": "Deep Research",
      Realtime: "Realtime API",
      "Voice mode": "음성 모드",
      Batch: "일괄 처리",
      Embeddings: "임베딩",
      Moderations: "콘텐츠 검토",
      "Codex Web": "Codex Web",
      "Codex in ChatGPT Desktop": "ChatGPT 데스크톱의 Codex",
      "Connectors/Apps": "커넥터 / 앱",
      "VS Code extension": "VS Code 확장 프로그램",
      "Codex API": "Codex API",
      Sites: "Sites",
      Agent: "에이전트",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "파일 업로드",
      "Ads Manager": "광고 관리자",
      CLI: "명령줄 도구(CLI)",
      Conversations: "대화",
      GPTs: "GPTs",
      "Image Generation": "이미지 생성",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "스페이스"
    },
    groupNames: { APIs: "APIs", ChatGPT: "ChatGPT", Codex: "Codex", FedRAMP: "FedRAMP", "Ads Platform": "광고 플랫폼", Other: "기타 구성 요소" }
  };

  // src/locales/fr.js
  var fr_default = {
    label: "Français",
    lang: "fr",
    dir: "ltr",
    messages: {
      title: "État d’OpenAI",
      details: "Détails de l’état d’OpenAI",
      loading: "Récupération de l’état d’OpenAI…",
      unknown: "État d’OpenAI inconnu",
      refresh: "Actualiser maintenant",
      close: "Fermer le panneau",
      open: "Ouvrir le panneau d’état",
      language: "Langue",
      auto: "Selon la page ou le navigateur",
      theme: "Thème",
      themeAuto: "Selon le site",
      light: "Clair",
      dark: "Sombre",
      position: "Position",
      positionAuto: "À côté de la barre latérale",
      positionLeft: "En bas à gauche",
      positionRight: "En bas à droite",
      components: "Composants officiels",
      activity: "Incidents et maintenance",
      allNormal: "Tout est opérationnel",
      abnormalCount: "Composants touchés : {count}",
      normalCount: "{normal}/{total} composants opérationnels",
      allComponents: "Afficher les {count} composants",
      componentGroup: "{group} · {count}",
      expand: "Développer",
      collapse: "Réduire",
      incidents: "Incidents non résolus",
      maintenances: "Maintenances planifiées",
      ongoingIncidents: "Incidents en cours",
      verified: "Vérifié",
      partlyVerified: "Données non vérifiées",
      unverified: "Non vérifié",
      noItems: "Aucun élément",
      itemCount: "{count}",
      fetchedAt: "Récupéré (heure locale) : {time}",
      lastSuccess: "Dernière actualisation réussie (heure locale) : {time}",
      autoRefresh: "État actualisé toutes les {seconds} secondes",
      officialPage: "Ouvrir la page d’état officielle ↗",
      sourceLive: "Source : status.openai.com",
      sourceCompat: "Source : status.openai.com (ancienne API)",
      compatWarning: "Impossible de lire la page d’état. Les données affichées proviennent de l’ancienne API. Certaines sections peuvent être incomplètes.",
      fetchFailed: "Impossible de récupérer l’état d’OpenAI : {error}. Vérifiez votre connexion et réessayez d’actualiser.",
      staleWarning: "Échec de l’actualisation ({error}). Affichage des données récupérées avec succès à {time}.",
      cachedStatus: "{status} · en cache",
      scopeNote: "OpenAI publie la disponibilité globale de ses services à partir des données de tous les forfaits, modèles et types d’erreurs. Votre expérience peut varier selon le forfait et les fonctionnalités que vous utilisez. Ce script est un projet indépendant.",
      originalUpdate: "Dernière mise à jour officielle (texte d’origine)",
      unknownTime: "Heure inconnue",
      unknownComponent: "Composant inconnu",
      unnamedIncident: "Incident sans nom",
      unnamedMaintenance: "Maintenance sans nom",
      noDetails: "Aucun détail disponible",
      statusAndImpact: "État : {status} · Impact : {impact}",
      maintenanceStage: "État : {status} · Maintenance planifiée",
      scheduleStart: "Début prévu : {time}",
      scheduleEnd: "Fin prévue : {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "Horaires de maintenance indisponibles",
      noticeUpdated: "État d’OpenAI mis à jour : {status}",
      noticeInitial: "Notification d’état d’OpenAI : {status}",
      launcherHint: "{status}. Ouvrez le panneau pour en savoir plus.",
      unknownHint: "Impossible de consulter l’état des services OpenAI. Ouvrez le panneau pour réessayer.",
      staleHint: "Impossible d’actualiser l’état des services OpenAI : {error}. Ouvrez le panneau pour consulter les dernières données ou réessayer.",
      unknownError: "Erreur inconnue",
      errorHttp: "La requête d’état officielle a renvoyé HTTP {status}",
      errorTimeout: "Le délai de la requête d’état officielle a été dépassé",
      errorNetwork: "Impossible de se connecter à la page d’état officielle",
      errorParse: "Les données d’état officielles n’ont pas pu être analysées",
      errorSchema: "Les données d’état officielles ont un format inattendu",
      errorEmpty: "La page d’état officielle était vide",
      errorSummary: "Aucun résumé officiel de l’état n’a été trouvé",
      errorIncomplete: "Le résumé officiel de l’état était incomplet",
      menuToggle: "Afficher / masquer le panneau d’état d’OpenAI",
      menuSettings: "Préférences de l’état d’OpenAI",
      settings: "Préférences",
      preferencesSaved: "Préférences enregistrées",
      exportLayout: "Exporter la structure sécurisée de la page",
      exported: "Structure sécurisée de la page exportée",
      privacyLayout: "Seules les informations structurelles de la page sont exportées. Aucun texte de la page, valeur de formulaire, lien, cookie, contenu du stockage ou donnée réseau n’est inclus.",
      overall_none: "Tous les systèmes sont opérationnels",
      short_none: "OpenAI opérationnel",
      overall_minor: "Perturbation mineure du service",
      short_minor: "Perturbation mineure",
      overall_major: "Panne partielle du système",
      short_major: "Panne partielle",
      overall_critical: "Panne majeure du service",
      short_critical: "Panne majeure",
      overall_maintenance: "Maintenance du service en cours",
      short_maintenance: "Maintenance",
      overall_unknown: "État officiel inconnu",
      short_unknown: "État inconnu",
      component_operational: "Opérationnel",
      component_degraded_performance: "Performances dégradées",
      component_partial_outage: "Panne partielle",
      component_major_outage: "Panne majeure",
      component_full_outage: "Panne totale",
      component_under_maintenance: "En maintenance",
      component_unknown: "État inconnu",
      incident_investigating: "En cours d’investigation",
      incident_identified: "Problème identifié",
      incident_fixing: "Correction en cours",
      incident_monitoring: "Surveillance du rétablissement",
      incident_observing: "Observation du rétablissement",
      incident_resolved: "Résolu",
      incident_postmortem: "Analyse après incident",
      maintenance_scheduled: "Planifiée",
      maintenance_upcoming: "À venir",
      maintenance_in_progress: "En cours",
      maintenance_ongoing: "En cours",
      maintenance_verifying: "Vérification en cours",
      maintenance_completed: "Terminée",
      impact_none: "Aucun impact",
      impact_minor: "Impact mineur",
      impact_major: "Impact majeur",
      impact_critical: "Impact critique",
      impact_maintenance: "Maintenance planifiée",
      impact_unknown: "Impact inconnu"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "Connexion",
      Images: "Images",
      Responses: "Responses API",
      Audio: "Audio",
      Files: "Fichiers",
      Search: "Recherche",
      Sora: "Sora",
      "Fine-tuning": "Ajustement fin",
      "Deep Research": "Recherche approfondie",
      Realtime: "Realtime API",
      "Voice mode": "Mode vocal",
      Batch: "Batch API",
      Embeddings: "Embeddings API",
      Moderations: "Modération",
      "Codex Web": "Codex Web",
      "Codex in ChatGPT Desktop": "Codex dans ChatGPT pour ordinateur",
      "Connectors/Apps": "Connecteurs / Applications",
      "VS Code extension": "Extension VS Code",
      "Codex API": "Codex API",
      Sites: "Sites",
      Agent: "Agent",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "Importation de fichiers",
      "Ads Manager": "Gestionnaire de publicités",
      CLI: "Interface en ligne de commande (CLI)",
      Conversations: "Conversations",
      GPTs: "GPTs",
      "Image Generation": "Génération d’images",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "Espace ChatGPT"
    },
    groupNames: {
      APIs: "API",
      ChatGPT: "ChatGPT",
      Codex: "Codex",
      FedRAMP: "FedRAMP",
      "Ads Platform": "Plateforme publicitaire",
      Other: "Autres composants"
    }
  };

  // src/locales/de.js
  var de_default = {
    label: "Deutsch",
    lang: "de",
    dir: "ltr",
    messages: {
      title: "OpenAI-Status",
      details: "Details zum OpenAI-Status",
      loading: "OpenAI-Status wird abgerufen…",
      unknown: "OpenAI-Status unbekannt",
      refresh: "Jetzt aktualisieren",
      close: "Statusfenster schließen",
      open: "Statusfenster öffnen",
      language: "Sprache",
      auto: "Automatisch",
      theme: "Design",
      themeAuto: "Wie auf der Website",
      light: "Hell",
      dark: "Dunkel",
      position: "Position",
      positionAuto: "Neben der Seitenleiste",
      positionLeft: "Unten links",
      positionRight: "Unten rechts",
      components: "Offizielle Komponenten",
      activity: "Störungen und Wartung",
      allNormal: "Alles betriebsbereit",
      abnormalCount: "Betroffene Komponenten: {count}",
      normalCount: "{normal}/{total} Komponenten betriebsbereit",
      allComponents: "Alle {count} Komponenten anzeigen",
      componentGroup: "{group} · {count}",
      expand: "Aufklappen",
      collapse: "Zuklappen",
      incidents: "Offene Störungen",
      maintenances: "Geplante Wartungen",
      ongoingIncidents: "Aktuelle Störungen",
      verified: "Geprüft",
      partlyVerified: "Daten nicht vollständig geprüft",
      unverified: "Ungeprüft",
      noItems: "Keine",
      itemCount: "{count}",
      fetchedAt: "Abgerufen (Ortszeit): {time}",
      lastSuccess: "Letzte erfolgreiche Aktualisierung (Ortszeit): {time}",
      autoRefresh: "Status wird alle {seconds} Sekunden aktualisiert",
      officialPage: "Offizielle Statusseite öffnen ↗",
      sourceLive: "Quelle: status.openai.com",
      sourceCompat: "Quelle: status.openai.com (ältere API)",
      compatWarning: "Die Statusseite konnte nicht gelesen werden. Die angezeigten Daten stammen aus der älteren Status-API. Einige Abschnitte können unvollständig sein.",
      fetchFailed: "Der OpenAI-Status konnte nicht abgerufen werden: {error}. Prüfen Sie Ihre Verbindung und aktualisieren Sie erneut.",
      staleWarning: "Aktualisierung fehlgeschlagen ({error}). Angezeigt werden die um {time} erfolgreich abgerufenen Daten.",
      cachedStatus: "{status} · im Cache",
      scopeNote: "OpenAI veröffentlicht die Verfügbarkeit seiner Dienste zusammengefasst über alle Tarife, Modelle und Fehlertypen. Die tatsächliche Verfügbarkeit kann je nach Tarif und genutzter Funktion abweichen. Dieses Userscript ist ein unabhängiges Projekt.",
      originalUpdate: "Neueste offizielle Meldung (Originaltext)",
      unknownTime: "Zeit unbekannt",
      unknownComponent: "Unbekannte Komponente",
      unnamedIncident: "Unbenannter Vorfall",
      unnamedMaintenance: "Unbenannte Wartung",
      noDetails: "Keine Details verfügbar",
      statusAndImpact: "Status: {status} · Auswirkung: {impact}",
      maintenanceStage: "Status: {status} · Geplante Wartung",
      scheduleStart: "Geplanter Beginn: {time}",
      scheduleEnd: "Geplantes Ende: {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "Wartungszeitraum nicht verfügbar",
      noticeUpdated: "OpenAI-Status aktualisiert: {status}",
      noticeInitial: "Hinweis zum OpenAI-Status: {status}",
      launcherHint: "{status}. Öffnen Sie das Statusfenster für weitere Informationen.",
      unknownHint: "Der OpenAI-Status konnte nicht abgerufen werden. Öffnen Sie das Statusfenster, um es erneut zu versuchen.",
      staleHint: "Der OpenAI-Status konnte nicht aktualisiert werden: {error}. Öffnen Sie das Statusfenster, um die letzten Daten anzuzeigen oder es erneut zu versuchen.",
      unknownError: "Unbekannter Fehler",
      errorHttp: "Die offizielle Statusabfrage ergab HTTP {status}",
      errorTimeout: "Zeitüberschreitung bei der offiziellen Statusabfrage",
      errorNetwork: "Verbindung zur offiziellen Statusseite fehlgeschlagen",
      errorParse: "Die offiziellen Statusdaten konnten nicht verarbeitet werden",
      errorSchema: "Die offiziellen Statusdaten haben ein unerwartetes Format",
      errorEmpty: "Die offizielle Statusseite war leer",
      errorSummary: "Keine offizielle Statusübersicht gefunden",
      errorIncomplete: "Die offizielle Statusübersicht war unvollständig",
      menuToggle: "OpenAI-Statusfenster ein- oder ausblenden",
      menuSettings: "Einstellungen zum OpenAI-Status",
      settings: "Einstellungen",
      preferencesSaved: "Einstellungen gespeichert",
      exportLayout: "Sichere Seitenstruktur exportieren",
      exported: "Sichere Seitenstruktur exportiert",
      privacyLayout: "Es werden ausschließlich Angaben zur Seitenstruktur exportiert. Seitentexte, Formularwerte, Links, Cookies, Speicherinhalte und Netzwerkdaten sind nicht enthalten.",
      overall_none: "Alle Systeme betriebsbereit",
      short_none: "OpenAI läuft",
      overall_minor: "Leichte Dienststörung",
      short_minor: "Leichte Störung",
      overall_major: "Teilweiser Systemausfall",
      short_major: "Teilausfall",
      overall_critical: "Schwerer Dienstausfall",
      short_critical: "Schwerer Ausfall",
      overall_maintenance: "Wartungsarbeiten laufen",
      short_maintenance: "Wartung",
      overall_unknown: "Offizieller Status unbekannt",
      short_unknown: "Status unbekannt",
      component_operational: "Betriebsbereit",
      component_degraded_performance: "Verminderte Leistung",
      component_partial_outage: "Teilweiser Ausfall",
      component_major_outage: "Schwerer Ausfall",
      component_full_outage: "Vollständiger Ausfall",
      component_under_maintenance: "In Wartung",
      component_unknown: "Status unbekannt",
      incident_investigating: "Wird untersucht",
      incident_identified: "Problem erkannt",
      incident_fixing: "Wird behoben",
      incident_monitoring: "Wiederherstellung wird überwacht",
      incident_observing: "Wiederherstellung wird beobachtet",
      incident_resolved: "Behoben",
      incident_postmortem: "Nachbereitung",
      maintenance_scheduled: "Geplant",
      maintenance_upcoming: "Bevorstehend",
      maintenance_in_progress: "Läuft",
      maintenance_ongoing: "Läuft",
      maintenance_verifying: "Wird überprüft",
      maintenance_completed: "Abgeschlossen",
      impact_none: "Keine Auswirkung",
      impact_minor: "Geringe Auswirkung",
      impact_major: "Erhebliche Auswirkung",
      impact_critical: "Kritische Auswirkung",
      impact_maintenance: "Geplante Wartung",
      impact_unknown: "Auswirkung unbekannt"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "Anmeldung",
      Images: "Bilder",
      Responses: "Responses API",
      Audio: "Audio",
      Files: "Dateien",
      Search: "Suche",
      Sora: "Sora",
      "Fine-tuning": "Feinabstimmung",
      "Deep Research": "Deep Research",
      Realtime: "Realtime API",
      "Voice mode": "Sprachmodus",
      Batch: "Batch API",
      Embeddings: "Embeddings API",
      Moderations: "Inhaltsmoderation",
      "Codex Web": "Codex Web",
      "Codex in ChatGPT Desktop": "Codex in ChatGPT für den Desktop",
      "Connectors/Apps": "Konnektoren / Apps",
      "VS Code extension": "VS Code-Erweiterung",
      "Codex API": "Codex API",
      Sites: "Sites",
      Agent: "Agent",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "Dateiuploads",
      "Ads Manager": "Anzeigenverwaltung",
      CLI: "Befehlszeilenschnittstelle (CLI)",
      Conversations: "Unterhaltungen",
      GPTs: "GPTs",
      "Image Generation": "Bilderzeugung",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "ChatGPT Space"
    },
    groupNames: {
      APIs: "APIs",
      ChatGPT: "ChatGPT",
      Codex: "Codex",
      FedRAMP: "FedRAMP",
      "Ads Platform": "Werbeplattform",
      Other: "Weitere Komponenten"
    }
  };

  // src/locales/id.js
  var id_default = {
    label: "Bahasa Indonesia",
    lang: "id",
    dir: "ltr",
    messages: {
      title: "Status OpenAI",
      details: "Detail status OpenAI",
      loading: "Memuat status OpenAI…",
      unknown: "Status OpenAI tidak diketahui",
      refresh: "Perbarui sekarang",
      close: "Tutup panel",
      open: "Buka panel status",
      language: "Bahasa",
      auto: "Otomatis",
      theme: "Tema",
      themeAuto: "Ikuti situs",
      light: "Terang",
      dark: "Gelap",
      position: "Posisi",
      positionAuto: "Di dekat bilah samping",
      positionLeft: "Kiri bawah",
      positionRight: "Kanan bawah",
      components: "Status komponen",
      activity: "Gangguan dan pemeliharaan",
      allNormal: "Semua komponen beroperasi normal",
      abnormalCount: "{count} komponen terdampak",
      normalCount: "{normal}/{total} komponen beroperasi normal",
      allComponents: "Lihat semua {count} komponen",
      componentGroup: "{group} · {count}",
      expand: "Perluas",
      collapse: "Ciutkan",
      incidents: "Gangguan yang belum teratasi",
      maintenances: "Pemeliharaan terjadwal",
      ongoingIncidents: "Gangguan yang masih berlangsung",
      verified: "Terverifikasi",
      partlyVerified: "Sebagian data belum terverifikasi",
      unverified: "Belum dapat diverifikasi",
      noItems: "Tidak ada",
      itemCount: "{count}",
      fetchedAt: "Data diambil (waktu setempat): {time}",
      lastSuccess: "Pembaruan terakhir yang berhasil (waktu setempat): {time}",
      autoRefresh: "Status diperbarui setiap {seconds} detik",
      officialPage: "Buka halaman status resmi ↗",
      sourceLive: "Sumber: status.openai.com",
      sourceCompat: "Sumber: status.openai.com (API lama)",
      compatWarning: "Halaman status tidak dapat dibaca. Data yang ditampilkan berasal dari API lama. Sebagian informasi mungkin tidak tersedia.",
      fetchFailed: "Status OpenAI tidak dapat diambil: {error}. Periksa koneksi internet Anda, lalu coba lagi.",
      staleWarning: "Pembaruan gagal ({error}). Data terakhir masih ditampilkan (diambil pada {time}).",
      cachedStatus: "{status} · cache",
      scopeNote: "Ketersediaan resmi merupakan gabungan dari semua paket, model, dan jenis kesalahan. Pengalaman Anda dapat berbeda menurut paket dan fitur yang digunakan. Skrip pengguna ini bersifat independen dan bukan produk OpenAI.",
      originalUpdate: "Pembaruan resmi terbaru (teks asli)",
      unknownTime: "Waktu tidak diketahui",
      unknownComponent: "Komponen tidak diketahui",
      unnamedIncident: "Gangguan tanpa judul",
      unnamedMaintenance: "Pemeliharaan tanpa nama",
      noDetails: "Detail tidak tersedia",
      statusAndImpact: "Status: {status} · Dampak: {impact}",
      maintenanceStage: "Status: {status} · Pemeliharaan terjadwal",
      scheduleStart: "Jadwal mulai: {time}",
      scheduleEnd: "Jadwal selesai: {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "Waktu pemeliharaan tidak tersedia",
      noticeUpdated: "Status OpenAI diperbarui: {status}",
      noticeInitial: "Pemberitahuan status OpenAI: {status}",
      launcherHint: "{status}. Buka panel untuk melihat detail.",
      unknownHint: "Status OpenAI tidak dapat diambil. Buka panel untuk mencoba lagi.",
      staleHint: "Status OpenAI tidak dapat diperbarui: {error}. Buka panel untuk melihat data terakhir atau mencoba lagi.",
      unknownError: "Kesalahan yang tidak diketahui",
      errorHttp: "Halaman status resmi merespons dengan kode HTTP {status}",
      errorTimeout: "Halaman status resmi tidak merespons tepat waktu",
      errorNetwork: "Tidak dapat terhubung ke halaman status resmi",
      errorParse: "Data status resmi tidak dapat diurai",
      errorSchema: "Format data status resmi tidak sesuai harapan",
      errorEmpty: "Halaman status resmi kosong",
      errorSummary: "Ringkasan status resmi tidak ditemukan",
      errorIncomplete: "Ringkasan status resmi tidak lengkap",
      menuToggle: "Tampilkan / sembunyikan panel status OpenAI",
      menuSettings: "Pengaturan status OpenAI",
      settings: "Pengaturan",
      preferencesSaved: "Pengaturan disimpan",
      exportLayout: "Ekspor struktur halaman yang aman",
      exported: "Struktur halaman yang aman diekspor",
      privacyLayout: "Hanya informasi struktur tata letak yang diekspor. Teks halaman, nilai formulir, tautan, cookie, isi penyimpanan, dan data jaringan tidak disertakan.",
      overall_none: "Semua sistem beroperasi normal",
      short_none: "OpenAI normal",
      overall_minor: "Gangguan layanan ringan",
      short_minor: "Gangguan ringan",
      overall_major: "Gangguan sebagian sistem",
      short_major: "Gangguan sebagian",
      overall_critical: "Gangguan layanan besar",
      short_critical: "Gangguan besar",
      overall_maintenance: "Pemeliharaan layanan berlangsung",
      short_maintenance: "Pemeliharaan",
      overall_unknown: "Status resmi tidak diketahui",
      short_unknown: "Status tidak diketahui",
      component_operational: "Beroperasi normal",
      component_degraded_performance: "Kinerja menurun",
      component_partial_outage: "Gangguan sebagian",
      component_major_outage: "Gangguan besar",
      component_full_outage: "Gangguan total",
      component_under_maintenance: "Dalam pemeliharaan",
      component_unknown: "Status tidak diketahui",
      incident_investigating: "Sedang diselidiki",
      incident_identified: "Masalah teridentifikasi",
      incident_fixing: "Sedang diperbaiki",
      incident_monitoring: "Memantau pemulihan",
      incident_observing: "Mengamati pemulihan",
      incident_resolved: "Teratasi",
      incident_postmortem: "Analisis pascainsiden",
      maintenance_scheduled: "Terjadwal",
      maintenance_upcoming: "Akan datang",
      maintenance_in_progress: "Berlangsung",
      maintenance_ongoing: "Berlangsung",
      maintenance_verifying: "Sedang diverifikasi",
      maintenance_completed: "Selesai",
      impact_none: "Tidak ada dampak",
      impact_minor: "Dampak ringan",
      impact_major: "Dampak besar",
      impact_critical: "Dampak kritis",
      impact_maintenance: "Pemeliharaan terjadwal",
      impact_unknown: "Dampak tidak diketahui"
    },
    componentNames: {
      ChatGPT: "ChatGPT",
      Login: "Masuk",
      Images: "Gambar",
      Responses: "Responses API",
      Audio: "Audio",
      Files: "Berkas",
      Search: "Pencarian",
      Sora: "Sora",
      "Fine-tuning": "Penyesuaian model",
      "Deep Research": "Riset mendalam",
      Realtime: "Realtime API",
      "Voice mode": "Mode suara",
      Batch: "Batch API",
      Embeddings: "Embeddings API",
      Moderations: "Moderasi konten",
      "Codex Web": "Codex Web",
      "Codex in ChatGPT Desktop": "Codex di ChatGPT Desktop",
      "Connectors/Apps": "Konektor / Aplikasi",
      "VS Code extension": "Ekstensi VS Code",
      "Codex API": "Codex API",
      Sites: "Sites",
      Agent: "Agen",
      Agents: "Agents API",
      Decisions: "Decisions API",
      "Compliance API": "Compliance API",
      "Ads API": "Ads API",
      FedRAMP: "FedRAMP",
      "ChatGPT Atlas": "ChatGPT Atlas",
      "Chat Completions": "Chat Completions",
      "File uploads": "Unggahan berkas",
      "Ads Manager": "Pengelola iklan",
      CLI: "Antarmuka baris perintah (CLI)",
      Conversations: "Percakapan",
      GPTs: "GPTs",
      "Image Generation": "Pembuatan gambar",
      "ChatGPT Work": "ChatGPT Work",
      Live: "Live",
      dots: "dots",
      Space: "Space"
    },
    groupNames: {
      APIs: "API",
      ChatGPT: "ChatGPT",
      Codex: "Codex",
      FedRAMP: "FedRAMP",
      "Ads Platform": "Platform iklan",
      Other: "Komponen lainnya"
    }
  };

  // src/locales/ar.js
  var ar_default = {
    label: "العربية",
    lang: "ar",
    dir: "rtl",
    messages: {
      title: "حالة OpenAI",
      details: "تفاصيل حالة خدمات OpenAI",
      loading: "جارٍ جلب حالة OpenAI…",
      unknown: "حالة OpenAI غير معروفة",
      refresh: "تحديث الآن",
      close: "إغلاق اللوحة",
      open: "فتح لوحة الحالة",
      language: "اللغة",
      auto: "حسب الصفحة / المتصفح",
      theme: "المظهر",
      themeAuto: "حسب الموقع",
      light: "فاتح",
      dark: "داكن",
      position: "الموضع",
      positionAuto: "بجوار الشريط الجانبي",
      positionLeft: "أسفل اليسار",
      positionRight: "أسفل اليمين",
      components: "حالة المكوّنات",
      activity: "مشكلات الخدمة والصيانة",
      allNormal: "تعمل جميع المكوّنات بشكل طبيعي",
      abnormalCount: "المكونات المتأثرة: {count}",
      normalCount: "المكوّنات التي تعمل بشكل طبيعي: {normal} من {total}",
      allComponents: "عرض جميع المكونات ({count})",
      componentGroup: "{group} · {count}",
      expand: "توسيع",
      collapse: "طي",
      incidents: "مشكلات الخدمة التي لم تُحلّ",
      maintenances: "الصيانة المجدولة",
      ongoingIncidents: "مشكلات الخدمة الجارية",
      verified: "تم التحقق",
      partlyVerified: "تعذّر التحقق من بعض البيانات",
      unverified: "لم يتسنّ التحقق",
      noItems: "لا يوجد",
      itemCount: "{count}",
      fetchedAt: "وقت جلب البيانات (بالتوقيت المحلي): {time}",
      lastSuccess: "آخر تحديث ناجح (بالتوقيت المحلي): {time}",
      autoRefresh: "تُحدَّث حالة الخدمة كل {seconds} ثانية",
      officialPage: "فتح صفحة الحالة الرسمية ↗",
      sourceLive: "مصدر البيانات: status.openai.com",
      sourceCompat: "مصدر البيانات: status.openai.com (واجهة API القديمة)",
      compatWarning: "تعذرت قراءة صفحة الحالة، لذا تُعرض بيانات واجهة API القديمة. قد تنقص بعض المعلومات.",
      fetchFailed: "تعذر جلب حالة خدمات OpenAI: {error}. تحقق من الاتصال بالإنترنت ثم حاول مجددًا.",
      staleWarning: "تعذر التحديث ({error}). تُعرض آخر بيانات جُلبت بنجاح في {time}.",
      cachedStatus: "{status} · بيانات محفوظة",
      scopeNote: "تجمع بيانات التوافر الرسمية جميع الخطط والنماذج وأنواع الأخطاء. قد تختلف تجربتك حسب الخطة والميزة. هذا سكربت مستخدم مستقل وليس منتجًا من OpenAI.",
      originalUpdate: "آخر تحديث رسمي (النص الأصلي)",
      unknownTime: "الوقت غير معروف",
      unknownComponent: "مكون غير معروف",
      unnamedIncident: "مشكلة بلا عنوان",
      unnamedMaintenance: "صيانة بلا عنوان",
      noDetails: "لا تتوفر تفاصيل",
      statusAndImpact: "الحالة: {status} · التأثير: {impact}",
      maintenanceStage: "الحالة: {status} · صيانة مجدولة",
      scheduleStart: "البداية المجدولة: {time}",
      scheduleEnd: "النهاية المجدولة: {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "موعد الصيانة غير متاح",
      noticeUpdated: "تم تحديث حالة OpenAI: {status}",
      noticeInitial: "إشعار حالة OpenAI: {status}",
      launcherHint: "{status}. افتح اللوحة لعرض التفاصيل.",
      unknownHint: "تعذر جلب حالة خدمات OpenAI. افتح اللوحة لإعادة المحاولة.",
      staleHint: "تعذر تحديث حالة خدمات OpenAI: {error}. افتح اللوحة لعرض آخر بيانات متاحة أو لإعادة المحاولة.",
      unknownError: "خطأ غير معروف",
      errorHttp: "أعاد طلب الحالة الرسمية رمز HTTP {status}",
      errorTimeout: "انتهت مهلة طلب الحالة الرسمية",
      errorNetwork: "تعذر الاتصال بصفحة الحالة الرسمية",
      errorParse: "تعذر تحليل بيانات الحالة الرسمية",
      errorSchema: "تنسيق بيانات الحالة الرسمية غير متوقع",
      errorEmpty: "صفحة الحالة الرسمية فارغة",
      errorSummary: "لم يُعثر على ملخص الحالة الرسمية",
      errorIncomplete: "ملخص الحالة الرسمية غير مكتمل",
      menuToggle: "فتح / إغلاق لوحة حالة OpenAI",
      menuSettings: "تفضيلات حالة OpenAI",
      settings: "التفضيلات",
      preferencesSaved: "حُفظت التفضيلات",
      exportLayout: "تصدير بنية الصفحة الآمنة",
      exported: "تم تصدير بنية الصفحة الآمنة",
      privacyLayout: "تُصدَّر معلومات بنية التخطيط فقط. لا يتضمن التصدير نص الصفحة أو قيم النماذج أو الروابط أو ملفات تعريف الارتباط أو محتويات التخزين أو بيانات الشبكة.",
      overall_none: "جميع الأنظمة تعمل",
      short_none: "OpenAI تعمل",
      overall_minor: "اضطراب طفيف في الخدمة",
      short_minor: "اضطراب طفيف",
      overall_major: "انقطاع جزئي في الأنظمة",
      short_major: "انقطاع جزئي",
      overall_critical: "انقطاع كبير في الخدمة",
      short_critical: "انقطاع كبير",
      overall_maintenance: "صيانة الخدمة جارية",
      short_maintenance: "صيانة",
      overall_unknown: "الحالة الرسمية غير معروفة",
      short_unknown: "الحالة غير معروفة",
      component_operational: "يعمل",
      component_degraded_performance: "تراجع في الأداء",
      component_partial_outage: "انقطاع جزئي",
      component_major_outage: "انقطاع كبير",
      component_full_outage: "انقطاع كامل",
      component_under_maintenance: "قيد الصيانة",
      component_unknown: "حالة غير معروفة",
      incident_investigating: "جارٍ التحقيق",
      incident_identified: "تم تحديد المشكلة",
      incident_fixing: "جارٍ الإصلاح",
      incident_monitoring: "رصد استقرار الخدمة",
      incident_observing: "متابعة استقرار الخدمة",
      incident_resolved: "تم الحل",
      incident_postmortem: "مراجعة ما بعد المشكلة",
      maintenance_scheduled: "مجدولة",
      maintenance_upcoming: "قريبًا",
      maintenance_in_progress: "جارية",
      maintenance_ongoing: "جارية",
      maintenance_verifying: "جارٍ التحقق",
      maintenance_completed: "مكتملة",
      impact_none: "لا تأثير",
      impact_minor: "تأثير طفيف",
      impact_major: "تأثير كبير",
      impact_critical: "تأثير حرج",
      impact_maintenance: "صيانة مجدولة",
      impact_unknown: "تأثير غير معروف"
    },
    componentNames: {
      Login: "تسجيل الدخول",
      Images: "الصور",
      Audio: "الصوت",
      Files: "الملفات",
      Search: "البحث",
      "Fine-tuning": "الضبط الدقيق",
      "Deep Research": "البحث المتعمق",
      "Voice mode": "الوضع الصوتي",
      Batch: "المعالجة الدفعية",
      Embeddings: "التضمينات",
      Moderations: "الإشراف على المحتوى",
      "Connectors/Apps": "الموصلات / التطبيقات",
      "VS Code extension": "إضافة VS Code",
      Sites: "المواقع",
      Agent: "الوكيل",
      "File uploads": "رفع الملفات",
      "Ads Manager": "مدير الإعلانات",
      CLI: "واجهة سطر الأوامر (CLI)",
      Conversations: "المحادثات",
      "Image Generation": "توليد الصور"
    },
    groupNames: { "Ads Platform": "منصة الإعلانات", Other: "مكونات أخرى" }
  };

  // src/locales/ru.js
  var ru_default = {
    label: "Русский",
    lang: "ru",
    dir: "ltr",
    messages: {
      title: "Статус OpenAI",
      details: "Сведения о состоянии сервисов OpenAI",
      loading: "Загрузка статуса OpenAI…",
      unknown: "Статус OpenAI неизвестен",
      refresh: "Обновить сейчас",
      close: "Закрыть панель",
      open: "Открыть панель статуса",
      language: "Язык",
      auto: "Как на странице / в браузере",
      theme: "Тема",
      themeAuto: "Как на сайте",
      light: "Светлая",
      dark: "Тёмная",
      position: "Положение",
      positionAuto: "Рядом с боковой панелью",
      positionLeft: "Слева внизу",
      positionRight: "Справа внизу",
      components: "Состояние компонентов",
      activity: "Сбои и техобслуживание",
      allNormal: "Все компоненты работают штатно",
      abnormalCount: "Затронуто компонентов: {count}",
      normalCount: "Штатно работают: {normal} из {total}",
      allComponents: "Все компоненты ({count})",
      componentGroup: "{group} · {count}",
      expand: "Развернуть",
      collapse: "Свернуть",
      incidents: "Неустранённые сбои",
      maintenances: "Плановое техобслуживание",
      ongoingIncidents: "Текущие сбои",
      verified: "Проверено",
      partlyVerified: "Часть данных не проверена",
      unverified: "Не удалось проверить",
      noItems: "Нет",
      itemCount: "{count}",
      fetchedAt: "Данные получены (местное время): {time}",
      lastSuccess: "Последнее успешное обновление (местное время): {time}",
      autoRefresh: "Статус обновляется каждые {seconds} с",
      officialPage: "Открыть официальную страницу статуса ↗",
      sourceLive: "Источник: status.openai.com",
      sourceCompat: "Источник: status.openai.com (старый API)",
      compatWarning: "Не удалось прочитать страницу статуса. Показаны данные из старого API. Часть информации может отсутствовать.",
      fetchFailed: "Не удалось получить статус OpenAI: {error}. Проверьте подключение к интернету и попробуйте ещё раз.",
      staleWarning: "Не удалось обновить данные ({error}). Показаны последние данные (время получения: {time}).",
      cachedStatus: "{status} · из кэша",
      scopeNote: "Официальная доступность рассчитывается суммарно по тарифам, моделям и типам ошибок. Ваш опыт может отличаться в зависимости от тарифа и функции. Это независимый пользовательский скрипт, а не продукт OpenAI.",
      originalUpdate: "Последнее официальное обновление (оригинал)",
      unknownTime: "Время неизвестно",
      unknownComponent: "Неизвестный компонент",
      unnamedIncident: "Инцидент без названия",
      unnamedMaintenance: "Обслуживание без названия",
      noDetails: "Подробности отсутствуют",
      statusAndImpact: "Статус: {status} · Влияние: {impact}",
      maintenanceStage: "Статус: {status} · Плановое техобслуживание",
      scheduleStart: "Начало по плану: {time}",
      scheduleEnd: "Окончание по плану: {time}",
      scheduleRange: "{start}\n{end}",
      scheduleUnknown: "Время техобслуживания неизвестно",
      noticeUpdated: "Статус OpenAI обновлён: {status}",
      noticeInitial: "Уведомление о статусе OpenAI: {status}",
      launcherHint: "{status}. Откройте панель для просмотра подробностей.",
      unknownHint: "Не удалось получить статус OpenAI. Откройте панель, чтобы повторить попытку.",
      staleHint: "Не удалось обновить статус OpenAI: {error}. Откройте панель, чтобы посмотреть последние доступные данные или повторить попытку.",
      unknownError: "Неизвестная ошибка",
      errorHttp: "Страница статуса вернула код HTTP {status}",
      errorTimeout: "Страница статуса не ответила вовремя",
      errorNetwork: "Не удалось подключиться к официальной странице статуса",
      errorParse: "Не удалось разобрать официальные данные статуса",
      errorSchema: "Неожиданный формат данных со страницы статуса",
      errorEmpty: "Официальная страница статуса пуста",
      errorSummary: "Официальная сводка статуса не найдена",
      errorIncomplete: "Официальная сводка статуса неполная",
      menuToggle: "Показать / скрыть панель статуса OpenAI",
      menuSettings: "Настройки статуса OpenAI",
      settings: "Настройки",
      preferencesSaved: "Настройки сохранены",
      exportLayout: "Экспорт безопасной структуры страницы",
      exported: "Безопасная структура страницы экспортирована",
      privacyLayout: "Экспортируется только структура макета. Текст страницы, значения форм, ссылки, cookie, содержимое хранилищ и сетевые данные не включаются.",
      overall_none: "Все системы работают",
      short_none: "OpenAI работает",
      overall_minor: "Незначительный сбой сервиса",
      short_minor: "Небольшой сбой",
      overall_major: "Частичный отказ систем",
      short_major: "Частичный сбой",
      overall_critical: "Серьёзный сбой сервиса",
      short_critical: "Серьёзный сбой",
      overall_maintenance: "Сервис на обслуживании",
      short_maintenance: "Обслуживание",
      overall_unknown: "Официальный статус неизвестен",
      short_unknown: "Статус неизвестен",
      component_operational: "Работает",
      component_degraded_performance: "Снижение производительности",
      component_partial_outage: "Частичный отказ",
      component_major_outage: "Серьёзный сбой",
      component_full_outage: "Полный отказ",
      component_under_maintenance: "На обслуживании",
      component_unknown: "Статус неизвестен",
      incident_investigating: "Причину выясняют",
      incident_identified: "Причина установлена",
      incident_fixing: "Исправляется",
      incident_monitoring: "Контроль восстановления",
      incident_observing: "Наблюдение за восстановлением",
      incident_resolved: "Устранён",
      incident_postmortem: "Разбор причин сбоя",
      maintenance_scheduled: "Запланировано",
      maintenance_upcoming: "Скоро начнётся",
      maintenance_in_progress: "Выполняется",
      maintenance_ongoing: "Выполняется",
      maintenance_verifying: "Проверяется",
      maintenance_completed: "Завершено",
      impact_none: "Нет влияния",
      impact_minor: "Незначительное влияние",
      impact_major: "Значительное влияние",
      impact_critical: "Критическое влияние",
      impact_maintenance: "Плановое техобслуживание",
      impact_unknown: "Влияние неизвестно"
    },
    componentNames: {
      Login: "Вход",
      Images: "Изображения",
      Audio: "Аудио",
      Files: "Файлы",
      Search: "Поиск",
      "Fine-tuning": "Дообучение",
      "Deep Research": "Глубокое исследование",
      "Voice mode": "Голосовой режим",
      Batch: "Пакетная обработка",
      Embeddings: "Эмбеддинги",
      Moderations: "Модерация",
      "Connectors/Apps": "Коннекторы / приложения",
      "VS Code extension": "Расширение VS Code",
      Sites: "Сайты",
      Agent: "Агент",
      "File uploads": "Загрузка файлов",
      "Ads Manager": "Менеджер рекламы",
      CLI: "Командная строка (CLI)",
      Conversations: "Диалоги",
      "Image Generation": "Генерация изображений"
    },
    groupNames: { "Ads Platform": "Рекламная платформа", Other: "Другие компоненты" }
  };

  // src/locales/index.js
  var packs = [en_default, zh_CN_default, zh_TW_default, es_default, hi_default, pt_BR_default, ja_default, ko_default, fr_default, de_default, id_default, ar_default, ru_default];
  var DEFAULT_LOCALE = en_default.lang;
  var LOCALES = Object.fromEntries(packs.map((pack) => [pack.lang, pack]));

  // src/locales.js
  function normalizeLanguage(value) {
    return typeof value === "string" ? value.trim().replaceAll("_", "-").toLowerCase() : "";
  }
  function matchLocale(language) {
    const normalized = normalizeLanguage(language);
    if (!normalized || normalized === "auto") return null;
    const entries = Object.entries(LOCALES);
    const matchExact = (tag) => entries.find(([id, locale]) => normalizeLanguage(id) === tag || normalizeLanguage(locale.lang) === tag)?.[0];
    const exact = matchExact(normalized);
    if (exact) return exact;
    const allParts = normalized.split("-");
    const extensionAt = allParts.findIndex((part, index) => index > 0 && part.length === 1);
    const parts = extensionAt < 0 ? allParts : allParts.slice(0, extensionAt);
    const base = parts[0] === "in" ? "id" : parts[0];
    if (extensionAt >= 0 || base !== parts[0]) {
      const variant = matchExact([base, ...parts.slice(1)].join("-"));
      if (variant) return variant;
    }
    if (base === "zh") {
      if (parts.includes("hant")) return "zh-TW";
      if (parts.includes("hans")) return "zh-CN";
      return parts.some((part) => ["tw", "hk", "mo"].includes(part)) ? "zh-TW" : "zh-CN";
    }
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
    return DEFAULT_LOCALE;
  }
  function ownValue(object, key) {
    return object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : void 0;
  }
  function hasMessage(key) {
    return Object.hasOwn(LOCALES[DEFAULT_LOCALE].messages, key);
  }
  function translate(localeId, key, params = {}) {
    const locale = LOCALES[matchLocale(localeId) || DEFAULT_LOCALE];
    const message = ownValue(locale.messages, key) ?? ownValue(LOCALES[DEFAULT_LOCALE].messages, key) ?? String(key);
    return String(message).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name) => {
      const value = ownValue(params, name);
      return value == null ? placeholder : String(value);
    });
  }
  function translateComponent(localeId, name) {
    if (typeof name !== "string" || !name) return translate(localeId, "unknownComponent");
    const locale = LOCALES[matchLocale(localeId) || DEFAULT_LOCALE];
    return ownValue(locale.componentNames, name) ?? ownValue(LOCALES[DEFAULT_LOCALE].componentNames, name) ?? name;
  }
  function translateGroup(localeId, name) {
    const group = typeof name === "string" && name ? name : "Other";
    const locale = LOCALES[matchLocale(localeId) || DEFAULT_LOCALE];
    return ownValue(locale.groupNames, group) ?? ownValue(LOCALES[DEFAULT_LOCALE].groupNames, group) ?? group;
  }

  // src/layout.js
  var ADAPTERS = {
    chatgpt: ["#app-shell-sidebar", '[data-app-navigation-rail="true"]', "#stage-slideover-sidebar", "#stage-sidebar-tiny-bar", '[data-testid="sidebar"]'],
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
  var CLEARANCE = 10;
  var MAX_CANDIDATES = 96;
  function findClearPosition(preferred, bounds, obstacles, clearance = CLEARANCE) {
    const { width, height } = preferred;
    if (width <= 0 || height <= 0 || width > bounds.right - bounds.left || height > bounds.bottom - bounds.top) return null;
    const queue = [], seen = /* @__PURE__ */ new Set();
    function add(left, top) {
      left = Math.max(bounds.left, Math.min(left, bounds.right - width));
      top = Math.max(bounds.top, Math.min(top, bounds.bottom - height));
      const key = `${left}:${top}`;
      if (seen.has(key)) return;
      seen.add(key);
      queue.push({
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height,
        distance: Math.abs(left - preferred.left) + 2 * Math.abs(top - preferred.top)
      });
    }
    add(preferred.left, preferred.top);
    for (let attempt = 0; queue.length && attempt < MAX_CANDIDATES; attempt += 1) {
      queue.sort((a, b) => a.distance - b.distance);
      const candidate = queue.shift();
      const collision = obstacles.find((rect) => candidate.left < rect.right + clearance && candidate.right > rect.left - clearance && candidate.top < rect.bottom + clearance && candidate.bottom > rect.top - clearance);
      if (!collision) return candidate;
      add(collision.right + clearance, candidate.top);
      add(collision.left - clearance - width, candidate.top);
      add(candidate.left, collision.top - clearance - height);
      add(candidate.left, collision.bottom + clearance);
    }
    return null;
  }

  // src/sidebar.js
  var SETTLE_TIME = 200;
  var MAX_ANIMATION_TIME = 5e3;
  var ATTRIBUTES = [
    "class",
    "style",
    "hidden",
    "inert",
    "aria-hidden",
    "aria-expanded",
    "data-state",
    "data-app-shell-sidebar-open",
    "data-slate-sidebar-peeking"
  ];
  function visibleSidebarRect(element, viewport, clipAncestors = true) {
    const view = element.ownerDocument.defaultView;
    const bounds = element.getBoundingClientRect();
    let left = Math.max(bounds.left, viewport.left), right = Math.min(bounds.right, viewport.right);
    let top = Math.max(bounds.top, viewport.top), bottom = Math.min(bounds.bottom, viewport.bottom);
    if (right <= left || bottom <= top) return null;
    for (let node = element; node; node = node.parentElement) {
      const style = view.getComputedStyle(node);
      if (node.hidden || style.display === "none" || ["hidden", "collapse"].includes(style.visibility) || style.contentVisibility === "hidden" || Number.parseFloat(style.opacity) === 0) return null;
      if (node === element || !clipAncestors) continue;
      const paintClip = /\b(paint|strict|content)\b/.test(style.contain);
      const clipX = paintClip || ["hidden", "clip", "auto", "scroll", "overlay"].includes(style.overflowX || style.overflow);
      const clipY = paintClip || ["hidden", "clip", "auto", "scroll", "overlay"].includes(style.overflowY || style.overflow);
      if (!clipX && !clipY) continue;
      const rect = node.getBoundingClientRect();
      if (clipX) {
        left = Math.max(left, rect.left);
        right = Math.min(right, rect.right);
      }
      if (clipY) {
        top = Math.max(top, rect.top);
        bottom = Math.min(bottom, rect.bottom);
      }
    }
    if (right <= left || bottom <= top) return null;
    return { left, right, top, bottom, width: right - left, height: bottom - top, visible: true };
  }
  function createSidebarTracker(document2, selectors, onLayout) {
    const view = document2.defaultView;
    let sidebars = [], shell = /* @__PURE__ */ new Set(), frame = 0, settleUntil = 0, paused = false;
    const animations = /* @__PURE__ */ new Map();
    const observer = new view.MutationObserver(() => {
      discover();
      schedule(true);
    });
    const resizeObserver = typeof view.ResizeObserver === "function" ? new view.ResizeObserver(() => schedule()) : null;
    const events = ["transitionrun", "transitionend", "transitioncancel", "animationstart", "animationend", "animationcancel"];
    function schedule(settle = false) {
      if (paused || document2.hidden) return;
      if (settle) settleUntil = view.performance.now() + SETTLE_TIME;
      if (!frame) frame = view.requestAnimationFrame(tick);
    }
    function tick(now) {
      frame = 0;
      if (paused || document2.hidden) return;
      for (const [node, running] of animations) {
        for (const [key, started] of running) if (now - started >= MAX_ANIMATION_TIME) running.delete(key);
        if (!running.size) animations.delete(node);
      }
      onLayout();
      if (animations.size || now < settleUntil) schedule();
    }
    function animation(event) {
      if (event.target !== event.currentTarget) return;
      const key = `${event.type.startsWith("transition") ? "transition" : "animation"}:${event.propertyName || event.animationName}:${event.pseudoElement || ""}`;
      if (event.type === "transitionrun" || event.type === "animationstart") {
        if (!animations.has(event.target)) animations.set(event.target, /* @__PURE__ */ new Map());
        animations.get(event.target).set(key, view.performance.now());
      } else {
        animations.get(event.target)?.delete(key);
        if (!animations.get(event.target)?.size) animations.delete(event.target);
      }
      schedule(true);
    }
    function discover() {
      const next = [...document2.querySelectorAll(selectors)];
      const nodes = /* @__PURE__ */ new Set();
      for (const sidebar of next) for (let node = sidebar; node; node = node.parentElement) nodes.add(node);
      if (next.length === sidebars.length && next.every((node, index) => node === sidebars[index]) && nodes.size === shell.size && [...nodes].every((node) => shell.has(node))) return sidebars;
      observer.disconnect();
      resizeObserver?.disconnect();
      for (const node of shell) for (const name of events) node.removeEventListener(name, animation);
      sidebars = next;
      shell = nodes;
      animations.clear();
      for (const node of shell) {
        observer.observe(node, { attributes: true, attributeFilter: ATTRIBUTES, childList: true });
        if (node !== document2.body && node !== document2.documentElement) resizeObserver?.observe(node);
        for (const name of events) node.addEventListener(name, animation, { passive: true });
      }
      return sidebars;
    }
    function pause() {
      paused = true;
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      settleUntil = 0;
      animations.clear();
    }
    function resume() {
      paused = false;
      discover();
      schedule(true);
    }
    discover();
    return { discover, schedule, pause, resume };
  }

  // src/obstructions.js
  var OVERLAYS = '[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],[role="tooltip"],[aria-modal="true"],dialog[open],[popover],[data-radix-popper-content-wrapper],[data-radix-portal],[data-headlessui-portal]';
  var CONTENT = 'button,a[href],input:not([type="hidden"]),textarea,select,summary,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="textbox"],[role="combobox"],[role="slider"],[role="switch"],[role="checkbox"],[role="tab"],form,header,footer,[role="toolbar"],[role="navigation"],[role="alert"],[role="status"],article,p,h1,h2,h3,h4,h5,h6,pre,blockquote,table,img,video,canvas,iframe,[data-message-author-role],[data-testid^="conversation-turn-"]';
  var SELECTOR_ATTRIBUTES = /* @__PURE__ */ new Set([
    "role",
    "aria-modal",
    "open",
    "popover",
    "href",
    "type",
    "contenteditable",
    "data-testid",
    "id",
    "data-app-navigation-rail",
    "data-message-author-role",
    "data-radix-popper-content-wrapper",
    "data-radix-portal",
    "data-headlessui-portal"
  ]);
  var ATTRIBUTES2 = ["class", "style", "hidden", "inert", "aria-hidden", "aria-expanded", "data-state", ...SELECTOR_ATTRIBUTES];
  var MAX_ANIMATION_TIME2 = 5e3;
  function createObstructionTracker(document2, host, sidebarSelectors, onChange) {
    const view = document2.defaultView;
    const selector = `${OVERLAYS},${CONTENT},${sidebarSelectors}`;
    let candidates = [], dirty = true;
    const animations = /* @__PURE__ */ new Map();
    const resizeObserver = typeof view.ResizeObserver === "function" ? new view.ResizeObserver(() => onChange(true)) : null;
    const owned = (node) => node === host || host.contains(node);
    const relevant = (node) => node?.nodeType === 1 && !owned(node) && (node.matches(selector) || node.querySelector(selector));
    const observer = new view.MutationObserver((records) => {
      let changed = false;
      for (const record of records) {
        if (owned(record.target)) continue;
        if (record.type === "childList") {
          if ([...record.addedNodes, ...record.removedNodes].some(relevant)) {
            dirty = true;
            changed = true;
          }
        } else if (relevant(record.target) || candidates.some((node) => record.target.contains(node))) {
          dirty ||= SELECTOR_ATTRIBUTES.has(record.attributeName);
          changed = true;
        }
      }
      if (changed) onChange(true);
    });
    observer.observe(document2.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ATTRIBUTES2 });
    function discover() {
      if (!dirty) return;
      dirty = false;
      candidates = [...document2.querySelectorAll(selector)].filter((node) => !owned(node));
      resizeObserver?.disconnect();
      for (const node of candidates) {
        if (node.matches(OVERLAYS) || !node.parentElement?.closest(selector)) resizeObserver?.observe(node);
      }
    }
    function read(viewport) {
      discover();
      const now = view.performance.now();
      for (const [node, running] of animations) {
        for (const [key, started] of running) if (now - started >= MAX_ANIMATION_TIME2) running.delete(key);
        if (!running.size || !node.isConnected) animations.delete(node);
      }
      if (animations.size) onChange(true);
      const regions = [];
      const visible = /* @__PURE__ */ new Map();
      for (const node of candidates) {
        const rect = visibleSidebarRect(node, viewport, !node.matches(OVERLAYS));
        if (!rect) continue;
        if (node.getAttribute("aria-modal") === "true" || node.matches("dialog[open]")) return { regions: [], modal: true };
        visible.set(node, rect);
        let ancestor = node.parentElement;
        while (ancestor) {
          const container = visible.get(ancestor);
          if (container && container.left <= rect.left && container.right >= rect.right && container.top <= rect.top && container.bottom >= rect.bottom) break;
          ancestor = ancestor.parentElement;
        }
        if (!ancestor) regions.push(rect);
      }
      return { regions, modal: false };
    }
    function interaction(event) {
      if (!event.composedPath().includes(host)) onChange(true);
    }
    for (const name of ["pointerdown", "pointerover", "focusin", "keydown", "scroll", "toggle", "beforetoggle"]) {
      document2.addEventListener(name, interaction, { capture: true, passive: true });
    }
    function animation(event) {
      if (!relevant(event.target)) return;
      const key = `${event.type.startsWith("transition") ? "transition" : "animation"}:${event.propertyName || event.animationName}:${event.pseudoElement || ""}`;
      let running = animations.get(event.target);
      if (event.type === "transitionrun" || event.type === "animationstart") {
        if (!running) {
          running = /* @__PURE__ */ new Map();
          animations.set(event.target, running);
        }
        running.set(key, view.performance.now());
      } else {
        running?.delete(key);
        if (!running?.size) animations.delete(event.target);
      }
      onChange(true);
    }
    for (const name of ["transitionrun", "transitionend", "transitioncancel", "animationstart", "animationend", "animationcancel"]) {
      document2.addEventListener(name, animation, { capture: true, passive: true });
    }
    return { read, invalidate() {
      dirty = true;
      onChange(true);
    }, pause() {
      animations.clear();
    } };
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

  // src/main.js
  var HOST_ID = "openai-status-companion";
  var SETTINGS_KEY = "openai-status-companion:preferences";
  var NOTICE_KEY = "openai-status-companion:last-notice";
  var REFRESH_INTERVAL = 6e4;
  var MIN_REQUEST_GAP = 15e3;
  var FOCUS_REFRESH_AGE = 45e3;
  var DISCOVERY_INTERVAL = 2e3;
  var COMPACT_PANEL_WIDTH = 260;
  var COMPACT_PANEL_HEIGHTS = [200, 120];
  if (!document.getElementById(HOST_ID)) start();
  function start() {
    const settings = readSettings();
    let locale = resolveLocale(settings.language, document.documentElement.lang, navigator.languages);
    const t = (key, params) => translate(locale, key, params);
    let data = null, error = null, fetchedAt = 0, lastRequestAt = 0;
    let loading = false, expanded = false, settingsOpen = false;
    let pollTimer = 0, layoutTimer = 0, toastTimer = 0;
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
      return t(hasMessage(error?.code) ? error.code : "unknownError", { status: error?.status });
    }
    function setExpanded(next) {
      expanded = Boolean(next);
      panel.hidden = !expanded;
      launcher.setAttribute("aria-expanded", String(expanded));
      shadow.querySelector(".toast")?.remove();
      if (expanded) renderContent();
      place();
      if (expanded && !host.hasAttribute("inert")) panel.focus({ preventScroll: true });
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
      const launcherLabel = error && data ? t("cachedStatus", { status: label }) : label;
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
          groups.append(el("div", "group-name", t("componentGroup", {
            group: translateGroup(locale, group.name),
            count: group.component_ids.length
          })));
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
      name.dir = "auto";
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
      const status = hasMessage(statusKey) ? t(statusKey) : item.status || t("component_unknown");
      const impactKey = `impact_${item.impact}`;
      const impact = hasMessage(impactKey) ? t(impactKey) : t("impact_unknown");
      box.append(name, el("div", "meta", t(maintenance ? "maintenanceStage" : "statusAndImpact", { status, impact })));
      if (maintenance) {
        const start2 = item.scheduled_for ? t("scheduleStart", { time: date(item.scheduled_for) }) : "";
        const end = item.scheduled_until ? t("scheduleEnd", { time: date(item.scheduled_until) }) : "";
        const schedule = start2 && end ? t("scheduleRange", { start: start2, end }) : start2 || end || t("scheduleUnknown");
        box.append(el("div", "update", schedule));
      }
      const latest = findLatestUpdate(item.incident_updates);
      if (latest) {
        const update = el("div", "update");
        const original = el("div", "official-body", latest.body || t("noDetails"));
        original.dir = "auto";
        update.append(
          el("div", "", t("originalUpdate")),
          original,
          el("div", "", date(latest.display_at || latest.updated_at || latest.created_at))
        );
        box.append(update);
      }
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
      showToast(t(previous ? "noticeUpdated" : "noticeInitial", { status: t(overall.key) }), overall.tone);
    }
    function showToast(message, tone) {
      clearTimeout(toastTimer);
      shadow.querySelector(".toast")?.remove();
      const toast = el("div", `toast ${tone}`, message);
      toast.setAttribute("role", "status");
      toast.addEventListener("click", () => setExpanded(true));
      shadow.append(toast);
      toastTimer = setTimeout(() => {
        toast.remove();
        schedulePlacement();
      }, 8e3);
    }
    function schedulePoll() {
      clearTimeout(pollTimer);
      if (!document.hidden) pollTimer = setTimeout(() => refresh(), REFRESH_INTERVAL);
    }
    const selectors = ADAPTERS[host.dataset.adapter].join(",");
    const sidebarTracker = createSidebarTracker(document, selectors, place);
    const obstructions = createObstructionTracker(document, host, selectors, sidebarTracker.schedule);
    const surfaceObserver = typeof ResizeObserver === "function" ? new ResizeObserver(schedulePlacement) : null;
    surfaceObserver?.observe(launcher);
    surfaceObserver?.observe(panel);
    function schedulePlacement() {
      sidebarTracker.schedule();
    }
    function suppress(suppressed) {
      if (host.hasAttribute("data-suppressed") === suppressed) return;
      if (suppressed) shadow.activeElement?.blur();
      host.toggleAttribute("data-suppressed", suppressed);
      host.toggleAttribute("inert", suppressed);
    }
    function place() {
      if (!host.isConnected) document.documentElement.append(host);
      if (document.fullscreenElement) {
        suppress(true);
        return;
      }
      const viewport = window.visualViewport;
      const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
      const offsetLeft = viewport?.offsetLeft || 0, offsetTop = viewport?.offsetTop || 0;
      const clip = { left: offsetLeft, right: offsetLeft + width, top: offsetTop, bottom: offsetTop + height };
      const { regions, modal } = obstructions.read(clip);
      if (modal) {
        suppress(true);
        return;
      }
      const rects = sidebarTracker.discover().map((item) => visibleSidebarRect(item, clip)).filter(Boolean).map((rect) => ({ ...rect, left: rect.left - offsetLeft, right: rect.right - offsetLeft }));
      const sidebar = chooseSidebar(rects, width, height);
      const hostStyle = getComputedStyle(host);
      const safeInset = (edge) => Number.parseFloat(hostStyle.getPropertyValue(`--safe-${edge}`)) || 0;
      const gap = width < 768 ? 10 : 14;
      const bounds = {
        left: clip.left + Math.max(gap, safeInset("left")),
        right: clip.right - Math.max(gap, safeInset("right")),
        top: clip.top + Math.max(gap, safeInset("top")),
        bottom: clip.bottom - Math.max(gap, safeInset("bottom"))
      };
      host.style.setProperty("--available-width", `${Math.max(0, bounds.right - bounds.left)}px`);
      const launcherRect = launcher.getBoundingClientRect();
      const placement = calculatePlacement({
        width,
        height,
        offsetLeft,
        offsetTop,
        sidebarRight: sidebar?.right || 0,
        launcherWidth: launcherRect.width,
        launcherHeight: launcherRect.height,
        position: settings.position,
        safeLeft: safeInset("left"),
        safeRight: safeInset("right"),
        safeTop: safeInset("top"),
        safeBottom: safeInset("bottom")
      });
      const dock = findClearPosition({ left: placement.left, top: placement.top, width: launcherRect.width, height: launcherRect.height }, bounds, regions);
      if (!dock) {
        suppress(true);
        return;
      }
      host.style.left = `${dock.left}px`;
      host.style.top = `${dock.top}px`;
      host.style.bottom = "auto";
      const sidebarEdge = sidebar ? offsetLeft + sidebar.right + CLEARANCE : bounds.left;
      const panelWidth = Math.min(placement.panelWidth, Math.max(0, bounds.right - sidebarEdge));
      host.style.setProperty("--panel-width", `${panelWidth}px`);
      host.style.setProperty("--panel-height", `${placement.panelHeight}px`);
      const toast = shadow.querySelector(".toast");
      const surface = expanded ? panel : toast;
      let surfaceLeft = Math.min(dock.left, bounds.right - panelWidth), surfaceBottom = dock.top - CLEARANCE;
      if (surface) {
        let fit = function() {
          const { width: width2, height: height2 } = surface.getBoundingClientRect();
          return findClearPosition({ left: surfaceLeft, top: surfaceBottom - height2, width: width2, height: height2 }, bounds, blockers);
        };
        const blockers = [...regions, dock];
        let free = fit();
        if (expanded && !free) {
          host.style.setProperty("--panel-width", `${Math.min(panelWidth, COMPACT_PANEL_WIDTH)}px`);
          for (const height2 of COMPACT_PANEL_HEIGHTS) {
            host.style.setProperty("--panel-height", `${Math.min(placement.panelHeight, height2)}px`);
            free = fit();
            if (free) break;
          }
        }
        if (expanded && !free) {
          suppress(true);
          return;
        }
        if (toast) toast.toggleAttribute("data-suppressed", !free);
        if (free) {
          surfaceLeft = free.left;
          surfaceBottom = free.bottom;
        }
      }
      host.style.setProperty("--panel-left", `${surfaceLeft}px`);
      host.style.setProperty("--panel-bottom", `${innerHeight - surfaceBottom}px`);
      suppress(false);
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
        sidebarTracker.pause();
        obstructions.pause();
        return;
      }
      if (Date.now() - lastRequestAt >= FOCUS_REFRESH_AGE) refresh();
      else schedulePoll();
      sidebarTracker.resume();
      layoutWatch();
    });
    const focusRefresh = () => {
      if (!document.hidden && Date.now() - lastRequestAt >= FOCUS_REFRESH_AGE) refresh();
    };
    window.addEventListener("focus", focusRefresh, { passive: true });
    window.addEventListener("online", focusRefresh, { passive: true });
    window.addEventListener("resize", schedulePlacement, { passive: true });
    document.addEventListener("fullscreenchange", schedulePlacement);
    window.visualViewport?.addEventListener("resize", schedulePlacement, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedulePlacement, { passive: true });
    window.addEventListener("pageshow", () => {
      sidebarTracker.resume();
      obstructions.invalidate();
      schedulePoll();
      layoutWatch();
    });
    window.addEventListener("pagehide", () => {
      clearTimeout(pollTimer);
      clearTimeout(layoutTimer);
      sidebarTracker.pause();
      obstructions.pause();
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
