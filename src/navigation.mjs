import {pageDisplayNames} from './display-names.mjs';
import {escapeHtml} from './shared.mjs';
import {serviceStateInfo} from './assets/service-state-info.js';
import {serviceAreaDataForPath,countyAreaName} from './service-area-directory.mjs';
import {locationServiceForPath} from './location-service-index.mjs';

export function breadcrumbTrail(path,title){
 if(path==='/'||path==='/404/')return [];
 const trail=[{path:'/',name:'Home'}];
 if((path.startsWith('/guides/')&&path!=='/guides/')||path.startsWith('/tools/'))trail.push({path:'/guides/',name:'Guides'});
 else if(path.startsWith('/areas/')&&path!=='/areas/'){
  trail.push({path:'/areas/',name:'Service areas'});
  const state=serviceStateInfo.find(item=>path.startsWith(item.path)&&path!==item.path);
  if(state)trail.push({path:state.path,name:state.name});
  else if(/^\/areas\/[^/]+-county\/$/.test(path))trail.push({path:'/areas/new-york/',name:'New York'});
 }
 else if(path.startsWith('/services/')&&path!=='/services/')trail.push({path:'/services/',name:'Services'});
 else if(path.startsWith('/checkout/'))trail.push({path:'/pricing/',name:'Pricing'});
 else if(path.startsWith('/work/')&&path!=='/work/')trail.push({path:'/work/',name:'Work'});
 const concept=path.match(/^\/work\/(fieldwork|northline|hearthside)\/(.+)\/$/);if(concept)trail.push({path:'/work/'+concept[1]+'/',name:concept[1][0].toUpperCase()+concept[1].slice(1)});
 const shortNames={'/tools/website-roi-calculator/':'Website ROI calculator','/work/fieldwork/':'Fieldwork','/work/northline/':'Northline','/work/hearthside/':'Hearthside','/pricing/':'Pricing','/contact/':'Contact','/about/':'About','/process/':'Process','/work/':'Work','/work/lead-workbench/':'Inquiry tracker demo','/work/source-handoff/':'Sample website files','/work/studio-search/':'Website page planning','/work/website-audit/':'Website audit','/privacy/':'Privacy','/terms/':'Website terms','/accessibility/':'Accessibility','/guides/':'Guides','/areas/':'Service areas','/services/website-addons/':'Website add-ons','/services/web-design/':'Web design','/services/website-redesign/':'Website redesign','/services/seo/':'SEO','/services/website-care/':'Website care','/services/website-audit/':'Website reviews & fixes','/services/contractor-websites/':'Contractor websites'};
 const county=path.match(/^\/areas\/(?:[a-z-]+\/)?([a-z-]+)-(county|planning-region)\/$/);
 const stateName=serviceStateInfo.find(state=>state.path===path)?.name;
 const conceptLabel=concept?({landscaping:'Landscaping',remodeling:'Remodeling',menu:'Menu'})[concept[2]]:null;
 const guide=path.match(/^\/guides\/([^/]+)\/$/);
 const checkoutName=path.startsWith('/checkout/')?title.replace(/^Request /,'').replace(/ Website$/,''):null;
 const area=serviceAreaDataForPath(path);
 const countyName=area?countyAreaName(area.county):county?(({'mckean':'McKean','st-lawrence':'St. Lawrence'})[county[1]]||county[1].split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' '))+(county[2]==='planning-region'?' Planning Region':' County'):null;
 const name=checkoutName||stateName||locationServiceForPath(path)?.market||(path==='/services/'?'Services':null)||conceptLabel||pageDisplayNames[path]||shortNames[path]||(guide?title:null)||countyName||title;
 trail.push({path,name});return trail;
}

export function breadcrumbSchema(trail,origin){
 if(trail.length<3)return null;
 return {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:trail.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:origin+item.path}))};
}

export function breadcrumbMarkup(trail){
 if(trail.length<3)return '';
 return `<nav class="breadcrumb" aria-label="Breadcrumb"><a class="breadcrumb-parent" href="${escapeHtml(trail.at(-2).path)}"><span aria-hidden="true">← </span>View ${escapeHtml(trail.at(-2).name)}</a><ol>${trail.map((item,i)=>`<li>${i?'<span class="breadcrumb-separator" aria-hidden="true">/</span>':''}${i===trail.length-1?`<span aria-current="page">${escapeHtml(item.name)}</span>`:`<a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>`}</li>`).join('')}</ol></nav>`;
}

export const backToTopMarkup=()=>'<div class="page-tools"><a class="back-to-top" href="#page-top" aria-label="Back to top"><span class="back-to-top-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m-6 6 6-6 6 6"/></svg></span><span>Back to top</span></a></div>';
