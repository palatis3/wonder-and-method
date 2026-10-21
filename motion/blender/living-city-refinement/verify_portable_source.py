"""Render one approved quarter-cycle crop from the portable bundle after delivery."""
import bpy, hashlib, json, time
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
OUT=ROOT/'output/living-city-refinement'
bundle=json.loads((HERE/'source-bundle.json').read_text())
source=HERE/'living-city-refined-loop4.blend'
if hashlib.sha256(source.read_bytes()).hexdigest()!=bundle['portableBlendSha256']:
    raise RuntimeError('Portable scene identity differs from the verified bundle.')
bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False,use_scripts=False)
for im in bpy.data.images:
    if im.source=='FILE' and (not im.filepath.replace('\\','/').startswith('//textures/') or not Path(bpy.path.abspath(im.filepath)).is_file()):
        raise RuntimeError('Portable scene contains an unresolved relative image: '+im.filepath)
s=bpy.context.scene
s.camera=bpy.data.objects['CAMERA • desktop hero']
s.render.engine='CYCLES'
s.cycles.samples=64
s.cycles.adaptive_threshold=.025
s.cycles.use_denoising=True
s.cycles.use_animated_seed=False
s.cycles.seed=19
s.cycles.device='GPU'
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='HIP'
prefs.get_devices()
if not any(d.type=='HIP' for d in prefs.devices):raise RuntimeError('HIP device unavailable.')
for device in prefs.devices:device.use=device.type=='HIP'
s.render.resolution_x,s.render.resolution_y=1440,960
s.render.resolution_percentage=100
s.render.use_persistent_data=True
s.render.use_border=True
s.render.use_crop_to_border=True
s.render.border_min_x,s.render.border_max_x=0,1
s.render.border_min_y,s.render.border_max_y=0,.45
s.render.image_settings.file_format='PNG'
s.render.image_settings.color_mode='RGB'
s.render.image_settings.color_depth='8'
s.frame_set(25)
s.render.filepath=str(OUT/'portable-source-quarter-crop.png')
started=time.perf_counter()
bpy.ops.render.render(write_still=True)
record={'portableBlendSha256':bundle['portableBlendSha256'],'packedRenderMasterSha256':bundle['packedRenderMasterSha256'],
        'view':'desktop','frame':25,'samples':64,'seed':19,'adaptiveThreshold':.025,
        'renderSeconds':round(time.perf_counter()-started,3),'crop':s.render.filepath,
        'reference':str(OUT/'crop-benchmark/desktop/0025.png'),'noOtherGpuJobDuringThisCheck':True}
(OUT/'portable-source-render.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print('PORTABLE_SOURCE_SPOT_CHECK',json.dumps(record),flush=True)
