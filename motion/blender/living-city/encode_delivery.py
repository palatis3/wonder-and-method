"""Encode approved unique renders, duplicate proven holds, derive matching stills.

Run only after the scene's visual gate has passed and all final frames exist.
The source frames must be in output/living-city/final-frames/.
"""
from pathlib import Path
import argparse,hashlib,json,math,os,subprocess
from PIL import Image,ImageChops,ImageStat

ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/living-city';PUBLIC=ROOT/'public/living-city'
BIN=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc';FF=BIN/'ffmpeg.exe';PROBE=BIN/'ffprobe.exe'
SOURCE=OUT/'final-frames';VERIFY=json.loads((OUT/'scene-verification.json').read_text())
P=argparse.ArgumentParser();P.add_argument('--view',choices=['both','desktop','portrait'],default='both');P.add_argument('--partial',action='store_true');args=P.parse_args()
if args.view!='both' and not args.partial:raise RuntimeError('A single-view encode must use --partial so it cannot publish a ready manifest')
PUBLIC.mkdir(parents=True,exist_ok=True)
files={};checks=[]
def run(command):return subprocess.run([str(x) for x in command],check=True,capture_output=True,text=True)
def file_record(path,width,height,**extra):
    return {'path':'/living-city/'+path.name,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'width':width,'height':height,**extra}

def still_quality(source,path):
    difference=ImageChops.difference(source,Image.open(path).convert('RGB'))
    mse=sum(value*value for value in ImageStat.Stat(difference).rms)/3
    return round(10*math.log10(255**2/mse),3) if mse else 100.0
for view,label,w,h in [('desktop','desktop',1440,960),('portrait','mobile',828,1216)]:
    if args.view!='both' and args.view!=view:continue
    verification=VERIFY['cameras'][view]
    if not verification['holdExactlyIdentical']:raise RuntimeError('Unverified settled hold')
    sequence=OUT/'delivery-sequence'/label;sequence.mkdir(parents=True,exist_ok=True)
    for entry in verification['frameMap']:
        original=SOURCE/f"{view}-{entry['renderFrame']:04d}.png"
        if not original.is_file():raise FileNotFoundError(str(original))
        if Image.open(original).size!=(w,h):raise RuntimeError('Wrong source dimensions: '+str(original))
        target=sequence/f"{entry['frame']:04d}.png"
        if target.exists():target.unlink()
        os.link(original,target)
    video=PUBLIC/(label+'-film.mp4')
    run([FF,'-y','-hide_banner','-loglevel','error','-framerate','24','-start_number','1','-i',sequence/'%04d.png','-frames:v',verification['frames'],'-vf','scale=out_color_matrix=bt709:out_range=tv','-c:v','libx264','-preset','slow','-crf','20','-pix_fmt','yuv420p','-profile:v','high','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-movflags','+faststart','-an',video])
    streams=json.loads(run([PROBE,'-v','error','-count_frames','-show_entries','stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,nb_frames,nb_read_frames,duration,color_space,color_transfer,color_primaries,color_range','-of','json',video]).stdout)['streams']
    if len(streams)!=1 or streams[0]['codec_type']!='video':raise RuntimeError('Expected one video stream and no audio')
    probe=streams[0]
    if probe['codec_name']!='h264' or probe['pix_fmt']!='yuv420p' or int(probe['nb_frames'])!=verification['frames'] or int(probe['nb_read_frames'])!=verification['frames'] or probe['r_frame_rate']!='24/1' or (probe['width'],probe['height'])!=(w,h) or abs(float(probe['duration'])-verification['durationSeconds'])>1e-5:raise RuntimeError('Encoded video validation failed')
    decoded=OUT/'decoded-delivery'/label;decoded.mkdir(parents=True,exist_ok=True)
    run([FF,'-y','-hide_banner','-loglevel','error','-i',video,decoded/'%04d.png'])
    if len(list(decoded.glob('*.png')))!=verification['frames']:raise RuntimeError('Full decode frame count mismatch')
    first=Image.open(decoded/'0001.png').convert('RGB');last=Image.open(decoded/f"{verification['frames']:04d}.png").convert('RGB')
    still_checks=[]
    for suffix,im,frame in [('poster',first,1),('end',last,verification['frames'])]:
        quality=90 if suffix=='poster' else 92
        path=PUBLIC/f'{label}-{suffix}.webp';im.save(path,'WEBP',quality=quality,method=6)
        # Exact decoded PNG references remain private. Public WebP is deliberately
        # lossy to retain the site's original initial-payload budget.
        psnr=still_quality(im,path)
        if psnr<35:raise RuntimeError('Public still compression quality is unexpectedly low')
        source_hash=hashlib.sha256(im.tobytes()).hexdigest()
        key=label+('Poster' if suffix=='poster' else 'End');files[key]=file_record(path,w,h,decodedVideoFrame=frame,pixelIdenticalToDecodedFrame=False,encoding='webp-lossy',quality=quality,sourceDecodedRgbSha256=source_hash,psnrToDecodedFrame=psnr)
        still_checks.append({'suffix':suffix,'decodedVideoFrame':frame,'sourceDecodedRgbSha256':source_hash,'publicImagePSNR':psnr,'quality':quality})
    small=first.copy();small.thumbnail((960,640) if label=='desktop' else (414,608),Image.Resampling.LANCZOS)
    small_path=PUBLIC/(label+'-small-poster.webp');small.save(small_path,'WEBP',quality=85,method=6)
    files[label+'SmallPoster']=file_record(small_path,*small.size,decodedVideoFrame=1,encoding='webp-lossy',quality=85,psnrToResizedDecodedFrame=still_quality(small,small_path))
    files[label+'Video']=file_record(video,w,h,fps=24,frames=verification['frames'],durationSeconds=verification['durationSeconds'])
    movie_bytes=video.read_bytes();atoms=[];offset=0
    while offset+8<=len(movie_bytes):
        length=int.from_bytes(movie_bytes[offset:offset+4],'big');kind=movie_bytes[offset+4:offset+8].decode('ascii',errors='replace');atoms.append(kind)
        if length==1:length=int.from_bytes(movie_bytes[offset+8:offset+16],'big')
        if length<=0:break
        offset+=length
    faststart='moov' in atoms and 'mdat' in atoms and atoms.index('moov')<atoms.index('mdat')
    if not faststart:raise RuntimeError('Movie metadata is not ready for progressive delivery')
    checks.append({'view':view,'probe':probe,'fullDecodedFrames':verification['frames'],'faststart':faststart,'uniqueRenderedFrames':verification['uniqueRenderFrames'],'duplicatedHoldFrames':verification['frames']-verification['uniqueRenderFrames'],'firstLastSourceFrameMatch':True,'publicStillsPixelIdentical':False,'stillChecks':still_checks})
opening_bytes=sum(record['bytes'] for key,record in files.items() if key.endswith('Poster'))
if args.view=='both' and opening_bytes>365000:raise RuntimeError('Four opening posters exceed the 365 KB export target: '+str(opening_bytes))
manifest={'schemaVersion':1,'status':'partial' if args.partial else 'ready','revision':'living-city-v1','openingPosterBytes':opening_bytes,'files':files}
if not args.partial:(PUBLIC/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
report_name=(args.view+'-delivery-verification.json') if args.partial else 'delivery-verification.json'
(OUT/report_name).write_text(json.dumps({'checks':checks,'files':files,'partial':args.partial},indent=2))
print(json.dumps(manifest,indent=2))
