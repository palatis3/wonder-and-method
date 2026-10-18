// Shared editorial eligibility; the global release hold remains a separate gate.
export function routeIndexEligible(path){
 // Public editorial and brand imagery can appear in image search. Buyer packs,
 // operational downloads and private flows retain their separate noindex policy.
 if(/^\/assets\/(?:brand|editorial|guides|work|editions|civic-sculpture|county-briefs)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|svg|ico)$/i.test(path))return true;
 let clean;try{clean=decodeURIComponent(path).replace(/\/index\.html$/,'/').replace(/\.html$/,'/');}catch{return false;}
 if(!clean.endsWith('/'))clean+='/';
 return !['/api/','/assets/','/checkout/','/payments/','/privacy/','/terms/','/accessibility/','/work/lead-workbench/','/work/source-handoff/','/work/fieldwork/','/work/northline/','/work/hearthside/','/404/','/version.json/','/.well-known/'].some(prefix=>clean.startsWith(prefix));
}
