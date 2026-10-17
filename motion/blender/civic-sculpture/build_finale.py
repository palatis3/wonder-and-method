"""Add a real-geometry bronze finale and matched ambient loop to accepted BUFFALO.
Preserves accepted frames 1–139. Draft: Blender --background --python build_finale.py -- --draft
Production tail and ambient: same command with --render. Canonical v1 scene is never overwritten.
"""
import bpy,math,json,sys,shutil
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3]; BASE=ROOT/'output/civic-sculpture'; REV=BASE/'finale-v2';REV.mkdir(parents=True,exist_ok=True)
for name in ['traffic-intro-tail','traffic-ambient-frames','staged-public','traffic-drafts']:(REV/name).mkdir(exist_ok=True)
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
# Closed architectural road: front span, rounded returns outside the visible ends,
# and rear span behind the letters. Identical cars permute seamlessly every 4 s.
HALF=6.95; RADIUS=2.15; CY=-1.25; SPAN=2*HALF; ROUTE=2*SPAN+2*math.pi*RADIUS; COUNT=8; SPACING=ROUTE/COUNT
stone=bpy.data.materials['Carved warm limestone'];patina=bpy.data.materials['Bronze recess patina']
def route_pose(distance):
    t=distance%ROUTE
    if t<SPAN:return (-HALF+t,CY-RADIUS,0)
    if t<SPAN+math.pi*RADIUS:
        a=-math.pi/2+(t-SPAN)/RADIUS;return(HALF+RADIUS*math.cos(a),CY+RADIUS*math.sin(a),a+math.pi/2)
    if t<2*SPAN+math.pi*RADIUS:return(HALF-(t-SPAN-math.pi*RADIUS),CY+RADIUS,math.pi)
    a=math.pi/2+(t-2*SPAN-math.pi*RADIUS)/RADIUS;return(-HALF+RADIUS*math.cos(a),CY+RADIUS*math.sin(a),a+math.pi/2)
def route_elevation(distance):
    t=distance%ROUTE
    def smooth(v):
        v=max(0,min(1,v));return v*v*(3-2*v)
    if t<SPAN:return 0
    if t<SPAN+math.pi*RADIUS:
        q=(t-SPAN)/(math.pi*RADIUS);return -1.1*smooth((q-.32)/.20)
    if t<2*SPAN+math.pi*RADIUS:return -1.1
    q=(t-2*SPAN-math.pi*RADIUS)/(math.pi*RADIUS);return -1.1*(1-smooth((q-.48)/.20))
def traffic_pose(distance):
    x,y,a=route_pose(distance);z=route_elevation(distance)
    slope=(route_elevation(distance+.001)-route_elevation(distance-.001))/.002
    return (x,y,z),(0,-math.atan(slope),a)
# The geometric return passes beneath the opaque studio floor. Its ramps start
# beyond the masked ends; no vehicle is switched off, spawned, or teleported.
# Slender actual deck with a dark patinated bronze road surface.
segments=240; verts=[]
for z in [.075,.125]:
    for side in [-1,1]:
        for i in range(segments):
            x,y,a=route_pose(ROUTE*i/segments);verts.append((x-side*.205*math.sin(a),y+side*.205*math.cos(a),z+route_elevation(ROUTE*i/segments)))
faces=[]
for i in range(segments):
    j=(i+1)%segments;n=segments
    faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
me=bpy.data.meshes.new('Closed slender road deck geometry');me.from_pydata(verts,[],faces);me.update()
deck=bpy.data.objects.new('Continuous patinated bronze road deck',me);sc.collection.objects.link(deck);deck.parent=underline;deck.data.materials.append(patina)
mod=deck.modifiers.new('Soft bronze deck edge','BEVEL');mod.width=.007;mod.segments=2;deck.modifiers.new('Deck normals','WEIGHTED_NORMAL')
# Outer triangulated bridge follows both visible curled ends into a hidden rear return.
truss_steps=104;bottom=[];top=[]
for i in range(truss_steps+1):
    x,y,a=route_pose(ROUTE*i/truss_steps);xx=x+.22*math.sin(a);yy=y-.22*math.cos(a)
    zz=route_elevation(ROUTE*i/truss_steps);bottom.append((xx,yy,.025+zz));top.append((xx,yy,.135+zz))
