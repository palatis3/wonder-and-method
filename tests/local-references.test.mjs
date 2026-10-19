import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {verifyLocalReferences} from '../scripts/verify-local-references.mjs';
import {buildShowcase} from '../scripts/build-showcase.mjs';
import {runInNewContext} from 'node:vm';

test('initial resource classification excludes navigation and lazy media while retaining eager descendants and dependencies',async()=>{
 const verifier=await readFile(new URL('../scripts/verify.mjs',import.meta.url),'utf8');
 const expression=verifier.match(/const initialHomeHtml=([^;]+);/)[1];
 const homeHtml='<link rel="icon" href="/favicon.ico"><link rel="preload" href="/assets/font.woff2"><link rel="stylesheet" href="/assets/site.css"><script src="/assets/app.js"></script><a href="/assets/full-comparison.webp" download>Open image<img src="/assets/eager-thumbnail.webp"></a><a href="/assets/other.pdf">Open PDF</a><img src="/assets/lazy-comparison.webp" loading="lazy"><video poster="/assets/still.webp"></video>';
 const classified=runInNewContext(expression,{homeHtml});
 const assetExpression=verifier.match(/const homeAssets=([^;]+);/)[1];
 const resources=Array.from(runInNewContext(assetExpression,{initialHomeHtml:classified}));
 assert.deepEqual(resources,['/favicon.ico','/assets/font.woff2','/assets/site.css','/assets/app.js','/assets/eager-thumbnail.webp','/assets/still.webp']);
 assert.doesNotMatch(classified,/full-comparison|other\.pdf|lazy-comparison/);
});
test('reference verification detects missing scripts and nested stylesheet fonts',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wm-refs-'));
 try{
  await mkdir(join(root,'assets'));
  await writeFile(join(root,'index.html'),'<script src="/assets/app.js"></script><link href="/assets/style.css" rel="stylesheet">');
  await assert.rejects(verifyLocalReferences(root,['index.html']),/app.js/);
  await writeFile(join(root,'assets/app.js'),'');
  await writeFile(join(root,'assets/style.css'),'@font-face{src:url(font.woff2)}');
  await assert.rejects(verifyLocalReferences(root,['index.html']),/font.woff2/);
  await writeFile(join(root,'assets/font.woff2'),'fixture');
  assert.equal((await verifyLocalReferences(root,['index.html'])).references,3);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('showcase rejects an incomplete output before writing concepts',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wm-showcase-'));
 try{await assert.rejects(buildShowcase(root),/complete private preview/);}
 finally{await rm(root,{recursive:true,force:true});}
});


test('reference verification follows generated documents and rejects broken same-page and cross-page fragments',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wm-fragments-'));
 try{
  await mkdir(join(root,'assets'));
  await writeFile(join(root,'index.html'),'<main id="main"><a href="#main">Skip</a><a href="/assets/pack?v=version#scope">Details</a></main>');
  await writeFile(join(root,'assets/pack.html'),'<section id="scope"><a href="/#missing">Return</a></section>');
  await assert.rejects(verifyLocalReferences(root,['index.html']),/Missing local fragment.*missing/);
  await writeFile(join(root,'assets/pack.html'),'<section id="scope"><a href="/#main">Return</a></section>');
  assert.equal((await verifyLocalReferences(root,['index.html'])).status,'pass');
  await writeFile(join(root,'assets/pack.html'),'<section id="renamed"></section>');
  await assert.rejects(verifyLocalReferences(root,['index.html']),/Missing local fragment.*scope/);
 }finally{await rm(root,{recursive:true,force:true});}
});
