import {countyBuyerTask} from './county-buyer-tasks.mjs';
import {escapeHtml as e,money} from './shared.mjs';
import {countyProfiles} from './county-profiles.mjs';
import {countyGeography} from './county-geography.mjs';
import {countySearchQuestions} from './county-search-questions.mjs';
import {countyRegions} from './county-regions.mjs';
import {serviceStates,countyPath,countyLabel,regionCounties,countyDirectory,serviceStateCards,serviceAreaDataForPath} from './service-area-directory.mjs';
import {pennsylvaniaProfiles,pennsylvaniaBuyerTasks,pennsylvaniaSearchQuestions} from './pennsylvania-content.mjs';
import {ohioProfiles,ohioBuyerTasks,ohioSearchQuestions} from './ohio-content.mjs';
export {countyRegions} from './county-regions.mjs';

const a=(url,label,cls='')=>`<a href="${e(url)}"${cls?` class="${cls}"`:''}>${e(label)}</a>`;
const intro=(label,title,text)=>`<header class="page-intro"><p class="eyebrow">${e(label)}</p><h1>${e(title)}</h1><p class="lede">${e(text)}</p></header>`;
const section=(id,label,title,body)=>`<section class="section county-section" id="${id}"><div class="section-heading"><p class="eyebrow">${e(label)}</p><h2>${e(title)}</h2></div>${body}</section>`;
const path=(c,state=serviceStates[0])=>countyPath(c,state);
const names=values=>`<ul class="county-place-list">${values.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`;
const cards=items=>`<div class="county-cards">${items.map(([title,text,url])=>`<article><h3>${url?a(url,title):e(title)}</h3><p>${e(text)}</p></article>`).join('')}</div>`;
export function serviceAreaLinks(){
 return `<section class="service-area-links" id="service-areas"><p>I work online with businesses across New York, Pennsylvania and Ohio — ${a('/areas/','find your county')}. ${serviceStates.map(state=>a(state.path,state.name)).join(' · ')}</p></section>`;
}
function relatedCoverage(c,state=serviceStates[0]){
 const region=state.regions.find(r=>r.slugs.includes(c.slug));
 const neighbors=region?regionCounties(state,region).filter(item=>item.slug!==c.slug).slice(0,4):[];
 return neighbors.length?`<p><strong>More ${e(region.name)} service areas:</strong> ${neighbors.map(item=>a(path(item,state),countyLabel(item))).join(' · ')}</p>`:'';
}
const referenceNames={
 monroe:['New York State: Monroe County','Monroe County election maps','Perinton comprehensive plan','Webster comprehensive plan'],
 onondaga:['Onondaga County towns and villages','Onondaga County government overview','Brewerton community investment plan','Town of Lysander overview','Town of Onondaga supervisor','New York State water infrastructure plan'],
 orange:['New York State: Orange County','Tuxedo consolidation status memorandum','Tuxedo January 2021 board minutes','Town of Crawford supervisor','Tuxedo comprehensive-plan update','Town of Chester','Southeastern Orange County land-use study'],
 rockland:['Rockland County municipality reference','Rockland County legislative reference','New York State village dissolution records','Orangetown community information','Clarkstown comprehensive plan','Ramapo public planning notice'],
 albany:['Albany County property-tax and municipality reference','New York State: Albany County','New York State village property-tax reference','Bethlehem comprehensive-plan appendix','Colonie community planning summary'],
 dutchess:['Dutchess County municipalities','Dutchess County zoning map','Town of East Fishkill overview','Dover comprehensive plan'],
 saratoga:['New York State: Saratoga County','Saratoga County planning','Saratoga County supervisors','Town of Northumberland','New York State transportation community reference'],
 oneida:['New York State: Oneida County','Trenton May 2024 board minutes','New York State village dissolution records','Town of Trenton history'],
 niagara:['New York State: Niagara County','Niagara County cities, towns and villages','Town of Newfane','Lewiston comprehensive plan']
};
const serviceCards=o=>cards([
 ['A new website',`From ${money(o.launch_site.public_price)}. Clear writing, custom design and your website files. Domain, hosting and paid tools are separate.`,'/services/web-design/'],
 ['Monthly care and SEO',`Care is ${money(o.plans.keep_running.monthly_price)}/month; the first payment is ${money(o.plans.keep_running.monthly_price+o.baseline.one_time_price)} when a new review is needed. If there is no current usable ${o.baseline.public_name}, studio build or ${o.audit_sprint.public_name}, the ${money(o.baseline.one_time_price)} ${o.baseline.public_name} comes first. Improve adds one researched improvement each month; Grow adds two.`,'/services/website-care/'],
 ['Reviews and fixes',`${o.baseline.public_name} (${money(o.baseline.one_time_price)}): a review, a ranked fix list and one small fix if it is safe and practical. ${o.audit_sprint.public_name} (${money(o.audit_sprint.one_time_price)}): the same review plus up to two agreed small fixes in total.`,'/services/website-audit/']
]);

