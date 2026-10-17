const film=document.querySelector('#waterfront-film');
const playButton=document.querySelector('#waterfront-film-play');
if(film&&playButton){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const portrait=matchMedia('(max-width:767px)');
 let near=false,loaded=false,userPaused=false,ignorePause=false,explicitPlayback=false;
 const autoAllowed=()=>!reduced.matches&&!navigator.connection?.saveData;
 const source=()=>portrait.matches?film.dataset.portrait:film.dataset.landscape;
 const setPoster=()=>{film.poster=portrait.matches?film.dataset.portraitPoster:film.dataset.landscapePoster;};
 const pause=()=>{if(!film.paused){ignorePause=true;film.pause();}};
 const load=()=>{if(!loaded){film.src=source();film.preload='auto';loaded=true;}};
 const play=()=>{load();film.play().catch(()=>{playButton.hidden=false;});};
 const sync=()=>{
   if(near&&!document.hidden&&(autoAllowed()||explicitPlayback)&&!userPaused)play();
   else pause();
 };
 setPoster();playButton.hidden=false;
 playButton.addEventListener('click',()=>{explicitPlayback=true;userPaused=false;play();});
 film.addEventListener('pause',()=>{if(ignorePause)ignorePause=false;else{userPaused=true;explicitPlayback=false;}});
 film.addEventListener('play',()=>{userPaused=false;if(!autoAllowed())explicitPlayback=true;playButton.hidden=true;});
 film.addEventListener('error',()=>{playButton.hidden=false;});
 new IntersectionObserver(entries=>{near=entries[0].isIntersecting;sync();},{rootMargin:'200px 0px'}).observe(film);
 portrait.addEventListener('change',()=>{
   setPoster();
   if(!loaded)return;
   const wasPlaying=!film.paused,at=film.currentTime;
   pause();film.src=source();
   film.addEventListener('loadedmetadata',()=>{if(Number.isFinite(at)&&film.duration>0)film.currentTime=at%film.duration;},{once:true});
   if(wasPlaying&&near&&!document.hidden&&(autoAllowed()||explicitPlayback))play();
 });
 reduced.addEventListener('change',()=>{explicitPlayback=false;sync();});
 navigator.connection?.addEventListener?.('change',sync);
 document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',pause);
 window.addEventListener('pageshow',sync);
}
