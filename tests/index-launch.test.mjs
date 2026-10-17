import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from '../scripts/server.mjs';
import {routeIndexEligible} from '../src/index-policy.mjs';

test('native question selection survives a real form POST and durable storage',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-launch-'));
 const {server,url}=await createServer({runtime,port:0});
 try{
  const html=await (await fetch(url+'/contact/')).text();
  assert.match(html,/<select[^>]*name="request_kind"[^>]*>[\s\S]*?<option value="question">/);
  assert.doesNotMatch(html,/<input[^>]*type="hidden"[^>]*name="request_kind"/);
  const body=new URLSearchParams({name:'Synthetic launch test',email:'fixture@example.invalid',business:'Synthetic only',service:'improve',request_kind:'question',billing:'annual',message:'Synthetic question about annual service scope; do not contact.'});
  const response=await fetch(url+'/api/inquiries',{method:'POST',body});
  assert.equal(response.status,201);assert.match(await response.text(),/Test inquiry recorded/);
  const db=new DatabaseSync(join(runtime,'inquiries.sqlite'));
  try{const row=db.prepare('SELECT payload FROM inquiries').get();const saved=JSON.parse(row.payload);assert.equal(saved.request_kind,'question');assert.equal(saved.billing,'annual');assert.equal(saved.service,'improve');}finally{db.close();}
 }finally{await new Promise(resolve=>server.close(resolve));await rm(runtime,{recursive:true,force:true});}
});

test('built public preload hints exactly match each route’s versioned stylesheets',async()=>{
 const root=new URL('../',import.meta.url),build=JSON.parse(await readFile(new URL('evidence/build.json',root),'utf8'));
 const headers=await readFile(new URL('dist/_headers',root),'utf8');let count=0;
 for(const route of build.routes){
  const block=headers.split('\n\n').find(b=>b.trimStart().startsWith(route+'\n'));
  if(!routeIndexEligible(route)){assert.equal(block,undefined,route);continue;}
  assert.ok(block,route);count++;
  const html=await readFile(new URL('dist'+route+'index.html',root),'utf8');
  const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(styles.length);assert.equal(block.trim().split('\n')[1].trim(),'Link: '+styles.map(s=>`<${s}>; rel=preload; as=style`).join(', '),route);
 }
 assert.equal(count,41);
});
