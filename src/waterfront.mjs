import {money,escapeHtml} from './shared.mjs';
import {journalCard} from './journal.mjs';

const detail=(name,alt,label)=>`<figure class="waterfront-detail"><img src="/assets/waterfront/${name}.webp" srcset="/assets/waterfront/${name}-180.webp 180w, /assets/waterfront/${name}-360.webp 360w, /assets/waterfront/${name}.webp 720w" sizes="(max-width:767px) calc((100vw - 64px)/2), (max-width:1440px) 20vw, 260px" width="720" height="480" loading="lazy" alt="${alt}"><figcaption>${label}</figcaption></figure>`;

const film=()=>`<div class="waterfront-film-player"><video id="waterfront-film" controls loop muted playsinline preload="none" poster="/assets/waterfront/film-poster-landscape.webp" data-landscape="/assets/waterfront/film-landscape.mp4" data-portrait="/assets/waterfront/film-portrait.mp4" data-landscape-poster="/assets/waterfront/film-poster-landscape.webp" data-portrait-poster="/assets/waterfront/film-poster-portrait.webp" width="1440" height="900" aria-label="A silent four-second film of Buffalo-inspired waterfront architecture"><a href="/assets/waterfront/film-landscape.mp4">Watch the studio film</a></video><button class="waterfront-film-play" id="waterfront-film-play" type="button" hidden>Play film</button><noscript><p><a href="/assets/waterfront/film-landscape.mp4">Watch the studio film</a></p></noscript></div>`;

const motionShowcase=()=>`<section class="waterfront-work waterfront-wrap" id="motion-study">
  <div class="waterfront-work-copy"><p class="eyebrow">The studio, in motion</p><h2>Made of this place.<br>Made to move.</h2><p>Warm concrete. Moving water. A new perspective. An original architectural study, shaped by light, texture and a carefully considered sense of movement.</p><a class="waterfront-text-link" href="/work/">Explore the work <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a></div>
  <figure class="waterfront-home-film">${film()}<figcaption>An original studio motion study</figcaption></figure>
</section>`;

