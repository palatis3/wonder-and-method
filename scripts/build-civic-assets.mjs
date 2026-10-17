import {readFile,stat,mkdir,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';

const optionalJson=async(root,file)=>{try{return JSON.parse(await readFile(resolve(root,file),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
const info=async(root,file)=>{try{return await stat(resolve(root,file));}catch(error){if(error.code==='ENOENT')return null;throw error;}};
export function civicPublicPath(url){
  if(typeof url!=='string'||!/^\/civic-sculpture\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:mp4|webp)$/.test(url))throw new Error('Invalid Civic manifest asset path');
  return `public${url}`;
}
const pipelinePath=manifest=>manifest?.revision==='finale-v2'?'public/civic-sculpture/finale-v2/pipeline-status.json':'public/civic-sculpture/pipeline-status.json';
const posterKeys=['poster','mobilePoster','openingPoster'];
const optionalKeys=['mobileVideo','mobileAmbientVideo','smallPoster'];

// One manifest/readiness policy for local, production/review builds and fingerprints.
export async function civicAssetState(root,config){
  if(config.homeEdition!=='civic-sculpture')return {};
  const manifestPath='public/civic-sculpture/manifest.json';
  const active=await optionalJson(root,manifestPath);
  const sourceFiles=new Set();
  if(active)sourceFiles.add(manifestPath);
  async function inspect(manifest){
    if(!manifest)return null;
    let pipelineFile=pipelinePath(manifest),pipeline=await optionalJson(root,pipelineFile);
    // Old preview fixtures can still inspect an unfinished render. A production
    // release must carry its accepted readiness record in versioned source.
    if(!pipeline&&config.mode!=='production'){
      pipelineFile=pipelineFile.replace(/^public\//,'output/');
      pipeline=await optionalJson(root,pipelineFile);
    }
    if(pipeline)sourceFiles.add(pipelineFile);
    const files={};
    for(const key of [...posterKeys,'video','ambientVideo',...optionalKeys])if(manifest[key]){
      const path=civicPublicPath(manifest[key]),file=await info(root,path);
      files[key]={path,file};
    }
    const postersReady=posterKeys.every(key=>files[key]?.file?.isFile()&&files[key].file.size>0);
    const valid=(key,size)=>files[key]?.file?.isFile()&&Number.isSafeInteger(size)&&size>0&&files[key].file.size===size;
    const ambient=Boolean(manifest.ambientVideo);
    const formatReady=manifest.revision!=='finale-v2'||(ambient&&manifest.width===1440&&manifest.height===720&&manifest.fps===24&&manifest.durationSeconds===10&&manifest.frames===240&&manifest.ambientDurationSeconds===4&&manifest.ambientFrames===96&&manifest.ambientFirstPoseMatchesIntroFinal===true);
    const videoReady=formatReady&&manifest.status==='ready'&&pipeline?.state==='complete'&&postersReady&&valid('video',manifest.videoBytes)&&(!ambient||(manifest.ambientLoop===true&&valid('ambientVideo',manifest.ambientVideoBytes)));
    const hash=async key=>createHash('sha256').update(await readFile(resolve(root,files[key].path))).digest('hex');
    const verified=async key=>valid(key,manifest[key+'Bytes'])&&manifest[key+'Sha256']===await hash(key);
    const mobileReady=videoReady&&manifest.mobileVideoWidth===960&&manifest.mobileVideoHeight===480&&await verified('mobileVideo')&&await verified('mobileAmbientVideo')&&manifest.mobileVideoSourceSha256===await hash('video')&&manifest.mobileAmbientVideoSourceSha256===await hash('ambientVideo');
    const smallPosterReady=manifest.smallPosterWidth===480&&manifest.smallPosterHeight===240&&await verified('smallPoster');
    return {manifest,pipeline,files,postersReady,videoReady,ambient,mobileReady,smallPosterReady};
  }
  let selected=await inspect(active);
  // A promoted manifest cannot replace working v1 with incomplete/corrupt streams.
  if(config.mode!=='production'&&!selected?.videoReady&&active?.revision==='finale-v2'){
    const backupPath='output/civic-sculpture/finale-v2/accepted-manifest-v1.json';
    const backup=await optionalJson(root,backupPath);
    if(backup){sourceFiles.add(backupPath);const old=await inspect(backup);if(old?.videoReady)selected=old;}
  }
  if(!selected?.postersReady)throw new Error('Civic final posters are unavailable; retain the existing build.');
  if(config.mode==='production'&&!selected.videoReady)throw new Error('Production Civic motion is incomplete. Restore the accepted source media and readiness record before building.');
  const {manifest,files,videoReady,ambient,mobileReady,smallPosterReady}=selected;
  const media={...manifest};
  if(!mobileReady){delete media.mobileVideo;delete media.mobileAmbientVideo;}
  if(!smallPosterReady)delete media.smallPoster;
  const assetFiles=[...posterKeys,...(smallPosterReady?['smallPoster']:[]),...(videoReady?['video',...(ambient?['ambientVideo']:[]),...(mobileReady?['mobileVideo','mobileAmbientVideo']:[])]:[])].map(key=>files[key].path);
  for(const path of assetFiles)sourceFiles.add(path);
  return {civicMotionReady:videoReady,civicAmbientReady:Boolean(videoReady&&ambient),civicMedia:media,civicAssetFiles:assetFiles,civicSourceFiles:[...sourceFiles].sort(),civicReadiness:{requestedRevision:active?.revision??'v1',selectedRevision:manifest.revision??'v1',pipelineState:selected.pipeline?.state??'missing',videoReady,mobileReady,smallPosterReady}};
}
export async function copyCivicAssets(root,output,config){
  if(config.homeEdition!=='civic-sculpture')return;
  const state=config.civicAssetFiles?config:await civicAssetState(root,config);
  for(const path of state.civicAssetFiles){
    const destination=resolve(output,'assets',path.slice('public/'.length));
    await mkdir(dirname(destination),{recursive:true});await cp(resolve(root,path),destination);
  }
  for(const extension of ['css','js'])await cp(resolve(root,`motion/civic-sculpture-preview.${extension}`),resolve(output,`assets/civic-sculpture-preview.${extension}`));
}
