// Editorial pages and portfolio overviews are eligible for search. Pure package
// request forms and fictional detail pages remain usable but are not indexed.
// APIs, operational downloads, runtime metadata and error pages stay excluded.
function normalizedPath(path){try{return decodeURIComponent(path).replace(/\/index\.html$/,'/').replace(/\.html$/,'/');}catch{return null;}}
export function privateRoute(path){const clean=normalizedPath(path);return clean===null||/^\/(?:api|assets|404|version\.json|\.well-known)(?:\/|$)/.test(clean);}

// Shared editorial eligibility; the global release hold remains a separate gate.
export function routeIndexEligible(path){
 // Public editorial and brand imagery can appear in image search. Buyer packs,
 // operational downloads retain their separate noindex policy.
 if(/^\/assets\/(?:brand|editorial|guides|work|social|editions|civic-sculpture|county-briefs)\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|svg|ico)$/i.test(path))return true;
 const clean=normalizedPath(path)?.toLowerCase();
 if(clean===null||/^\/checkout(?:\/|$)/.test(clean)||/^\/work\/(?:fieldwork|northline|hearthside)\/[^/]+(?:\/|$)/.test(clean))return false;
 return !privateRoute(path);
}
