// County resources stay available; search focus requires local, distinct proof.
export const countyIndexPolicy={niagara:true,monroe:false,onondaga:false,albany:false,dutchess:false,oneida:false,orange:false,rockland:false,saratoga:false};

export function privateRoute(path){let clean;try{clean=decodeURIComponent(path).replace(/\/index\.html$/,'/').replace(/\.html$/,'/');}catch{return true;}return /^\/(?:api|assets|checkout)(?:\/|$)/.test(clean)||/^\/(?:404|version\.json)(?:\/|$)/.test(clean);}

// Shared editorial eligibility; the global release hold remains a separate gate.
export function routeIndexEligible(path){
 // Public editorial and brand imagery can appear in image search. Buyer packs,
 // operational downloads and private flows retain their separate noindex policy.
 if(/^\/assets\/(?:brand|editorial|guides|work|social|editions|civic-sculpture|county-briefs)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|svg|ico)$/i.test(path))return true;
 let clean;try{clean=decodeURIComponent(path).replace(/\/index\.html$/,'/').replace(/\.html$/,'/');}catch{return false;}
 if(!clean.endsWith('/'))clean+='/';
 const county=clean.match(/^\/areas\/([a-z-]+)-county\/$/);
 if(county&&countyIndexPolicy[county[1]]===false)return false;
 return !['/api/','/assets/','/checkout/','/payments/','/privacy/','/terms/','/accessibility/','/work/lead-workbench/','/work/source-handoff/','/work/fieldwork/','/work/northline/','/work/hearthside/','/404/','/version.json/','/.well-known/'].some(prefix=>clean.startsWith(prefix));
}
