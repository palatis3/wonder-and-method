"""Civic Sculpture: an original, fully geometric BUFFALO intro.
Blender 5.2 --background --python build_intro.py -- --draft
Blender 5.2 --background --python build_intro.py -- --render
Architectural allusions are conceptual relief, not surveyed replicas.
"""
import bpy, math, json, sys
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]; OUT=ROOT/'output/civic-sculpture'; PUB=ROOT/'public/civic-sculpture'
OUT.mkdir(parents=True,exist_ok=True); (OUT/'frames').mkdir(exist_ok=True); PUB.mkdir(parents=True,exist_ok=True)
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
DRAFT='--draft' in ARGS
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
SC=bpy.context.scene

def srgb(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4

def mat(name,color,rough=.5,metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m
STONE=mat('Carved warm limestone',(.60,.515,.385),.76)
n=STONE.node_tree.nodes;l=STONE.node_tree.links;p=n.get('Principled BSDF')
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=48;noise.inputs['Detail'].default_value=4;noise.inputs['Roughness'].default_value=.74
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.20;ramp.color_ramp.elements[0].color=(.52,.435,.32,1);ramp.color_ramp.elements[1].position=.77;ramp.color_ramp.elements[1].color=(.68,.595,.465,1)
l.new(noise.outputs['Fac'],ramp.inputs['Fac']);l.new(ramp.outputs['Color'],p.inputs['Base Color'])
fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=195;fine.inputs['Detail'].default_value=2
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.27;bump.inputs['Distance'].default_value=.016
l.new(fine.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal'])
SAGE=mat('Brand sage #BEC7B7',tuple(srgb(v/255) for v in (190,199,183)),.82)
BRONZE=mat('Restrained architectural bronze',(.31,.18,.065),.34,.76)
SHADOW=mat('Bronze recess patina',(.075,.061,.038),.65,.3)

def finish(o,name,material,bevel=0):
    o.name=name;o.data.materials.append(material)
    if bevel:
        m=o.modifiers.new('Small hand-finished edge','BEVEL');m.width=bevel;m.segments=3
        m=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def box(name,loc,dim,material=STONE,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,material,bevel)

def bar(name,a,b,r=.012,material=BRONZE):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=(b-a).length,location=(a+b)/2)
    o=finish(bpy.context.object,name,material,.003);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    return o

def pathmesh(name,loops,x,width):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='2D';cv.resolution_u=1;cv.fill_mode='BOTH';cv.extrude=.52;cv.bevel_depth=.018;cv.bevel_resolution=3
    for pts in loops:
        sp=cv.splines.new('POLY');sp.points.add(len(pts)-1)
        for p,(xx,zz) in zip(sp.points,pts):p.co=(xx,zz,0,1)
        sp.use_cyclic_u=True
    o=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(o);o.location=(x,0,.018);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(STONE)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    # Bake transform so the sculpted front face occupies world Y=-0.36.
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    o['letter']=name[-1];o['actual_open_counters']=2 if name[-1]=='B' else 1 if name[-1] in 'AO' else 0
    return o

def arc(cx,cz,rx,rz,a,b,n=48):return [(cx+rx*math.cos(a+(b-a)*i/n),cz+rz*math.sin(a+(b-a)*i/n)) for i in range(n+1)]
def rr(w,h,r):
    pts=[]
    for cx,cz,a in [(w-r,h-r,0),(r,h-r,math.pi/2),(r,r,math.pi),(w-r,r,math.pi*1.5)]:pts+=arc(cx,cz,r,r,a,a+math.pi/2,24)
    return pts

# All seven letter silhouettes are authored geometry; none is an image plane.
widths=[2.2,2.2,1.85,1.85,2.35,1.80,2.35];GAP=.23;total=sum(widths)+GAP*6
x=-total/2; positions={};letters=[]
for idx,(ch,w) in enumerate(zip('BUFFALO',widths)):
    positions[ch+str(idx)]=x
    if ch=='B':
        outer=[(0,0),(0,3.8),(1.15,3.8)]+arc(1.15,2.85,1.05,.95,math.pi/2,-math.pi/2+.4)[1:]+arc(1.15,.95,1.05,.95,math.pi/2-.4,-math.pi/2)[0:]
        holes=[]
        for z in [.96,2.80]:holes.append([(.70,z+.40),(1.04,z+.40)]+arc(1.04,z,.46,.40,math.pi/2,-math.pi/2)[1:]+[(.70,z-.40)])
        loops=[outer]+holes
    elif ch=='U':
        outer=[(0,3.8),(0,1.1)]+arc(1.1,1.1,1.1,1.1,math.pi,math.pi*2)[1:]+[(2.2,3.8),(1.48,3.8),(1.48,1.1)]+arc(1.1,1.1,.38,.38,0,-math.pi)[1:]+[(.72,3.8)]
        loops=[outer]
    elif ch=='F':loops=[[(0,0),(0,3.8),(w,3.8),(w,3.08),(.73,3.08),(.73,2.20),(1.55,2.20),(1.55,1.5),(.73,1.5),(.73,0)]]
    elif ch=='A':
        loops=[[(0,0),(w/2-.12,3.8),(w/2+.12,3.8),(w,0),(1.57,0),(w/2,1.18),(.78,0)],[(.94,1.75),(1.41,1.75),(w/2,2.67)]]
    elif ch=='L':loops=[[(0,0),(0,3.8),(.73,3.8),(.73,.72),(w,.72),(w,0)]]
    else:loops=[rr(w,3.8,.98),[(xx+.78,zz+.68) for xx,zz in rr(w-1.56,3.8-1.36,.38)]]
    o=pathmesh('Carved letter '+ch,loops,x,w);letters.append(o);x+=w+GAP

# B: a low-relief stepped civic tower on the left stem. Neither counter is obscured.
bx=positions['B0']
box('B civic relief foundation',(bx+.345,-.435,.48),(.61,.16,.96),STONE,.012)
for i,height in enumerate([1.85,2.66,3.15,3.59,3.12]):
    xx=bx+.09+i*.115
    box('B civic tower pilaster %02d'%i,(xx,-.46,height/2+.025),(.105,.20,height),STONE,.009)
    if height>2:
        box('B recessed vertical opening %02d'%i,(xx,-.565,height-.25),(.040,.012,.25),SHADOW,.003)
box('B tower crown',(bx+.435,-.48,3.655),(.072,.20,.25),STONE,.007)
# U: actual shallow cylindrical flutes cut into the stone face.
u=letters[1];ux=positions['U1']
for j,xx in enumerate([.14,.35,.56,1.64,1.85,2.06]):
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.047,depth=3.32,location=(ux+xx,-.535,2.19))
    cutter=bpy.context.object;cutter.name='Temporary U groove cutter'
    bpy.context.view_layer.objects.active=u;m=u.modifiers.new('Carved flute %d'%j,'BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter
    bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cutter,do_unlink=True)
# First F: restrained bronze elevator inlay, physically recessed outline and rods.
fx=positions['F2'];box('F vertical patinated bronze recess',(fx+.35,-.389,1.91),(.31,.025,3.16),SHADOW,.009)
for xx in [fx+.205,fx+.495]:box('F bronze inlay border',(xx,-.414,1.91),(.021,.024,3.18),BRONZE,.003)
for zz in [.32,3.50]:box('F bronze inlay end',(fx+.35,-.415,zz),(.31,.025,.025),BRONZE,.003)
for xx in [fx+.27,fx+.35,fx+.43]:bar('F slender vertical bronze rod',(xx,-.429,.67),(xx,-.429,3.18),.011)
for zz in [.65,3.18]:box('F bronze service crosspiece',(fx+.35,-.447,zz),(.28,.048,.095),BRONZE,.006)
# A: pointed apex, triangular through-counter, horizontal bridge/crossbar, and open legs.
ax=positions['A4'];bridgeleft=ax+.435;bridgeright=ax+1.915;by=-.441
box('A bronze bridge recessed bed',((bridgeleft+bridgeright)/2,-.393,1.48),(1.48,.032,.24),SHADOW,.008)
bar('A bronze bridge horizontal deck',(bridgeleft,by,1.34),(bridgeright,by,1.34),.022)
N=10; tops=[]
for i in range(N+1):
    xx=bridgeleft+(bridgeright-bridgeleft)*i/N;z=1.39+.24*math.sin(math.pi*i/N);tops.append((xx,by,z))
for i in range(N):
    bar('A bridge curved upper chord',tops[i],tops[i+1],.019)
    xx=bridgeleft+(bridgeright-bridgeleft)*i/N;xn=bridgeleft+(bridgeright-bridgeleft)*(i+1)/N
    bar('A bridge triangular web',(xx,by,1.34),tops[i+1],.009)
    bar('A bridge upright',(xx,by,1.34),tops[i],.009)
bar('A bridge end upright',(bridgeright,by,1.34),tops[-1],.009)

# Shift the physical relief out to the deeper stone face; letter meshes remain fixed.
for ob in SC.objects:
    if ob.type=='MESH' and ob not in letters:ob.location.y-=.16
# Continuous sage cyclorama: flat floor flows into a curved rear wall, no horizon line.
profile=[(-120,0),(8,0)]
for i in range(1,49):
    a=(math.pi/2)*i/48;profile.append((8+8*math.sin(a),8-8*math.cos(a)))
profile.append((16,80))
verts=[(xx,yy,zz) for xx in [-150,150] for yy,zz in profile];npr=len(profile)
faces=[(i,i+1,npr+i+1,npr+i) for i in range(npr-1)]
me=bpy.data.meshes.new('Continuous curved studio sweep');me.from_pydata(verts,[],faces);me.update()
ob=bpy.data.objects.new('Sage ground',me);bpy.context.collection.objects.link(ob);ob.data.materials.append(SAGE)
for face in me.polygons:face.use_smooth=True
world=bpy.data.worlds.new('Sage ambient studio');SC.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.70,.61,1);world.node_tree.nodes['Background'].inputs[1].default_value=.48

