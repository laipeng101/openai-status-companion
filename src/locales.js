// Locale resources are bundled into the userscript; no translation service is used.
// Add a bundled locale module with the same message keys and register it below.
import ar from './locales/ar.js';
import de from './locales/de.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import hi from './locales/hi.js';
import id from './locales/id.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';
import ptBR from './locales/pt-BR.js';
import ru from './locales/ru.js';
import zhTW from './locales/zh-TW.js';
const EN_MESSAGES = {
    title: 'OpenAI Status',
    details: 'OpenAI status details',
    loading: 'Fetching OpenAI status…',
    unknown: 'OpenAI status unknown',
    refresh: 'Refresh now',
    close: 'Close panel',
    open: 'Open status panel',
    language: 'Language',
    auto: 'Follow page / browser',
    theme: 'Theme',
    themeAuto: 'Follow website',
    light: 'Light',
    dark: 'Dark',
    position: 'Position',
    positionAuto: 'Beside sidebar',
    positionLeft: 'Bottom left',
    positionRight: 'Bottom right',
    components: 'Official components',
    activity: 'Official activity',
    allNormal: 'All operational',
    abnormalCount: '{count} affected',
    normalCount: '{normal}/{total} components operational',
    allComponents: 'View all {count} components',
    expand: 'Expand',
    collapse: 'Collapse',
    incidents: 'Unresolved incidents',
    maintenances: 'Scheduled maintenance',
    ongoingIncidents: 'Ongoing incidents',
    verified: 'Verified',
    partlyVerified: 'Partly unverified',
    unverified: 'Unverified',
    noItems: 'None',
    itemCount: '{count}',
    fetchedAt: 'Fetched (local): {time}',
    lastSuccess: 'Last successful fetch (local): {time}',
    autoRefresh: 'Refreshes every {seconds} seconds',
    officialPage: 'Open official status page ↗',
    sourceLive: 'Live data from status.openai.com',
    sourceCompat: 'Compatibility data from status.openai.com',
    compatWarning: 'The current status page could not be read. Compatibility data is shown; check each section’s verification label.',
    fetchFailed: 'Could not fetch OpenAI status: {error}. Check your connection and try refreshing.',
    staleWarning: 'Refresh failed ({error}). Showing data successfully fetched at {time}.',
    cached: 'cached',
    scopeNote: 'Official availability is aggregated across plans, models and error types. Your experience may vary by plan and feature. This is an independent userscript, not an OpenAI product.',
    originalUpdate: 'Latest official update (original text)',
    unknownTime: 'Time unknown',
    unknownComponent: 'Unknown component',
    unnamedIncident: 'Unnamed incident',
    unnamedMaintenance: 'Unnamed maintenance',
    noDetails: 'No details available',
    statusAndImpact: 'Status: {status} · Impact: {impact}',
    maintenanceStage: 'Status: {status} · Scheduled maintenance',
    scheduleStart: 'Scheduled start: {time}',
    scheduleEnd: 'Scheduled end: {time}',
    scheduleUnknown: 'Maintenance time has not been announced',
    noticeUpdated: 'OpenAI status updated',
    noticeInitial: 'OpenAI status notice',
    launcherHint: '{status}. Open official status details.',
    unknownHint: 'OpenAI status is unavailable. Open details to retry.',
    staleHint: 'Could not refresh OpenAI status: {error}. Open the last successful data or retry.',
    unknownError: 'Unknown error',
    errorHttp: 'Official status request returned HTTP {status}',
    errorTimeout: 'Official status request timed out',
    errorNetwork: 'Could not connect to the official status page',
    errorParse: 'Official status data could not be parsed',
    errorSchema: 'Official status data has an unexpected format',
    errorEmpty: 'The official status page was empty',
    errorSummary: 'No official status summary was found',
    errorIncomplete: 'The official status summary was incomplete',
    menuToggle: 'Toggle OpenAI status panel',
    menuSettings: 'OpenAI status preferences',
    settings: 'Preferences',
    preferencesSaved: 'Preferences saved',
    exportLayout: 'Export safe page layout',
    exported: 'Safe page layout exported',
    privacyLayout: 'Only structural layout information is exported. No page text, form values, links, cookies, storage contents or network data are included.',
    overall_none: 'All systems operational',
    short_none: 'OpenAI operational',
    overall_minor: 'Minor service disruption',
    short_minor: 'Minor disruption',
    overall_major: 'Partial system outage',
    short_major: 'Service outage',
    overall_critical: 'Major service outage',
    short_critical: 'Major outage',
    overall_maintenance: 'Service maintenance in progress',
    short_maintenance: 'Maintenance',
    overall_unknown: 'Official status unknown',
    short_unknown: 'Status unknown',
    component_operational: 'Operational',
    component_degraded_performance: 'Degraded performance',
    component_partial_outage: 'Partial outage',
    component_major_outage: 'Major outage',
    component_full_outage: 'Full outage',
    component_under_maintenance: 'Under maintenance',
    component_unknown: 'Unknown status',
    incident_investigating: 'Investigating',
    incident_identified: 'Identified',
    incident_fixing: 'Fixing',
    incident_monitoring: 'Monitoring recovery',
    incident_observing: 'Observing recovery',
    incident_resolved: 'Resolved',
    incident_postmortem: 'Postmortem',
    maintenance_scheduled: 'Scheduled',
    maintenance_upcoming: 'Upcoming',
    maintenance_in_progress: 'In progress',
    maintenance_ongoing: 'In progress',
    maintenance_verifying: 'Verifying',
    maintenance_completed: 'Completed',
    impact_none: 'No impact',
    impact_minor: 'Minor impact',
    impact_major: 'Major impact',
    impact_critical: 'Critical impact',
    impact_maintenance: 'Scheduled maintenance',
    impact_unknown: 'Unknown impact'
};

