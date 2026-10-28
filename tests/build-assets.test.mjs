import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {transform} from 'esbuild';
import {buildCssBundles,applyCssBundles,pruneObsoleteBuildAssets} from '../scripts/build.mjs';

test('plan pages reuse shared CSS without changing the existing cascade',async()=>{
 const assets=new URL('../src/assets/',import.meta.url);
 for(const includeChat of [false,true]){
  const css=await buildCssBundles(fileURLToPath(assets),{includeChat});
  const source=(await Promise.all(['package-visuals.css','brand.css','style.css','premium.css','site-refresh.css','layout-components.css','section-surfaces.css',...(includeChat?['support-chat.css']:[])].map(name=>readFile(new URL(name,assets),'utf8')))).join('\n');
  const minify=value=>transform(value,{loader:'css',minify:true,target:['chrome110','safari16']});
  // Package artwork rules precede the shared bundle; brand rules lead that bundle.
  // Preserve every declaration in the intended cascade.
  assert.equal((await minify(css.plans+css.shared)).code,(await minify(source)).code);
  assert.ok(Buffer.byteLength(css.plans)<Buffer.byteLength(css.shared)/4,'Plan CSS must not duplicate the full shared stylesheet');assert.equal(css.guides,(await minify(await readFile(new URL('journal.css',assets),'utf8'))).code);
 }
 const styles=names=>names.map(name=>`<link rel="stylesheet" href="/assets/${name}.css">`).join('');
 const fixture=`<html><head>${styles(['brand','counties','style','package-visuals','civic-sculpture-preview','site-refresh','layout-components'])}<script src="/assets/boot.js"></script></head><body><p>Keep content</p></body></html>`;
 const html=applyCssBundles(fixture,'document.documentElement.classList.add("js");');
 const links=[...html.matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(links,['/assets/counties.css','/assets/civic-sculpture-preview.css','/assets/site-plans.css','/assets/site.css']);
 assert.match(html,/<script>document\.documentElement/);
 assert.match(html,/<p>Keep content<\/p>/);
 const ordinary=applyCssBundles(`<head>${styles(['brand','journal','premium'])}</head>`,'');
 assert.deepEqual([...ordinary.matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]),['/assets/site-guides.css','/assets/site.css']);
 const city=applyCssBundles(`<head>${styles(['brand','premium','layout-components','living-city'])}</head>`,'');
 assert.deepEqual([...city.matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]),['/assets/site.css','/assets/living-city.css'],'City typography keeps its override position after shared styles');
 const home=applyCssBundles(`<head><title>Home</title><link rel="preload" href="/assets/premium/manrope.woff2" as="font">${styles(['brand','premium','layout-components','living-city','analytics-consent'])}<script type="module" src="/assets/living-city.js"></script></head><body>Unchanged home</body>`,'',{family:'home'});
 assert.deepEqual([...home.matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]),['/assets/site-home.css']);
 assert.ok(home.indexOf('href="/assets/site-home.css"')<home.indexOf('rel="preload"'),'Home styles are discovered before competing preload requests');
 assert.equal(home.split('<body>')[1],'Unchanged home</body>');
 for(const family of ['home','areas','guides','work','services','information']){
  const result=applyCssBundles(fixture,'',{family});
  assert.ok(result.includes('href="/assets/site.css"'),`${family} reuses the common cache key`);
  assert.doesNotMatch(result,/site-family-/);
 }
});

test('pruning preserves references in emitted documents, dynamic edition paths and unlisted archives',async()=>{
 const output=await mkdtemp(join(tmpdir(),'wm-build-assets-'));
 const put=async(file,value='fixture')=>{const target=join(output,file);await mkdir(dirname(target),{recursive:true});await writeFile(target,value);};
 try{
  const referenced=['assets/boot.js','assets/journal.css','assets/journey-counts.js','assets/package-visuals/manifest.json','assets/support-chat.css','assets/fonts.css','assets/package-visuals.css','assets/editions/buffalo-dusk/still-640.webp'];
  for(const file of referenced)await put(file);
  await put('index.html','<script src="/assets/boot.js?v=abc"></script>');
  await put('assets/nested.css','@import "journal.css";');
  await put('assets/app.js','import "./journey-counts.js";');
  await put('assets/config.json','{"data":"/assets/package-visuals/manifest.json"}'.replaceAll('/','\\/'));
  await put('assets/extra.mjs','fetch("/assets/support-chat.css")');
  await put('archive/index.html','<link href="/assets/\\u0066onts.css">');
  await put('assets/example.svg','<a href="package-visuals.css"/>');
  await put('assets/edition.js','const url="/assets/editions/"+edition+"/still-"+width+".webp";');
  const protectedFiles=['assets/waterfront/unlisted-archive.webp','assets/package-visuals/launch-site-complete.webp','assets/buyer-packs/old-pack.html','assets/downloads/old-worksheet.csv'];
  for(const file of protectedFiles)await put(file);
  await put('assets/package-visuals/feature-guides.json','unused build-time data');
  const result=await pruneObsoleteBuildAssets(output);
  assert.deepEqual(result.removed,[{file:'assets/package-visuals/feature-guides.json',bytes:22}]);
  assert.equal(result.bytesRemoved,22);
  assert.equal(result.retained.length,referenced.length);
  for(const file of [...referenced,...protectedFiles])assert.ok((await stat(join(output,file))).isFile(),file);
  await assert.rejects(stat(join(output,'assets/package-visuals/feature-guides.json')),{code:'ENOENT'});
 }finally{assert.ok(output.startsWith(join(tmpdir(),'wm-build-assets-')));await rm(output,{recursive:true,force:true});}
});

test('unreferenced inactive-edition copies are removed without touching their source assets',async()=>{
 const output=await mkdtemp(join(tmpdir(),'wm-build-obsolete-'));
 const source=new URL('../src/assets/editions/buffalo-dusk/still-640.webp',import.meta.url);
 const sourceBefore=await readFile(source);
 try{
  await mkdir(join(output,'assets/editions/buffalo-dusk'),{recursive:true});
  await writeFile(join(output,'assets/editions/buffalo-dusk/still-640.webp'),sourceBefore);
  await writeFile(join(output,'index.html'),'<h1>Civic edition</h1>');
  const result=await pruneObsoleteBuildAssets(output);
  assert.equal(result.bytesRemoved,sourceBefore.byteLength);
  assert.deepEqual(result.removed.map(item=>item.file),['assets/editions/buffalo-dusk/still-640.webp']);
  assert.deepEqual(await readFile(source),sourceBefore);
 }finally{assert.ok(output.startsWith(join(tmpdir(),'wm-build-obsolete-')));await rm(output,{recursive:true,force:true});}
});
