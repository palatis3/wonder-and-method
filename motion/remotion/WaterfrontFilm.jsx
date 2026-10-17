import React,{useEffect,useState} from 'react';
import {AbsoluteFill,CanvasImage,Sequence,staticFile,useCurrentFrame,useVideoConfig,interpolate,Easing,delayRender,continueRender,cancelRender} from 'remotion';

let fontPromise;
function useStudioFonts(){
 const [handle]=useState(()=>delayRender('Load the studio typefaces'));
 useEffect(()=>{
   fontPromise??=Promise.all([
     new FontFace('WaterfrontSerif',`url(${staticFile('waterfront-fonts/cormorant-regular.woff2')})`).load(),
     new FontFace('WaterfrontSans',`url(${staticFile('waterfront-fonts/plex.woff2')})`).load()
   ]).then(fonts=>fonts.forEach(font=>document.fonts.add(font)));
   fontPromise.then(()=>continueRender(handle)).catch(cancelRender);
 },[handle]);
}

export function WaterfrontFilm({title}){
 useStudioFonts();
 const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(),portrait=height>width;
 return <AbsoluteFill style={{background:'#f5f1e8',color:'#122e35',fontFamily:'WaterfrontSans,Arial,sans-serif'}}>
   <Sequence name="Original Blender camera and water" from={0} premountFor={fps}>
     <CanvasImage src={staticFile(`waterfront-frames/${String(frame%96+1).padStart(4,'0')}.png`)} style={{position:'absolute',width:portrait?1000:1000,height:900,right:portrait?40:-10,bottom:portrait?30:5,objectFit:'contain'}} />
   </Sequence>
   <Sequence name="Water and Grain typography" from={0} premountFor={fps}>
     <div style={{position:'absolute',left:80,top:portrait?95:90,fontSize:24,letterSpacing:4}}>WONDER & METHOD / BUFFALO</div>
     <div style={{position:'absolute',left:80,top:portrait?200:285,fontFamily:'WaterfrontSerif,Georgia,serif',fontSize:portrait?148:124,lineHeight:.88,letterSpacing:-5,width:portrait?920:550,translate:`0 ${interpolate(frame,[0,.7*fps],[12,0],{extrapolateRight:'clamp',easing:Easing.bezier(.2,.7,.2,1)})}px`}}>{title.split(' & ')[0]}<br/>& {title.split(' & ')[1]}</div>
     <div style={{position:'absolute',left:80,top:portrait?485:590,fontFamily:'WaterfrontSerif,Georgia,serif',fontSize:portrait?46:40,lineHeight:1.15}}>Made of this place.<br/>Made to move.</div>
   </Sequence>
   <Sequence name="Studio film signature" from={0} premountFor={fps}>
     <div style={{position:'absolute',left:80,bottom:60,fontSize:portrait?20:20,letterSpacing:3}}>AN ORIGINAL WATERFRONT STUDY</div>
   </Sequence>
 </AbsoluteFill>;
}