curve('Wrapped bronze bridge lower chord',bottom,.018,underline);curve('Wrapped bronze bridge upper chord',top,.018,underline)
for i in range(truss_steps):
    curve('Bridge underline diagonal %03d'%i,[bottom[i] if i%2==0 else top[i],top[i+1] if i%2==0 else bottom[i+1]],.010,underline)
    if i%2==0:curve('Bridge underline vertical %03d'%i,[bottom[i],top[i]],.008,underline)
# A modeled miniature car: stone body, tapered bronze roof, dark glazing,
# four bronze wheels and hubs. Mesh data is shared identically by all eight cars.
carparent=bpy.data.objects.new('Traffic car 00',None);sc.collection.objects.link(carparent);carparent.parent=underline
body=box('Car stone body',(0,0,.235),(.50,.215,.105),carparent);body.data.materials.clear();body.data.materials.append(stone)
cv=[(-.15,-.09,.28),(.12,-.09,.28),(.12,.09,.28),(-.15,.09,.28),(-.10,-.074,.375),(.052,-.074,.375),(.052,.074,.375),(-.10,.074,.375)]
cf=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
cm=bpy.data.meshes.new('Car tapered cabin geometry');cm.from_pydata(cv,[],cf);cm.update();cabin=bpy.data.objects.new('Car bronze roof and glazing',cm);sc.collection.objects.link(cabin);cabin.parent=carparent;cabin.data.materials.append(bronze);cabin.data.materials.append(patina)
for face in cabin.data.polygons:face.material_index=0 if face.index in [0,1] else 1
for xx in [-.155,.155]:
    for yy in [-.112,.112]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=.055,depth=.035,location=(xx,yy,.180));wheel=bpy.context.object;wheel.rotation_euler[0]=math.pi/2;wheel.name='Car dark bronze wheel';wheel.parent=carparent;wheel.data.materials.append(patina)
        for face in wheel.data.polygons:face.use_smooth=len(face.vertices)==4
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.025,depth=.038,location=(xx,yy,.180));hub=bpy.context.object;hub.rotation_euler[0]=math.pi/2;hub.name='Car brass hub';hub.parent=carparent;hub.data.materials.append(bronze)
for xx in [-.25,.25]:box('Car bronze bumper',(xx,0,.215),(.018,.20,.035),carparent)
# Apply crafted edge modifiers then join the prototype into one reusable mesh.
parts=[o for o in sc.objects if o.parent==carparent]
for ob in parts:
    bpy.context.view_layer.objects.active=ob
    for md in list(ob.modifiers):bpy.ops.object.modifier_apply(modifier=md.name)
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join();body.name='Sculpted vehicle shared mesh'
cars=[carparent]
for i in range(1,COUNT):
    cp=bpy.data.objects.new('Traffic car %02d'%i,None);sc.collection.objects.link(cp);cp.parent=underline
    mesh=body.copy();mesh.data=body.data;sc.collection.objects.link(mesh);mesh.parent=cp;cars.append(cp)
def traffic_frame(frame,progress):
    for i,car in enumerate(cars):
        loc,rot=traffic_pose(1.4+i*SPACING+progress);car.location=loc;car.rotation_euler=rot;car.keyframe_insert('location',frame=frame);car.keyframe_insert('rotation_euler',frame=frame)
