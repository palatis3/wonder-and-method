import {animate,stagger,inView} from 'motion';
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const video=document.querySelector('#ribbon-film');
const toggle=document.querySelector('#motion-toggle');
let enabled=!preference.matches;
const animations=[];
function update(){toggle.setAttribute('aria-pressed',String(enabled));toggle.innerHTML=enabled?'Pause motion <span aria-hidden="true">Ⅱ</span>':'Play motion <span aria-hidden="true">↗</span>';}
function playVideo(){
 if(!video.querySelector('source').src){video.querySelector('source').src=video.querySelector('source').dataset.src;video.load();}
 return video.play().catch(()=>{enabled=false;update();});
}
function setMotion(value){enabled=value;if(enabled)playVideo();else{video.pause();animations.forEach(control=>control.complete());}update();}
toggle.addEventListener('click',()=>setMotion(!enabled));
preference.addEventListener('change',()=>setMotion(!preference.matches));
if(enabled){
 animations.push(animate('.line>span',{y:['105%','0%'],opacity:[0,1]},{duration:1.1,delay:stagger(.13),ease:[.22,1,.36,1]}));
 animations.push(animate('.hero-art',{opacity:[0,1],y:[25,0]},{duration:1.2,delay:.25,ease:[.22,1,.36,1]}));
 playVideo();
}
inView('.reveal',element=>{if(enabled)animations.push(animate(element,{opacity:[0,1],y:[35,0]},{duration:.8,ease:[.22,1,.36,1]}));},{amount:.15});
document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();else if(enabled)playVideo();});
update();
