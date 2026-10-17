"""Original procedural Buffalo-inspired material studies, 2026-10-15.
Run Blender 5.2 --background --python this_file.py -- --draft (or --final).
Optional: --study river or --study civic. All architecture is modeled geometry.
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'output/premium-studies'
PUB = ROOT / 'public/premium-studies'
OUT.mkdir(parents=True, exist_ok=True); PUB.mkdir(parents=True, exist_ok=True)
DRAFT = '--draft' in sys.argv
ONLY = sys.argv[sys.argv.index('--study')+1] if '--study' in sys.argv else None

def material(name, rgb, rough=.5, metallic=0, grain=False):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metallic
    if grain:
        n=m.node_tree.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value=68; n.inputs['Detail'].default_value=3
        b=m.node_tree.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value=.18; b.inputs['Distance'].default_value=.018
        m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']); m.node_tree.links.new(b.outputs['Normal'],p.inputs['Normal'])
    return m

def finish(o,name,mat,bevel=0):
    o.name=name; o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Crafted softened edges','BEVEL'); m.width=bevel; m.segments=3
        m=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
    return o

def cube(name,loc,dim,mat,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,bevel)

def cyl(name,loc,r,depth,mat,vertices=80,bevel=.025):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    o=finish(bpy.context.object,name,mat,bevel)
    for p in o.data.polygons: p.use_smooth=len(p.vertices)==4
    return o

def bar(name,a,b,r,mat):
    a,b=Vector(a),Vector(b); o=cyl(name,(a+b)/2,r,(b-a).length,mat,20,.006)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o

def sector(name,r_outer,r_inner,a0,a1,z,depth,mat,center=(0,0),steps=96):
    # Horizontal annular segment: actual manifold mesh, including radial end faces.
    verts=[]
    for zz in (z-depth/2,z+depth/2):
        for rr in (r_inner,r_outer):
            verts += [(center[0]+rr*math.cos(a0+(a1-a0)*i/steps),center[1]+rr*math.sin(a0+(a1-a0)*i/steps),zz) for i in range(steps+1)]
    n=steps+1; faces=[]
    for i in range(steps):
        faces.extend([(i,i+1,n+i+1,n+i),(2*n+i,3*n+i,3*n+i+1,2*n+i+1),(i,2*n+i,2*n+i+1,i+1),(n+i,n+i+1,3*n+i+1,3*n+i)])
    faces.extend([(0,n,3*n,2*n),(n-1,3*n-1,4*n-1,2*n-1)])
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o); return finish(o,name,mat,.018)

def portal(name,y,width,height,thick,depth,mat):
    # Continuous arched cross section extruded in Y. No boolean/image tricks.
    r=width/2; ri=r-thick; spring=height-r; n=96; coords=[]
    coords.append((-r,0)); coords.append((-r,spring))
    coords += [(r*math.cos(math.pi-i*math.pi/n),spring+r*math.sin(math.pi-i*math.pi/n)) for i in range(1,n+1)]
    coords += [(r,0),(ri,0),(ri,spring)]
    coords += [(ri*math.cos(i*math.pi/n),spring+ri*math.sin(i*math.pi/n)) for i in range(1,n+1)]
    coords += [(-ri,0)]
    # Use curve extrude for robust filled concave polygon, then mesh conversion.
    cv=bpy.data.curves.new(name,'CURVE'); cv.dimensions='2D'; cv.resolution_u=1; cv.fill_mode='BOTH'; cv.extrude=depth/2; cv.bevel_depth=.022; cv.bevel_resolution=3
    sp=cv.splines.new('POLY'); sp.points.add(len(coords)-1)
    for p,(x,z) in zip(sp.points,coords): p.co=(x,z,0,1)
    sp.use_cyclic_u=True; o=bpy.data.objects.new(name,cv); bpy.context.collection.objects.link(o)
    o.location=(0,y,.245); o.rotation_euler=(math.pi/2,0,0); o.data.materials.append(mat)
    bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False)
    return o

def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for data in (bpy.data.meshes,bpy.data.curves,bpy.data.materials,bpy.data.lights,bpy.data.cameras):
        for b in list(data):
            if b.users==0: data.remove(b)
    global IVORY,SAGE,INK,BRASS,DARK,GROUND,WATER
    IVORY=material('Porous warm limestone',(0.69,.66,.58),.66,grain=True)
    SAGE=material('Sage cast mineral',(0.43,.49,.39),.58,grain=True)
    INK=material('Ink navy painted steel',(.021,.036,.05),.36,.28)
    BRASS=material('Warm brushed brass',(.48,.29,.105),.3,.8)
    DARK=material('Dark bronze seams',(.11,.09,.055),.4,.65)
    GROUND=material('Warm ivory studio',(.76,.75,.69),.82)
    WATER=material('Still ink water',(.023,.061,.07),.19,.38)

def river():
    cube('Floating limestone presentation block',(0,0,.05),(8.2,5.5,.38),IVORY,.075)
    cube('Brass reveal beneath block',(0,0,-.17),(7.96,5.26,.06),BRASS,.025)
    cube('Ink shadow footing',(0,0,-.275),(7.72,5.02,.20),INK,.04)
    cube('Deep river inset',(0,-1.4,.255),(8.01,1.3,.04),WATER,.02)
    for yy in [-2.08,-.72]: cube('Precisely cut riverbank',(0,yy,.28),(8.02,.065,.11),BRASS,.012)
    # Closely spaced cylindrical elevator cells, two staggered rows.
    for row in range(2):
        for i in range(6):
            x=-2.92+i*.66; y=.13+row*.69; h=2.05+(0.09 if row else 0)
            cyl('Grain cell %d-%d'%(row+1,i+1),(x,y,.24+h/2),.325,h,IVORY)
            cyl('Sage cell crown %d-%d'%(row+1,i+1),(x,y,.26+h),.315,.095,SAGE)
            cyl('Brass service cap %d-%d'%(row+1,i+1),(x,y,.325+h),.105,.055,BRASS,48,.01)
            # Vertical seam conveys scale without architectural false precision.
            cube('Elevator panel seam',(x,y-.325,.31+h/2),(.014,.009,h-.11),SAGE,.002)
    cube('Elevated headhouse',(-1.27,.49,2.62),(3.95,.58,.48),SAGE,.045)
    cube('Brass roof coping',(-1.27,.49,2.88),(4.04,.65,.045),BRASS,.015)
    for i in range(14): cube('Headhouse shadow vent',(-3.03+i*.27,.192,2.63),(.11,.016,.21),INK,.008)
    cube('Warehouse solid',(0.02,1.85,.75),(2.5,.89,1.02),SAGE,.035)
    cube('Warehouse parapet',(.02,1.85,1.28),(2.6,.98,.065),BRASS,.01)
    for i in range(6): cube('Warehouse vertical reveal',(-.97+i*.4,1.394,.78),(.025,.015,.87),IVORY,.004)
    # Abstract vertical-lift bridge. Span crosses the water along Y at x=2.45.
    x=2.52
    cube('Lift bridge deck',(x,-1.4,.69),(1.05,2.18,.13),INK,.026)
    for xx in [x-.51,x+.51]:
        for yy in [-2.30,-.50]:
            cube('Lift tower pier',(xx,yy,.365),(.27,.3,.25),SAGE,.025)
            cube('Lift tower steel upright',(xx,yy,1.32),(.105,.12,1.82),INK,.012)
        bar('Upper truss chord',(xx,-2.31,1.15),(xx,-.49,1.15),.025,BRASS)
        bar('Deck truss chord',(xx,-2.31,.8),(xx,-.49,.8),.025,BRASS)
        for j in range(6):
            ya=-2.3+j*.3; yb=ya+.3
            bar('Triangulated brass web',(xx,ya,.8 if j%2==0 else 1.15),(xx,yb,1.15 if j%2==0 else .8),.017,BRASS)
        for yy in [-2.3,-.5]:
            bar('Lift suspension rod',(xx,yy,.8),(xx,yy,2.22),.012,BRASS)
    for yy in [-2.3,-.5]:
        cube('Lift tower crown',(x,yy,2.23),(1.25,.2,.14),INK,.025)
        bar('Lift gantry diagonal',(x-.48,yy,1.75),(x+.48,yy,2.15),.021,BRASS)
    # Water glints are shallow real curves: quiet concentric arc rhythm.
    for k in range(4):
        o=sector('River contour glint',.47+k*.15,.463+k*.15,3.50,5.25,.284,.004,BRASS,center=(-2,-.94),steps=32)
    cube('Blank brass maker plate',(-2.85,-2.48,.255),(1.0,.23,.018),BRASS,.012)
    return (10,-13,10),(0,0,1.0),11.8

def civic():
    cyl('Monolithic sage dais',(0,.15,.02),3.35,.45,SAGE,144,.07)
    cyl('Lower bronze reveal',(0,.15,-.225),3.21,.045,BRASS,144,.01)
    cyl('Ink shadow foot',(0,.15,-.31),3.08,.13,INK,144,.035)
    # A trio of full-depth vaulted portals makes a rhythm of positive and negative space.
    portal('Outer limestone portal',1.0,4.6,4.8,.38,.52,IVORY)
    portal('Middle sage portal',.05,3.65,3.94,.32,.42,SAGE)
    portal('Inner bronze portal',-.88,2.65,3.05,.19,.22,BRASS)
    cyl('Ink circular reflection well',(0,-.6,.282),1.10,.10,INK,112,.025)
    cyl('Still reflection surface',(0,-.6,.338),1.035,.012,WATER,112,.005)
    # Sphere sits on a slender turned brass stem, visibly grounded.
    cyl('Sphere support pin',(0,-.6,.74),.045,.80,BRASS,48,.009)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=64,radius=.54,location=(0,-.6,1.39))
    o=finish(bpy.context.object,'Polished brass focal sphere',BRASS)
    for p in o.data.polygons:p.use_smooth=True
    # Three sweeping foreground steps; actual stone geometry with metal reveals.
    for i in range(3):
        sector('Civic radial stair %d'%i,2.04+i*.37,1.69+i*.37,math.pi*1.12,math.pi*1.88,.31-i*.018,.13,IVORY,center=(0,.1))
        sector('Fine stair brass edge %d'%i,2.035+i*.37,2.014+i*.37,math.pi*1.12,math.pi*1.88,.383-i*.018,.01,BRASS,center=(0,.1))
    # Tall slim facade blades form a quiet asymmetric counterweight.
    for i in range(5):
        x=1.95+i*.17; y=.2+i*.2
        cube('Civic facade fin %d'%i,(x,y,.245+.65+i*.09),(.055,.29,1.3+i*.18),BRASS,.009)
    return (8.7,-13.4,8.7),(0,.15,1.85),10.8

def studio(pos,target,ortho):
    cube('Studio floor',(0,0,-.425),(200,200,.1),GROUND,.01)
    world=bpy.data.worlds.new('Quiet ivory ambient'); bpy.context.scene.world=world; world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.77,.78,1); world.node_tree.nodes['Background'].inputs[1].default_value=.20
    def area(name,loc,power,color,size,target=(0,0,1)):
        d=bpy.data.lights.new(name,'AREA'); d.energy=power; d.color=color; d.shape='DISK'; d.size=size
        o=bpy.data.objects.new(name,d); bpy.context.collection.objects.link(o); o.location=loc; o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    area('Large warm key',(-4,-4,9),1400,(1,.91,.78),6)
    area('Cool soft fill',(5,-1,6),450,(.81,.9,1),5)
    area('Upper edge light',(2,5,8),1250,(1,.95,.85),4)
    d=bpy.data.cameras.new('Composition camera'); o=bpy.data.objects.new('Composition camera',d); bpy.context.collection.objects.link(o)
    o.location=pos; o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler(); d.type='ORTHO'; d.ortho_scale=ortho; d.lens=50
    bpy.context.scene.camera=o

def output(name):
    s=bpy.context.scene; s.render.engine='CYCLES'; s.cycles.samples=24 if DRAFT else 128
    s.cycles.use_denoising=True; s.cycles.max_bounces=8
    # Prefer available CUDA/OptiX, and gracefully retain CPU otherwise.
    try:
        prefs=bpy.context.preferences.addons['cycles'].preferences
        for kind in ['OPTIX','CUDA']:
            try:
                prefs.compute_device_type=kind; prefs.get_devices()
                gpu=[d for d in prefs.devices if d.type in ['OPTIX','CUDA']]
                if gpu:
                    for d in prefs.devices:d.use=d in gpu
                    s.cycles.device='GPU'; break
            except Exception:pass
    except Exception:pass
    s.render.resolution_x=700 if DRAFT else 1600; s.render.resolution_y=600 if DRAFT else 1372; s.render.resolution_percentage=100
    s.render.image_settings.file_format='PNG'; s.render.film_transparent=False
    s.view_settings.view_transform='AgX'; s.view_settings.look='AgX - Medium High Contrast'; s.view_settings.exposure=-.15
    s.render.filepath=str(OUT/(name+('-draft' if DRAFT else '')+'.png'))
    s.render.image_settings.color_mode='RGB'; s.render.image_settings.color_depth='8'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'.blend')))
    if not DRAFT:
        bpy.ops.object.select_all(action='DESELECT')
        for o in s.objects:
            if o.type=='MESH' and o.name!='Studio floor':o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),use_selection=True,export_format='GLB',export_apply=True)
        bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'.blend')))
    bpy.ops.render.render(write_still=True)
    stats={'name':name,'mesh_objects':sum(o.type=='MESH' and o.name!='Studio floor' for o in s.objects),'mesh_vertices_before_modifiers':sum(len(o.data.vertices) for o in s.objects if o.type=='MESH' and o.name!='Studio floor'),'mesh_faces_before_modifiers':sum(len(o.data.polygons) for o in s.objects if o.type=='MESH' and o.name!='Studio floor'),'resolution':[s.render.resolution_x,s.render.resolution_y],'cycles_samples':s.cycles.samples,'device':s.cycles.device,'camera':'orthographic','external_image_textures':0}
    (OUT/(name+'-stats.json')).write_text(json.dumps(stats,indent=2))
    print('PREMIUM_STUDY_COMPLETE '+json.dumps(stats),flush=True)

for key,build,name in [('river',river,'river-and-elevator'),('civic',civic,'civic-aperture')]:
    if ONLY and ONLY!=key:continue
    reset(); studio(*build()); output(name)
