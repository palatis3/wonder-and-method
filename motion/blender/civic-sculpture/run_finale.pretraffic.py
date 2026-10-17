"""Render, validate, and atomically advertise Civic Sculpture finale v2.
Run: python run_finale.py --render
Resume encode only after completed render: python run_finale.py
Keeps accepted public assets and manifest unchanged until all outputs validate.
"""
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
import argparse,hashlib,json,os,shutil,struct,subprocess,sys,time,traceback
ROOT=Path(__file__).resolve().parents[3];BASE=ROOT/'output/civic-sculpture';REV=BASE/'finale-v2';STAGE=REV/'staged-public';PUB=ROOT/'public/civic-sculpture';DEST=PUB/'finale-v2';EV=ROOT/'evidence/premium-audit-20261015'
BLENDER=Path(r'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe');FF=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe';FP=FF.with_name('ffprobe.exe')
ARGS=argparse.ArgumentParser();ARGS.add_argument('--render',action='store_true');args=ARGS.parse_args()
for p in [REV,STAGE]:p.mkdir(parents=True,exist_ok=True)
def state(phase,**kw):
    payload={'revision':'finale-v2','state':phase,'updated_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),**kw};(REV/'pipeline-status.json').write_text(json.dumps(payload,indent=2));print(json.dumps(payload),flush=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def link(src,dst):
    dst.parent.mkdir(parents=True,exist_ok=True);dst.unlink(missing_ok=True)
    try:os.link(src,dst)
    except OSError:shutil.copy2(src,dst)
def encode(folder,pattern,frames,name):
    path=STAGE/name
    with (REV/(name+'.encode.log')).open('w',encoding='utf-8') as log:
        subprocess.run([str(FF),'-hide_banner','-y','-framerate','24','-start_number','1','-i',str(folder/pattern),'-frames:v',str(frames),'-c:v','libx264','-preset','slow','-crf','19','-pix_fmt','yuv420p','-r','24','-movflags','+faststart','-an',str(path)],stdout=log,stderr=subprocess.STDOUT,check=True)
    probe=json.loads(subprocess.check_output([str(FP),'-v','error','-show_entries','stream=codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,nb_frames,duration:format=duration,size','-of','json',str(path)],text=True))
    streams=probe['streams'];vs=[s for s in streams if s['codec_type']=='video'];assert len(vs)==1 and not any(s['codec_type']=='audio' for s in streams)
    v=vs[0];assert (v['codec_name'],v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))==('h264',1440,720,'24/1',frames)
    assert abs(float(probe['format']['duration'])-frames/24)<.001
    raw=path.read_bytes();at=0;atoms=[]
    while at+8<=len(raw):
        n,typ=struct.unpack_from('>I4s',raw,at)
        if n==1:n=struct.unpack_from('>Q',raw,at+8)[0]
        if n==0:n=len(raw)-at
        atoms.append(typ.decode('ascii','replace'));at+=n
    assert atoms.index('moov')<atoms.index('mdat')
    return {'ffprobe':probe,'fast_start_atoms':atoms,'sha256':sha(path),'bytes':path.stat().st_size}
def manifest(status='ready'):
    return {'status':status,'revision':'finale-v2','video':'/civic-sculpture/finale-v2/buffalo-civic-intro.mp4','ambientVideo':'/civic-sculpture/finale-v2/buffalo-civic-ambient.mp4','poster':'/civic-sculpture/finale-v2/buffalo-civic-poster.webp','mobilePoster':'/civic-sculpture/finale-v2/buffalo-civic-mobile.webp','openingPoster':'/civic-sculpture/finale-v2/buffalo-civic-opening.webp','width':1440,'height':720,'posterWidth':1440,'posterHeight':720,'mobilePosterWidth':960,'mobilePosterHeight':480,'fps':24,'durationSeconds':10,'frames':240,'fullWordRevealedAtSeconds':5.75,'fullWordSettledAtSeconds':215/24,'finaleSettledAtSeconds':215/24,'finalHoldSeconds':25/24,'ambientDurationSeconds':4,'ambientFrames':96,'ambientLoop':True,'ambientYawAmplitudeDegrees':1.25,'ambientFirstPoseMatchesIntroFinal':True,'audio':False,'recommendedPlayback':'Intro once, then matched ambient loop; pause/reduced motion/offscreen behavior belongs to integration. Final poster shows the complete sculpture.','mobileFraming':'All seven letters preserved in 2:1. Use contain; do not crop.','maskRecommendation':'Horizontal full-opacity region 4–96%; vertical full-opacity 22–80% retains all essential features.'}
