// Temporary protected test entry point; never referenced by normal deployment configs.
import {createHash,timingSafeEqual} from 'node:crypto';
import worker from './worker.mjs';
import draft from '../tests/fixtures/form-delivery-test.json' with {type:'json'};
const hash=value=>createHash('sha256').update(value).digest();
export function testEntry(base=worker,clock=Date.now,proposal=draft){
  const {approval,...approvedContent}=proposal;
  const authorized=approval.approved===true&&approval.approvedAt&&approval.payloadSha256===hash(JSON.stringify(approvedContent)).toString('hex');
  const exactBody=JSON.stringify(proposal.inquiry);
  return {
    scheduled:(...args)=>base.scheduled(...args),
    async fetch(request,env,ctx){
      const safe={...env,ENVIRONMENT:'staging',INQUIRY_MODE:'synthetic',RELEASE_APPROVED:'false'};
      const url=new URL(request.url);
      const readiness=url.pathname==='/api/setup-test-readiness'&&request.method==='GET';
      if(!readiness&&(url.pathname!=='/api/inquiries'||request.method!=='POST'))return base.fetch(request,safe,ctx);
      const expected=env.STAGING_AUTH?'Basic '+btoa(env.STAGING_AUTH):null;
      const supplied=request.headers.get('Authorization');
      if(!expected||!supplied||!timingSafeEqual(hash(expected),hash(supplied)))return base.fetch(request,safe,ctx);
      if(!authorized)return new Response('Test is not approved.',{status:403});
      const start=Number(env.TEST_START_MS),end=Number(env.TEST_END_MS),now=clock();
      if(!Number.isFinite(start)||!Number.isFinite(end)||end-start!==300000||now<start||now>=end)return new Response('Test window closed.',{status:403});
      if(readiness)return Response.json({testReference:proposal.reference,approvedPayloadSha256:approval.payloadSha256,startsAt:start,expiresAt:end,ready:!!env.RESEND_API_KEY},{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
      if(url.origin!==proposal.origin||request.headers.get('Origin')!==proposal.origin||request.headers.get('Content-Type')!=='application/json')return new Response('Test request mismatch.',{status:400});
      const reader=request.clone().body?.getReader();let bytes=0,parts=[];
      if(!reader)return new Response('Test request mismatch.',{status:400});
      while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>4096){await reader.cancel();return new Response('Test body too large.',{status:413});}parts.push(chunk.value);}
      if(Buffer.concat(parts).toString('utf8')!==exactBody)return new Response('Test request mismatch.',{status:400});
      // A unique persistent claim makes the fixture at most once across isolates and buckets.
      // The existing hourly rate-counter cleanup can remove it after this window has expired.
      const claim=await env.DB.prepare('INSERT OR IGNORE INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) RETURNING key').bind('approved-test:'+proposal.reference,end+1200000).first();
      if(!claim)return new Response('This test was already attempted.',{status:409});
      const delivered=await base.fetch(request,{...safe,INQUIRY_MODE:'live',RELEASE_APPROVED:'true',NOTIFICATION_FROM:proposal.from,NOTIFICATION_TO:proposal.to[0]},ctx);
      const response=new Response(delivered.body,delivered);
      response.headers.set('X-WM-Test-Reference',proposal.reference);
      return response;
    }
  };
}
export default testEntry();