export function waterfrontHome(offers,guides=[]){return `
<section class="waterfront-hero" aria-labelledby="waterfront-title">
  <div class="waterfront-scene" aria-hidden="true">
    <picture><source media="(max-width:767px)" srcset="/assets/waterfront/hero-mobile-450.webp 450w, /assets/waterfront/hero-mobile.webp 714w" sizes="100vw"><img id="waterfront-image" src="/assets/waterfront/hero-desktop.webp" width="1584" height="992" fetchpriority="high" alt=""></picture>
    <canvas id="waterfront-water"></canvas>
  </div>
  <div class="waterfront-hero-copy">
    <p class="eyebrow">Buffalo, New York / Independent web studio</p>
    <h1 id="waterfront-title"><span class="waterfront-headline-line"><span class="waterfront-headline-text">Make something</span></span><span class="waterfront-headline-line"><span class="waterfront-headline-text">worth noticing.</span></span></h1>
    <p class="waterfront-hero-line">Built by the water. Made to move.</p>
    <a class="waterfront-button" href="#motion-study">See the studio in motion <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a>
  </div>
  <div class="waterfront-hero-foot"><button class="waterfront-motion" id="waterfront-motion" type="button" hidden>Play atmosphere</button><span class="waterfront-motto">Same waters.<br>Brighter work.</span></div>
</section>
<section class="waterfront-intro waterfront-wrap" id="the-work">
  <h2>Wonder opens the possibility.<br> Method gives it a place to go.</h2>
  <div class="waterfront-materials">${detail('concrete-detail','Warm light across the weathered concrete of a grain silo','01 / Character, built in.')}${detail('water-detail','Golden light reflected in deep teal water','02 / Always moving forward.')}</div>
</section>
${motionShowcase()}
<section class="waterfront-purpose waterfront-wrap">
  <p class="eyebrow">A Buffalo point of view</p>
  <div><h2>A little more character.<br>A lot more intention.</h2><p>There’s something about this place. The scale of the grain elevators. The light on the water. The pride in making something well.</p><p>That spirit belongs online, too. We make distinctive websites and practical SEO for service businesses—with a clear story, a useful next step, and the care your business deserves.</p><a class="waterfront-text-link" href="/about/">Meet Wonder & Method <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a></div>
</section>
<section class="waterfront-services" aria-labelledby="waterfront-services-title"><div class="waterfront-wrap">
  <div class="waterfront-section-top"><p class="eyebrow">What we make</p><h2 id="waterfront-services-title">Good-looking.<br>Hard-working.</h2><p>A distinctive first impression.<br>A considered path to what comes next.</p></div>
  <a class="waterfront-service-row" href="/services/web-design/"><span class="waterfront-index">01</span><div><h3>Websites with a point of view.</h3><p>Custom design. Clear content. A path from interest to inquiry.</p></div><span class="waterfront-service-meta">Builds from ${money(offers.focused_site.public_price)} <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></span></a>
  <a class="waterfront-service-row" href="/services/seo/"><span class="waterfront-index">02</span><div><h3>Search work with a purpose.</h3><p>A useful priority, an implemented improvement, and work you can inspect.</p></div><span class="waterfront-service-meta">Explore SEO <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></span></a>
  <div class="waterfront-services-note"><p>Clear scope. Paid work you own.<br>Ongoing services only when they’re useful.</p><a class="waterfront-text-link" href="/pricing/">Scope & pricing <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a></div>
</div></section>
<section class="waterfront-offers waterfront-wrap"><p class="eyebrow">A clear starting point</p><h2>The right scope.<br>Room to do it well.</h2><div class="waterfront-offer-grid">${['focused_site','signature_site'].map((key,i)=>{const offer=offers[key];return `<article><p class="eyebrow">0${i+1} / ${i?'A broader story':'One clear service'}</p><h3>${escapeHtml(offer.public_name)}</h3><p class="waterfront-price">${money(offer.public_price)} <span>USD / fixed scope</span></p><details><summary>What fits this scope</summary><p>${escapeHtml(offer.included_pages)}</p><p>${escapeHtml(offer.page_scope)}</p></details><a class="waterfront-text-link" href="/pricing/">Explore ${i?'Signature':'Focused'} <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a></article>`;}).join('')}</div></section>
<section class="waterfront-object waterfront-wrap" aria-labelledby="waterfront-object-title">
  <div class="waterfront-object-copy"><p class="eyebrow">A different perspective</p><h2 id="waterfront-object-title">Character.<br>In every dimension.</h2><p>A small tribute to the structures that shaped our waterfront. Explore the grain elevators, warm concrete, and quiet water in this original studio model.</p></div>
  <div class="waterfront-object-view">
    <div class="waterfront-object-stage" id="waterfront-object-stage"><img id="waterfront-object-poster" src="/assets/waterfront/grain-model.webp" width="1400" height="1100" loading="lazy" alt="A sculptural model of eight concrete grain silos, a tall headhouse, and a small kayak beside a teal-water quay"></div>
    <div class="waterfront-object-controls"><a class="waterfront-button" id="waterfront-object-open" href="https://my.spline.design/wonderampmethodwaterampgrain-cLY8VFqLzhnMnS6ECvQsRl16/" target="_blank" rel="noopener noreferrer" aria-controls="waterfront-object-stage" aria-expanded="false">Explore in 3D <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a><button class="waterfront-text-link" id="waterfront-object-close" type="button" hidden>Return to still</button><p id="waterfront-object-status" role="status">Drag to explore a new perspective</p></div>
    <p class="waterfront-object-help" id="waterfront-object-help" hidden>Drag to rotate. On a phone, use two fingers. <a href="https://my.spline.design/wonderampmethodwaterampgrain-cLY8VFqLzhnMnS6ECvQsRl16/" target="_blank" rel="noopener noreferrer">Open the model separately</a>.</p>
  </div>
</section>
<section class="waterfront-method waterfront-wrap"><p class="eyebrow">Wonder, with method</p><h2>Make room for the idea.<br>Give it a way forward.</h2><ol>
  <li><span>01 / Understand</span><h3>Find the point.</h3><p>Start with your business, your customer, and the decision your website needs to help them make.</p></li>
  <li><span>02 / Create</span><h3>Give it character.</h3><p>Bring the story to life through composition, language, imagery, and thoughtful interaction.</p></li>
  <li><span>03 / Deliver</span><h3>Make it work.</h3><p>Test the experience, refine the details, and hand over the paid work with clear documentation.</p></li>
</ol><a class="waterfront-text-link" href="/process/">See the complete process <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a></section>
${guides.length?`<section class="waterfront-journal waterfront-wrap"><p class="eyebrow">Notes from the studio</p><h2>Good decisions<br>start with clarity.</h2><div class="journal-grid">${guides.slice(0,3).map(journalCard).join('')}</div><a class="waterfront-text-link" href="/guides/">Explore the journal ↗</a></section>`:''}
<section class="waterfront-closing"><div class="waterfront-wrap"><p class="eyebrow">Your next chapter</p><h2>Let’s make it<br>worth noticing.</h2><a class="waterfront-button" href="/contact/">Start a conversation <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a><p class="waterfront-closing-location">Rooted in Erie County.<br>Open to what’s next.</p></div></section>
`}

export function waterfrontStudy(){return `<figure class="waterfront-study"><a href="/" aria-label="Explore the Wonder and Method studio website"><img src="/assets/waterfront/hero-desktop.webp" width="1584" height="992" loading="lazy" alt="Original Buffalo-inspired waterfront artwork with sunset light and grain elevators"></a><figcaption><span>Wonder and Method / Our studio website</span><a href="/">Explore the live experience <img class="waterfront-arrow" src="/assets/waterfront/arrow-up-right.svg" width="18" height="18" alt="" aria-hidden="true"></a></figcaption><p>Original waterfront artwork, editorial design and interactive water motion. A self-initiated expression of the studio’s approach.</p></figure>
<section class="waterfront-film-section" aria-labelledby="waterfront-film-title"><p class="eyebrow">A motion study</p><h2 id="waterfront-film-title">Made of this place.<br>Made to move.</h2><p>A quiet camera movement around our original grain-elevator model, with changing water and warm architectural light.</p>${film()}<p class="waterfront-film-credit">An original studio film, composed around light, texture and movement.</p></section>`}
