"""Original Wonder & Method ribbon sculpture; deterministic Blender source.

Run with Blender --background --python motion/blender/ribbon.py -- [--animate].
The editable scene, GLB and image sequence are written under output/motion.
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output' / 'motion'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'frames').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=.45):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat

red = material('Vermilion / tactile paper', (.33, .012, .004), .62)
nodes = red.node_tree.nodes
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 155
noise.inputs['Detail'].default_value = 2
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .06
bump.inputs['Distance'].default_value = .01
red.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
red.node_tree.links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])

# A continuous, purpose-drawn path: upper loop, lower bowl, lifted exit.
points = [Vector(p) for p in [
 (.58,.15,4.28),(-.15,.12,4.68),(-.93,.22,4.3),(-1.02,.38,3.65),
 (-.43,.12,3.05),(.55,-.35,2.25),(.9,-.1,1.28),(.15,.28,.58),
 (-1.02,.4,.7),(-1.48,.2,1.43),(-1.1,-.6,2.15),(-.18,-.95,2.68),
 (.85,.02,3.35),(1.48,.5,3.07),(1.28,.65,2.35),(.65,.25,1.62),
 (1.12,-.25,.77),(1.84,-.15,.68)
]]

def sample(t):
    scaled=t*(len(points)-1); i=min(int(scaled),len(points)-2); u=scaled-i
    a,b,c,d=points[max(i-1,0)],points[i],points[i+1],points[min(i+2,len(points)-1)]
    return .5*((2*b)+(-a+c)*u+(2*a-5*b+4*c-d)*u*u+(-a+3*b-3*c+d)*u*u*u)

verts=[]; faces=[]; N=360; W=6
for i in range(N+1):
    t=i/N; p=sample(t)
    tangent=(sample(min(t+.001,1))-sample(max(t-.001,0))).normalized()
    side=Vector((-tangent.z,0,tangent.x)).normalized()
    normal=tangent.cross(side).normalized()
    twist=.65*math.sin(t*math.pi*3-.4)+.18
    width=.69*(.93+.07*math.sin(t*math.pi))
    cross=side*math.cos(twist)+normal*math.sin(twist)
    bend=tangent.cross(cross).normalized()
    for j in range(W+1):
        q=j/W-.5
        v=p+cross*(q*width)+bend*(q*q*.085)
        verts.append(tuple(v))
for i in range(N):
    for j in range(W):
        a=i*(W+1)+j;faces.append((a,a+1,a+W+2,a+W+1))
mesh=bpy.data.meshes.new('Continuous ribbon surface')
mesh.from_pydata(verts,[],faces);mesh.update()
ribbon=bpy.data.objects.new('WonderRibbon',mesh);bpy.context.collection.objects.link(ribbon)
ribbon.data.materials.append(red)
for polygon in mesh.polygons: polygon.use_smooth=True
solid=ribbon.modifiers.new('Paper edge thickness','SOLIDIFY');solid.thickness=.027
bevel=ribbon.modifiers.new('Soft cut edges','BEVEL');bevel.width=.012;bevel.segments=3

# A subtle breathing deformation, editable as a named shape key.
ribbon.shape_key_add(name='Basis')
breath=ribbon.shape_key_add(name='Quiet unfolding')
for vertex in breath.data:
    z=vertex.co.z
    vertex.co.y += .12*math.sin(z*1.45)
    vertex.co.x += .055*math.sin(z*1.1)

pivot=bpy.data.objects.new('RibbonMotion',None);bpy.context.collection.objects.link(pivot)
pivot.location=(0,0,2.55);ribbon.parent=pivot;ribbon.location=(0,0,-2.55)
for frame,phase in [(1,0),(25,math.pi/2),(49,math.pi),(73,3*math.pi/2),(97,2*math.pi)]:
    pivot.rotation_euler=(.04*math.sin(phase),.12*math.sin(phase),.24*math.sin(phase))
    pivot.location.z=2.55+.055*math.sin(phase)
    pivot.keyframe_insert(data_path='rotation_euler',frame=frame)
    pivot.keyframe_insert(data_path='location',frame=frame)
    breath.value=.5+.5*math.sin(phase)
    breath.keyframe_insert(data_path='value',frame=frame)

paper=material('Warm gallery floor',(.86,.835,.79),.78)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0))
floor=bpy.context.object;floor.name='Gallery backdrop';floor.data.materials.append(paper);floor.is_shadow_catcher=True
world=bpy.data.worlds.new('Soft studio')
world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.86,.89,1,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.3;bpy.context.scene.world=world
def light(name,location,power,size,color,target=(0,0,2)):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=location
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
light('Large softbox / left',(-4,-6,8),1100,5,(1,.88,.75))
light('Cool fill',(5,-2,5),500,4,(.83,.9,1))
light('Edge light',(1,4,7),950,3,(1,.9,.78))
camera_data=bpy.data.cameras.new('Editorial camera');camera=bpy.data.objects.new('Editorial camera',camera_data)
bpy.context.collection.objects.link(camera);camera.location=(5.2,-13,6.3)
camera.rotation_euler=(Vector((.1,0,2.45))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type='ORTHO';camera_data.ortho_scale=6.05
scene=bpy.context.scene;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.render.fps=24;scene.frame_start=1;scene.frame_end=96
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'wonder-ribbon.blend'))

# Export only the signature sculpture and its animation for Spline import.
bpy.ops.object.select_all(action='DESELECT');ribbon.select_set(True);pivot.select_set(True)
bpy.context.view_layer.objects.active=ribbon
bpy.ops.export_scene.gltf(filepath=str(OUT/'wonder-ribbon.glb'),export_format='GLB',use_selection=True,export_animations=True,export_apply=False)
if '--animate' in sys.argv:
    scene.render.resolution_percentage=80
    scene.cycles.samples=12
    scene.render.filepath=str(OUT/'frames'/'ribbon-')
    bpy.ops.render.render(animation=True)
else:
    scene.render.filepath=str(OUT/'ribbon-poster.png')
    bpy.ops.render.render(write_still=True)
print('WM_RIBBON_COMPLETE',str(OUT))
