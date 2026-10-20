import {escapeHtml as e, money} from './shared.mjs';

export function serviceNavigation(path) {
  const item=(url,label)=>`<a href="${url}"${path===url?' aria-current="page"':url==='/work/'&&path.startsWith('/work/')?' aria-current="location"':''}>${label}</a>`;
  const services=[['/services/web-design/','Web design'],['/services/website-redesign/','Website redesign'],['/services/contractor-websites/','Contractor websites'],['/services/seo/','SEO'],['/services/website-care/','Website care'],['/services/website-audit/','Website reviews & fixes']];
  return `${item('/work/','Work')}<details class="service-navigation${path.startsWith('/services/')?' is-current':''}"><summary>Services</summary><div class="service-links">${services.map(([url,label])=>item(url,label)).join('')}</div></details>${item('/pricing/','Pricing')}${item('/guides/','Guides')}${item('/about/','About')}${item('/contact/','Contact')}`;
}

export function pageMapExamples(o) {
  const examples=['launch_site','focused_site','signature_site'].map(id=>[id,o[id].buyer_summary.fit,o.decision_pack_examples[id].pages]);
  return `<section class="page-map-examples" id="marketing-pages" aria-labelledby="marketing-pages-title"><h3 id="marketing-pages-title">What is a marketing page?</h3><p>A marketing page helps someone understand your business, decide whether your services fit, or get in touch. Examples include <strong>Home, About, Services, individual service pages, Projects, FAQs and Contact</strong>.</p><p>Each page has its own web address. A Home page with an introduction, testimonials and a contact section still counts as <strong>one page</strong>. A separate Garden Design page and a separate Planting page count as <strong>two pages</strong>.</p><details><summary>See example ${o.launch_site.marketing_page_cap}-, ${o.focused_site.marketing_page_cap}- and ${o.signature_site.marketing_page_cap}-page websites</summary><p>One fictional landscaping business, three possible briefs. Launch suits a business whose services fit one overview and one inquiry path—even an established firm. Focused fits distinct services that need their own explanations and two customer guides, with a wider creative kit. Signature fits an extensive service and project library where four guides and a custom motion centerpiece have a purpose. These are illustrative page maps, not client work.</p><p>The lists show each package’s full allowance. Use fewer pages when they do the job; guides count inside the limit. Include project stories and team profiles only when real, approved material supports them. Do not invent work or add filler to reach a cap.</p><div class="service-fit-grid">${examples.map(([id,title,pages])=>`<article><p class="eyebrow">${e(o[id].public_name)} · up to ${o[id].marketing_page_cap} pages</p><h3>${title}</h3><ol>${pages.map(name=>`<li>${name}</li>`).join('')}</ol></article>`).join('')}</div><dl class="scope-definitions"><dt>A service page</dt><dd>One page explaining one service, who it helps and how to start.</dd><dt>A project or article page</dt><dd>One page showing an agreed project or answering a customer question; it counts toward the page limit.</dd><dt>Policy pages</dt><dd>Your supplied, approved privacy and other plain policy pages sit outside the marketing-page limit. You provide the legal wording.</dd></dl><p>Your proposal names the pages, writing and features included. Extra pages are agreed and priced before work begins.</p></details></section>`;
}

export function compatibilityGuide() {
  const cases=[
    ['A website built by the studio','Send the address and the change you need. I check the source files and publishing notes before agreeing on care or a small fix.'],
    ['A website with an existing editor','Tell me the platform and what needs changing. I check access, recovery options, export limits and whether the task is practical.'],
    ['Plugins or custom software','Share the problem and any maintenance history. Plugin conflicts, malware and complex applications may need a specialist. Standard care does not include software updates, backups or restores.'],
    ['You are not sure what it uses','The website address and a short description are enough to start. You do not need to diagnose it yourself.']
  ];
  return `<section class="studio-section compatibility-guide" id="website-fit"><p class="eyebrow">Your existing website</p><h2>Can I work with your site?</h2><p>I assess the actual site and task before offering care, an Audit &amp; Fix Sprint or a redesign. WordPress, Wix, Squarespace and Webflow differ in access and export options; none is automatically covered.</p><div class="compatibility-grid">${cases.map(([title,text])=>`<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div><p>Before work starts, we agree the task, delegated access, recovery route and completion checks. Send a public website address first; keep passwords and private exports out of the inquiry form.</p><a class="button" href="/contact/?offer=unsure&amp;goal=fix&amp;request_kind=question#inquiry">Ask if I can help</a></section>`;
}

export function firstConversation(config,{includeResponseWindow=false}={}) {
  return `<p class="first-conversation">I start by email. If a call would help, we can arrange one.</p>${includeResponseWindow&&config.responseWindow?`<p class="first-conversation">${e(config.responseWindow)}</p>`:''}`;
}

export function processOverview(config) {
  return `<section class="process-overview" aria-labelledby="process-overview-title"><h2 id="process-overview-title">Your schedule</h2><p>${e(config.projectTiming)}</p><p>Your proposal names the start, two review dates and launch target before payment. Send one combined list of changes at each review. Written approval is required; silence is not approval.</p></section>`;
}

export function projectCalendar() {
  return `<section class="studio-section" id="project-calendar"><h2>How reviews affect the launch date</h2><p>The build-time target is 3–5 days for Launch, 5–8 days for Focused and 7–10 days for Signature from the confirmed start, once the agreed business facts, assets and access are ready. The work may take a few extra days. I write the content; you approve its accuracy and review the design and working site on the dates in your proposal.</p><p>The usual review window is five business days unless we agree otherwise. Taking the full windows, delayed inputs or added work can move the launch beyond the package’s build-time target. I confirm revised dates with you; I do not treat silence as approval.</p><p>The paid files and operating notes follow within five business days of paid completion or settled cancellation. The separate 30-day correction period for build defects does not delay handoff.</p></section>`;
}

const conceptNotes={
 fieldwork:{name:'Fieldwork',problem:'The service pages help a homeowner choose a garden service, then carry that choice into the request form.',scope:'This 3-page example fits within Launch ($1,400, up to 6 pages). You receive the website files so you or a developer can change them later. The real contact form is configured and checked within the agreed build.'},
 northline:{name:'Northline',problem:'The site explains remodeling decisions before asking the homeowner to describe the room and preferred timing.',scope:'This 3-page example fits within Launch ($1,400, up to 6 pages). A remodeler with more services may choose Focused ($2,350, up to 15 pages). Your actual pages and features determine the package.'},
 hearthside:{name:'Hearthside',problem:'The menu puts ingredients and sample prices together and carries the selected pizza into an order preview.',scope:'For a real restaurant, the Order button can link to the ready ordering service you already use. Building an ordering system or setting up that outside account is separate work. This demo places no order and takes no payment.'}
};
export function conceptDebrief(id) {
 const c=conceptNotes[id];
 if(!c)throw Error('Unknown concept');
 return `<section class="studio-concept-debrief" aria-labelledby="${id}-debrief"><p class="eyebrow">${c.name} · Design decisions</p><h2 id="${id}-debrief">What this example shows</h2><p>${c.problem}</p><p>${c.scope}</p><a class="button" href="/contact/?offer=unsure&amp;goal=new_website&amp;request_kind=question&amp;concept=${id}#inquiry">Ask about a website like ${c.name}</a><p><a href="/pricing/#website-packages">Compare website packages</a></p></section>`;
}
