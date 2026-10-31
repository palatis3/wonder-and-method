import {WorkspaceError,canonical,digest} from '../../../src/workspace/domain/contracts.mjs';
import {providerFetch} from '../http.mjs';
import {readBounded,sha256} from '../files/content.mjs';
export const REPORT_PROFILES=Object.freeze({
 ga_daily_v1:{provider:'analytics',dimensions:['date'],metrics:['sessions','engagedSessions','activeUsers','eventCount','keyEvents']},
 ga_acquisition_daily_v1:{provider:'analytics',dimensions:['date','sessionDefaultChannelGroup'],metrics:['sessions','engagedSessions','keyEvents']},
 ga_landing_daily_v1:{provider:'analytics',dimensions:['date','landingPage'],metrics:['sessions','engagedSessions','keyEvents']},
 ga_events_daily_v1:{provider:'analytics',dimensions:['date','eventName'],metrics:['eventCount','keyEvents']},
 ga_revenue_daily_v1:{provider:'analytics',dimensions:['date'],metrics:['totalRevenue']},
 sc_daily_total_v1:{provider:'search_console',dimensions:['date'],metrics:['clicks','impressions','ctr','position'],aggregation:'byProperty'},
 sc_daily_pages_v1:{provider:'search_console',dimensions:['date','page'],metrics:['clicks','impressions','ctr','position'],aggregation:'auto'},
 sc_daily_queries_v1:{provider:'search_console',dimensions:['date','query'],metrics:['clicks','impressions','ctr','position'],aggregation:'byProperty'},
 sc_daily_device_v1:{provider:'search_console',dimensions:['date','device'],metrics:['clicks','impressions','ctr','position'],aggregation:'byProperty'},
});
const fail=(code='analytics_schema')=>{throw new WorkspaceError(code,'This reporting read could not be validated. The last published results are unchanged.',409);};
export function dateOnly(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail('analytics_date');return value;}
export function calendarShift(day,days){dateOnly(day);if(!Number.isInteger(days)||Math.abs(days)>370)fail('analytics_date');const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function zonedDayBoundary(day,zone){
 dateOnly(day);let formatter;try{formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});}catch{fail('analytics_timezone');}
 const target=Date.parse(day+'T00:00:00Z');let value=target;
 for(let i=0;i<5;i++){
  const parts=Object.fromEntries(formatter.formatToParts(value).map(p=>[p.type,p.value]));
  const wall=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));
  const delta=target-wall;if(delta===0)return new Date(value).toISOString();value+=delta;
 }fail('analytics_calendar_boundary');
}
export function exactDecimal(value,{integer=false}={}){
 if(typeof value!=='string'||value.length>160||!/^[-+]?(?:\d+)(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(value))fail('analytics_metric_value');
 const match=value.match(/^([-+]?)(\d+)(?:\.(\d+))?(?:[eE]([-+]?\d+))?$/),exp=Number(match[4]||0);if(!Number.isSafeInteger(exp)||Math.abs(exp)>100)fail('analytics_metric_value');
 const raw=match[2]+(match[3]||''),point=match[2].length+exp;let result=point<=0?'0.'+'0'.repeat(-point)+raw:point>=raw.length?raw+'0'.repeat(point-raw.length):raw.slice(0,point)+'.'+raw.slice(point);
 let [whole,fraction='']=result.split('.');whole=whole.replace(/^0+(?=\d)/,'');fraction=fraction.replace(/0+$/,'');if(integer&&fraction)fail('analytics_metric_value');result=whole+(fraction?'.'+fraction:'');return match[1]==='-'&&result!=='0'?'-'+result:result;
}
function numericJson(raw){
 // Preserve provider numeric lexemes before JavaScript can round large integers
 // or decimal values. JSON strings remain untouched, including quoted numbers.
 return JSON.parse(raw.replace(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,t=>t.startsWith('"')?t:JSON.stringify(t)));
}
export async function reportingRead(url,token,{data,fetcher=fetch,record=async()=>{},authorize=async()=>{}}={}){
 const u=new URL(url);if(u.protocol!=='https:'||u.port||u.username||u.password||!['analyticsadmin.googleapis.com','analyticsdata.googleapis.com','www.googleapis.com','searchconsole.googleapis.com'].includes(u.hostname)||typeof token!=='string'||token.length<10)fail('analytics_destination');
 await authorize();const started_at=new Date().toISOString(),response=await providerFetch(u.href,{method:data?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})},fetcher);
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(await readBounded(response.body,8388608));let parsed;try{parsed=numericJson(raw);}catch{fail('analytics_response');}
 if(!response.ok||parsed.error){const message=canonical(parsed),code=response.status===401?'analytics_auth_expired':response.status===429||/RESOURCE_EXHAUSTED|quota|rateLimitExceeded|userRateLimitExceeded/i.test(message)?'analytics_quota_deferred':response.status===403&&/SERVICE_DISABLED|accessNotConfigured/i.test(message)?'analytics_api_disabled':response.status===403?'analytics_permission_denied':'analytics_provider_error';await record({url:u.href,request:data||null,started_at,observed_at:new Date().toISOString(),http_status:response.status,raw,raw_hash:await sha256(new TextEncoder().encode(raw)),outcome:code,retry_after:response.headers.get('retry-after')});fail(code);}
 await record({url:u.href,request:data||null,started_at,observed_at:new Date().toISOString(),http_status:response.status,raw,raw_hash:await sha256(new TextEncoder().encode(raw)),outcome:'success'});return parsed;
}
function profile(binding,name){const p=REPORT_PROFILES[name];if(!p||p.provider!==binding.provider)fail('analytics_profile');return p;}
function gaScope(binding,name){
 if(!/^properties\/\d+$/.test(binding.account_id)||!Array.isArray(binding.stream_ids)||!binding.stream_ids.length||binding.stream_ids.some(x=>typeof x!=='string'||!/^\d+$/.test(x))||!Array.isArray(binding.hostnames)||!binding.hostnames.length||binding.hostnames.some(x=>typeof x!=='string'||!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(x)))fail('analytics_scope');
 const exact=(fieldName,values)=>({filter:{fieldName,inListFilter:{values:[...new Set(values)].sort(),caseSensitive:true}}}),expressions=[exact('streamId',binding.stream_ids),exact('hostName',binding.hostnames)];
 if(name==='ga_events_daily_v1'){if(!Array.isArray(binding.event_names)||!binding.event_names.length||binding.event_names.some(x=>typeof x!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(x)))fail('analytics_event_scope');expressions.push(exact('eventName',binding.event_names));}
 return {andGroup:{expressions}};
}
function scSite(binding){const site=binding.account_id;if(typeof site!=='string'||site.length>500)fail('analytics_scope');if(site.startsWith('sc-domain:')){if(!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(site.slice(10)))fail('analytics_scope');}else{let u;try{u=new URL(site);}catch{fail('analytics_scope');}if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.href!==site)fail('analytics_scope');}return site;}
const integer=(x,max=1000000)=>{if(typeof x!=='string'||!/^\d+$/.test(x)||!Number.isSafeInteger(Number(x))||Number(x)>max)fail();return Number(x);};
const same=(a,b)=>canonical(a)===canonical(b);
const scopeDefinition=b=>({provider:b.provider,account_id:b.account_id,currency:b.currency??null,timezone:b.timezone,stream_ids:b.stream_ids||[],hostnames:b.hostnames||[],event_names:b.event_names||[]});
const scopeKey=async b=>b.scope_key||await digest(scopeDefinition(b));
async function gaDefinitions(binding,p,name,read){
 const metadata=await read(`https://analyticsdata.googleapis.com/v1beta/${binding.account_id}/metadata`),dimensionFilter=gaScope(binding,name),dimensions=p.dimensions.map(name=>({name})),metrics=p.metrics.map(name=>({name}));
 const definitions=p.metrics.map(metric=>{const def=metadata.metrics?.find(m=>m.apiName===metric);if(!def)fail('analytics_metric_unavailable');return def;}),dimensionDefinitions=p.dimensions.map(dimension=>{const def=metadata.dimensions?.find(d=>d.apiName===dimension);if(!def)fail('analytics_dimension_unavailable');return def;});
 const compatibility=await read(`https://analyticsdata.googleapis.com/v1beta/${binding.account_id}:checkCompatibility`,{dimensions,metrics,dimensionFilter});
 if(p.metrics.some(m=>!compatibility.metricCompatibilities?.some(x=>x.metricMetadata?.apiName===m&&x.compatibility==='COMPATIBLE'))||p.dimensions.some(d=>!compatibility.dimensionCompatibilities?.some(x=>x.dimensionMetadata?.apiName===d&&x.compatibility==='COMPATIBLE')))fail('analytics_profile_incompatible');
 return {definitions,dimensionDefinitions,dimensionFilter,dimensions,metrics};
}
function gaAccess(contract,result,binding,p){
 if(!same(result.dimensionHeaders?.map(x=>x.name),p.dimensions)||!same(result.metricHeaders?.map(x=>x.name),p.metrics)||result.metricHeaders.some((x,i)=>x.type!==contract.definitions[i].type)||result.metadata?.timeZone!==binding.timezone||result.metadata?.currencyCode!==binding.currency)fail('analytics_profile_access_changed');
 const restrictions=(result.metadata.schemaRestrictionResponse?.activeMetricRestrictions||[]).map(x=>({...x,restrictedMetricTypes:[...(x.restrictedMetricTypes||[])].sort()})).sort((a,b)=>String(a.metricName).localeCompare(String(b.metricName)));
 return {metric_definitions:contract.definitions,dimension_definitions:contract.dimensionDefinitions,metric_headers:result.metricHeaders,restrictions,currency:result.metadata.currencyCode,timezone:result.metadata.timeZone};
}
export async function verifyAnalyticsProfileAccess(binding,token,{profile:name,start,...options}){
 const p=profile(binding,name);dateOnly(start);const read=(url,data)=>reportingRead(url,token,{...options,data}),admin=await verifyAnalyticsBinding(binding,token,options);let access;
 if(p.provider==='analytics'){
  const contract=await gaDefinitions(binding,p,name,read),probe=await read(`https://analyticsdata.googleapis.com/v1beta/${binding.account_id}:runReport`,{dateRanges:[{startDate:start,endDate:start}],dimensions:contract.dimensions,metrics:contract.metrics,dimensionFilter:contract.dimensionFilter,orderBys:p.dimensions.map(dimensionName=>({dimension:{dimensionName,orderType:'ALPHANUMERIC'},desc:false})),offset:'0',limit:'1',keepEmptyRows:true,returnPropertyQuota:true});access=gaAccess(contract,probe,binding,p);
 }else{
  const response=await read(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(scSite(binding))}/searchAnalytics/query`,{startDate:start,endDate:start,dimensions:p.dimensions,type:'web',aggregationType:p.aggregation,dataState:'final',rowLimit:1,startRow:0});
  const aggregation=({BY_PROPERTY:'byProperty',BY_PAGE:'byPage',AUTO:'auto'})[response.responseAggregationType]||response.responseAggregationType||null;
  if(response.rows!==undefined&&!Array.isArray(response.rows)||response.rows?.some(r=>r.keys?.length!==p.dimensions.length)||aggregation!==null&&!['byProperty','byPage','auto'].includes(aggregation)||p.aggregation==='byProperty'&&aggregation!==null&&aggregation!=='byProperty')fail('analytics_profile_access_changed');
  access={aggregation};
 }
 const configuration={admin,access,scope_key:await scopeKey(binding),profile:name};return {configuration,configuration_hash:await digest(configuration)};
}
async function listGa(read,account,collection){
 const rows=[],seen=new Set();let cursor;
 for(let page=0;page<25;page++){const result=await read(`https://analyticsadmin.googleapis.com/v1beta/${account}/${collection}?pageSize=200${cursor?'&pageToken='+encodeURIComponent(cursor):''}`);if(!Array.isArray(result[collection]||[]))fail();rows.push(...result[collection]||[]);if(!result.nextPageToken)return rows;if(typeof result.nextPageToken!=='string'||seen.has(result.nextPageToken))fail('analytics_pagination');cursor=result.nextPageToken;seen.add(cursor);}fail('analytics_pagination');
}
export async function verifyAnalyticsBinding(binding,token,options={}){
 const read=(url,data)=>reportingRead(url,token,{...options,data});
 if(binding.provider==='analytics'){
  gaScope(binding,'ga_daily_v1');const property=await read(`https://analyticsadmin.googleapis.com/v1beta/${binding.account_id}`);
  if(property.name!==binding.account_id||property.deleteTime||property.currencyCode!==binding.currency||property.timeZone!==binding.timezone)fail('analytics_configuration_changed');
  const streams=await listGa(read,binding.account_id,'dataStreams');if(binding.stream_ids.some(id=>!streams.some(s=>s.name===binding.account_id+'/dataStreams/'+id&&s.type==='WEB_DATA_STREAM')))fail('analytics_stream_changed');
  return {property,streams:streams.sort((a,b)=>String(a.name).localeCompare(String(b.name))),key_events:(await listGa(read,binding.account_id,'keyEvents')).sort((a,b)=>String(a.name).localeCompare(String(b.name)))};
 }
 if(binding.provider==='search_console'){
  const site=scSite(binding),result=await read('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(site));if(result.siteUrl!==site||!['siteOwner','siteFullUser','siteRestrictedUser'].includes(result.permissionLevel))fail('analytics_permission_denied');
  if(binding.timezone!=='America/Los_Angeles')fail('analytics_configuration_changed');return {site:result};
 }fail('analytics_profile');
}
function qualityGa(meta){
 const flags=['non_atomic_observation'];if(meta.dataLossFromOtherRow===true)flags.push('aggregated_other');if(meta.subjectToThresholding===true)flags.push('thresholded');if(meta.samplingMetadatas?.length)flags.push('sampled');if(meta.dataTruncationReasons?.length)flags.push('truncated');if(meta.schemaRestrictionResponse?.activeMetricRestrictions?.length)flags.push('restricted');
 const known=['dataLossFromOtherRow','subjectToThresholding','samplingMetadatas','schemaRestrictionResponse','currencyCode','timeZone','emptyReason','dataTruncationReasons'];if(Object.keys(meta).some(k=>!known.includes(k)))flags.push('unrecognized_metadata');return flags;
}
export function searchFreshness(meta={}){
 const output={};for(const [target,keys]of [['first_incomplete_date',['firstIncompleteDate','first_incomplete_date']],['first_incomplete_hour',['firstIncompleteHour','first_incomplete_hour']]]){const values=keys.map(k=>meta[k]).filter(x=>x!==undefined);if(values.length===2&&values[0]!==values[1])fail('analytics_freshness_conflict');output[target]=values[0]??null;}return output;
}
export async function fetchAnalyticsProfile(binding,token,{profile:name,start,end=start,...options}){
 const p=profile(binding,name);dateOnly(start);dateOnly(end);if(start!==end)fail('analytics_daily_partition');
 const read=(url,data)=>reportingRead(url,token,{...options,data}),before=await verifyAnalyticsBinding(binding,token,options),rows=[],seen=new Set(),quality=new Set(),page_metadata=[],page_manifest=[];
 let collected=0,keyBytes=0,responseAggregation=null,profileAccess;
 const unique=key=>{if(seen.has(key))fail('analytics_duplicate_or_foreign_row');keyBytes+=new TextEncoder().encode(key).length;if(keyBytes>8388608)fail('analytics_dimension_budget');seen.add(key);};
 const keep=async(page,values)=>{collected+=values.length;const hash=await digest(values);page_manifest.push({page,rows:values.length,normalized_hash:hash});await options.normalizedPage?.({page,rows:values,normalized_hash:hash});rows.push(...values.slice(0,Math.max(0,500-rows.length)));};
 let currency=binding.currency,timezone=binding.timezone,collection='complete_api_result',freshness='provisional';
 if(p.provider==='analytics'){
  const contract=await gaDefinitions(binding,p,name,read),scope=contract.dimensionFilter,dims=contract.dimensions,metrics=contract.metrics,definitions=contract.definitions;
  let expectedCount,headers;
  for(let page=0;page<25;page++){
   const result=await read(`https://analyticsdata.googleapis.com/v1beta/${binding.account_id}:runReport`,{dateRanges:[{startDate:start,endDate:end}],dimensions:dims,metrics,dimensionFilter:scope,orderBys:p.dimensions.map(dimensionName=>({dimension:{dimensionName,orderType:'ALPHANUMERIC'},desc:false})),offset:String(collected),limit:'10000',keepEmptyRows:true,returnPropertyQuota:true});
   const count=integer(result.rowCount??'0',200000);if(expectedCount!==undefined&&count!==expectedCount)fail('analytics_unsteady_pages');expectedCount=count;
   if(!same(result.dimensionHeaders?.map(x=>x.name),p.dimensions)||!same(result.metricHeaders?.map(x=>x.name),p.metrics)||headers&&!same(headers,result.metricHeaders))fail('analytics_headers_changed');headers=result.metricHeaders;
   const meta=result.metadata||{};if(meta.timeZone!==binding.timezone||meta.currencyCode!==binding.currency)fail('analytics_configuration_changed');page_metadata.push(meta);qualityGa(meta).forEach(x=>quality.add(x));
   const currentAccess=gaAccess(contract,result,binding,p);if(profileAccess&&!same(profileAccess,currentAccess))fail('analytics_profile_access_changed');profileAccess=currentAccess;
   const records=result.rows||[],normalized=[];if(!Array.isArray(records)||records.length>10000||!records.length&&collected<count)fail('analytics_incomplete_pages');
   for(const row of records){
    if(row.dimensionValues?.length!==p.dimensions.length||row.metricValues?.length!==p.metrics.length||row.dimensionValues.some(x=>typeof x.value!=='string'))fail('analytics_row_shape');
    const dimensions=row.dimensionValues.map(x=>x.value),key=canonical(dimensions);if(dimensions[0]!==start.replaceAll('-',''))fail('analytics_duplicate_or_foreign_row');unique(key);
    const values={};for(let i=0;i<p.metrics.length;i++){
     const metric=p.metrics[i],header=headers[i],def=definitions[i],restrictions=meta.schemaRestrictionResponse?.activeMetricRestrictions||[],blocked=(def.blockedReasons?.length||0)>0||restrictions.some(x=>x.metricName===metric&&x.restrictedMetricTypes?.length);
     if(!['TYPE_INTEGER','TYPE_FLOAT','TYPE_CURRENCY','TYPE_SECONDS','TYPE_MILLISECONDS','TYPE_MINUTES','TYPE_HOURS','TYPE_METERS','TYPE_KILOMETERS','TYPE_FEET','TYPE_MILES'].includes(header.type)||def.type!==header.type)fail('analytics_metric_type');
     const raw=row.metricValues[i]?.value;if(typeof raw!=='string')fail('analytics_metric_value');const exact=exactDecimal(raw,{integer:header.type==='TYPE_INTEGER'});if(blocked)quality.add('restricted');values[metric]={raw,value:blocked?null:exact,state:blocked?'unavailable_restricted':exact==='0'?'observed_zero':'observed_number',type:header.type,blocked_reasons:def.blockedReasons||[]};
    }normalized.push({dimensions,values});
   }
   await keep(page,normalized);if(collected>count)fail('analytics_unsteady_pages');if(collected===count)break;if(page===24)fail('analytics_incomplete_pages');
  }
  if(collected!==expectedCount)fail('analytics_incomplete_pages');collection='non_atomic_observation';
 }else{
  const site=scSite(binding),metaSeen=[];let terminal=false,aggregation;
  for(let page=0;page<4;page++){
   const result=await read(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,{startDate:start,endDate:end,dimensions:p.dimensions,type:'web',aggregationType:p.aggregation,dataState:'final',rowLimit:25000,startRow:page*25000});
   const meta=result.metadata||{},f=searchFreshness(meta);metaSeen.push(f);page_metadata.push(meta);const records=result.rows||[],normalized=[];if(!Array.isArray(records)||records.length>25000)fail('analytics_row_shape');
   const actual=({BY_PROPERTY:'byProperty',BY_PAGE:'byPage',AUTO:'auto'})[result.responseAggregationType]||result.responseAggregationType;if(actual!==undefined&&(!['byProperty','byPage','auto'].includes(actual)||aggregation&&actual!==aggregation||p.aggregation==='byProperty'&&actual!=='byProperty')||actual===undefined&&records.length)fail('analytics_aggregation_changed');if(actual!==undefined)aggregation=actual;
   if(!records.length){await keep(page,[]);terminal=true;break;}
   for(const row of records){if(!Array.isArray(row.keys)||row.keys.length!==p.dimensions.length||row.keys.some(x=>typeof x!=='string')||row.keys[0]!==start)fail('analytics_row_shape');const key=canonical(row.keys);unique(key);const values={};for(const metric of p.metrics){const exact=exactDecimal(row[metric],{integer:['clicks','impressions'].includes(metric)});if(exact.startsWith('-')||metric==='ctr'&&Number(exact)>1)fail('analytics_metric_value');values[metric]={raw:row[metric],value:exact,state:exact==='0'?'observed_zero':'observed_number',type:['clicks','impressions'].includes(metric)?'count':metric==='ctr'?'fraction':'position'};}normalized.push({dimensions:row.keys,values});}
   await keep(page,normalized);if(collected>50000)fail('analytics_incomplete_pages');
  }
  if(!terminal)fail('analytics_incomplete_pages');if(metaSeen.some(m=>m.first_incomplete_date&&start>=m.first_incomplete_date))freshness='provisional';else freshness='provider_final';
  quality.add('top_rows');quality.add('privacy_omissions');quality.add('non_atomic_observation');collection='complete_exposed_result';timezone='America/Los_Angeles';currency=null;responseAggregation=aggregation??null;profileAccess={aggregation:responseAggregation};if(!aggregation)quality.add('aggregation_not_supplied');
 }
 const after=await verifyAnalyticsBinding(binding,token,options);if(!same(before,after))fail('analytics_configuration_changed');
 const key=await scopeKey(binding),configuration={admin:before,access:profileAccess,scope_key:key,profile:name};
 const result={schema:1,adapter:'google-read-v1',api_version:p.provider==='analytics'?'data-v1beta/admin-v1beta':'searchconsole-v1/webmasters-v3',profile:name,provider:p.provider,account_id:binding.account_id,start,end,currency,timezone,scope_key:key,scope_definition:scopeDefinition(binding),configuration,configuration_hash:await digest(configuration),page_metadata,page_manifest,response_aggregation:responseAggregation,quality:[...quality].sort(),collection,freshness,value_state:collected?'observed_rows':'no_reported_row',row_count:collected,preview_rows:rows,observed_at:new Date().toISOString()};return {...result,digest:await digest(result)};
}
export async function inspectAnalyticsUrl(binding,token,url,options={}){
 if(binding.provider!=='search_console')fail('analytics_profile');const site=scSite(binding);let page;try{page=new URL(url);}catch{fail('analytics_scope');}
 const contained=site.startsWith('sc-domain:')?page.hostname===site.slice(10)||page.hostname.endsWith('.'+site.slice(10)):page.href.startsWith(site);
 if(!['https:','http:'].includes(page.protocol)||page.username||page.password||page.hash||page.port||!contained)fail('analytics_scope');
 const before=await verifyAnalyticsBinding(binding,token,options),result=await reportingRead('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',token,{...options,data:{inspectionUrl:page.href,siteUrl:site,languageCode:'en-US'}});
 if(!result.inspectionResult||!same(before,await verifyAnalyticsBinding(binding,token,options)))fail('analytics_inspection_changed');const captured={schema:1,url:page.href,site,scope_key:await scopeKey(binding),scope_definition:scopeDefinition(binding),configuration:before,configuration_hash:await digest(before),observed_at:new Date().toISOString(),indexed_version_only:true,live_test:false,result:result.inspectionResult};return {...captured,digest:await digest(captured)};
}
