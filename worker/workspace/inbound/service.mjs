import {Webhook} from 'svix';
import {WorkspaceError,uuid,FILE_TYPES} from '../../../src/workspace/domain/contracts.mjs';
import {json,providerFetch,config,secure} from '../http.mjs';
import {machineRpc,rpc} from '../database.mjs';
import {readBounded,sha256,verifyContent} from '../files/content.mjs';
import {assertObjectWritable,claimObjectWrite} from '../retention/fences.mjs';
const fail=(code='inbound_unavailable')=>{throw new WorkspaceError(code,'Incoming email needs checking by the studio.',503);};
const EMAIL=/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export function mailbox(value){
 if(typeof value!=='string'||/[\r\n\x00]/.test(value))return null;
 const s=value.trim(),m=s.match(/^[^<>@,;]*<([^<>]+)>$/),address=(m?m[1]:s).toLowerCase();
 return address.length<=254&&EMAIL.test(address)&&!address.includes('..')?address:null;
}
function domain(env){const d=env.INBOUND_REPLY_DOMAIN;if(!d||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(d))fail('inbound_not_configured');return d;}
export async function routeEvidence(email,env){
 const recipients=[...new Set(['to','cc','bcc','received_for'].flatMap(k=>Array.isArray(email[k])?email[k]:[]).map(mailbox))];
 const from=mailbox(email.from),reply=(Array.isArray(email.reply_to)?email.reply_to:email.reply_to?[email.reply_to]:[]).map(mailbox);
 const hashes=[];let allAliases=true;
 for(const recipient of recipients){const match=recipient?.match(/^r\.([a-f0-9]{64})@(.+)$/);if(match?.[2]===domain(env))hashes.push(await sha256(new TextEncoder().encode(match[1])));else allAliases=false;}
 // One recipient and no conflicting reply identity is deliberately conservative.
 return {from,route_hashes:[...new Set(hashes)],routing_safe:Boolean(from&&recipients.length===1&&allAliases&&reply.every(x=>x===from))};
}
export async function verifyInboundWebhook(bytes,headers,secrets,{now=Date.now()}={}){
 const id=headers.get('svix-id'),timestamp=headers.get('svix-timestamp');
 if(!id||id.length>200||!/^\d{1,12}$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300)throw new WorkspaceError('invalid_webhook','Webhook could not be verified.',400);
 let raw;try{raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new WorkspaceError('invalid_webhook','Webhook could not be verified.',400);}
 for(const secret of secrets){try{new Webhook(secret.value).verify(raw,{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':headers.get('svix-signature')||''});const event=JSON.parse(raw);if(event&&typeof event==='object'&&!Array.isArray(event))return {event,key_version:secret.version};}catch{}}
 throw new WorkspaceError('invalid_webhook','Webhook could not be verified.',400);
}
export async function handleInboundWebhook(request,env,{rpc:call=machineRpc}={}){
 if(request.method!=='POST')return json({error:{message:'Method unavailable.'}},405);
 if(env.INBOUND_ENABLED!=='true'||!env.RESEND_INBOUND_WEBHOOK_SECRET||!env.RESEND_INBOUND_CONNECTION||!['production','staging'].includes(env.ENVIRONMENT))fail('inbound_not_configured');
 const bytes=await readBounded(request.body,1048576),secrets=[{value:env.RESEND_INBOUND_WEBHOOK_SECRET,version:env.RESEND_INBOUND_KEY_VERSION||'current'}];
 // Rotation overlap is explicitly bounded, never an indefinitely accepted old secret.
 if(env.RESEND_INBOUND_PREVIOUS_SECRET&&Date.parse(env.RESEND_INBOUND_PREVIOUS_UNTIL)>Date.now()&&Date.parse(env.RESEND_INBOUND_PREVIOUS_UNTIL)<=Date.now()+86400000)secrets.push({value:env.RESEND_INBOUND_PREVIOUS_SECRET,version:'previous'});
 const {event,key_version}=await verifyInboundWebhook(bytes,request.headers,secrets);
 const saved=await call(env,'wm_inbound_event_receive',{p_connection:env.RESEND_INBOUND_CONNECTION,p_environment:env.ENVIRONMENT,p_id:request.headers.get('svix-id'),p_hash:await sha256(bytes),p_event:event,p_key_version:key_version});
 return json({received:true,...(saved.anomaly?{attention:true}:{})});
}
async function resend(env,path,fetcher){
 if(!env.RESEND_INBOUND_API_KEY)fail('inbound_not_configured');
 const response=await providerFetch('https://api.resend.com/emails/receiving'+(path.startsWith('?')?path:'/'+path),{headers:{Authorization:`Bearer ${env.RESEND_INBOUND_API_KEY}`}},fetcher);
 if(!response.ok)fail(response.status===404?'email_not_available':response.status===429?'email_rate_limited':'email_retrieval_failed');
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readBounded(response.body,2097152)));}catch{fail('email_response_invalid');}
}
export async function enumerateAttachments(env,emailId,fetcher=fetch){
 let cursor;const found=[],ids=new Set(),cursors=new Set();
 for(let page=0;page<10;page++){
  const result=await resend(env,`${emailId}/attachments?limit=100${cursor?'&after='+encodeURIComponent(cursor):''}`,fetcher);
  if(!Array.isArray(result.data)||typeof result.has_more!=='boolean')fail('attachment_inventory_invalid');
  for(const item of result.data){uuid(item.id);if(ids.has(item.id))fail('attachment_inventory_duplicate');ids.add(item.id);found.push(item);}
  if(found.length>20)fail('attachment_count_exceeds_policy');
  if(!result.has_more)return found;
  cursor=result.data.at(-1)?.id;if(!cursor||cursors.has(cursor))fail('attachment_inventory_incomplete');cursors.add(cursor);
 }
 fail('attachment_inventory_incomplete');
}
function safeFilename(name){return typeof name==='string'&&name.length>0&&name.length<=180&&!/[\/\\\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/.test(name)?name:null;}
async function inboundStorage(env,key,{bytes,fetcher=fetch}={}){
 if(!/^inbound\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9]{64}$/.test(key)||!env.SUPABASE_SECRET_KEY)fail('attachment_storage_identity');
 return providerFetch(`${config(env).supabase}/storage/v1/object/workspace-inbound/${key}`,{method:bytes?'POST':'GET',headers:{apikey:env.SUPABASE_SECRET_KEY,...(bytes?{'Content-Type':'application/octet-stream','x-upsert':'false'}:{})},...(bytes?{body:bytes}:{})},fetcher);
}
export async function captureEmail(env,job,{fetcher=fetch,store=inboundStorage,rpc:call=machineRpc}={}){
 uuid(job.id);uuid(job.provider_id);const email=await resend(env,job.provider_id+'?html_format=cid',fetcher);
 if(email.id!==job.provider_id||email.html_format&&email.html_format!=='cid'||email.text!==null&&email.text!==undefined&&typeof email.text!=='string'||email.html!==null&&email.html!==undefined&&typeof email.html!=='string')fail('email_identity_invalid');
 const body_text=email.text??null,body_html=email.html??null;
 if((body_text?.length||0)>524288||(body_html?.length||0)>524288)fail('email_body_exceeds_policy');
 let items=[],inventoryError=null;const expected=Array.isArray(email.attachments)?email.attachments:[];
 try{items=await enumerateAttachments(env,job.provider_id,fetcher);if(!Array.isArray(email.attachments)||expected.length!==items.length||new Set(expected.map(x=>x.id)).size!==items.length||items.some(x=>!expected.some(e=>e.id===x.id)))fail('attachment_inventory_mismatch');}catch(error){items=[];inventoryError=error.code||'attachment_inventory_incomplete';}
 const attachments=[];let total=0;
 for(let item of items){
  const name=safeFilename(item.filename),media=FILE_TYPES[name?.split('.').at(-1).toLowerCase()];
  const entry={id:item.id,name:name||'Unsupported filename',state:'blocked',reason:'unsupported_file_policy'};
  if(env.FILE_POLICY!=='invite_only_unscanned'||!name||!media||media!==item.content_type||!Number.isSafeInteger(item.size)||item.size<1||item.size>20971520||total+item.size>52428800){attachments.push(entry);continue;}
  try{
   if(!Number.isFinite(Date.parse(item.expires_at))||Date.parse(item.expires_at)<Date.now()+60000)item=await resend(env,`${job.provider_id}/attachments/${item.id}`,fetcher);
   if(!Number.isSafeInteger(item.size)||item.size<1||item.size>20971520||total+item.size>52428800||!Number.isFinite(Date.parse(item.expires_at))||Date.parse(item.expires_at)<Date.now()+60000)fail('attachment_metadata_changed');
   const url=new URL(item.download_url);if(url.protocol!=='https:'||url.hostname!=='inbound-cdn.resend.com'||url.port||url.username||url.password||url.hash||item.id!==entry.id||item.filename!==name||item.content_type!==media)fail('attachment_url_not_qualified');
   const response=await providerFetch(url.href,{headers:{}},fetcher);if(!response.ok)fail('attachment_download_failed');
   const bytes=await readBounded(response.body,item.size);verifyContent(bytes,{name,media_type:media,bytes:item.size});total+=bytes.length;
   const checksum=await sha256(bytes),key=`inbound/${job.id}/${item.id}/${checksum}`;
   const identity={backend:'supabase',bucket:'workspace-inbound',key};await assertObjectWritable(env,identity);
   const write=await call(env,'wm_inbound_attachment_write_once',{p_id:job.id,p_generation:job.lease_generation,p_attachment:item.id,p_checksum:checksum,p_key:key});
   if(write===true&&await claimObjectWrite(env,identity)){try{await store(env,key,{bytes,fetcher});}catch{}}
   const saved=await store(env,key,{fetcher});if(!saved.ok||await sha256(await readBounded(saved.body,bytes.length))!==checksum)fail('attachment_storage_unknown');
   Object.assign(entry,{state:'stored_unscanned',reason:null,checksum,object_key:key,bytes:bytes.length,media_type:media});
  }catch(error){entry.reason=error.code||'attachment_capture_failed';}
  attachments.push(entry);
 }
 const routing=await routeEvidence(email,env),dmarc=email.authentication?.dmarc;
 return {body_text,body_html,content_hash:await sha256(new TextEncoder().encode(JSON.stringify({body_text,body_html}))),
 metadata:{from:routing.from,subject:typeof email.subject==='string'?email.subject.slice(0,500):'',dmarc:typeof dmarc==='string'?dmarc:'unknown',received_at:email.created_at||null,expected_attachments:expected.length,...(Array.isArray(email.attachments)&&expected.length<=20&&expected.every(x=>typeof x.id==='string')?{expected_attachment_ids:expected.map(x=>x.id).sort()}:{}),capture_limitation:inventoryError},
 attachments,route_hashes:routing.route_hashes,routing_safe:routing.routing_safe,urgent:/\b(stop|pause|cancel)\b/i.test((email.subject||'')+' '+(body_text||'')),complete:!inventoryError&&attachments.every(x=>x.state==='stored_unscanned')};
}
export async function captureInbound(env,{rpc:call=machineRpc,fetcher=fetch,capture=captureEmail}={}){
 if(env.INBOUND_ENABLED!=='true')return {disabled:true};let captured=0,attention=0;
 for(let i=0;i<3;i++){
  const job=await call(env,'wm_inbound_claim',{p_connection:env.RESEND_INBOUND_CONNECTION,p_environment:env.ENVIRONMENT});if(!job)break;
  let data;try{data=await capture(env,job,{fetcher,rpc:call});}catch(error){data={error:error.code||'email_capture_failed'};}
  const result=await call(env,'wm_inbound_capture',{p_id:job.id,p_generation:job.lease_generation,p_capture:data});if(result.state==='captured')captured++;else attention++;
 }return {captured,attention};
}
export async function inventoryInbound(env,{rpc:call=machineRpc,fetcher=fetch}={}){
 if(env.INBOUND_ENABLED!=='true')return {disabled:true};
 const claim=await call(env,'wm_inbound_inventory_claim',{p_connection:env.RESEND_INBOUND_CONNECTION,p_environment:env.ENVIRONMENT});if(!claim)return {waiting:true};
 const page=await resend(env,'?limit=100'+(claim.cursor?'&after='+encodeURIComponent(claim.cursor):''),fetcher);
 if(!Array.isArray(page.data)||typeof page.has_more!=='boolean'||page.data.length>100)fail('email_inventory_invalid');
 const items=page.data.map(item=>({id:uuid(item.id),subject:typeof item.subject==='string'?item.subject.slice(0,500):''}));
 return call(env,'wm_inbound_inventory_page',{p_connection:env.RESEND_INBOUND_CONNECTION,p_environment:env.ENVIRONMENT,p_generation:claim.generation,p_page:{items,has_more:page.has_more,page_hash:await sha256(new TextEncoder().encode(JSON.stringify(page)))}});
}
export async function inboundCommand(env,session,org,command,data,key){
 if(command==='inbound.route')domain(env);
 const result=await rpc(env,session.access_token,'wm_inbound_command',{p_org:org,p_command:command,p_input:data,p_key:key});
 if(result.token){const {token,...rest}=result;return {...rest,reply_address:`r.${token}@${domain(env)}`};}return result;
}
export async function handleInboundFile(request,env,session){
 const url=new URL(request.url),m=url.pathname.match(/^\/api\/inbound\/([a-f0-9-]{36})\/files\/([a-f0-9-]{36})$/i);if(!m)return null;
 if(request.method!=='GET')return json({error:{message:'Method unavailable.'}},405);
 if(url.searchParams.get('acknowledge_unscanned')!=='true')throw new WorkspaceError('file_acknowledgment','Acknowledge that this attachment has not been checked for malware.',400);
 const args={p_org:uuid(url.searchParams.get('business')),p_id:uuid(m[1]),p_attachment:uuid(m[2])};
 const info=await rpc(env,session.access_token,'wm_inbound_file_access',args),saved=await inboundStorage(env,info.object_key);
 if(!saved.ok)fail('attachment_unavailable');const bytes=await readBounded(saved.body,Number(info.bytes));if(await sha256(bytes)!==info.checksum)fail('attachment_integrity');
 await rpc(env,session.access_token,'wm_inbound_file_access',args);
 const response=secure(new Response(bytes,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(info.name)}`}}));response.headers.set('Content-Security-Policy',"sandbox; default-src 'none'; frame-ancestors 'none'");return response;
}
