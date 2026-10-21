import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fingerprintStaticAssets,versionAssetReferences} from '../scripts/version-static-assets.mjs';

test('fingerprints propagate dependency changes and preserve document download URLs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wm-assets-'));
 try{
  await mkdir(join(root,'assets','fonts'),{recursive:true});
  await writeFile(join(root,'assets/fonts/test.woff2'),'font-v1');
  await writeFile(join(root,'assets/main.css'),"@font-face{src:url('/assets/fonts/test.woff2')} .image{background:url('/assets/picture.webp')}");
  await writeFile(join(root,'assets/picture.webp'),'picture');
  await writeFile(join(root,'assets/math.mjs'),'export const n=3;');
  await writeFile(join(root,'assets/main.js'),"import {n} from './math.mjs?v=old';fetch('/assets/guide.csv');");
  await writeFile(join(root,'assets/guide.csv'),'header\n');
  const versions=await fingerprintStaticAssets(root);
  for(const [path,hash] of versions)assert.equal(hash,createHash('sha256').update(await readFile(join(root,path.slice(1)))).digest('hex').slice(0,12));
  assert.equal(versions.has('/assets/guide.csv'),false);
  assert.match(await readFile(join(root,'assets/main.js'),'utf8'),new RegExp(`math\\.mjs\\?v=${versions.get('/assets/math.mjs')}`));
  const html='<img src="/assets/picture.webp" srcset="/assets/picture.webp 400w"><a href="/assets/guide.csv" download>Guide</a><video data-src="/assets/film.mp4"></video>';
  const output=versionAssetReferences(html,'/pricing/',versions);
  assert.equal((output.match(new RegExp(versions.get('/assets/picture.webp'),'g'))||[]).length,2);
  assert.match(output,/href="\/assets\/guide.csv" download/);
  await writeFile(join(root,'assets/fonts/test.woff2'),'font-v2');
  const changed=await fingerprintStaticAssets(root);
  assert.notEqual(changed.get('/assets/main.css'),versions.get('/assets/main.css'));
  assert.equal(changed.get('/assets/main.js'),versions.get('/assets/main.js'));
 }finally{await rm(root,{recursive:true,force:true});}
});

test('versioned references preserve fragments, extra query values and external URLs',()=>{
 const versions=new Map([['/assets/icon.svg','123456abcdef']]);
 assert.equal(versionAssetReferences('url("/assets/icon.svg?size=2&v=old#mark")','/assets/main.css',versions),'url("/assets/icon.svg?size=2&v=123456abcdef#mark")');
 assert.equal(versionAssetReferences('https://example.com/assets/icon.svg','/',versions),'https://example.com/assets/icon.svg');
});

test('HTML asset versions preserve srcset boundaries and escaped query keys',()=>{
 const versions=new Map([['/assets/a.webp','111111111111'],['/assets/b.webp','222222222222']]);
 assert.equal(versionAssetReferences('<img srcset="/assets/a.webp?v=old, /assets/b.webp?v=old 2x">','/',versions),'<img srcset="/assets/a.webp?v=111111111111, /assets/b.webp?v=222222222222 2x">');
 assert.equal(versionAssetReferences('<img src="/assets/a.webp?size=2&amp;v=old">','/',versions),'<img src="/assets/a.webp?size=2&amp;v=111111111111">');
 assert.equal(versionAssetReferences('url("/assets/a.webp?size=2&v=old")','/assets/main.css',versions),'url("/assets/a.webp?size=2&v=111111111111")');
 assert.equal(versionAssetReferences("const image='/assets/a.webp?color=red,blue&v=old'",'/assets/main.js',versions),"const image='/assets/a.webp?color=red%2Cblue&v=111111111111'");
});

test('the established favicon and Apple icon URLs remain stable',()=>{
 const icons=['/assets/brand/favicon-96.png','/assets/brand/apple-touch-icon.png'];
 const versions=new Map(icons.map(path=>[path,'123456abcdef']));
 const markup=icons.map(path=>`<link rel="icon" href="${path}">`).join('');
 assert.equal(versionAssetReferences(markup,'/',versions),markup);
});
