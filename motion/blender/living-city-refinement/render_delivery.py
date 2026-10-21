"""Resume the approved 96-frame Cycles delivery, preserving its exact gate source."""
from __future__ import annotations
import argparse, hashlib, json, shutil, sys, time
from pathlib import Path
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/living-city-refinement'
SOURCE=OUT/'living-city-refined-loop4.blend'
EXPECTED_SOURCE='7963732b4c6adcdd8788e5b9a6852213f3a66bd35fb03d27b11481a72084a945'
P=argparse.ArgumentParser()
P.add_argument('--view',choices=['desktop','portrait'],required=True)
args=P.parse_args(sys.argv[sys.argv.index('--')+1:])

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def save_report():
    report['complete']=len(report['timings'])==96
    report['completedFrames']=len(report['timings'])
    report['renderedFrames']=sum(not r['reused'] for r in report['timings'])
    report['reusedFrames']=sum(r['reused'] for r in report['timings'])
    temporary=manifest.with_suffix('.tmp')
    temporary.write_text(json.dumps(report,indent=2),encoding='utf-8')
    temporary.replace(manifest)

approval=json.loads((OUT/'delivery-approval.json').read_text())
if not approval['approved'] or approval['sourceSha256']!=EXPECTED_SOURCE or sha(SOURCE)!=EXPECTED_SOURCE:
    raise RuntimeError('Approved exact source identity is required.')
bpy.ops.wm.open_mainfile(filepath=str(SOURCE),load_ui=False,use_scripts=False)
s=bpy.context.scene
s.camera=bpy.data.objects['CAMERA • '+('desktop' if args.view=='desktop' else 'portrait')+' hero']
s.render.engine='CYCLES'
s.cycles.samples=64
s.cycles.adaptive_threshold=.025
s.cycles.use_denoising=True
s.cycles.use_animated_seed=False
s.cycles.seed=19
s.render.use_persistent_data=True
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='HIP'
prefs.get_devices()
if not any(d.type=='HIP' for d in prefs.devices):
    raise RuntimeError('Approved HIP GPU is unavailable.')
for d in prefs.devices:
    d.use=d.type=='HIP'
s.cycles.device='GPU'
s.render.resolution_x,s.render.resolution_y=(1440,960) if args.view=='desktop' else (828,1216)
s.render.resolution_percentage=100
fraction=.45 if args.view=='desktop' else .30
s.render.use_border=True
s.render.use_crop_to_border=True
s.render.border_min_x=0
s.render.border_max_x=1
s.render.border_min_y=0
s.render.border_max_y=fraction
s.render.image_settings.file_format='PNG'
s.render.image_settings.color_mode='RGB'
s.render.image_settings.color_depth='8'
s.render.fps,s.render.fps_base=24,1
s.frame_start,s.frame_end=1,96
if s.camera.animation_data or not all(c.hide_render for c in bpy.data.collections if c.name.startswith('PANELS ')):
    raise RuntimeError('Gate camera/panel invariants changed.')
s.frame_set(1)
for ob in bpy.data.objects:
    if ob.name.startswith('potted_plant_01_leaves.'):
        coords=[world_to_camera_view(s,s.camera,ob.matrix_world@Vector(v)) for v in ob.bound_box]
        if max(v.y for v in coords)>fraction-.025:
            raise RuntimeError('Animated foliage has escaped the approved crop.')
external=[im.name for im in bpy.data.images if im.source=='FILE' and not im.packed_file and not im.packed_files]
if external or bpy.data.libraries:
    raise RuntimeError(f'Portable scene contains unpacked dependencies: {external}')
portable=Path(__file__).parent/'living-city-refined-loop4.blend'
if not portable.exists():
    shutil.copy2(SOURCE,portable)