const ZH_CN_MESSAGES = {
    title: 'OpenAI 官方状态',
    details: 'OpenAI 官方状态详情',
    loading: '正在获取 OpenAI 状态…',
    unknown: 'OpenAI 状态未知',
    refresh: '立即刷新',
    close: '收起面板',
    open: '打开状态面板',
    language: '语言',
    auto: '跟随网页 / 浏览器',
    theme: '主题',
    themeAuto: '跟随网站',
    light: '浅色',
    dark: '深色',
    position: '位置',
    positionAuto: '边栏外侧',
    positionLeft: '左下角',
    positionRight: '右下角',
    components: '官方组件',
    activity: '官方动态',
    allNormal: '全部正常',
    abnormalCount: '{count} 项异常',
    normalCount: '{normal}/{total} 个组件运行正常',
    allComponents: '查看全部 {count} 个组件',
    expand: '展开',
    collapse: '收起',
    incidents: '未解决事件',
    maintenances: '计划维护',
    ongoingIncidents: '进行中的事件',
    verified: '已核验',
    partlyVerified: '部分未核验',
    unverified: '未核验',
    noItems: '无',
    itemCount: '{count} 项',
    fetchedAt: '获取时间（本地）：{time}',
    lastSuccess: '上次成功获取（本地）：{time}',
    autoRefresh: '每 {seconds} 秒自动刷新',
    officialPage: '打开官方状态页 ↗',
    sourceLive: 'status.openai.com 实时数据',
    sourceCompat: 'status.openai.com 兼容数据',
    compatWarning: '官方新版页面暂时无法读取，已切换兼容数据源；各部分是否完整请以核验标记为准。',
    fetchFailed: '无法获取 OpenAI 官方状态：{error}。请检查网络后点击刷新。',
    staleWarning: '本次刷新失败（{error}），当前显示 {time} 成功获取的数据。',
    cached: '缓存',
    scopeNote: '官方可用性按所有套餐、模型和错误类型汇总；你的实际体验可能因套餐及所用功能而异。本脚本为独立项目，并非 OpenAI 官方产品。',
    originalUpdate: '官方最新原文',
    unknownTime: '时间未知',
    unknownComponent: '未知组件',
    unnamedIncident: '未命名事件',
    unnamedMaintenance: '未命名维护',
    noDetails: '暂无说明',
    statusAndImpact: '状态：{status} · 影响：{impact}',
    maintenanceStage: '状态：{status} · 计划维护',
    scheduleStart: '计划开始：{time}',
    scheduleEnd: '计划结束：{time}',
    scheduleUnknown: '维护时间尚未公布',
    noticeUpdated: 'OpenAI 官方状态已更新',
    noticeInitial: 'OpenAI 官方状态提醒',
    launcherHint: '{status}；点击查看官方详情',
    unknownHint: '暂时无法获取 OpenAI 官方状态；点击查看详情或重试',
    staleHint: '暂时无法刷新 OpenAI 官方状态：{error}；点击查看上次成功数据或重试',
    unknownError: '未知错误',
    errorHttp: '官方状态请求返回 HTTP {status}',
    errorTimeout: '请求官方状态超时',
    errorNetwork: '无法连接 OpenAI 官方状态页',
    errorParse: '官方状态数据无法解析',
    errorSchema: '官方状态数据格式不符合预期',
    errorEmpty: '官方状态页面内容为空',
    errorSummary: '未找到官方状态摘要',
    errorIncomplete: '官方状态摘要不完整',
    menuToggle: '展开 / 收起 OpenAI 状态面板',
    menuSettings: 'OpenAI 状态偏好设置',
    settings: '偏好设置',
    preferencesSaved: '偏好设置已保存',
    exportLayout: '导出安全页面结构',
    exported: '安全页面结构已导出',
    privacyLayout: '仅导出页面布局结构，不含页面文字、表单值、链接、Cookie、存储内容或网络数据。',
    overall_none: '所有系统运行正常',
    short_none: 'OpenAI 正常',
    overall_minor: '轻微服务中断',
    short_minor: '轻微中断',
    overall_major: '部分系统中断',
    short_major: '服务中断',
    overall_critical: '重大服务中断',
    short_critical: '严重中断',
    overall_maintenance: '服务维护中',
    short_maintenance: '维护中',
    overall_unknown: '官方状态未知',
    short_unknown: '状态未知',
    component_operational: '运行正常',
    component_degraded_performance: '性能下降',
    component_partial_outage: '部分中断',
    component_major_outage: '严重中断',
    component_full_outage: '完全中断',
    component_under_maintenance: '维护中',
    component_unknown: '状态未知',
    incident_investigating: '正在调查',
    incident_identified: '已定位问题',
    incident_fixing: '正在修复',
    incident_monitoring: '正在监控恢复',
    incident_observing: '正在观察恢复情况',
    incident_resolved: '事件已解决',
    incident_postmortem: '事后复盘',
    maintenance_scheduled: '已安排',
    maintenance_upcoming: '即将开始',
    maintenance_in_progress: '进行中',
    maintenance_ongoing: '进行中',
    maintenance_verifying: '正在验证',
    maintenance_completed: '已完成',
    impact_none: '无影响',
    impact_minor: '轻微影响',
    impact_major: '重大影响',
    impact_critical: '严重影响',
    impact_maintenance: '计划维护',
    impact_unknown: '影响未知'
};

