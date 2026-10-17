"""Deterministic completion pipeline for Civic Sculpture.
python finish_intro.py --posters-only
python finish_intro.py --wait-pid <Blender PID>
python finish_intro.py   # Resume packaging after a completed render.
"""
from pathlib import Path
from PIL import Image
import argparse,ctypes,hashlib,json,os,shutil,struct,subprocess,sys,time,traceback
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'output/civic-sculpture'; PUB=ROOT/'public/civic-sculpture'; EV=ROOT/'evidence/premium-audit-20261015'
FF=ROOT/'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'; FP=FF.with_name('ffprobe.exe')
A=argparse.ArgumentParser(); A.add_argument('--wait-pid',type=int);A.add_argument('--posters-only',action='store_true'); args=A.parse_args()

def status(state,**kw):
    d={'state':state,'updated_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),**kw};(OUT/'pipeline-status.json').write_text(json.dumps(d,indent=2));print(json.dumps(d),flush=True)

def posters():
    im=Image.open(OUT/'buffalo-civic-final.png').convert('RGB')
    im.save(PUB/'buffalo-civic-poster.webp',quality=91,method=6)
    im.resize((960,480),Image.Resampling.LANCZOS).save(PUB/'buffalo-civic-mobile.webp',quality=90,method=6)
    opening=OUT/'frames/civic-0001.png'
    if opening.exists():Image.open(opening).convert('RGB').save(PUB/'buffalo-civic-opening.webp',quality=90,method=6)

def manifest(ready=False):
    d={'status':'ready' if ready else 'rendering','video':'/civic-sculpture/buffalo-civic-intro.mp4','poster':'/civic-sculpture/buffalo-civic-poster.webp','mobilePoster':'/civic-sculpture/buffalo-civic-mobile.webp','openingPoster':'/civic-sculpture/buffalo-civic-opening.webp','width':1440,'height':720,'posterWidth':1440,'posterHeight':720,'mobilePosterWidth':960,'mobilePosterHeight':480,'fps':24,'durationSeconds':8,'frames':192,'fullWordSettledAtSeconds':5.75,'finalHoldSeconds':2.25,'audio':False,'recommendedPlayback':'once, muted, playsInline; keep final frame visible; reduced motion uses final poster','mobileFraming':'All seven letters preserved. Same 2:1 aspect ratio. Use contain; do not crop to fill portrait.'}
    if ready:d['videoBytes']=(PUB/'buffalo-civic-intro.mp4').stat().st_size
    (PUB/'manifest.json').write_text(json.dumps(d,indent=2));return d

try:
    posters();manifest(False)
    if args.posters_only:
        print('Posters ready; animation remains in progress.',flush=True);sys.exit(0)
    if args.wait_pid:
        status('waiting_for_blender',blender_pid=args.wait_pid,expected_rendered_frames=139)
        kernel=ctypes.WinDLL('kernel32',use_last_error=True)
        kernel.OpenProcess.argtypes=[ctypes.c_uint32,ctypes.c_int,ctypes.c_uint32];kernel.OpenProcess.restype=ctypes.c_void_p
        kernel.WaitForSingleObject.argtypes=[ctypes.c_void_p,ctypes.c_uint32];kernel.WaitForSingleObject.restype=ctypes.c_uint32
        kernel.CloseHandle.argtypes=[ctypes.c_void_p]
        handle=kernel.OpenProcess(0x00100000,False,args.wait_pid)
        if handle:
            result=kernel.WaitForSingleObject(handle,3600000);kernel.CloseHandle(handle)
            if result!=0:raise RuntimeError('Blender did not finish within the one-hour pipeline deadline.')
    expected=[OUT/'frames'/('civic-%04d.png'%i) for i in range(1,140)]
    missing=[str(p) for p in expected if not p.exists()]
    if missing:raise RuntimeError('Render incomplete; missing '+str(len(missing))+' frames, first '+missing[0])
    scene=json.loads((OUT/'scene-provenance.json').read_text())
    if scene['width']!=1440 or scene['samples']!=20:raise RuntimeError('Production scene provenance is absent or does not match the production render.')
    for p in [expected[0],expected[69],expected[-1]]:
        with Image.open(p) as im:
            im.verify()
        with Image.open(p) as im:
            if im.size!=(1440,720):raise RuntimeError('Unexpected frame dimensions: '+str(p))
    # The bundled ffmpeg intentionally omits tpad. Materialize only the 53 hold
    # frames as links (or copies across filesystems) to the final rendered PNG.
    # The 139 costly Blender frames remain untouched.
    final_frame=expected[-1]
    final_hash=hashlib.sha256(final_frame.read_bytes()).hexdigest()
    for i in range(140,193):
        held=OUT/'frames'/('civic-%04d.png'%i)
        held.unlink(missing_ok=True)
        try:os.link(final_frame,held)
        except OSError:shutil.copy2(final_frame,held)
        if hashlib.sha256(held.read_bytes()).hexdigest()!=final_hash:
            raise RuntimeError('Final hold frame differs from the rendered final frame: '+str(held))
    status('encoding',rendered_moving_frames=139,held_duplicate_frames=53,encoded_frames=192)
    dest=PUB/'buffalo-civic-intro.mp4'
    subprocess.run([str(FF),'-hide_banner','-y','-framerate','24','-start_number','1','-i',str(OUT/'frames/civic-%04d.png'),'-frames:v','192','-c:v','libx264','-preset','slow','-crf','19','-pix_fmt','yuv420p','-r','24','-movflags','+faststart','-an',str(dest)],check=True)
    probe=json.loads(subprocess.check_output([str(FP),'-v','error','-show_entries','stream=codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,nb_frames,duration:format=duration,size','-of','json',str(dest)],text=True))
    streams=probe['streams'];videos=[v for v in streams if v['codec_type']=='video'];v=videos[0]
    assert len(videos)==1 and not any(v['codec_type']=='audio' for v in streams)
    assert v['codec_name']=='h264' and v['width']==1440 and v['height']==720 and v['r_frame_rate']=='24/1'
    assert int(v['nb_frames'])==192 and abs(float(probe['format']['duration'])-8)<.001
    # Verify fast-start container layout instead of relying only on the encoder flag.
    raw=dest.read_bytes();at=0;atoms=[]
    while at+8<=len(raw):
        size,typ=struct.unpack_from('>I4s',raw,at)
        if size==1:size=struct.unpack_from('>Q',raw,at+8)[0]
        if size==0:size=len(raw)-at
        atoms.append(typ.decode('ascii','replace'));at+=size
    assert atoms.index('moov')<atoms.index('mdat')
    posters();m=manifest(True)
    files=[]
    for p in [dest,PUB/'buffalo-civic-poster.webp',PUB/'buffalo-civic-mobile.webp',PUB/'buffalo-civic-opening.webp',OUT/'buffalo-civic-final.png',OUT/'buffalo-civic-sculpture.blend']:
        files.append({'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
    evidence={'status':'complete','created':'2026-10-15','author':'Astra','reference':'public/buffalo-directions-20261015/01-civic-sculpture.png — selected art direction only; not used as an image texture','method':'Original contour meshes for all seven letterforms, actual counter holes, Boolean-carved U flutes, stepped B civic relief, bronze F inlay and triangulated A bridge, 1.04-unit stone extrusion. One real perspective camera retreat.','geographic_fidelity':'Conceptual Buffalo-inspired civic relief, not measured replicas or a geographical reconstruction.','sources':['motion/blender/civic-sculpture/build_intro.py','motion/blender/civic-sculpture/finish_intro.py'],'scene':scene,'delivery':m,'rendered_moving_frames':139,'held_duplicate_frames':53,'hold_method':'Frame 139 is reached at 5.75 s. Frames 140–192 are 53 hardlinks or copies of that rendered PNG, verified byte-identical before encoding. The 2.25-second final hold uses no additional Blender renders.','ffprobe':probe,'fast_start_atoms':atoms,'files':files,'visual_qa':'Draft opening, intermediate and final frames inspected. Primary approved corrected opening/final drafts after removing the horizon and B waist artifact. Production final PNG inspected. Final encoded animation still needs browser playback review by integration owner.','external_assets':[],'limits':['No audio. Intended to play once, not as a seamless loop.','Mobile poster preserves the entire word and needs contain framing.','Website integration is outside this asset-authoring task.']}
    (EV/'civic-sculpture-provenance.json').write_text(json.dumps(evidence,indent=2))
    (OUT/'ffprobe.json').write_text(json.dumps(probe,indent=2))
    status('complete',video=str(dest),video_bytes=dest.stat().st_size,rendered_moving_frames=139,held_duplicate_frames=53,encoded_frames=192,duration_seconds=8,final_hold_seconds=2.25)
except Exception as e:
    status('failed',error=str(e));traceback.print_exc();sys.exit(1)
