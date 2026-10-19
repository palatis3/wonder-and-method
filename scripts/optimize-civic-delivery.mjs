// Reproducible delivery derivatives. The accepted 1440px render stays untouched.
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const path=resolve(root,'public/civic-sculpture/manifest.json');
const manifest=JSON.parse(await readFile(path,'utf8'));
const original='/civic-sculpture/finale-v2/buffalo-civic-intro.mp4';
const digest=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
const originalHash=await digest(resolve(root,'public'+original));
if(originalHash!=='fff7d1f1a7171c61b3e0a663c43b128e1fd5cbfefdac34b7ba725d6e9eeeac0c')throw Error('Accepted original changed; review before encoding.');
const binary=name=>resolve(root,`node_modules/@remotion/compositor-win32-x64-msvc/${name}.exe`);
const desktop='/civic-sculpture/finale-v2/buffalo-civic-intro-delivery.mp4';
const phone='/civic-sculpture/finale-v2/buffalo-civic-intro-delivery-960.mp4';
const encode=(input,output,extra)=>execFileSync(binary('ffmpeg'),['-hide_banner','-loglevel','error','-y','-i',resolve(root,'public'+input),...extra,'-an','-c:v','libx264','-preset','slow','-pix_fmt','yuv420p','-movflags','+faststart',resolve(root,'public'+output)],{stdio:'inherit'});
encode(original,desktop,['-crf','25']);
encode(desktop,phone,['-vf','scale=960:480','-crf','24']);
for(const [url,width,height] of [[desktop,1440,720],[phone,960,480]]){
 const probe=JSON.parse(execFileSync(binary('ffprobe'),['-v','error','-show_entries','stream=codec_type,width,height,nb_frames,r_frame_rate:format=duration','-of','json',resolve(root,'public'+url)],{encoding:'utf8'}));
 const stream=probe.streams[0];
 if(probe.streams.length!==1||stream.codec_type!=='video'||stream.width!==width||stream.height!==height||Number(stream.nb_frames)!==240||stream.r_frame_rate!=='24/1'||Number(probe.format.duration)!==10)throw Error('Delivery format changed.');
}
Object.assign(manifest,{video:desktop,videoBytes:(await stat(resolve(root,'public'+desktop))).size,mobileVideo:phone,mobileVideoBytes:(await stat(resolve(root,'public'+phone))).size,mobileVideoSha256:await digest(resolve(root,'public'+phone)),mobileVideoSourceSha256:await digest(resolve(root,'public'+desktop)),deliveryOriginalVideo:original,deliveryOriginalVideoSha256:originalHash,recommendedPlayback:'Play only after an explicit visitor choice. Intro once, then matched ambient traffic loop. Pause/reduced motion/offscreen behavior belongs to integration. Final poster shows the complete sculpture.'});
await writeFile(path,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({originalBytes:(await stat(resolve(root,'public'+original))).size,videoBytes:manifest.videoBytes,mobileVideoBytes:manifest.mobileVideoBytes,originalUnchanged:await digest(resolve(root,'public'+original))===originalHash,frames:240,fps:24,durationSeconds:10}));
