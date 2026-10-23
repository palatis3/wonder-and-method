import test from 'node:test';
import assert from 'node:assert/strict';
import {changedCitationUrls,probeCitation} from '../scripts/check-citations.mjs';

test('citation review includes changed attribution at an existing URL and deduplicates shared sources',()=>{
 const old=[{sources:[{url:'https://example.com/',label:'Business',observation:'Old fact.'}]}];
 const current=[{sources:[...old[0].sources,{url:'https://example.com/new',label:'New',observation:'New fact.'}]},{sources:[{...old[0].sources[0],observation:'Corrected attribution.'}]}];
 assert.deepEqual(changedCitationUrls(current,old),['https://example.com/','https://example.com/new']);
 assert.deepEqual(changedCitationUrls(old,old),[]);
});

test('citation review distinguishes blocked access, a transient missing response, repeated absence and redirect loops',async()=>{
 const run=responses=>probeCitation('https://example.com/',{fetcher:async()=>responses.shift(),pause:async()=>{}});
 assert.equal((await run([new Response('',{status:403})])).result,'unverified');
 const limited=await run([new Response('',{status:429,headers:{'Retry-After':'120'}})]);assert.equal(limited.result,'unverified');assert.equal(limited.attempts.length,1);assert.equal(limited.attempts[0].retryAfter,'120');
 assert.equal((await run([new Response('',{status:404}),new Response('Available')])).result,'reachable');
 const missing=await run([new Response('',{status:404}),new Response('',{status:410})]);assert.equal(missing.result,'missing');assert.equal(missing.attempts.length,2);
 const loop=await probeCitation('https://example.com/',{fetcher:async()=>new Response(null,{status:308,headers:{Location:'/'}}),pause:async()=>{}});
 assert.equal(loop.result,'unverified');assert.match(loop.attempts[0].reason,/five citation redirects/);
});
