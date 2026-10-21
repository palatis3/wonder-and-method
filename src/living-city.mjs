import {conceptCatalog} from './portfolio-concepts.mjs';
import captures from './city-preview-captures.json' with {type:'json'};
import {escapeHtml as e,money} from './shared.mjs';

const projectCopy={
 fieldwork:{category:'Landscaping website concept',stage:'Landscaping concept',detail:'Garden services. A clear sample request.',description:'A calm, green website for a landscaping business. Homeowners can compare seasonal care, planting refreshes, and garden assessments, then try a request with their chosen service already selected.',features:['Three garden services, clearly explained','A service choice carried into the form','Sample requests with location and timing'],sample:'Try a sample request'},
 northline:{category:'Remodeling website concept',stage:'Remodeling concept',detail:'Remodeling, explained. A useful project brief.',description:'A restrained, architectural website for a remodeling business. It explains kitchens, bathrooms, and interior changes before guiding a homeowner through a sample request about the room and preferred timing.',features:['Kitchen, bathroom, and interior service details','A clear introduction to the project process','A sample brief with room priorities and timing'],sample:'Try a sample request'},
 hearthside:{category:'Pizzeria website concept',stage:'Pizzeria concept',detail:'Menu, prices, and a sample pickup order.',description:'A warm, illustrated website for a neighborhood pizzeria. Ingredients and sample prices sit beside each pizza, with a simple preview for quantity, an example pickup time, and the sample total.',features:['Three pizzas with ingredients and sample prices','A pizza choice carried into the preview','Quantity, example pickup time, and sample subtotal'],sample:'Try a sample order'},
};
const url=(media,key,fallback)=>'/assets'+(media?.files?.[key]?.path||'/living-city/'+fallback);
const sourceSet=(media,key,small,fallback,width)=>{
 const full=url(media,key,fallback),variant=media?.files?.[small];
 return `${variant?`/assets${variant.path} ${variant.width}w, `:''}${full} ${media?.files?.[key]?.width||width}w`;
};
const previewSourceSet=capture=>[...(capture.variants||[]),capture].map(item=>`${item.path} ${item.width}w`).join(', ');

// Decorative star maps are original patterns, with no interactive or spoken content.
const nightSky=`<div class="city-night" aria-hidden="true">
 <span class="city-moon"><span class="city-moon-halo"></span><span class="city-moon-surface"></span></span>
 <svg class="city-constellations" viewBox="0 0 520 180" fill="none" focusable="false">
  <g class="city-constellation city-constellation--one"><path class="city-star-route" pathLength="1" d="M26 92 73 58 119 78 151 33 191 49 221 23"/><g class="city-map-stars"><circle cx="26" cy="92" r="1.7"/><circle cx="73" cy="58" r="2.5"/><circle cx="119" cy="78" r="1.8"/><circle cx="151" cy="33" r="2.5"/><circle cx="191" cy="49" r="1.6"/><circle cx="221" cy="23" r="2"/></g><path class="city-star-glint" d="M73 50v16m-8-8h16M151 26v14m-7-7h14"/></g>
  <g class="city-constellation city-constellation--two"><path class="city-star-route" pathLength="1" d="M260 116 292 87 332 101 350 143 306 153 292 87M332 101 381 78"/><g class="city-map-stars"><circle cx="260" cy="116" r="1.6"/><circle cx="292" cy="87" r="2.3"/><circle cx="332" cy="101" r="1.7"/><circle cx="350" cy="143" r="2"/><circle cx="306" cy="153" r="1.5"/><circle cx="381" cy="78" r="2.3"/></g><path class="city-star-glint" d="M292 80v14m-7-7h14M381 71v14m-7-7h14"/></g>
 </svg>
 <span class="city-meteor city-meteor--one"></span><span class="city-meteor city-meteor--two"></span>
</div>`;

