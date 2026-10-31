import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTransport} from '../../worker/workspace/ads/transport.mjs';
import {request,base} from '../../worker/workspace/ads/providers/common.mjs';
const identity={provider:'google_ads',environment:'production',account_id:'90071992547409931',currency:'USD',timezone:'America/New_York',manager_id:'123456789'};
const p=base('google_ads','synthetic', {marker:'0123456789abcdef',name:'Synthetic'},identity,[]);
const make=(write=false)=>request(p,'https://googleads.googleapis.com/v26/customers/90071992547409931/googleAds:mutate',{method:'POST',body:{amountMicros:'9007199254740993'},write});
test('ad transport preserves exact wire text, keeps credentials out of evidence and classifies query POSTs independently',async()=>{
 const calls=[],events=[],call=nativeTransport({GOOGLE_ADS_DEVELOPER_TOKEN:'synthetic-developer'},identity,{access_token:'synthetic-token'},{authorize:async()=>events.push('authorized'),reserve:async()=>events.push('reserved'),fetcher:async(url,o)=>{calls.push({url,o});return new Response('{"id":900719925474099301}',{headers:{'request-id':'native-request'}});}});
 const query=make(false),read=await call(query,{write:false});assert.equal(read.body,'{"id":900719925474099301}');assert.deepEqual(events,['authorized']);
 const mutation=make(true);await call(mutation,{write:true});assert.deepEqual(events,['authorized','authorized','reserved','authorized']);
 assert.equal(calls[1].o.body,mutation.body);assert.equal(calls[1].o.redirect,'error');assert.equal(calls[1].o.headers.Authorization,'Bearer synthetic-token');assert.equal(calls[1].o.headers['login-customer-id'],'123456789');
 assert.equal(JSON.stringify(read).includes('synthetic-token'),false);await assert.rejects(call(mutation,{write:true}),/verification/);assert.equal(calls.length,2);
});
test('wrong endpoint/account, stale authority and absent developer credentials send no network request',async()=>{
 let sent=0;const options={authorize:async()=>{},reserve:async()=>{},fetcher:async()=>{sent++;return new Response('{}');}};
 const call=nativeTransport({GOOGLE_ADS_DEVELOPER_TOKEN:'synthetic'},identity,{access_token:'synthetic'},options);
 await assert.rejects(call({...make(),url:'https://unreviewed.example/token'},{write:false}));await assert.rejects(call({...make(),account_id:'123'},{write:false}));await assert.rejects(call(make(true),{write:false}));
 await assert.rejects(nativeTransport({},identity,{access_token:'synthetic'},options)(make(),{write:false}));
 await assert.rejects(nativeTransport({GOOGLE_ADS_DEVELOPER_TOKEN:'synthetic'},identity,{access_token:'synthetic'},{...options,authorize:async()=>{throw Error('Synthetic revoked grant');}})(make(true),{write:true}));assert.equal(sent,0);
});
test('unknown mutation outcomes cannot replay within the same attempt and error bodies remain private',async()=>{
 let sent=0;const call=nativeTransport({GOOGLE_ADS_DEVELOPER_TOKEN:'synthetic'},identity,{access_token:'synthetic'},{authorize:async()=>{},reserve:async()=>{},fetcher:async()=>{sent++;return new Response('Sensitive provider error body',{status:500});}});
 await assert.rejects(call(make(true),{write:true}),e=>e.effect_dispatched===true&&e.code==='ads_write_unknown'&&!e.message.includes('Sensitive'));
 await assert.rejects(call(make(true),{write:true}),e=>e.effect_dispatched===true);assert.equal(sent,1);
});
test('provider-specific authentication stays outside exact bodies and empty LinkedIn acknowledgments retain their IDs',async()=>{
 for(const provider of ['meta_ads','microsoft_ads','tiktok_ads','linkedin_ads']){
  const current={...identity,provider,...(provider==='microsoft_ads'?{customer_id:'23456789'}:{})},plan=base(provider,'synthetic',{marker:'0123456789abcdef',name:'Synthetic'},current,[]);
  const origin={meta_ads:`https://graph.facebook.com/v25.0/act_${current.account_id}/campaigns`,microsoft_ads:'https://campaign.api.bingads.microsoft.com/CampaignManagement/v13/Campaigns',tiktok_ads:'https://business-api.tiktok.com/open_api/v1.3/campaign/create/',linkedin_ads:`https://api.linkedin.com/rest/adAccounts/${current.account_id}/adCampaigns`}[provider];
  const req=request(plan,origin,{method:'POST',body:{approved:'Exact body'},write:true});let sent;
  const call=nativeTransport({META_CLIENT_SECRET:'synthetic-secret',MICROSOFT_DEVELOPER_TOKEN:'synthetic-developer'},current,{access_token:'synthetic-token'},{authorize:async()=>{},reserve:async()=>{},fetcher:async(url,o)=>{sent={url,o};return provider==='linkedin_ads'?new Response(null,{status:201,headers:{'x-restli-id':'900719925474099301'}}):new Response('{}');}});
  const result=await call(req,{write:true});assert.equal(sent.o.body,req.body);assert.equal(req.url,origin);assert.equal(JSON.stringify(result).includes('synthetic-token'),false);
  if(provider==='meta_ads'){assert.ok(new URL(sent.url).searchParams.get('appsecret_proof'));assert.equal(new URL(sent.url).searchParams.has('access_token'),false);}
  if(provider==='microsoft_ads'){assert.equal(sent.o.headers.Authorization,'Bearer synthetic-token');assert.equal(sent.o.headers.CustomerAccountId,current.account_id);assert.equal(sent.o.headers.CustomerId,current.customer_id);}
  if(provider==='tiktok_ads'){assert.equal(sent.o.headers['Access-Token'],'synthetic-token');assert.equal(sent.o.headers.Authorization,undefined);}
  if(provider==='linkedin_ads'){assert.equal(result.body,'');assert.equal(result.headers['x-restli-id'],'900719925474099301');}
 }
});
test('concurrent calls within one attempt cannot both reserve or post a mutation',async()=>{
 let sent=0,reserved=0;let allow;const waiting=new Promise(resolve=>{allow=resolve;});
 const call=nativeTransport({GOOGLE_ADS_DEVELOPER_TOKEN:'synthetic'},identity,{access_token:'synthetic'},{authorize:async()=>waiting,reserve:async()=>{reserved++;},fetcher:async()=>{sent++;return new Response('{}');}});
 const first=call(make(true),{write:true});await assert.rejects(call(make(true),{write:true}),e=>e.code==='ads_duplicate_dispatch'&&e.effect_dispatched===true);allow();await first;assert.equal(sent,1);assert.equal(reserved,1);
});
