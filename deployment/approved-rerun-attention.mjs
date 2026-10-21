export const submissionFailureCodes=Object.freeze(['inquiry_configuration_unavailable','inquiry_pre_save_failed','inquiry_storage_outcome_unknown','inquiry_receipt_failed']);
const live=env=>env.INQUIRY_MODE==='live'&&env.RELEASE_APPROVED==='true';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};

export async function hasOperationAttention(db){
 return Boolean(db&&await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_attention'").first());
}

// Dedicated Healthchecks checks, never the delivery heartbeat. Receiver URLs are secrets.
// An HTTP acknowledgement is not proof that an owner received a notification.
export async function sendAttentionPing(raw,{failed=true,send=fetch}={}){
 if(!raw)return {configured:false,acknowledged:false};
 let attempted=false;
 try{
  const url=new URL(raw);
  if(url.origin!=='https://hc-ping.com'||!/^\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/?$/i.test(url.pathname)||url.search||url.hash||url.username||url.password)return {configured:false,acknowledged:false};
  url.pathname=url.pathname.replace(/\/$/,'')+(failed?'/fail':'');
  attempted=true;
  const response=await send(url.href,{method:'POST',body:'',redirect:'manual',signal:AbortSignal.timeout(5000)});
  // Healthchecks can return HTTP 200 with "OK (rate limited)" or "OK (not found)".
  // Read only a bounded acknowledgement; never log any response bytes.
  const reader=response.body?.getReader();let text='',length=0;
  if(reader)try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>64)break;text+=new TextDecoder().decode(part.value);}}finally{try{await reader.cancel();}catch{}}
  return {configured:true,attempted,acknowledged:response.status===200&&length<=64&&text.trim()==='OK'};
 }catch{return {configured:true,attempted,acknowledged:false};}
}

export async function signalSubmissionAttention(env,{send=fetch,logger=console.error}={}){
 if(!live(env)||!env.INQUIRY_SUBMISSION_HEALTHCHECK_URL)return {configured:false,acknowledged:false};
 // Native limiting is independent of D1 and approximate within each Cloudflare
 // location. Receiver incident deduplication remains required; this is not a
 // strict global delivery limit. The key contains no user data.
 try{
  if(!env.INQUIRY_FAILURE_RATE_LIMITER?.limit)throw Error('missing limiter');
  const {success}=await env.INQUIRY_FAILURE_RATE_LIMITER.limit({key:'inquiry-submission-failure'});
  if(!success)return {configured:true,acknowledged:false,limiter_ready:true,edge_limited:true};
  const notification=await sendAttentionPing(env.INQUIRY_SUBMISSION_HEALTHCHECK_URL,{send});
  if(notification.attempted&&!notification.acknowledged)try{logger('inquiry_submission_signal_failed');}catch{}
  return {limiter_ready:true,edge_limited:false,...notification};
 }catch{try{logger('inquiry_alert_rate_limit_unavailable');}catch{}return {configured:true,acknowledged:false,limiter_ready:false};}
}

export async function recordSubmissionFailure(env,code,{send=fetch,now=Date.now(),logger=console.error}={}){
 if(!submissionFailureCodes.includes(code))return {recorded:false,ignored:true};
 // Synthetic/validation traffic never opens an operational incident.
 if(!live(env))return {recorded:false,ignored:true};
 try{logger(code);}catch{}
 let recorded=false,signal=true;
 try{
  if(await hasOperationAttention(env.DB)){
   await env.DB.prepare('INSERT INTO operation_attention (code,occurrences,first_at,last_at) VALUES (?,1,?,?) ON CONFLICT(code) DO UPDATE SET occurrences=occurrences+1,last_at=excluded.last_at').bind(code,now,now).run();
   recorded=true;
   // One attempt per minute per fixed code while D1 works. A failed database
   // must never block the independent external failure signal.
   signal=Boolean(await env.DB.prepare('UPDATE operation_attention SET last_signal_at=? WHERE code=? AND (last_signal_at IS NULL OR last_signal_at<=?) RETURNING code').bind(now,code,now-60_000).first());
  }
 }catch{ /* The original response and independent signal must survive D1 failure. */ }
 const notification=signal?await signalSubmissionAttention(env,{send,logger}):{configured:Boolean(env.INQUIRY_SUBMISSION_HEALTHCHECK_URL),acknowledged:false,throttled:true};
 return {recorded,...notification};
}

export async function submissionAttention(db){
 if(!await hasOperationAttention(db))return {migration_ready:false,incidents:[],review_required:false};
 const {results}=await db.prepare('SELECT code,occurrences,first_at,last_at,acknowledged_occurrences,acknowledged_at FROM operation_attention ORDER BY code').all();
 return {migration_ready:true,incidents:results,review_required:results.some(row=>row.occurrences>row.acknowledged_occurrences)};
}

// Acknowledgement is an explicit reviewed snapshot, not a claim of successful
// inquiry storage. A concurrent new failure cannot be acknowledged accidentally.
export async function acknowledgeSubmissionAttention(env,data,{now=Date.now()}={}){
 if(!data||data.confirm!=='reviewed-submission-failures'||!Array.isArray(data.incidents)||data.incidents.length>submissionFailureCodes.length||Object.keys(data).some(key=>!['confirm','incidents'].includes(key)))return {status:422,message:'Supply the exact reviewed submission-failure snapshot.'};
 if(!await hasOperationAttention(env.DB))return {status:503,message:'Operational attention migration is required.'};
 const seen=new Set();
 for(const item of data.incidents){
  if(!item||!submissionFailureCodes.includes(item.code)||seen.has(item.code)||!Number.isSafeInteger(item.occurrences)||item.occurrences<1||Object.keys(item).some(key=>!['code','occurrences'].includes(key)))return {status:422,message:'Use fixed failure codes and exact occurrence counts.'};
  seen.add(item.code);
 }
 for(const item of data.incidents){
  const row=await env.DB.prepare('UPDATE operation_attention SET acknowledged_occurrences=occurrences,acknowledged_at=? WHERE code=? AND occurrences=? RETURNING code').bind(now,item.code,item.occurrences).first();
  if(!row)return {status:409,message:'The failure snapshot changed. Read status and review again.'};
 }
 const attention=await submissionAttention(env.DB);
 // Do not reset the independent incident automatically. The operator must also
 // use the guarded re-arm procedure after reconciling outage-only errors that D1
 // could not record. HTTP 200 is not an all-clear; a later 409 may follow earlier
 // successfully reviewed rows. Always re-read status and independent evidence.
 return {status:200,attention,message:'Review recorded. Re-read current attention and follow the guarded monitor re-arm procedure; this response is not an all-clear. No inquiry or retention date was changed.'};
}

export async function retentionAttentionPing(env,attention,{send=fetch}={}){
 if(!live(env))return {configured:false,acknowledged:false};
 return sendAttentionPing(env.RETENTION_HEALTHCHECK_URL,{failed:!attention||attention.review_required,send});
}

export function attentionResponse(result){return Response.json(result,{status:result.status||200,headers});}
