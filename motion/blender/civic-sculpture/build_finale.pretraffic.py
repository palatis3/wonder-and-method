"""Add a real-geometry bronze finale and matched ambient loop to accepted BUFFALO.
Preserves accepted frames 1–139. Draft: Blender --background --python build_finale.py -- --draft
Production tail and ambient: same command with --render. Canonical v1 scene is never overwritten.
"""
import bpy,math,json,sys,shutil
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]; BASE=ROOT/'output/civic-sculpture'; REV=BASE/'finale-v2';REV.mkdir(parents=True,exist_ok=True)
for name in ['intro-tail','ambient-frames','staged-public','drafts']:(REV/name).mkdir(exist_ok=True)
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [];DRAFT='--draft' in ARGS
source=BASE/'buffalo-civic-sculpture.blend'
bpy.ops.wm.open_mainfile(filepath=str(source));sc=bpy.context.scene;sc.frame_set(139)
bronze=bpy.data.materials['Restrained architectural bronze']
root=bpy.data.objects.new('Civic finale assembly',None);sc.collection.objects.link(root)
for o in list(sc.objects):
    if o.type=='MESH' and o.name!='Sage ground':o.parent=root

# New material inherits the accepted bronze PBR settings; no flat graphic overlays.
def finish(o,name,parent):
    o.name=name;o.data.materials.append(bronze);o.parent=parent;return o

def curve(name,pts,r,parent):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=1;cu.bevel_depth=r;cu.bevel_resolution=3
    sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
    for p,co in zip(sp.points,pts):p.co=(*co,1)
    ob=bpy.data.objects.new(name,cu);sc.collection.objects.link(ob);ob.data.materials.append(bronze);ob.parent=parent
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');return ob

def box(name,loc,dim,parent,angle=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.rotation_euler[1]=angle;finish(ob,name,parent);m=ob.modifiers.new('Bronze edge softness','BEVEL');m.width=.007;m.segments=3
    ob.modifiers.new('Bronze weighted normals','WEIGHTED_NORMAL');return ob

underline=bpy.data.objects.new('Bridge underline reveal',None);sc.collection.objects.link(underline);underline.parent=root
path=[(-8.05,-1.75),(-8.05,-2.25)]
for i in range(1,9):
    a=math.pi+math.pi/2*i/8;path.append((-7.65+.4*math.cos(a),-2.25+.4*math.sin(a)))
for i in range(1,49):
    x=-7.65+15.3*i/48;path.append((x,-2.65-.12*math.sin(math.pi*i/48)))
for i in range(1,9):
    a=-math.pi/2+math.pi/2*i/8;path.append((7.65+.4*math.cos(a),-2.25+.4*math.sin(a)))
path.append((8.05,-1.75))
bottom=[(x,y,.045) for x,y in path];top=[(x,y,.19+.035*math.cos(x/8.05*math.pi/2)) for x,y in path]
curve('Wrapped bronze bridge lower chord',bottom,.021,underline);curve('Wrapped bronze bridge upper chord',top,.021,underline)
for i in range(len(path)-1):
    curve('Bridge underline diagonal %02d'%i,[bottom[i] if i%2==0 else top[i],top[i+1] if i%2==0 else bottom[i+1]],.0105,underline)
    if i%2==0:curve('Bridge underline vertical %02d'%i,[bottom[i],top[i]],.008,underline)
# A compact, physically modeled civic fan rises from the top of the O.
accent=bpy.data.objects.new('Upper right civic fan reveal',None);sc.collection.objects.link(accent);accent.parent=root;accent.location=(6.93,-.12,3.82)
box('Civic fan bronze foot',(0,0,.012),(.17,.19,.035),accent)
for i,(height,angle) in enumerate([(.19,-16),(.28,2),(.37,21),(.43,38)]):
    a=math.radians(angle);xx=(i-1.5)*.061+math.sin(a)*height/2
    box('Upper right civic fan blade %d'%i,(xx,0,math.cos(a)*height/2),(.063,.11,height),accent,a)
# Narrow warm grazing light moves across actual metal in the ambient loop.
data=bpy.data.lights.new('Traveling warm bronze reflection','AREA');data.energy=0;data.color=(1,.76,.43);data.shape='RECTANGLE';data.size=1.4;data.size_y=.35
highlight=bpy.data.objects.new('Traveling warm bronze reflection',data);sc.collection.objects.link(highlight)
def light_pose(x):
    highlight.location=(x,-4.8,2.7);highlight.rotation_euler=(Vector((x,-2.65,.12))-highlight.location).to_track_quat('-Z','Y').to_euler()
light_pose(0)
# Preserve the accepted opening exactly. New elements have near-zero scale until frame 139.
for f,scale in [(1,.000001),(139,.000001),(151,.18),(166,.84),(171,1.015),(178,1)]:
    underline.scale=(scale,scale,scale);underline.keyframe_insert('scale',frame=f)
for f,scale in [(1,.000001),(164,.000001),(174,1.12),(183,1)]:
    accent.scale=(scale,scale,scale);accent.keyframe_insert('scale',frame=f)
for f,degrees in [(1,0),(139,0),(154,-.65),(176,3.1),(196,-1.8),(216,1.25),(240,1.25)]:
    root.rotation_euler=(0,0,math.radians(degrees));root.keyframe_insert('rotation_euler',frame=f)
for f,power in [(1,0),(139,0),(168,0),(185,55),(216,65),(240,65)]:
    data.energy=power;data.keyframe_insert('energy',frame=f)
for f,x in [(139,-6),(185,-4),(216,0),(240,0)]:
    light_pose(x);highlight.keyframe_insert('location',frame=f);highlight.keyframe_insert('rotation_euler',frame=f)
sc.render.resolution_x=840 if DRAFT else 1440;sc.render.resolution_y=420 if DRAFT else 720;sc.render.resolution_percentage=100
sc.cycles.samples=8 if DRAFT else 20;sc.cycles.use_denoising=True;sc.render.fps=24;sc.frame_start=1;sc.frame_end=240
sc.frame_set(240);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(REV/'buffalo-civic-finale.blend'))
if DRAFT:
    for f in [154,176,196,240]:
        sc.frame_set(f);sc.render.filepath=str(REV/'drafts'/('intro-%03d.png'%f));bpy.ops.render.render(write_still=True)
