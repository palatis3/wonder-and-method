import pageDates from '../config/page-dates.json' with {type:'json'};
import {inquiryChoices} from '../src/shared.mjs';

const routes=new Map(Object.keys(pageDates).filter(path=>path!=='/404/').map(path=>[path.toLowerCase(),path]));
const aliases=new Map([['/work/content-editor/','/work/source-handoff/'],['/assets/audit-implementation/illustrative-url-map.csv/','/assets/downloads/website-url-map.csv']]);
const buyerPackIds=new Set(inquiryChoices.map(([id])=>id).filter(id=>id!=='unsure'));
function unreserved(path){return path.replace(/%([0-9a-f]{2})/gi,(escape,hex)=>{const character=String.fromCharCode(parseInt(hex,16));return /^[A-Za-z0-9._~-]$/.test(character)?character:escape;});}

// Canonicalize only known public pages. Asset names and unknown routes retain
// their exact path; API requests and mutations never enter a redirect flow.
export function publicRouteRedirect(url,method,publicOrigin){
 if(!['GET','HEAD'].includes(method))return null;
 const decoded=unreserved(url.pathname).replace(/\/{2,}/g,'/');
 if(/^\/api(?:\/|$)/i.test(decoded))return null;
 let lookup=decoded.replace(/\/index(?:\.html)?\/?$/i,'/');
 if(/\.html$/i.test(lookup))lookup=lookup.slice(0,-5);
 if(!lookup.endsWith('/'))lookup+='/';
 // These generated documents have extensionless URLs, unlike page directories.
 // Keep exact asset case and never apply this rule to an unknown filename.
 const pack=url.pathname.match(/^\/assets\/buyer-packs\/([a-z_]+)\/$/);
 const packPath=pack&&buyerPackIds.has(pack[1])?'/assets/buyer-packs/'+pack[1]:null;
 const canonical=packPath||routes.get(lookup.toLowerCase())||aliases.get(lookup.toLowerCase());
 const path=canonical||url.pathname;
 const origin=publicOrigin?new URL(publicOrigin).origin:url.origin;
 return origin!==url.origin||path!==url.pathname?origin+path+url.search:null;
}
