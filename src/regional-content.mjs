import {wyHiAkGeography,wyHiAkAreaInventory} from './wy-hi-ak-geography.mjs';
import {idMtGeography,idMtAreaInventory} from './id-mt-geography.mjs';
import {coUtPrGeography,coUtPrAreaInventory} from './co-ut-pr-geography.mjs';
import {nvWaGeography,nvWaAreaInventory} from './nv-wa-geography.mjs';
import {azOrGeography,azOrAreaInventory} from './az-or-geography.mjs';
import {caNmGeography,caNmAreaInventory} from './ca-nm-geography.mjs';
import {ndSdGeography,ndSdAreaInventory} from './nd-sd-geography.mjs';
import {ksNeGeography,ksNeAreaInventory} from './ks-ne-geography.mjs';
import {mnOkGeography,mnOkAreaInventory} from './mn-ok-geography.mjs';
import {moIaGeography,moIaAreaInventory} from './mo-ia-geography.mjs';
import {texasGeography,texasAreaInventory} from './texas-geography.mjs';
import {laArGeography,laArAreaInventory} from './la-ar-geography.mjs';
import {wiIlGeography,wiIlAreaInventory} from './wi-il-geography.mjs';
import {msAlGeography,msAlAreaInventory} from './ms-al-geography.mjs';
import {georgiaGeography,georgiaAreaInventory} from './georgia-geography.mjs';
import {southCarolinaGeography,southCarolinaAreaInventory} from './south-carolina-geography.mjs';
import {virginiaExpansionGeography,virginiaExpansionAreaInventory} from './virginia-expansion-geography.mjs';
import {michiganDcGeography,michiganDcAreaInventory} from './michigan-dc-geography.mjs';
import {inKyTnNcGeography,inKyTnNcAreaInventory} from './in-ky-tn-nc-geography.mjs';
import {floridaGeography,floridaAreaInventory} from './florida-geography.mjs';
import {serviceStateInfo} from './assets/service-state-info.js';

export const regionalGeography={...virginiaExpansionGeography,...michiganDcGeography,...inKyTnNcGeography,...floridaGeography,...southCarolinaGeography,...georgiaGeography,...msAlGeography,...wiIlGeography,...laArGeography,...texasGeography,...moIaGeography,...mnOkGeography,...ksNeGeography,...ndSdGeography,...caNmGeography,...azOrGeography,...nvWaGeography,...coUtPrGeography,...idMtGeography,...wyHiAkGeography};
export const regionalAreaInventory=[...virginiaExpansionAreaInventory,...michiganDcAreaInventory,...inKyTnNcAreaInventory,...floridaAreaInventory,...southCarolinaAreaInventory,...georgiaAreaInventory,...msAlAreaInventory,...wiIlAreaInventory,...laArAreaInventory,...texasAreaInventory,...moIaAreaInventory,...mnOkAreaInventory,...ksNeAreaInventory,...ndSdAreaInventory,...caNmAreaInventory,...azOrAreaInventory,...nvWaAreaInventory,...coUtPrAreaInventory,...idMtAreaInventory,...wyHiAkAreaInventory];
// The directory groups verified places within state, district and territory hubs.
// A county does not receive a separate commercial page merely to target its name.
export const regionalProfiles=Object.fromEntries(Object.keys(regionalGeography).map(stateId=>{
 const state=serviceStateInfo.find(item=>item.id===stateId);
 const areas=regionalAreaInventory.filter(area=>area.stateId===stateId).sort((a,b)=>a.name.localeCompare(b.name,'en'));
 return [stateId,areas.map(area=>{
  const geography=regionalGeography[stateId][area.slug];
  // Kalawao has no Census incorporated place or CDP. Its county identity and
  // statistical county subdivision remain valid without inventing a town anchor.
  const noCensusPlaces=stateId==='hawaii'&&area.slug==='kalawao'&&geography?.municipalityDetails?.length===0&&geography?.communities?.length===0;
  if(!geography||(!geography.representativePlaces?.length&&!noCensusPlaces))throw Error('Incomplete area directory: '+stateId+'/'+area.slug);
  return {...area,path:state.path+'#'+area.slug,directoryOnly:true,region:state.name,anchor:geography.representativePlaces[0]?.name||''};
 })];
}));
