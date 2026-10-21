import {readFile,mkdir,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';

export function livingCityPublicPath(path){
 if(typeof path!=='string'||!/^\/living-city\/[a-z0-9-]+\.(?:webp|mp4)$/.test(path))throw Error('Invalid Living City asset path');
 return 'public'+path;
}
export async function livingCityAssetState(root,config){
 if(config.homeEdition!=='living-city')return {};
 const manifestPath='public/living-city/manifest.json';
 const manifest=JSON.parse(await readFile(resolve(root,manifestPath),'utf8'));
 if(manifest.schemaVersion!==1||manifest.status!=='ready')throw Error('Living City media is not ready for publication.');
 if(manifest.playback&&(manifest.playback.mode!=='seamless-loop'||manifest.playback.introductionSeconds!==12||manifest.playback.loopSeconds!==4))throw Error('Living City playback metadata does not match the introduction.');
 const required=['desktopPoster','mobilePoster','desktopVideo','mobileVideo','desktopEnd','mobileEnd'];
 if(required.some(key=>!manifest.files?.[key]))throw Error('Living City requires paired films and exact opening/end posters.');
 const files=[];
 for(const [key,item] of Object.entries(manifest.files)){
  const path=livingCityPublicPath(item.path),bytes=await readFile(resolve(root,path));
  if(bytes.length!==item.bytes||createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Living City asset failed integrity check: '+key);
  if(!Number.isSafeInteger(item.width)||!Number.isSafeInteger(item.height)||item.width<1||item.height<1)throw Error('Living City dimensions missing: '+key);
  files.push(path);
 }
 for(const camera of ['desktop','mobile']){
  const video=manifest.files[camera+'Video'],poster=manifest.files[camera+'Poster'],end=manifest.files[camera+'End'];
  if(!video.path.endsWith('.mp4')||!poster.path.endsWith('.webp')||!end.path.endsWith('.webp'))throw Error('Living City media format mismatch: '+camera);
  if(video.width!==poster.width||video.height!==poster.height||end.width!==poster.width||end.height!==poster.height)throw Error('Living City camera dimensions do not match: '+camera);
  if(!Number.isFinite(video.durationSeconds)||video.durationSeconds<=0||video.durationSeconds>8||!Number.isInteger(video.frames)||!Number.isFinite(video.fps)||Math.abs(video.frames/video.fps-video.durationSeconds)>.05)throw Error('Living City timing is invalid: '+camera);
  if(manifest.playback&&Math.abs(video.durationSeconds-manifest.playback.loopSeconds)>.05)throw Error('Living City loop duration does not match the film: '+camera);
 }
 return {livingCityMedia:manifest,livingCityMotionReady:true,livingCityAssetFiles:files,livingCitySourceFiles:[manifestPath,...files,'motion/living-city.js'].sort()};
}
export async function copyLivingCityAssets(root,output,config){
 if(config.homeEdition!=='living-city')return;
 const state=config.livingCityAssetFiles?config:await livingCityAssetState(root,config);
 for(const path of state.livingCityAssetFiles){const destination=resolve(output,'assets',path.slice(7));await mkdir(dirname(destination),{recursive:true});await cp(resolve(root,path),destination);}
}
