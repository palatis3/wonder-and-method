import siteConfig from '../config/site.json' with {type:'json'};
import {serviceRegionSummary} from './assets/service-state-info.js';

// Delivery reach is distinct from the local search focus in search-content.mjs.
// Change these facts in config/site.json; publish new area pages only when useful.
export function serviceCoverage(config=siteConfig){
  const coverage=config.serviceCoverage??siteConfig.serviceCoverage;
  const {base,country}=coverage;
  const regions=coverage.regions??[coverage.region];
  if(!base||!country||!Array.isArray(regions)||!regions.length||regions.some(region=>typeof region!=='string'||!region.trim()))throw new Error('Service coverage needs a base, region and country.');
  const region=new Intl.ListFormat('en-US',{style:'long',type:'conjunction'}).format(regions);
  const areas=regions.map(name=>({'@type':'AdministrativeArea',name:`${name}, ${country}`}));
  return {base,region,regions,shortRegion:serviceRegionSummary(regions),country,statement:`Based in ${base}, serving businesses across ${region} online.`,areaServed:areas.length===1?areas[0]:areas};
}
