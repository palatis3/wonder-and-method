import test from 'node:test';
import assert from 'node:assert/strict';
import {outboundLinks,probeLink} from '../scripts/check-links.mjs';
test('outbound inventory decodes entities, keeps query strings, resolves protocol-relative URLs and excludes local links',()=>{
 const result=outboundLinks('<a href="/contact/#inquiry">Local</a><a href="https://source.example/path?a=1&amp;b=2#cite">Source</a><a href="//other.example/page">Other</a><a href="mailto:hi@example.com">Email</a>','https://site.example/guides/');
 assert.deepEqual(result.map(row=>row.url),['https://source.example/path?a=1&b=2','https://other.example/page']);
});
test('confirmed missing links fail, transient missing links recover, and access blocks stay unverified',async()=>{
 const run=statuses=>probeLink('https://example.com/',{fetcher:async()=>new Response('',{status:statuses.shift()}),sleep:async()=>{}});
 assert.equal((await run([404,404])).result,'broken');
 assert.equal((await run([404,200])).result,'reachable');
 for(const code of [401,403,429]){const row=await run([code]);assert.equal(row.result,'unverified');assert.equal(row.attempts.length,1);}
 assert.equal((await run([503,503])).result,'unverified');
});
test('redirects retain every hop, loops and HTTPS downgrades fail, and private destinations are never requested',async()=>{
 const run=fetcher=>probeLink('https://example.com/',{fetcher,sleep:async()=>{}});
 const redirected=await run(async url=>url.pathname==='/'?new Response(null,{status:308,headers:{location:'/new?keep=1'}}):new Response('ok'));
 assert.equal(redirected.result,'reachable');assert.equal(redirected.redirects,1);assert.equal(redirected.finalUrl,'https://example.com/new?keep=1');
 const loop=await run(async()=>new Response(null,{status:301,headers:{location:'/'}}));assert.equal(loop.result,'broken');assert.equal(loop.issue,'Redirect loop');
 const downgrade=await run(async url=>url.protocol==='https:'?new Response(null,{status:302,headers:{location:'http://example.com/'}}):new Response('ok'));
 assert.equal(downgrade.result,'broken');assert.equal(downgrade.issue,'Redirect drops HTTPS');
 const calls=[];const privateLink=await run(async url=>{calls.push(url.href);return new Response(null,{status:302,headers:{location:'http://127.0.0.1/'}});});
 assert.equal(privateLink.result,'broken');assert.deepEqual(calls,['https://example.com/','https://example.com/']);
});