export function livingCityHome(config={},offers){
 const media=config.livingCityMedia;
 const desktop=url(media,'desktopPoster','desktop-poster.webp');
 const mobile=url(media,'mobilePoster','mobile-poster.webp');
 const initialMobilePoster=media?.files?.mobileWebPoster?'mobileWebPoster':'mobilePoster';
 return `<div class="living-city" data-living-city data-edition="living-city">
 <section class="city-hero" data-city-stage aria-labelledby="hero-heading">
  <div class="city-stars" aria-hidden="true">${Array.from({length:18},()=>'<span class="city-star"></span>').join('')}</div>
  <div class="city-scene"><picture>
   <source media="(max-width:1023px)" srcset="${sourceSet(media,initialMobilePoster,'mobileSmallPoster','mobile-poster.webp',828)}" sizes="100vw" width="828" height="1216">
   <img class="city-poster" src="${desktop}" srcset="${sourceSet(media,'desktopPoster','desktopSmallPoster','desktop-poster.webp',1440)}" sizes="100vw" width="1440" height="960" alt="A waterfront neighborhood at dusk: Fieldwork’s glass greenhouse, Northline’s timber and stone studio, and Hearthside’s warmly lit pizzeria." fetchpriority="high" decoding="async">
  </picture><video id="city-film" class="city-film" data-city-film${config.livingCityMotionReady?` data-desktop-src="${url(media,'desktopVideo','desktop-film.mp4')}" data-mobile-src="${url(media,'mobileVideo','mobile-film.mp4')}"`:''} data-desktop-poster="${desktop}" data-mobile-poster="${mobile}" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video></div>
  <div class="city-copy"><p class="city-eyebrow"><span class="city-independent">Independent </span>web design &amp; SEO</p><h1 id="hero-heading">Web design &amp; SEO.<br>Built for small businesses.</h1><p class="city-lede">Custom websites, clear writing, and SEO to help customers find your business and get in touch. Made in Buffalo.</p><div class="city-actions"><a class="city-primary" href="/contact/">Start a project <span aria-hidden="true">⟶</span></a><a class="city-explore" href="#website-examples">See the websites</a></div><p class="city-location">${offers?`Websites from ${money(offers.launch_site.public_price)}. `:'Based in Buffalo. '}Serving New York, Pennsylvania, and Ohio.</p>
  <div class="city-controls"><button type="button" data-city-play aria-controls="city-film" hidden>Play motion</button><button type="button" data-city-replay aria-controls="city-film" hidden>Replay introduction</button><span class="city-status" data-city-status role="status" aria-live="polite"></span></div></div>
  <div class="city-showcase" role="group" aria-label="A closer look at the website concepts">
   ${nightSky}
   ${conceptCatalog.map((item,index)=>{const copy=projectCopy[item.id],capture=captures.records.find(c=>c.id===item.id&&c.camera==='desktop');return `<article class="city-reveal city-reveal--${item.id}" data-city-showcase="${item.id}" hidden><div class="city-reveal-bar" aria-hidden="true"><span class="city-reveal-dots">● ● ●</span><span>${e(item.name.toLowerCase())} / website concept</span><span>0${index+1} / 03</span></div><div class="city-reveal-window"><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-city-preview-src="${capture.path}" data-city-preview-srcset="${previewSourceSet(capture)}" width="${capture.width}" height="${capture.height}" alt="" decoding="async"><span class="city-reveal-gleam" aria-hidden="true"></span></div><div class="city-reveal-copy"><p class="city-reveal-category">${e(copy.stage)}</p><p class="city-reveal-title">${e(item.name)}</p><p>${e(copy.detail)}</p><a href="#website-examples" data-city-jump="${item.id}">See ${e(item.name)} details <span aria-hidden="true">↓</span></a></div></article>`;}).join('')}
  </div>

 </section>
 <section class="city-projects" id="website-examples" data-city-projects aria-labelledby="city-projects-heading"><div class="city-projects-top"><div><h2 id="city-projects-heading">Explore the websites</h2><p>Three fictional businesses. Browse the pages and try the sample forms.</p></div><div class="city-tabs" role="tablist" aria-label="Website concepts" hidden>${conceptCatalog.map((item,index)=>`<button type="button" id="city-tab-${item.id}" role="tab" data-city-project="${item.id}" aria-controls="city-panel-${item.id}" aria-selected="${index===0}" tabindex="${index===0?0:-1}">${e(item.name)}</button>`).join('')}</div></div>
 ${conceptCatalog.map(item=>{const copy=projectCopy[item.id],desktop=captures.records.find(c=>c.id===item.id&&c.camera==='desktop');return `<div class="city-project city-project--${item.id}" id="city-panel-${item.id}" data-city-panel="${item.id}" role="tabpanel" aria-labelledby="city-tab-${item.id}" tabindex="0"><a class="city-preview" href="${item.path}" data-city-project-link tabindex="-1" aria-label="Open ${e(item.name)} website"><picture><img src="${desktop.path}" srcset="${previewSourceSet(desktop)}" sizes="(max-width:767px) 90vw, (max-width:1023px) 84vw, 52vw" width="${desktop.width}" height="${desktop.height}" loading="lazy" alt="${e(item.name)} website concept, with its actual homepage design."></picture></a><div class="city-project-copy"><h3>${e(item.name)}</h3><p class="city-category">${e(copy.category)}</p><span class="city-accent" aria-hidden="true"></span><p class="city-description">${e(copy.description)}</p><ul class="city-features">${copy.features.map(feature=>`<li>${e(feature)}</li>`).join('')}</ul><div class="city-project-actions"><a class="city-project-link" data-city-project-link href="${item.path}">Explore ${e(item.name)} <span aria-hidden="true">⟶</span></a><a class="city-sample-link" data-city-project-link href="${item.path}request/">${e(copy.sample)}</a></div></div></div>`;}).join('')}
 <p class="city-demo-note">Website concepts by Wonder &amp; Method. Sample forms send and save nothing. No orders or payments are taken.</p>
 </section></div>`;
}
