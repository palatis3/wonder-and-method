"""Offline full-frame composites and short review media from real Cycles crops."""
from __future__ import annotations
import argparse,json,subprocess
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/living-city-refinement'
P=argparse.ArgumentParser()
P.add_argument('--prefix',default='crop-benchmark')
P.add_argument('--view',choices=['desktop','portrait'],required=True)
P.add_argument('--video',action='store_true')
args=P.parse_args()
source=OUT/args.prefix/args.view
manifest=json.loads((source/'render-manifest.json').read_text())
base_full=Image.open(OUT/'gate'/f'cycles-{args.view}-s64-f0001.png').convert('RGB')
scale=manifest['resolutionPercent']/100
size=(round(manifest['baseWidth']*scale),round(manifest['baseHeight']*scale))
base=base_full.resize(size,Image.Resampling.LANCZOS) if base_full.size!=size else base_full
base_np=np.array(base,dtype=np.float32)
dest=source/'composited'
dest.mkdir(exist_ok=True)
reports=[]
for idx,row in enumerate(manifest['timings']):
    crop=Image.open(row['path']).convert('RGB')
    if crop.width!=base.width:
        raise RuntimeError('Crop width differs from full-camera base width.')
    y=base.height-crop.height
    patch=np.array(crop,dtype=np.float32)
    feather=max(4,round(16*scale))
    a=np.ones((crop.height,1,1),dtype=np.float32)
    t=np.linspace(0,1,feather,dtype=np.float32)
    a[:feather,0,0]=t*t*(3-2*t)
    blended=base_np.copy()
    blended[y:]=base_np[y:]*(1-a)+patch*a
    result=Image.fromarray(np.uint8(np.clip(np.rint(blended),0,255)))
    path=dest/f'{idx:04d}.png'
    result.save(path)
    item={'sequenceIndex':idx,'sourceFrame':row['frame'],'path':str(path),'cropTopPixel':y,'cropHeight':crop.height,'featherPixels':feather}
    if row['frame']==1:
        diff=np.abs(base_np[y+feather:]-patch[feather:])
        item['samePhaseBaseDifference']={'meanChannelDelta255':float(diff.mean()),'p99ChannelDelta255':float(np.percentile(diff,99)),'note':'Render-border/denoising difference at identical phase, not motion.'}
    reports.append(item)
