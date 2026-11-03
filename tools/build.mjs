import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';

const metadata = `// ==UserScript==
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
// ==/UserScript==`;

await mkdir('dist', { recursive: true });
const result = await build({
  entryPoints: ['src/main.js'], bundle: true, write: false, format: 'iife',
  target: ['chrome110', 'firefox115'], charset: 'utf8', minify: false,
  legalComments: 'inline', banner: { js: metadata },
});
await writeFile('dist/openai-status-companion.user.js', result.outputFiles[0].text);
console.log(`Built dist/openai-status-companion.user.js (${result.outputFiles[0].contents.length} bytes)`);
