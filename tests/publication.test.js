import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LOCALES} from '../src/locales.js';

const read = path => readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('published bundle has the package version, complete localized metadata and unchanged network scope', () => {
    const packageInfo=JSON.parse(read('package.json'));
    const lock=JSON.parse(read('package-lock.json'));
    const bundle=read('dist/openai-status-companion.user.js');
    const header=bundle.split('// ==/UserScript==')[0];
    const values=key=>[...header.matchAll(new RegExp(`^// @${key}\\s+(.+)$`,'gm'))].map(match=>match[1].trim());
    assert.equal(lock.version,packageInfo.version);
    assert.equal(lock.packages[''].version,packageInfo.version);
    assert.deepEqual(values('version'),[packageInfo.version]);
    assert.deepEqual(values('match'),['https://chatgpt.com/*','https://leopard-x.memofun.net/*','https://mana-x.aizex.net/*']);
    assert.deepEqual(values('connect'),['status.openai.com']);
    assert.deepEqual(values('license'),['MIT']);
    for (const locale of Object.keys(LOCALES)) {
        const suffix=locale==='en'?'':`:${locale}`;
        for (const key of ['name','description']) {
            const localized=values(`${key}${suffix}`);
            assert.equal(localized.length,1,`${locale} ${key}`);
            assert.ok(localized[0].length>0);
        }
    }
});
