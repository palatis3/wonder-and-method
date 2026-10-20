import {countyBuyerTask} from './county-buyer-tasks.mjs';
import {escapeHtml as e,money} from './shared.mjs';
import {countyProfiles} from './county-profiles.mjs';
import {countyGeography} from './county-geography.mjs';
import {countySearchQuestions} from './county-search-questions.mjs';

const a=(url,label,cls='')=>`<a href="${e(url)}"${cls?` class="${cls}"`:''}>${e(label)}</a>`;
const intro=(label,title,text)=>`<header class="page-intro"><p class="eyebrow">${e(label)}</p><h1>${e(title)}</h1><p class="lede">${e(text)}</p></header>`;
const section=(id,label,title,body)=>`<section class="section county-section" id="${id}"><div class="section-heading"><p class="eyebrow">${e(label)}</p><h2>${e(title)}</h2></div>${body}</section>`;
const path=c=>`/areas/${c.slug}-county/`;
const names=values=>`<ul class="county-place-list">${values.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`;
const cards=items=>`<div class="county-cards">${items.map(([title,text,url])=>`<article><h3>${url?a(url,title):e(title)}</h3><p>${e(text)}</p></article>`).join('')}</div>`;
const countyLink=c=>a(path(c),`${c.name} County`);
const countyLabel=c=>c.boroughLabel?`${c.boroughLabel} · ${c.name} County`:({kings:'Brooklyn · Kings County','new-york':'Manhattan · New York County',richmond:'Staten Island · Richmond County'})[c.slug]||`${c.name} County`;
// Regional navigation groups are browsing aids, not separate local offices.
export const countyRegions=[
 {id:'western-new-york',name:'Western New York',slugs:['erie','niagara','chautauqua']},
 {id:'finger-lakes',name:'Rochester & Finger Lakes',slugs:['monroe','ontario']},
 {id:'central-new-york',name:'Central New York & Mohawk Valley',slugs:['onondaga','oswego','oneida']},
 {id:'southern-tier',name:'Southern Tier',slugs:['broome']},
 {id:'capital-region',name:'Capital Region',slugs:['albany','saratoga','schenectady','rensselaer']},
 {id:'hudson-valley',name:'Hudson Valley',slugs:['orange','rockland','dutchess','ulster','westchester']},
 {id:'new-york-city',name:'New York City',slugs:['kings','queens','new-york','bronx','richmond']},
 {id:'long-island',name:'Long Island',slugs:['nassau','suffolk']}
];
const allCounties=()=>[{slug:'erie',name:'Erie',anchor:'Buffalo',displayName:'Buffalo & Erie County'},...countyProfiles];
const regionCounties=region=>region.slugs.map(slug=>allCounties().find(c=>c.slug===slug)).filter(Boolean);
export function serviceAreaLinks(){
 return `<section class="studio-section service-area-links" id="service-areas"><div class="section-heading"><p class="eyebrow">Across New York</p><h2>Work together online, wherever your business is based.</h2></div><p>Based in Buffalo, I provide web design, redesigns, SEO and website care online across New York. Explore a county guide for local planning examples, communities and the right service to start with.</p><details class="service-disclosure"><summary>Explore all ${allCounties().length} county service areas</summary><div class="coverage-region-grid">${countyRegions.map(region=>`<div><h3>${e(region.name)}</h3><ul>${regionCounties(region).map(c=>`<li>${a(path(c),c.slug==='erie'?'Buffalo & Erie County':countyLabel(c))}</li>`).join('')}</ul></div>`).join('')}</div></details><p>${a('/areas/','Browse New York service areas','text-link')}</p></section>`;
}
function relatedCoverage(c){
 const region=countyRegions.find(r=>r.slugs.includes(c.slug));
 const neighbors=region?regionCounties(region).filter(item=>item.slug!==c.slug):[];
 return neighbors.length?`<p><strong>More ${e(region.name)} service areas:</strong> ${neighbors.map(item=>a(path(item),countyLabel(item))).join(' · ')}</p>`:'';
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

function coverage(c){
 const g=countyGeography[c.slug];
 const groups=Object.entries(g.municipalities).filter(([,values])=>values.length).map(([label,values])=>`<div><h3>${e(label[0].toUpperCase()+label.slice(1))}</h3>${names(values)}</div>`).join('');
 const communities=g.communities.length?`<div><h3>Communities</h3><p>Selected hamlets, neighborhoods and other familiar place names.</p><ul class="county-place-list">${g.communities.map(x=>`<li>${e(x.name)}</li>`).join('')}</ul></div>`:'';
 const references=[...new Set([...g.sources,...g.communities.map(x=>x.source)])];
 const labels=g.sourceNames||referenceNames[c.slug]||[];
 return `<p>I work online with businesses throughout ${e(c.name)} County. ${e(c.geographyNote)}</p><details class="county-communities"><summary>${g.borough?'View selected neighborhoods':'View cities, towns, villages and communities'}</summary><div class="county-directory">${groups}${communities}</div><p>${e(g.directoryNote||(g.borough?'These are selected neighborhood names within New York City, not separate incorporated cities, towns or villages.':'Town and village names may overlap. Community names are not additional incorporated municipalities.'))}</p></details><details class="county-sources"><summary>Official sources for these places</summary><ul>${references.map((url,i)=>`<li>${a(url,(labels[i]||`Official place reference ${i+1}`)+(/\.pdf(?:[?#]|$)|showpublisheddocument|DocumentCenter\/View/i.test(url)?' (PDF)':''))}</li>`).join('')}</ul></details>`;

}

function countyPage(c,o){
 const display=c.displayName||`${c.name} County`;
 const body=intro(`${c.region} · ${c.name} County, New York`,`Web design & SEO in ${display}`,c.lead).replace('</header>',`<p>Website builds from ${money(o.launch_site.public_price)}. <a class="button" href="/contact/?request_kind=question#inquiry">Discuss your ${e(c.name)} County website</a></p></header>`)
 +`<nav class="page-jump county-jump" aria-label="County page topics">${a('#services','Services & cost')}${a('#local-planning','Website planning')}${a('#buyer-task','Local example')}${a('#search-plan','SEO approach')}${a('#coverage','Communities')}${a('#questions','Questions')}</nav>`
 +section('services','Choose the work','Start with the problem you want to solve.',`<span id="search" class="legacy-anchor" aria-hidden="true"></span>`+serviceCards(o)+`<p>${a('/services/website-care/','Monthly website care')} · ${a('/services/seo/','SEO improvements')}</p><p>${a('/pricing/','Compare all prices and what is included')}. Website updates require code changes, checks and publishing.</p>`)
 +section('local-planning',`${c.anchor} website planning`,c.focusTitle,`<div class="county-reading"><p>${e(c.focus)}</p></div><p class="county-example-label">Illustrative planning situations, not local client projects.</p>${cards(c.briefs)}`)
 +'<span id="approach" class="legacy-anchor" aria-hidden="true"></span>'+countyBuyerTask(c.slug)
 +section('search-plan',`SEO for ${c.anchor}`,`Help customers find and understand your services.`,`<div class="county-reading"><p>${e(c.search)}</p><p>Research informs the page plan, titles, service explanations and internal links. After publishing, available search impressions, queries and inquiries help decide what to improve next. ${a('/services/seo/','Explore the SEO service')} or ${a('/guides/seo-work-and-reporting/','see how changes and results are reported')}.</p></div>`)
 +section('coverage','Local places',`Businesses across ${c.name} County.`,coverage(c))
 +section('questions','Before you inquire','Practical questions.',`<div class="county-faq">${[...countySearchQuestions(c.slug,o),...c.questions,['How will we work together online?','We agree the pages, features, content responsibilities, feedback rounds and available dates in writing. You review the design and working website, approve the agreed version and receive the paid work and operating notes under the project terms.']].map(([q,answer,url,label])=>`<details><summary>${e(q)}</summary><p>${e(answer)}${url?` ${a(url,label)}.`:''}</p></details>`).join('')}</div>`)
 +section('next','Wonder and Method',`Tell me what your ${c.name} County website needs to do.`,`<div class="county-reading"><p>Share the business, current website if you have one, services, customer locations and the problem you want to solve. I will assess the fit and propose a clear next step.</p><p>Wonder and Method is based in Buffalo and works with ${e(c.name)} County businesses online.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your website','button')} ${a('/work/','View studio work','text-link')}</p>${relatedCoverage(c)}<p>${a('/areas/','Explore all service areas')} · ${a('/areas/erie-county/','Buffalo & Erie County')}</p></div>`);
 return {path:path(c),title:c.title||`Web Design & SEO in ${c.name} County, NY`,description:c.description||`Custom web design and scoped SEO for ${c.name} County, NY, including ${c.anchor}. Clear services and online collaboration from Buffalo.`,body};
}

export function countyPages(o){
 const hub=intro('New York service areas','Websites for businesses across New York.','Wonder and Method is based in Buffalo. We work with businesses across New York online. Explore a county guide for practical website examples and local geography, then choose the help your business needs.')
 +`<nav class="page-jump county-region-nav" aria-label="New York service regions">${countyRegions.map(r=>a('#'+r.id,r.name)).join('')}</nav>`
 +`<div id="counties">${countyRegions.map(region=>section(region.id,'Find your area',region.name,`<div class="county-hub-grid">${regionCounties(region).map(c=>`<article><a class="county-hub-link" href="${path(c)}"><h3>${e(c.slug==='erie'?'Buffalo & Erie County':countyLabel(c))}</h3><p>${e(c.anchor)}</p></a></article>`).join('')}</div>`)).join('')}</div>`
 +section('scope','Choose what helps','Build, improve or keep it working.',`<p>Websites from ${money(o.launch_site.public_price)} · Care from ${money(o.plans.keep_running.monthly_price)}/month · Reviews from ${money(o.baseline.one_time_price)} — ${a('/pricing/','compare all prices')}.</p>`)
 +section('working','Start with your business','Tell me what the website needs to do.',`<div class="county-reading"><p>Share your services, customers and the problem you want to solve. I agree the work, price and dates before booking. These pages describe online service areas, without claiming a branch or client history in each county.</p><p>Elsewhere in New York? The same online process may suit your project. ${a('/process/','See how projects work')}.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your project','button')}</p></div>`);
 return [{path:'/areas/',title:'New York Web Design & SEO Service Areas',description:`Web design, SEO and care across ${allCounties().length} New York counties, including NYC, Long Island, the Hudson Valley and Upstate NY. Buffalo-based, working online.`,body:hub},...countyProfiles.map(c=>countyPage(c,o))];
}

export const countyServiceName=route=>countyProfiles.find(c=>path(c)===route)?.name;
