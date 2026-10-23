import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from '../scripts/server.mjs';

test('performance server compresses text without changing decoded content or HEAD semantics',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'wm-compression-test-')),siteDir=join(directory,'site');await mkdir(siteDir);
 const html='<!doctype html><html lang="en"><title>Compression fixture</title><main>'+('Synthetic content. '.repeat(100))+'</main></html>';
 await writeFile(join(siteDir,'index.html'),html);
 const {server,url}=await createServer({siteDir,runtime:join(directory,'runtime'),port:0,compress:true});
 try{
  const response=await fetch(url,{headers:{'Accept-Encoding':'gzip'}});assert.equal(response.status,200);assert.equal(response.headers.get('content-encoding'),'gzip');assert.equal(response.headers.get('vary'),'Accept-Encoding');assert.equal(await response.text(),html);assert.ok(Number(response.headers.get('content-length'))<Buffer.byteLength(html));
  const head=await fetch(url,{method:'HEAD',headers:{'Accept-Encoding':'gzip'}});assert.equal(head.headers.get('content-length'),response.headers.get('content-length'));assert.equal(await head.text(),'');
  const plain=await fetch(url,{headers:{'Accept-Encoding':'identity'}});assert.equal(plain.headers.get('content-encoding'),null);assert.equal(await plain.text(),html);
 }finally{server.closeAllConnections();await new Promise(done=>server.close(done));assert.ok(directory.startsWith(join(tmpdir(),'wm-compression-test-')));await rm(directory,{recursive:true,force:true});}
});
