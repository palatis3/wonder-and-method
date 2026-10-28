const directions={
 quiet:{explanation:'A balanced layout gives the service and the garden equal space.',type:'Serif headings give the introduction a calm rhythm.',layout:'Balanced space for the service and the garden.',color:'Warm paper and forest green.'},
 expressive:{explanation:'Stronger type and a larger image make the first impression more direct.',type:'A bold sans-serif heading makes the introduction more direct.',layout:'A larger garden drawing and stronger visual hierarchy.',color:'Forest green with clear paper-colored text.'},
 warm:{explanation:'Warmer surfaces and softer edges make the same service feel more welcoming.',type:'Serif headings keep the introduction familiar.',layout:'Softer grouping and a rounded garden frame.',color:'Warm stone, forest green and a small clay accent.'}
};

for(const root of document.querySelectorAll('[data-design-desk]')){
 if(root.dataset.deskReady)continue;
 const controls=root.querySelector('[data-desk-controls]'),widthControls=root.querySelector('[data-desk-width-controls]'),space=root.querySelector('[data-desk-space]'),container=root.querySelector('[data-desk-container]'),specimen=root.querySelector('[data-desk-specimen]'),status=root.querySelector('[data-desk-status]');
 if(!controls||!widthControls||!space||!container||!specimen||!status)continue;
 const state={direction:'quiet',width:'desktop',wide:false};
 const fit=root.querySelector('[data-desk-fit]');
 const updateWidth=()=>{
  const wide=space.clientWidth>=560;
  if(!wide&&widthControls.contains(document.activeElement))controls.querySelector('input[name="desk-direction"]:checked').focus({preventScroll:true});
  state.wide=wide;widthControls.hidden=!wide;fit.textContent=wide?'Compare the same content at two widths.':'Preview fits your screen.';
  container.dataset.width=wide?state.width:'fit';
 };
 controls.addEventListener('change',event=>{
  const input=event.target;if(!(input instanceof HTMLInputElement))return;
  if(input.name==='desk-direction'&&directions[input.value]){
   state.direction=input.value;specimen.dataset.direction=state.direction;
   const copy=directions[state.direction];
   for(const key of ['explanation','type','layout','color'])root.querySelector(`[data-desk-${key}]`).textContent=copy[key];
   status.textContent=copy.explanation;
  }else if(input.name==='desk-width'&&['desktop','phone'].includes(input.value)){
   state.width=input.value;updateWidth();status.textContent=state.width==='phone'?'The example now uses a narrow layout.':'The example now uses the available wide layout.';
  }
 });
 try{
  if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(updateWidth);observer.observe(space);}else window.addEventListener('resize',updateWidth,{passive:true});
  updateWidth();root.dataset.deskReady='true';root.querySelector('[data-desk-static]').hidden=true;controls.hidden=false;
 }catch{/* Keep the useful server-rendered example if enhancement is unavailable. */}
}
