import {countyBuyerTask} from './county-buyer-tasks.mjs';
import {escapeHtml as e,money} from './shared.mjs';
import {countyProfiles} from './county-profiles.mjs';
import {countyGeography} from './county-geography.mjs';

const a=(url,label,cls='')=>`<a href="${e(url)}"${cls?` class="${cls}"`:''}>${e(label)}</a>`;
const intro=(label,title,text)=>`<header class="page-intro"><p class="eyebrow">${e(label)}</p><h1>${e(title)}</h1><p class="lede">${e(text)}</p></header>`;
const section=(id,label,title,body)=>`<section class="section county-section" id="${id}"><div class="section-heading"><p class="eyebrow">${e(label)}</p><h2>${e(title)}</h2></div>${body}</section>`;
const path=c=>`/areas/${c.slug}-county/`;
const names=values=>`<ul class="county-place-list">${values.map(x=>`<li>${e(x)}</li>`).join('')}</ul>`;
const cards=items=>`<div class="county-cards">${items.map(([title,text,url])=>`<article><h3>${url?a(url,title):e(title)}</h3><p>${e(text)}</p></article>`).join('')}</div>`;
const countyLink=c=>a(path(c),`${c.name} County`);
const serviceCards=o=>cards([
 ['A new website',`From ${money(o.launch_site.public_price)}. Clear writing, custom design and your website files. Domain, hosting and paid tools are separate.`,'/services/web-design/'],
 ['Care and useful improvements',`Care starts at ${money(o.plans.keep_running.monthly_price)}/month. Improve ${money(o.plans.improve.monthly_price)} and Grow ${money(o.plans.grow.monthly_price)} add agreed content or website improvements.`,'/services/seo/'],
 ['An existing-site problem',`A ${money(o.baseline.one_time_price)} review includes one safe first fix when access allows. The ${money(o.audit_sprint.one_time_price)} Sprint includes up to two agreed fixes in total.`,'/services/website-audit/']
]);

function coverage(c){
 const g=countyGeography[c.slug];
 const groups=Object.entries(g.municipalities).filter(([,values])=>values.length).map(([label,values])=>`<div><h3>${e(label[0].toUpperCase()+label.slice(1))}</h3>${names(values)}</div>`).join('');
 const communities=g.communities.length?`<div><h3>Communities</h3><p>Selected hamlets, neighborhoods and other familiar place names.</p><ul class="county-place-list">${g.communities.map(x=>`<li>${e(x.name)}</li>`).join('')}</ul></div>`:'';
 const references=[...new Set([...g.sources,...g.communities.map(x=>x.source)])];
 return `<p>I work online with businesses throughout ${e(c.name)} County. ${e(c.geographyNote)}</p><details class="county-communities"><summary>View cities, towns, villages and communities</summary><div class="county-directory">${groups}${communities}</div><p>Town and village names may overlap. Community names are not additional incorporated municipalities.</p><details class="county-sources"><summary>Geography sources</summary><ul>${references.map((url,i)=>`<li>${a(url,`${c.name} reference ${i+1}`+(/\.pdf(?:[?#]|$)|showpublisheddocument|DocumentCenter\/View/i.test(url)?' (PDF)':''))}</li>`).join('')}</ul></details></details>`;

}

function countyPage(c,o){
 const body=intro(`${c.region} · Online service delivery`,`Web design & SEO in ${c.name} County, NY`,c.lead).replace('</header>',`<p>Website builds from ${money(o.launch_site.public_price)}. <a class="button" href="/contact/?request_kind=question#inquiry">Discuss your ${e(c.name)} County website</a></p></header>`)
 +`<nav class="page-jump county-jump" aria-label="County page topics">${a('#services','Services & cost')}${a('#buyer-task','Local example')}${a('#coverage','Communities')}${a('#questions','Questions')}</nav>`
 +section('services','Choose the work','Start with the problem you want to solve.',`<span id="search" class="legacy-anchor" aria-hidden="true"></span>`+serviceCards(o)+`<p>${a('/pricing/','Compare all prices and what is included')}. Website updates require code changes, checks and publishing.</p>`)
 +'<span id="approach" class="legacy-anchor" aria-hidden="true"></span>'+countyBuyerTask(c.slug)
 +section('coverage','Accurate coverage',`Businesses across ${c.name} County.`,coverage(c))
 +section('questions','Before you inquire','Practical questions.',`<div class="county-faq">${[...c.questions,['How does working together online work?','We agree the pages, features, content responsibilities, feedback rounds and available dates in writing. You review the design and working website, approve the agreed version and receive the paid work and operating notes under the project terms.']].map(([q,answer])=>`<details><summary>${e(q)}</summary><p>${e(answer)}</p></details>`).join('')}</div>`)
 +section('next','Wonder and Method',`Tell me what your ${c.name} County website needs to do.`,`<div class="county-reading"><p>Share the business, current website if you have one, services, customer locations and the problem you want to solve. I will assess the fit and propose a clear next step.</p><p>Wonder and Method is based in Erie County, New York. Work for ${e(c.name)} County is delivered online; this page does not represent a local office.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your website','button')} ${a('/work/','View studio work','text-link')}</p><p>${a('/areas/','Explore all service areas')} · ${a('/areas/erie-county/','Buffalo & Erie County')}</p></div>`);
 return {path:path(c),title:`Web Design & SEO in ${c.name} County, NY`,description:`Custom web design and scoped SEO for ${c.name} County, NY. Clear services, useful content and online delivery from our Erie County studio.`,body};
}

export function countyPages(o){
 const counties=[['/areas/erie-county/','Buffalo & Erie County','Buffalo'],...countyProfiles.toSorted((a,b)=>a.slug==='niagara'?-1:b.slug==='niagara'?1:a.name.localeCompare(b.name)).map(c=>[path(c),`${c.name} County`,c.anchor])];
 const hub=intro('New York service areas','Websites for businesses across New York.','Wonder and Method is based in Erie County. All work is done online. Explore a county guide for practical website examples and local geography, then choose the help your business needs.')
 +section('counties','Find your area','Where do you work?',`<div class="county-hub-grid">${counties.map(([url,title,text])=>`<article><a class="county-hub-link" href="${url}"><h3>${e(title)}</h3><p>${e(text)}</p></a></article>`).join('')}</div>`)
 +section('scope','Choose what helps','Build, improve or keep it working.',`<p>Websites from ${money(o.launch_site.public_price)} · Care from ${money(o.plans.keep_running.monthly_price)}/month · Reviews from ${money(o.baseline.one_time_price)} — ${a('/pricing/','compare all prices')}.</p>`)
 +section('working','Start with your business','Tell me what the website needs to do.',`<div class="county-reading"><p>Share your services, customers and the problem you want to solve. I agree the work, price and dates before booking. These pages describe online service areas, without claiming a branch or client history in each county.</p><p>Elsewhere in New York? The same online process may suit your project. ${a('/process/','See how projects work')}.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your project','button')}</p></div>`);
 return [{path:'/areas/',title:'Website services across New York',description:'Website design, SEO and care for New York businesses. Based in Buffalo, with online delivery across ten county service areas.',body:hub},...countyProfiles.map(c=>countyPage(c,o))];
}

export const countyServiceName=route=>countyProfiles.find(c=>path(c)===route)?.name;
