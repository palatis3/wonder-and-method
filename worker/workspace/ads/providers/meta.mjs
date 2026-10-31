import {base,node,name,ref,number,id,text,decimal,https,list,schedule,fail,request,resolve,prepared,controlReady,binding,subset,canonical,unnumber,reader,pages,safeCursor,normalized,outcome} from './common.mjs';
const P='meta_ads',BASE='https://graph.facebook.com/v25.0';
export function compile(spec,identity){
 const p=base(P,'website-traffic-non-special-image-feed-v1',spec,identity,['daily_budget_minor','starts_at','ends_at','countries','page_id','instagram_user_id','image_hash','image_sha256','rights_evidence','copy','headline','description','url','special_category']);
 decimal(spec.daily_budget_minor,{integer:true});schedule(spec.starts_at,spec.ends_at);list(spec.countries,x=>{if(x!=='US')fail('native_unsupported','This family currently supports US targeting only.');return x;},1,1);
 id(spec.page_id);id(spec.instagram_user_id);if(!/^[a-f0-9]{32}$/.test(spec.image_hash)||!/^[a-f0-9]{64}$/.test(spec.image_sha256)||spec.special_category!=='NONE')fail('native_unsupported');text(spec.rights_evidence,1000);text(spec.copy);text(spec.headline,80);text(spec.description,100);https(spec.url);
 p.active_status='ACTIVE';node(p,'identity','prerequisite',[],null,{read_only:true});
 node(p,'campaign','campaign',['identity'],{name:name(p,'campaign'),objective:'OUTCOME_TRAFFIC',buying_type:'AUCTION',status:'PAUSED',special_ad_categories:[],is_adset_budget_sharing_enabled:false},{status:'PAUSED',controllable:true});
 node(p,'adset','adset',['identity','campaign'],{name:name(p,'adset'),campaign_id:ref('campaign'),status:'PAUSED',daily_budget:spec.daily_budget_minor,billing_event:'IMPRESSIONS',optimization_goal:'LINK_CLICKS',bid_strategy:'LOWEST_COST_WITHOUT_CAP',destination_type:'WEBSITE',start_time:spec.starts_at,end_time:spec.ends_at,targeting:{geo_locations:{countries:spec.countries},age_min:number('18'),age_max:number('65'),publisher_platforms:['facebook','instagram'],facebook_positions:['feed'],instagram_positions:['stream']}},{parent:'campaign',status:'PAUSED',controllable:true,inventory:'adsets'});
 node(p,'creative','creative',['identity','campaign','adset'],{name:name(p,'creative'),object_story_spec:{page_id:spec.page_id,instagram_user_id:spec.instagram_user_id,link_data:{message:spec.copy,name:spec.headline,description:spec.description,link:spec.url,image_hash:spec.image_hash,call_to_action:{type:'LEARN_MORE',value:{link:spec.url}}}}});
 node(p,'ad','ad',['identity','adset','creative'],{name:name(p,'ad'),adset_id:ref('adset'),creative:{creative_id:ref('creative')},status:'PAUSED'},{parent:'adset',status:'PAUSED',controllable:true,inventory:'ads'});
 p.enable_order=['ad','adset','campaign'];p.pause_order=['campaign','adset','ad'];p.limit_semantics={hard_spend_cap:false,budget_owner:'adset',native_unit:'account_currency_subunits',kind:'average_daily',overdelivery:'Native daily pacing may exceed the daily target. No universal 100-subunit assumption or instantaneous cap.',geo_semantics:'US country targeting; provider location-presence semantics require qualification.',late_delivery_and_billing_possible:true};p.qualification_required.push('v25_exact_targeting_defaults_page_and_instagram_ad_permissions','native_image_hash_matches_separately_verified_approved_bytes');return p;
}
export function build(p,n,action,bindings){
 if(action==='create'){prepared(p,n,bindings);return request(p,`${BASE}/act_${p.account_id}/${{campaign:'campaigns',adset:'adsets',creative:'adcreatives',ad:'ads'}[n.role]}`,{method:'POST',body:resolve(n.body,p,bindings),form:true,write:true,expect:{id:'body.id',success_statuses:['200'],no_create_retry:true}});}
 if(action==='update'){if(n.key!=='adset')fail('native_unsupported','Only the declared ad-set budget update is supported.');binding(p,'identity',bindings);if(binding(p,'campaign',bindings).configured_status!=='PAUSED')fail('native_parent_hold');const b=binding(p,n.key,bindings);return request(p,`${BASE}/${id(b.id)}`,{method:'POST',body:{daily_budget:p.spec.daily_budget_minor},form:true,write:true,expect:{success:'body.success === true'}});}
 const b=controlReady(p,n,action,bindings);return request(p,`${BASE}/${id(b.id)}`,{method:'POST',body:{status:action==='enable'?'ACTIVE':'PAUSED'},form:true,write:true,expect:{success:'body.success === true'}});
}
function get(p,path,params={}){const u=new URL(BASE+'/'+path);for(const [k,v]of Object.entries(params))u.searchParams.set(k,typeof v==='object'?JSON.stringify(v):v);return request(p,u.href);}
async function edge(p,path,fields,call,extra={}){const make=after=>get(p,path,{fields,limit:'100',...extra,...(after?{after:safeCursor(after)}:{})});return pages(call,make(),{items:d=>d.data,next:d=>d.paging?.next?d.paging?.cursors?.after||fail('native_pagination'):null,requestNext:make});}
export async function identityRead(p,call){
 const a=await reader(call,get(p,'act_'+p.account_id,{fields:'id,account_id,account_status,currency,timezone_name'}));
 if(a.account_id!==p.account_id||a.currency!==p.currency||a.timezone_name!==p.timezone||!['1',1].includes(a.account_status))fail('native_account_drift');
 const pagesList=await edge(p,'act_'+p.account_id+'/promote_pages','id',call),igs=await edge(p,'act_'+p.account_id+'/instagram_accounts','id',call),images=await edge(p,'act_'+p.account_id+'/adimages','hash,status',call,{hashes:JSON.stringify([p.spec.image_hash])});
 const page=await reader(call,get(p,p.spec.page_id,{fields:'id,instagram_business_account'}));
 if(!pagesList.some(x=>x.id===p.spec.page_id)||!igs.some(x=>x.id===p.spec.instagram_user_id)||page.id!==p.spec.page_id||page.instagram_business_account?.id!==p.spec.instagram_user_id||images.filter(x=>x.hash===p.spec.image_hash&&x.status==='ACTIVE').length!==1)fail('native_asset_rights');
 return normalized(p,p.steps[0],{account:a,page,image_hash:p.spec.image_hash,approved_bytes_sha256:p.spec.image_sha256,rights_evidence:p.spec.rights_evidence},p.account_id,null);
}
const selections={campaign:'id,account_id,name,objective,buying_type,status,effective_status,special_ad_categories,is_adset_budget_sharing_enabled,daily_budget,lifetime_budget',adset:'id,account_id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,billing_event,optimization_goal,bid_strategy,destination_type,start_time,end_time,targeting',creative:'id,account_id,name,object_story_spec,effective_object_story_id,instagram_user_id,image_hash,status,url_tags,asset_feed_spec',ad:'id,account_id,name,campaign_id,adset_id,status,effective_status,creative,issues_info'};
export async function inventory(p,n,bindings,call){const path=n.role==='campaign'?`act_${p.account_id}/campaigns`:n.role==='adset'?`${binding(p,'campaign',bindings).id}/adsets`:n.role==='ad'?`${binding(p,'adset',bindings).id}/ads`:`act_${p.account_id}/adcreatives`;return edge(p,path,selections[n.role],call);}
export function candidate(p,n,value,bindings,action){
 if(typeof value.id!=='string'||value.account_id!==p.account_id)return null;id(value.id);let expected=resolve(n.body,p,bindings);if(n.controllable)expected={...expected,status:action==='enable'?'ACTIVE':'PAUSED'};
 const native={...value};if(n.role==='ad')native.creative={creative_id:value.creative?.id};
 if(n.role==='adset'){
  if(canonical(unnumber(expected.targeting))!==canonical(value.targeting)||value.lifetime_budget&&value.lifetime_budget!=='0')return null;
  // RFC3339 offsets may be rendered differently for the same instant.
  if(Date.parse(value.start_time)!==Date.parse(expected.start_time)||Date.parse(value.end_time)!==Date.parse(expected.end_time))return null;native.start_time=expected.start_time;native.end_time=expected.end_time;
 }
 if(n.role==='campaign'&&(value.daily_budget&&value.daily_budget!=='0'||value.lifetime_budget&&value.lifetime_budget!=='0'))return null;
 if(n.role==='creative'&&!new RegExp(`^${p.spec.page_id}_[1-9][0-9]*$`).test(value.effective_object_story_id||''))return null;
 if(n.role==='creative'&&(value.url_tags||value.asset_feed_spec&&Object.keys(value.asset_feed_spec).length))return null;
 if(!subset(expected,native))return null;
 if(n.role==='ad'&&value.campaign_id!==binding(p,'campaign',bindings).id)return null;
 return normalized(p,n,value,value.id,value.status);
}
export function extracted(p,n,response){if(typeof response?.id!=='string')return {};id(response.id);return {[n.key]:{provider:P,environment:p.environment,account_id:p.account_id,plan_marker:p.marker,step_key:n.key,role:n.role,id:response.id,verified:false,content_verified:false}};}
