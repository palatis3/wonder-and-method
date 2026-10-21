"""Render the frozen approved scene sequentially, then encode verified delivery."""
from pathlib import Path
import argparse,hashlib,json,shutil,subprocess,sys,time
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/living-city';SCRIPTS=Path(__file__).resolve().parent
P=argparse.ArgumentParser();P.add_argument('--blender',default='C:/Program Files/Blender Foundation/Blender 5.2/blender.exe');P.add_argument('--gate',default='gate-v5');args=P.parse_args()
blend=OUT/'living-city.blend';digest=hashlib.sha256(blend.read_bytes()).hexdigest();verification=json.loads((OUT/'scene-verification.json').read_text())
if verification.get('blendSha256')!=digest:raise RuntimeError('Scene verification does not match the frozen master')
destination=OUT/'final-frames';destination.mkdir(parents=True,exist_ok=True)
start=time.time();summary=[]
for view,w,h,priority in [('desktop',1440,960,[37,51,65]),('portrait',828,1216,[29,39,49])]:
    expected={'blendSha256':digest,'width':w,'height':h,'samples':64,'engine':'CYCLES','view':view}
    gate=OUT/args.gate;source_record=json.loads((gate/f'{view}-render-source.json').read_text())
    if source_record!=expected:raise RuntimeError('Gate frames differ from final master/settings')
    record_path=destination/f'{view}-render-source.json'
    if record_path.exists() and json.loads(record_path.read_text())!=expected:raise RuntimeError('Existing final frames belong to another source')
    record_path.write_text(json.dumps(expected,indent=2))
    hold=verification['cameras'][view]['settledFrame']
    for f in gate.glob(view+'-*.png'):
        frame=int(f.stem.rsplit('-',1)[1])
        if 1<=frame<=hold and not (destination/f.name).exists():shutil.copyfile(f,destination/f.name)
    remaining=[f for f in range(1,hold+1) if not (destination/f'{view}-{f:04d}.png').is_file()]
    order=[f for f in priority if f in remaining]+[f for f in remaining if f not in priority]
    print('DELIVERY_START',view,'remaining unique frames',len(order),flush=True)
    if order:
        subprocess.run([args.blender,'--background','--disable-autoexec',str(blend),'--python',str(SCRIPTS/'render_scene.py'),'--','--view',view,'--samples','64','--frames',','.join(map(str,order)),'--prefix','final-frames','--skip-existing'],check=True)
    missing=[f for f in range(1,hold+1) if not (destination/f'{view}-{f:04d}.png').is_file()]
    if missing:raise RuntimeError('Delivery paused or incomplete: '+view+' '+str(missing))
    summary.append({'view':view,'renderedThisRun':len(order),'uniqueFrames':hold})
subprocess.run([sys.executable,str(SCRIPTS/'encode_delivery.py')],check=True)
(OUT/'delivery-run.json').write_text(json.dumps({'blendSha256':digest,'elapsedSeconds':round(time.time()-start,2),'cameras':summary},indent=2))
print('DELIVERY_COMPLETE',round(time.time()-start,2),'seconds',flush=True)
