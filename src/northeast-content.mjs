import {northeastGeography as firstGeography,northeastAreaInventory as firstAreaInventory} from './northeast-geography.mjs';
import {northernExpansionGeography,northernExpansionAreaInventory} from './northern-expansion-geography.mjs';
import {newJerseyRows} from './northeast-profiles-new-jersey.mjs';
import {connecticutRows} from './northeast-profiles-connecticut.mjs';
import {rhodeIslandRows} from './northeast-profiles-rhode-island.mjs';
import {massachusettsRows} from './northeast-profiles-massachusetts.mjs';
import {delawareRows} from './northeast-profiles-delaware.mjs';
import {vermontRows} from './northeast-profiles-vermont.mjs';
import {newHampshireRows} from './northern-profiles-new-hampshire.mjs';
import {maineRows} from './northern-profiles-maine.mjs';
import {marylandRows} from './northern-profiles-maryland.mjs';
const northeastGeography={...firstGeography,...northernExpansionGeography};
const northeastAreaInventory=[...firstAreaInventory,...northernExpansionAreaInventory];
const areaName=area=>area.areaType==='Independent City'?`${area.name} City`:`${area.name} ${area.areaType}`;

// The scenarios and adapted questions are editorial guidance, not claims about local clients.
// Exact research-query provenance and local inventories are retained in the private project ledger.
const stateNames={
 'new-jersey':['New Jersey','NJ'],connecticut:['Connecticut','CT'],
 'rhode-island':['Rhode Island','RI'],massachusetts:['Massachusetts','MA'],
 delaware:['Delaware','DE'],vermont:['Vermont','VT'],
 'new-hampshire':['New Hampshire','NH'],maine:['Maine','ME'],maryland:['Maryland','MD']
};
const authoredRows={
 'new-jersey':newJerseyRows,connecticut:connecticutRows,
 'rhode-island':rhodeIslandRows,massachusetts:massachusettsRows,
 delaware:delawareRows,vermont:vermontRows,
 'new-hampshire':newHampshireRows,maine:maineRows,maryland:marylandRows
};
const guideLinks={
 approach:['/guides/custom-website-or-template/','Compare website approaches'],
 maintenance:['/guides/website-maintenance-checklist/','Use the maintenance checklist'],
 migration:['/guides/website-migration-checklist/','Review the migration checklist'],
 handoff:['/work/source-handoff/','Review the source handoff'],
 ownership:['/work/source-handoff/','Review the source handoff'],
 cost:['/guides/website-project-cost/','Plan the website project budget'],
 seo:['/services/seo/','Explore SEO improvements'],
 design:['/services/web-design/','Review website design services'],
 brief:['/guides/website-redesign-brief/','Prepare a redesign brief'],
 repair:['/guides/website-repair-or-redesign/','Compare repair and redesign'],
 areas:['/guides/service-area-pages/','Plan useful service-area pages']
};
const list=values=>values.length<2?values.join(''):values.slice(0,-1).join(', ')+' and '+values.at(-1);
const placeDescription=place=>place.type==='Census-designated place'?`${place.name} is a Census-designated community`:`${place.name} is a ${place.type.toLowerCase()}`;
function geographyNote(stateId,area,g){
 if(area.areaType==='Independent City')return 'Baltimore City is an independent city and a Census county equivalent in Maryland. It is separate from Baltimore County. Use the full city or county designation when it affects an address, service boundary or appointment destination.';
 if(stateId==='connecticut')return `${area.name} Planning Region is one of Connecticut’s nine current Census county-equivalent planning regions. ${list(g.representativePlaces.slice(0,3).map(x=>x.name))} are included in its directory. Providers confirm their own service coverage and the exact destination when arranging work.`;
 const descriptions=g.representativePlaces.slice(0,2).map(placeDescription);
 const shared=Object.entries(g.municipalities).flatMap(([type,names])=>names.filter(name=>Object.entries(g.municipalities).some(([other,values])=>other!==type&&values.includes(name))).map(name=>({name,type})));
 const duplicateNames=[...new Set(shared.map(x=>x.name))];
 const distinction=duplicateNames.length?` ${list(duplicateNames.slice(0,2))} ${duplicateNames.length===1?'appears':'appear'} in more than one municipal category; use the actual address when a destination matters.`:'';
 return descriptions.join('; ')+` in ${area.name} County, ${stateNames[stateId][0]}.`+distinction;
}
const orderedRows=Object.fromEntries(Object.entries(authoredRows).map(([stateId,rows])=>{
 const bySlug=new Map(rows.map(row=>[row.id,row]));
 if(bySlug.size!==rows.length)throw new Error('Duplicate northeast editorial slug: '+stateId);
 const areas=northeastAreaInventory.filter(area=>area.stateId===stateId).sort((a,b)=>a.name.localeCompare(b.name,'en'));
 if(rows.length!==areas.length)throw new Error('Incomplete northeast editorial inventory: '+stateId);
 return [stateId,areas.map(area=>{
  const row=bySlug.get(area.slug);if(!row)throw new Error('Missing northeast editorial row: '+stateId+'/'+area.slug);
  if(row.briefs.length!==2||row.local.length!==2||row.faqs.length!==3||row.task[2].length!==3)throw new Error('Invalid northeast editorial structure: '+stateId+'/'+area.slug);
  for(const faq of row.faqs)if(!guideLinks[faq[3]])throw new Error('Unknown northeast FAQ guide: '+faq[3]);
  return {area,row};
 })];
}));
export const northeastProfiles=Object.fromEntries(Object.entries(orderedRows).map(([stateId,entries])=>[stateId,entries.map(({area,row})=>{
 const g=northeastGeography[stateId][area.slug];
 const [stateName,abbreviation]=stateNames[stateId];
 const anchor=g.representativePlaces[0].name;
 return {
  slug:area.slug,name:area.name,areaType:area.areaType,region:stateName,anchor,
  displayName:anchor===area.name?areaName(area):`${anchor} & ${areaName(area)}`,
  places:list(g.representativePlaces.map(place=>place.name)),
  title:`${areaName(area)}, ${abbreviation} Web Design & SEO`,
  description:`Web design and SEO for ${areaName(area)}, ${abbreviation}. ${row.title.replace(/\.$/,'')}.`,
  lead:`I design websites and improve search visibility for businesses in ${areaName(area)}${area.areaType==='Independent City'?'':`, including ${anchor}`}. Work directly with me online from Buffalo. This guide includes a practical planning exercise for your website.`,
  focusTitle:row.title,focus:row.focus,briefs:row.briefs,search:row.search,
  geographyNote:geographyNote(stateId,area,g),
  questions:[...row.local,[`Can we work together online from ${anchor}?`,`Yes. I work with ${stateName} businesses online from Buffalo. We agree on the pages, content, features, price and review steps before booking. You supply and approve business facts; shared drafts and clear feedback support the work without requiring a local office or an in-person meeting.`]]
 };
})]));
export const northeastBuyerTasks=Object.fromEntries(Object.entries(orderedRows).map(([stateId,entries])=>[stateId,Object.fromEntries(entries.map(({area,row})=>[area.slug,{
 name:area.name,title:row.task[0],scenario:row.briefs[0][1],decision:row.task[1],questions:row.task[2],output:row.task[3],check:row.task[4]
}]))]));

// The offers argument preserves the shared interface. Price answers link to current pricing guidance;
// no copied numeric price or research metric is embedded in these editorial rows.
export function northeastSearchQuestions(stateId,slug,offers){
 const row=orderedRows[stateId]?.find(entry=>entry.area.slug===slug)?.row;
 return (row?.faqs||[]).map(([question,answer,,guideKey])=>[question,answer,...guideLinks[guideKey]]);
}
export function northeastQuestionSources(offers){
 return Object.entries(orderedRows).flatMap(([stateId,entries])=>entries.flatMap(({area,row})=>row.faqs.map(([question,,sourceQuery,guideKey],index)=>({
  stateId,slug:area.slug,index:index+1,question,sourceQuery,guide:guideLinks[guideKey][0],provenanceType:'editorial'
 }))));
}
