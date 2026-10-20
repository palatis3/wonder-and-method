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
 return `<section class="studio-section service-area-links" id="service-areas"><div class="section-heading"><p class="eyebrow">New York, Pennsylvania & Ohio</p><h2>Work together online, wherever your business is based.</h2></div><p>Based in Buffalo, I provide web design, redesigns, SEO and website care online across New York, Pennsylvania and Ohio. Explore a county guide for practical planning, local places and answers that help you choose the work.</p>${serviceStates.map(state=>`<details class="service-disclosure"><summary>Explore ${state.counties.length} ${e(state.name)} county service areas</summary><p>${a(state.path,'Browse '+state.name+' service areas')}</p><div class="coverage-region-grid">${state.regions.map(region=>`<div><h3>${e(region.name)}</h3><ul>${regionCounties(state,region).map(c=>`<li>${a(path(c,state),c.slug==='erie'&&state.id==='new-york'?'Buffalo & Erie County':countyLabel(c))}</li>`).join('')}</ul></div>`).join('')}</div></details>`).join('')}<p>${a('/areas/','Find your state, county or community','text-link')}</p></section>`;
}
function relatedCoverage(c,state=serviceStates[0]){
 const region=state.regions.find(r=>r.slugs.includes(c.slug));
 const neighbors=region?regionCounties(state,region).filter(item=>item.slug!==c.slug):[];
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
 ['Monthly care and SEO',`Keep Running care starts at ${money(o.plans.keep_running.monthly_price)}/month. SEO plans add agreed research, writing and website improvements.`,'/services/website-care/'],
 ['An existing-site problem',`A ${money(o.baseline.one_time_price)} review includes one safe first fix when access allows. The ${money(o.audit_sprint.one_time_price)} Sprint includes up to two agreed fixes in total.`,'/services/website-audit/']
]);

