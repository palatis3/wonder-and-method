import {WorkspaceError} from '../../../src/workspace/domain/contracts.mjs';
import {machineRpc} from '../database.mjs';
import {providerFetch} from '../http.mjs';
import {readBounded} from '../files/content.mjs';
const groups=Object.freeze({workspace:null,dispatch:['receipts','reconciliation','effects'],backups:['backup_schedules','tenant_backups']});
const fields=['queued_stale','unknown_stale','stops_stale','receipt_conflicts','receipts_stale','backup_schedules','backup_authority_attention','backup_overdue','backup_attention'];
const fault=()=>{throw new WorkspaceError('monitor_unavailable','Independent scheduled monitoring needs attention.',503);};
function configuration(env){
 let result;try{result=JSON.parse(env.WORKSPACE_MONITORS);}catch{fault();}
 if(!result||Array.isArray(result)||Object.keys(result).sort().join(',')!=='backups,dispatch,workspace')fault();
 const urls=new Set();
 for(const item of Object.values(result)){
  if(!item||Object.keys(item).sort().join(',')!=='cover_reference,owner_reference,url'||typeof item.owner_reference!=='string'||typeof item.cover_reference!=='string'||!item.owner_reference.trim()||!item.cover_reference.trim()||item.owner_reference.length>160||item.cover_reference.length>160)fault();
  let url;try{url=new URL(item.url);}catch{fault();}
  if(url.origin!=='https://hc-ping.com'||url.search||url.hash||!/^\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(url.pathname)||url.href!==item.url||urls.has(item.url))fault();urls.add(item.url);
 }
 return result;
}
function processingAttention(result,depth=0){
 if(result===null||result===undefined||typeof result!=='object')return false;
 if(depth>6||Array.isArray(result)&&result.length>1000)return true;
 if(Array.isArray(result))return result.some(x=>processingAttention(x,depth+1));
 if(result.recorded===false||result.error||['failed','attention','unknown','blocked','unresolved'].includes(result.state)||['failed','attention','unknown','blocked','unresolved'].includes(result.status))return true;
 if(['failed','attention','recordingFailures'].some(k=>result[k]===true||typeof result[k]==='number'&&result[k]>0))return true;
 return Object.values(result).some(v=>typeof v==='object'&&processingAttention(v,depth+1));
}
export function runtimeAssessment(metrics,{results={},failed=[]}={}){
 if(!metrics||fields.some(f=>!Number.isSafeInteger(metrics[f])||metrics[f]<0))fault();
 const reasons={workspace:[],dispatch:[],backups:[]};
 for(const [name,dependencies]of Object.entries(groups))for(const stage of failed)if(dependencies===null||dependencies.includes(stage))reasons[name].push('stage_'+stage);
 for(const [stage,result]of Object.entries(results))if(processingAttention(result))for(const [name,dependencies]of Object.entries(groups))if(dependencies===null||dependencies.includes(stage))reasons[name].push('stage_'+stage+'_attention');
 for(const [name,dependencies]of Object.entries(groups))if(dependencies)for(const stage of dependencies)if(!Object.hasOwn(results,stage))reasons[name].push('stage_'+stage+'_missing');
 for(const name of ['queued_stale','unknown_stale','stops_stale','receipt_conflicts','receipts_stale'])if(metrics[name])reasons.dispatch.push(name);
 for(const name of ['backup_authority_attention','backup_overdue','backup_attention'])if(metrics[name])reasons.backups.push(name);
 if(!metrics.backup_schedules||results.backup_schedules?.disabled||results.tenant_backups?.disabled)reasons.backups.push('backup_schedule_unqualified');
 // No success signal when an expected dispatcher stage did not run.
 if(['receipts','reconciliation','effects'].some(k=>!Object.hasOwn(results,k)||results[k]?.disabled))reasons.dispatch.push('dispatch_unqualified');
 reasons.workspace.push(...reasons.dispatch,...reasons.backups);
 return Object.fromEntries(Object.entries(reasons).map(([key,value])=>[key,{healthy:value.length===0,reasons:[...new Set(value)]}]));
}
export async function completeMonitoring(env,run,{call=machineRpc,fetcher=fetch}={}){
 if(env.MONITORING_ENABLED!=='true')return {disabled:true};
 const config=configuration(env);let assessment;
 try{assessment=runtimeAssessment(await call(env,'wm_runtime_health',{}),run);}catch{assessment=Object.fromEntries(Object.keys(groups).map(k=>[k,{healthy:false,reasons:['database_health_unavailable']}]));}
 const reports=await Promise.allSettled(Object.entries(assessment).map(async([name,status])=>{
  // These pre-existing check URLs are secrets. Send only class/category codes,
  // with no tenant IDs, account IDs, names, addresses, or raw error text.
  const response=await providerFetch(config[name].url+(status.healthy?'':'/fail'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:'workspace',class:name,status:status.healthy?'completed':'attention',categories:status.reasons})},fetcher);
  const reply=new TextDecoder().decode(await readBounded(response.body,512));
  // Healthchecks can return HTTP 200 for unknown or rate-limited checks.
  if(response.status!==200||reply.trim()!=='OK')fault();return {class:name,...status,acknowledged:true};
 }));
 if(reports.some(x=>x.status!=='fulfilled'))fault();
 return {items:reports.map(x=>x.value),attention:Object.values(assessment).some(x=>!x.healthy)};
}