portable_hash=sha(portable)
if portable_hash!=EXPECTED_SOURCE:
    bundle=json.loads((Path(__file__).parent/'source-bundle.json').read_text())
    if (bundle['packedRenderMasterSha256']!=EXPECTED_SOURCE or bundle['portableBlendSha256']!=portable_hash
            or not bundle['structuralSnapshotBeforeEqualsAfter']):
        raise RuntimeError('Portable source must match the verified exact-content bundle.')

dest=OUT/'delivery'/args.view
dest.mkdir(parents=True,exist_ok=True)
manifest=dest/'render-manifest.json'
base={'source':str(SOURCE),'sourceSha256':EXPECTED_SOURCE,'portableSource':str(portable),
      'portableSourceSha256':portable_hash,'view':args.view,'frames':list(range(1,97)),
      'samples':64,'adaptiveThreshold':.025,'baseWidth':s.render.resolution_x,
      'baseHeight':s.render.resolution_y,'resolutionPercent':100,'borderBottomFraction':fraction,
      'fps':24,'loopSeconds':4,'timings':[],'cameraLocked':True,'panelCollectionsHidden':True,
      'blenderVersion':bpy.app.version_string,'device':'HIP','seed':19,'denoising':True,
      'portableScene':{'packedFileImages':sum(im.source=='FILE' for im in bpy.data.images),
                       'unpackedFileImages':external,'linkedLibraries':0},
      'scriptSha256':sha(__file__),'scope':'Approved full delivery; unique frames 1–96.'}
report=base
if manifest.exists():
    old=json.loads(manifest.read_text())
    for key in ['sourceSha256','view','samples','adaptiveThreshold','baseWidth','baseHeight','resolutionPercent','borderBottomFraction']:
        if old[key]!=base[key]:
            raise RuntimeError(f'Existing delivery differs at {key}.')
    for row in old['timings']:
        if not Path(row['path']).is_file() or sha(row['path'])!=row['sha256']:
            raise RuntimeError(f'Completed frame identity mismatch: {row["frame"]}')
        report['timings'].append(row)
completed={r['frame'] for r in report['timings']}
for prefix in ['seam-sample','crop-benchmark']:
    previous_path=OUT/prefix/args.view/'render-manifest.json'
    previous=json.loads(previous_path.read_text())
    for key in ['sourceSha256','view','samples','adaptiveThreshold','baseWidth','baseHeight','resolutionPercent','borderBottomFraction']:
        if previous[key]!=base[key]:
            raise RuntimeError(f'Reusable sample differs at {key}.')
    for row in previous['timings']:
        frame=row['frame']
        if frame in completed or not 1<=frame<=96:
            continue
        path=dest/f'{frame:04d}.png'
        shutil.copy2(row['path'],path)
        report['timings'].append({'frame':frame,'seconds':0,'originalRenderSeconds':row['seconds'],
            'path':str(path),'sha256':sha(path),'reused':True,'sourceManifest':str(previous_path)})
        completed.add(frame)
report['timings'].sort(key=lambda r:r['frame'])
save_report()
print('DELIVERY_START',json.dumps({'view':args.view,'reused':len(completed),'remaining':96-len(completed)}),flush=True)
for frame in range(1,97):
    if frame in completed:
        continue
    s.frame_set(frame)
    s.render.filepath=str(dest/f'{frame:04d}.png')
    started=time.perf_counter()
    bpy.ops.render.render(write_still=True)
    row={'frame':frame,'seconds':round(time.perf_counter()-started,3),'path':s.render.filepath,
         'sha256':sha(s.render.filepath),'reused':False}
    report['timings'].append(row)
    report['timings'].sort(key=lambda r:r['frame'])
    save_report()
    print('DELIVERY_FRAME',json.dumps({'view':args.view,'frame':frame,'seconds':row['seconds'],
          'complete':report['completedFrames']}),flush=True)
if sha(SOURCE)!=EXPECTED_SOURCE:
    raise RuntimeError('Approved source changed during rendering.')
print('DELIVERY_COMPLETE',str(manifest),flush=True)
