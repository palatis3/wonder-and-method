import {websiteProof,homeStartingPoints} from './home-proof.mjs';
import {compactComparison} from './buyer-journey.mjs';
import {serviceCoverage} from './service-area.mjs';
import {workGallery} from './work-gallery.mjs';
import {pricingContent,careContent,auditContent,seoContent,ongoingOverview,sharedFoundations,includedWorkflows,nextSteps,webDesignContent} from './service-content.mjs';
import {packageChoice, paymentComparison, costCalculator, handoffSample, receiptExamples, studyEvidence, localExample} from './audit-content.mjs';
import {escapeHtml as e, money} from './shared.mjs';
import {selectedEdition} from './editions.mjs';

const projectSummary=[['Agree the work','Confirm the goal, pages, price, outside costs and dates in writing.'],['Design and build','Review the design, then check and approve the working website before launch.'],['Launch and hand over','Receive your paid source files, account access, written guide and optional 30-minute handoff call.']];
const arrow = '<img class="link-arrow" src="/assets/waterfront/arrow-up-right.svg" alt="" aria-hidden="true" width="18" height="18">';
const link = (url, text, cls = 'text-link') => `<a class="${cls}" href="${url}">${text}</a>`;
const heading = (label, title, text = '') => `<header class="page-intro"><p class="eyebrow">${label}</p><h1>${title}</h1>${text ? `<p class="lede">${text}</p>` : ''}</header>`;
const bullets = items => `<ul class="clean-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const close = () => `<section class="studio-closing"><p class="eyebrow">Your next step</p><h2>Tell me what your website needs.</h2><p>Tell me what needs to change and what your customers should be able to do.</p>${link('/contact/?request_kind=checkout#inquiry', 'Start a project', 'button')}</section>`;

export const founderStrip=config=>`<section class="founder-strip" aria-label="Meet the studio owner"><p><strong>You work directly with me, Terry, from first email to handoff.</strong> I’ve worked on websites and technology since 2018 and have started several small businesses.</p><a class="text-link" href="/about/#terry">Meet the person behind the studio</a></section>`;

const packageCards = (o,detailed=false)=>packageChoice(o,detailed,{compact:!detailed});

function hero(config,offersForHero) {
  const art = selectedEdition(config);
  if(art.id==='civic-sculpture') return `<section class="civic-hero" data-edition="${art.id}" aria-labelledby="hero-heading"><div class="civic-copy"><h1 id="hero-heading">Websites and SEO<br>for <span>New York businesses.</span></h1><div><p>Custom design, complete writing and search foundations. Work directly with Terry in Buffalo, with projects delivered online across New York.</p><p>Fixed prices, clear scope and paid source files. Websites from ${money(offersForHero.launch_site.public_price)}.</p><div class="civic-actions">${link('/contact/?request_kind=checkout#inquiry', 'Start a project', 'button')}${link('#website-examples', 'See website examples')}</div></div></div><div class="civic-controls"><button type="button" class="civic-toggle" aria-controls="civic-motion${config.civicAmbientReady?' civic-ambient':''}" hidden>Play animation</button><button type="button" class="civic-replay" aria-controls="civic-motion" hidden>Replay introduction</button><span class="civic-status" role="status" aria-live="polite"></span></div><div class="civic-stage"><img class="civic-poster" src="${art.still}" srcset="${art.srcset}" sizes="(max-width:767px) 100vw, min(100vw, 1120px)" width="${art.width}" height="${art.height}" alt="${e(art.alt)}" fetchpriority="high" decoding="async"><video id="civic-motion" class="civic-motion civic-motion--intro"${config.civicMotionReady ? ` data-src="${art.motion}"${art.mobileMotion?` data-mobile-src="${art.mobileMotion}"`:""}` : ''} data-duration="${art.duration}" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video>${config.civicAmbientReady ? `<video id="civic-ambient" class="civic-motion civic-motion--ambient" data-src="${art.ambientMotion}"${art.mobileAmbientMotion?` data-mobile-src="${art.mobileAmbientMotion}"`:""} data-duration="${art.ambientDuration}" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video>` : ''}</div></section>`;
  return `<section class="studio-hero" data-edition="${art.id}" aria-labelledby="hero-heading"><div class="hero-media"><img class="hero-poster" src="${art.still}" srcset="${art.srcset}" sizes="100vw" width="${art.width}" height="${art.height}" alt="${e(art.alt)}" fetchpriority="high" decoding="async"><video class="hero-motion" id="hero-motion" data-src="${art.motion}" data-duration="${art.duration}" muted playsinline loop preload="none" aria-hidden="true" tabindex="-1"></video></div><div class="hero-copy"><h1 id="hero-heading">Websites that do your business <span>justice.</span></h1><p>Custom websites for service businesses. ${e(serviceCoverage(config).statement)} Make your offer easier to understand—and the next inquiry easier to send.</p><div class="hero-actions">${link('/contact/?request_kind=checkout#inquiry', 'Start a project', 'button')}${link('/pricing/', 'See services &amp; pricing', 'hero-secondary')}</div></div><div class="hero-caption"><button type="button" class="motion-toggle" aria-controls="hero-motion" aria-pressed="false" hidden>Play motion</button></div></section>`;
}

function home({config, offers:o}) {
  return `${hero(config,o)}<div class="home-content">${websiteProof()}${homeStartingPoints(o)}
  ${founderStrip(config)}<section class="studio-section studio-process"><p class="eyebrow">A clear working relationship</p><h2>From the first conversation<br>to a useful website.</h2><ol>${projectSummary.map(([name,text])=>`<li><h3>${name}</h3><p>${text}</p></li>`).join('')}</ol>${link('/process/', 'See the full project process')}</section>
  <section class="studio-section home-faq"><h2>Before we talk.</h2><details><summary>Can I update the website myself?</summary><p>Yes, through the delivered source code, with your developer or optional care. A drag-and-drop editor is not included. Keep Running covers one related set of supplied edits each month. <a href="/work/source-handoff/#code-editing">See how updates work</a>.</p></details><details><summary>Does the website include SEO?</summary><p>Yes: research, complete writing, page titles, search descriptions and launch checks. Focused includes two original guides; Signature includes four, within the page cap. <a href="/services/seo/">Ongoing SEO is optional</a>. Rankings and leads are not guaranteed.</p></details><details><summary>Do I need an ongoing subscription?</summary><p>No. You keep paid bespoke work, subject to disclosed licences. You pay domain, hosting and paid tools directly to providers. <a href="/services/website-care/">Monthly studio help is optional</a>.</p></details><details><summary>How long will the project take?</summary><p>${e(config.projectTiming)} <a href="/process/">See the project steps</a>.</p></details></section>${close()}</div>`;

}

function pricing({offers:o}) { return pricingContent(o); }

function work({config}) { return workGallery(config); }

function about({config}) {
 return `${heading('The studio', 'Hi, I’m Terry.<br>Welcome to the studio.', 'I help service businesses explain what they do through websites, content and carefully chosen tools.')}<section class="studio-section case-intro"><div><p class="eyebrow">A direct working relationship</p><h2 id="terry">Why I started<br>Wonder and Method.</h2></div><div><p>Wonder and Method is a one-person web studio founded by ${e(config.founderName||'Terry')} and operated by ${e(config.businessIdentity)}.</p>${config.founderBio ? '<p>'+e(config.founderBio)+'</p>' : ''}${config.founderProfile?`<p>My professional profile uses my full name, ${e(config.founderPublicName)}. <a href="${e(config.founderProfile)}">Meet Terry on LinkedIn</a>.</p>`:''}<p><strong>Recent studio work:</strong> the <a href="/work/#website-decisions">Wonder and Method website</a> and <a href="/work/studio-search/">October 2026 search-planning example</a> show the decisions, implementation and limits of my own work. The business concepts in the portfolio are clearly labeled; they are not presented as client projects.</p><p>I’m based in Buffalo and deliver projects online. See <a href="/areas/erie-county/">website services across Erie County</a>. We agree the work in writing, review it together and finish with a documented handoff.</p></div></section><section class="studio-section"><p class="eyebrow">How your project works</p><h2>From your business<br>to a useful website.</h2><div class="continuing-grid">${projectSummary.map(([name,text])=>`<article><h3>${name}</h3><p>${text}</p></article>`).join('')}</div><p><a class="text-link" href="/work/">Explore studio work</a> · <a class="text-link" href="/process/">See the project steps</a> · <a class="text-link" href="/pricing/#ownership">Read ownership and payment terms</a></p></section><section class="studio-section about-contact"><p class="eyebrow">A direct conversation</p><h2>Tell me what<br>needs to change.</h2><p>${e(config.responseWindow)}</p><p>For project or privacy questions, <a href="mailto:${e(config.contactEmail)}">${e(config.contactEmail)}</a>.</p>${link('/contact/', 'Discuss your project', 'button')}</section>`;
}

export function premiumBody(path, context) {
  if (path === '/') return home(context);
  if (path === '/pricing/') return pricing(context);
  if (path === '/work/') return work(context);
  if (path === '/about/') return about(context);
  if (path === '/services/seo/') return seoContent(context.offers);
  if (path === '/services/website-care/') return careContent(context.offers);
  if (path === '/services/website-audit/') return auditContent(context.offers);
  if (path === '/services/web-design/') return webDesignContent(context.offers);
  return null;
}
