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
 ['Custom website design',`Launch ${money(o.launch_site.public_price)}, Focused ${money(o.focused_site.public_price)} and Signature ${money(o.signature_site.public_price)} offer distinct agreed scopes. Choose around pages, editing needs and the customer’s next step. External provider fees and work beyond the package are confirmed separately.`,'/services/web-design/'],
 ['SEO and useful content',`Monthly research, writing and a completed improvement start at ${money(o.plans.improve.monthly_price)}. We agree the useful work and record what changed. Search positions and inquiry volumes are not guaranteed.`,'/services/seo/'],
 ['Improve an existing site',`Start with a defined problem and a review of the website platform and access. A Website Baseline is ${money(o.baseline.one_time_price)} for review and priorities. The ${money(o.audit_sprint.one_time_price)} Sprint adds up to two agreed small fixes. Larger repairs or redesign need their own scope.`,'/services/website-audit/']
]);

function coverage(c){
 const g=countyGeography[c.slug];
 const groups=Object.entries(g.municipalities).filter(([,values])=>values.length).map(([label,values])=>`<div><h3>${e(label[0].toUpperCase()+label.slice(1))}</h3>${names(values)}</div>`).join('');
 const communities=g.communities.length?`<details class="county-communities"><summary>Smaller communities and familiar place names</summary><p>These are selected named communities, not an exhaustive list or additional incorporated municipalities.</p><ul>${g.communities.map(x=>`<li><strong>${e(x.name)}</strong> — ${e(x.type)}; ${e(x.town)}. ${a(x.source,x.name+' reference'+(/\.pdf(?:[?#]|$)|showpublisheddocument|DocumentCenter\/View/i.test(x.source)?' (PDF document)':''))}</li>`).join('')}</ul></details>`:'';
 return `<p>Online website and search work is available throughout ${e(c.name)} County. The directory helps you identify a location; your own business’s service coverage is confirmed separately.</p><p class="county-geography-note">${e(c.geographyNote)}</p><div class="county-directory">${groups}</div>${communities}<p class="county-sources">Municipal references, reviewed October 16, 2026: ${g.sources.map((url,i)=>a(url,`${c.name} County reference ${i+1}`+(/\.pdf(?:[?#]|$)|showpublisheddocument|DocumentCenter\/View/i.test(url)?' (PDF document)':''))).join(' · ')}. Town and village names may overlap.</p>`;
}

function countyPage(c,o){
 const body=intro(`${c.region} · Online service delivery`,`Web design & SEO in ${c.name} County, NY`,c.lead).replace('</header>',`<p>Website builds from ${money(o.launch_site.public_price)}. <a class="button" href="/contact/?request_kind=question#inquiry">Discuss your ${e(c.name)} County website</a></p></header>`)
 +`<nav class="page-jump county-jump" aria-label="County page topics">${a('#services','Services & cost')}${a('#approach','Your website')}${a('#buyer-task','Planning worksheet')}${a('#search','Search improvements')}${a('#coverage','Communities')}${a('#questions','Questions')}</nav>`
 +section('services','Choose the work','A clear scope before the build.',serviceCards(o)+`<p>${a('/pricing/','Compare every package and ongoing plan')}. All three website packages include source-code handoff and one initial launch. Website updates require code changes, checks and publishing. The quote confirms tools, review points, timing and ownership.</p>`)
 +section('approach',c.anchor,c.focusTitle,`<p class="county-intro-copy">${e(c.focus)}</p><p class="county-example-label">Illustrative project briefs — planning examples, not client projects.</p>${cards(c.briefs)}`)
 +countyBuyerTask(c.slug)
 +section('search',`${c.name} County SEO`,'Start with a useful customer question.',`<div class="county-reading"><p>${e(c.search)}</p><p>We review the existing site before adding pages. A useful improvement may be clearer service information, better internal links, a supported technical correction or a guide that answers a real pre-purchase question. We record the work and its limits, then use available search and inquiry evidence to decide what to do next.</p><p>${a('/guides/service-area-pages/','Read how to plan useful service-area pages')} · ${a('/guides/seo-work-and-reporting/','See what SEO work should report')}</p></div>`)
 +section('coverage','Accurate coverage',`Businesses across ${c.name} County.`,coverage(c))
 +section('questions','Before you inquire','Practical questions.',`<div class="county-faq">${[...c.questions,['How does working together online work?','We agree the pages, features, content responsibilities, feedback rounds and available dates in writing. You review the design and working website, approve the agreed version and receive the paid work and operating notes under the project terms.']].map(([q,answer])=>`<details><summary>${e(q)}</summary><p>${e(answer)}</p></details>`).join('')}</div>`)
 +section('next','Wonder and Method',`Tell us what your ${c.name} County website needs to do.`,`<div class="county-reading"><p>Share the business, current website if you have one, services, customer locations and the problem you want to solve. We will assess the fit and propose a clear next step.</p><p>Wonder and Method is based in Erie County, New York. Work for ${e(c.name)} County is delivered online; this page does not represent a local office.</p><p>${a('/contact/?request_kind=question#inquiry','Discuss your website','button')} ${a('/work/','View studio work','text-link')}</p><p>${a('/areas/','Explore all service areas')} · ${a('/areas/erie-county/','Buffalo & Erie County')}</p></div>`);
 return {path:path(c),title:`Web Design & SEO in ${c.name} County, NY`,description:`Custom web design and scoped SEO for ${c.name} County, NY. Clear services, useful content and online delivery from our Erie County studio.`,body};
}

export function countyPages(o){
 const counties=[['/areas/erie-county/','Buffalo & Erie County','Our home county, with online delivery across Buffalo and its surrounding cities, towns, villages and communities.'],...countyProfiles.toSorted((a,b)=>a.slug==='niagara'?-1:b.slug==='niagara'?1:a.name.localeCompare(b.name)).map(c=>[path(c),`${c.name} County`,`${c.anchor} · ${c.region}`])];
 const hub=intro('New York service areas','Websites for businesses across New York.','Wonder and Method is based in Erie County and delivers custom websites, SEO improvements and supported website care online for businesses across New York. Explore the county guides below to plan a useful website around your services and customers.')
 +section('counties','Find your area','Local context. One clear working process.',`<div class="county-hub-grid">${counties.map(([url,title,text],i)=>`<article><a class="county-hub-link" href="${url}"><span class="eyebrow">${i===0?'My home county':'Online delivery'}</span><h3>${e(title)}</h3><p>${e(text)}</p></a></article>`).join('')}</div>`)
 +section('scope','Choose what helps','Build, improve or keep it working.',serviceCards(o)+`<p>For ongoing changes, ${a('/services/website-care/','explore monthly website care')}. For an existing site that may need more substantial work, ${a('/services/website-redesign/','review the redesign approach')}.</p>`)
 +section('working','An online studio','Start with the business you actually run.',`<div class="county-reading"><p>Location is one part of a useful brief. We also need to understand your services, who chooses them, the information customers need and what happens after an inquiry. We define pages and tools around those needs, then agree the content, review and launch responsibilities.</p><p>A county guide describes where we can work online. It does not imply a local branch, a local client history or guaranteed search visibility. Your website should describe its own office, travel area and delivery arrangements accurately.</p><p>These guides cover our home county and nine additional New York counties. If your location is elsewhere in the state, tell us where you work and we can assess the same online process.</p><p>${a('/guides/website-redesign-brief/','Prepare a useful website brief')} · ${a('/process/','See the working process')}</p><p>${a('/contact/','Discuss your project','button')}</p></div>`);
 return [{path:'/areas/',title:'Website services across New York',description:'Website design, SEO and care for New York businesses. Based in Buffalo, with online delivery across ten county service areas.',body:hub},...countyProfiles.map(c=>countyPage(c,o))];
}

export const countyServiceName=route=>countyProfiles.find(c=>path(c)===route)?.name;
