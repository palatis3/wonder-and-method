import preservedMedia from '../public/civic-sculpture/manifest.json' with {type:'json'};
import defaultOffers from '../config/offers.json' with {type:'json'};
import {selectedEdition} from './editions.mjs';
import {escapeHtml as e} from './shared.mjs';

export const BUFFALO_STUDY_PATH='/work/buffalo-civic/';

// The archived artwork keeps its identity when the homepage changes edition.
export function buffaloStudyMedia(config={}){
 return selectedEdition({...config,homeEdition:'civic-sculpture',civicMedia:config.civicMedia||preservedMedia});
}

// Public URLs needed by this page, including its responsive still and phone films.
export function buffaloStudyAssetPaths(config={}){
 const art=buffaloStudyMedia(config);
 const posters=art.srcset.split(',').map(source=>source.trim().split(/\s+/)[0]);
 return [...new Set([art.still,...posters,...(config.civicMotionReady===false?[]:[art.motion,art.mobileMotion,...(config.civicAmbientReady===false?[]:[art.ambientMotion,art.mobileAmbientMotion])])].filter(Boolean))];
}

function sources(desktop,phone){
 return `${phone?`<source src="${e(phone)}" media="(max-width: 767px)" type="video/mp4">`:''}<source src="${e(desktop)}" type="video/mp4">`;
}

function still(art){
 return `<picture><img class="buffalo-study-film" src="${e(art.still)}" srcset="${e(art.srcset)}" sizes="(max-width: 767px) calc(100vw - 40px), 1120px" width="${art.width}" height="${art.height}" alt="${e(art.alt)}" fetchpriority="high" decoding="async"></picture>`;
}

export function buffaloStudy(config={},offers=defaultOffers){
 const art=buffaloStudyMedia(config);
 const ready=config.civicMotionReady!==false;
 const ambient=ready&&config.civicAmbientReady!==false&&art.ambientMotion;
 return `<article class="buffalo-study">
 <header class="page-intro"><p class="eyebrow">Wonder and Method / studio animation</p><h1>Buffalo Civic: a 3D homepage animation.</h1><p class="lede">A custom 3D homepage animation inspired by Buffalo.</p><p>A custom 3D animation made for a Wonder and Method homepage, showing how motion can give a website its own character. Watch the original introduction and the optional loop below.</p></header>
 <figure class="buffalo-study-player">
 ${ready?`<video id="buffalo-intro" class="buffalo-study-film" controls playsinline preload="none" poster="${e(art.still)}" width="${art.width}" height="${art.height}" aria-label="Buffalo Civic introduction" aria-describedby="buffalo-intro-description">${sources(art.motion,art.mobileMotion)}<p><a href="${e(art.motion)}">Open the Buffalo Civic introduction (MP4)</a>.</p></video>`:still(art)}
 <figcaption id="buffalo-intro-description">${ready?`${art.duration}-second introduction. `:''}A camera reveals BUFFALO in warm stone against sage, with carved architectural details, a bronze bridge and a small fan above the O. The animation is silent.${ready?' Use the video controls to play, pause or replay.':' The complete sculpture is shown while the film is unavailable.'}</figcaption>
 </figure>
 <section class="studio-section buffalo-study-notes" aria-labelledby="buffalo-art-heading"><h2 id="buffalo-art-heading">A city, suggested through lettering.</h2><p>Fluted stone, civic relief and bronze structure give each letter its own detail. A curled bridge underlines the word; small sculpted cars carry the movement into the finished composition.</p><p>These are Buffalo-inspired allusions, not replicas of individual landmarks. This is an animation and art study made for the studio.</p></section>
 ${ambient?`<section class="studio-section buffalo-study-ambient" aria-labelledby="buffalo-ambient-heading"><h2 id="buffalo-ambient-heading">A quieter looping version.</h2><p id="buffalo-ambient-description">A ${art.ambientDuration}-second silent loop holds the complete sculpture in view while cars cross the bronze bridge and the composition gently turns. Playback begins when you choose Play; use the video controls to pause.</p><video id="buffalo-ambient" class="buffalo-study-film" controls playsinline loop preload="none" poster="${e(art.still)}" width="${art.width}" height="${art.height}" aria-label="Buffalo Civic ambient animation" aria-describedby="buffalo-ambient-description">${sources(art.ambientMotion,art.mobileAmbientMotion)}<p><a href="${e(art.ambientMotion)}">Open the Buffalo Civic ambient study (MP4)</a>.</p></video></section>`:''}
 <section class="studio-closing"><h2>Give your homepage its own movement.</h2><p>${e(offers.signature_site.public_name)} includes one agreed original animated homepage feature or one 3D centerpiece. Other custom animation is scoped and priced separately, with an appropriate still version and playback controls.</p><a class="button" href="/contact/?offer=unsure&amp;goal=new_website&amp;request_kind=question#inquiry">Ask about custom homepage animation</a><p><a href="/pricing/#website-packages">Compare website packages</a></p></section>
 <p class="buffalo-study-back"><a class="text-link" href="/work/">View studio work</a></p>
 </article>`;
}
