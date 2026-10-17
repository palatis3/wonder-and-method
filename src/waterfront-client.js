import {animate,inView} from 'motion';

// The photograph is always present. The canvas progressively adds water movement;
// missing WebGL, reduced motion and a paused scene retain the original still.
const canvas=document.querySelector('#waterfront-water');
const image=document.querySelector('#waterfront-image');
const button=document.querySelector('#waterfront-motion');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');

// Preload the model near its section, after the lightweight opening view.
// Reduced-motion and data-saving preferences keep an explicit opt-in instead.
const modelOpen=document.querySelector('#waterfront-object-open');
const modelClose=document.querySelector('#waterfront-object-close');
const modelStage=document.querySelector('#waterfront-object-stage');
const modelPoster=document.querySelector('#waterfront-object-poster');
const modelStatus=document.querySelector('#waterfront-object-status');
const modelHelp=document.querySelector('#waterfront-object-help');
if(modelOpen&&modelClose&&modelStage&&modelPoster&&modelStatus&&modelHelp){
  let frame=null,timer=0;
  const loadModel=(manual=false)=>{
    if(frame)return;
    const moveFocus=manual||document.activeElement===modelOpen;
    frame=document.createElement('iframe');
    const createdFrame=frame;
    frame.title='Interactive model of Buffalo-inspired waterfront architecture';
    frame.referrerPolicy='no-referrer';
    frame.src=modelOpen.href;
    frame.setAttribute('aria-describedby','waterfront-object-help');
    modelStage.append(frame);
    modelOpen.hidden=true;modelOpen.setAttribute('aria-expanded','true');
    modelClose.hidden=false;modelHelp.hidden=false;
    modelStatus.textContent='Opening the 3D study…';
    if(moveFocus)modelClose.focus({preventScroll:true});
    timer=setTimeout(()=>{modelStatus.textContent='Taking a moment? Try opening the model separately.';},15000);
    frame.addEventListener('load',()=>{if(frame!==createdFrame||!createdFrame.isConnected)return;clearTimeout(timer);modelPoster.hidden=true;modelStatus.textContent='Drag to explore · two fingers on a phone';},{once:true});
  };
  const modelObserver=new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting&&!document.hidden&&!reduced.matches&&!navigator.connection?.saveData){loadModel();modelObserver.disconnect();}
  },{rootMargin:'600px 0px'});
  modelObserver.observe(modelStage);
  if(!reduced.matches&&!navigator.connection?.saveData)modelStatus.textContent='An interactive waterfront study';
  modelOpen.addEventListener('click',event=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();modelObserver.disconnect();loadModel(true);
  });
  modelClose.addEventListener('click',()=>{
    modelObserver.disconnect();clearTimeout(timer);frame?.remove();frame=null;modelPoster.hidden=false;
    modelOpen.hidden=false;modelOpen.setAttribute('aria-expanded','false');
    modelClose.hidden=true;modelHelp.hidden=true;
    modelStatus.textContent='Explore the waterfront model when you’re ready';
    modelOpen.focus({preventScroll:true});
  });
}
let userPaused=false;
try{userPaused=sessionStorage.getItem('wm-water-paused')==='yes';}catch{}

