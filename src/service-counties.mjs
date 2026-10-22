import {countyBuyerTask} from './county-buyer-tasks.mjs';
import {escapeHtml as e,money} from './shared.mjs';
import {countyProfiles} from './county-profiles.mjs';
import {countyGeography} from './county-geography.mjs';
import {countySearchQuestions} from './county-search-questions.mjs';
import {countyRegions} from './county-regions.mjs';
import {serviceStates,countyPath,countyLabel,countyAreaName,regionCounties,countyDirectory,serviceStateCards,serviceAreaDataForPath} from './service-area-directory.mjs';
import {pennsylvaniaProfiles,pennsylvaniaBuyerTasks,pennsylvaniaSearchQuestions} from './pennsylvania-content.mjs';
import {ohioProfiles,ohioBuyerTasks,ohioSearchQuestions} from './ohio-content.mjs';
import {northeastProfiles,northeastBuyerTasks,northeastSearchQuestions} from './northeast-content.mjs';
export {countyRegions} from './county-regions.mjs';

const areaName=countyAreaName;
const a=(url,label,cls='')=>`<a href="${e(url)}"${cls?` class="${cls}"`:''}>${e(label)}</a>`;
const intro=(label,title,text)=>`<header class="page-intro"><p class="eyebrow">${e(label)}</p><h1>${e(title)}</h1><p class="lede">${e(text)}</p></header>`;
const section=(id,label,title,body)=>`<section class="section county-section" id="${id}"><div class="section-heading"><p class="eyebrow">${e(label)}</p><h2>${e(title)}</h2></div>${body}</section>`;
const path=(c,state=serviceStates[0])=>countyPath(c,state);
const names=values=>`<ul class="county-place-list">${values.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`;
const cards=items=>`<div class="county-cards">${items.map(([title,text,url])=>`<article><h3>${url?a(url,title):e(title)}</h3><p>${e(text)}</p></article>`).join('')}</div>`;
export function serviceAreaLinks(){
 return `<section class="service-area-links" id="service-areas"><p>I work online with businesses across ${serviceStates.length} states — ${a('/areas/','find your service area')}. ${serviceStates.map(state=>a(state.path,state.name)).join(' · ')}</p></section>`;
}
function relatedCoverage(c,state=serviceStates[0]){
 const region=state.regions.find(r=>r.slugs.includes(c.slug));
 const regional=region?regionCounties(state,region):[],current=regional.findIndex(item=>item.slug===c.slug);
 const neighbors=regional.length>1?Array.from({length:Math.min(4,regional.length-1)},(_,index)=>regional[(current+index+1)%regional.length]):[];
 return neighbors.length?`<p><strong>More ${state.areaPlural} in ${e(state.name)}:</strong> ${neighbors.map(item=>a(path(item,state),countyLabel(item))).join(' · ')}</p>`:'';
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
 niagara:['New York State: Niagara County','Niagara County cities, towns and villages','Town of Newfane','Town of Lewiston: Sanborn community']
};
export const countyServiceCards=o=>cards([
 ['A new or redesigned website',`Launch ${money(o.launch_site.public_price)} / up to ${o.launch_site.marketing_page_cap} pages; Focused ${money(o.focused_site.public_price)} / ${o.focused_site.marketing_page_cap}; Signature ${money(o.signature_site.public_price)} / ${o.signature_site.marketing_page_cap}.`,'/services/web-design/'],
 ['Monthly plans',`Keep Running ${money(o.plans.keep_running.monthly_price)}/month for care; Improve ${money(o.plans.improve.monthly_price)} for care and one researched improvement; Grow ${money(o.plans.grow.monthly_price)} for care and two related improvements.`,'/pricing/#after-launch'],
 ['Reviews and fixes',`${o.baseline.public_name} ${money(o.baseline.one_time_price)}: review, fix list and one small fix if it is safe and practical. ${o.audit_sprint.public_name} ${money(o.audit_sprint.one_time_price)}: review and up to two agreed fixes total.`,'/services/website-audit/']
])+`<p>New websites include the starting review. An existing website may need a ${money(o.baseline.one_time_price)} Website Baseline for up to ${o.baseline.page_cap} agreed main pages, listed before payment; larger reviews are quoted separately. I check whether a previous Baseline, studio build or Sprint still provides a current usable review, so it is not charged twice. With a new review, monthly first payments are Keep Running ${money(o.plans.keep_running.monthly_price+o.baseline.one_time_price)}, Improve ${money(o.plans.improve.monthly_price+o.baseline.one_time_price)}, or Grow ${money(o.plans.grow.monthly_price+o.baseline.one_time_price)}; otherwise the monthly price.</p><ul class="link-row"><li>${a('/services/website-redesign/','Redesign an existing site')}</li><li>${a('/services/website-care/','Care and its limits')}</li><li>${a('/services/seo/','Monthly SEO')}</li><li>${a('/pricing/','All prices and payment terms')}</li></ul><p>Domain, hosting, paid tools, tax and approved extras cost separately.</p>`;


