import React,{useEffect,useState} from 'react';
import {AbsoluteFill,Img,Sequence,staticFile,useCurrentFrame,useVideoConfig,interpolate,Easing,delayRender,continueRender,cancelRender} from 'remotion';
export function ExperienceOpening(){
 const frame=useCurrentFrame(),{fps}=useVideoConfig();
 const [handle]=useState(()=>delayRender('Studio fonts'));
 useEffect(()=>{Promise.all([new FontFace('ExperienceSerif',`url(${staticFile('experience/serif.woff2')})`).load(),new FontFace('ExperienceSans',`url(${staticFile('experience/sans.woff2')})`).load()]).then(fonts=>{fonts.forEach(font=>document.fonts.add(font));continueRender(handle);}).catch(cancelRender);},[handle]);
 const ease={extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.22,.68,.2,1)};
 const turn=Math.min(23,Math.max(0,Math.round(interpolate(frame,[4*fps,8*fps],[0,23],ease))));
 return <AbsoluteFill style={{background:'#f5f1e8',color:'#122e35',fontFamily:'ExperienceSans'}}>
  <Sequence name="Made of this place" from={0} durationInFrames={5*fps} premountFor={fps}>
   <AbsoluteFill style={{opacity:interpolate(frame,[4*fps,5*fps],[1,0],ease)}}>
    <Img src={staticFile('experience/waterfront.webp')} style={{width:'100%',height:'100%',objectFit:'cover',scale:interpolate(frame,[0,5*fps],[1,1.04],ease)}}/>
    <div style={{position:'absolute',left:72,top:62,color:'#f5f1e8',background:'#122e35',padding:'12px 20px',fontSize:14,letterSpacing:3}}>WONDER & METHOD / BUFFALO, NY</div>
    <div style={{position:'absolute',left:72,bottom:100,color:'#f5f1e8',fontFamily:'ExperienceSerif',fontSize:110,lineHeight:.94,opacity:interpolate(frame,[0,.8*fps],[0,1],ease)}}>Made of this place.<br/>Made for what comes next.</div>
   </AbsoluteFill>
  </Sequence>
  <Sequence name="A little wonder" from={4*fps} durationInFrames={5*fps} premountFor={fps}>
   <AbsoluteFill style={{opacity:interpolate(frame,[4*fps,5*fps,8*fps,9*fps],[0,1,1,0],ease)}}>
    <div style={{position:'absolute',left:72,top:70,fontSize:14,letterSpacing:3}}>LIGHT / MATERIAL / POSSIBILITY</div>
    <Img src={staticFile(`experience/frames/ampersand-${String(turn+1).padStart(4,'0')}.png`)} style={{position:'absolute',height:700,width:600,objectFit:'contain',right:40,bottom:20}}/>
    <div style={{position:'absolute',left:72,top:280,fontFamily:'ExperienceSerif',fontSize:116,lineHeight:.92}}>A little<br/>wonder.</div>
    <div style={{position:'absolute',left:78,bottom:110,fontSize:22}}>An idea worth looking at twice.</div>
   </AbsoluteFill>
  </Sequence>
  <Sequence name="A clear method" from={8*fps} premountFor={fps}>
   <AbsoluteFill style={{opacity:interpolate(frame,[8*fps,9*fps],[0,1],ease)}}>
    <Img src={staticFile('experience/buffalo-hero.webp')} style={{height:'100%',width:'100%',objectFit:'cover'}}/>
    <div style={{position:'absolute',left:72,top:70,fontSize:14,letterSpacing:3}}>WONDER & METHOD.</div>
    <div style={{position:'absolute',left:72,top:210,fontFamily:'ExperienceSerif',fontSize:104,lineHeight:.94}}>A clear<br/>method.</div>
    <div style={{position:'absolute',left:76,top:460,fontSize:22,lineHeight:1.4}}>Websites with character.<br/>And somewhere to go.</div>
    <div style={{position:'absolute',left:76,bottom:66,fontSize:13,letterSpacing:2}}>INDEPENDENT STUDIO / BUFFALO, NY</div>
   </AbsoluteFill>
  </Sequence>
 </AbsoluteFill>;
}
