"""Original waterfront architectural study for Spline. Not a surveyed landmark."""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output'/'waterfront-3d'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
parts=[]

def mat(name,color,rough=.5,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    return m

concrete=mat('Warm weathered limestone concrete',(.48,.44,.35),.83)
nodes=concrete.node_tree.nodes
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=65;noise.inputs['Detail'].default_value=3
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=(.22,.23,.2,1);ramp.color_ramp.elements[1].position=.86;ramp.color_ramp.elements[1].color=(.57,.53,.42,1)
concrete.node_tree.links.new(noise.outputs['Fac'],ramp.inputs[0]);concrete.node_tree.links.new(ramp.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.006
concrete.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);concrete.node_tree.links.new(bump.outputs[0],nodes.get('Principled BSDF').inputs['Normal'])
steel=mat('Weathered dark structural steel',(.036,.052,.05),.43,.65)
bronze=mat('Warm bronze sunset edge',(.33,.18,.065),.34,.65)
roof=mat('Graphite roof',(.07,.09,.085),.72)
quay=mat('Limestone quay',(.31,.32,.28),.91)
water=mat('Deep Buffalo teal water',(.016,.095,.102),.29,.06)
water.node_tree.nodes.get('Principled BSDF').inputs['IOR'].default_value=1.333
base=mat('Dark teal exhibition plinth',(.026,.062,.065),.57)
window=mat('Recessed dark windows',(.018,.034,.039),.2,.15)

def cube(name,location,scale,material,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    if bevel:mod=o.modifiers.new('Soft architectural edges','BEVEL');mod.width=bevel;mod.segments=3
    parts.append(o);return o

def cylinder(name,location,radius,depth,material,vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=location)
    o=bpy.context.object;o.name=name;o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=abs(p.normal.z)<.5
    parts.append(o);return o

def beam(name,start,end,radius=.025,material=steel):
    a,b=Vector(start),Vector(end);o=cylinder(name,(a+b)/2,radius,(b-a).length,material,12);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

cube('Floating waterfront base',(0,0,-.23),(9.6,7.6,.46),base,.09)
cube('Industrial quay',(1.65,1.2,.07),(5.6,4.8,.3),quay,.05)
for row,y in enumerate([.8,2.0]):
    for col,x in enumerate([-.25,.95,2.15,3.35]):
        cylinder(f'Grain silo {row+1}-{col+1}',(x,y,2.55),.58,4.8,concrete)
        cylinder(f'Silo cap {row+1}-{col+1}',(x,y,4.96),.59,.1,roof)
        for h in [1.1,2.2,3.3,4.4]:
            bpy.ops.mesh.primitive_torus_add(major_radius=.58,minor_radius=.008,major_segments=64,minor_segments=6,location=(x,y,h))
            o=bpy.context.object;o.name=f'Concrete casting joint {row}-{col}-{h}';o.data.materials.append(quay);parts.append(o)

cube('Elevator headhouse',(3.5,1.4,3.35),(1.35,2.1,6.4),concrete,.035)
cube('Elevator roof',(3.5,1.4,6.61),(1.42,2.17,.14),roof,.02)
for x in [3.1,3.57,3.95]:
    for z in [1.2,2.2,3.2,4.2,5.35,6.0]:cube('Head house window',(x,.338,z),(.18,.025,.29),window,.004)
cube('Conveyor gallery',(1.45,1.4,5.35),(5.6,.55,.38),steel,.015)
cube('Conveyor gallery roof',(1.45,1.4,5.58),(5.7,.66,.08),roof,.012)
for x in [-1.1,-.3,.5,1.3,2.1,2.9,3.7]:
    beam('Conveyor truss',(x,1.1,5.16),(x+.65,1.1,5.53),.018,bronze)
    beam('Conveyor vertical',(x,1.1,5.16),(x,1.1,5.53),.018,bronze)

cube('Low waterfront warehouse',(-1.25,2,.66),(1.4,1.75,.95),concrete,.02)
cube('Warehouse roof',(-1.25,2,1.17),(1.5,1.85,.1),roof,.01)
for x in [-1.7,-1.25,-.8]:cube('Warehouse door',(x,1.11,.55),(.27,.035,.5),window,.005)
for x in [-1,0,1,2,3,4]:
    cylinder('Quay piling',(x,-1.16,.35),.065,.7,steel,16)
    beam('Quay railing',(x,-1.16,.68),(x+.82,-1.16,.68),.017,steel)
    beam('Quay railing',(x,-1.16,.4),(x+.82,-1.16,.4),.012,steel)
for x in [-1.8,-1.4,-1,-.6,-.2,.2,.6,1,1.4,1.8,2.2,2.6,3,3.4,3.8,4.2]:
    cube('Waterfront fender',(x,-1.22,-.03),(.07,.13,.4),steel,.01)

# Actual, gently undulating water geometry; exportable in GLB and editable in Blender.
verts=[];faces=[];nx=110;ny=42
for j in range(ny+1):
    y=-3.7+j*2.45/ny
    for i in range(nx+1):
        x=-4.7+i*9.4/nx
        z=.008+math.sin(x*3.2+y*6.1+math.sin(x*.7))*.012+math.sin(x*7.3-y*10.7)*.004
        verts.append((x,y,z))
for j in range(ny):
    for i in range(nx):
        a=j*(nx+1)+i;faces.append((a,a+1,a+nx+2,a+nx+1))
mesh=bpy.data.meshes.new('Water ripple surface');mesh.from_pydata(verts,[],faces);mesh.update()
surface=bpy.data.objects.new('Water — real ripple geometry',mesh);bpy.context.collection.objects.link(surface);surface.data.materials.append(water);parts.append(surface)
for p in mesh.polygons:p.use_smooth=True
cube('Side water strip',(-3.25,.9,-.015),(2.9,4.3,.06),water,.015)

# A small sculptural kayak provides scale without representing a particular person.
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=(-2.5,-2.4,.07))
kayak=bpy.context.object;kayak.name='Kayak';kayak.scale=(.58,.13,.07);kayak.data.materials.append(steel);parts.append(kayak)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=(-2.52,-2.4,.2))
person=bpy.context.object;person.name='Kayaker silhouette';person.scale=(.07,.07,.15);person.data.materials.append(steel);parts.append(person)
cylinder('Kayaker head',(-2.52,-2.4,.38),.052,.085,steel,20)
beam('Paddle',(-2.9,-2.65,.19),(-2.2,-2.14,.19),.011,bronze)

# Group only original study geometry for a compact, usable Spline import.
pivot=bpy.data.objects.new('Water & Grain — architectural study',None);bpy.context.collection.objects.link(pivot)
for o in parts:o.parent=pivot

world=bpy.data.worlds.new('Teal twilight studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.16,.18,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
def light(name,location,power,size,color,target=(0,0,2)):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=location;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
light('Late golden sun',(-6,-5,7),1700,4,(1,.63,.31))
light('Cool sky fill',(1,1,10),1400,6,(.55,.76,1))
light('Warm edge',(6,4,8),1900,3,(1,.79,.5))
camera_data=bpy.data.cameras.new('Waterfront exhibition camera');camera=bpy.data.objects.new('Waterfront exhibition camera',camera_data);bpy.context.collection.objects.link(camera)
camera.location=(-11,-16,10);camera.rotation_euler=(Vector((0,0,2.6))-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=16.8;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'water-and-grain.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
pivot.select_set(True);bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'water-and-grain.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=True)
scene.render.filepath=str(OUT/'water-and-grain-poster.png');bpy.ops.render.render(write_still=True)
print('WATERFRONT_3D_COMPLETE',str(OUT))