function coverage(c,state=serviceStates[0]){
 const g=state.geography[c.slug];
 const present=Object.entries(g.municipalities).filter(([,values])=>values.length);
 const groups=present.map(([label,values])=>`<div><h3>${e(label==='other'?'Municipalities':label[0].toUpperCase()+label.slice(1))}</h3>${names(values)}</div>`).join('');
 const communities=g.communities.length?`<div><h3>${g.borough?'Neighborhoods':'Communities'}</h3><ul class="county-place-list">${g.communities.map(x=>`<li>${e(x.name)}${x.type?` <span>(${e(x.type)})</span>`:''}</li>`).join('')}</ul></div>`:'';
 const groupLabels=[...present.map(([label])=>label==='other'?'municipalities':label),...(g.communities.length?[g.borough?'neighborhoods':'communities']:[])];
 const summary='View '+new Intl.ListFormat('en-US',{style:'long',type:'conjunction'}).format(groupLabels);
 const references=[...new Set([...g.sources,...g.communities.map(x=>x.source)].filter(url=>typeof url==='string'&&/^https?:\/\//.test(url)))];
 const labels=g.sourceNames||(state.id==='new-york'?referenceNames[c.slug]:[])||[];
 return `<p>I work online across ${e(areaName(c))}. Use the place name your customers know; the directory below distinguishes shared names.</p><details class="county-communities"><summary>${e(summary)}</summary><p>${e(c.geographyNote)}</p><div class="county-directory">${groups}${communities}</div><p>${e(g.directoryNote||(g.borough?'These are neighborhoods within New York City.':'A town and village may share a name. Communities are listed separately from municipalities.'))}</p></details><details class="county-sources"><summary>Official sources for these places</summary><ul>${references.map((url,i)=>`<li>${a(url,(labels[i]||`Official place reference ${i+1}`)+(/\.pdf(?:[?#]|$)|showpublisheddocument|DocumentCenter\/View/i.test(url)?' (PDF)':''))}</li>`).join('')}</ul></details>`;
}

function countyPage(c,o,state=serviceStates[0]){
 const display=state.geography[c.slug].borough&&c.displayName&&c.displayName!==c.name?`${c.name} County (${c.displayName})`:areaName(c);
 const countyContext=path(c,state).replace(/^\/areas\//,'').replace(/\/$/,'');
 const inquiry='/contact/?county='+encodeURIComponent(countyContext)+'&request_kind=question#inquiry';
 const body=intro(`${c.region} · ${areaName(c)}, ${state.name}`,`Web design & SEO in ${display}, ${state.abbreviation}`,c.lead).replace('</header>',`<p>Online service from Buffalo. Website builds from ${money(o.launch_site.public_price)}. <a class="button" href="${e(inquiry)}">Discuss your website</a></p></header>`)
 +`<nav class="page-jump county-jump" aria-label="Service area page topics">${a('#services','Services & cost')}${a('#local-planning','Website planning')}${a('#buyer-task','Example')}${a('#search-plan','SEO approach')}${a('#coverage','Communities')}${a('#questions','Questions')}</nav>`
 +section('services','Choose the work','Start with the problem you want to solve.',`<span id="search" class="legacy-anchor" aria-hidden="true"></span>`+countyServiceCards(o))
 +section('local-planning',`${c.anchor} website planning`,c.focusTitle,`<div class="county-reading"><p>${e(c.focus)}</p></div><details class="county-planning-details"><summary>More planning examples (made up)</summary>${cards(c.briefs)}</details>`)
 +'<span id="approach" class="legacy-anchor" aria-hidden="true"></span>'+buyerTask(c,state)
 +section('search-plan',`SEO for ${c.anchor}`,`Help customers find and understand your services.`,`<div class="county-reading"><p>${e(c.search)}</p><p>${a('/services/seo/','Explore SEO improvements')} · ${a('/guides/seo-work-and-reporting/','How I report the work')}</p></div>`)
 +section('coverage','Local places',`Businesses across ${areaName(c)}.`,coverage(c,state))
 +section('questions','Before you inquire','Practical questions.',`<div class="county-faq">${[...(state.id==='pennsylvania'?pennsylvaniaSearchQuestions(c.slug,o):state.id==='ohio'?ohioSearchQuestions(c.slug,o):state.id==='new-york'?countySearchQuestions(c.slug,o):northeastSearchQuestions(state.id,c.slug,o)),...c.questions].map(([q,answer,url,label])=>`<details><summary>${e(q)}</summary><p>${e(answer)}${url?` ${a(url,label)}.`:''}</p></details>`).join('')}</div>`)
 +section('next','Wonder and Method',`Plan your ${areaName(c)} website.`,`<div class="county-reading"><p>Share your website, services and the problem you want to solve. I will suggest a useful next step.</p><p>${a(inquiry,'Discuss your website','button')} ${a('/work/','View studio work','text-link')}</p>${relatedCoverage(c,state)}<p>${a(state.path,'Explore '+state.name+' service areas')} · ${a('/areas/','All service states')}</p></div>`);
 return {path:path(c,state),title:`${c.areaType==='Planning Region'?c.name:display}, ${state.abbreviation} Web Design & SEO`,description:`Web design and SEO for ${areaName(c)}, ${state.abbreviation}. Websites from ${money(o.launch_site.public_price)}, reviews and monthly care, delivered online from Buffalo.`,body};
}

function buyerTask(c,state){
 if(state.id==='new-york')return countyBuyerTask(c.slug);
 const task=(state.id==='pennsylvania'?pennsylvaniaBuyerTasks:state.id==='ohio'?ohioBuyerTasks:northeastBuyerTasks[state.id])[c.slug];if(!task)throw Error('Missing '+state.name+' buyer task: '+c.slug);
 return `<section class="studio-section county-buyer-task" id="buyer-task"><p class="eyebrow">Example (made up)</p><h2>${e(task.title)}</h2><p>${e(task.scenario)} ${e(task.decision)}</p><p><strong>What to change on your website:</strong> ${e(task.output)}</p><p><a href="/assets/county-briefs/${state.id}-${c.slug}.txt" download>Download the planning worksheet (TXT)</a> · <a href="/guides/service-area-pages/">Plan your own coverage pages</a></p></section>`;
}
function directoryClosing(o){
 return section('scope','Choose what helps','Build, improve or keep it working.',`<p>Websites from ${money(o.launch_site.public_price)} · Care ${money(o.plans.keep_running.monthly_price)}/month (${money(o.plans.keep_running.monthly_price+o.baseline.one_time_price)} first payment if a new review is needed) · Reviews from ${money(o.baseline.one_time_price)} — ${a('/pricing/','compare prices and starting requirements')}.</p>`)
 +section('working','Your next step','Plan a website for your business.',`<div class="county-reading"><p>Share your services and what you need to change. I agree the work, price and dates before booking. ${a('/process/','See the project steps')}.</p><p>Each area guide includes local places, planning examples and a worksheet. Want to know who you would work with? ${a('/about/','Meet the Buffalo-based studio')}.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your project','button')}</p></div>`);
}
const statePlanning={
 'new-jersey':'New Jersey includes cities, boroughs, towns, townships and villages; a familiar place name may identify more than one municipality. Use a typed name such as a borough or township when it matters to where a customer visits or where you travel. Princeton is listed as a municipality. Start with one accepted job, the place where it happens and any service limits. The county guides turn those facts into a practical website decision, with fictional examples and a worksheet you can adapt.',
 connecticut:'These guides use Connecticut’s nine current planning regions, the county equivalents used in Census records. Customers may know their town or city better than the region name: search that familiar name to find its guide. Groton city and Groton town are distinct entries; consolidated town names remain searchable. A planning-region boundary does not set your service boundary. Write down where you actually work, whether customers visit you, and what must be confirmed before an appointment.',
 'rhode-island':'The directory organizes Rhode Island’s 39 cities and towns into five county guides. Use your customer-facing city or town name in an address or coverage explanation; the county guide is a place to plan the page and its next step. Bristol can mean a town or a county, so typed search can help. Before requesting a website, decide whether the customer is choosing a service, checking availability or arranging a visit. Each guide includes a different planning problem and a matching worksheet.',
 massachusetts:'The 14 county guides include Massachusetts’s 351 cities and towns. Some municipalities called towns have a city form of government; familiar names are retained here, with official source notes in each directory. Search a city or town to find its county, then use the guide to decide what your customer needs to do. Coverage wording, appointment details and a clear inquiry path should reflect your own business. Do not add separate place pages unless they explain a useful difference.',
 delaware:'New Castle, Kent and Sussex have three county guides. Clayton and Smyrna cross the Kent–New Castle boundary, and Milford crosses the Kent–Sussex boundary, so those municipalities appear in both relevant directories. Your service coverage may also cross a county line. Define it using the work you accept, the customer’s location and any travel or scheduling limits. Use the worksheets to decide what belongs on a service page and what needs individual confirmation.',
 vermont:'The 14 county guides distinguish Vermont’s cities, towns and incorporated villages from Census-designated communities and unorganized areas. Shared names can refer to different municipalities, so a search such as Rutland city or Rutland town can clarify the entry. The source notes explain recent changes and inactive village designations. Begin with the place customers recognize and the service you actually provide. Use the guide’s worksheet to set a clear inquiry step and a manageable plan for keeping the information current.',
 'new-hampshire':'Find New Hampshire’s cities and towns within the ten county guides. Unincorporated places are shown separately from organized municipalities, and Coös County can also be found by searching Coos without the accent. A familiar community name may help a customer more than the county name. Decide which location details affect a visit, delivery or service request, and use the guide’s planning exercise to make the next step clear. A directory entry does not establish a provider’s office or its actual service limits.',
 maine:'Maine’s 16 county guides distinguish cities, towns and plantations from unorganized territories and other communities. A plantation is a municipal category here; use the place name and actual address when discussing where work happens. The directory’s Census territory labels do not list every individual unorganized township. Confirm a precise destination with the customer when needed. Each guide pairs local place references with a different website-planning decision and a worksheet to help define the work before booking.',
 maryland:'Maryland has 23 counties and the independent city of Baltimore. Baltimore City and Baltimore County have separate guides; Towson is in Baltimore County. Some incorporated towns cross county lines, including Mount Airy, Millington, Queen Anne and Templeville, and appear in both relevant directories. Census-designated communities are listed separately from incorporated municipalities. Use the actual service address when a boundary affects your work, and choose the guide’s worksheet to clarify a useful website decision.'
};
function statePage(state,o){
 const text=`I design websites, improve search visibility and provide monthly website care for ${state.name} businesses. Work with me online from Buffalo. Search for your community or open a list below.`;
 const body=intro(`All ${state.counties.length} ${state.name} ${state.areaPlural}`,`Web design & SEO for ${state.name} businesses.`,text)
 +`<p class="county-state-switch">${a('/areas/','Browse all service states')} · ${serviceStates.filter(item=>item.id!==state.id).map(item=>a(item.path,'Explore '+item.name)).join(' · ')}</p>`
 +(statePlanning[state.id]?section('state-planning','Before you choose a guide','Plan around where your customers are.',`<div class="county-reading"><p>${e(statePlanning[state.id])}</p><p>${a('/guides/service-area-pages/','Decide which places need a page')} · ${a('/guides/website-redesign-brief/','Prepare a website brief')}</p></div>`):'')+'<span id="planning" class="legacy-anchor" aria-hidden="true"></span>'+countyDirectory(state)+directoryClosing(o);
 return {path:state.path,title:`${state.name} Web Design & SEO`,description:`Web design, SEO and website care across ${state.counties.length} ${state.name} ${state.areaPlural}. Find your community and work directly with a Buffalo designer online.`,body};
}
export function countyPages(o){
 const hub=intro('Online from Buffalo',`Websites for businesses across ${serviceStates.length} states.`,'Custom web design, redesigns, SEO and website care. Choose your state or search for a county, planning region or community to find a guide and planning worksheet.')
 +serviceStateCards()+countyDirectory()+directoryClosing(o);
 return [{path:'/areas/',title:'Web Design & SEO Service Areas',description:`Web design, SEO and website care across ${serviceStates.length} states. Find your county or planning region and work directly with a Buffalo designer online.`,body:hub},...serviceStates.map(state=>statePage(state,o)),...countyProfiles.map(c=>countyPage(c,o)),...pennsylvaniaProfiles.map(c=>countyPage(c,o,serviceStates[1])),...ohioProfiles.map(c=>countyPage(c,o,serviceStates[2])),...serviceStates.slice(3).flatMap(state=>northeastProfiles[state.id].map(c=>countyPage(c,o,state)))];
}
export const countyServiceArea=route=>{const data=serviceAreaDataForPath(route);return data?{name:data.county.name,areaLabel:areaName(data.county),areaType:data.county.areaType||'County',state:data.state.name,abbreviation:data.state.abbreviation}:null;};
export const countyServiceName=route=>countyServiceArea(route)?.name;