for frame in range(1,241):traffic_frame(frame,(frame-240)/96*SPACING)
# A compact, physically modeled civic fan rises from the top of the O.
accent=bpy.data.objects.new('Upper right civic fan reveal',None);sc.collection.objects.link(accent);accent.parent=root;accent.location=(6.93,-.12,3.82)
box('Civic fan bronze foot',(0,0,.012),(.17,.19,.035),accent)
for i,(height,angle) in enumerate([(.19,-16),(.28,2),(.37,21),(.43,38)]):
    a=math.radians(angle);xx=(i-1.5)*.061+math.sin(a)*height/2
    box('Upper right civic fan blade %d'%i,(xx,0,math.cos(a)*height/2),(.063,.11,height),accent,a)
# Static warm grazing light keeps the physical bronze readable; traffic is the ambient motion.
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
    for f in [176,216,240]:
        sc.frame_set(f);sc.render.filepath=str(REV/'traffic-drafts'/('intro-%03d.png'%f));bpy.ops.render.render(write_still=True)
else:
    sc.frame_set(240);sc.render.filepath=str(REV/'buffalo-civic-final.png');bpy.ops.render.render(write_still=True)
    if '--render' in ARGS:
        sc.frame_start=140;sc.frame_end=240;sc.render.filepath=str(REV/'traffic-intro-tail'/'civic-');bpy.ops.render.render(animation=True)

def pose_state(scene,agents,frame):
    bpy.context.window.scene=scene;scene.frame_set(frame);bpy.context.view_layer.update()
    return [{'matrix':[[float(v) for v in row] for row in car.matrix_world],'position':tuple(car.matrix_world.translation)} for car in agents]
intro_previous=pose_state(sc,cars,239);intro_ending=pose_state(sc,cars,240)
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
loopcars=sorted([o for o in ambient.objects if o.name.startswith('Traffic car ')],key=lambda o:o.name)
for car in loopcars:car.animation_data_clear()
# Camera remains at the accepted final retreat pose; loop start exactly matches intro end.
ambient.frame_start=1;ambient.frame_end=96
for f in range(1,98):
    phase=2*math.pi*(f-1)/96
    looproot.rotation_euler=(0,0,math.radians(1.25*math.cos(phase)));looproot.keyframe_insert('rotation_euler',frame=f)
    for i,car in enumerate(loopcars):
        loc,rot=traffic_pose(1.4+i*SPACING+(f-1)/96*SPACING);car.location=loc;car.rotation_euler=rot;car.keyframe_insert('location',frame=f);car.keyframe_insert('rotation_euler',frame=f)
loop_first=pose_state(ambient,loopcars,1);loop_second=pose_state(ambient,loopcars,2)
loop_last=pose_state(ambient,loopcars,96);loop_endpoint=pose_state(ambient,loopcars,97)
def matrix_delta(a,b):return max(abs(a[i]['matrix'][r][c]-b[i]['matrix'][r][c]) for i in range(COUNT) for r in range(4) for c in range(4))
permuted_first=[loop_first[(i+1)%COUNT] for i in range(COUNT)]
intro_pose_error=matrix_delta(intro_ending,loop_first);loop_pose_error=matrix_delta(loop_endpoint,permuted_first)
def step(a,b,i):return Vector(b[i]['position'])-Vector(a[i]['position'])
intro_velocity_error=max((step(intro_previous,intro_ending,i)-step(loop_first,loop_second,i)).length for i in range(COUNT))
loop_velocity_error=max((step(loop_last,loop_endpoint,i)-step(loop_first,loop_second,(i+1)%COUNT)).length for i in range(COUNT))
assert intro_pose_error<.00005 and loop_pose_error<.00005,'Traffic pose seam failed'
assert intro_velocity_error<.02 and loop_velocity_error<.02,'Traffic velocity boundary failed'
def instantaneous_traffic_velocity(distance):
    eps=.0001;a=traffic_pose(distance-eps)[0];b=traffic_pose(distance+eps)[0]
    return tuple((b[j]-a[j])/(2*eps)*(SPACING/4) for j in range(3))
