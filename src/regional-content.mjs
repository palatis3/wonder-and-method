import {wiIlGeography,wiIlAreaInventory} from './wi-il-geography.mjs';
import {msAlGeography,msAlAreaInventory} from './ms-al-geography.mjs';
import {georgiaGeography,georgiaAreaInventory} from './georgia-geography.mjs';
import {southCarolinaGeography,southCarolinaAreaInventory} from './south-carolina-geography.mjs';
import {virginiaExpansionGeography,virginiaExpansionAreaInventory} from './virginia-expansion-geography.mjs';
import {michiganDcGeography,michiganDcAreaInventory} from './michigan-dc-geography.mjs';
import {inKyTnNcGeography,inKyTnNcAreaInventory} from './in-ky-tn-nc-geography.mjs';
import {floridaGeography,floridaAreaInventory} from './florida-geography.mjs';
import {serviceStateInfo} from './assets/service-state-info.js';

export const regionalGeography={...virginiaExpansionGeography,...michiganDcGeography,...inKyTnNcGeography,...floridaGeography,...southCarolinaGeography,...georgiaGeography,...msAlGeography,...wiIlGeography};
export const regionalAreaInventory=[...virginiaExpansionAreaInventory,...michiganDcAreaInventory,...inKyTnNcAreaInventory,...floridaAreaInventory,...southCarolinaAreaInventory,...georgiaAreaInventory,...msAlAreaInventory,...wiIlAreaInventory];
// The directory groups verified places within state/district hubs.
// A county does not receive a separate commercial page merely to target its name.
export const regionalProfiles=Object.fromEntries(Object.keys(regionalGeography).map(stateId=>{
 const state=serviceStateInfo.find(item=>item.id===stateId);
 const areas=regionalAreaInventory.filter(area=>area.stateId===stateId).sort((a,b)=>a.name.localeCompare(b.name,'en'));
 return [stateId,areas.map(area=>{
  const geography=regionalGeography[stateId][area.slug];
  if(!geography||!geography.representativePlaces?.length)throw Error('Incomplete area directory: '+stateId+'/'+area.slug);
  return {...area,path:state.path+'#'+area.slug,directoryOnly:true,region:state.name,anchor:geography.representativePlaces[0].name};
 })];
}));
