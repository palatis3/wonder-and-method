import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {livingCityAssetState,livingCityPublicPath,copyLivingCityAssets} from '../scripts/build-living-city-assets.mjs';
import {livingCityHome} from '../src/living-city.mjs';

async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'wm-city-'));
 await mkdir(join(root,'public/living-city'),{recursive:true});
 const media=Buffer.from('verified media'),files={};
 for(const camera of ['desktop','mobile'])for(const type of ['Poster','Video','End']){
  const path='/living-city/'+camera+'-'+type.toLowerCase()+(type==='Video'?'.mp4':'.webp');
  files[camera+type]={path,bytes:media.length,sha256:createHash('sha256').update(media).digest('hex'),width:camera==='desktop'?1440:828,height:camera==='desktop'?960:1216,...(type==='Video'?{fps:24,frames:72,durationSeconds:3}:{})};
  await writeFile(join(root,'public'+path),media);
 }
 const manifest={schemaVersion:1,status:'ready',files};
 const save=()=>writeFile(join(root,'public/living-city/manifest.json'),JSON.stringify(manifest));await save();
 return {root,manifest,save,close:()=>rm(root,{recursive:true,force:true})};
}
test('paired city assets are verified, copied byte-for-byte and bound as release inputs',async()=>{
 const f=await fixture();try{
  const state=await livingCityAssetState(f.root,{homeEdition:'living-city'});
  assert.equal(state.livingCityMotionReady,true);assert.equal(state.livingCityAssetFiles.length,6);
  assert.ok(state.livingCitySourceFiles.includes('motion/living-city.js'));
  await copyLivingCityAssets(f.root,join(f.root,'dist'),{homeEdition:'living-city',...state});
  for(const path of state.livingCityAssetFiles)assert.deepEqual(await readFile(join(f.root,path)),await readFile(join(f.root,'dist/assets',path.slice(7))));
  await writeFile(join(f.root,'public'+f.manifest.files.mobileVideo.path),'corrupt media!');
  await assert.rejects(livingCityAssetState(f.root,{homeEdition:'living-city'}),/integrity/);
 }finally{await f.close();}
});
test('city publication rejects incomplete camera pairs, timing mismatches and unsafe paths',async()=>{
 const f=await fixture();try{
  f.manifest.files.mobileEnd.width=400;await f.save();
  await assert.rejects(livingCityAssetState(f.root,{homeEdition:'living-city'}),/dimensions do not match/);
  f.manifest.files.mobileEnd.width=828;f.manifest.files.mobileVideo.frames=20;await f.save();
  await assert.rejects(livingCityAssetState(f.root,{homeEdition:'living-city'}),/timing/);
  delete f.manifest.files.desktopEnd;await f.save();
  await assert.rejects(livingCityAssetState(f.root,{homeEdition:'living-city'}),/paired films/);
  for(const path of ['/living-city/../secret.mp4','https://example.test/a.mp4','/living-city/asset.svg'])assert.throws(()=>livingCityPublicPath(path),/Invalid/);
 }finally{await f.close();}
});
test('initial city page provides all project destinations before enhancement and defers video to preference-aware autoplay',()=>{
 const html=livingCityHome({livingCityMotionReady:true});
 assert.match(html,/data-city-stage/);assert.match(html,/role="tablist"[^>]*hidden/);
 assert.doesNotMatch(html,/<article[^>]+data-city-panel[^>]+(?:hidden|inert)/);
 assert.doesNotMatch(html,/<video[^>]+(?: autoplay| loop| src=)/);
 assert.match(html,/<video[^>]+data-desktop-src="\/assets\/living-city\/desktop-film.mp4"[^>]+preload="none"/);
 for(const id of ['fieldwork','northline','hearthside']){assert.match(html,new RegExp(`href="/work/${id}/"`));assert.match(html,new RegExp(`data-city-panel="${id}"`));}
 assert.match(html,/fictional businesses/);assert.match(html,/Start a project/);
});

test('loop publication distinguishes the native introduction from the encoded film duration',async()=>{
 const f=await fixture();try{
  f.manifest.playback={mode:'seamless-loop',introductionSeconds:12,loopSeconds:4};await f.save();
  await assert.rejects(livingCityAssetState(f.root,{homeEdition:'living-city'}),/loop duration/);
  for(const camera of ['desktop','mobile'])Object.assign(f.manifest.files[camera+'Video'],{frames:96,durationSeconds:4});await f.save();
  assert.equal((await livingCityAssetState(f.root,{homeEdition:'living-city'})).livingCityMedia.playback.introductionSeconds,12);
  f.manifest.playback.introductionSeconds=4;await f.save();
  await assert.rejects(livingCityAssetState(f.root,{homeEdition:'living-city'}),/playback metadata/);
 }finally{await f.close();}
});
