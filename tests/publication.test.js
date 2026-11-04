import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {DEFAULT_LOCALE, LOCALES} from '../src/locales/index.js';

const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('published bundle has the package version, catalog metadata and unchanged userscript permissions', async () => {
    const packageInfo=JSON.parse(read('package.json'));
    const lock=JSON.parse(read('package-lock.json'));
    const bundle=read('dist/openai-status-companion.user.js');
    const [header, body]=bundle.split('// ==/UserScript==');
    const values=key=>[...header.matchAll(new RegExp(`^// @${key}\\s+(.+)$`,'gm'))].map(match=>match[1].trim());
    assert.equal(lock.version,packageInfo.version);
    assert.equal(lock.packages[''].version,packageInfo.version);
    assert.deepEqual(values('version'),[packageInfo.version]);
    assert.deepEqual(values('match'),['https://chatgpt.com/*','https://leopard-x.memofun.net/*','https://mana-x.aizex.net/*']);
    assert.deepEqual(values('connect'),['status.openai.com']);
    assert.deepEqual(values('license'),['MIT']);
    assert.deepEqual(values('namespace'),['https://github.com/laipeng101/openai-status-companion']);
    assert.deepEqual(values('grant'),['GM_xmlhttpRequest','GM_registerMenuCommand','GM_unregisterMenuCommand','GM_getValue','GM_setValue']);
    const locales=Object.keys(LOCALES);
    const suffixes=locales.map(id=>id===DEFAULT_LOCALE?'':`:${id}`);
    for (const key of ['name','description']) {
        const tags=[...header.matchAll(new RegExp(`^// @${key}(:[^\\s]+)?[ \\t]`,'gm'))];
        assert.deepEqual(tags.map(match=>match[1] ?? ''),suffixes,`${key} locales`);
    }
    for (const [index, id] of locales.entries()) {
        const {userscript}=await import(`../src/locales/${id}.js`);
        const suffix=suffixes[index];
        assert.deepEqual(values(`name${suffix}`),[userscript.name]);
        assert.deepEqual(values(`description${suffix}`),[userscript.description.replaceAll('{languageCount}',String(locales.length))]);
    }
    assert.doesNotMatch(header,/\{languageCount\}/);
    assert.doesNotMatch(body,/\{languageCount\}/,'publication templates stay out of the runtime bundle');
});

test('language packs, generated language table and listing descriptions cover the registry', () => {
    const locales=Object.keys(LOCALES);
    const packFiles=readdirSync(new URL('../src/locales/',import.meta.url))
        .filter(name=>name.endsWith('.js') && name!=='index.js');
    assert.deepEqual(packFiles.sort(),locales.map(id=>`${id}.js`).sort());
    const listingFiles=readdirSync(new URL('../docs/',import.meta.url))
        .filter(name=>name.startsWith('greasyfork.') && name.endsWith('.md'));
    assert.deepEqual(listingFiles.sort(),locales.map(id=>`greasyfork.${id}.md`).sort());
    for (const file of listingFiles) assert.ok(read(`docs/${file}`).trim(),file);

    const table=read('docs/languages.md').split('<!-- locale-table:start -->')[1].split('<!-- locale-table:end -->')[0];
    assert.ok(table.includes(`**${locales.length} interface languages**`));
    const rows=[...table.matchAll(/^\| `([^`]+)` \| (.+) \| `(ltr|rtl)` \|\r?$/gm)];
    assert.deepEqual(rows.map(match=>match.slice(1)),locales.map(id=>[
        id,LOCALES[id].label.replaceAll('|','\\|'),LOCALES[id].dir
    ]));
});
