"""Six-second fixed-camera study: generated skyline plate + editable water surface.

The architecture is a background plate, not a modeled reconstruction of Buffalo.
The packed .blend contains the plate, water mesh, materials, lights and periodic drivers.
"""
import bpy
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/buffalo-dusk'
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = OUT / 'frames'
FRAMES.mkdir(exist_ok=True)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 4
scene.cycles.use_denoising = True
scene.render.resolution_x = 1280
scene.render.resolution_y = 854
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 144
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.world.color = (0, 0, 0)
image = bpy.data.images.load(str(ROOT / 'evidence/brand-reset-20261014/buffalo-dusk-still-v2.png'))
image.pack()

def mesh_object(name, vertices, faces, uv_coords):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    uv = mesh.uv_layers.new(name='Plate coordinates')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uv_coords[mesh.loops[li].vertex_index]
    return obj

def image_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    links = mat.node_tree.links
    out = nodes.new('ShaderNodeOutputMaterial')
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Linear'
    emission = nodes.new('ShaderNodeEmission')
    links.new(tex.outputs['Color'], emission.inputs['Color'])
    links.new(emission.outputs[0], out.inputs['Surface'])
    return mat, nodes, links, tex, emission, out

plate = mesh_object('Still architecture and sky — generated background plate', [(-1.5,-1,0),(1.5,-1,0),(1.5,1,0),(-1.5,1,0)], [(0,1,2,3)], [(0,0),(1,0),(1,1),(0,1)])
plate.data.materials.append(image_material('Original dusk color — static plate')[0])
plate['provenance'] = 'Built-in ImageGen; art-directed Buffalo-inspired composition, not documentary geography.'

nx, ny = 96, 28
vertices, uvs, faces = [], [], []
for j in range(ny + 1):
    y = -1 + .44 * j / ny
    for i in range(nx + 1):
        x = -1.5 + 3 * i / nx
        vertices.append((x, y, .004))
        uvs.append((x / 3 + .5, y / 2 + .5))
for j in range(ny):
    for i in range(nx):
        a = j * (nx + 1) + i
        faces.append((a, a+1, a+nx+2, a+nx+1))
water = mesh_object('Water — shallow animated surface', vertices, faces, uvs)
water.shape_key_add(name='Basis')
for name, function, driver in [('Wave sine', math.sin, 'cos((frame-1)*6.283185307179586/144)'), ('Wave cosine', math.cos, 'sin((frame-1)*6.283185307179586/144)')]:
    key = water.shape_key_add(name=name)
    key.slider_min, key.slider_max = -1, 1
    for index, (x, y, z) in enumerate(vertices):
        fade = max(0, min(1, (-.56-y)/.16))
        key.data[index].co.z = z + .0014 * function(x*25+y*70) * fade
    key.driver_add('value').driver.expression = driver
for poly in water.data.polygons:
    poly.use_smooth = True

mat, nodes, links, tex, emission, out = image_material('Water — periodic reflected color and restrained specular')
coord = nodes.new('ShaderNodeTexCoord')
separate = nodes.new('ShaderNodeSeparateXYZ')
links.new(coord.outputs['UV'], separate.inputs[0])
phase = nodes.new('ShaderNodeValue')
phase.label = 'Six-second loop phase (144 frames)'
phase.outputs[0].driver_add('default_value').driver.expression = '(frame-1)*6.283185307179586/144'

def math_node(operation, a, b=None, clamp=False):
    node = nodes.new('ShaderNodeMath')
    node.operation = operation
    node.use_clamp = clamp
    for index, value in enumerate((a,b)):
        if value is None:
            continue
        if isinstance(value, (int, float)):
            node.inputs[index].default_value = value
        else:
            links.new(value, node.inputs[index])
    return node.outputs[0]

fade = math_node('MULTIPLY', math_node('SUBTRACT', .22, separate.outputs['Y']), 8.3, True)
phase_x = math_node('ADD', math_node('ADD', math_node('MULTIPLY', separate.outputs['X'], 72), math_node('MULTIPLY', separate.outputs['Y'], 55)), phase.outputs[0])
phase_y = math_node('SUBTRACT', math_node('ADD', math_node('MULTIPLY', separate.outputs['X'], 39), math_node('MULTIPLY', separate.outputs['Y'], 120)), math_node('MULTIPLY', phase.outputs[0], 2))
dx = math_node('MULTIPLY', math_node('MULTIPLY', math_node('SINE', phase_x), fade), .0018)
dy = math_node('MULTIPLY', math_node('MULTIPLY', math_node('SINE', phase_y), fade), .00055)
displacement = nodes.new('ShaderNodeCombineXYZ')
links.new(dx, displacement.inputs['X'])
links.new(dy, displacement.inputs['Y'])
offset = nodes.new('ShaderNodeVectorMath')
offset.operation = 'ADD'
links.new(coord.outputs['UV'], offset.inputs[0])
links.new(displacement.outputs[0], offset.inputs[1])
links.new(offset.outputs[0], tex.inputs['Vector'])
surface = nodes.new('ShaderNodeBsdfPrincipled')
surface.inputs['Base Color'].default_value = (.018,.04,.065,1)
surface.inputs['Metallic'].default_value = .5
surface.inputs['Roughness'].default_value = .25
surface.inputs['IOR'].default_value = 1.333
mix = nodes.new('ShaderNodeMixShader')
links.new(math_node('MULTIPLY', fade, .012), mix.inputs[0])
links.new(emission.outputs[0], mix.inputs[1])
links.new(surface.outputs[0], mix.inputs[2])
links.new(mix.outputs[0], out.inputs['Surface'])
water.data.materials.append(mat)
water['method'] = 'Real shallow mesh with periodic shape keys, image-coordinate refraction and a restrained warm light response.'

light_data = bpy.data.lights.new('Warm reflected architectural light', 'AREA')
light_data.energy = 42
light_data.color = (1,.61,.27)
light_data.shape = 'RECTANGLE'
light_data.size, light_data.size_y = 1.4, .3
light_data.driver_add('energy').driver.expression = '42+6*sin((frame-1)*6.283185307179586/144)'
light = bpy.data.objects.new('Warm reflected architectural light', light_data)
scene.collection.objects.link(light)
light.location = (-.3,-.8,2)

camera_data = bpy.data.cameras.new('Fixed orthographic camera')
camera = bpy.data.objects.new('Fixed orthographic camera', camera_data)
scene.collection.objects.link(camera)
camera.location = (0,0,5)
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 3
scene.camera = camera
scene['edition'] = 'Buffalo dusk — one six-second fixed-camera loop'
scene['asset_boundary'] = 'Background architecture is generated 2D art. Water, shader and lighting are editable Blender elements. No modeled-city claim.'
scene['loop_math'] = '144 unique frames, 24 fps. All motion drivers repeat at frame 145 = frame 1.'
source = bpy.data.texts.new('buffalo_dusk_loop.py')
source.write(Path(__file__).read_text(encoding='utf8'))
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'buffalo-dusk-loop.blend'))
if '--render' in args:
    scene.render.filepath = str(FRAMES / 'dusk-')
    bpy.ops.render.render(animation=True)
else:
    for frame in (1,37,73,145):
        scene.frame_set(frame)
        scene.render.filepath = str(OUT / f'preview-{frame:03}.png')
        bpy.ops.render.render(write_still=True)
print('DUSK_RENDER_COMPLETE')