function coverage(c,state=serviceStates[0]){
 const g=state.geography[c.slug];
 const present=Object.entries(g.municipalities).filter(([,values])=>values.length);
 const groups=present.map(([label,values])=>`<div><h3>${e(label[0].toUpperCase()+label.slice(1))}</h3>${names(values)}</div>`).join('');
 const communities=g.communities.length?`<div><h3>${g.borough?'Neighborhoods':'Communities'}</h3><ul class="county-place-list">${g.communities.map(x=>`<li>${e(x.name)}</li>`).join('')}</ul></div>`:'';
 const groupLabels=[...present.map(([label])=>label),...(g.communities.length?[g.borough?'neighborhoods':'communities']:[])];
 const summary='View '+new Intl.ListFormat('en-US',{style:'long',type:'conjunction'}).format(groupLabels);
 const references=[...new Set([...g.sources,...g.communities.map(x=>x.source)])];
 const labels=g.sourceNames||(state.id==='new-york'?referenceNames[c.slug]:[])||[];
 return `<p>${e(c.geographyNote)}</p><details class="county-communities"><summary>${e(summary)}</summary><div class="county-directory">${groups}${communities}</div><p>${e(g.directoryNote||(g.borough?'These are neighborhoods within New York City.':'A town and village may share a name. Communities are listed separately from municipalities.'))}</p></details><details class="county-sources"><summary>Official sources for these places</summary><ul>${references.map((url,i)=>`<li>${a(url,(labels[i]||`Official place reference ${i+1}`)+(/\.pdf(?:[?#]|$)|showpublisheddocument|DocumentCenter\/View/i.test(url)?' (PDF)':''))}</li>`).join('')}</ul></details>`;
}

function countyPage(c,o,state=serviceStates[0]){
 const display=state.geography[c.slug].borough&&c.displayName&&c.displayName!==c.name?`${c.name} County (${c.displayName})`:`${c.name} County`;
 const body=intro(`${c.region} · ${c.name} County, ${state.name}`,`Web design & SEO in ${display}, ${state.abbreviation}`,c.lead).replace('</header>',`<p>Website builds from ${money(o.launch_site.public_price)}. <a class="button" href="/contact/?request_kind=question#inquiry">Discuss your ${e(c.name)} County website</a></p></header>`)
 +`<nav class="page-jump county-jump" aria-label="County page topics">${a('#services','Services & cost')}${a('#local-planning','Website planning')}${a('#buyer-task','Example')}${a('#search-plan','SEO approach')}${a('#coverage','Communities')}${a('#questions','Questions')}</nav>`
 +section('services','Choose the work','Start with the problem you want to solve.',`<span id="search" class="legacy-anchor" aria-hidden="true"></span>`+serviceCards(o)+`<p>${a('/services/website-care/','Monthly website care')} · ${a('/services/seo/','SEO improvements')}</p><p>${a('/pricing/','Compare all prices and what is included')}. After launch, I can make changes through monthly care, or you can use your own developer.</p>`)
 +section('local-planning',`${c.anchor} website planning`,c.focusTitle,`<div class="county-reading"><p>${e(c.focus)}</p></div><p class="county-example-label">The examples below are fictional, not client projects.</p><details class="county-planning-details"><summary>More planning examples</summary>${cards(c.briefs)}</details>`)
 +'<span id="approach" class="legacy-anchor" aria-hidden="true"></span>'+buyerTask(c,state)
 +section('search-plan',`SEO for ${c.anchor}`,`Help customers find and understand your services.`,`<div class="county-reading"><p>${e(c.search)}</p><p>${a('/services/seo/','Explore SEO improvements')} · ${a('/guides/seo-work-and-reporting/','How I report the work')}</p></div>`)
 +section('coverage','Local places',`Businesses across ${c.name} County.`,coverage(c,state))
 +section('questions','Before you inquire','Practical questions.',`<div class="county-faq">${[...(state.id==='pennsylvania'?pennsylvaniaSearchQuestions(c.slug,o):state.id==='ohio'?ohioSearchQuestions(c.slug,o):countySearchQuestions(c.slug,o)),...c.questions].map(([q,answer,url,label])=>`<details><summary>${e(q)}</summary><p>${e(answer)}${url?` ${a(url,label)}.`:''}</p></details>`).join('')}</div>`)
 +section('next','Wonder and Method',`Plan your ${c.name} County website.`,`<div class="county-reading"><p>Share your website, services and the problem you want to solve. I will suggest a useful next step.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your website','button')} ${a('/work/','View studio work','text-link')}</p>${relatedCoverage(c,state)}<p>${a(state.path,'Explore '+state.name+' service areas')} · ${a('/areas/','New York, Pennsylvania & Ohio')}</p></div>`);
 return {path:path(c,state),title:`${display}, ${state.abbreviation} Web Design & SEO`,description:c.description||`${c.name} County, ${state.abbreviation} websites from ${money(o.launch_site.public_price)}, practical SEO and monthly care. Work directly with a Buffalo designer online.`,body};
}

function buyerTask(c,state){
 if(state.id==='new-york')return countyBuyerTask(c.slug);
 const task=(state.id==='pennsylvania'?pennsylvaniaBuyerTasks:ohioBuyerTasks)[c.slug];if(!task)throw Error('Missing '+state.name+' buyer task: '+c.slug);
 return `<section class="studio-section county-buyer-task" id="buyer-task"><p class="eyebrow">Example</p><h2>${e(task.title)}</h2><p>${e(task.scenario)} ${e(task.decision)}</p><p><strong>What to change on your website:</strong> ${e(task.output)}</p><p><a href="/assets/county-briefs/${state.id}-${c.slug}.txt" download>Download the planning worksheet (TXT)</a> · <a href="/guides/service-area-pages/">Plan your own coverage pages</a></p></section>`;
}
function directoryClosing(o){
 return section('scope','Choose what helps','Build, improve or keep it working.',`<p>Websites from ${money(o.launch_site.public_price)} · Care ${money(o.plans.keep_running.monthly_price)}/month (${money(o.plans.keep_running.monthly_price+o.baseline.one_time_price)} first payment if a new review is needed) · Reviews from ${money(o.baseline.one_time_price)} — ${a('/pricing/','compare prices and starting requirements')}.</p>`)
 +section('working','Your next step','Plan a website for your business.',`<div class="county-reading"><p>Share your services and what you need to change. I agree the work, price and dates before booking. ${a('/process/','See the project steps')}.</p><p>Each county page includes local places, planning examples and a worksheet. Want to know who you would work with? ${a('/about/','Meet the Buffalo-based studio')}.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your project','button')}</p></div>`);
}
function statePage(state,o){
 const text=`I design websites, improve search visibility and provide monthly website care for ${state.name} businesses. Work with me online from Buffalo. Search for your county or open a region below.`;
 const body=intro(`All ${state.counties.length} ${state.name} counties`,`Web design & SEO for ${state.name} businesses.`,text)
 +`<p class="county-state-switch">${a('/areas/','Browse all service states')} · ${serviceStates.filter(item=>item.id!==state.id).map(item=>a(item.path,'Explore '+item.name)).join(' · ')}</p>`
 +'<span id="planning" class="legacy-anchor" aria-hidden="true"></span>'+countyDirectory(state)+directoryClosing(o);
 return {path:state.path,title:`${state.name} Web Design & SEO`,description:`Web design, SEO and website care across ${state.counties.length} ${state.name} counties. Find your county and work directly with a Buffalo designer online.`,body};
}
export function countyPages(o){
 const hub=intro('New York, Pennsylvania & Ohio','Websites for businesses across three states.','Custom web design, redesigns, SEO and website care, delivered online from Buffalo. Choose your state or search for a county or community to find your county.')
 +serviceStateCards()+countyDirectory()+directoryClosing(o);
 return [{path:'/areas/',title:'Web Design Across NY, PA & Ohio',description:'Web design and SEO for small businesses in 217 New York, Pennsylvania and Ohio counties. Find your county. Online from Buffalo.',body:hub},...serviceStates.map(state=>statePage(state,o)),...countyProfiles.map(c=>countyPage(c,o)),...pennsylvaniaProfiles.map(c=>countyPage(c,o,serviceStates[1])),...ohioProfiles.map(c=>countyPage(c,o,serviceStates[2]))];
}
export const countyServiceArea=route=>{const data=serviceAreaDataForPath(route);return data?{name:data.county.name,state:data.state.name,abbreviation:data.state.abbreviation}:null;};
export const countyServiceName=route=>countyServiceArea(route)?.name;
