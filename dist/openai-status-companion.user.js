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
// @version      2.1.0
// @description  Official OpenAI status, components, incidents and maintenance on ChatGPT and Aizex / Leopard-X. 13 UI languages, sidebar docking and themes.
// @description:zh-CN 在 ChatGPT 与 Aizex / Leopard-X 显示 OpenAI 官方状态、组件、事件及计划维护，支持 13 种界面语言、边栏吸附和主题。
// @description:zh-TW 在 ChatGPT 與 Aizex / Leopard-X 顯示 OpenAI 官方狀態、元件、事件及排定維護，支援 13 種介面語言、側欄吸附與佈景主題。
// @description:es Estado oficial de OpenAI, componentes, incidentes y mantenimiento en ChatGPT y Aizex / Leopard-X. 13 idiomas, anclaje a la barra lateral y temas.
// @description:hi ChatGPT और Aizex / Leopard-X पर OpenAI की आधिकारिक स्थिति, घटक, घटनाएँ और रखरखाव। 13 इंटरफ़ेस भाषाएँ, साइडबार के पास स्थिति और थीम।
// @description:pt-BR Status oficial da OpenAI, componentes, incidentes e manutenção no ChatGPT e Aizex / Leopard-X. 13 idiomas, posição junto à barra lateral e temas.
// @description:ja ChatGPT と Aizex / Leopard-X で OpenAI 公式の稼働状況、コンポーネント、障害、メンテナンスを表示。13 言語、サイドバー追従、テーマに対応。
// @description:ko ChatGPT와 Aizex / Leopard-X에서 OpenAI 공식 상태, 구성 요소, 장애 및 유지보수를 표시합니다. 13개 언어, 사이드바 위치 추적 및 테마를 지원합니다.
// @description:fr État officiel d’OpenAI, composants, incidents et maintenance dans ChatGPT et Aizex / Leopard-X. 13 langues, ancrage à la barre latérale et thèmes.
// @description:de Offizieller OpenAI-Status, Komponenten, Vorfälle und Wartung in ChatGPT und Aizex / Leopard-X. 13 Sprachen, Andocken an die Seitenleiste und Themes.
// @description:id Status resmi OpenAI, komponen, insiden, dan pemeliharaan di ChatGPT dan Aizex / Leopard-X. 13 bahasa, posisi mengikuti bilah samping, dan tema.
// @description:ar عرض حالة OpenAI الرسمية والمكونات والحوادث والصيانة في ChatGPT وAizex / Leopard-X. يدعم 13 لغة والتموضع بجوار الشريط الجانبي والمظاهر.
// @description:ru Официальный статус OpenAI, компоненты, инциденты и обслуживание в ChatGPT и Aizex / Leopard-X. 13 языков, привязка к боковой панели и темы.
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
      components: "المكونات الرسمية",
      activity: "النشاط الرسمي",
      allNormal: "كل المكونات تعمل",
      abnormalCount: "المكونات المتأثرة: {count}",
      normalCount: "المكونات العاملة: {normal}/{total}",
      allComponents: "عرض جميع المكونات ({count})",
      expand: "توسيع",
      collapse: "طي",
      incidents: "الحوادث غير المحلولة",
      maintenances: "الصيانة المجدولة",
      ongoingIncidents: "الحوادث الجارية",
      verified: "تم التحقق",
      partlyVerified: "لم يتم التحقق من بعض البيانات",
      unverified: "لم يتم التحقق",
      noItems: "لا يوجد",
      itemCount: "{count}",
      fetchedAt: "وقت الجلب (محلي): {time}",
      lastSuccess: "آخر جلب ناجح (محلي): {time}",
      autoRefresh: "تحديث كل {seconds} ثانية",
      officialPage: "فتح صفحة الحالة الرسمية ↗",
      sourceLive: "بيانات مباشرة من status.openai.com",
      sourceCompat: "بيانات توافق من status.openai.com",
      compatWarning: "تعذرت قراءة صفحة الحالة الحالية. تُعرض بيانات توافق؛ راجع علامة التحقق في كل قسم.",
      fetchFailed: "تعذر جلب حالة OpenAI: {error}. تحقق من اتصالك وحاول التحديث.",
      staleWarning: "فشل التحديث ({error}). تُعرض البيانات التي جُلبت بنجاح في {time}.",
      cached: "بيانات محفوظة",
      scopeNote: "تجمع بيانات التوافر الرسمية جميع الخطط والنماذج وأنواع الأخطاء. قد تختلف تجربتك حسب الخطة والميزة. هذا سكربت مستخدم مستقل وليس منتجًا من OpenAI.",
      originalUpdate: "آخر تحديث رسمي (النص الأصلي)",
      unknownTime: "الوقت غير معروف",
      unknownComponent: "مكون غير معروف",
      unnamedIncident: "حادث بلا عنوان",
      unnamedMaintenance: "صيانة بلا عنوان",
      noDetails: "لا تتوفر تفاصيل",
      statusAndImpact: "الحالة: {status} · التأثير: {impact}",
      maintenanceStage: "الحالة: {status} · صيانة مجدولة",
      scheduleStart: "البداية المجدولة: {time}",
      scheduleEnd: "النهاية المجدولة: {time}",
      scheduleUnknown: "لم يُعلن موعد الصيانة بعد",
      noticeUpdated: "تم تحديث حالة OpenAI",
      noticeInitial: "إشعار حالة OpenAI",
      launcherHint: "{status}. افتح تفاصيل الحالة الرسمية.",
      unknownHint: "حالة OpenAI غير متاحة. افتح التفاصيل لإعادة المحاولة.",
      staleHint: "تعذر تحديث حالة OpenAI: {error}. افتح آخر بيانات ناجحة أو أعد المحاولة.",
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
      short_major: "انقطاع الخدمة",
      overall_critical: "انقطاع كبير في الخدمة",
      short_critical: "انقطاع كبير",
      overall_maintenance: "صيانة الخدمة جارية",
      short_maintenance: "صيانة",
      overall_unknown: "الحالة الرسمية غير معروفة",
      short_unknown: "الحالة غير معروفة",
      component_operational: "يعمل",
      component_degraded_performance: "أداء متراجع",
      component_partial_outage: "انقطاع جزئي",
      component_major_outage: "انقطاع كبير",
      component_full_outage: "انقطاع كامل",
      component_under_maintenance: "قيد الصيانة",
      component_unknown: "حالة غير معروفة",
      incident_investigating: "جارٍ التحقيق",
      incident_identified: "تم تحديد المشكلة",
      incident_fixing: "جارٍ الإصلاح",
      incident_monitoring: "مراقبة التعافي",
      incident_observing: "متابعة التعافي",
      incident_resolved: "تم الحل",
      incident_postmortem: "مراجعة ما بعد الحادث",
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
      "Image Generation": "توليد الصور",
      Space: "المساحة"
    },
    groupNames: { "Ads Platform": "منصة الإعلانات", Other: "مكونات أخرى" }
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
      close: "Panel schließen",
      open: "Statuspanel öffnen",
      language: "Sprache",
      auto: "Seite / Browser folgen",
      theme: "Design",
      themeAuto: "Website folgen",
      light: "Hell",
      dark: "Dunkel",
      position: "Position",
      positionAuto: "Neben der Seitenleiste",
      positionLeft: "Unten links",
      positionRight: "Unten rechts",
      components: "Offizielle Komponenten",
      activity: "Offizielle Meldungen",
      allNormal: "Alles betriebsbereit",
      abnormalCount: "{count} betroffen",
      normalCount: "{normal}/{total} Komponenten betriebsbereit",
      allComponents: "Alle {count} Komponenten anzeigen",
      expand: "Aufklappen",
      collapse: "Zuklappen",
      incidents: "Ungelöste Vorfälle",
      maintenances: "Geplante Wartungen",
      ongoingIncidents: "Laufende Vorfälle",
      verified: "Geprüft",
      partlyVerified: "Teilweise ungeprüft",
      unverified: "Ungeprüft",
      noItems: "Keine",
      itemCount: "{count}",
      fetchedAt: "Abgerufen (Ortszeit): {time}",
      lastSuccess: "Zuletzt erfolgreich abgerufen (Ortszeit): {time}",
      autoRefresh: "Aktualisierung alle {seconds} Sekunden",
      officialPage: "Offizielle Statusseite öffnen ↗",
      sourceLive: "Live-Daten von status.openai.com",
      sourceCompat: "Kompatibilitätsdaten von status.openai.com",
      compatWarning: "Die aktuelle Statusseite konnte nicht gelesen werden. Kompatibilitätsdaten werden angezeigt; beachten Sie den Prüfstatus der einzelnen Abschnitte.",
      fetchFailed: "Der OpenAI-Status konnte nicht abgerufen werden: {error}. Prüfen Sie Ihre Verbindung und aktualisieren Sie erneut.",
      staleWarning: "Aktualisierung fehlgeschlagen ({error}). Angezeigt werden die um {time} erfolgreich abgerufenen Daten.",
      cached: "im Cache",
      scopeNote: "Die offizielle Verfügbarkeit wird über alle Tarife, Modelle und Fehlertypen hinweg zusammengefasst. Ihre Erfahrung kann je nach Tarif und Funktion abweichen. Dieses Userscript ist unabhängig und kein Produkt von OpenAI.",
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
      scheduleUnknown: "Der Wartungszeitraum wurde noch nicht bekannt gegeben",
      noticeUpdated: "OpenAI-Status aktualisiert",
      noticeInitial: "Hinweis zum OpenAI-Status",
      launcherHint: "{status}. Offizielle Statusdetails öffnen.",
      unknownHint: "Der OpenAI-Status ist nicht verfügbar. Öffnen Sie die Details, um es erneut zu versuchen.",
      staleHint: "Der OpenAI-Status konnte nicht aktualisiert werden: {error}. Öffnen Sie die zuletzt erfolgreich abgerufenen Daten oder versuchen Sie es erneut.",
      unknownError: "Unbekannter Fehler",
      errorHttp: "Die offizielle Statusabfrage ergab HTTP {status}",
      errorTimeout: "Zeitüberschreitung bei der offiziellen Statusabfrage",
      errorNetwork: "Verbindung zur offiziellen Statusseite fehlgeschlagen",
      errorParse: "Die offiziellen Statusdaten konnten nicht verarbeitet werden",
      errorSchema: "Die offiziellen Statusdaten haben ein unerwartetes Format",
      errorEmpty: "Die offizielle Statusseite war leer",
      errorSummary: "Keine offizielle Statusübersicht gefunden",
      errorIncomplete: "Die offizielle Statusübersicht war unvollständig",
      menuToggle: "OpenAI-Statuspanel ein- / ausblenden",
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
      short_major: "Dienstausfall",
      overall_critical: "Schwerer Dienstausfall",
      short_critical: "Schwerer Ausfall",
      overall_maintenance: "Dienstwartung läuft",
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
      incident_identified: "Ursache ermittelt",
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
      "Deep Research": "Tiefgehende Recherche",
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
      Sites: "Websites",
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
      Space: "Bereich"
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
      auto: "Según la página / el navegador",
      theme: "Tema",
      themeAuto: "Según el sitio web",
      light: "Claro",
      dark: "Oscuro",
      position: "Posición",
      positionAuto: "Junto a la barra lateral",
      positionLeft: "Esquina inferior izquierda",
      positionRight: "Esquina inferior derecha",
      components: "Componentes oficiales",
      activity: "Actividad oficial",
      allNormal: "Todos operativos",
      abnormalCount: "{count} afectados",
      normalCount: "{normal}/{total} componentes operativos",
      allComponents: "Ver los {count} componentes",
      expand: "Expandir",
      collapse: "Contraer",
      incidents: "Incidentes sin resolver",
      maintenances: "Mantenimiento programado",
      ongoingIncidents: "Incidentes en curso",
      verified: "Verificado",
      partlyVerified: "Verificación parcial",
      unverified: "Sin verificar",
      noItems: "Ninguno",
      itemCount: "{count}",
      fetchedAt: "Consultado (hora local): {time}",
      lastSuccess: "Última consulta correcta (hora local): {time}",
      autoRefresh: "Se actualiza cada {seconds} segundos",
      officialPage: "Abrir página oficial de estado ↗",
      sourceLive: "Datos en directo de status.openai.com",
      sourceCompat: "Datos de compatibilidad de status.openai.com",
      compatWarning: "No se pudo leer la página de estado actual. Se muestran datos de compatibilidad; comprueba el indicador de verificación de cada sección.",
      fetchFailed: "No se pudo consultar el estado de OpenAI: {error}. Comprueba la conexión e intenta actualizar.",
      staleWarning: "Error al actualizar ({error}). Se muestran los datos obtenidos correctamente el {time}.",
      cached: "en caché",
      scopeNote: "La disponibilidad oficial se calcula en conjunto para todos los planes, modelos y tipos de error. Tu experiencia puede variar según el plan y la función. Este es un script de usuario independiente, no un producto de OpenAI.",
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
      scheduleUnknown: "Aún no se ha anunciado el horario del mantenimiento",
      noticeUpdated: "Estado de OpenAI actualizado",
      noticeInitial: "Aviso de estado de OpenAI",
      launcherHint: "{status}. Abre los detalles oficiales del estado.",
      unknownHint: "El estado de OpenAI no está disponible. Abre los detalles para volver a intentarlo.",
      staleHint: "No se pudo actualizar el estado de OpenAI: {error}. Abre los últimos datos consultados correctamente o vuelve a intentarlo.",
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
      overall_minor: "Interrupción leve del servicio",
      short_minor: "Incidencia leve",
      overall_major: "Interrupción parcial de los sistemas",
      short_major: "Servicio interrumpido",
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
      Space: "Espacio"
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
      auto: "Suivre la page / le navigateur",
      theme: "Thème",
      themeAuto: "Suivre le site",
      light: "Clair",
      dark: "Sombre",
      position: "Position",
      positionAuto: "À côté de la barre latérale",
      positionLeft: "En bas à gauche",
      positionRight: "En bas à droite",
      components: "Composants officiels",
      activity: "Activité officielle",
      allNormal: "Tout est opérationnel",
      abnormalCount: "{count} affecté(s)",
      normalCount: "{normal}/{total} composants opérationnels",
      allComponents: "Afficher les {count} composants",
      expand: "Développer",
      collapse: "Réduire",
      incidents: "Incidents non résolus",
      maintenances: "Maintenances planifiées",
      ongoingIncidents: "Incidents en cours",
      verified: "Vérifié",
      partlyVerified: "Vérification partielle",
      unverified: "Non vérifié",
      noItems: "Aucun élément",
      itemCount: "{count}",
      fetchedAt: "Récupéré (heure locale) : {time}",
      lastSuccess: "Dernière récupération réussie (heure locale) : {time}",
      autoRefresh: "Actualisation toutes les {seconds} secondes",
      officialPage: "Ouvrir la page d’état officielle ↗",
      sourceLive: "Données en direct de status.openai.com",
      sourceCompat: "Données de compatibilité de status.openai.com",
      compatWarning: "La page d’état actuelle n’a pas pu être lue. Des données de compatibilité sont affichées ; consultez le niveau de vérification de chaque section.",
      fetchFailed: "Impossible de récupérer l’état d’OpenAI : {error}. Vérifiez votre connexion et réessayez d’actualiser.",
      staleWarning: "Échec de l’actualisation ({error}). Affichage des données récupérées avec succès à {time}.",
      cached: "en cache",
      scopeNote: "La disponibilité officielle est agrégée pour tous les forfaits, modèles et types d’erreurs. Votre expérience peut varier selon votre forfait et les fonctionnalités utilisées. Ce script utilisateur est indépendant et n’est pas un produit OpenAI.",
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
      scheduleUnknown: "L’horaire de la maintenance n’a pas encore été annoncé",
      noticeUpdated: "État d’OpenAI mis à jour",
      noticeInitial: "Notification d’état d’OpenAI",
      launcherHint: "{status}. Ouvrir les détails officiels de l’état.",
      unknownHint: "L’état d’OpenAI est indisponible. Ouvrez les détails pour réessayer.",
      staleHint: "Impossible d’actualiser l’état d’OpenAI : {error}. Consultez les dernières données récupérées ou réessayez.",
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
      short_major: "Panne de service",
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
      Space: "Espace"
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

  // src/locales/hi.js
  var hi_default = {
    label: "हिन्दी",
    lang: "hi",
    dir: "ltr",
    messages: {
      title: "OpenAI की स्थिति",
      details: "OpenAI की स्थिति का विवरण",
      loading: "OpenAI की स्थिति लोड हो रही है…",
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
      components: "आधिकारिक घटक",
      activity: "आधिकारिक गतिविधि",
      allNormal: "सभी चालू हैं",
      abnormalCount: "{count} प्रभावित",
      normalCount: "{normal}/{total} घटक चालू",
      allComponents: "सभी {count} घटक देखें",
      expand: "विस्तार करें",
      collapse: "समेटें",
      incidents: "अनसुलझी घटनाएँ",
      maintenances: "निर्धारित रखरखाव",
      ongoingIncidents: "जारी घटनाएँ",
      verified: "सत्यापित",
      partlyVerified: "कुछ जानकारी असत्यापित",
      unverified: "असत्यापित",
      noItems: "कोई नहीं",
      itemCount: "{count}",
      fetchedAt: "प्राप्त करने का समय (स्थानीय): {time}",
      lastSuccess: "अंतिम सफल प्राप्ति (स्थानीय): {time}",
      autoRefresh: "हर {seconds} सेकंड में रीफ़्रेश",
      officialPage: "आधिकारिक स्थिति पेज खोलें ↗",
      sourceLive: "status.openai.com से ताज़ा डेटा",
      sourceCompat: "status.openai.com का वैकल्पिक डेटा",
      compatWarning: "मौजूदा स्थिति पेज पढ़ा नहीं जा सका। वैकल्पिक प्रारूप वाला डेटा दिखाया गया है; हर अनुभाग का सत्यापन संकेत देखें।",
      fetchFailed: "OpenAI की स्थिति प्राप्त नहीं हुई: {error}। अपना कनेक्शन जाँचें और फिर रीफ़्रेश करें।",
      staleWarning: "रीफ़्रेश विफल ({error})। {time} पर सफलतापूर्वक प्राप्त डेटा दिखाया जा रहा है।",
      cached: "कैश",
      scopeNote: "आधिकारिक उपलब्धता सभी प्लान, मॉडल और त्रुटि प्रकारों को मिलाकर बताई जाती है। आपका अनुभव प्लान और सुविधा के अनुसार अलग हो सकता है। यह एक स्वतंत्र यूज़रस्क्रिप्ट है, OpenAI का उत्पाद नहीं।",
      originalUpdate: "नवीनतम आधिकारिक अपडेट (मूल पाठ)",
      unknownTime: "समय अज्ञात",
      unknownComponent: "अज्ञात घटक",
      unnamedIncident: "बिना नाम की घटना",
      unnamedMaintenance: "बिना नाम का रखरखाव",
      noDetails: "कोई विवरण उपलब्ध नहीं",
      statusAndImpact: "स्थिति: {status} · प्रभाव: {impact}",
      maintenanceStage: "स्थिति: {status} · निर्धारित रखरखाव",
      scheduleStart: "निर्धारित शुरुआत: {time}",
      scheduleEnd: "निर्धारित समाप्ति: {time}",
      scheduleUnknown: "रखरखाव का समय अभी घोषित नहीं हुआ",
      noticeUpdated: "OpenAI की स्थिति अपडेट हुई",
      noticeInitial: "OpenAI की स्थिति की सूचना",
      launcherHint: "{status}। आधिकारिक स्थिति का विवरण खोलें।",
      unknownHint: "OpenAI की स्थिति उपलब्ध नहीं है। फिर प्रयास करने के लिए विवरण खोलें।",
      staleHint: "OpenAI की स्थिति रीफ़्रेश नहीं हुई: {error}। अंतिम सफल डेटा खोलें या फिर प्रयास करें।",
      unknownError: "अज्ञात त्रुटि",
      errorHttp: "आधिकारिक स्थिति अनुरोध ने HTTP {status} लौटाया",
      errorTimeout: "आधिकारिक स्थिति अनुरोध का समय समाप्त हुआ",
      errorNetwork: "आधिकारिक स्थिति पेज से कनेक्ट नहीं हो सका",
      errorParse: "आधिकारिक स्थिति डेटा का प्रारूप पढ़ा नहीं जा सका",
      errorSchema: "आधिकारिक स्थिति डेटा का प्रारूप अपेक्षा से अलग है",
      errorEmpty: "आधिकारिक स्थिति पेज खाली था",
      errorSummary: "आधिकारिक स्थिति का सारांश नहीं मिला",
      errorIncomplete: "आधिकारिक स्थिति का सारांश अधूरा था",
      menuToggle: "OpenAI स्थिति पैनल खोलें / बंद करें",
      menuSettings: "OpenAI स्थिति की प्राथमिकताएँ",
      settings: "प्राथमिकताएँ",
      preferencesSaved: "प्राथमिकताएँ सहेजी गईं",
      exportLayout: "सुरक्षित पेज लेआउट निर्यात करें",
      exported: "सुरक्षित पेज लेआउट निर्यात हुआ",
      privacyLayout: "केवल संरचनात्मक लेआउट की जानकारी निर्यात होती है। पेज का पाठ, फ़ॉर्म के मान, लिंक, कुकी, स्टोरेज सामग्री या नेटवर्क डेटा शामिल नहीं होते।",
      overall_none: "सभी प्रणालियाँ सामान्य रूप से चालू हैं",
      short_none: "OpenAI चालू",
      overall_minor: "सेवा में मामूली बाधा",
      short_minor: "मामूली बाधा",
      overall_major: "प्रणालियों में आंशिक रुकावट",
      short_major: "सेवा बाधित",
      overall_critical: "सेवा में गंभीर रुकावट",
      short_critical: "गंभीर रुकावट",
      overall_maintenance: "सेवा का रखरखाव जारी है",
      short_maintenance: "रखरखाव",
      overall_unknown: "आधिकारिक स्थिति अज्ञात",
      short_unknown: "स्थिति अज्ञात",
      component_operational: "चालू",
      component_degraded_performance: "कार्यप्रदर्शन में कमी",
      component_partial_outage: "आंशिक रुकावट",
      component_major_outage: "गंभीर रुकावट",
      component_full_outage: "पूर्ण रुकावट",
      component_under_maintenance: "रखरखाव जारी",
      component_unknown: "स्थिति अज्ञात",
      incident_investigating: "जाँच जारी",
      incident_identified: "समस्या पहचानी गई",
      incident_fixing: "समस्या ठीक की जा रही है",
      incident_monitoring: "बहाली की निगरानी जारी",
      incident_observing: "बहाली का अवलोकन जारी",
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
      Sites: "साइटें",
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
      Space: "स्पेस"
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

  // src/locales/id.js
  var id_default = {
    label: "Bahasa Indonesia",
    lang: "id",
    dir: "ltr",
    messages: {
      title: "Status OpenAI",
      details: "Detail status OpenAI",
      loading: "Mengambil status OpenAI…",
      unknown: "Status OpenAI tidak diketahui",
      refresh: "Segarkan sekarang",
      close: "Tutup panel",
      open: "Buka panel status",
      language: "Bahasa",
      auto: "Ikuti halaman / browser",
      theme: "Tema",
      themeAuto: "Ikuti situs",
      light: "Terang",
      dark: "Gelap",
      position: "Posisi",
      positionAuto: "Di samping bilah sisi",
      positionLeft: "Kiri bawah",
      positionRight: "Kanan bawah",
      components: "Komponen resmi",
      activity: "Aktivitas resmi",
      allNormal: "Semua beroperasi normal",
      abnormalCount: "{count} terdampak",
      normalCount: "{normal}/{total} komponen beroperasi normal",
      allComponents: "Lihat semua {count} komponen",
      expand: "Perluas",
      collapse: "Ciutkan",
      incidents: "Insiden yang belum selesai",
      maintenances: "Pemeliharaan terjadwal",
      ongoingIncidents: "Insiden yang berlangsung",
      verified: "Terverifikasi",
      partlyVerified: "Sebagian belum diverifikasi",
      unverified: "Belum diverifikasi",
      noItems: "Tidak ada",
      itemCount: "{count}",
      fetchedAt: "Diambil (waktu lokal): {time}",
      lastSuccess: "Terakhir berhasil diambil (waktu lokal): {time}",
      autoRefresh: "Disegarkan setiap {seconds} detik",
      officialPage: "Buka halaman status resmi ↗",
      sourceLive: "Data langsung dari status.openai.com",
      sourceCompat: "Data kompatibilitas dari status.openai.com",
      compatWarning: "Halaman status saat ini tidak dapat dibaca. Data kompatibilitas ditampilkan; periksa label verifikasi di setiap bagian.",
      fetchFailed: "Tidak dapat mengambil status OpenAI: {error}. Periksa koneksi Anda lalu coba segarkan lagi.",
      staleWarning: "Penyegaran gagal ({error}). Menampilkan data yang berhasil diambil pada {time}.",
      cached: "cache",
      scopeNote: "Ketersediaan resmi merupakan gabungan dari semua paket, model, dan jenis kesalahan. Pengalaman Anda dapat berbeda menurut paket dan fitur yang digunakan. Skrip pengguna ini bersifat independen dan bukan produk OpenAI.",
      originalUpdate: "Pembaruan resmi terbaru (teks asli)",
      unknownTime: "Waktu tidak diketahui",
      unknownComponent: "Komponen tidak diketahui",
      unnamedIncident: "Insiden tanpa nama",
      unnamedMaintenance: "Pemeliharaan tanpa nama",
      noDetails: "Detail tidak tersedia",
      statusAndImpact: "Status: {status} · Dampak: {impact}",
      maintenanceStage: "Status: {status} · Pemeliharaan terjadwal",
      scheduleStart: "Jadwal mulai: {time}",
      scheduleEnd: "Jadwal selesai: {time}",
      scheduleUnknown: "Waktu pemeliharaan belum diumumkan",
      noticeUpdated: "Status OpenAI diperbarui",
      noticeInitial: "Pemberitahuan status OpenAI",
      launcherHint: "{status}. Buka detail status resmi.",
      unknownHint: "Status OpenAI tidak tersedia. Buka detail untuk mencoba lagi.",
      staleHint: "Tidak dapat menyegarkan status OpenAI: {error}. Buka data terakhir yang berhasil diambil atau coba lagi.",
      unknownError: "Kesalahan tidak diketahui",
      errorHttp: "Permintaan status resmi mengembalikan HTTP {status}",
      errorTimeout: "Permintaan status resmi kehabisan waktu",
      errorNetwork: "Tidak dapat terhubung ke halaman status resmi",
      errorParse: "Data status resmi tidak dapat diurai",
      errorSchema: "Format data status resmi tidak sesuai harapan",
      errorEmpty: "Halaman status resmi kosong",
      errorSummary: "Ringkasan status resmi tidak ditemukan",
      errorIncomplete: "Ringkasan status resmi tidak lengkap",
      menuToggle: "Tampilkan / sembunyikan panel status OpenAI",
      menuSettings: "Preferensi status OpenAI",
      settings: "Preferensi",
      preferencesSaved: "Preferensi disimpan",
      exportLayout: "Ekspor struktur halaman yang aman",
      exported: "Struktur halaman yang aman diekspor",
      privacyLayout: "Hanya informasi struktur tata letak yang diekspor. Teks halaman, nilai formulir, tautan, cookie, isi penyimpanan, dan data jaringan tidak disertakan.",
      overall_none: "Semua sistem beroperasi normal",
      short_none: "OpenAI normal",
      overall_minor: "Gangguan layanan ringan",
      short_minor: "Gangguan ringan",
      overall_major: "Gangguan sebagian sistem",
      short_major: "Gangguan layanan",
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
      incident_resolved: "Selesai",
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
      Sites: "Situs",
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
      Space: "Ruang"
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
      activity: "公式の更新情報",
      allNormal: "すべて正常",
      abnormalCount: "{count} 件に影響",
      normalCount: "{normal}/{total} 個のコンポーネントが正常",
      allComponents: "全 {count} 個のコンポーネントを表示",
      expand: "展開",
      collapse: "折りたたむ",
      incidents: "未解決のインシデント",
      maintenances: "予定メンテナンス",
      ongoingIncidents: "進行中のインシデント",
      verified: "確認済み",
      partlyVerified: "一部未確認",
      unverified: "未確認",
      noItems: "なし",
      itemCount: "{count} 件",
      fetchedAt: "取得日時（現地時間）：{time}",
      lastSuccess: "最終取得成功日時（現地時間）：{time}",
      autoRefresh: "{seconds} 秒ごとに自動更新",
      officialPage: "公式ステータスページを開く ↗",
      sourceLive: "status.openai.com の最新データ",
      sourceCompat: "status.openai.com の互換データ",
      compatWarning: "現在の公式ステータスページを読み取れないため、互換データを表示しています。各項目の確認状況をご確認ください。",
      fetchFailed: "OpenAI の状態を取得できませんでした：{error}。接続を確認して再度更新してください。",
      staleWarning: "更新に失敗しました（{error}）。{time} に取得できたデータを表示しています。",
      cached: "キャッシュ",
      scopeNote: "公式の可用性はプラン、モデル、エラー種別をまとめた集計値です。実際の利用状況はプランや機能によって異なります。本スクリプトは独立したユーザースクリプトで、OpenAI の製品ではありません。",
      originalUpdate: "公式の最新更新（原文）",
      unknownTime: "日時不明",
      unknownComponent: "不明なコンポーネント",
      unnamedIncident: "名称未設定のインシデント",
      unnamedMaintenance: "名称未設定のメンテナンス",
      noDetails: "詳細情報はありません",
      statusAndImpact: "状態：{status} · 影響：{impact}",
      maintenanceStage: "状態：{status} · 予定メンテナンス",
      scheduleStart: "開始予定：{time}",
      scheduleEnd: "終了予定：{time}",
      scheduleUnknown: "メンテナンス日時は未発表です",
      noticeUpdated: "OpenAI の稼働状況が更新されました",
      noticeInitial: "OpenAI の稼働状況のお知らせ",
      launcherHint: "{status}。公式の状態の詳細を開きます。",
      unknownHint: "OpenAI の状態を取得できません。詳細を開いて再試行してください。",
      staleHint: "OpenAI の状態を更新できませんでした：{error}。前回取得したデータを開くか、再試行してください。",
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
      short_major: "サービス障害",
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
      incident_identified: "原因を特定済み",
      incident_fixing: "修正中",
      incident_monitoring: "復旧状況を監視中",
      incident_observing: "復旧状況を確認中",
      incident_resolved: "解決済み",
      incident_postmortem: "事後分析",
      maintenance_scheduled: "予定済み",
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
      Sites: "サイト",
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
      Space: "スペース"
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
      details: "OpenAI 서비스 상태 상세 정보",
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
      activity: "공식 업데이트",
      allNormal: "모두 정상",
      abnormalCount: "{count}개 영향받음",
      normalCount: "구성 요소 {normal}/{total}개 정상",
      allComponents: "구성 요소 {count}개 모두 보기",
      expand: "펼치기",
      collapse: "접기",
      incidents: "미해결 장애",
      maintenances: "예정된 점검",
      ongoingIncidents: "진행 중인 장애",
      verified: "확인됨",
      partlyVerified: "일부 미확인",
      unverified: "미확인",
      noItems: "없음",
      itemCount: "{count}건",
      fetchedAt: "가져온 시각(현지): {time}",
      lastSuccess: "마지막으로 가져온 시각(현지): {time}",
      autoRefresh: "{seconds}초마다 자동 새로고침",
      officialPage: "공식 상태 페이지 열기 ↗",
      sourceLive: "status.openai.com의 최신 데이터",
      sourceCompat: "status.openai.com의 호환 데이터",
      compatWarning: "현재 공식 상태 페이지를 읽을 수 없어 호환 데이터를 표시합니다. 각 항목의 확인 여부를 확인하세요.",
      fetchFailed: "OpenAI 상태를 가져올 수 없습니다: {error}. 연결 상태를 확인한 후 다시 새로고침하세요.",
      staleWarning: "새로고침에 실패했습니다({error}). {time}에 성공적으로 가져온 데이터를 표시합니다.",
      cached: "캐시",
      scopeNote: "공식 가용성은 요금제, 모델, 오류 유형을 통합한 통계입니다. 실제 사용 환경은 요금제와 기능에 따라 다를 수 있습니다. 이 스크립트는 독립적인 사용자 스크립트이며 OpenAI 제품이 아닙니다.",
      originalUpdate: "최신 공식 업데이트(원문)",
      unknownTime: "시각을 알 수 없음",
      unknownComponent: "알 수 없는 구성 요소",
      unnamedIncident: "이름 없는 장애",
      unnamedMaintenance: "이름 없는 점검",
      noDetails: "상세 정보 없음",
      statusAndImpact: "상태: {status} · 영향: {impact}",
      maintenanceStage: "상태: {status} · 예정된 점검",
      scheduleStart: "예정 시작 시각: {time}",
      scheduleEnd: "예정 종료 시각: {time}",
      scheduleUnknown: "점검 시간이 아직 공지되지 않았습니다",
      noticeUpdated: "OpenAI 서비스 상태가 업데이트되었습니다",
      noticeInitial: "OpenAI 서비스 상태 알림",
      launcherHint: "{status}. 공식 상태 상세 정보를 엽니다.",
      unknownHint: "OpenAI 상태를 가져올 수 없습니다. 상세 정보를 열어 다시 시도하세요.",
      staleHint: "OpenAI 상태를 새로고침할 수 없습니다: {error}. 마지막으로 가져온 데이터를 열거나 다시 시도하세요.",
      unknownError: "알 수 없는 오류",
      errorHttp: "공식 상태 요청에서 HTTP {status}를 반환했습니다",
      errorTimeout: "공식 상태 요청 시간이 초과되었습니다",
      errorNetwork: "공식 상태 페이지에 연결할 수 없습니다",
      errorParse: "공식 상태 데이터를 분석할 수 없습니다",
      errorSchema: "공식 상태 데이터 형식이 예상과 다릅니다",
      errorEmpty: "공식 상태 페이지 내용이 비어 있습니다",
      errorSummary: "공식 상태 요약을 찾을 수 없습니다",
      errorIncomplete: "공식 상태 요약이 불완전합니다",
      menuToggle: "OpenAI 상태 패널 열기 / 닫기",
      menuSettings: "OpenAI 상태 환경설정",
      settings: "환경설정",
      preferencesSaved: "환경설정이 저장되었습니다",
      exportLayout: "안전한 페이지 구조 내보내기",
      exported: "안전한 페이지 구조를 내보냈습니다",
      privacyLayout: "레이아웃 구조만 내보냅니다. 페이지 텍스트, 입력 값, 링크, Cookie, 저장소 내용, 네트워크 데이터는 포함하지 않습니다.",
      overall_none: "모든 시스템이 정상 작동 중입니다",
      short_none: "OpenAI 정상",
      overall_minor: "경미한 서비스 장애",
      short_minor: "경미한 장애",
      overall_major: "일부 시스템 장애",
      short_major: "서비스 장애",
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
      incident_fixing: "수정 중",
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
      Sites: "사이트",
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
      auto: "Seguir página / navegador",
      theme: "Tema",
      themeAuto: "Seguir site",
      light: "Claro",
      dark: "Escuro",
      position: "Posição",
      positionAuto: "Ao lado da barra lateral",
      positionLeft: "Canto inferior esquerdo",
      positionRight: "Canto inferior direito",
      components: "Componentes oficiais",
      activity: "Atividade oficial",
      allNormal: "Todos operacionais",
      abnormalCount: "{count} afetados",
      normalCount: "{normal}/{total} componentes operacionais",
      allComponents: "Ver todos os {count} componentes",
      expand: "Expandir",
      collapse: "Recolher",
      incidents: "Incidentes não resolvidos",
      maintenances: "Manutenção programada",
      ongoingIncidents: "Incidentes em andamento",
      verified: "Verificado",
      partlyVerified: "Verificação parcial",
      unverified: "Não verificado",
      noItems: "Nenhum",
      itemCount: "{count}",
      fetchedAt: "Obtido (horário local): {time}",
      lastSuccess: "Última obtenção bem-sucedida (horário local): {time}",
      autoRefresh: "Atualiza a cada {seconds} segundos",
      officialPage: "Abrir página oficial de status ↗",
      sourceLive: "Dados ao vivo de status.openai.com",
      sourceCompat: "Dados de compatibilidade de status.openai.com",
      compatWarning: "Não foi possível ler a página de status atual. Exibimos dados de compatibilidade; confira o indicador de verificação de cada seção.",
      fetchFailed: "Não foi possível obter o status da OpenAI: {error}. Verifique sua conexão e tente atualizar.",
      staleWarning: "Falha ao atualizar ({error}). Exibindo dados obtidos com sucesso em {time}.",
      cached: "em cache",
      scopeNote: "A disponibilidade oficial reúne todos os planos, modelos e tipos de erro. Sua experiência pode variar conforme o plano e o recurso. Este é um script de usuário independente, não um produto da OpenAI.",
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
      scheduleUnknown: "O horário da manutenção ainda não foi anunciado",
      noticeUpdated: "Status da OpenAI atualizado",
      noticeInitial: "Aviso de status da OpenAI",
      launcherHint: "{status}. Abra os detalhes oficiais do status.",
      unknownHint: "O status da OpenAI não está disponível. Abra os detalhes para tentar novamente.",
      staleHint: "Não foi possível atualizar o status da OpenAI: {error}. Abra os últimos dados obtidos com sucesso ou tente novamente.",
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
      overall_minor: "Interrupção leve do serviço",
      short_minor: "Interrupção leve",
      overall_major: "Interrupção parcial dos sistemas",
      short_major: "Serviço interrompido",
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
      Space: "Espaço"
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

  // src/locales/ru.js
  var ru_default = {
    label: "Русский",
    lang: "ru",
    dir: "ltr",
    messages: {
      title: "Статус OpenAI",
      details: "Подробный статус сервисов OpenAI",
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
      components: "Официальные компоненты",
      activity: "Официальные события",
      allNormal: "Всё работает",
      abnormalCount: "Затронуто: {count}",
      normalCount: "Работают компоненты: {normal}/{total}",
      allComponents: "Все компоненты ({count})",
      expand: "Развернуть",
      collapse: "Свернуть",
      incidents: "Нерешённые инциденты",
      maintenances: "Плановое обслуживание",
      ongoingIncidents: "Текущие инциденты",
      verified: "Проверено",
      partlyVerified: "Частично не проверено",
      unverified: "Не проверено",
      noItems: "Нет",
      itemCount: "{count}",
      fetchedAt: "Получено (местное время): {time}",
      lastSuccess: "Последнее успешное получение (местное время): {time}",
      autoRefresh: "Обновление каждые {seconds} секунд",
      officialPage: "Открыть официальную страницу статуса ↗",
      sourceLive: "Актуальные данные status.openai.com",
      sourceCompat: "Совместимый источник status.openai.com",
      compatWarning: "Не удалось прочитать текущую страницу статуса. Показаны данные совместимого источника; проверяйте отметку в каждом разделе.",
      fetchFailed: "Не удалось получить статус OpenAI: {error}. Проверьте соединение и обновите данные.",
      staleWarning: "Ошибка обновления ({error}). Показаны данные, успешно полученные в {time}.",
      cached: "кэш",
      scopeNote: "Официальная доступность рассчитывается суммарно по тарифам, моделям и типам ошибок. Ваш опыт может отличаться в зависимости от тарифа и функции. Это независимый пользовательский скрипт, а не продукт OpenAI.",
      originalUpdate: "Последнее официальное обновление (оригинал)",
      unknownTime: "Время неизвестно",
      unknownComponent: "Неизвестный компонент",
      unnamedIncident: "Инцидент без названия",
      unnamedMaintenance: "Обслуживание без названия",
      noDetails: "Подробности отсутствуют",
      statusAndImpact: "Статус: {status} · Влияние: {impact}",
      maintenanceStage: "Статус: {status} · Плановое обслуживание",
      scheduleStart: "Начало по плану: {time}",
      scheduleEnd: "Окончание по плану: {time}",
      scheduleUnknown: "Время обслуживания ещё не объявлено",
      noticeUpdated: "Статус OpenAI обновлён",
      noticeInitial: "Уведомление о статусе OpenAI",
      launcherHint: "{status}. Открыть официальные сведения о статусе.",
      unknownHint: "Статус OpenAI недоступен. Откройте подробности, чтобы повторить попытку.",
      staleHint: "Не удалось обновить статус OpenAI: {error}. Откройте последние успешные данные или повторите попытку.",
      unknownError: "Неизвестная ошибка",
      errorHttp: "Запрос официального статуса вернул HTTP {status}",
      errorTimeout: "Время ожидания официального статуса истекло",
      errorNetwork: "Не удалось подключиться к официальной странице статуса",
      errorParse: "Не удалось разобрать официальные данные статуса",
      errorSchema: "Непредвиденный формат официальных данных статуса",
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
      short_major: "Сбой сервиса",
      overall_critical: "Крупный сбой сервиса",
      short_critical: "Крупный сбой",
      overall_maintenance: "Сервис на обслуживании",
      short_maintenance: "Обслуживание",
      overall_unknown: "Официальный статус неизвестен",
      short_unknown: "Статус неизвестен",
      component_operational: "Работает",
      component_degraded_performance: "Снижение производительности",
      component_partial_outage: "Частичный отказ",
      component_major_outage: "Крупный отказ",
      component_full_outage: "Полный отказ",
      component_under_maintenance: "На обслуживании",
      component_unknown: "Статус неизвестен",
      incident_investigating: "Расследуется",
      incident_identified: "Причина установлена",
      incident_fixing: "Исправляется",
      incident_monitoring: "Контроль восстановления",
      incident_observing: "Наблюдение за восстановлением",
      incident_resolved: "Решён",
      incident_postmortem: "Разбор инцидента",
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
      impact_maintenance: "Плановое обслуживание",
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
      "Image Generation": "Генерация изображений",
      Space: "Пространство"
    },
    groupNames: { "Ads Platform": "Рекламная платформа", Other: "Другие компоненты" }
  };

  // src/locales/zh-TW.js
  var zh_TW_default = {
    label: "繁體中文",
    lang: "zh-TW",
    dir: "ltr",
    messages: {
      title: "OpenAI 官方狀態",
      details: "OpenAI 官方狀態詳情",
      loading: "正在擷取 OpenAI 狀態…",
      unknown: "OpenAI 狀態未知",
      refresh: "立即重新整理",
      close: "收合面板",
      open: "開啟狀態面板",
      language: "語言",
      auto: "跟隨網頁 / 瀏覽器",
      theme: "主題",
      themeAuto: "跟隨網站",
      light: "淺色",
      dark: "深色",
      position: "位置",
      positionAuto: "側邊欄外側",
      positionLeft: "左下角",
      positionRight: "右下角",
      components: "官方元件",
      activity: "官方動態",
      allNormal: "全部正常",
      abnormalCount: "{count} 個元件受影響",
      normalCount: "{normal}/{total} 個元件正常運作",
      allComponents: "檢視全部 {count} 個元件",
      expand: "展開",
      collapse: "收合",
      incidents: "未解決事件",
      maintenances: "排定維護",
      ongoingIncidents: "進行中的事件",
      verified: "已核實",
      partlyVerified: "部分未核實",
      unverified: "未核實",
      noItems: "無",
      itemCount: "{count} 項",
      fetchedAt: "擷取時間（本機）：{time}",
      lastSuccess: "上次成功擷取（本機）：{time}",
      autoRefresh: "每 {seconds} 秒自動重新整理",
      officialPage: "開啟官方狀態頁 ↗",
      sourceLive: "status.openai.com 即時資料",
      sourceCompat: "status.openai.com 相容資料",
      compatWarning: "目前無法讀取官方狀態頁，已改用相容資料來源；請依各部分的核實標記確認資料完整性。",
      fetchFailed: "無法擷取 OpenAI 官方狀態：{error}。請檢查網路連線後重新整理。",
      staleWarning: "本次重新整理失敗（{error}），目前顯示於 {time} 成功擷取的資料。",
      cached: "快取",
      scopeNote: "官方可用性為所有方案、模型及錯誤類型的彙總資料；實際使用體驗可能因方案與功能而異。本腳本為獨立專案，並非 OpenAI 官方產品。",
      originalUpdate: "官方最新更新（原文）",
      unknownTime: "時間未知",
      unknownComponent: "未知元件",
      unnamedIncident: "未命名事件",
      unnamedMaintenance: "未命名維護",
      noDetails: "暫無說明",
      statusAndImpact: "狀態：{status} · 影響：{impact}",
      maintenanceStage: "狀態：{status} · 排定維護",
      scheduleStart: "預定開始：{time}",
      scheduleEnd: "預定結束：{time}",
      scheduleUnknown: "維護時間尚未公布",
      noticeUpdated: "OpenAI 官方狀態已更新",
      noticeInitial: "OpenAI 官方狀態通知",
      launcherHint: "{status}；按一下即可檢視官方詳情",
      unknownHint: "暫時無法擷取 OpenAI 官方狀態；按一下即可檢視詳情或重試",
      staleHint: "暫時無法重新整理 OpenAI 官方狀態：{error}；按一下即可檢視上次成功擷取的資料或重試",
      unknownError: "未知錯誤",
      errorHttp: "官方狀態請求傳回 HTTP {status}",
      errorTimeout: "官方狀態請求逾時",
      errorNetwork: "無法連線至官方狀態頁",
      errorParse: "無法剖析官方狀態資料",
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
      overall_minor: "輕微服務中斷",
      short_minor: "輕微中斷",
      overall_major: "部分系統中斷",
      short_major: "服務中斷",
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
      incident_monitoring: "正在監控復原狀況",
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
      "Deep Research": "深入研究",
      Realtime: "Realtime API",
      "Voice mode": "語音模式",
      Batch: "批次處理",
      Embeddings: "嵌入",
      Moderations: "內容審核",
      "Codex Web": "Codex 網頁版",
      "Codex in ChatGPT Desktop": "ChatGPT 桌面版 Codex",
      "Connectors/Apps": "連接器 / 應用程式",
      "VS Code extension": "VS Code 擴充功能",
      "Codex API": "Codex API",
      Sites: "網站",
      Agent: "代理程式",
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
      Space: "資料空間"
    },
    groupNames: { APIs: "APIs", ChatGPT: "ChatGPT", Codex: "Codex", FedRAMP: "FedRAMP", "Ads Platform": "廣告平台", Other: "其他元件" }
  };

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
    },
    "zh-TW": zh_TW_default,
    es: es_default,
    hi: hi_default,
    "pt-BR": pt_BR_default,
    ja: ja_default,
    ko: ko_default,
    fr: fr_default,
    de: de_default,
    id: id_default,
    ar: ar_default,
    ru: ru_default
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
    const allParts = normalized.split("-");
    const extensionAt = allParts.findIndex((part, index) => index > 0 && part.length === 1);
    const parts = extensionAt < 0 ? allParts : allParts.slice(0, extensionAt);
    const base = parts[0] === "in" ? "id" : parts[0];
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
  function visibleSidebarRect(element, viewport) {
    const view = element.ownerDocument.defaultView;
    const bounds = element.getBoundingClientRect();
    let left = Math.max(bounds.left, viewport.left), right = Math.min(bounds.right, viewport.right);
    let top = Math.max(bounds.top, viewport.top), bottom = Math.min(bounds.bottom, viewport.bottom);
    for (let node = element; node; node = node.parentElement) {
      const style = view.getComputedStyle(node);
      if (node.hidden || style.display === "none" || ["hidden", "collapse"].includes(style.visibility) || style.contentVisibility === "hidden" || Number.parseFloat(style.opacity) === 0) return null;
      if (node === element) continue;
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
  .launcher {min-height:36px; padding:8px 10px; max-width:160px; font-size:12px}
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
    const sidebarTracker = createSidebarTracker(document, selectors, place);
    function schedulePlacement() {
      sidebarTracker.schedule();
    }
    function place() {
      if (!host.isConnected) document.documentElement.append(host);
      host.hidden = Boolean(document.fullscreenElement);
      const viewport = window.visualViewport;
      const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
      const offsetLeft = viewport?.offsetLeft || 0, offsetTop = viewport?.offsetTop || 0;
      const clip = { left: offsetLeft, right: offsetLeft + width, top: offsetTop, bottom: offsetTop + height };
      const rects = sidebarTracker.discover().map((item) => visibleSidebarRect(item, clip)).filter(Boolean).map((rect) => ({ ...rect, left: rect.left - offsetLeft, right: rect.right - offsetLeft }));
      const sidebar = chooseSidebar(rects, width, height);
      const launcherRect = launcher.getBoundingClientRect();
      const hostStyle = getComputedStyle(host);
      const safeInset = (edge) => Number.parseFloat(hostStyle.getPropertyValue(`--safe-${edge}`)) || 0;
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
        sidebarTracker.pause();
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
    window.visualViewport?.addEventListener("resize", schedulePlacement, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedulePlacement, { passive: true });
    window.addEventListener("pageshow", () => {
      sidebarTracker.resume();
      schedulePoll();
      layoutWatch();
    });
    window.addEventListener("pagehide", () => {
      clearTimeout(pollTimer);
      clearTimeout(layoutTimer);
      sidebarTracker.pause();
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
