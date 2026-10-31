import {WorkspaceError,uuid} from '../../../src/workspace/domain/contracts.mjs';
import {rpc,machineRpc} from '../database.mjs';
import {externalControl} from '../continuity/receipts.mjs';

export const MEDIA_BUDGET_COMMANDS=new Set(['media_budget.propose','media_budget.approve','media_budget.revoke','media_budget.rebalance']);
const fault=()=>{throw new WorkspaceError('media_budget_input','Check the exact media budget terms and current version.',400);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function keys(v,allowed,required=allowed){if(!object(v)||required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!allowed.includes(k)))fault();}
const text=(s,max=2000)=>{if(typeof s!=='string'||!s.trim()||s.length>max||/[\u0000-\u001f]/.test(s))fault();return s;};
const minor=(v,positive=false)=>{if(typeof v!=='string'||!/^(0|[1-9][0-9]{0,17})$/.test(v)||positive&&BigInt(v)===0n)fault();return BigInt(v);};
const version=v=>{if(!Number.isSafeInteger(v)||v<1)fault();};
const when=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))fault();};
export function validateMediaBudgetCommand(command,input){
 if(!MEDIA_BUDGET_COMMANDS.has(command))fault();
 if(command==='media_budget.propose'){
  keys(input,['engagement_id','agreement_id','terms','replaces_pool_id'],['engagement_id','agreement_id','terms']);uuid(input.engagement_id);uuid(input.agreement_id);if(input.replaces_pool_id!==undefined&&input.replaces_pool_id!==null)uuid(input.replaces_pool_id);
  const t=input.terms;keys(t,['currency','total_minor','reserve_minor','timezone','starts_at','ends_at','expires_at','recurrence','routine_limits','allocations']);
  if(typeof t.currency!=='string'||!/^[A-Z]{3}$/.test(t.currency)||!['once','calendar_month'].includes(t.recurrence))fault();text(t.timezone,100);when(t.starts_at);when(t.ends_at);when(t.expires_at);
  if(Date.parse(t.starts_at)>=Date.parse(t.expires_at)||Date.parse(t.expires_at)>Date.parse(t.ends_at))fault();
  const total=minor(t.total_minor,true),reserve=minor(t.reserve_minor);if(reserve>total)fault();
  keys(t.routine_limits,['max_rebalance_minor','max_rebalances','allowed_actions']);minor(t.routine_limits.max_rebalance_minor);if(!Number.isSafeInteger(t.routine_limits.max_rebalances)||t.routine_limits.max_rebalances<0||t.routine_limits.max_rebalances>24||!Array.isArray(t.routine_limits.allowed_actions)||!t.routine_limits.allowed_actions.length||t.routine_limits.allowed_actions.length>4||new Set(t.routine_limits.allowed_actions).size!==t.routine_limits.allowed_actions.length||t.routine_limits.allowed_actions.some(x=>!['create','enable','update','pause'].includes(x)))fault();
  if(!Array.isArray(t.allocations)||!t.allocations.length||t.allocations.length>20)fault();const names=new Set(),scopes=new Set();let sum=reserve;
  for(const a of t.allocations){keys(a,['key','provider_scope_id','provider','environment','account_id','currency','timezone','initial_minor','cap_minor','unmanaged_minor']);uuid(a.provider_scope_id);if(typeof a.key!=='string'||!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(a.key)||names.has(a.key)||scopes.has(a.provider_scope_id)||!['google_ads','meta_ads','microsoft_ads','tiktok_ads','linkedin_ads'].includes(a.provider)||!['production','test'].includes(a.environment)||a.currency!==t.currency)fault();text(a.account_id,200);text(a.timezone,100);names.add(a.key);scopes.add(a.provider_scope_id);const initial=minor(a.initial_minor),cap=minor(a.cap_minor),unmanaged=minor(a.unmanaged_minor);if(unmanaged>initial||initial>cap||cap>total-reserve)fault();sum+=initial;}
  if(sum!==total)fault();
 }else if(command==='media_budget.approve'){keys(input,['pool_id','expected_version','digest','shown_terms_digest']);uuid(input.pool_id);version(input.expected_version);if(!/^[a-f0-9]{64}$/.test(input.digest)||input.shown_terms_digest!==input.digest)fault();}
 else if(command==='media_budget.revoke'){keys(input,['pool_id','expected_version','reason']);uuid(input.pool_id);version(input.expected_version);text(input.reason);}
 else{keys(input,['pool_id','expected_version','period_key','allocations','reason']);uuid(input.pool_id);version(input.expected_version);if(!/^\d{4}-\d{2}$/.test(input.period_key)||!Array.isArray(input.allocations)||input.allocations.length<1||input.allocations.length>20)fault();text(input.reason);const seen=new Set();for(const a of input.allocations){keys(a,['key','assigned_minor']);if(typeof a.key!=='string'||!/^[a-z0-9][a-z0-9_-]{0,59}$/.test(a.key)||seen.has(a.key))fault();seen.add(a.key);minor(a.assigned_minor);}}
 return input;
}
async function openControl(env,org,control,expected=null){const current=await control(env,org);if(current.access_state!=='open'||expected!==null&&current.external_generation!==expected)throw new WorkspaceError('media_budget_generation','Media budget access changed. Reload before continuing.',409);return current;}
export async function mediaBudgetCommand(env,session,org,command,input,key,{call=rpc,control=externalControl}={}){
 uuid(org);validateMediaBudgetCommand(command,input);if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,200}$/.test(key))fault();const before=await openControl(env,org,control);
 const result=await call(env,session.access_token,'wm_media_budget_command',{p_org:org,p_command:command,p_input:input,p_key:key});await openControl(env,org,control,before.external_generation);return result;
}
export async function mediaBudgetStatus(env,session,org,{call=rpc,control=externalControl}={}){uuid(org);const before=await openControl(env,org,control);const data=await call(env,session.access_token,'wm_media_budget_list',{p_org:org});await openControl(env,org,control,before.external_generation);return data;}
export async function runMediaBudgets(env,{call=machineRpc}={}){if(env.MEDIA_BUDGETS_ENABLED!=='true')return {disabled:true};return call(env,'wm_media_budget_generate',{p_limit:10});}
// The application currently has no qualified native spend/finality reader. The
// default does not accept browser totals or invent a successful zero-spend read.
export async function synchronizeMediaSpend(env,query,{readSpend=null,call=machineRpc}={}){
 if(!readSpend)return {state:'pending_native_evidence',held_commitments_released:false};
 const proof=await readSpend(query);if(!proof||proof.coverage!=='complete')return {state:'pending_native_evidence',held_commitments_released:false};
 if(proof.provider_scope_id!==query.provider_scope_id||proof.account_id!==query.account_id||proof.currency!==query.currency||proof.timezone!==query.timezone||proof.period_start!==query.period_start||proof.period_end!==query.period_end)fault();
 return call(env,'wm_media_budget_record_spend',{p_org:uuid(query.organization_id),p_input:proof});
}
