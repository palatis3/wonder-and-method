import React from 'react';
import {AbsoluteFill,CanvasImage,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {ART_WIDTH,ART_HEIGHT,letters,letterState,pieces,pieceState} from '../buffalo-assembly-data.js';

export const BuffaloAssembly=()=>{
  const frame=useCurrentFrame();const {fps}=useVideoConfig();const seconds=frame/fps;
  const artWidth=1380,scale=artWidth/ART_WIDTH;
  return <AbsoluteFill style={{background:'#bec7b7',overflow:'hidden'}}>
    <div style={{position:'absolute',left:110,top:200,width:artWidth,height:artWidth*ART_HEIGHT/ART_WIDTH,perspective:1200}}>
      {letters.map(letter=>{const s=letterState(seconds,letter);return <div key={letter.letterIndex} style={{position:'absolute',inset:0,opacity:s.opacity,transform:`translate3d(${s.x*scale}px,${s.y*scale}px,0)`,filter:`drop-shadow(0 ${11*scale}px ${8*scale}px rgba(31,34,44,.25))`}}>
        <div style={{position:'absolute',inset:0,clipPath:`polygon(${letter.clip})`}}><CanvasImage src={staticFile('buffalo-sage/word.webp')} premountFor={fps} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/></div>
      </div>;})}
      {pieces.map(piece=>{const s=pieceState(seconds,piece);return <div key={piece.id} style={{position:'absolute',left:piece.x*scale,top:piece.y*scale,width:piece.width*scale,height:piece.height*scale,opacity:s.opacity,transform:`translate3d(${s.x*scale}px,${s.y*scale}px,${s.z*scale}px) rotateZ(${s.rotate}deg) rotateY(${s.tilt}deg) scale(${s.scale})`,filter:`drop-shadow(0 ${s.shadow*scale}px ${s.shadow*.7*scale}px rgba(14,27,42,.22))`}}>
        <div style={{position:'absolute',inset:0,clipPath:`polygon(${piece.clip})`}}><CanvasImage src={staticFile('buffalo-sage/word.webp')} premountFor={fps} style={{position:'absolute',width:ART_WIDTH*scale,height:ART_HEIGHT*scale,maxWidth:'none',left:-piece.x*scale,top:-piece.y*scale}}/></div>
      </div>;})}
    </div>
  </AbsoluteFill>;
};