try:
    # Pending interface lives only in the revision staging area.
    (STAGE/'manifest.json').write_text(json.dumps(manifest('rendering'),indent=2))
    if args.render:
        state('rendering',accepted_frames_reused=139,new_intro_frames=77,ambient_frames=96,render_log=str(REV/'render.log'))
        with (REV/'render.log').open('w',encoding='utf-8') as log:
            subprocess.run([str(BLENDER),'--background','--python',str(ROOT/'motion/blender/civic-sculpture/build_finale.py'),'--','--render'],stdout=log,stderr=subprocess.STDOUT,check=True)
    proof=json.loads((REV/'scene-provenance.json').read_text())
    assert proof['width']==1440 and proof['height']==720 and proof['samples']==20,'Final production render provenance missing.'
    originals=[BASE/'frames'/('civic-%04d.png'%i) for i in range(1,140)]
    tail=[REV/'intro-tail'/('civic-%04d.png'%i) for i in range(140,217)]
    loop=[REV/'ambient-frames'/('ambient-%04d.png'%i) for i in range(1,97)]
    missing=[str(p) for p in originals+tail+loop if not p.exists()]
    if missing:raise RuntimeError('Incomplete render; missing '+str(len(missing))+' frame(s), first '+missing[0])
    for p in [originals[0],originals[-1],tail[0],tail[-1],loop[0],loop[-1]]:
        with Image.open(p) as im:im.verify()
        with Image.open(p) as im:assert im.size==(1440,720)
    # The last changing intro frame, final poster, and first loop frame must agree.
    a=Image.open(tail[-1]).convert('RGB');b=Image.open(loop[0]).convert('RGB');c=Image.open(REV/'buffalo-civic-final.png').convert('RGB')
    seam=ImageChops.difference(a,b);poster_diff=ImageChops.difference(a,c)
    assert all(hi==0 for lo,hi in seam.getextrema()),'Intro-to-loop source seam differs.'
    assert all(hi==0 for lo,hi in poster_diff.getextrema()),'Final poster differs from final held intro pose.'
    loop_delta=ImageStat.Stat(ImageChops.difference(Image.open(loop[-1]).convert('RGB'),b)).mean
    # Last sampled pose is one frame before the mathematical loop endpoint.
    assert max(loop_delta)<3,'Unexpectedly large loop boundary discontinuity.'
    state('encoding',source_seam_max_difference=0,loop_boundary_mean_rgb_difference=loop_delta)
    introdir=REV/'intro-encode';introdir.mkdir(exist_ok=True)
    for i,p in enumerate(originals+tail,1):link(p,introdir/('intro-%04d.png'%i))
    finalhash=sha(tail[-1])
    for i in range(217,241):
        p=introdir/('intro-%04d.png'%i);link(tail[-1],p);assert sha(p)==finalhash
    iv=encode(introdir,'intro-%04d.png',240,'buffalo-civic-intro.mp4')
    av=encode(REV/'ambient-frames','ambient-%04d.png',96,'buffalo-civic-ambient.mp4')
    c.save(STAGE/'buffalo-civic-poster.webp',quality=91,method=6)
    c.resize((960,480),Image.Resampling.LANCZOS).save(STAGE/'buffalo-civic-mobile.webp',quality=90,method=6)
    Image.open(originals[0]).convert('RGB').save(STAGE/'buffalo-civic-opening.webp',quality=90,method=6)
    m=manifest();m.update(videoBytes=iv['bytes'],ambientVideoBytes=av['bytes'])
    (STAGE/'manifest.json').write_text(json.dumps(m,indent=2))
    files=[]
    for p in sorted(STAGE.iterdir()):
        if p.is_file():files.append({'path':p.name,'bytes':p.stat().st_size,'sha256':sha(p)})
    evidence={'status':'complete','revision':'finale-v2','created':'2026-10-15','author':'Astra','scene':proof,'delivery':m,'intro':iv,'ambient':av,'source_intro_to_ambient_max_pixel_difference':0,'source_final_poster_max_pixel_difference':0,'source_loop_last_to_first_mean_rgb_difference':loop_delta,'render_accounting':{'accepted_intro_frames_reused':139,'new_intro_frames_rendered':77,'held_final_duplicates':24,'ambient_frames_rendered':96,'ambient_duplicate_endpoint_encoded':False},'files':files,'editable_blend':{'path':str((REV/'buffalo-civic-finale.blend').relative_to(ROOT)),'bytes':(REV/'buffalo-civic-finale.blend').stat().st_size,'sha256':sha(REV/'buffalo-civic-finale.blend')},'sources':['motion/blender/civic-sculpture/build_finale.py','motion/blender/civic-sculpture/run_finale.py'],'visual_qa':'Primary approved opening/final/rock drafts. Draft intro-end and ambient-start were pixel-identical. Production source seams and encoded metadata verified. Browser playback review remains with integration owner.','external_assets':[],'preservation':'Accepted geometry, materials, floor and initial camera frames preserved. Old public v1 media remains recoverable at original paths; prior manifest saved with revision.'}
    (EV/'civic-sculpture-finale-v2-provenance.json').write_text(json.dumps(evidence,indent=2))
    # Publish versioned assets first; only advertise them after all files exist and match.
    state('promoting',video_bytes=iv['bytes'],ambient_video_bytes=av['bytes'])
    DEST.mkdir(parents=True,exist_ok=True)
    for p in STAGE.iterdir():
        if p.is_file():
            temporary=DEST/(p.name+'.tmp');shutil.copy2(p,temporary);os.replace(temporary,DEST/p.name)
            assert sha(DEST/p.name)==sha(p)
    old=PUB/'manifest.json';backup=REV/'accepted-manifest-v1.json'
    if old.exists() and not backup.exists():shutil.copy2(old,backup)
    temporary=PUB/'manifest.json.finale-v2.tmp';temporary.write_text(json.dumps(m,indent=2));os.replace(temporary,old)
    state('complete',video=m['video'],ambient_video=m['ambientVideo'],video_bytes=iv['bytes'],ambient_video_bytes=av['bytes'],intro_seconds=10,ambient_seconds=4,source_seam_max_difference=0)
except Exception as exc:
    state('failed',error=str(exc));traceback.print_exc();sys.exit(1)
