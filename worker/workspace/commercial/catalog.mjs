import offers from '../../../config/offers.json' with {type:'json'};

// This is a server/build module. Never send internal catalog planning to clients.
const cents=n=>{const v=Math.round(n*100);if(!Number.isSafeInteger(v)||v<0)throw Error('Invalid catalog amount');return v;};
export function catalogEntries(source=offers){
 const entries=[];
 const add=(id,item,type,variant='standard',price=null)=>{
  const recurring=price!==null, care=recurring&&item.variants?.[variant]?.care;
  const total=recurring?cents(price):item.public_price!=null?cents(item.public_price):item.one_time_price!=null?cents(item.one_time_price):null;
  const scope=item.scope||item.deliverables||item.v3?.includes||item.description||item.public_name;
  const components=recurring?[{id:'management',amount_minor:total,interval:'month',trigger:'service_start'}]:[];
  let milestones=[];
  if(!recurring&&total!==null){const schedule=item.payment_schedule||[{event:'Book the agreed scope',percent:50},{event:'Accept the agreed deliverables',percent:50}];let allocated=0;milestones=schedule.map((s,i)=>{const amount=i===schedule.length-1?total-allocated:Math.round(total*s.percent/100);allocated+=amount;return {id:'stage_'+(i+1),deliverable:s.event,amount_minor:amount,acceptance_rule:s.event,proof:i===0?'booking':'approved_work'};});}
  if(care)components.push({id:'care_onboarding',amount_minor:cents(source.care_variants[variant].onboarding),interval:'once',trigger:'acceptance',waiver:'post_wm_build_or_first_three_intro_production_clients'});
  const entitlements=[];
  if(care)entitlements.push({kind:'care_edits',quantity:source.care_variants[variant].edit_minutes,unit:'minutes',period:'month',rollover_policy:'none'});
  // Count contracted outputs from typed catalog fields, not old marketing counters.
  const snapshot={schema:1,id,variant,name:item.public_name,service_type:type,catalog_version:source.version,currency:'USD',scope,exclusions:item.exclusions||item.v3?.excludes||[],acceptance:item.acceptance||item.v3?.acceptance||[],components,milestones,entitlements,quote_required:total===null,hosting_offset_cap_minor:care?cents(source.care_variants[variant].hosting_offset_cap):0,terms:{delivery:source.delivery_conditions,payment:recurring?source.introductory_terms:milestones.map(m=>m.deliverable+': '+(m.amount_minor/100).toFixed(2)+' USD').join('; '),cancellation:recurring?source.monthly_terms.exit:source.one_off_terms.cancellation,ownership:source.ownership_and_billing,overlap:source.monthly_terms.no_double_billing,onboarding:source.monthly_onboarding_terms,measurement:source.first_cycle_measurement},required_facts:['business_identity','service_goals','approved_claims','primary_contact'],required_access:care?['website','hosting_recovery',...(type==='seo'?['search_console','analytics']:[])]:type==='seo'?['website','search_console','analytics']:type==='web_design'?['domain','website']:[]};
  entries.push(snapshot);
 };
 for(const id of source.build_ids)add(id,source[id],'web_design');
 for(const id of source.specialist_ids)add(id,source[id],id==='storefront'?'web_design':'catalog_project');
 add('website_baseline',source.baseline,'catalog_project');add('audit_fix_sprint',source.audit_sprint,'catalog_project');
 for(const id of source.monthly_ids)for(const [variant,v]of Object.entries(source.plans[id].variants))add(id,source.plans[id],id==='keep_running'?'care':id==='improve'?'catalog_project':'seo',variant,v.price);
 for(const item of [...source.add_ons,...source.quoted_add_ons])add(item.id,item,'catalog_project');
 const a=source.search_ads;
 entries.push({schema:1,id:a.id||'search_ads',variant:'standard',name:a.public_name,service_type:'ads_search',catalog_version:source.version,currency:a.currency,scope:a.scope,exclusions:['Media is billed directly by the advertising provider.'],acceptance:a.coverage,components:[{id:'management',amount_minor:cents(a.monthly_price),interval:'month',trigger:'verified_launch'}],milestones:a.milestones.map(s=>({id:s.id,deliverable:s.id.replaceAll('_',' '),amount_minor:Math.round(cents(a.setup_price)*s.percent/100),acceptance_rule:s.id.replaceAll('_',' '),proof:s.id==='readiness'?'readiness':s.id==='verified_launch'?'verified_launch':'approved_work'})),entitlements:[],quote_required:false,hosting_offset_cap_minor:0,terms:{payment:a.monthly_starts,cancellation:a.cancellation,ownership:a.ownership,measurement:a.measurement},required_facts:['business_identity','service_goals','approved_claims','primary_contact'],required_access:['google_ads','analytics','search_console','landing_page']});
 const keys=new Set(entries.map(x=>x.id+':'+x.variant));if(keys.size!==entries.length)throw Error('Duplicate delivery template');
 for(const service of source.service_menu)if(!entries.some(x=>x.id===service.id))throw Error('Missing delivery template: '+service.id);
 return entries;
}
export const CATALOG=catalogEntries();
