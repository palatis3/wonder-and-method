// Derive phone assets from the accepted streams; never replace their originals.
import {readFile,writeFile,stat,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const manifestPath=resolve(root,'public/civic-sculpture/manifest.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(manifest.revision!=='finale-v2'||manifest.status!=='ready')throw Error('Accepted finale-v2 required');
const binary=name=>resolve(root,`node_modules/@remotion/compositor-win32-x64-msvc/${name}.exe`);
const digest=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
for(const [source,key,frames,duration] of [['video','mobileVideo',240,10],['ambientVideo','mobileAmbientVideo',96,4]]){
  const input=resolve(root,'public'+manifest[source]);
  const url=manifest[source].replace('.mp4','-960.mp4'),output=resolve(root,'public'+url);
  execFileSync(binary('ffmpeg'),['-hide_banner','-loglevel','error','-y','-i',input,'-vf','scale=960:480','-c:v','libx264','-preset','slow','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart','-an',output],{stdio:'inherit'});
  const probe=JSON.parse(execFileSync(binary('ffprobe'),['-v','error','-show_entries','stream=codec_type,width,height,nb_frames,r_frame_rate:format=duration','-of','json',output],{encoding:'utf8'}));
  if(probe.streams.length!==1||probe.streams[0].codec_type!=='video'||probe.streams[0].width!==960||probe.streams[0].height!==480||Number(probe.streams[0].nb_frames)!==frames||probe.streams[0].r_frame_rate!=='24/1'||Number(probe.format.duration)!==duration)throw Error('Phone stream validation failed');
  Object.assign(manifest,{[key]:url,[key+'Bytes']:(await stat(output)).size,[key+'Sha256']:await digest(output),[key+'SourceSha256']:await digest(input)});
}
const posterUrl=manifest.poster.replace('.webp','-480.webp');
const poster=resolve(root,'public'+posterUrl);
execFileSync('python',['-c','from PIL import Image; import sys; im=Image.open(sys.argv[1]); im.resize((480,240),Image.Resampling.LANCZOS).save(sys.argv[2],"WEBP",quality=84,method=6)',resolve(root,'public'+manifest.poster),poster],{stdio:'inherit'});
Object.assign(manifest,{mobileVideoWidth:960,mobileVideoHeight:480,smallPoster:posterUrl,smallPosterWidth:480,smallPosterHeight:240,smallPosterBytes:(await stat(poster)).size,smallPosterSha256:await digest(poster)});
await writeFile(manifestPath+'.tmp',JSON.stringify(manifest,null,2)+'\n');await rename(manifestPath+'.tmp',manifestPath);
console.log(JSON.stringify({mobileVideoBytes:manifest.mobileVideoBytes,mobileAmbientVideoBytes:manifest.mobileAmbientVideoBytes,smallPosterBytes:manifest.smallPosterBytes}));
