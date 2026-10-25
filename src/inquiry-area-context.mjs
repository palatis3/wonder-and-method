import {countyContextOptions as legacyOptions} from './approved-rerun-county-context.mjs';
import additionalOptions from './location-inquiry-contexts.json' with {type:'json'};

// A public page of origin, never an asserted business address. Legacy keys stay
// valid for saved inquiries and existing links, including retired-page aliases.
export const serviceAreaContextOptions=[...legacyOptions,...additionalOptions];
const keys=new Set(serviceAreaContextOptions.map(([key])=>key));
if(keys.size!==serviceAreaContextOptions.length)throw Error('Duplicate service-area inquiry context');
export function serviceAreaQuestionHref(path){
 const key=path.startsWith('/areas/')&&path.endsWith('/')?path.slice('/areas/'.length,-1):'';
 if(!keys.has(key))throw Error('Unknown service-area question path: '+path);
 return '/contact/?'+new URLSearchParams({offer:'unsure',request_kind:'question',county:key}).toString()+'#inquiry';
}
