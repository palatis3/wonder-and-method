import {websiteProof,homeStartingPoints} from './home-proof.mjs';
import {compactComparison} from './buyer-journey.mjs';
import {serviceCoverage} from './service-area.mjs';
import {workGallery} from './work-gallery.mjs';
import {pricingContent,careContent,auditContent,seoContent,ongoingOverview,sharedFoundations,includedWorkflows,nextSteps,webDesignContent} from './service-content.mjs';
import {packageChoice, paymentComparison, costCalculator, handoffSample, receiptExamples, studyEvidence, localExample} from './audit-content.mjs';
import {escapeHtml as e, money} from './shared.mjs';
import {selectedEdition} from './editions.mjs';

const projectSummary=[['Agree on the work','Confirm the goal, pages, price, outside costs and dates in writing.'],['Design and build','Review the design, then check and approve the working website before launch.'],['Launch and hand over','Receive your website files, a written guide and an optional 30-minute walkthrough call. Your domain and hosting stay in your name throughout.']];
const arrow = '<img class="link-arrow" src="/assets/waterfront/arrow-up-right.svg" alt="" aria-hidden="true" width="18" height="18">';
const link = (url, text, cls = 'text-link') => `<a class="${cls}" href="${url}">${text}</a>`;
const heading = (label, title, text = '') => `<header class="page-intro"><p class="eyebrow">${label}</p><h1>${title}</h1>${text ? `<p class="lede">${text}</p>` : ''}</header>`;
const bullets = items => `<ul class="clean-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
const close = () => `<section class="studio-closing"><p class="eyebrow">Your next step</p><h2>Tell me what your website needs.</h2><p>A few lines is enough: what you do, where you work and what the website should help customers do.</p>${link('/contact/?request_kind=checkout#inquiry', 'Start a project', 'button')}</section>`;

export const founderStrip=config=>`<section class="founder-strip" aria-label="Meet the studio owner"><p><strong>You work directly with me, Terry, from first email to handoff.</strong> I’ve worked on websites and technology since 2018 and have started several small businesses.</p><a class="text-link" href="/about/#terry">Meet the person behind the studio</a></section>`;

const packageCards = (o,detailed=false)=>packageChoice(o,detailed,{compact:!detailed});

function hero(config,offersForHero) {
  const art = selectedEdition(config);
  if(art.id==='civic-sculpture') return `<section class="civic-hero" data-edition="${art.id}" aria-labelledby="hero-heading"><div class="civic-copy"><h1 id="hero-heading">Websites and SEO<br>across <span>New York,<br>Pennsylvania and Ohio.</span></h1><div><p>Custom design, all the writing and the search setup that helps people find your services. Based in ${e(serviceCoverage(config).base)}, working with you online.</p><p>Fixed prices and clearly agreed work. You own the paid custom website files. Websites from ${money(offersForHero.launch_site.public_price)}; monthly SEO with care from ${money(offersForHero.plans.improve.monthly_price)}/month.</p><div class="civic-actions">${link('/contact/?request_kind=checkout#inquiry', 'Start a project', 'button')}${link('#website-examples', 'See website examples')}</div></div></div><div class="civic-controls"><button type="button" class="civic-toggle" aria-controls="civic-motion${config.civicAmbientReady?' civic-ambient':''}" hidden>Play animation</button><button type="button" class="civic-replay" aria-controls="civic-motion" hidden>Replay animation</button><span class="civic-status" role="status" aria-live="polite"></span></div><div class="civic-stage"><img class="civic-poster" src="${art.still}" srcset="${art.srcset}" sizes="(max-width:767px) 100vw, min(100vw, 1120px)" width="${art.width}" height="${art.height}" alt="${e(art.alt)}" fetchpriority="high" decoding="async"><video id="civic-motion" class="civic-motion civic-motion--intro"${config.civicMotionReady ? ` data-src="${art.motion}"${art.mobileMotion?` data-mobile-src="${art.mobileMotion}"`:""}` : ''} data-duration="${art.duration}" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video>${config.civicAmbientReady ? `<video id="civic-ambient" class="civic-motion civic-motion--ambient" data-src="${art.ambientMotion}"${art.mobileAmbientMotion?` data-mobile-src="${art.mobileAmbientMotion}"`:""} data-duration="${art.ambientDuration}" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video>` : ''}</div></section>`;
  return `<section class="studio-hero" data-edition="${art.id}" aria-labelledby="hero-heading"><div class="hero-media"><img class="hero-poster" src="${art.still}" srcset="${art.srcset}" sizes="100vw" width="${art.width}" height="${art.height}" alt="${e(art.alt)}" fetchpriority="high" decoding="async"><video class="hero-motion" id="hero-motion" data-src="${art.motion}" data-duration="${art.duration}" muted playsinline loop preload="none" aria-hidden="true" tabindex="-1"></video></div><div class="hero-copy"><h1 id="hero-heading">Websites that do your business <span>justice.</span></h1><p>Custom design, all the writing and search setup for service businesses. ${e(serviceCoverage(config).statement)} Websites from ${money(offersForHero.launch_site.public_price)}; care from ${money(offersForHero.plans.keep_running.monthly_price)}/month.</p><div class="hero-actions">${link('/contact/?request_kind=checkout#inquiry', 'Start a project', 'button')}${link('/pricing/', 'See services &amp; pricing', 'hero-secondary')}</div></div><div class="hero-caption"><button type="button" class="motion-toggle" aria-controls="hero-motion" aria-pressed="false" hidden>Play motion</button></div></section>`;
}

function home({config, offers:o}) {
  return `${hero(config,o)}<div class="home-content">${websiteProof()}${homeStartingPoints(o)}
  ${founderStrip(config)}<section class="studio-section studio-process"><p class="eyebrow">A clear working relationship</p><h2>From the first conversation<br>to a useful website.</h2><ol>${projectSummary.map(([name,text])=>`<li><h3>${name}</h3><p>${text}</p></li>`).join('')}</ol>${link('/process/', 'See the full project process')}</section>
  <section class="studio-section home-faq"><h2>Before we talk.</h2><details><summary>Can I update the website myself?</summary><p>There is no drag-and-drop editor. Updates require coding skills, a developer or optional monthly care. Keep Running includes one round of small supplied text, photo or link edits each month. <a href="/work/source-handoff/#code-editing">See how updates work</a>.</p></details><details><summary>Does the website include SEO?</summary><p>Yes: research, complete writing, page titles, search descriptions and launch checks. Focused includes 2 original guides and Signature includes 4; these count toward the page total. <a href="/services/seo/">Ongoing SEO is optional</a>. Rankings and leads are not guaranteed.</p></details><details><summary>Do I need an ongoing subscription?</summary><p>No. You own the custom website work once it is paid for; third-party materials keep their license terms. You pay domain, hosting and paid tools directly to providers. <a href="/services/website-care/">Monthly studio help is optional</a>.</p></details><details><summary>How long will the project take?</summary><p>${e(config.projectTiming)} <a href="/process/">See the project steps</a>.</p></details></section>${close()}</div>`;

}

function pricing({offers:o}) { return pricingContent(o); }

function work({config}) { return workGallery(config); }

function about({config}) {
 return `${heading('The studio', 'Hi, I’m Terry.<br>Welcome to the studio.', 'I design and build websites, write their content, and provide SEO, website care and small repairs for service businesses.')}<section class="studio-section case-intro"><div><p class="eyebrow">A direct working relationship</p><h2 id="terry">Who you’ll work with.</h2></div><div><p>Wonder and Method is a one-person web studio founded by ${e(config.founderName||'Terry')} and operated by ${e(config.businessIdentity)}.</p>${config.founderBio ? '<p>'+e(config.founderBio)+'</p>' : ''}${config.founderProfile?`<p>My professional profile uses my full name, ${e(config.founderPublicName)}. <a href="${e(config.founderProfile)}">Meet Terry on LinkedIn</a>.</p>`:''}<p><strong>Recent studio work:</strong> the <a href="/work/#website-decisions">Wonder and Method website</a> and <a href="/work/studio-search/">October 2026 search-planning example</a> show the decisions, implementation and limits of my own work. The business concepts in the portfolio are clearly labeled; they are not presented as client projects.</p><p>I’m based in ${e(serviceCoverage(config).base)} and work online with businesses across ${e(serviceCoverage(config).region)}. See <a href="/areas/">the areas I serve</a> and <a href="/pricing/">website and monthly-service prices</a>. We agree the work in writing and review it together. You receive the paid website files and clear instructions.</p></div></section><p><a class="text-link" href="/process/">See how a project works</a> · <a href="/payments/#ownership">Read ownership and payment terms</a></p><section class="studio-section about-contact"><p class="eyebrow">A direct conversation</p><h2>Tell me about your website,<br>or the one you need.</h2><p>For project or privacy questions, <a href="mailto:${e(config.contactEmail)}">${e(config.contactEmail)}</a>.</p>${link('/contact/', 'Discuss your project', 'button')}</section>`;
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
