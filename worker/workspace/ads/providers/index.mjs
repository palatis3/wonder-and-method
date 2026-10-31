import * as google from './google.mjs';
import * as meta from './meta.mjs';
import * as microsoft from './microsoft.mjs';
import * as tiktok from './tiktok.mjs';
import * as linkedin from './linkedin.mjs';
import {NativeAdsError,fail,fields,freeze,canonical,copy,getNode,binding,reader,outcome,wholeGraph,parseNativeJson} from './common.mjs';
export {NativeAdsError,parseNativeJson};
const providers={google_ads:google,meta_ads:meta,microsoft_ads:microsoft,tiktok_ads:tiktok,linkedin_ads:linkedin};
function adapter(provider){return providers[provider]??fail('native_unsupported','Unsupported provider or family.');}
export function compileNativePlan(provider,spec,identity){return freeze(adapter(provider).compile(spec,identity));}
function checked(provider,plan){const m=adapter(provider);if(plan?.provider!==provider||canonical(plan)!==canonical(m.compile(plan.spec,plan.identity)))fail('native_plan_changed','Use an unmodified compiled plan.');return m;}
export function buildNativeRequest(provider,{plan,action,step_key,bindings={}}){const m=checked(provider,plan);if(!['create','enable','pause','update'].includes(action))fail('native_unsupported');const n=getNode(plan,step_key);if(n.read_only)fail('native_read_only');return m.build(plan,n,action,bindings);}
// Google validateOnly is a read-classified POST and does not create native objects.
export function buildNativeValidationRequest(provider,{plan,bindings={}}){const m=checked(provider,plan);if(!m.validation)fail('native_unsupported');return m.validation(plan,bindings);}
export function extractNativeCreateBindings(provider,{plan,step_key,response,headers={}}){const m=checked(provider,plan),n=getNode(plan,step_key),data=typeof response==='string'?parseNativeJson(response):response;if(!data||typeof data!=='object')fail('native_response');return freeze({bindings:m.extracted(plan,n,data,headers),verified:false,checkpoint_then_read_required:true,automatic_replay_allowed:false,provider_errors:copy(data.PartialErrors??data.partialFailureError??data.errors??null),tracking_id:data.TrackingId??null});}
function requestAction(p,n,phase,b){if(!n.controllable)return 'create';if(phase==='enabled')return 'enable';if(phase==='children_enabled')return n.key===p.enable_order.at(-1)?'create':'enable';if(phase==='paused'&&n.key!==p.pause_order[0])return b[n.key]?.configured_status===p.active_status?'enable':'create';return 'create';}
function candidateId(p,n,v){if(p.provider==='google_ads')return v?.resourceName?.split('/').at(-1);if(p.provider==='microsoft_ads')return v?.Id;if(p.provider==='tiktok_ads')return v?.[{campaign:'campaign_id',group:'adgroup_id',ad:'ad_id'}[n.role]];if(p.provider==='linkedin_ads'){const value=v?.id;if(typeof value!=='string')return null;return n.role==='post'?value:value.split(':').at(-1);}return v?.id;}
function parentMatches(p,n,v,b){if(p.provider!=='linkedin_ads'||n.role!=='campaign')return true;return v.campaignGroup===b.group.resource_name;}
export async function readNativeStep(provider,context,{call}){
 const {plan,step_key,bindings:initial={},phase='created'}=context??{},m=checked(provider,plan);if(!['created','children_enabled','enabled','paused'].includes(phase))fail('native_phase');if(context.account_id!==undefined&&context.account_id!==plan.account_id||context.environment!==undefined&&context.environment!==plan.environment)fail('native_binding');
 try{
  if(step_key==='identity'){const result=await m.identityRead(plan,call);return freeze({...outcome([result]),bindings:{identity:result}});}
  if(step_key!=='graph'){
   const n=getNode(plan,step_key);if(n.read_only||n.role==='atomic_graph')fail('native_step');const b={...initial};for(const key of n.depends_on)binding(plan,key,b);const rows=await m.inventory(plan,n,b,call),expectedId=b[n.key]?binding(plan,n.key,b,{verified:false}).id:null;
   const found=rows.filter(v=>!expectedId||candidateId(plan,n,v)===expectedId).map(v=>m.candidate(plan,n,v,b,requestAction(plan,n,phase,b))).filter(Boolean),result=outcome(found);return freeze({...result,bindings:found.length===1?{[n.key]:found[0]}:{}});
  }
  const b={...initial,identity:await m.identityRead(plan,call)},inventories={},cache=new Map();for(const n of plan.steps.filter(x=>!x.read_only&&x.role!=='atomic_graph')){
   const key=(n.inventory??'discovery:'+n.key)+(n.criterion_type?':'+n.criterion_type:'');let rows=cache.get(key);if(!rows){rows=await m.inventory(plan,n,b,call);cache.set(key,rows);}const scoped=rows.filter(v=>parentMatches(plan,n,v,b));if(n.inventory)inventories[n.inventory]=scoped.map(v=>candidateId(plan,n,v));
   const expectedId=b[n.key]?binding(plan,n.key,b,{verified:false}).id:null,found=scoped.filter(v=>!expectedId||candidateId(plan,n,v)===expectedId).map(v=>m.candidate(plan,n,v,b,requestAction(plan,n,phase,b))).filter(Boolean);
   if(found.length!==1)return freeze({...outcome(found,{scope:'graph'}),bindings:{}});b[n.key]=found[0];
  }
  if(m.completeInventories)Object.assign(inventories,await m.completeInventories(plan,b,call));
  if(!wholeGraph(plan,b,inventories))return freeze({...outcome([],{scope:'graph',reason:'unmanaged_or_missing_descendants'}),bindings:{}});
  const nodes=Object.fromEntries(plan.steps.filter(n=>!n.read_only&&n.role!=='atomic_graph').map(n=>[n.key,{id:b[n.key].id,resource_name:b[n.key].resource_name,configured_status:b[n.key].configured_status}])),proof={schema:'wm-native-graph-proof/1',provider,environment:plan.environment,account_id:plan.account_id,marker:plan.marker,phase,complete_graph:true,approved_spec:copy(plan.spec),nodes,native_review_approval_proven:false};
  return freeze({...outcome([proof],{scope:'graph'}),bindings:{...b,_graph:proof}});
 }catch(error){if(!(error instanceof NativeAdsError))throw error;return freeze({...outcome([],{scope:step_key==='graph'?'graph':'resource',reason:error.code}),bindings:{}});}
}
