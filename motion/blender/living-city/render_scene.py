"""Render explicit frames from the editable master without rebuilding geometry."""
import argparse,bpy,hashlib,json,sys,time
from pathlib import Path
P=argparse.ArgumentParser();P.add_argument('--view',choices=['desktop','portrait'],default='desktop');P.add_argument('--engine',choices=['cycles','eevee'],default='cycles');P.add_argument('--width',type=int);P.add_argument('--height',type=int);P.add_argument('--samples',type=int,default=48);P.add_argument('--frames',default='1');P.add_argument('--prefix',default='lookdev');P.add_argument('--cpu',action='store_true');P.add_argument('--save',action='store_true');P.add_argument('--skip-existing',action='store_true')
args=P.parse_args(sys.argv[sys.argv.index('--')+1:]);ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/living-city';s=bpy.context.scene
s.render.use_persistent_data=True
s.camera=bpy.data.objects['CAMERA • '+('desktop' if args.view=='desktop' else 'portrait')+' hero']
s.render.engine='CYCLES' if args.engine=='cycles' else 'CYCLES'
if args.engine=='eevee':s.render.engine='BLENDER_EEVEE';s.eevee.taa_render_samples=args.samples
else:
    s.cycles.samples=args.samples;s.cycles.use_denoising=True;s.cycles.use_animated_seed=False
    if args.cpu:s.cycles.device='CPU'
    else:
        try:
            p=bpy.context.preferences.addons['cycles'].preferences;p.compute_device_type='HIP';p.get_devices()
            for d in p.devices:d.use=d.type=='HIP'
            s.cycles.device='GPU'
        except:s.cycles.device='CPU'
s.render.resolution_x=args.width or (1440 if args.view=='desktop' else 828);s.render.resolution_y=args.height or (960 if args.view=='desktop' else 1216)
bpy.data.collections['PANELS DESKTOP'].hide_render=args.view!='desktop';bpy.data.collections['PANELS PORTRAIT'].hide_render=args.view!='portrait'
if ':' in args.frames:
    parts=list(map(int,args.frames.split(':')));frames=range(parts[0],parts[1]+1,parts[2] if len(parts)>2 else 1)
else:frames=list(map(int,args.frames.split(',')))
dest=OUT/args.prefix;dest.mkdir(parents=True,exist_ok=True);timings=[]
source_record={'blendSha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'width':s.render.resolution_x,'height':s.render.resolution_y,'samples':args.samples,'engine':s.render.engine,'view':args.view}
source_path=dest/f'{args.view}-render-source.json'
if source_path.exists() and json.loads(source_path.read_text())!=source_record:raise RuntimeError('Render directory belongs to different scene/settings; use a new prefix.')
source_path.write_text(json.dumps(source_record,indent=2))
for frame in frames:
    if args.skip_existing and (dest/f'{args.view}-{frame:04d}.png').is_file():continue
    s.frame_set(frame);s.render.filepath=str(dest/f'{args.view}-{frame:04d}.png');start=time.time();bpy.ops.render.render(write_still=True);elapsed=time.time()-start;timings.append({'frame':frame,'seconds':round(elapsed,3)});print('FRAME_FINISHED',args.view,frame,round(elapsed,2),flush=True)
    (dest/f'{args.view}-render-timings.json').write_text(json.dumps(timings,indent=2))
    if (OUT/'pause-render').exists():print('RENDER_PAUSED_AFTER',args.view,frame,flush=True);break
(dest/f'{args.view}-render-timings.json').write_text(json.dumps(timings,indent=2))
if args.save:bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'living-city.blend'))
