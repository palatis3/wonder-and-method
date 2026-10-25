import pageDates from '../config/page-dates.json' with {type:'json'};
import {locationServices} from '../src/location-service-index.mjs';
import {retiredCountyRoutes} from './retired-county-routes.mjs';
import {journeyPageKey} from '../src/journey-page-key.mjs';
import {serviceStateInfo} from '../src/assets/service-state-info.js';

// This is the checkout's reviewed route inventory, not a probe of production.
// A shared commercial page is counted once, even when it serves several areas.
const states=new Map(serviceStateInfo.map(state=>[state.id,state.abbreviation]));
const currentPaths=new Set(Object.keys(pageDates).filter(path=>!Object.hasOwn(retiredCountyRoutes,path)));
const areaRecords=[...locationServices,{path:'/areas/erie-county/',areaIds:['new-york/erie']}];
export const countyMeasurementCatalog=[...new Map(areaRecords.filter(record=>currentPaths.has(record.path)).map(record=>{
 const areaStates=[...new Set(record.areaIds.map(id=>states.get(id.split('/')[0])))];
 if(areaStates.length!==1||!areaStates[0])throw Error('Measurement area needs one known state: '+record.path);
 return [record.path,{path:record.path,page:journeyPageKey(record.path),state:areaStates[0]}];
})).values()];
const countyPaths=new Set(countyMeasurementCatalog.map(record=>record.path));
const typeForPath=path=>countyPaths.has(path)?'County and equivalent-area services'
 :path==='/'?'Home':path==='/pricing/'?'Pricing'
 :path==='/guides/'||path.startsWith('/guides/')?'Guides'
 :path==='/services/'||path.startsWith('/services/')?'Services'
 :path==='/areas/'||path.startsWith('/areas/')?'Service-area directories and hubs'
 :path==='/work/'||path.startsWith('/work/')?'Work and concepts'
 :path==='/contact/'?'Contact':path.startsWith('/checkout/')?'Checkout'
 :['/privacy/','/terms/','/accessibility/'].includes(path)?'Policies and accessibility'
 :path==='/404/'?'Page not found':'Other current pages';
const types=new Map();
for(const path of currentPaths){
 const key=journeyPageKey(path),type=typeForPath(path);
 if(types.has(key)&&types.get(key)!==type)throw Error('Measurement key spans page types: '+key);
 types.set(key,type);
}
export const retiredMeasurementCatalog=Object.keys(retiredCountyRoutes).filter(path=>!currentPaths.has(path)).map(path=>({path,page:journeyPageKey(path)}));
const retiredKeys=new Set(retiredMeasurementCatalog.map(row=>row.page));
export const measurementPageType=key=>types.get(key)||(retiredKeys.has(key)?'Retired county pages':'Unclassified recorded keys');

export function measurementTypeTotals(rows){
 const totals=new Map();
 for(const row of rows){
  const type=measurementPageType(row.page),entry=totals.get(type)||{type,pageViews:0,otherEvents:0};
  entry[row.event==='page_view'?'pageViews':'otherEvents']+=Number(row.total);totals.set(type,entry);
 }
 return [...totals.values()].sort((a,b)=>b.pageViews-a.pageViews||a.type.localeCompare(b.type));
}