const ZH_CN_COMPONENT_NAMES = {
    ChatGPT: 'ChatGPT',
    Login: '登录',
    Images: '图像',
    Responses: 'Responses API',
    Audio: '音频',
    Files: '文件',
    Search: '搜索',
    Sora: 'Sora',
    'Fine-tuning': '微调',
    'Deep Research': '深度研究',
    Realtime: '实时 API',
    'Voice mode': '语音模式',
    Batch: '批处理',
    Embeddings: '嵌入',
    Moderations: '内容审核',
    'Codex Web': 'Codex 网页版',
    'Codex in ChatGPT Desktop': 'ChatGPT 桌面版 Codex',
    'Connectors/Apps': '连接器 / 应用',
    'VS Code extension': 'VS Code 扩展',
    'Codex API': 'Codex API',
    Sites: '站点',
    Agent: '智能体',
    Agents: 'Agents API',
    Decisions: 'Decisions API',
    'Compliance API': '合规 API',
    'Ads API': '广告 API',
    FedRAMP: 'FedRAMP',
    'ChatGPT Atlas': 'ChatGPT Atlas',
    'Chat Completions': 'Chat Completions',
    'File uploads': '文件上传',
    'Ads Manager': '广告管理器',
    CLI: '命令行工具（CLI）',
    Conversations: '对话',
    GPTs: 'GPTs',
    'Image Generation': '图像生成',
    'ChatGPT Work': 'ChatGPT Work',
    Live: 'Live',
    dots: 'dots',
    Space: '资料空间'
};

