import {WorkspaceError,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {rpc,machineRpc} from '../database.mjs';

export const INTAKE_COMMANDS=Object.freeze(['intake.assign','intake.progress','intake.link','intake.create_business','intake.conflict.reject']);
const fields={
 'intake.assign':['id','expected_version','assignee_id','reason'],
 'intake.progress':['id','expected_version','stage','next_action','next_contact_at','reason'],
 'intake.link':['id','expected_version','organization_id','accepted_summary','requested_services','reason'],
 'intake.create_business':['id','expected_version','grant_id','accepted_summary','requested_services','reason'],
 'intake.conflict.reject':['id','expected_version','source_hash','reason']
};
const fail=()=>{throw new WorkspaceError('intake_input','Check the intake fields and reload the current record.',400);};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function validateIntakeCommand(command,input){
 const keys=fields[command];if(!keys||!object(input)||Object.keys(input).some(k=>!keys.includes(k))||keys.some(k=>!(k in input)))fail();
 uuid(input.id);if(!Number.isSafeInteger(input.expected_version)||input.expected_version<1)fail();
 for(const k of keys){
  const x=input[k];
  if(k.endsWith('_id'))uuid(x);
  if(['reason','accepted_summary','next_action'].includes(k)&&(typeof x!=='string'||!x.trim()||x.length>2000))fail();
 }
 if(command==='intake.progress'){
  if(!['new','qualified','proposed','won','lost'].includes(input.stage))fail();
  if(input.next_contact_at!==null&&(typeof input.next_contact_at!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(input.next_contact_at)||!Number.isFinite(Date.parse(input.next_contact_at))))fail();
 }
 if('requested_services' in input&&(!Array.isArray(input.requested_services)||input.requested_services.length<1||input.requested_services.length>10||input.requested_services.some(x=>!['ads_search','ads_social','ads_professional','web_design','seo','care','catalog_project'].includes(x))))fail();
 if(command==='intake.conflict.reject'&&!hex(input.source_hash))fail();
 return input;
}
export async function intakeCommand(env,session,command,input,key,{call=rpc}={}){
 validateIntakeCommand(command,input);if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,200}$/.test(key))fail();
 return call(env,session.access_token,'wm_intake_command',{p_command:command,p_input:input,p_key:key});
}
export async function intakeQueue(env,session,{query='',stage='',after=null}={}, {call=rpc}={}){
 if(typeof query!=='string'||query.length>100||!['','new','qualified','proposed','won','lost','quarantined'].includes(stage))fail();
 if(after!==null)uuid(after);
 return call(env,session.access_token,'wm_intake_queue',{p_query:query,p_stage:stage,p_after:after});
}
export async function sha256(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}

// Exact immutable content: UUID, source millisecond time, synthetic flag, original
// payload JSON string. Mutable delivery/follow-up fields stay in page evidence.
export async function exportEnvelope(page,raw,{id,origin,environment},after=null){
 if(!object(page)||Object.keys(page).some(k=>!['records','next_cursor'].includes(k))||!Array.isArray(page.records)||page.records.length>100||!('next_cursor' in page))fail();
 if(after!==null)uuid(after);
 let last=after||'00000000-0000-0000-0000-000000000000';const records=[];
 for(const r of page.records){
  if(!object(r)||typeof r.payload!=='string'||new TextEncoder().encode(r.payload).byteLength>30000||!Number.isSafeInteger(r.created_at)||r.created_at<0||![0,1].includes(r.synthetic))fail();
  uuid(r.id);if(r.id!==r.id.toLowerCase()||r.id<=last)fail();last=r.id;
  let payload;try{payload=JSON.parse(r.payload);}catch{fail();}if(!object(payload))fail();
  const identity_json=JSON.stringify([r.id,r.created_at,r.synthetic,r.payload]);
  records.push({source_id:r.id,identity_json,source_hash:await sha256(identity_json)});
 }
 const next=page.next_cursor;
 if(next!==null)uuid(next);
 if(page.records.length===100?next!==last:next!==null)fail();
 return {schema:'wm-public-inquiry-export-1',origin,environment,response_hash:await sha256(raw),after,next_cursor:next,records};
}
async function boundedText(response){
 if(!response.body)fail();const reader=response.body.getReader();let bytes=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4_000_000){await reader.cancel();fail();}parts.push(value);}}finally{reader.releaseLock();}
 const joined=new Uint8Array(bytes);let offset=0;for(const p of parts){joined.set(p,offset);offset+=p.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(joined);
}

// Called only from a protected server route. Source registry/credentials are NOT
// supplied by browser input. One page per call; persist result before advancing.
export async function syncIntakePage(env,session,sourceKey,{after=null}={}, {call=rpc,machine=machineRpc,fetcher=fetch}={}){
 if(typeof sourceKey!=='string'||!/^[a-z0-9_-]{1,60}$/.test(sourceKey))fail();if(after!==null)uuid(after);
 await call(env,session.access_token,'wm_intake_access',{});
 const source=await machine(env,'wm_intake_source',{p_source:sourceKey});
 let registry=env.INTAKE_EXPORT_SOURCES;try{if(typeof registry==='string')registry=JSON.parse(registry);}catch{registry=null;}
 const config=object(registry)?registry[sourceKey]:null;
 if(!config||source.id!==sourceKey||config.origin!==source.origin||config.environment!==source.environment||typeof config.token!=='string'||!config.token)throw new WorkspaceError('intake_config','The reviewed inquiry export connection is unavailable.',503);
 let url;try{url=new URL(config.origin);}catch{fail();}
 if(url.protocol!=='https:'||url.origin!==config.origin||url.username||url.password||url.pathname!=='/'||url.search||url.hash)fail();
 url.pathname='/api/operator/inquiries';if(after)url.searchParams.set('after',after);
 const headers={Accept:'application/json',Authorization:`Bearer ${config.token}`};
 if(config.stagingAuthorization){if(source.environment!=='staging')fail();headers['X-Staging-Authorization']=config.stagingAuthorization;}
 const response=await fetcher(url.href,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(20000)});
 if(!response.ok){await response.body?.cancel();throw new WorkspaceError('intake_export','The public inquiry export is unavailable. Its saved inquiries remain independent.',503);}
 if(!response.headers.get('content-type')?.includes('application/json')){await response.body?.cancel();fail();}
 const raw=await boundedText(response);let page;try{page=JSON.parse(raw);}catch{fail();}
 const envelope=await exportEnvelope(page,raw,source,after);
 // Recheck human authority after network delay, before the machine receipt write.
 await call(env,session.access_token,'wm_intake_access',{});
 return machine(env,'wm_intake_receive',{p_source:sourceKey,p_envelope:envelope});
}
