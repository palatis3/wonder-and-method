import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSEMBLY_SECONDS,LETTER_SECONDS,letters,letterState,pieces,pieceState,activeLetter} from '../motion/buffalo-assembly-data.js';

test('each complete glyph is visible before the next letter begins',()=>{
  for(let i=0;i<letters.length;i++){
    const time=i<letters.length-1?letters[i+1].start-.001:ASSEMBLY_SECONDS;
    assert.equal(letterState(time,letters[i]).opacity,1,`${i}: complete silhouette missing`);
    assert.ok(pieces.filter(p=>p.letterIndex===i).every(p=>pieceState(time,p).opacity===0),`${i}: cut fragments still replace the glyph`);
    if(i<letters.length-1)assert.equal(letterState(time,letters[i+1]).opacity,0,'Next letter appeared too early');
  }
});

test('the final and reduced-motion states retain all seven full glyphs without drift',()=>{
  for(const options of [{},{staticFrame:true}]){
    for(const letter of letters){
      const state=letterState(ASSEMBLY_SECONDS,letter,options);
      assert.equal(state.opacity,1);assert.equal(Math.abs(state.x),0);assert.equal(Math.abs(state.y),0);
    }
    assert.ok(pieces.every(piece=>pieceState(ASSEMBLY_SECONDS,piece,options).opacity===0));
  }
});

test('B is complete by itself before U starts',()=>{
  assert.deepEqual(letters.filter(letter=>letterState(LETTER_SECONDS-.001,letter).opacity===1).map(letter=>letter.letter),['B']);
  assert.equal(letterState(0,letters[0]).opacity,0);
});

test('full-glyph masks partition the source canvas without holes or overlaps',()=>{
  const polygons=letters.map(letter=>letter.clip.split(',').map(pair=>pair.split(' ').map(n=>parseFloat(n))));
  const inside=(x,y,polygon)=>{
    let result=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
      if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;
    }
    return result;
  };
  for(let y=.371;y<100;y+=1.3)for(let x=.193;x<100;x+=.71){
    assert.equal(polygons.filter(p=>inside(x,y,p)).length,1,`uncovered or duplicate source point ${x},${y}`);
  }
});

test('assembly windows never overlap and the final rendered frame is settled',()=>{
  for(let time=0;time<=ASSEMBLY_SECONDS;time+=1/60){
    const assembling=new Set(pieces.filter(piece=>pieceState(time,piece).opacity>0).map(piece=>piece.letterIndex));
    assert.ok(assembling.size<=1,`multiple letters assembling at ${time}`);
  }
  // Remotion's final frame is one frame before the browser's exact end time.
  const finalFrameSeconds=ASSEMBLY_SECONDS-1/30;
  assert.equal(activeLetter(finalFrameSeconds),'complete');
  for(const letter of letters){
    const state=letterState(finalFrameSeconds,letter);
    assert.equal(state.opacity,1);
    assert.equal(Math.abs(state.x),0);
    assert.equal(Math.abs(state.y),0);
  }
  assert.ok(pieces.every(piece=>pieceState(finalFrameSeconds,piece).opacity===0));
});
