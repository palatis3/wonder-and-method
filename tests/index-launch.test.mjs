import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from '../scripts/server.mjs';
import {routeIndexEligible,privateRoute} from '../src/index-policy.mjs';
import {buildEarlyHints,assertStaticHeaderLimits} from '../scripts/static-headers.mjs';

test('native question selection survives a real form POST and durable storage',async()=>{
 const runtime=await mkdtemp(join(tmpdir(),'wm-launch-'));
 const {server,url}=await createServer({runtime,port:0});
 try{
  const html=await (await fetch(url+'/contact/?request_kind=question')).text();
  assert.match(html,/<input[^>]*type="hidden"[^>]*name="request_kind"[^>]*value="question"/);
  assert.doesNotMatch(html,/<select[^>]*name="request_kind"/);
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
 assert.ok(assertStaticHeaderLimits(headers).rules<=100);
 const hintRules=headers.split(/\r?\n\r?\n/).map(block=>block.trim().split(/\r?\n/)).filter(lines=>lines.some(line=>line.trim().startsWith('Link: ')));
 for(const route of build.routes){
  const matches=hintRules.filter(([path])=>path.endsWith('*')?route.startsWith(path.slice(0,-1)):route===path);
  if(privateRoute(route)||['/404/','/payments/'].includes(route)){assert.equal(matches.length,0,route);continue;}
  assert.equal(matches.length,1,route);count++;
  const html=await readFile(new URL('dist'+route+'index.html',root),'utf8');
  const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(styles.length);assert.equal(matches[0][1].trim(),'Link: '+styles.map(s=>`<${s}>; rel=preload; as=style`).join(', '),route);
 }
 assert.equal(count,build.routes.filter(route=>!privateRoute(route)&&!['/404/','/payments/'].includes(route)).length);assert.ok(headers.includes('/work/fieldwork/\n'));
});

test('county preload grouping preserves differing styles and excluded pages',()=>{
 const versions=new Map([['/assets/site.css','abc123'],['/assets/extra.css','def456']]);
 const html='<link rel="stylesheet" href="/assets/site.css">';
 const pages=[{path:'/areas/',html},{path:'/areas/erie-county/',html}];
 assert.equal(buildEarlyHints(pages,versions),'/areas/*\n  Link: </assets/site.css?v=abc123>; rel=preload; as=style\n');
 const varied=buildEarlyHints([...pages,{path:'/areas/example/',html:html+'<link rel="stylesheet" href="/assets/extra.css">'}],versions);
 assert.ok(!varied.includes('/areas/*'));assert.ok(varied.includes('/areas/example/\n'));assert.ok(varied.includes('/assets/extra.css?v=def456'));
 const empty=buildEarlyHints([...pages,{path:'/areas/no-styles/',html:''}],versions);
 assert.ok(!empty.includes('/areas/*'));assert.ok(!empty.includes('/areas/no-styles/'));
 for(const path of ['/404/','/api/example/','/assets/example/','/payments/'])assert.equal(buildEarlyHints([{path,html}],versions),'');
});

test('static header limits reject an undeployable artifact during build',()=>{
 assert.equal(assertStaticHeaderLimits(Array.from({length:100},(_,i)=>`/page-${i}/\n  Link: example\n`).join('\n')).rules,100);
 assert.throws(()=>assertStaticHeaderLimits(Array.from({length:101},(_,i)=>`/page-${i}/\n  Link: example\n`).join('\n')),/at most 100/);
 assert.doesNotThrow(()=>assertStaticHeaderLimits('/*\n'+' '.repeat(1990)+'X: example'));
 assert.throws(()=>assertStaticHeaderLimits('/*\n'+' '.repeat(1991)+'X: example'),/2000-character/);
});