function coverage(c,state=serviceStates[0]){
 const g=state.geography[c.slug];
 const groups=Object.entries(g.municipalities).filter(([,values])=>values.length).map(([label,values])=>`<div><h3>${e(label[0].toUpperCase()+label.slice(1))}</h3>${names(values)}</div>`).join('');
 const communities=g.communities.length?`<div><h3>Communities</h3><p>${state.id==='ohio'?'Census-designated places and documented community names; these are not additional incorporated municipalities.':'Selected neighborhoods and other familiar community names.'}</p><ul class="county-place-list">${g.communities.map(x=>`<li>${e(x.name)}</li>`).join('')}</ul></div>`:'';
 const references=[...new Set([...g.sources,...g.communities.map(x=>x.source)])];
 const labels=g.sourceNames||(state.id==='new-york'?referenceNames[c.slug]:[])||[];
 return `<p>I work online with businesses throughout ${e(c.name)} County. ${e(c.geographyNote)}</p><details class="county-communities"><summary>${g.borough?'View selected neighborhoods':state.id==='pennsylvania'?'View cities, boroughs, townships and communities':state.id==='ohio'?'View cities, villages, townships and communities':'View cities, towns, villages and communities'}</summary><div class="county-directory">${groups}${communities}</div><p>${e(g.directoryNote||(g.borough?'These are selected neighborhood names within New York City, not separate incorporated cities, towns or villages.':'Town and village names may overlap. Community names are not additional incorporated municipalities.'))}</p></details><details class="county-sources"><summary>Official sources for these places</summary><ul>${references.map((url,i)=>`<li>${a(url,(labels[i]||`Official place reference ${i+1}`)+(/\.pdf(?:[?#]|$)|showpublisheddocument|DocumentCenter\/View/i.test(url)?' (PDF)':''))}</li>`).join('')}</ul></details>`;

}

function countyPage(c,o,state=serviceStates[0]){
 const display=c.displayName||`${c.name} County`;
 const body=intro(`${c.region} · ${c.name} County, ${state.name}`,`Web design & SEO in ${display}`,c.lead).replace('</header>',`<p>Website builds from ${money(o.launch_site.public_price)}. <a class="button" href="/contact/?request_kind=question#inquiry">Discuss your ${e(c.name)} County website</a></p></header>`)
 +`<nav class="page-jump county-jump" aria-label="County page topics">${a('#services','Services & cost')}${a('#local-planning','Website planning')}${a('#buyer-task','Local example')}${a('#search-plan','SEO approach')}${a('#coverage','Communities')}${a('#questions','Questions')}</nav>`
 +section('services','Choose the work','Start with the problem you want to solve.',`<span id="search" class="legacy-anchor" aria-hidden="true"></span>`+serviceCards(o)+`<p>${a('/services/website-care/','Monthly website care')} · ${a('/services/seo/','SEO improvements')}</p><p>${a('/pricing/','Compare all prices and what is included')}. Website updates require code changes, checks and publishing.</p>`)
 +section('local-planning',`${c.anchor} website planning`,c.focusTitle,`<div class="county-reading"><p>${e(c.focus)}</p></div><p class="county-example-label">Illustrative planning situations, not local client projects.</p>${cards(c.briefs)}`)
 +'<span id="approach" class="legacy-anchor" aria-hidden="true"></span>'+buyerTask(c,state)
 +section('search-plan',`SEO for ${c.anchor}`,`Help customers find and understand your services.`,`<div class="county-reading"><p>${e(c.search)}</p><p>Research informs the page plan, titles, service explanations and internal links. After publishing, available search impressions, queries and inquiries help decide what to improve next. ${a('/services/seo/','Explore the SEO service')} or ${a('/guides/seo-work-and-reporting/','see how changes and results are reported')}.</p></div>`)
 +section('coverage','Local places',`Businesses across ${c.name} County.`,coverage(c,state))
 +section('questions','Before you inquire','Practical questions.',`<div class="county-faq">${[...(state.id==='pennsylvania'?pennsylvaniaSearchQuestions(c.slug,o):state.id==='ohio'?ohioSearchQuestions(c.slug,o):countySearchQuestions(c.slug,o)),...c.questions,['How will we work together online?','We agree the pages, features, content responsibilities, feedback rounds and available dates in writing. You review the design and working website, approve the agreed version and receive the paid work and operating notes under the project terms.']].map(([q,answer,url,label])=>`<details><summary>${e(q)}</summary><p>${e(answer)}${url?` ${a(url,label)}.`:''}</p></details>`).join('')}</div>`)
 +section('next','Wonder and Method',`Tell me what your ${c.name} County website needs to do.`,`<div class="county-reading"><p>Share the business, current website if you have one, services, customer locations and the problem you want to solve. I will assess the fit and propose a clear next step.</p><p>Wonder and Method is based in Buffalo and works with ${e(c.name)} County businesses online.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your website','button')} ${a('/work/','View studio work','text-link')}</p>${relatedCoverage(c,state)}<p>${a(state.path,'Explore '+state.name+' service areas')} · ${a('/areas/','New York, Pennsylvania & Ohio')}</p></div>`);
 return {path:path(c,state),title:c.title||`Web Design & SEO in ${c.name} County, ${state.abbreviation}`,description:c.description||`Custom web design and scoped SEO for ${c.name} County, ${state.abbreviation}, including ${c.anchor}. Clear services and online collaboration from Buffalo.`,body};
}

function buyerTask(c,state){
 if(state.id==='new-york')return countyBuyerTask(c.slug);
 const task=(state.id==='pennsylvania'?pennsylvaniaBuyerTasks:ohioBuyerTasks)[c.slug];if(!task)throw Error('Missing '+state.name+' buyer task: '+c.slug);
 return `<section class="studio-section county-buyer-task" id="buyer-task"><p class="eyebrow">Illustrative ${e(c.name)} County, ${state.abbreviation} example</p><h2>${e(task.title)}</h2><p>${e(task.scenario)} ${e(task.decision)}</p><p><strong>Useful website change:</strong> ${e(task.output)}</p><p><a href="/assets/county-briefs/${state.id}-${c.slug}.txt" download>Download the planning worksheet (TXT)</a> · <a href="/guides/service-area-pages/">When a separate location page helps</a></p></section>`;
}
function directoryClosing(o){
 return section('scope','Choose what helps','Build, improve or keep it working.',`<p>Websites from ${money(o.launch_site.public_price)} · Care from ${money(o.plans.keep_running.monthly_price)}/month · Reviews from ${money(o.baseline.one_time_price)} — ${a('/pricing/','compare all prices')}.</p>`)
 +section('working','Start with your business','Tell me what the website needs to do.',`<div class="county-reading"><p>Share your services, customers and the problem you want to solve. I agree the work, price and dates before booking. The same online process serves all three states; your scope depends on the work needed. ${a('/process/','See how projects work')}.</p><p>Each county guide pairs official place references with an illustrative website-planning exercise and a downloadable worksheet. These guides explain service reach and planning choices; they do not claim local offices, local client results or measured local demand. ${a('/about/','Meet the Buffalo-based studio')}.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your project','button')}</p></div>`);
}
function statePage(state,o){
 const pa=state.id==='pennsylvania',oh=state.id==='ohio';
 const text=oh?'Plan a clear website for your Ohio business, from the service explanation to a useful inquiry. I work online from Buffalo with agreed scope, direct feedback and a written handoff. Browse your county for planning exercises, local place references and practical questions.':pa?'Plan a custom website, a redesign or useful SEO improvements for your Pennsylvania business. I work online from Buffalo, with clear writing, agreed scope and a direct review process. Find your county for practical examples, local places and questions to ask before starting.':'Wonder and Method is based in Buffalo and works with businesses throughout New York online. Find your county for practical website planning, useful local examples, current service prices and answers to common questions.';
 const body=intro(`All ${state.counties.length} ${state.name} counties`,`Web design & SEO for ${state.name} businesses.`,text)
 +`<p class="county-state-switch">${a('/areas/','Browse all service states')} · ${serviceStates.filter(item=>item.id!==state.id).map(item=>a(item.path,'Explore '+item.name)).join(' · ')}</p>`
 +(pa?section('planning','A useful Pennsylvania website','Make the service and next step clear.',`<div class="county-reading"><p>A Philadelphia appointment page, a Pittsburgh project inquiry and a small-borough shop can need different information. Begin with the customer's task: compare the service, prepare a useful request, confirm where it happens or understand what comes next. The county guides help turn those questions into a practical brief.</p><p>Pennsylvania's local government names include cities, boroughs, townships and the town of Bloomsburg. A mailing or community name may differ from the municipality, and some places cross county lines. Each guide separates official municipality names from selected communities; use the actual address when directions or coverage need precision.</p><p>Keyword research informs the service language and page plan. Smaller community searches can be answered within a useful county guide, while a separate page needs a distinct service, customer question or real evidence. ${a('/guides/service-area-pages/','Decide when a separate location page helps')}.</p></div>`):'')
 +(oh?section('planning','A useful Ohio website','Start with the customer’s decision.',`<div class="county-reading"><p>Someone comparing an appointment in Cleveland, planning a project in Columbus or checking a shop in a small village may need different details before contacting you. Define that task first: understand the offer, check the location, prepare a request or choose the right service. Each county guide turns a specific planning question into an exercise you can use.</p><p>Ohio has cities, villages and townships. Some municipalities extend into more than one county, and a familiar mailing address may not describe a legal boundary. The guides distinguish government names from selected communities. Use an actual address and your own approved service boundaries when explaining directions, travel or delivery.</p><p>Keyword research helps choose understandable service terms, including smaller places where useful. An additional location page needs its own service detail, customer task or evidence. ${a('/guides/service-area-pages/','Plan location pages around useful differences')}.</p></div>`):'')
 +countyDirectory(state)+directoryClosing(o);
 return {path:state.path,title:`${state.name} Web Design & SEO Service Areas`,description:`Web design, redesign, SEO and care across ${state.counties.length} ${state.name} counties. Explore useful county guides and planning worksheets. Online from Buffalo.`,body};
}
export function countyPages(o){
 const hub=intro('New York, Pennsylvania & Ohio','Websites for businesses across three states.','Custom web design, redesigns, SEO and website care, delivered online from Buffalo. Choose your state or search for a county or community to find a practical guide for your business.')
 +serviceStateCards()+countyDirectory()+directoryClosing(o);
 return [{path:'/areas/',title:'New York, Pennsylvania & Ohio Web Design Service Areas',description:'Explore web design and SEO across all 62 New York, 67 Pennsylvania and 88 Ohio counties. Search local communities and read practical planning guides. Online from Buffalo.',body:hub},...serviceStates.map(state=>statePage(state,o)),...countyProfiles.map(c=>countyPage(c,o)),...pennsylvaniaProfiles.map(c=>countyPage(c,o,serviceStates[1])),...ohioProfiles.map(c=>countyPage(c,o,serviceStates[2]))];
}
export const countyServiceArea=route=>{const data=serviceAreaDataForPath(route);return data?{name:data.county.name,state:data.state.name,abbreviation:data.state.abbreviation}:null;};
export const countyServiceName=route=>countyServiceArea(route)?.name;
