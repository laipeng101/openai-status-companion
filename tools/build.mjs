import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { DEFAULT_LOCALE, LOCALES } from '../src/locales/index.js';

const {version} = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const localeIds = Object.keys(LOCALES);
const languageCount = localeIds.length;
const publications = await Promise.all(localeIds.map(async id => {
  const {userscript} = await import(`../src/locales/${id}.js`);
  const {name, description} = userscript ?? {};
  if (typeof name !== 'string' || !name.trim() || /[\r\n]/.test(name) ||
      typeof description !== 'string' || !description.includes('{languageCount}') || /[\r\n]/.test(description)) {
    throw new Error(`Invalid userscript metadata in src/locales/${id}.js`);
  }
  return {id, name, description: description.replaceAll('{languageCount}', String(languageCount))};
}));
const metadataLines = key => publications.map(({id, [key]: value}) => {
  const tag = id === DEFAULT_LOCALE ? `@${key}` : `@${key}:${id}`;
  return `// ${tag.padEnd(13)} ${value}`;
}).join('\n');

const metadata = `// ==UserScript==
${metadataLines('name')}
// @namespace    https://github.com/laipeng101/openai-status-companion
// @version      ${version}
${metadataLines('description')}
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

const languageDocsUrl = new URL('../docs/languages.md', import.meta.url);
const languageDocs = await readFile(languageDocsUrl, 'utf8');
const languageTable = /<!-- locale-table:start -->[\s\S]*?<!-- locale-table:end -->/;
if (!languageTable.test(languageDocs)) throw new Error('Missing locale table markers in docs/languages.md');
const table = [
  '<!-- locale-table:start -->',
  `The userscript ships with **${languageCount} interface languages**.`,
  '',
  '| Locale | Interface language | Direction |',
  '| --- | --- | --- |',
  ...localeIds.map(id => {
    const {label, dir} = LOCALES[id];
    return `| \`${id}\` | ${label.replaceAll('|', '\\|')} | \`${dir}\` |`;
  }),
  '<!-- locale-table:end -->'
].join(languageDocs.includes('\r\n') ? '\r\n' : '\n');
const updatedLanguageDocs = languageDocs.replace(languageTable, () => table);

await mkdir('dist', { recursive: true });
const result = await build({
  entryPoints: ['src/main.js'], bundle: true, write: false, format: 'iife',
  target: ['chrome110', 'firefox115'], charset: 'utf8', minify: false,
  legalComments: 'inline', banner: { js: metadata },
});
await writeFile('dist/openai-status-companion.user.js', result.outputFiles[0].text);
if (updatedLanguageDocs !== languageDocs) await writeFile(languageDocsUrl, updatedLanguageDocs);
console.log(`Built dist/openai-status-companion.user.js (${result.outputFiles[0].contents.length} bytes)`);
