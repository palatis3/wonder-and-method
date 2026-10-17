import React from 'react';
import {AbsoluteFill,Sequence,Loop,Video,staticFile,useCurrentFrame,useVideoConfig,interpolate,Easing} from 'remotion';

const easing={extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.22,1,.36,1)};
function Headline({title}){
  const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(),portrait=height>width;
  return <div style={{position:'absolute',left:portrait?90:120,top:portrait?275:270,width:portrait?900:1020,fontFamily:'WMSerif,Georgia,serif',fontSize:portrait?135:155,lineHeight:1.02,letterSpacing:'-.055em',fontWeight:500}}>
    <div style={{overflow:'hidden',paddingBottom:12}}><div style={{translate:`0 ${interpolate(frame,[0,1.2*fps],[180,0],easing)}px`}}>{title.split(' worth ')[0]}</div></div>
    <div style={{overflow:'hidden',paddingBottom:12}}><div style={{translate:`0 ${interpolate(frame,[.2*fps,1.4*fps],[180,0],easing)}px`}}>worth</div></div>
    <div style={{overflow:'hidden',paddingBottom:12,color:'#b73522'}}><div style={{translate:`0 ${interpolate(frame,[.4*fps,1.6*fps],[180,0],easing)}px`}}>noticing.</div></div>
  </div>;
}
function Sculpture(){
  const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(),portrait=height>width;
  return <div style={{position:'absolute',width:portrait?850:830,height:portrait?950:934,right:portrait?115:20,top:portrait?790:72,opacity:interpolate(frame,[0,1.4*fps],[0,1],easing),translate:`0 ${interpolate(frame,[0,1.4*fps],[50,0],easing)}px`,mixBlendMode:'multiply'}}>
    <Loop durationInFrames={4*fps}><Video src={staticFile('motion/ribbon-loop.mp4')} muted style={{width:'100%',height:'100%',objectFit:'contain'}} /></Loop>
  </div>;
}
export function LivingEditorial({title}){
  const frame=useCurrentFrame(),{fps,height,width}=useVideoConfig(),portrait=height>width;
  return <AbsoluteFill style={{background:'#f2f0ea',color:'#24231f',fontFamily:'WMSans,Arial,sans-serif'}}>
    <style>{`@font-face{font-family:WMSerif;src:url('${staticFile('motion/font-1.woff2')}')}@font-face{font-family:WMSans;src:url('${staticFile('motion/font-2.woff2')}')}`}</style>
    <div style={{position:'absolute',left:portrait?90:120,right:portrait?90:120,top:100,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:portrait?39:42}}><span>Wonder <span style={{color:'#b73522'}}>&</span> Method</span>{!portrait&&<span style={{fontSize:22,letterSpacing:3}}>IMAGINATION, WITH INTENTION.</span>}</div>
    <Sequence name="Original Blender ribbon" from={0} premountFor={fps}><Sculpture /></Sequence>
    <Sequence name="Editorial headline" from={0} premountFor={fps}><Headline title={title}/></Sequence>
    <Sequence name="Studio signature" from={2*fps} premountFor={fps}>
      <div style={{position:'absolute',left:portrait?90:120,bottom:portrait?120:100,fontSize:portrait?35:30,lineHeight:1.5,opacity:interpolate(frame,[2*fps,3*fps],[0,1],easing)}}>Distinctive websites.<br/>Purposeful motion.<br/>Wonder & Method.</div>
    </Sequence>
    <div style={{position:'absolute',left:portrait?90:120,right:portrait?90:120,bottom:portrait?80:65,height:2,background:'#c8c5bd',scale:`${interpolate(frame,[0,10*fps],[0,1],{extrapolateRight:'clamp'})} 1`,transformOrigin:'left'}}/>
  </AbsoluteFill>;
}
