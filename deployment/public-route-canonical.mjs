import pageDates from '../config/page-dates.json' with {type:'json'};
import {inquiryChoices} from '../src/shared.mjs';
import {retiredCountyRoutes} from './retired-county-routes.mjs';

const retired=new Map(Object.entries(retiredCountyRoutes));
const routes=new Map(Object.keys(pageDates).filter(path=>path!=='/404/'&&!retired.has(path)).map(path=>[path.toLowerCase(),path]));
const aliases=new Map([['/work/content-editor/','/work/source-handoff/'],['/assets/audit-implementation/illustrative-url-map.csv/','/assets/downloads/website-url-map.csv']]);
for(const path of [...routes.values(),...retired.keys()])if(/^\/areas\/[^/]+-county\/$/.test(path))aliases.set(path.replace('/areas/','/areas/new-york/'),retired.get(path)||path);
const buyerPackIds=new Set([...inquiryChoices.map(([id])=>id).filter(id=>id!=='unsure'),'website-addons']);
function unreserved(path){return path.replace(/%([0-9a-f]{2})/gi,(escape,hex)=>{const character=String.fromCharCode(parseInt(hex,16));return /^[A-Za-z0-9._~-]$/.test(character)?character:escape;});}

// Canonicalize only known public pages. Asset names and unknown routes retain
// their exact path; API requests and mutations never enter a redirect flow.
export function publicRouteRedirect(url,method,publicOrigin){
 if(!['GET','HEAD'].includes(method))return null;
 const decoded=unreserved(url.pathname).replace(/\/{2,}/g,'/');
 if(/^\/api(?:\/|$)/i.test(decoded))return null;
 let lookup=decoded.replace(/\/index(?:\.html)?\/?$/i,'/');
 lookup=lookup.replace(/\.html\/?$/i,'/');
 if(!lookup.endsWith('/'))lookup+='/';
 // These generated documents have extensionless URLs, unlike page directories.
 // Keep exact asset case and never apply this rule to an unknown filename.
 const pack=url.pathname.match(/^\/assets\/buyer-packs\/([a-z_-]+)\/$/);
 const packPath=url.pathname==='/assets/buyer-packs/website-addons.html'?'/assets/buyer-packs/website-addons':pack&&buyerPackIds.has(pack[1])?'/assets/buyer-packs/'+pack[1]:null;
 const canonical=packPath||retired.get(lookup.toLowerCase())||routes.get(lookup.toLowerCase())||aliases.get(lookup.toLowerCase());
 const path=canonical||url.pathname;
 const origin=publicOrigin?new URL(publicOrigin).origin:url.origin;
 // The destination fragment replaces any obsolete section bookmark. Keep the
 // original query verbatim before it so inquiry/campaign parameters still work.
 const [pathname,fragment]=path.split('#');
 return origin!==url.origin||path!==url.pathname?origin+pathname+url.search+(fragment?'#'+fragment:''):null;
}
