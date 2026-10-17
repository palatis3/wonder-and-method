const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const state={direction:'quiet',device:'desktop',scope:'signature',goal:'clarity',care:false};
const smallScreen=matchMedia('(max-width:700px)');
const menu=$('.studio-menu'),studioNav=$('#studio-nav');
const closeMenu=()=>menu.setAttribute('aria-expanded','false');
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));if(open)studioNav.querySelector('a').focus();});
studioNav.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
matchMedia('(min-width:701px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
const directions={
 quiet:{name:'Quiet',title:'Outdoor spaces.<br>A quieter kind<br>of beautiful.',description:'Thoughtful landscapes that bring people closer to home, community and the natural world.',type:['Room to breathe.','An open serif gives the words the same unhurried rhythm as the garden.'],layout:['A clear balance.','Message first, image alongside. One invitation keeps the next step easy to find.'],color:['Borrowed from nature.','Paper, deep green and natural light keep the work at the center.']},
 expressive:{name:'Expressive',title:'A little wild.<br>A lot of life.',description:'Gardens with presence. Outdoor places that pull you in and invite you to stay.',type:['A confident voice.','Bold, compact type gives a small message more presence without adding more words.'],layout:['Lead with the feeling.','The garden comes first. A larger image makes the atmosphere immediate.'],color:['Grounded contrast.','Strong green against warm stone keeps a bold composition connected to the landscape.']},
 warm:{name:'Warm',title:'A place to grow.<br>A place to belong.',description:'Welcoming gardens, made for the way you live. Thoughtfully planted. Beautifully yours.',type:['An easy welcome.','Soft serif forms and gentle spacing make the invitation feel personal.'],layout:['A softer edge.','The rounded image and relaxed composition give this direction a more familiar rhythm.'],color:['A warmer welcome.','Clay and peach borrow the warmth of brick, terracotta and late afternoon light.']}
};
const goals={clarity:'A clearer offer',trust:'More confidence in the business',inquiry:'More useful inquiries'};
const prices={focused:Number($('#project').dataset.focusedPrice),signature:Number($('#project').dataset.signaturePrice),care:Number($('#project').dataset.carePrice)};
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
function updateKit(){
 const signature=state.scope==='signature';
 $('#kit-name').textContent=signature?'Signature':'Focused';
 $('#kit-price').textContent=money(prices[state.scope]);
 $('#scope-pages').textContent=signature?'Up to five unique marketing pages, shaped around the agreed goals.':'Up to three unique marketing pages for one primary service or related service group.';
 const boundary=$('#scope-boundary');boundary.textContent=boundary.dataset[state.scope];
 $('#scope-creative-title').textContent=signature?'One signature motion moment':'Distinctive, considered art direction';
 $('#scope-creative-detail').textContent=signature?'One pre-rendered motion loop, up to 8 seconds.':'Typography, composition, imagery and restrained interaction from existing patterns. Bespoke 3D media is outside this scope.';
 $('#kit-summary').textContent=signature?'A distinctive website, with one carefully chosen motion moment.':'A focused website that makes the offer clear and the next step easy.';
 $('#kit-direction').textContent=`${directions[state.direction].name} direction · ${goals[state.goal]}`;
 $('#kit-status').textContent=`${signature?'Signature':'Focused'} website: ${money(prices[state.scope])}. ${directions[state.direction].name} direction. ${goals[state.goal]}.${state.care?` Optional Care discussion selected: ${money(prices.care)} per month, subject to agreed coverage.`:''}`;
 const query=new URLSearchParams({offer:`${state.scope}_site`,direction:state.direction,goal:state.goal});
 if(state.care)query.set('care','yes');
 $('#kit-link').href=`/contact/?${query}`;
}
function updateDirection(){
 const d=directions[state.direction],site=$('.sample-site');site.dataset.direction=state.direction;site.dataset.device=state.device;
 $('#sample-title').innerHTML=d.title;$('#sample-description').textContent=d.description;
 for(const kind of ['type','layout','color']){$(`#${kind}-rationale`).textContent=d[kind][0];$(`#${kind}-detail`).textContent=d[kind][1];}
 $('#direction-status').textContent=`${d.name} direction / ${state.device[0].toUpperCase()+state.device.slice(1)} view${smallScreen.matches?' · fitted to your screen':''}`;
 updateKit();
}
for(const group of ['direction','device','scope']) $$(`[data-${group}]`).filter(el=>el.tagName==='BUTTON').forEach(button=>button.addEventListener('click',()=>{
 state[group]=button.dataset[group];$$(`button[data-${group}]`).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));updateDirection();
}));
$('#project-goal').addEventListener('change',event=>{state.goal=event.target.value;updateKit();});
$('#kit-care').addEventListener('change',event=>{state.care=event.target.checked;updateKit();});
$('#method-toggle').addEventListener('click',event=>{const button=event.currentTarget,open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));$('#method-notes').hidden=!open;button.firstChild.textContent=open?'Hide the method ':'Show the method ';});
const sampleButton=$('.sample-cta'),sampleDetail=$('#sample-detail');
sampleButton.addEventListener('click',()=>{const open=sampleDetail.hidden;sampleDetail.hidden=!open;sampleButton.setAttribute('aria-expanded',String(open));if(open)sampleDetail.scrollIntoView({block:'nearest'});});
$('[data-close-sample]').addEventListener('click',()=>{sampleDetail.hidden=true;sampleButton.setAttribute('aria-expanded','false');sampleButton.focus();});
const range=$('#wonder-range'),assembly=$('.assembly');
range.addEventListener('input',()=>{const progress=Number(range.value)/100,show=progress>0;
 $$('[data-story]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.story===(progress>.5?'method':'wonder'))));
 assembly.style.opacity=String(progress);assembly.style.visibility=show?'visible':'hidden';assembly.style.transform=`translateY(${30*(1-progress)}px) scale(${.94+.06*progress})`;
 assembly.inert=progress<=.95;
 assembly.setAttribute('aria-hidden',String(progress<=.95));
 assembly.style.pointerEvents=progress>.95?'auto':'none';
 $$('.hero-copy > *').forEach(el=>{el.style.opacity=String(1-progress);});
 $$('.hero-copy a,.hero-copy button').forEach(el=>{el.style.visibility=progress>.95?'hidden':'visible';});
 range.setAttribute('aria-valuetext',progress>.75?'Method: a clear message, considered image and obvious next step':progress>.25?'An idea taking shape':'Wonder: an open possibility');
 $('#wonder-caption').textContent=progress>.75?'A clear message. A considered image. An obvious next step.':progress>.25?'Giving the idea a shape, a rhythm and a reason.':matchMedia('(max-width:700px)').matches?'Tap to explore, or keep scrolling.':'Move from possibility to purpose. Drag to explore / or keep scrolling.';
});
$$('[data-story]').forEach(button=>button.addEventListener('click',()=>{range.value=button.dataset.story==='method'?'100':'0';range.dispatchEvent(new Event('input'));}));
let returnFocus=null;
$$('[data-open]').forEach(button=>button.addEventListener('click',()=>{
 const dialog=document.getElementById(button.dataset.open);returnFocus=button;dialog.showModal();
 if(dialog.id==='object-dialog')loadView(Number($('#object-angle').value));
 const video=dialog.querySelector('video'),source=video?.querySelector('source');
 if(source&&!source.hasAttribute('src')){video.poster=video.dataset.poster;source.src=source.dataset.src;video.load();}
}));
$$('dialog').forEach(dialog=>{
 dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{dialog.querySelector('video')?.pause();returnFocus?.focus();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)$$('video').forEach(video=>video.pause());});
let viewRequest=0;const cache=new Map();
function loadView(index){const request=++viewRequest,src=`/assets/experience/ampersand/frames/ampersand-${String(index+1).padStart(4,'0')}.png`;
 $('#object-angle').setAttribute('aria-valuetext',`${Math.round(-25+index*50/23)} degrees`);
 if(cache.has(src)){$('#object-frame').src=src;$('#object-status').textContent='Drag or use the arrow keys to explore 24 rendered views.';return;}
 $('#object-status').textContent='Loading this view…';const img=new Image();img.onload=()=>{cache.set(src,true);if(request!==viewRequest)return;$('#object-frame').src=src;$('#object-status').textContent='Drag or use the arrow keys to explore 24 rendered views.';};img.onerror=()=>{if(request===viewRequest)$('#object-status').textContent='This view could not load. The last available still remains visible.';};img.src=src;
}
$('#object-angle').addEventListener('input',event=>loadView(Number(event.target.value)));
updateDirection();
range.dispatchEvent(new Event('input'));
