export const DEFAULT_EDITION = 'buffalo-dusk';
export const editions = Object.freeze({
  'living-city': Object.freeze({
    id:'living-city',name:'Living City',
    alt:'A waterfront neighborhood at dusk, with Fieldwork’s greenhouse, Northline’s remodeling studio and Hearthside’s pizzeria.',
    still:'/assets/living-city/desktop-poster.webp',
    srcset:'/assets/living-city/desktop-poster.webp 1440w',
    motion:'/assets/living-city/desktop-film.mp4',duration:4.2,width:1440,height:960,
    projectAlt:'The Living City neighborhood created for the Wonder and Method website',
    socialAlt:'Three small businesses on a warmly lit waterfront — Wonder and Method',
    workDescription:'Explore my studio website: an original three-dimensional neighborhood, clear service choices and three working website concepts.',
    identityCopy:'Newsreader display type, a quiet Manrope interface and warm ivory against a deep blue evening give the website its character.',
    motionCopy:'An optional short film brings three business website concepts into view. The page, project selector and links remain available throughout, with pause, replay and still-image alternatives.',
    sceneCopy:'An original three-dimensional neighborhood connects Fieldwork, Northline and Hearthside: three fictional businesses with working website concepts.',
  }),
  'buffalo-dusk': Object.freeze({
    id: 'buffalo-dusk',
    name: 'Buffalo, at dusk',
    alt: 'A Buffalo-inspired waterfront with grain elevators, an Art Deco tower and warm architectural light reflected in deep blue water.',
    still: '/assets/editions/buffalo-dusk/still-1536.webp',
    srcset: '/assets/editions/buffalo-dusk/still-640.webp 640w, /assets/editions/buffalo-dusk/still-960.webp 960w, /assets/editions/buffalo-dusk/still-1536.webp 1536w',
    motion: '/assets/editions/buffalo-dusk/motion-1280.mp4',
    duration: 6,
    width: 1536,
    height: 1024,
    projectAlt: 'The original dusk artwork created for the Wonder and Method studio website',
    socialAlt: 'Buffalo-inspired waterfront at dusk — Wonder and Method',
    workDescription: 'Explore our own studio website: a consistent visual identity, a Buffalo-inspired dusk scene and a restrained six-second motion loop.',
    identityCopy: 'Newsreader display type, a quiet Manrope interface, lake-blue surfaces and porcelain space establish a consistent voice.',
    motionCopy: 'A fixed dusk scene with subtle water and reflection movement. One six-second loop, a pause control, and still fallbacks keep the experience usable.',
    sceneCopy: 'The waterfront establishes atmosphere without asking visitors to manipulate a model or watch a separate film. It is art-directed imagery, not documentary geography.',
  }),
  'civic-sculpture': Object.freeze({
    id: 'civic-sculpture',
    name: 'Civic Sculpture',
    alt: 'BUFFALO sculpted in warm stone on sage, with carved civic relief, fluted stone and a bronze bridge across the A.',
    still: '/assets/civic-sculpture/buffalo-civic-poster.webp',
    srcset: '/assets/civic-sculpture/buffalo-civic-mobile.webp 960w, /assets/civic-sculpture/buffalo-civic-poster.webp 1440w',
    motion: '/assets/civic-sculpture/buffalo-civic-intro.mp4',
    duration: 8,
    width: 1440,
    height: 720,
    projectAlt: 'The complete BUFFALO stone sculpture created for the Wonder and Method studio website',
    socialAlt: 'BUFFALO in carved stone and bronze on sage — Wonder and Method',
    workDescription: 'Explore my studio website: original BUFFALO stone letterforms, a quiet eight-second camera reveal and a clear path from the work to an inquiry.',
    identityCopy: 'Newsreader display type, a quiet Manrope interface and warm stone against sage give the opening its character. Clear typography and generous space carry it through the site.',
    motionCopy: 'A camera moves from a carved architectural detail to the full BUFFALO sculpture. The eight-second introduction plays once and holds the complete word, with pause, resume and replay controls. Reduced-motion and data-saving settings begin with a still.',
    sceneCopy: 'Original three-dimensional letterforms bring stone, civic relief and a bronze bridge into one composition. These details are Buffalo-inspired allusions, not replicas of individual landmarks.',
  }),
});
export function selectedEdition(config){
  const base=editions[config.homeEdition]||editions[DEFAULT_EDITION];
  const media=config.civicMedia;
  if(base.id!=='civic-sculpture'||!media)return base;
  const finale=media.revision==='finale-v2';
  const traffic=finale&&media.ambientTraffic===true;
  return {...base,still:`/assets${media.poster}`,srcset:`${media.smallPoster?`/assets${media.smallPoster} ${media.smallPosterWidth}w, `:''}/assets${media.mobilePoster} ${media.mobilePosterWidth}w, /assets${media.poster} ${media.posterWidth}w`,motion:`/assets${media.video}`,mobileMotion:media.mobileVideo?`/assets${media.mobileVideo}`:null,mobileAmbientMotion:media.mobileAmbientVideo?`/assets${media.mobileAmbientVideo}`:null,ambientMotion:media.ambientVideo?`/assets${media.ambientVideo}`:null,duration:media.durationSeconds,ambientDuration:media.ambientDurationSeconds,width:media.width,height:media.height,...(finale?{
    alt:traffic?'BUFFALO sculpted in warm stone on sage, with matching sculpted cars on a curled bronze bridge beneath the word and a small bronze fan above the O.':'BUFFALO sculpted in warm stone on sage, with a curled bronze bridge beneath the word and a small bronze fan above the O.',
    projectAlt:traffic?'The complete BUFFALO stone sculpture with matching sculpted cars, a curled bronze bridge and a small fan above the O':'The complete BUFFALO stone sculpture with its bronze bridge underline and fan finale',
    socialAlt:traffic?'BUFFALO in carved stone with sculpted cars, a bronze bridge and fan on sage; Wonder and Method':'BUFFALO in carved stone with a bronze bridge and fan on sage; Wonder and Method',
    workDescription:traffic?'Explore my studio website: a ten-second BUFFALO reveal, matching sculpted cars crossing a bronze bridge and a gentle four-second ambient cycle.':'Explore my studio website: original BUFFALO stone letterforms, a ten-second sculptural reveal and a restrained ambient motion study.',
    motionCopy:`A camera reveals the BUFFALO sculpture, followed by a curled bronze bridge beneath the word and a small fan above the O. The ten-second introduction plays once, then a seamless four-second ambient cycle gently rocks the complete composition${traffic?' while matching sculpted cars travel continuously across the bridge':''}. Pause, Resume and Replay introduction remain available; reduced-motion and data-saving settings begin with a still.`,
    sceneCopy:`Original three-dimensional letterforms bring stone, civic relief, a curled bronze bridge, a small fan${traffic?' and matching sculpted cars':''} into one composition. These are Buffalo-inspired allusions, not replicas of individual landmarks.`,
  }:{})};
}
