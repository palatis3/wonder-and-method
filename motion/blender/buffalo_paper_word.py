"""Selected Buffalo paper artwork on seven animated, textured paper meshes.

This is real folded geometry and lighting with 2D illustrated landmark textures,
not modeled buildings or a geographic reconstruction. The selected art and alpha
cutout remain packed into the saved Blender source.
"""
import bpy
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/buffalo-paper'
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = ROOT / 'public/buffalo-paper/frames'
FRAMES.mkdir(parents=True, exist_ok=True)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 4 if '--quick' in args else 8
scene.cycles.use_denoising = True
scene.render.resolution_x = 1600
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 192
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.85, .88, .92, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
scene.render.film_transparent = False

art = bpy.data.images.load(str(ROOT / 'public/buffalo-paper/word-cutout.png'))
art.pack()
source = bpy.data.images.load(str(ROOT / 'public/buffalo-paper/selected-art.png'))
source.pack()

def material():
    mat = bpy.data.materials.new('Illustrated paper — selected option 2')
    mat.use_nodes = True
    n = mat.node_tree.nodes
    n.clear()
    l = mat.node_tree.links
    out = n.new('ShaderNodeOutputMaterial')
    tex = n.new('ShaderNodeTexImage')
    tex.image = art
    tex.interpolation = 'Linear'
    surface = n.new('ShaderNodeBsdfPrincipled')
    l.new(tex.outputs['Color'], surface.inputs['Base Color'])
    surface.inputs['Roughness'].default_value = .8
    surface.inputs['Specular IOR Level'].default_value = .12
    l.new(tex.outputs['Color'], surface.inputs['Emission Color'])
    surface.inputs['Emission Strength'].default_value = .2
    transparent = n.new('ShaderNodeBsdfTransparent')
    mix = n.new('ShaderNodeMixShader')
    l.new(tex.outputs['Alpha'], mix.inputs[0])
    l.new(transparent.outputs[0], mix.inputs[1])
    l.new(surface.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs['Surface'])
    return mat

paper = material()
W, H = 1774, 887
SCALE = .01

def boundary(index, y):
    # Sloped separation follows the clear gap between the second F and A.
    split = 1050 if y <= 345 else max(948, 1050 - (y - 345) * .27)
    return [40, 335, 618, 806, split, 1271, 1463, 1755][index]

def make_letter(index, label):
    verts, faces, uvs = [], [], []
    nx, ny = 14, 44
    origin_x = (boundary(index, 440) + boundary(index + 1, 440)) / 2
    for j in range(ny + 1):
        y = H * j / ny
        left, right = boundary(index, y), boundary(index + 1, y)
        for i in range(nx + 1):
            x = left + (right - left) * i / nx
            verts.append(((x - origin_x) * SCALE, (H - y) * SCALE, 0))
            uvs.append((x / W, 1 - y / H))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + nx + 1, a + nx + 2, a + 1))
    mesh = bpy.data.meshes.new(label + ' paper grid')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(label + ' — folded illustrated paper', mesh)
    scene.collection.objects.link(obj)
    obj.location.x = (origin_x - W / 2) * SCALE
    uv = mesh.uv_layers.new(name='Selected artwork coordinates')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[mesh.loops[li].vertex_index]
    obj.data.materials.append(paper)
    obj['medium'] = 'Illustrated image texture on animated geometry; not modeled architecture'
    obj.shape_key_add(name='Settled')
    fold = obj.shape_key_add(name='Paper curl')
    for n, vert in enumerate(fold.data):
        y = verts[n][1]
        vert.co.z = .58 * math.sin(y / 8.87 * math.pi)
    start = 1 + index * 3
    obj.rotation_euler.x = math.radians(58 - index * 1.5)
    obj.rotation_euler.y = math.radians((index - 3) * 2.5)
    obj.location.y = -4.435
    obj.location.z = .24 + index * .02
    fold.value = 1
    for prop in ('rotation_euler', 'location'):
        obj.keyframe_insert(data_path=prop, frame=start)
    fold.keyframe_insert(data_path='value', frame=start)
    obj.rotation_euler = (0, 0, 0)
    obj.location.y = -4.435
    obj.location.z = .045
    fold.value = 0
    for prop in ('rotation_euler', 'location'):
        obj.keyframe_insert(data_path=prop, frame=start + 37)
    fold.keyframe_insert(data_path='value', frame=start + 37)
    # A broad second paper ripple reads across the word, then resolves to still.
    for frame, value in [(65 + index * 3, 0), (79 + index * 3, .8), (99 + index * 3, 0)]:
        fold.value = value
        fold.keyframe_insert(data_path='value', frame=frame)
    return obj

letters = [make_letter(i, name) for i, name in enumerate(['B', 'U', 'F-one', 'F-two', 'A', 'L', 'O'])]

# Real paper surface receives shadows from each folded letter.
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.06))
floor = bpy.context.object
floor.name = 'Porcelain paper stage'
floor_mat = bpy.data.materials.new('Warm porcelain stage')
floor_mat.use_nodes = True
bsdf = floor_mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.91, .92, .94, 1)
bsdf.inputs['Roughness'].default_value = 1
floor.data.materials.append(floor_mat)

def area(name, location, energy, size, color):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    direction = -obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    return obj

area('Large soft key', (-3, 4, 9), 1500, 7, (1, .95, .88))
area('Soft cool fill', (6, -3, 7), 500, 8, (.77, .87, 1))
sweep = area('Warm traveling light', (-10, 1, 3.5), 0, 4, (1, .75, .45))
for frame, x, energy in [(1, -10, 0), (56, -10, 0), (70, -8, 450), (115, 8, 450), (132, 11, 0), (192, 11, 0)]:
    sweep.location.x = x
    sweep.rotation_euler = (-sweep.location).to_track_quat('-Z', 'Y').to_euler()
    sweep.keyframe_insert(data_path='location', frame=frame)
    sweep.keyframe_insert(data_path='rotation_euler', frame=frame)
    sweep.data.energy = energy
    sweep.data.keyframe_insert(data_path='energy', frame=frame)

bpy.ops.object.camera_add(location=(0, 0, 12))
camera = bpy.context.object
camera.name = 'Fixed frontal camera — stable word'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 18.4
camera.rotation_euler = (0, 0, 0)
scene.camera = camera
scene['description'] = 'Eight-second paper-word study: strong fold, broad paper ripple, warm traveling light, settled final hold.'
scene['provenance'] = 'Selected built-in ImageGen option 2 plus generated transparent cutout. Local cultural collage, not geographic reconstruction.'
scene['landmarks'] = 'Illustrated references are not individually modeled, and require final landmark fidelity review.'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'buffalo-paper-word.blend'))
if '--render' in args:
    # The composition is fully still after frame 132; encode its final hold later.
    scene.frame_end = 132
    scene.render.filepath = str(FRAMES / 'paper-')
    bpy.ops.render.render(animation=True)
else:
    for frame in [1, 20, 55, 90, 144, 192]:
        scene.frame_set(frame)
        scene.render.filepath = str(OUT / f'preview-{frame:03d}.png')
        bpy.ops.render.render(write_still=True)
print('BUFFALO_PAPER_COMPLETE')
