import {ART_WIDTH,ART_HEIGHT,ASSEMBLY_SECONDS,letters,letterState,pieces,pieceState,activeLetter} from './buffalo-assembly-data.js';
const stage=document.querySelector('.assembly-stage');
if(stage){
  const button=document.querySelector('.paper-controls button');
  const poster=stage.querySelector('.assembly-poster');
  const layer=stage.querySelector('.assembly-pieces');
  const wholeLayer=stage.querySelector('.assembly-letters');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const phone=matchMedia('(max-width:767px)');
  let time=0,playing=false,started=false,ready=false,inView=false,lastTick=0,request=0;
  let scale=stage.clientWidth/ART_WIDTH;
  const letterElements=letters.map(letter=>{
    const outer=document.createElement('div');outer.className='assembly-letter';outer.dataset.letter=letter.letter;
    const cut=document.createElement('div');cut.className='assembly-letter-cut';cut.style.clipPath=`polygon(${letter.clip})`;
    const art=document.createElement('img');art.src=poster.src;art.alt='';art.draggable=false;
    cut.append(art);outer.append(cut);wholeLayer.append(outer);return outer;
  });
  const elements=pieces.map(piece=>{
    const outer=document.createElement('div');outer.className='assembly-piece';
    outer.dataset.letter=String(piece.letterIndex);outer.dataset.part=piece.name;
    Object.assign(outer.style,{left:`${piece.x/ART_WIDTH*100}%`,top:`${piece.y/ART_HEIGHT*100}%`,width:`${piece.width/ART_WIDTH*100}%`,height:`${piece.height/ART_HEIGHT*100}%`});
    const cut=document.createElement('div');cut.className='assembly-cut';cut.style.clipPath=`polygon(${piece.clip})`;
    const art=document.createElement('img');art.src=poster.src;art.alt='';art.draggable=false;
    Object.assign(art.style,{width:`${ART_WIDTH/piece.width*100}%`,height:`${ART_HEIGHT/piece.height*100}%`,left:`${-piece.x/piece.width*100}%`,top:`${-piece.y/piece.height*100}%`});
    cut.append(art);outer.append(cut);layer.append(outer);return outer;
  });
  const draw=(staticFrame=false)=>{
    stage.dataset.time=(staticFrame?ASSEMBLY_SECONDS:time).toFixed(3);stage.dataset.activeLetter=staticFrame?'complete':activeLetter(time);
    letters.forEach((letter,i)=>{const s=letterState(time,letter,{staticFrame});const el=letterElements[i];
      el.style.opacity=String(s.opacity);el.style.transform=`translate3d(${s.x*scale}px,${s.y*scale}px,0)`;
      el.style.filter=`drop-shadow(0 ${11*scale}px ${8*scale}px rgba(31,34,44,.25))`;
    });
    pieces.forEach((piece,i)=>{const s=pieceState(time,piece,{staticFrame});const el=elements[i];
      el.style.opacity=String(s.opacity);
      el.style.transform=`translate3d(${s.x*scale}px,${s.y*scale}px,${s.z*scale}px) rotateZ(${s.rotate}deg) rotateY(${s.tilt}deg) scale(${s.scale})`;
      el.style.filter=s.shadow?`drop-shadow(0 ${s.shadow*scale}px ${s.shadow*.7*scale}px rgba(14,27,42,.22))`:'none';
    });
  };
  const label=()=>{
    button.textContent=playing?'Pause animation':time>=ASSEMBLY_SECONDS?'Replay animation':time>0?'Resume animation':'Play animation';
    button.setAttribute('aria-pressed',String(playing));stage.dataset.playing=String(playing);
  };
  const pause=()=>{playing=false;cancelAnimationFrame(request);label();};
  const tick=now=>{
    if(!playing)return;
    if(lastTick)time=Math.min(ASSEMBLY_SECONDS,time+(now-lastTick)/1000);
    lastTick=now;draw();
    if(time>=ASSEMBLY_SECONDS){pause();return;}request=requestAnimationFrame(tick);
  };
  const play=()=>{
    if(!ready||playing)return;
    if(time>=ASSEMBLY_SECONDS)time=0;
    started=true;playing=true;lastTick=0;stage.classList.add('is-assembling');draw();label();request=requestAnimationFrame(tick);
  };
  const automatic=()=>{if(ready&&inView&&!started&&!document.hidden&&!phone.matches&&!reduced.matches&&!navigator.connection?.saveData)play();};
  button.addEventListener('click',()=>playing?pause():play());
  new ResizeObserver(()=>{scale=stage.clientWidth/ART_WIDTH;draw(!started);}).observe(stage);
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting&&entries[0].intersectionRatio>=.25;if(!inView)pause();else automatic();},{threshold:.25}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else automatic();});
  reduced.addEventListener('change',()=>{if(reduced.matches){pause();time=0;started=false;stage.classList.remove('is-assembling');draw(true);label();}});
  poster.decode().then(()=>{ready=true;draw(true);stage.classList.add('has-pieces');button.hidden=false;label();automatic();}).catch(()=>{button.hidden=true;});
}
