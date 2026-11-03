import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const {version} = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const metadata = `// ==UserScript==
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
// @version      ${version}
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
// ==/UserScript==`;

await mkdir('dist', { recursive: true });
const result = await build({
  entryPoints: ['src/main.js'], bundle: true, write: false, format: 'iife',
  target: ['chrome110', 'firefox115'], charset: 'utf8', minify: false,
  legalComments: 'inline', banner: { js: metadata },
});
await writeFile('dist/openai-status-companion.user.js', result.outputFiles[0].text);
console.log(`Built dist/openai-status-companion.user.js (${result.outputFiles[0].contents.length} bytes)`);