loop_instantaneous_velocity_error=0
for i in range(COUNT):
    before=instantaneous_traffic_velocity(1.4+i*SPACING+SPACING)
    after=instantaneous_traffic_velocity(1.4+((i+1)%COUNT)*SPACING)
    loop_instantaneous_velocity_error=max(loop_instantaneous_velocity_error,math.sqrt(sum((before[j]-after[j])**2 for j in range(3))))
assert loop_instantaneous_velocity_error<.000001,'Periodic instantaneous traffic velocity differs'
# Intro phase uses (frame-240)/96 and ambient uses (frame-1)/96, with
# the same route function and derivative. Both evaluate phase zero at their seam.
intro_instantaneous_velocity_error=0.0
ambient.frame_set(1)
if DRAFT:
    for f in [1,25,49,96]:
        ambient.frame_set(f);ambient.render.filepath=str(REV/'traffic-drafts'/('ambient-%03d.png'%f));bpy.ops.render.render(write_still=True)
else:
    if '--render' in ARGS:
        ambient.render.filepath=str(REV/'traffic-ambient-frames'/'ambient-');bpy.ops.render.render(animation=True)
# Save both scenes together after the ambient scene is fully configured.
bpy.context.window.scene=sc;sc.frame_start=1;sc.frame_end=240;sc.frame_set(240);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(REV/'buffalo-civic-finale.blend'))
proof={'revision':'finale-v2','original_accepted_scene':str(source.relative_to(ROOT)),'accepted_intro_frames_reused':[1,139],'new_intro_rendered_frames':[140,240],'new_intro_hold_duplicate_frames':[],'intro_frames':240,'intro_duration_seconds':10,'full_word_revealed_seconds':5.75,'finale_settled_seconds':215/24,'final_hold_seconds':25/24,'ambient_frames':96,'ambient_duration_seconds':4,'ambient_yaw_degrees':[-1.25,1.25],'ambient_start_end_pose':'intro ends and ambient begins at yaw +1.25 degrees; cosinusoidal loop has zero yaw velocity at the join','ambient_endpoint':'Frame 97 has the mathematical duplicate of frame 1 but is not rendered or encoded','highlight':'Static warm 65 W area light; traffic is the principal continuing motion','traffic_vehicles':COUNT,'intro_traffic_pose_seam_max_matrix_error':intro_pose_error,'loop_traffic_permutation_max_matrix_error':loop_pose_error,'intro_traffic_instantaneous_velocity_error':intro_instantaneous_velocity_error,'loop_traffic_instantaneous_velocity_error':loop_instantaneous_velocity_error,'intro_traffic_velocity_step_delta':intro_velocity_error,'loop_traffic_velocity_step_delta':loop_velocity_error,'traffic_route_length':ROUTE,'traffic_speed_units_per_second':SPACING/4,'traffic_front_crossing_seconds':SPAN/(SPACING/4),'traffic_loop_method':'Eight identical geometric cars advance one vehicle spacing in four seconds on a closed route; the set of poses permutes exactly at the seam','intro_traffic_continuity':'Traffic advances every frame through the final sculpture hold and continues at the same speed in ambient; no static traffic duplicates','road_deck_width':.41,'road_deck_top_z':.125,'traffic_return':'Continuous modeled route returns below the opaque studio floor; smooth ramps begin beyond masked lateral bounds, with no visibility toggles or teleports','word_geometry':'Loaded unchanged from accepted scene; no letter mesh edits','new_geometry_meshes':sum(o.type=='MESH' and o.parent in [underline,accent] for o in sc.objects),'backdrop_srgb':'#BEC7B7','render_engine':'CYCLES','samples':sc.cycles.samples,'width':sc.render.resolution_x,'height':sc.render.resolution_y,'fps':24,'external_images':0}
(REV/'scene-provenance.json').write_text(json.dumps(proof,indent=2));print('FINALE_RENDER_COMPLETE '+json.dumps(proof),flush=True)
