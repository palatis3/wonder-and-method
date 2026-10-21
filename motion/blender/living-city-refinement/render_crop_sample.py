"""Bounded Cycles crop benchmark/temporal sample; never starts full delivery.

The render border preserves the original camera and full scene for reflections.
Only the padded lower-city region is traced for the foreground sample. Offline
compositing restores the static clean-city beauty into a conventional full frame.
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/living-city-refinement'
P=argparse.ArgumentParser()
P.add_argument('--view',choices=['desktop','portrait'],default='desktop')
P.add_argument('--frames',default='1,25')
P.add_argument('--scale',type=int,choices=[50,100],default=100)
P.add_argument('--samples',type=int,default=64)
P.add_argument('--threshold',type=float,default=.025)
P.add_argument('--fraction',type=float)
P.add_argument('--prefix',default='crop-benchmark')
args=P.parse_args(sys.argv[sys.argv.index('--')+1:])
frames=[int(v) for v in args.frames.split(',')]
if len(frames)>48 or len(frames)!=len(set(frames)) or any(f<1 or f>97 for f in frames):
    raise RuntimeError('This script is limited to a bounded sample of at most48 distinct frames of the4s loop.')
if Path(args.prefix).name!=args.prefix:
    raise RuntimeError('Sample prefix must be a simple folder name.')
source=OUT/'living-city-refined-loop4.blend'
if Path(bpy.data.filepath).resolve()!=source.resolve():
    bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
s=bpy.context.scene
s.camera=bpy.data.objects['CAMERA • '+('desktop' if args.view=='desktop' else 'portrait')+' hero']
s.render.engine='CYCLES'
s.cycles.samples=args.samples
s.cycles.adaptive_threshold=args.threshold
s.cycles.use_denoising=True
s.cycles.use_animated_seed=False
s.cycles.seed=19
s.render.use_persistent_data=True
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='HIP'
prefs.get_devices()
if not any(d.type=='HIP' for d in prefs.devices):
    raise RuntimeError('HIP GPU unavailable.')
for d in prefs.devices:
    d.use=d.type=='HIP'
s.cycles.device='GPU'
s.render.resolution_x,s.render.resolution_y=(1440,960) if args.view=='desktop' else (828,1216)
s.render.resolution_percentage=args.scale
fraction=args.fraction or (.45 if args.view=='desktop' else .30)
if not .20<=fraction<=.60:
    raise RuntimeError('Crop outside intended lower-city range.')
s.render.use_border=True
s.render.use_crop_to_border=True
s.render.border_min_x=0
s.render.border_max_x=1
s.render.border_min_y=0
s.render.border_max_y=fraction
s.render.image_settings.file_format='PNG'
s.render.image_settings.color_mode='RGB'
s.render.image_settings.color_depth='8'
dest=OUT/args.prefix/args.view
dest.mkdir(parents=True,exist_ok=True)
report={'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'view':args.view,'frames':frames,'samples':args.samples,'adaptiveThreshold':args.threshold,
        'baseWidth':s.render.resolution_x,'baseHeight':s.render.resolution_y,'resolutionPercent':args.scale,
        'borderBottomFraction':fraction,'fps':24,'loopSeconds':4,'timings':[],
        'cameraLocked':not bool(s.camera.animation_data),'panelCollectionsHidden':all(c.hide_render for c in bpy.data.collections if c.name.startswith('PANELS ')),
        'scope':'Bounded benchmark/temporal sample only; no public files or full delivery sequence.'}
leaf_bounds=[]
s.frame_set(1)
for ob in bpy.data.objects:
    if not ob.name.startswith('potted_plant_01_leaves.'):
        continue
    coords=[world_to_camera_view(s,s.camera,ob.matrix_world@Vector(v)) for v in ob.bound_box]
    bound={'object':ob.name,'left':min(v.x for v in coords),'right':max(v.x for v in coords),
           'bottom':min(v.y for v in coords),'top':max(v.y for v in coords)}
    leaf_bounds.append(bound)
    if bound['top']>fraction-.025:
        raise RuntimeError(f'Animated leaves do not fit the padded crop: {bound}')
report['animatedLeafBoundsNormalized']=leaf_bounds
manifest=dest/'render-manifest.json'
manifest.write_text(json.dumps(report,indent=2),encoding='utf-8')
for frame in frames:
    s.frame_set(frame)
    s.render.filepath=str(dest/f'{frame:04d}.png')
    start=time.perf_counter()
    bpy.ops.render.render(write_still=True)
    elapsed=round(time.perf_counter()-start,3)
    row={'frame':frame,'seconds':elapsed,'path':s.render.filepath}
    report['timings'].append(row)
    manifest.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('CROP_FRAME',json.dumps(row),flush=True)
print('CROP_SAMPLE_COMPLETE',str(manifest),flush=True)
