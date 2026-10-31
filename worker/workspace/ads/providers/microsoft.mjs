import {base,node,name,ref,number,id,text,decimal,https,list,fail,request,resolve,prepared,controlReady,binding,subset,reader,normalized,decimalEqual} from './common.mjs';
const P='microsoft_ads',BASE='https://campaign.api.bingads.microsoft.com/CampaignManagement/v13';
// Enumerate the concrete retrieval flags, not the forbidden Targets/Audience
// aliases or reserved/GetLinkedInSegments-only flags. A failed inventory query
// keeps the graph unknown; it is never treated as an empty collection.
export const CAMPAIGN_CRITERIA=['ProductScope','Webpage','Age','DayTime','Gender','Location','Radius','Device','LocationIntent','CustomAudience','InMarketAudience','RemarketingList','CompanyName','JobFunction','JobSeniority','JobTitle','Industry','ProductAudience','SimilarRemarketingList','Store','CombinedList','CustomerList','ImpressionBasedRemarketingList'];
export const GROUP_CRITERIA=['ProductPartition','Webpage','Age','DayTime','Device','Gender','CompanyName','Industry','JobFunction','JobSeniority','Location','LocationIntent','Radius','CustomAudience','InMarketAudience','ProductAudience','RemarketingList','SimilarRemarketingList','CombinedList','HotelGroup','HotelAdvanceBookingWindow','HotelCheckInDay','HotelLengthOfStay','HotelDateSelectionType','HotelCheckInDate','Genre','CustomerList','ImpressionBasedRemarketingList','Placement','Topic','CustomSegment'];
function calendar(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value||value>='2050-01-02')fail('native_schedule','Use a real bounded account-calendar date before 2050-01-02.');
 const [y,m,d]=value.split('-');return {Year:number(y),Month:number(String(Number(m))),Day:number(String(Number(d)))};
}
export function compile(spec,identity){
 const p=base(P,'search-standard-rsa-exact-maxclicks-v1',spec,identity,['daily_budget_major','starts_on','ends_on','language','location_ids','keywords','headlines','descriptions','url']);if(!identity.customer_id)fail('native_binding','The verified Microsoft customer/manager ID is required.');
 const start=calendar(spec.starts_on),end=calendar(spec.ends_on);if(spec.ends_on<spec.starts_on)fail('native_schedule');
 decimal(spec.daily_budget_major);if(spec.language!=='English')fail('native_unsupported','This bounded family currently uses English.');list(spec.location_ids,id);list(spec.keywords,x=>text(x,80),1,20);list(spec.headlines,x=>text(x,30),3,15);list(spec.descriptions,x=>text(x,90),2,4);https(spec.url);
 p.active_status='Active';node(p,'identity','prerequisite',[],null,{read_only:true});
 node(p,'campaign','campaign',['identity'],{Name:name(p,'campaign'),CampaignType:'Search',Status:'Paused',DailyBudget:number(spec.daily_budget_major),BudgetType:'DailyBudgetStandard',Languages:[spec.language],TimeZone:p.timezone,BiddingScheme:{Type:'MaxClicks'}},{status:'Paused',controllable:true});
 for(const [i,location]of spec.location_ids.entries())node(p,'location'+i,'criterion',['identity','campaign'],{Type:'BiddableCampaignCriterion',CampaignId:ref('campaign'),Criterion:{Type:'LocationCriterion',LocationId:number(location)}},{parent:'campaign',inventory:'campaign_criteria',criterion_type:'Location'});
 node(p,'location_intent','criterion',['identity','campaign'],{Type:'BiddableCampaignCriterion',CampaignId:ref('campaign'),Criterion:{Type:'LocationIntentCriterion',IntentOption:'PeopleIn'}},{parent:'campaign',inventory:'campaign_criteria',criterion_type:'LocationIntent'});
 node(p,'group','group',['identity','campaign',...p.steps.filter(x=>x.role==='criterion').map(x=>x.key)],{Name:name(p,'group'),AdGroupType:'SearchStandard',Status:'Paused',StartDate:start,EndDate:end,Network:'OwnedAndOperatedAndSyndicatedSearch'},{parent:'campaign',status:'Paused',controllable:true,inventory:'groups'});
 for(const [i,keyword]of spec.keywords.entries())node(p,'keyword'+i,'keyword',['identity','group'],{Text:keyword,MatchType:'Exact',Status:'Active'},{parent:'group',status:'Active',inventory:'keywords'});
 node(p,'ad','ad',['identity','group',...p.steps.filter(x=>x.role==='keyword').map(x=>x.key)],{Type:'ResponsiveSearch',Status:'Paused',FinalUrls:[spec.url],Headlines:spec.headlines.map(Text=>({Asset:{Type:'TextAsset',Text}})),Descriptions:spec.descriptions.map(Text=>({Asset:{Type:'TextAsset',Text}}))},{parent:'group',status:'Paused',controllable:true,inventory:'ads'});
 p.enable_order=['ad','group','campaign'];p.pause_order=['campaign','group','ad'];p.qualification_required.push('microsoft_v13_official_REST_SDK_polymorphic_wire_fixture','complete_supported_targeting_inventory_and_native_defaults');
 p.limit_semantics={hard_spend_cap:false,kind:'daily_standard',native_unit:'account_currency_major_units',overdelivery:'DailyBudgetStandard is provider-paced; it is not an instantaneous hard cap. Confirm current monthly/overdelivery policy for this account.',max_cpc:'New non-portfolio MaxCpc is unsupported and is never sent.',late_delivery_and_billing_possible:true};return p;
}
function req(p,path,body,write=false,method='POST'){return request(p,BASE+'/'+path,{method,body,write,expect:{serialization_qualification_required:true,ids:'positional IDs, including nulls; PartialErrors indexed by Index',tracking:'TrackingId'}});}
function bodyFor(p,n,bindings){const b=resolve(n.body,p,bindings);if(n.role==='campaign')return {AccountId:number(p.account_id),Campaigns:[b]};if(n.role==='criterion')return {CriterionType:'Targets',CampaignCriterions:[{...b,CampaignId:number(b.CampaignId)}]};if(n.role==='group')return {CampaignId:number(binding(p,'campaign',bindings).id),AdGroups:[b],ReturnInheritedBidStrategyTypes:false};if(n.role==='keyword')return {AdGroupId:number(binding(p,'group',bindings).id),Keywords:[b],ReturnInheritedBidStrategyTypes:true};return {AdGroupId:number(binding(p,'group',bindings).id),Ads:[b]};}
const collection=n=>({campaign:'Campaigns',criterion:'CampaignCriterions',group:'AdGroups',keyword:'Keywords',ad:'Ads'})[n.role];
export function build(p,n,action,bindings){
 if(action==='create'){prepared(p,n,bindings);return req(p,collection(n),bodyFor(p,n,bindings),true);}
 if(action==='update'){
  if(n.key!=='campaign')fail('native_unsupported','Only the declared campaign budget update is supported.');binding(p,'identity',bindings);const b=binding(p,'campaign',bindings);if(b.configured_status!=='Paused')fail('native_parent_hold');return req(p,'Campaigns',{AccountId:number(p.account_id),Campaigns:[{Id:number(id(b.id)),DailyBudget:number(p.spec.daily_budget_major)}]},true,'PUT');
 }
 const b=controlReady(p,n,action,bindings),value={Id:number(id(b.id)),Status:action==='enable'?'Active':'Paused',...(n.role==='ad'?{Type:'ResponsiveSearch'}:{})};
 const body=n.role==='campaign'?{AccountId:number(p.account_id),Campaigns:[value]}:n.role==='group'?{CampaignId:number(binding(p,'campaign',bindings,{verified:false}).id),AdGroups:[value]}:{AdGroupId:number(binding(p,'group',bindings,{verified:false}).id),Ads:[value]};return req(p,collection(n),body,true,'PUT');
}
export async function identityRead(p,call){const data=await reader(call,request(p,'https://clientcenter.api.bingads.microsoft.com/CustomerManagement/v13/Account/Query',{method:'POST',body:{AccountId:number(p.account_id)}})),a=data.Account;if(!a||a.Id!==p.account_id||a.CurrencyCode!==p.currency||a.TimeZone!==p.timezone||!['Active','Pending'].includes(a.AccountLifeCycleStatus))fail('native_account_drift');if(a.AccountLifeCycleStatus!=='Active')fail('native_account_not_ready');return normalized(p,p.steps[0],a,p.account_id,null);}
export async function inventory(p,n,bindings,call){let path,body;
 if(n.role==='campaign'){path='Campaigns/QueryByAccountId';body={AccountId:number(p.account_id),CampaignType:'Search'};}
 else if(n.role==='group'){path='AdGroups/QueryByCampaignId';body={CampaignId:number(binding(p,'campaign',bindings).id),ReturnAdditionalFields:'AdGroupType'};}
 else if(n.role==='ad'){path='Ads/QueryByAdGroupId';body={AdGroupId:number(binding(p,'group',bindings).id),AdTypes:['AppInstall','DynamicSearch','ExpandedText','Hotel','Image','Product','ResponsiveAd','ResponsiveSearch','Text']};}
 else if(n.role==='keyword'){path='Keywords/QueryByAdGroupId';body={AdGroupId:number(binding(p,'group',bindings).id)};}
 else {path='CampaignCriterions/QueryByIds';body={CampaignId:number(binding(p,'campaign',bindings).id),CampaignCriterionIds:null,CriterionType:n.criterion_type};}
 const d=await reader(call,req(p,path,body));const result=d[collection(n)];if(!Array.isArray(result))fail('native_response');return result.filter(x=>x!==null);
}
export async function completeInventories(p,b,call){const campaign=[],group=[];for(const type of CAMPAIGN_CRITERIA){const d=await reader(call,req(p,'CampaignCriterions/QueryByIds',{CampaignId:number(binding(p,'campaign',b).id),CampaignCriterionIds:null,CriterionType:type}));if(!Array.isArray(d.CampaignCriterions))fail('native_response');campaign.push(...d.CampaignCriterions.filter(Boolean));}for(const type of GROUP_CRITERIA){const d=await reader(call,req(p,'AdGroupCriterions/QueryByIds',{AdGroupId:number(binding(p,'group',b).id),AdGroupCriterionIds:null,CriterionType:type}));if(!Array.isArray(d.AdGroupCriterions))fail('native_response');group.push(...d.AdGroupCriterions.filter(Boolean));}return {campaign_criteria:campaign.map(x=>id(x.Id)),unmanaged_group_criteria:group.map(x=>id(x.Id))};}
export function candidate(p,n,value,bindings,action){
 if(typeof value.Id!=='string')return null;id(value.Id);if(value.AccountId!==undefined&&value.AccountId!==p.account_id)return null;
 if(n.parent&&value[n.parent==='campaign'?'CampaignId':'AdGroupId']!==undefined&&value[n.parent==='campaign'?'CampaignId':'AdGroupId']!==binding(p,n.parent,bindings).id)return null;
 let expected=resolve(n.body,p,bindings);if(n.role==='criterion')expected={...expected,CampaignId:number(expected.CampaignId)};
 if(n.controllable)expected={...expected,Status:action==='enable'?'Active':'Paused'};
 const actual={...value};if(n.role==='campaign'){
  if(!['MaxClicks','MaxClicksBiddingScheme'].includes(value.BiddingScheme?.Type)||value.BiddingScheme?.MaxCpc!==undefined&&value.BiddingScheme.MaxCpc!==null||value.BidStrategyId||value.BudgetId||value.Settings?.length)return null;actual.BiddingScheme={Type:'MaxClicks'};
 }
 if(n.role==='group'&&(value.Settings?.length||value.BiddingScheme&&!['InheritFromParent','InheritFromParentBiddingScheme'].includes(value.BiddingScheme.Type)))return null;
 if(n.role==='keyword'&&(value.Bid?.Amount!==undefined&&value.Bid.Amount!==null||value.BiddingScheme&&!['InheritFromParent','InheritFromParentBiddingScheme'].includes(value.BiddingScheme.Type)))return null;
 if(value.TrackingUrlTemplate||value.FinalUrlSuffix||value.UrlCustomParameters?.Parameters?.length||value.FinalMobileUrls?.length||n.role==='keyword'&&value.FinalUrls?.length)return null;
 if(n.role==='ad'&&(value.Path1||value.Path2||[...(value.Headlines??[]),...(value.Descriptions??[])].some(x=>x.PinnedField&&x.PinnedField!=='None')))return null;
 if(!subset(expected,actual))return null;return normalized(p,n,value,value.Id,value.Status);
}
export function extracted(p,n,response){const plural={campaign:'CampaignIds',criterion:'CampaignCriterionIds',group:'AdGroupIds',keyword:'KeywordIds',ad:'AdIds'}[n.role],ids=response?.[plural];if(!Array.isArray(ids)||ids.length!==1||ids[0]===null||response.PartialErrors?.some(e=>String(e.Index)==='0'))return {};id(ids[0]);return {[n.key]:{provider:P,environment:p.environment,account_id:p.account_id,plan_marker:p.marker,step_key:n.key,role:n.role,id:ids[0],verified:false,content_verified:false}};}
