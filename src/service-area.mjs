import siteConfig from '../config/site.json' with {type:'json'};

// Delivery reach is distinct from the local search focus in search-content.mjs.
// Change these facts in config/site.json; publish new area pages only when useful.
export function serviceCoverage(config=siteConfig){
  const {base,region,country}=config.serviceCoverage??siteConfig.serviceCoverage;
  if(!base||!region||!country)throw new Error('Service coverage needs a base, region and country.');
  return {base,region,country,statement:`Based in ${base}, serving businesses across ${region} online.`,areaServed:{'@type':'AdministrativeArea',name:`${region}, ${country}`}};
}
