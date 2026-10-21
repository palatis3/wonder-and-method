import {conceptCatalog} from './portfolio-concepts.mjs';
import captures from './city-preview-captures.json' with {type:'json'};
import {escapeHtml as e} from './shared.mjs';

const projectCopy={
 fieldwork:{category:'Landscaping website concept',description:'From garden plans to a clear request.'},
 northline:{category:'Remodeling website concept',description:'From a better room to a considered project.'},
 hearthside:{category:'Pizzeria website concept',description:'From a favorite slice to an easy pickup order.'},
};
const url=(media,key,fallback)=>'/assets'+(media?.files?.[key]?.path||'/living-city/'+fallback);
const sourceSet=(media,key,small,fallback,width)=>{
 const full=url(media,key,fallback),variant=media?.files?.[small];
 return `${variant?`/assets${variant.path} ${variant.width}w, `:''}${full} ${media?.files?.[key]?.width||width}w`;
};

export function livingCityHome(config={}){
 const media=config.livingCityMedia;
 const desktop=url(media,'desktopPoster','desktop-poster.webp');
 const mobile=url(media,'mobilePoster','mobile-poster.webp');
 return `<div class="living-city" data-living-city data-edition="living-city">
 <section class="city-hero" aria-labelledby="hero-heading">
  <div class="city-scene" data-city-stage><picture>
   <source media="(max-width:1023px)" srcset="${sourceSet(media,'mobilePoster','mobileSmallPoster','mobile-poster.webp',828)}" sizes="100vw" width="828" height="1216">
   <img class="city-poster" src="${desktop}" srcset="${sourceSet(media,'desktopPoster','desktopSmallPoster','desktop-poster.webp',1440)}" sizes="100vw" width="1440" height="960" alt="A waterfront neighborhood at dusk: Fieldwork’s glass greenhouse, Northline’s timber and stone studio, and Hearthside’s warmly lit pizzeria." fetchpriority="high" decoding="async">
  </picture><video id="city-film" class="city-film" data-city-film${config.livingCityMotionReady?` data-desktop-src="${url(media,'desktopVideo','desktop-film.mp4')}" data-mobile-src="${url(media,'mobileVideo','mobile-film.mp4')}"`:''} data-desktop-poster="${desktop}" data-mobile-poster="${mobile}" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video></div>
  <div class="city-copy"><p class="city-eyebrow"><span class="city-independent">Independent </span>web design &amp; SEO</p><h1 id="hero-heading">Small businesses.<br>Extraordinary<br>websites.</h1><p class="city-lede">Custom design, complete writing,<br class="city-desktop-break"> and SEO to help people find you.</p><div class="city-actions"><a class="city-primary" href="/contact/?request_kind=checkout#inquiry">Start a project <span aria-hidden="true">⟶</span></a><a class="city-explore" href="#website-examples">See the websites</a><div class="city-controls"><button type="button" data-city-play aria-controls="city-film" hidden>Play scene</button><button type="button" data-city-replay aria-controls="city-film" hidden>Replay scene</button><span class="city-status" data-city-status role="status" aria-live="polite"></span></div></div><p class="city-location">Based in Buffalo. Working with you online.</p></div>

 </section>
 <section class="city-projects" id="website-examples" data-city-projects aria-labelledby="city-projects-heading"><div class="city-projects-top"><div><h2 id="city-projects-heading">Explore the websites</h2><p>Fictional businesses. Website concepts by Wonder &amp; Method.</p></div><div class="city-tabs" role="tablist" aria-label="Website concepts" hidden>${conceptCatalog.map((item,index)=>`<button type="button" id="city-tab-${item.id}" role="tab" data-city-project="${item.id}" aria-controls="city-panel-${item.id}" aria-selected="${index===0}" tabindex="${index===0?0:-1}">${e(item.name)}</button>`).join('')}</div></div>
 ${conceptCatalog.map(item=>{const copy=projectCopy[item.id],desktop=captures.records.find(c=>c.id===item.id&&c.camera==='desktop'),phone=captures.records.find(c=>c.id===item.id&&c.camera==='phone');return `<article class="city-project city-project--${item.id}" id="city-panel-${item.id}" data-city-panel="${item.id}" role="tabpanel" aria-labelledby="city-tab-${item.id}" tabindex="0"><a class="city-preview" href="${item.path}" data-city-project-link aria-label="Open ${e(item.name)} website"><picture><source media="(max-width:767px)" srcset="${phone.path}" width="${phone.width}" height="${phone.height}"><img src="${desktop.path}" width="${desktop.width}" height="${desktop.height}" loading="lazy" alt="${e(item.name)} website concept, with its actual homepage design."></picture></a><div class="city-project-copy"><h3>${e(item.name)}</h3><p class="city-category">${e(copy.category)}</p><span class="city-accent" aria-hidden="true"></span><p class="city-description">${e(copy.description)}</p><a class="city-project-link" data-city-project-link href="${item.path}">Open ${e(item.name)} website <span aria-hidden="true">⟶</span></a></div></article>`;}).join('')}
 </section></div>`;
}