summary={'view':args.view,'width':base.width,'height':base.height,'sourceManifest':str(source/'render-manifest.json'),'frames':reports,'offlineComposite':True,'publicFilesChanged':False}
if args.video:
    if len(reports)<6:
        raise RuntimeError('Insufficient consecutive frames for a temporal preview.')
    if len(reports)!=len(manifest['frames']):
        raise RuntimeError('Encode the temporal preview only after all requested sample frames finish.')
    for previous,current in zip(reports,reports[1:]):
        expected=previous['sourceFrame']%96+1
        if current['sourceFrame']!=expected:
            raise RuntimeError('Temporal preview must follow real consecutive frames, including the96→1 seam.')
    ffmpeg=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
    if not ffmpeg.is_file():
        raise FileNotFoundError(f'Existing workspace FFmpeg not found: {ffmpeg}')
    video=source/f'{args.view}-seam-preview.mp4'
    subprocess.run([str(ffmpeg),'-hide_banner','-loglevel','error','-y','-framerate','24','-i',str(dest/'%04d.png'),'-vf','scale=out_color_matrix=bt709:out_range=tv','-c:v','libx264','-crf','16','-preset','medium','-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-movflags','+faststart','-an',str(video)],check=True)
    probe=ffmpeg.with_name('ffprobe.exe')
    result=subprocess.run([str(probe),'-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,nb_read_frames,duration,color_space,color_transfer,color_primaries,color_range','-of','json',str(video)],check=True,capture_output=True,text=True)
    streams=json.loads(result.stdout)['streams']
    if len(streams)!=1 or streams[0]['codec_type']!='video' or streams[0]['r_frame_rate']!='24/1' or int(streams[0]['nb_read_frames'])!=len(reports) or (streams[0]['width'],streams[0]['height'])!=base.size:
        raise RuntimeError('Encoded temporal sample does not match the source dimensions/frame contract.')
    decoded=source/'decoded'
    decoded.mkdir(exist_ok=True)
    subprocess.run([str(ffmpeg),'-hide_banner','-loglevel','error','-y','-i',str(video),str(decoded/'%04d.png')],check=True)
    if len(list(decoded.glob('*.png')))!=len(reports):
        raise RuntimeError('Decoded temporal sample count mismatch.')
    summary['video']=str(video)
    summary['previewIsFullLoop']=False
    summary['previewNote']='One-second excerpt crossing the full four-second loop seam at 0.5 seconds. The excerpt start/end are different phases; do not judge looping the excerpt itself.'
    summary['encodedVideoProbe']=streams[0]
    summary['decodedDirectory']=str(decoded)
    summary['seconds']=len(reports)/24
    summary['loopBoundaryAtSeconds']=next((i/24 for i,r in enumerate(reports) if i and r['sourceFrame']==1),None)
    a=np.array(Image.open(reports[0]['path']),dtype=np.int16)
    changes=[]
    for prev,cur in zip(reports,reports[1:]):
        b=np.array(Image.open(cur['path']),dtype=np.int16)
        d=np.abs(b-a)
        changes.append({'from':prev['sourceFrame'],'to':cur['sourceFrame'],'meanDelta':float(d.mean()),'p99Delta':float(np.percentile(d,99)),'isLoopSeam':cur['sourceFrame']==1})
        a=b
    summary['adjacentFrameMetrics']=changes
    decoded_changes=[]
    previous=np.array(Image.open(decoded/'0001.png'),dtype=np.int16)
    for index in range(1,len(reports)):
        current=np.array(Image.open(decoded/f'{index+1:04d}.png'),dtype=np.int16)
        d=np.abs(current-previous)
        decoded_changes.append({'from':reports[index-1]['sourceFrame'],'to':reports[index]['sourceFrame'],'meanDelta':float(d.mean()),'p99Delta':float(np.percentile(d,99)),'isLoopSeam':reports[index]['sourceFrame']==1})
        previous=current
    summary['decodedAdjacentFrameMetrics']=decoded_changes
    quality=[]
    for index,frame in enumerate(reports):
        original=np.array(Image.open(frame['path']),dtype=np.float32)
        encoded=np.array(Image.open(decoded/f'{index+1:04d}.png'),dtype=np.float32)
        diff=original-encoded
        mse=float(np.mean(diff*diff))
        quality.append({'sourceFrame':frame['sourceFrame'],'psnrDb':float(10*np.log10(255*255/mse)) if mse else 100.0,'meanAbsoluteChannelDelta255':float(np.abs(diff).mean())})
    summary['decodedQuality']={'minimumFramePsnrDb':min(r['psnrDb'] for r in quality),'meanFramePsnrDb':sum(r['psnrDb'] for r in quality)/len(quality),'meanAbsoluteChannelDelta255':sum(r['meanAbsoluteChannelDelta255'] for r in quality)/len(quality)}
    chosen=sorted(set([0,len(reports)//2-1,len(reports)//2,len(reports)-1]))
    tile_w=480 if args.view=='desktop' else 276
    tile_h=round(base.height*tile_w/base.width)
    sheet=Image.new('RGB',(len(chosen)*tile_w,tile_h+36),(248,246,239))
    draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
    for col,index in enumerate(chosen):
        frame=reports[index]
        img=Image.open(decoded/f'{index+1:04d}.png').resize((tile_w,tile_h),Image.Resampling.LANCZOS)
        sheet.paste(img,(col*tile_w,36))
        draw.text((col*tile_w+10,9),f"Frame {frame['sourceFrame']} / {index/24:.3f}s",font=font,fill=(9,45,59))
    contact=source/f'{args.view}-seam-contact.jpg'
    sheet.save(contact,quality=95)
    summary['contactSheet']=str(contact)
    summary['contactSheetSource']='Freshly decoded encoded video frames.'
(source/'composite-manifest.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({'view':args.view,'frames':len(reports),'summary':str(source/'composite-manifest.json'),'video':summary.get('video'),'contact':summary.get('contactSheet')},indent=2))