export const LOCALES = {
    en: {
        label: 'English',
        lang: 'en',
        dir: 'ltr',
        messages: EN_MESSAGES,
        componentNames: {},
        groupNames: { Other: 'Other components' }
    },
    'zh-CN': {
        label: '简体中文',
        lang: 'zh-CN',
        dir: 'ltr',
        messages: ZH_CN_MESSAGES,
        componentNames: ZH_CN_COMPONENT_NAMES,
        groupNames: {
            APIs: 'APIs',
            ChatGPT: 'ChatGPT',
            Codex: 'Codex',
            FedRAMP: 'FedRAMP',
            'Ads Platform': '广告平台',
            Other: '其他组件'
        }
    },
    'zh-TW': zhTW,
    es, hi, 'pt-BR': ptBR, ja, ko, fr, de, id, ar, ru
};

function normalizeLanguage(value) {
    return typeof value === 'string' ? value.trim().replaceAll('_', '-').toLowerCase() : '';
}

function matchLocale(language) {
    const normalized = normalizeLanguage(language);
    if (!normalized || normalized === 'auto') return null;
    const entries = Object.entries(LOCALES);
    const exact = entries.find(([id, locale]) =>
        normalizeLanguage(id) === normalized || normalizeLanguage(locale.lang) === normalized);
    if (exact) return exact[0];
    const allParts = normalized.split('-');
    const extensionAt = allParts.findIndex((part,index) => index > 0 && part.length === 1);
    const parts = extensionAt < 0 ? allParts : allParts.slice(0,extensionAt);
    const base = parts[0] === 'in' ? 'id' : parts[0];
    // An explicit Chinese script takes precedence over region, including mixed tags.
    // Bare zh and all other regions retain Simplified Chinese as the default.
    if (base === 'zh') {
        if (parts.includes('hant')) return 'zh-TW';
        if (parts.includes('hans')) return 'zh-CN';
        return parts.some(part => ['tw', 'hk', 'mo'].includes(part)) ? 'zh-TW' : 'zh-CN';
    }
    return entries.find(([, locale]) => normalizeLanguage(locale.lang).split('-')[0] === base)?.[0] || null;
}

/** An explicit supported preference wins; auto follows the page, then the browser. */
export function resolveLocale(preference = 'auto', pageLanguage = '', navigatorLanguages = []) {
    const preferred = matchLocale(preference);
    if (preferred) return preferred;
    const page = matchLocale(pageLanguage);
    if (page) return page;
    const languages = Array.isArray(navigatorLanguages) ? navigatorLanguages : [navigatorLanguages];
    for (const language of languages) {
        const matched = matchLocale(language);
        if (matched) return matched;
    }
    return 'en';
}

function ownValue(object, key) {
    return object && Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
}

/** Values are plain text; the UI must insert them with textContent, never innerHTML. */
export function translate(localeId, key, params = {}) {
    const locale = LOCALES[matchLocale(localeId) || 'en'];
    const message = ownValue(locale.messages, key) ?? ownValue(EN_MESSAGES, key) ?? String(key);
    return String(message).replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (placeholder, name) => {
        const value = ownValue(params, name);
        return value == null ? placeholder : String(value);
    });
}

export function translateComponent(localeId, name) {
    if (typeof name !== 'string' || !name) return translate(localeId, 'unknownComponent');
    const locale = LOCALES[matchLocale(localeId) || 'en'];
    return ownValue(locale.componentNames, name) ?? ownValue(LOCALES.en.componentNames, name) ?? name;
}

export function translateGroup(localeId, name) {
    const group = typeof name === 'string' && name ? name : 'Other';
    const locale = LOCALES[matchLocale(localeId) || 'en'];
    return ownValue(locale.groupNames, group) ?? ownValue(LOCALES.en.groupNames, group) ?? group;
}