const startWater=()=>{if(canvas&&image&&button){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
  if(gl){
    try{
      const shader=(type,source)=>{const value=gl.createShader(type);gl.shaderSource(value,source);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS))throw Error('Water shader unavailable');return value;};
      const program=gl.createProgram();
      gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec2 position;varying vec2 uv;void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.0,1.0);}`));
      gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
        precision mediump float;
        varying vec2 uv;
        uniform sampler2D scene;
        uniform vec2 cover;
        uniform float time;
        uniform float waterline;
        void main(){
          // A gentle camera drift gives the entire scene depth; the architecture
          // stays rigid. Only the foreground below the horizon receives ripples.
          float zoom=1.04+.025*sin(time*.28);
          vec2 p=(uv-.5)*cover/zoom+.5;
          p.x+=.006*sin(time*.22);
          p.y-=.1*(1.0-cover.y);
          float water=1.0-smoothstep(waterline-.045,waterline,p.y);
          float nearWater=water*smoothstep(.0,.18,waterline-p.y);
          p.x+=(sin(p.y*155.0+time*1.45)*.0065+sin(p.y*310.0-time*.8)*.002)*nearWater;
          p.y+=sin(p.x*42.0+p.y*180.0-time*1.1)*.0022*nearWater;
          vec3 color=texture2D(scene,clamp(p,.001,.999)).rgb;
          float gleam=max(0.0,color.r-color.b)*sin(p.y*230.0-time*1.35)*.07*nearWater;
          gl_FragColor=vec4(color+gleam,1.0);
        }`));
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Water program unavailable');gl.useProgram(program);
      const vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      const coverLocation=gl.getUniformLocation(program,'cover'),timeLocation=gl.getUniformLocation(program,'time'),waterLocation=gl.getUniformLocation(program,'waterline');
      let loaded=false,visible=true,frame=0,last=0,elapsed=0,failed=false;
      const enabled=()=>loaded&&!failed&&!userPaused&&!reduced.matches&&!document.hidden&&visible;
      const draw=()=>{const box=canvas.getBoundingClientRect(),density=Math.min(devicePixelRatio||1,1.35);const width=Math.round(box.width*density),height=Math.round(box.height*density);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}const ratio=box.width/box.height,imageRatio=image.naturalWidth/image.naturalHeight;gl.uniform2f(coverLocation,Math.min(1,ratio/imageRatio),Math.min(1,imageRatio/ratio));gl.uniform1f(timeLocation,elapsed/1000);gl.uniform1f(waterLocation,image.naturalWidth<image.naturalHeight?.286:.355);gl.drawArrays(gl.TRIANGLES,0,6);};
      const loop=now=>{if(!enabled()){frame=0;last=0;return;}if(!last||now-last>=32){if(last)elapsed+=Math.min(80,now-last);last=now;draw();}frame=requestAnimationFrame(loop);};
      const sync=()=>{button.hidden=!loaded||failed;const play=!userPaused&&!reduced.matches;button.textContent=reduced.matches?'Still atmosphere · reduced motion':play?'Pause atmosphere':'Play atmosphere';button.disabled=reduced.matches;canvas.classList.toggle('is-ready',loaded&&!reduced.matches&&!failed);if(enabled()&&!frame)frame=requestAnimationFrame(loop);if(!enabled()&&frame){cancelAnimationFrame(frame);frame=0;last=0;}};
      const load=()=>{if(!image.complete||!image.naturalWidth)return;try{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);loaded=true;draw();sync();}catch{failed=true;canvas.classList.remove('is-ready');button.hidden=true;}};
      button.addEventListener('click',()=>{userPaused=!userPaused;try{sessionStorage.setItem('wm-water-paused',userPaused?'yes':'no');}catch{}sync();});
      reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);image.addEventListener('load',load);load();
      new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:0}).observe(canvas);
      new ResizeObserver(()=>{if(loaded&&!failed)draw();}).observe(canvas);
      canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;sync();});
      window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;});
      window.addEventListener('pageshow',sync);
    }catch{canvas.classList.remove('is-ready');button.hidden=true;}
  }
}

};
// Give the decoded photograph a paint before compiling shaders and uploading
// its texture. The atmosphere then fades in over the already-visible image.
if(canvas&&image&&button){
  image.decode().then(()=>requestAnimationFrame(()=>setTimeout(startWater,0))).catch(()=>{});
}

// Semantic text stays in the document and readable without JavaScript.
if(!reduced.matches){
  const active=new Set();
  const settle=()=>{active.forEach(animation=>animation.complete());active.clear();};
  const entrance=(element,distance,duration,delay=0)=>{if(document.hidden||reduced.matches)return;const animation=animate(element,{y:[distance,0]},{duration,delay,ease:[.2,.7,.2,1]});active.add(animation);animation.then(()=>active.delete(animation));};
  document.querySelectorAll('.waterfront-headline-text').forEach((line,index)=>entrance(line,'110%',1.45,index*.18));
  document.querySelectorAll('.waterfront-hero-copy .eyebrow,.waterfront-hero-line,.waterfront-hero-copy .waterfront-button').forEach((element,index)=>entrance(element,28,1.2,.1+index*.15));
  const stops=[];
  document.querySelectorAll('.waterfront-purpose h2,.waterfront-section-top h2,.waterfront-work-copy,.waterfront-method h2,.waterfront-closing h2,.waterfront-materials figure,.waterfront-service-row').forEach((element,index)=>{
    stops.push(inView(element,()=>{entrance(element,42,1.15,(index%2)*.1);},{amount:.18}));
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)settle();});
  window.addEventListener('pagehide',settle);
  reduced.addEventListener('change',()=>{if(reduced.matches){stops.forEach(stop=>stop());settle();}},{once:true});
}
