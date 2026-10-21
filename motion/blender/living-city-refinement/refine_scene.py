"""Reproducible, non-destructive clean-city lookdev and periodic ambient scene.

Run with Blender 5.2 in background mode. This always starts from the packed
baseline; it writes only output/living-city-refinement. It renders at most one
gate image per invocation. Full delivery rendering is deliberately not included.

Example:
  blender --background --disable-autoexec --python refine_scene.py --
    --engine cycles --view desktop --samples 64 --loop-seconds 4 --render --save-blend

The ambient motion uses simple deterministic drivers, not handlers or external
scripts embedded in the blend. With the four-second delivery setting, frames 1
and 97 have the same phase and velocity; encode unique frames 1..96 at 24 fps.
Other supported durations use the same parameterized periodic construction.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'output/living-city-refinement'
TRACKED_BASELINE = ROOT / 'motion/blender/living-city/living-city.blend'
GENERATED_BASELINE = ROOT / 'output/living-city/living-city.blend'
BASELINE_SHA256 = '64e1c1489458c22af03d28621050b9d49991873df4ec4978a1195d373fe8c27f'
TRACKED_BASELINE_MATCHES = (TRACKED_BASELINE.is_file() and
    hashlib.sha256(TRACKED_BASELINE.read_bytes()).hexdigest() == BASELINE_SHA256)
BASELINE = TRACKED_BASELINE if TRACKED_BASELINE_MATCHES else GENERATED_BASELINE
REVISION = 'clean-city-lighting-v1'
TAU = 2 * math.pi


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--baseline', type=Path, default=BASELINE)
    p.add_argument('--view', choices=['desktop', 'portrait'], default='desktop')
    p.add_argument('--engine', choices=['cycles', 'eevee'], default='cycles')
    p.add_argument('--samples', type=int, default=64)
    p.add_argument('--loop-seconds', type=int, choices=[2,4,6], default=4)
    p.add_argument('--frame', type=int, default=1)
    p.add_argument('--render', action='store_true')
    p.add_argument('--save-blend', action='store_true')
    p.add_argument('--cpu', action='store_true')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def required(name):
    ob = bpy.data.objects.get(name)
    if ob is None:
        raise RuntimeError(f'Baseline object missing: {name}')
    return ob


def drive(owner, property_name, expression, index=None):
    fc = owner.driver_add(property_name) if index is None else owner.driver_add(property_name, index)
    fc.driver.type = 'SCRIPTED'
    fc.driver.expression = expression
    return fc


def phase_expression(period):
    return f'({TAU:.17g}*(frame-1)/{period})'


def disable_boards(scene):
    names = []
    for col in bpy.data.collections:
        if not col.name.startswith('PANELS '):
            continue
        objects = list(col.all_objects)
        for ob in objects:
            if ob is None:
                continue
            ob.animation_data_clear()
            ob.hide_render = True
            ob.hide_viewport = True
        col.hide_render = True
        col.hide_viewport = True
        names.append(col.name)
    if len(names) != 2:
        raise RuntimeError(f'Expected exactly two baseline panel collections, found {names}')
    # Keep the authored arrival composition. Motion is confined to the city.
    scene.frame_set(1)
    poses = {}
    for ob in bpy.data.objects:
        if ob.type == 'CAMERA':
            ob.animation_data_clear()
            poses[ob.name] = {'location':list(ob.location), 'rotation':list(ob.rotation_euler),
                              'lens':ob.data.lens, 'shiftY':ob.data.shift_y}
    return {'hiddenPanelCollections':names, 'lockedCameras':poses}


def refine_lighting(scene):
    # Energy changes are selective, with the original sky/exposure untouched.
    adjustments = {
        'Broad cool dusk sky': (1.40, 1.12),
        'Cool foreground fill': (1.30, 1.22),
        'Right architectural rim': (1.38, 1.18),
        'Left garden soft reflected dusk bounce': (1.25, 1.20),
        'Garden window reflected shore bounce': (1.15, 1.15),
        'Warm reflected limestone fill': (1.08, 1.22),
        'Fieldwork doorway warm spill': (1.20, 1.25),
        'Northline entry warm spill': (1.25, 1.25),
        'Hearthside threshold warm spill': (1.20, 1.25),
        'Upper timber reflected warm bounce': (1.08, 1.15),
    }
    changes = []
    for name, (energy_factor,size_factor) in adjustments.items():
        ob = required(name)
        old_energy, old_size = ob.data.energy, ob.data.size
        ob.data.energy *= energy_factor
        ob.data.size *= size_factor
        changes.append({'object':name,'energyBefore':old_energy,'energyAfter':ob.data.energy,
                        'sizeBefore':old_size,'sizeAfter':ob.data.size})

    # One broad existing cool source may appear in glossy glass/water rays.
    # This adds a physically motivated reflection, not a composited bloom.
    reflected = required('Cool foreground fill')
    reflected.visible_glossy = True
    reflected.data.specular_factor = 0.30
    for name in ['Clear architectural glass','Northline upper glazing • cool restrained reflection']:
        mat = bpy.data.materials.get(name)
        if mat is None:
            continue
        p = mat.node_tree.nodes.get('Principled BSDF')
        p.inputs['Roughness'].default_value = .055 if name == 'Clear architectural glass' else .07
        # Ray-traced transmission and slab thickness apply to EEVEE only.
        mat.surface_render_method = 'DITHERED'
        mat.use_raytrace_refraction = True
        mat.thickness_mode = 'SLAB'
        output = next(n for n in mat.node_tree.nodes if n.type == 'OUTPUT_MATERIAL')
        if 'Thickness' in output.inputs:
            output.inputs['Thickness'].default_value = .012
    # Preserve the matte photographed brick and timber textures unchanged.
    return changes


def animate_water(period):
    ob = required('Continuous waterfront ripples')
    ob.data = ob.data.copy()
    basis = ob.shape_key_add(name='Basis', from_mix=False)
    original = [v.co.copy() for v in basis.data]
    wave_defs = [
        ('Water primary sine', .021, 5, 9, 'sin', f'cos({phase_expression(period)})-1'),
        ('Water primary cosine', .021, 5, 9, 'cos', f'-sin({phase_expression(period)})'),
        ('Water secondary sine', .008, 11, -17, 'sin', f'cos(2*{phase_expression(period)})-1'),
        ('Water secondary cosine', .008, 11, -17, 'cos', f'sin(2*{phase_expression(period)})'),
    ]
    for name, amplitude, kx, ky, function, expr in wave_defs:
        key = ob.shape_key_add(name=name, from_mix=False)
        key.slider_min = -2
        key.slider_max = 2
        trig = math.sin if function == 'sin' else math.cos
        for v, source in zip(key.data, original):
            v.co.z = source.z + amplitude * trig(source.x*kx + source.y*ky)
        drive(key, 'value', expr)

    mat = bpy.data.materials['Petrol water • small fixed surface ripples']
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    noise = next(n for n in nodes if n.type == 'TEX_NOISE')
    coord = nodes.new('ShaderNodeTexCoord')
    coord.name = 'Ambient water coordinates'
    mapping = nodes.new('ShaderNodeMapping')
    mapping.name = 'Periodic water micro-ripple drift'
    links.new(coord.outputs['Generated'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    ph = phase_expression(period)
    drive(mapping.inputs['Location'], 'default_value', f'.012*sin({ph})', 0)
    drive(mapping.inputs['Location'], 'default_value', f'.009*(cos({ph})-1)', 1)
    mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .145
    return {'object':ob.name, 'vertexCount':len(original), 'primaryAmplitudeMeters':.021,
            'secondaryAmplitudeMeters':.008, 'primaryCycles':1, 'secondaryCycles':2,
            'microRipplePath':'closed ellipse in Generated coordinates', 'roughness':.145}


def animate_leaf_tips(period):
    animated = []
    for index, ob in enumerate(sorted((o for o in bpy.data.objects if o.name.startswith('potted_plant_01_leaves.')), key=lambda o:o.name)):
        # Pots/stems/rear trees stay locked; only three exposed leaf meshes move.
        ob.data = ob.data.copy()
        basis = ob.shape_key_add(name='Basis', from_mix=False)
        key = ob.shape_key_add(name='Gentle exposed leaf tip bend', from_mix=False)
        key.slider_min, key.slider_max = -1, 1
        zmin = min(v.co.z for v in basis.data)
        zmax = max(v.co.z for v in basis.data)
        span = max(.01, zmax-zmin)
        for v, original in zip(key.data, basis.data):
            weight = ((original.co.z-zmin)/span)**2
            v.co.x += .010 * weight
            v.co.y += .004 * weight * math.sin(original.co.x*5 + original.co.y*3)
        offset = index * 1.71
        ph = phase_expression(period)
        drive(key, 'value', f'.72*sin({ph}+{offset})+.28*sin(2*{ph}+{offset})')
        animated.append({'object':ob.name,'maxLocalTipDisplacementMeters':.0108,'phaseOffset':offset})
    return animated


def animate_oven(period):
    ph = phase_expression(period)
    variation = f'(1+.027*sin(3*{ph})+.013*sin(7*{ph}))'
    fire = required('Recessed amber oven fire')
    base_energy = fire.data.energy
    drive(fire.data,'energy',f'{base_energy:.12g}*{variation}')
    mat = bpy.data.materials['Oven flame golden core']
    emission = mat.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength']
    base_emission = emission.default_value
    drive(emission,'default_value',f'{base_emission:.12g}*{variation}')
    return {'light':fire.name, 'baseEnergy':base_energy, 'maximumVariationFraction':.04,
            'harmonics':[3,7], 'emissionLinked':True}


def configure_renderer(scene,args):
    details = {'engine':args.engine,'samples':args.samples}
    if args.engine == 'cycles':
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = args.samples
        scene.cycles.use_denoising = True
        scene.cycles.use_animated_seed = False
        scene.cycles.seed = 19
        scene.cycles.adaptive_threshold = .025
        scene.cycles.max_bounces = 9
        scene.cycles.diffuse_bounces = 3
        scene.cycles.glossy_bounces = 4
        scene.cycles.transmission_bounces = 8
        scene.cycles.transparent_max_bounces = 8
        if args.cpu:
            scene.cycles.device = 'CPU'
        else:
            prefs = bpy.context.preferences.addons['cycles'].preferences
            prefs.compute_device_type = 'HIP'
            prefs.get_devices()
            hip = [d for d in prefs.devices if d.type == 'HIP']
            if not hip:
                raise RuntimeError('HIP GPU unavailable; refusing an unmeasured CPU render.')
            for d in prefs.devices:
                d.use = d.type == 'HIP'
            scene.cycles.device = 'GPU'
            details['devices'] = [d.name for d in hip]
        details.update({'device':scene.cycles.device,'denoising':True,'adaptiveThreshold':.025,
                        'maxBounces':9,'diffuseBounces':3,'glossyBounces':4,'transmissionBounces':8,
                        'animatedSeed':False,'seed':19})
    else:
        scene.render.engine = 'BLENDER_EEVEE'
        e = scene.eevee
        e.taa_render_samples = args.samples
        e.use_raytracing = True
        e.ray_tracing_method = 'SCREEN'
        e.use_fast_gi = True
        e.fast_gi_method = 'GLOBAL_ILLUMINATION'
        e.fast_gi_quality = .75
        e.fast_gi_ray_count = 4
        e.fast_gi_step_count = 16
        e.fast_gi_resolution = '2'
        e.fast_gi_thickness_near = .08
        e.shadow_ray_count = 4
        e.shadow_step_count = 12
        e.use_overscan = True
        e.overscan_size = 5
        r = e.ray_tracing_options
        r.resolution_scale = '1'
        r.screen_trace_quality = .75
        r.screen_trace_thickness = .025
        r.trace_max_roughness = .6
        r.use_denoise = True
        details.update({'rayTracing':True,'method':'SCREEN','rayResolution':'1:1',
                        'traceQuality':.75,'screenThickness':.025,'fastGIQuality':.75,
                        'fastGIRays':4,'fastGISteps':16,'shadowRays':4,'shadowSteps':12,
                        'overscanPercent':5,'probeBake':False})
    return details


def periodic_state(scene, frame):
    integer = math.floor(frame)
    scene.frame_set(integer,subframe=frame-integer)
    bpy.context.view_layer.update()
    water = bpy.data.objects['Continuous waterfront ripples']
    states = {f'water:{k.name}':k.value for k in water.data.shape_keys.key_blocks if k.name!='Basis'}
    for ob in bpy.data.objects:
        if ob.name.startswith('potted_plant_01_leaves.') and ob.data.shape_keys:
            states[ob.name] = ob.data.shape_keys.key_blocks['Gentle exposed leaf tip bend'].value
    states['ovenEnergy'] = bpy.data.objects['Recessed amber oven fire'].data.energy
    mat = bpy.data.materials['Petrol water • small fixed surface ripples']
    location = mat.node_tree.nodes['Periodic water micro-ripple drift'].inputs['Location'].default_value
    states['microRippleX'],states['microRippleY'] = location[0],location[1]
    return states


def verify_periodicity(scene, period):
    first,last = periodic_state(scene,1),periodic_state(scene,1+period)
    epsilon = .01
    fbefore,fafter = periodic_state(scene,1-epsilon),periodic_state(scene,1+epsilon)
    lbefore,lafter = periodic_state(scene,1+period-epsilon),periodic_state(scene,1+period+epsilon)
    position_error = max(abs(first[k]-last[k]) for k in first)
    velocity_error = max(abs((fafter[k]-fbefore[k])-(lafter[k]-lbefore[k]))/(2*epsilon) for k in first)
    midpoint = periodic_state(scene,1+period*.25)
    changed = [k for k in first if abs(first[k]-midpoint[k])>1e-6]
    if position_error > 1e-4 or velocity_error > .005 or not changed:
        raise RuntimeError(f'Periodic motion validation failed: {position_error}, {velocity_error}, {changed}')
    return {'firstFrame':1,'equivalentSeamFrame':1+period,'encodeFrames':[1,period],
            'maxStateError':position_error,'maxVelocityErrorPerFrame':velocity_error,
            'changedAtQuarterCycle':changed,'note':'Analytical driver state only; rendered seam and temporal stability still require visual verification.'}


def main():
    args = parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    baseline = args.baseline.resolve()
    if baseline not in {TRACKED_BASELINE.resolve(),GENERATED_BASELINE.resolve()}:
        raise RuntimeError('This gate is scoped to the tracked packed baseline or its generated copy only.')
    if not baseline.is_file():
        raise RuntimeError('The approved historical baseline is unavailable. Open the self-contained refined .blend directly; the current tracked baseline is not source-identical.')
    baseline_hash = digest(baseline)
    if baseline_hash != BASELINE_SHA256:
        raise RuntimeError('The selected packed baseline differs from the approved source identity.')
    started = time.perf_counter()
    if Path(bpy.data.filepath).resolve() != baseline:
        bpy.ops.wm.open_mainfile(filepath=str(baseline),load_ui=False,use_scripts=False)
    s = bpy.context.scene
    framing = disable_boards(s)
    lights = refine_lighting(s)
    period = args.loop_seconds * 24
    water = animate_water(period)
    foliage = animate_leaf_tips(period)
    oven = animate_oven(period)
    s.frame_start,s.frame_end = 1,period
    s.render.fps,s.render.fps_base = 24,1
    s.render.use_persistent_data = True
    s.render.film_transparent = False
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGB'
    s.render.image_settings.color_depth = '8'
    s.render.resolution_percentage = 100
    s.render.resolution_x,s.render.resolution_y = (1440,960) if args.view=='desktop' else (828,1216)
    s.camera = required('CAMERA • '+('desktop' if args.view=='desktop' else 'portrait')+' hero')
    renderer = configure_renderer(s,args)
    motion = verify_periodicity(s,period)
    s.frame_set(args.frame)
    s['refinement_revision'] = REVISION
    s['motion_notes'] = f'Clean city only. Locked cameras. {args.loop_seconds}s periodic ambient loop at24fps; encode frames1..{period}. Native HTML owns the12s concept narrative.'
    tag = f'{args.engine}-{args.view}-s{args.samples}-f{args.frame:04d}'
    report = {'revision':REVISION,'baselinePath':str(baseline),'baselineSha256':baseline_hash,
              'scriptSha256':digest(Path(__file__)),'blenderVersion':bpy.app.version_string,
              'view':args.view,'width':s.render.resolution_x,'height':s.render.resolution_y,
              'frame':args.frame,'loopSeconds':args.loop_seconds,'loopFrames':period,
              'renderer':renderer,'framing':framing,'lightingChanges':lights,
              'ambient':{'water':water,'foliage':foliage,'oven':oven,'periodicity':motion},
              'principleChanges':['No baked screenshot boards','Original framing locked',
                                  'Selective cool fill/rim and softer warm entrance pools',
                                  'Physical glass reflection and matte brick preserved',
                                  'Periodic water geometry and micro-normal motion',
                                  'Leaf tips only; fixed pots, stems and trees',
                                  'Oven energy/emission variation bounded at4percent'],
              'prepareSeconds':round(time.perf_counter()-started,3),
              'colorManagement':{'viewTransform':s.view_settings.view_transform,'look':s.view_settings.look,'exposure':s.view_settings.exposure}}
    if args.save_blend:
        path = OUT / f'living-city-refined-loop{args.loop_seconds}.blend'
        bpy.ops.wm.save_as_mainfile(filepath=str(path))
        report['refinedBlendPath'] = str(path)
        report['refinedBlendSha256'] = digest(path)
    if args.render:
        gate = OUT / 'gate'
        gate.mkdir(exist_ok=True)
        s.render.filepath = str(gate/(tag+'.png'))
        render_start = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        report['renderSeconds'] = round(time.perf_counter()-render_start,3)
        report['imagePath'] = s.render.filepath
        report['estimatedSingleViewLoopSeconds'] = round(report['renderSeconds']*period,1)
    report['totalSeconds'] = round(time.perf_counter()-started,3)
    if digest(baseline) != baseline_hash:
        raise RuntimeError('Baseline preservation check failed.')
    report['baselinePreserved'] = True
    manifest_path = OUT/(tag+('' if args.render else f'-prepared-loop{args.loop_seconds}')+'.json')
    manifest_path.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('REFINEMENT_GATE',json.dumps({'manifest':str(manifest_path),'image':report.get('imagePath'),
          'renderSeconds':report.get('renderSeconds'),'prepareSeconds':report['prepareSeconds'],
          'periodicity':motion}),flush=True)


if __name__ == '__main__':
    main()