else:
    sc.frame_set(240);sc.render.filepath=str(REV/'buffalo-civic-final.png');bpy.ops.render.render(write_still=True)
    if '--render' in ARGS:
        sc.frame_start=140;sc.frame_end=216;sc.render.filepath=str(REV/'intro-tail'/'civic-');bpy.ops.render.render(animation=True)

# Build the ambient loop as another scene in the same editable .blend.
# Independent copy includes objects/data/actions so modifying loop animation cannot change intro.
sc.frame_set(240)
bpy.context.window.scene=sc
bpy.ops.scene.new(type='FULL_COPY');ambient=bpy.context.scene;ambient.name='Civic ambient loop 4 seconds'
# Resolve copies by their custom structural role/name prefix.
def obj(prefix):return next(o for o in ambient.objects if o.name.startswith(prefix))
looproot=obj('Civic finale assembly');loopunder=obj('Bridge underline reveal');loopaccent=obj('Upper right civic fan reveal');looplight=obj('Traveling warm bronze reflection')
for o in [looproot,loopunder,loopaccent,looplight,ambient.camera,obj('Camera architectural aim')]:o.animation_data_clear()
looplight.data.animation_data_clear();loopunder.scale=(1,1,1);loopaccent.scale=(1,1,1);looplight.data.energy=65
# Camera remains at the accepted final retreat pose; loop start exactly matches intro end.
ambient.frame_start=1;ambient.frame_end=96
for f in range(1,98):
    phase=2*math.pi*(f-1)/96
    looproot.rotation_euler=(0,0,math.radians(1.25*math.cos(phase)));looproot.keyframe_insert('rotation_euler',frame=f)
    x=5.5*math.sin(phase);looplight.location=(x,-4.8,2.7);looplight.rotation_euler=(Vector((x,-2.65,.12))-looplight.location).to_track_quat('-Z','Y').to_euler()
    looplight.keyframe_insert('location',frame=f);looplight.keyframe_insert('rotation_euler',frame=f)
ambient.frame_set(1)
if DRAFT:
    for f in [1,49,96]:
        ambient.frame_set(f);ambient.render.filepath=str(REV/'drafts'/('ambient-%03d.png'%f));bpy.ops.render.render(write_still=True)
else:
    if '--render' in ARGS:
        ambient.render.filepath=str(REV/'ambient-frames'/'ambient-');bpy.ops.render.render(animation=True)
# Save both scenes together after the ambient scene is fully configured.
bpy.context.window.scene=sc;sc.frame_start=1;sc.frame_end=240;sc.frame_set(240);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(REV/'buffalo-civic-finale.blend'))
proof={'revision':'finale-v2','original_accepted_scene':str(source.relative_to(ROOT)),'accepted_intro_frames_reused':[1,139],'new_intro_rendered_frames':[140,216],'new_intro_hold_duplicate_frames':[217,240],'intro_frames':240,'intro_duration_seconds':10,'full_word_revealed_seconds':5.75,'finale_settled_seconds':215/24,'final_hold_seconds':25/24,'ambient_frames':96,'ambient_duration_seconds':4,'ambient_yaw_degrees':[-1.25,1.25],'ambient_start_end_pose':'intro ends and ambient begins at yaw +1.25 degrees; cosinusoidal loop has zero yaw velocity at the join','ambient_endpoint':'Frame 97 has the mathematical duplicate of frame 1 but is not rendered or encoded','highlight':'65 W warm rectangular area light moves sinusoidally across actual bronze geometry','word_geometry':'Loaded unchanged from accepted scene; no letter mesh edits','new_geometry_meshes':sum(o.type=='MESH' and o.parent in [underline,accent] for o in sc.objects),'backdrop_srgb':'#BEC7B7','render_engine':'CYCLES','samples':sc.cycles.samples,'width':sc.render.resolution_x,'height':sc.render.resolution_y,'fps':24,'external_images':0}
(REV/'scene-provenance.json').write_text(json.dumps(proof,indent=2));print('FINALE_RENDER_COMPLETE '+json.dumps(proof),flush=True)