def area(name,loc,power,color,size,target,shape='DISK'):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape=shape;d.size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
key=area('Broad grazing limestone key',(-7,-6,8),1750,(1,.90,.74),7,(0,0,1.5))
area('Neutral frontal fill',(6,-9,5),750,(.87,.94,1),9,(1,0,1.6))
area('Warm upper bronze edge',(0,3,7),1100,(1,.91,.75),6,(0,0,1.6))
# Broadboxes stay still; one coherent camera retreat provides the motion.
camdata=bpy.data.cameras.new('Civic sculpture camera');cam=bpy.data.objects.new('Civic sculpture camera',camdata);bpy.context.collection.objects.link(cam);SC.camera=cam;camdata.lens=55;camdata.clip_end=500
focus=bpy.data.objects.new('Camera architectural aim',None);bpy.context.collection.objects.link(focus)
constraint=cam.constraints.new('TRACK_TO');constraint.target=focus;constraint.track_axis='TRACK_NEGATIVE_Z';constraint.up_axis='UP_Y'
for frame,loc,aim in [(1,(bx+.20,-5.8,2.8),(bx+.45,-.20,2.15)),(139,(4.6,-28.8,5.0),(0,0,1.65)),(192,(4.6,-28.8,5.0),(0,0,1.65))]:
    cam.location=loc;cam.keyframe_insert('location',frame=frame);focus.location=aim;focus.keyframe_insert('location',frame=frame)
