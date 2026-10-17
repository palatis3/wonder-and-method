import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {snapshot,restore} from '../scripts/recovery.mjs';
test('snapshot restores exact static version and refuses tampered backup',async()=>{const root=await mkdtemp(join(tmpdir(),'wm-recovery-'));try{await mkdir(join(root,'dist'));await mkdir(join(root,'.runtime/releases'),{recursive:true});await writeFile(join(root,'dist/index.html'),'approved v1');await snapshot(root,'v1');await writeFile(join(root,'dist/index.html'),'broken v2');await restore(root,'v1');assert.equal(await readFile(join(root,'dist/index.html'),'utf8'),'approved v1');await writeFile(join(root,'.runtime/releases/v1/site/index.html'),'tampered');await assert.rejects(()=>restore(root,'v1'),/checksum mismatch/);assert.equal(await readFile(join(root,'dist/index.html'),'utf8'),'approved v1');await assert.rejects(()=>restore(root,'../elsewhere'),/Invalid label/);}finally{await rm(root,{recursive:true,force:true});}});

test('snapshot recovers a missing dist folder without discarding source or inquiry records',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wm-missing-dist-'));
 try{
  await mkdir(join(root,'dist'));await mkdir(join(root,'.runtime/releases'),{recursive:true});
  await writeFile(join(root,'dist/index.html'),'approved site');
  await writeFile(join(root,'.runtime/inquiries.sqlite'),'synthetic inquiry fixture');
  await writeFile(join(root,'source.txt'),'preserve source');
  await snapshot(root,'v1');await rename(join(root,'dist'),join(root,'missing-artifact-fixture'));
  const result=await restore(root,'v1');assert.equal(result.previous,null);
  assert.equal(await readFile(join(root,'dist/index.html'),'utf8'),'approved site');
  assert.equal(await readFile(join(root,'.runtime/inquiries.sqlite'),'utf8'),'synthetic inquiry fixture');
  assert.equal(await readFile(join(root,'source.txt'),'utf8'),'preserve source');
 }finally{await rm(root,{recursive:true,force:true});}
});