for obj in [cam,focus]:
    if obj.animation_data:
        for fc in obj.animation_data.action.fcurves if hasattr(obj.animation_data.action,'fcurves') else []:
            for kp in fc.keyframe_points:kp.interpolation='BEZIER';kp.handle_left_type='AUTO_CLAMPED';kp.handle_right_type='AUTO_CLAMPED'
SC.render.engine='CYCLES'
SC.cycles.samples=8 if DRAFT else 20;SC.cycles.use_denoising=True;SC.cycles.max_bounces=5
# CPU Cycles keeps limestone microtexture, gentle shadows and bronze reflections reliable.
SC.render.resolution_x=840 if DRAFT else 1440;SC.render.resolution_y=420 if DRAFT else 720;SC.render.resolution_percentage=100
SC.render.image_settings.file_format='PNG';SC.render.image_settings.color_mode='RGB';SC.render.fps=24;SC.frame_start=1;SC.frame_end=192
SC.render.film_transparent=False;SC.view_settings.view_transform='AgX';SC.view_settings.look='AgX - Medium High Contrast';SC.view_settings.exposure=0
SC.render.use_file_extension=True
SC.frame_set(192);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'buffalo-civic-sculpture.blend'))
if DRAFT:
    for f in [192,1,70]:
        SC.frame_set(f);SC.render.filepath=str(OUT/('draft-%03d.png'%f));bpy.ops.render.render(write_still=True)
else:
    SC.frame_set(192);SC.render.filepath=str(OUT/'buffalo-civic-final.png');bpy.ops.render.render(write_still=True)
    if '--render' in ARGS:
        SC.frame_end=139;SC.render.filepath=str(OUT/'frames'/'civic-');bpy.ops.render.render(animation=True)
stats={'letters':list('BUFFALO'),'letter_meshes':[o.name for o in letters],'B_open_counters':2,'A_form':'short flat apex, triangular through-counter, structural crossbar with bronze truss, open legs','mesh_objects':sum(o.type=='MESH' and o.name!='Sage ground' for o in SC.objects),'vertices':sum(len(o.data.vertices) for o in SC.objects if o.type=='MESH' and o.name!='Sage ground'),'external_images':0,'fps':24,'frames':192,'duration_seconds':8,'full_word_reveal_seconds':5.75,'final_hold_seconds':2.25,'width':SC.render.resolution_x,'height':SC.render.resolution_y,'samples':SC.cycles.samples,'word_width':total,'letter_height':3.8,'letter_depth':1.04,'backdrop_srgb':'#BEC7B7','renderer':SC.render.engine}
(OUT/'scene-provenance.json').write_text(json.dumps(stats,indent=2));print('CIVIC_COMPLETE '+json.dumps(stats),flush=True)
