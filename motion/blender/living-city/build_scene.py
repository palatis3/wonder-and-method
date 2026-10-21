"""Living City — original editable architectural scene, deterministic geometry.

Run with Blender 5.2: --background --python build_scene.py -- --mode lookdev
The accepted generated images are composition references only; no reference pixels
are present in the scene. Website panel textures are original repository assets.
"""
import argparse, bpy, math, random, sys, time, json
from pathlib import Path
from mathutils import Vector,Matrix
import bmesh

P=argparse.ArgumentParser();P.add_argument('--mode',default='lookdev');P.add_argument('--samples',type=int,default=48)
args=P.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/living-city';OUT.mkdir(parents=True,exist_ok=True)
random.seed(52);start=time.time()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials):bpy.data.materials.remove(d)
scene=bpy.context.scene
scene.render.engine='CYCLES' if args.mode=='cycles' else 'CYCLES'
scene.cycles.samples=args.samples;scene.cycles.use_denoising=True
scene.cycles.max_bounces=9;scene.cycles.diffuse_bounces=3;scene.cycles.glossy_bounces=3;scene.cycles.transmission_bounces=8
scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.035
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='HIP';prefs.get_devices()
    for d in prefs.devices:d.use=d.type=='HIP'
    scene.cycles.device='GPU'
except:scene.cycles.device='CPU'
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.film_transparent=False
scene.render.fps=24;scene.frame_start=1;scene.frame_end=101
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.15

def material(name,c,rough=.5,metal=0,noise=0,bump=.06):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if noise:
        tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=noise;tex.inputs['Detail'].default_value=3
        ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(*[x*.65 for x in c],1);ramp.color_ramp.elements[1].color=(*[min(x*1.22,1) for x in c],1)
        l.new(tex.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color'])
        b=n.new('ShaderNodeBump');b.inputs['Strength'].default_value=bump;b.inputs['Distance'].default_value=.035;l.new(tex.outputs['Fac'],b.inputs['Height']);l.new(b.outputs[0],p.inputs['Normal'])
    return m

stone=material('Chalky limestone • granular matte',(.48,.43,.34),.82,noise=36)
stone_light=material('Pale buff stone trim',(.62,.56,.45),.72,noise=55)
plaster=material('Interior warm lime plaster',(.55,.46,.32),.85,noise=22)
grout=material('Warm lime mortar',(.28,.25,.21),.9)
dark=material('Blackened bronze metal',(.025,.035,.033),.38,.55)
sage=material('Fieldwork deep sage painted frame',(.073,.127,.102),.5,.08,noise=45,bump=.025)
navy=material('Northline ink navy enamel',(.018,.044,.065),.45,.13)
burgundy=material('Hearthside woven burgundy canvas',(.16,.018,.035),.89,noise=95,bump=.14)
ivory=material('Warm ivory sign lettering',(.91,.82,.6),.55)
redbricks=[material('Terracotta brick %02d'%i,(.25+i*.018,.079+i*.006,.044+i*.004),.88,noise=48,bump=.18) for i in range(8)]
whitebricks=[material('Limewashed brick %02d'%i,(.38+i*.025,.35+i*.021,.29+i*.017),.86,noise=45,bump=.12) for i in range(5)]
wood=material('Vertical oiled oak grain',(.28,.135,.054),.59,noise=5,bump=.15)
# Stretch generated texture coordinates into timber grain.
wn=wood.node_tree.nodes;wl=wood.node_tree.links;wt=next(n for n in wn if n.type=='TEX_NOISE');wc=wn.new('ShaderNodeTexCoord');wm=wn.new('ShaderNodeVectorMath');wm.operation='MULTIPLY';wm.inputs[1].default_value=(5,5,.35);wl.new(wc.outputs['Generated'],wm.inputs[0]);wl.new(wm.outputs[0],wt.inputs['Vector'])
soil=material('Dark garden soil',(.038,.029,.018),1,noise=90)
potmats=[material('Stoneware planter %d'%i,c,.72,noise=26) for i,c in enumerate([(.49,.47,.41),(.67,.64,.56),(.24,.15,.093),(.12,.17,.15)])]
leafmats=[material('Evergreen leaf %d'%i,c,.65) for i,c in enumerate([(.055,.105,.027),(.095,.16,.038),(.14,.21,.055),(.035,.082,.043),(.19,.23,.065)])]
flowers=[material('Bloom %d'%i,c,.78) for i,c in enumerate([(.52,.08,.17),(.76,.58,.37),(.58,.61,.43)])]
treeleafmats=[material('Broad canopy leaf %d'%i,c,.68) for i,c in enumerate([(.035,.08,.035),(.08,.12,.03),(.13,.16,.055),(.12,.085,.025)])]
glass=material('Clear architectural glass',(.92,.97,.96),.045)
gp=glass.node_tree.nodes.get('Principled BSDF');gp.inputs['Transmission Weight'].default_value=1;gp.inputs['IOR'].default_value=1.45
water=material('Petrol water • small fixed surface ripples',(.008,.034,.042),.12,.25,noise=18,bump=.20)
water.node_tree.nodes.get('Principled BSDF').inputs['IOR'].default_value=1.333
def emissive(name,c,power):
    m=material(name,c,.5);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=power;return m
bulb=emissive('Soft amber practical bulbs',(1,.5,.15),3.8)
fire=emissive('Oven flame golden core',(1,.16,.008),2.2)

def mesh(name,verts,faces,mat):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o)
    if mat:o.data.materials.append(mat)
    return o
def cube(name,loc,size,mat,bevel=.012):
    x,y,z=[v/2 for v in size];v=[(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)]
    o=mesh(name,v,[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat);o.location=loc
    if bevel:b=o.modifiers.new('Edge bevel','BEVEL');b.width=bevel;b.segments=2
    return o
def uvball(name,loc,scale,mat,segments=16,rings=8):
    vs=[];fs=[]
    for j in range(rings+1):
        theta=math.pi*j/rings
        for i in range(segments):
            phi=math.tau*i/segments;vs.append((math.sin(theta)*math.cos(phi),math.sin(theta)*math.sin(phi),math.cos(theta)))
    for j in range(rings):
        for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;fs.append((a,a+segments,b+segments,b))
    o=mesh(name,vs,fs,mat);o.location=loc;o.scale=scale
    for p in o.data.polygons:p.use_smooth=True
    return o
def cyl(name,loc,r,depth,mat,vertices=16,r2=None):
    top=r if r2 is None else r2;vs=[(math.cos(i*math.tau/vertices)*rr,math.sin(i*math.tau/vertices)*rr,z) for z,rr in [(-depth/2,r),(depth/2,top)] for i in range(vertices)]
    fs=[tuple(reversed(range(vertices))),tuple(range(vertices,vertices*2))]+[(i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices)]
    o=mesh(name,vs,fs,mat);o.location=loc
    for p in o.data.polygons:p.use_smooth=abs(p.normal.z)<.5
    return o
def beam(name,a,b,r,mat):
    a,b=Vector(a),Vector(b);o=cyl(name,(a+b)/2,r,(b-a).length,mat,10);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def text(name,body,loc,size,mat,font='georgia.ttf',align='CENTER'):
    cu=bpy.data.curves.new(name,'FONT');cu.body=body;cu.size=size;cu.align_x=align;cu.align_y='CENTER';cu.extrude=.002;cu.bevel_depth=.001;cu.resolution_u=8
    cu.font=bpy.data.fonts.load('C:/Windows/Fonts/'+font);o=bpy.data.objects.new(name,cu);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(mat);return o
def area(name,loc,power,size,color,target):
    d=bpy.data.lights.new(name,'AREA');d.energy=power*.5;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.visible_glossy=False;o.visible_transmission=False;o.visible_camera=False;return o
def point(name,loc,power,color,r=.16):
    d=bpy.data.lights.new(name,'POINT');d.energy=power*.48;d.color=color;d.shadow_soft_size=r;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.visible_camera=False;o.visible_transmission=False;return o
def practical(x,y,z,energy=35):
    beam('Pendant cord',(x,y,z+.45),(x,y,z),.012,dark);uvball('Opal pendant globe',(x,y,z),(.075,.075,.095),bulb);point('Pendant light',(x,y,z-.05),energy,(1,.57,.25),.1)

# Brickwork is an editable mesh, with actual recessed mortar and varied fired faces.
def brickwall(name,origin,width,height,mats,axis='x'):
    x,y,z=origin;cube(name+' mortar backing',(x+width/2 if axis=='x' else x,y if axis=='x' else y+width/2,z+height/2),(width,.16,height) if axis=='x' else(.16,width,height),grout,.008)
    vs=[];fs=[];ids=[];rowh=.135;bw=.30
    for row in range(int(height/rowh)):
        startx=-bw/2 if row%2 else 0
        for j in range(int(width/bw)+2):
            a=max(0,startx+j*bw);b=min(width,startx+(j+1)*bw)
            if b-a<.04:continue
            xx=x+(a+b)/2 if axis=='x' else x;yy=y-.015 if axis=='x' else y+(a+b)/2;zz=z+row*rowh+rowh/2
            sx=(b-a-.012)/2 if axis=='x' else .10;sy=.10 if axis=='x' else (b-a-.012)/2;sz=(rowh-.014)/2;n=len(vs)
            vs.extend([(xx+u*sx,yy+v*sy,zz+w*sz) for u,v,w in [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]])
            fs.extend([tuple(n+k for k in f) for f in [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)]]);ids.extend([random.randrange(len(mats))]*6)
    o=mesh(name,vs,fs,None)
    for m in mats:o.data.materials.append(m)
    for p,i in zip(o.data.polygons,ids):p.material_index=i
    b=o.modifiers.new('Hand softened brick edges','BEVEL');b.width=.004;b.segments=2
    return o

# Perennial leaves are curved pointed meshes, never camera-facing sprites.
fol_v=[];fol_f=[];fol_m=[]
def leaf(pos,direction,length,width,mi):
    p=Vector(pos);d=Vector(direction).normalized();side=d.cross(Vector((0,0,1)))
    if side.length<.1:side=Vector((1,0,0))
    side.normalize();n=len(fol_v);mid=p+d*length*.47+Vector((0,0,.06*length));tip=p+d*length
    fol_v.extend([p,mid+side*width,mid+Vector((0,0,.025)),mid-side*width,tip]);fol_f.extend([(n,n+1,n+2),(n,n+2,n+3),(n+1,n+4,n+2),(n+2,n+4,n+3)]);fol_m.extend([mi]*4)
def broad_leaf(pos,direction,length,width,mi):
    p=Vector(pos);d=Vector(direction).normalized();side=d.cross(Vector((0,0,1)))
    # Outdoor canopies may overhang roofs, but never grow through rooms/glazing.
    if (-2.5<p.x<2.4 and .1<p.y<4.7 and p.z<6.7) or (2<p.x<6.8 and .1<p.y<4.7 and p.z<4.55) or (-9.7<p.x<-2.4 and .1<p.y<4.5 and p.z<4.5):return
    if side.length<.1:side=Vector((1,0,0))
    side.normalize();n=len(fol_v)
    outline=[p,p+d*length*.18+side*width*.63,p+d*length*.43+side*width,p+d*length*.75+side*width*.72,p+d*length,p+d*length*.75-side*width*.72,p+d*length*.43-side*width,p+d*length*.18-side*width*.63]
    fol_v.extend(outline+[p+d*length*.46+Vector((0,0,.055*length))])
    for i in range(8):fol_f.append((n+i,n+(i+1)%8,n+8));fol_m.append(mi)
def fern(x,y,z,scale):
    for k in range(9):
        a=k*math.tau/9+random.uniform(-.2,.2);forward=Vector((math.cos(a),math.sin(a),0));side=Vector((-math.sin(a),math.cos(a),0));base=Vector((x,y,z))
        for j in range(1,13):
            t=j/13;p=base+forward*(t*.65*scale)+Vector((0,0,math.sin(t*math.pi*.8)*.55*scale));lng=(.18*(1-t)+.035)*scale
            for sign in [-1,1]:leaf(p,side*sign+forward*.5+Vector((0,0,.18)),lng,.024*scale,random.choice([0,1,2,3]))
def grasses(x,y,z,scale):
    for j in range(24):
        a=random.random()*math.tau;leaf((x+random.uniform(-.06,.06),y+random.uniform(-.06,.06),z),(math.cos(a)*.48,math.sin(a)*.48,random.uniform(.6,1.3)),random.uniform(.45,.95)*scale,.013*scale,random.randrange(5))
def shrub(x,y,z,scale=.7,bloom=False):
    family=random.random()
    if not bloom and family<.27:fern(x,y,z,scale);return
    if not bloom and family<.43:grasses(x,y,z,scale);return
    for i in range(72):
        ang=random.random()*math.tau;r=random.random()*.3*scale;h=random.random()*.48*scale
        p=Vector((x+math.cos(ang)*r,y+math.sin(ang)*r,z+h));direction=(math.cos(ang),math.sin(ang),random.uniform(.05,1.1));leaf(p,direction,random.uniform(.32,.64)*scale,.085*scale,random.randrange(5))
    if bloom:
        for i in range(7):
            ang=random.random()*math.tau;r=random.random()*.25*scale;loc=(x+math.cos(ang)*r,y+math.sin(ang)*r,z+.55*scale+random.random()*.15)
            color=5+random.randrange(3)
            for petal in range(5):
                a=petal*math.tau/5;leaf(loc,(math.cos(a),math.sin(a),.2),.065*scale,.026*scale,color)
            uvball('Small seasonal flower center',loc,(.012*scale,.012*scale,.015*scale),ivory,8,4)
exec((Path(__file__).parent/'scanned_foliage.py').read_text(),globals())
def pot(x,y,z,r=.25,h=.45,plant=1,bloom=False):
    specimen_rng=random.Random(f'{x:.3f}:{y:.3f}:{z:.3f}');plant*=specimen_rng.uniform(.82,1.23)
    if any(abs(x-xx)<.01 and abs(y-yy)<.01 for xx,yy in [(-2.65,-.9),(-1.95,-.63),(2.15,-1.6)]):
        scanned_pot(x,y,z,specimen_rng.uniform(1.25,1.6),random.random()*math.tau);return
    cyl('Tapered stoneware planter',(x,y,z+h/2),r*.7,h,random.choice(potmats),20,r2=r)
    cyl('Planter dark soil',(x,y,z+h+.004),r*.89,.014,soil,20)
    vs=[];fs=[]
    for i in range(20):
        a=i*math.tau/20
        for j in range(6):b=j*math.tau/6;rr=r*.94+.025*math.cos(b);vs.append((x+math.cos(a)*rr,y+math.sin(a)*rr,z+h+.025*math.sin(b)))
    for i in range(20):
        for j in range(6):fs.append((i*6+j,((i+1)%20)*6+j,((i+1)%20)*6+(j+1)%6,i*6+(j+1)%6))
    mesh('Planter rolled rim',vs,fs,potmats[1])
    shrub(x,y,z+h,plant,bloom)
def tree(x,y,z,h=5,spread=1.7):
    beam('Slender garden tree trunk',(x,y,z),(x+.08,y+.02,z+h*.72),.065,wood)
    for i in range(30):
        a=random.random()*math.tau;rr=random.uniform(.35,1)*spread;zz=z+random.uniform(.45,.95)*h;end=(x+math.cos(a)*rr,y+math.sin(a)*rr,zz)
        beam('Garden tree branch',(x,y,z+h*.45),end,.018,wood)
        for j in range(220):
            p=Vector(end)+Vector((random.gauss(0,.30),random.gauss(0,.30),random.gauss(0,.26)));broad_leaf(p,(random.uniform(-1,1),random.uniform(-1,1),random.uniform(-.5,.8)),random.uniform(.11,.21),random.uniform(.035,.066),8+random.randrange(4))

# Waterfront extends beyond every camera; no exhibition plinth or toy edges.
mesh('Quay solid angled limestone foundation',[(-22,-1.41,-.6),(22,-6.69,-.6),(22,10,-.6),(-22,10,-.6),(-22,-1.41,0),(22,-6.69,0),(22,10,0),(-22,10,0)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],stone)
pavemats=[material('Damp limestone paving %d'%i,(.24+i*.022,.245+i*.02,.23+i*.016),.52+random.random()*.16,noise=32,bump=.09) for i in range(7)]
for row in range(13):
    yy=-5.0+row*.7
    for col in range(30):
        xx=-17+col*1.15+(row%2)*.575
        if yy< -3.8-.12*xx:continue
        o=cube('Cut limestone paver',(xx,yy,.035+random.uniform(-.006,.006)),(1.136,.684,.075),random.choice(pavemats),.013);o.rotation_euler.z=random.uniform(-.003,.003)
coping=cube('Quay waterside coping',(0,-4.05,-.01),(44.32,.26,.2),stone,.025);coping.rotation_euler.z=math.atan(-.12)
for i in range(118):
    x=-21+i*.36;y=-4.2-.12*x-random.random()*.52
    o=uvball('Shoreline weathered stone',(x+random.uniform(-.13,.13),y,-.08),(random.uniform(.13,.4),random.uniform(.17,.36),random.uniform(.12,.25)),random.choice(pavemats),12,6);o.rotation_euler=(random.random(),random.random(),random.random())
    for vertex in o.data.vertices:vertex.co*=random.uniform(.79,1.2)
    if random.random()<.7:shrub(x+random.uniform(-.2,.2),y,-.04,random.uniform(.3,.78))
    if i%3==0:grasses(x,y+.12,-.02,random.uniform(.4,.8))
for xx in [-8.3,-4.1,3.7]:
    yy=-3.85-.12*xx
    cyl('Quiet garden path lamp',(xx,yy,.22),.035,.38,dark,12)
    cyl('Path lamp warm lens',(xx,yy,.44),.055,.06,bulb,12)
    cyl('Path lamp metal cap',(xx,yy,.48),.075,.025,dark,12)
    point('Garden path warm light',(xx,yy,.43),28,(1,.5,.18),.11)
v=[];f=[];nx=360;ny=140
for j in range(ny+1):
    yy=-22+j*23/ny
    for i in range(nx+1):
        xx=-36+i*72/nx;zz=-.22+.021*math.sin(xx*5+yy*9)+.008*math.sin(xx*11-yy*17);v.append((xx,yy,zz))
for j in range(ny):
    for i in range(nx):a=j*(nx+1)+i;f.append((a,a+1,a+nx+2,a+nx+1))
o=mesh('Continuous waterfront ripples',v,f,water)
for p in o.data.polygons:p.use_smooth=True

# FIELDWORK: real transparent greenhouse, gabled rafters, planting and workbench.
fx=-5.1;fw=5.1;front=.35;back=4.2;eave=2.85;ridge=4.35
cube('Fieldwork limestone sill',(fx,2.22,.17),(fw,4,.28),stone_light,.035)
cube('Fieldwork back garden wall',(fx,4.19,1.4),(fw,.18,2.5),plaster,.01)
for xx in [fx-fw/2+i*fw/6 for i in range(7)]:
    beam('Fieldwork front mullion',(xx,front,.25),(xx,front,eave),.038,sage)
    beam('Fieldwork rear mullion',(xx,back,.25),(xx,back,eave),.035,sage)
    if abs(xx-fx)>.45:cube('Fieldwork clear window',(xx+fw/12,front+.025,1.49),(fw/6-.07,.018,2.42),glass,0)
for yy in [front+i*(back-front)/5 for i in range(6)]:
    for xx in [fx-fw/2,fx+fw/2]:beam('Greenhouse side mullion',(xx,yy,.25),(xx,yy,eave),.035,sage)
    beam('Greenhouse roof left rafter',(fx-fw/2,yy,eave),(fx,yy,ridge),.04,sage)
    beam('Greenhouse roof right rafter',(fx,yy,ridge),(fx+fw/2,yy,eave),.04,sage)
for z in [.3,1.1,eave]:
    beam('Greenhouse front transom',(fx-fw/2,front,z),(fx+fw/2,front,z),.04,sage)
    for xx in [fx-fw/2,fx+fw/2]:beam('Greenhouse side transom',(xx,front,z),(xx,back,z),.035,sage)
for xx in [fx-fw/2,fx+fw/2]:mesh('Greenhouse side glazing',[(xx,front,.35),(xx,back,.35),(xx,back,eave),(xx,front,eave)],[(0,1,2,3)],glass)
mesh('Greenhouse left roof glazing',[(fx-fw/2,front,eave),(fx-fw/2,back,eave),(fx,back,ridge),(fx,front,ridge)],[(0,1,2,3)],glass)
mesh('Greenhouse right roof glazing',[(fx,front,ridge),(fx,back,ridge),(fx+fw/2,back,eave),(fx+fw/2,front,eave)],[(0,1,2,3)],glass)
mesh('Greenhouse gable glazing',[(fx-fw/2,front,eave),(fx,front,ridge),(fx+fw/2,front,eave)],[(0,1,2)],glass)
beam('Greenhouse ridge',(fx,front,ridge),(fx,back,ridge),.055,sage)
beam('Greenhouse long brass door pull',(fx+.28,front-.1,1.1),(fx+.28,front-.1,1.58),.016,dark)
for xx in [fx-fw/2,fx+fw/2]:
    beam('Greenhouse eaves rain gutter',(xx,front-.04,eave),(xx,back,eave),.048,sage)
beam('Greenhouse rain downpipe',(fx+fw/2,back,eave),(fx+fw/2,back,.25),.035,sage)
for t in [.33,.67]:
    for sign in [-1,1]:
        xx=fx+sign*fw/2*t;zz=ridge-(ridge-eave)*t;beam('Roof purlin',(xx,front,zz),(xx,back,zz),.022,sage)
cube('Fieldwork sign bordered backing',(fx,front-.08,2.84),(2.95,.16,.88),dark,.025)
cube('Fieldwork sage sign enamel',(fx,front-.18,2.84),(2.84,.04,.78),sage,.008)
# Lower attached glazed nursery bay steps down toward the waterfront garden.
bayleft=fx-fw/2-1.85;bayright=fx-fw/2
cube('Fieldwork adjoining bay limestone base',((bayleft+bayright)/2,2.22,.17),(1.85,4,.28),stone_light,.025)
for xx in [bayleft,bayleft+.62,bayleft+1.24,bayright]:
    top=2.13+(xx-bayleft)/1.85*.72
    beam('Lower nursery bay front mullion',(xx,front,.3),(xx,front,top),.032,sage)
    beam('Lower nursery bay roof rafter',(xx,front,top),(xx,back,top),.032,sage)
for yy in [front,1.15,1.95,2.75,3.55,back]:
    beam('Lower nursery bay roof transom',(bayleft,yy,2.13),(bayright,yy,2.85),.028,sage)
    beam('Lower nursery bay side mullion',(bayleft,yy,.3),(bayleft,yy,2.13),.028,sage)
for zz in [.3,1.0,2.13]:beam('Lower nursery bay front transom',(bayleft,front,zz),(bayright,front,zz),.032,sage)
mesh('Lower nursery bay front glazing',[(bayleft,front,.3),(bayright,front,.3),(bayright,front,2.85),(bayleft,front,2.13)],[(0,1,2,3)],glass)
mesh('Lower nursery bay roof glazing',[(bayleft,front,2.13),(bayleft,back,2.13),(bayright,back,2.85),(bayright,front,2.85)],[(0,1,2,3)],glass)
mesh('Lower nursery bay side glazing',[(bayleft,front,.3),(bayleft,back,.3),(bayleft,back,2.13),(bayleft,front,2.13)],[(0,1,2,3)],glass)
for yy in [1.0,2.0,3.0]:pot(bayleft+.7,yy,.3,.2,.35,1.25)
practical(bayleft+.8,2,1.9,90)
area('Lower nursery bay warm light',(bayleft+.8,2.5,1.8),380,1.8,(1,.59,.25),(bayleft+.8,.4,1))
text('Fieldwork architectural lettering','Fieldwork',(fx,front-.207,2.96),.5805,ivory)
text('Fieldwork secondary lettering','LANDSCAPING',(fx,front-.21,2.59),.15525,ivory,'calibri.ttf')
cube('Potting table',(fx,2,1.0),(3.9,.62,.11),wood)
for x in [fx-1.7,fx+1.7]:cube('Potting bench leg',(x,2,.6),(.085,.5,.8),wood)
for i in range(8):pot(fx-1.7+i*.49,2,1.06,.13,.21,.38,i%3==0)
for zz in [.72,1.35,1.98]:
    cube('Greenhouse rear nursery shelf',(fx,3.63,zz),(4.55,.5,.065),wood)
    for i in range(9):pot(fx-2+i*.48,3.61,zz+.04,.12,.18,.45,i%4==0)
    cube('Warm concealed nursery shelf lighting',(fx,3.43,zz-.045),(3.9,.022,.012),bulb,.003)
for xx in [fx-1.5,fx,fx+1.5]:point('Nursery shelf local light',(xx,3.0,1.7),65,(1,.58,.24),.2)
for xx in [fx-1.8,fx+1.8]:pot(xx,1.4,.3,.25,.4,1.65)
for xx in [fx-1.7,fx,fx+1.7]:practical(xx,1.8,2.55,76)
area('Fieldwork interior soft glow',(fx,2.7,2.4),850,3,(1,.60,.27),(fx,0,1.3))
area('Fieldwork doorway warm spill',(fx,.25,2.25),130,1.7,(1,.61,.29),(fx,-1.7,.3))
for x,y,r,h in [(fx-2.4,-.2,.35,.55),(fx-1.8,-.65,.25,.42),(fx+1.9,-.05,.34,.55),(fx+2.45,-.9,.28,.43),(fx-3.0,.1,.4,.48),(fx-2.8,-1.2,.27,.35),(fx+.95,-.6,.23,.38)]:pot(x,y,.1,r,h,1.1,True)
for x,y,w,d in [(-8.1,-.45,1.45,2.2),(-6.9,-2.1,2.1,.55),(-3.4,-1.4,1.1,.9)]:
    cube('Fieldwork raised limestone garden bed',(x,y,.24),(w,d,.3),stone,.035);cube('Garden bed rich soil',(x,y,.4),(w-.15,d-.15,.035),soil,.01)
    for i in range(8):shrub(x+random.uniform(-w*.4,w*.4),y+random.uniform(-d*.4,d*.4),.43,random.uniform(.55,.92),i%2==0)
# Slatted garden bench, cast iron supports.
for yy in [-1.7,-1.53,-1.36]:cube('Garden bench seat slat',(fx-.8,yy,.57),(1.65,.14,.065),wood,.018)
for zz in [.86,1.02]:cube('Garden bench back slat',(fx-.8,-1.25,zz),(1.65,.07,.12),wood,.014)
for xx in [fx-1.45,fx-.15]:
    beam('Bench rear support',(xx,-1.27,.1),(xx,-1.27,1.1),.025,dark);beam('Bench front leg',(xx,-1.76,.1),(xx,-1.7,.59),.025,dark)

# NORTHLINE: load-bearing limestone/brick piers and warm oak upper studio.
nx=.0;nl=-2.25;nr=2.15
cube('Northline stone floor',(nx,2,.24),(4.5,4.2,.36),stone_light,.03)
brickwall('Northline west masonry pier',(nl,.48,.35),.7,5.6,whitebricks)
brickwall('Northline east masonry pier',(nr-.52,.48,.35),.52,3.0,whitebricks)
cube('Northline back wall',(nx,4.4,3),(4.5,.2,5.5),plaster)
cube('Northline ground ceiling',(nx,2.4,3.25),(4.5,4.15,.25),stone_light,.025)
for xx in [-1.48,-.65,.2,1.12,1.66]:
    door=xx in [-.65,.2]
    cube('Northline storefront vertical frame',(xx,.83 if door else .42,1.75),(.06,.075,2.72),dark,.006)
    if xx<1.5:cube('Northline storefront glazing',(xx+.39,.88 if xx==-.65 else .47,1.74),(.73,.018,2.6),glass,0)
for xx in [-.65,.2]:cube('Northline recessed entry jamb',(xx,.64,1.75),(.1,.47,2.72),wood,.008)
beam('Northline entry door bronze pull',(.05,.77,1.15),(.05,.77,1.67),.017,dark)
for zz in [.42,2.7,3.05]:cube('Northline storefront transom',(.1,.42,zz),(3.4,.09,.065),dark,.006)
cube('Northline sign border',(.15,.25,3.05),(2.75,.24,.86),stone_light,.015)
cube('Northline navy sign',(.15,.1,3.05),(2.58,.055,.7),navy,.008)
text('Northline original name','Northline',(.15,.061,3.13),.6075,ivory,'calibrib.ttf')
text('Northline secondary name','REMODELING',(.15,.058,2.85),.16875,ivory,'calibri.ttf')
# Upper room is carried by real masonry and timber posts, not a floating block.
for xx in [-1.55,1.8]:cube('Northline structural oak column',(xx,.7,4.72),(.22,.25,3.02),wood,.018)
cube('Northline upper front beam',(.1,.75,6.16),(4.1,.35,.3),wood,.022)
cube('Northline upper flat roof',(.05,2.35,6.4),(4.8,4.4,.3),wood,.03)
zinc=material('Weathered satin roof zinc',(.15,.16,.15),.67,.32,noise=38,bump=.07)
cube('Northline roof zinc flashing',(.05,2.35,6.57),(4.88,4.47,.055),zinc,.012)
for xx in [-2.1+i*.59 for i in range(8)]:
    cube('Oak roof fascia joint',(xx,.142,6.4),(.012,.018,.24),dark,.002)
    for z in [6.32,6.48]:uvball('Fascia bronze fixing',(xx+.05,.13,z),(.007,.005,.007),dark,8,4)
for xx in [-1.38,1.55]:
    for i in range(5):cube('Northline front oak rainscreen board',(xx+i*.13,.73,4.76),(.12,.11,2.52),wood,.005)
for yy in [.9+i*.19 for i in range(20)]:
    if 1.4<yy<3.3:
        cube('Northline east oak lower board',(2.12,yy,3.74),(.12,.18,.47),wood,.006);cube('Northline east oak upper board',(2.12,yy,5.95),(.12,.18,.23),wood,.006)
    else:cube('Northline east oak rainscreen board',(2.12,yy,4.78),(.12,.18,2.55),wood,.006)
cube('Northline upper side glazing',(2.11,2.36,4.82),(.018,1.93,1.94),glass,0)
for yy in [1.37,2.36,3.35]:cube('Upper side window frame',(2.19,yy,4.82),(.09,.06,2.03),dark,.006)
for zz in [3.82,5.83]:cube('Upper side window horizontal frame',(2.19,2.36,zz),(.09,2.03,.055),dark,.006)
upper_glass=material('Northline upper glazing • cool restrained reflection',(.78,.87,.90),.07)
ug=upper_glass.node_tree.nodes.get('Principled BSDF');ug.inputs['Transmission Weight'].default_value=1;ug.inputs['IOR'].default_value=1.56;ug.inputs['Coat Weight'].default_value=.25;ug.inputs['Coat Roughness'].default_value=.09
window_lining=material('Dark warm window reveal lining',(.041,.045,.039),.62,.12)
cube('Northline upper picture window',(.35,1.39,4.76),(2.35,.024,2.37),upper_glass,0)
for xx in [-.86,1.55]:
    cube('Upper window jamb',(xx,1.31,4.75),(.095,.16,2.47),dark,.008);cube('Upper studio deep window reveal',(xx,1.05,4.75),(.085,.67,2.47),window_lining,.01)
for zz in [3.52,5.98]:cube('Upper window lintel',(.35,1.31,zz),(2.46,.16,.095),dark,.008)
cube('Upper glazing central divider',(.5,1.30,4.75),(.075,.12,2.43),dark,.006)
cube('Northline upper oak deep window sill',(.35,1.03,3.49),(2.55,.88,.095),wood,.016)
for xx in [-1.1,-.05,1.0]:
    cube('Northline exposed overhang timber joist',(xx,1.4,6.02),(.10,2.5,.13),wood,.012)
    cyl('Warm recessed soffit downlight',(xx,.72,5.94),.035,.012,bulb,16)
    point('Warm timber soffit wash',(xx,.75,5.85),30,(1,.58,.26),.15)
cube('Northline warm interior worktable',(.3,2.2,4.05),(1.8,.8,.09),wood)
for xx in [-.45,1.05]:cube('Desk legs',(xx,2.2,3.72),(.06,.65,.66),dark)
cube('Architect drawing board',(.25,2.22,4.13),(1.2,.65,.035),stone_light)
cube('Upper studio back bookcase',(-.35,4.12,4.65),(2.9,.3,2.1),wood,.02)
for zz in [3.77,4.27,4.77,5.27]:
    cube('Bookcase horizontal shelf',(-.35,3.91,zz),(2.8,.4,.05),wood)
    for i in range(11):
        height=random.uniform(.18,.36);cube('Architect material journal',(-1.55+i*.23,3.9,zz+height/2+.03),(.13,.18,height),random.choice([stone_light,navy,sage,burgundy]),.005)
pot(1.38,1.65,3.4,.23,.4,1.5)
cube('Studio upholstered chair seat',(.3,2.98,3.92),(.68,.61,.14),sage,.06)
cube('Studio upholstered chair back',(.3,3.23,4.21),(.68,.11,.55),sage,.06)
for xx in [0,.6]:
    for yy in [2.76,3.16]:beam('Studio chair timber leg',(xx,yy,3.4),(xx,yy,3.88),.025,wood)
for xx in [-.6,.6,1.45]:practical(xx,2.3,5.65,62)
area('Northline upper warm interior',(0,2.7,5.6),390,2.8,(1,.62,.31),(0,.5,4))
area('Northline lower studio light',(.1,2.7,2.8),420,2.5,(1,.62,.32),(0,.2,1))
area('Northline entry warm spill',(.1,.7,2.65),95,1.7,(1,.62,.31),(.1,-1.15,.2))
# Ground-level sample wall and cabinetry.
for zz in [.85,1.48,2.1]:
    cube('Northline sample shelf',(.3,3.45,zz),(3.3,.46,.065),wood)
    for i in range(6):cube('Material sample block',(-1.0+i*.5,3.48,zz+.21),(.32,.15,.37),whitebricks[i%5])
cube('Northline consultation counter',(.25,2.2,.85),(2.4,.65,.9),wood,.03)
for xx in [-.55,.25,1.05]:
    cube('Studio cabinetry drawer seam',(xx,1.865,.88),(.012,.02,.78),dark,.003);cube('Cabinet satin metal handle',(xx+.25,1.84,1.16),(.18,.025,.025),dark,.008)
pot(-1.15,1.25,.4,.19,.3,1.1)
for i in range(3):cube('Northline entrance stone stair',(0,-.25-i*.32,.32-i*.085),(3.9,.34,.16),stone_light,.014)
for xx in [-1.95,1.85]:pot(xx,-.63,.11,.27,.48,1.1)

# HEARTHSIDE: red brick, rooftop garden and fabric awning over open shopfront.
hx=4.35;hl=2.18;hr=6.55;hy=.55
cube('Hearthside floor',(hx,2.5,.22),(4.45,4.3,.28),stone_light,.025)
brickwall('Hearthside left brick pier',(hl,hy,.35),.42,4.05,redbricks)
brickwall('Hearthside right brick pier',(hr-.36,hy,.35),.36,4.05,redbricks)
brickwall('Hearthside frontage frieze',(hl,hy,3.08),4.37,1.26,redbricks)
brickwall('Hearthside east side return',(hr,hy,.35),4.0,4.05,redbricks,'y')
cube('Hearthside interior back wall',(hx,4.4,1.65),(4.4,.2,2.8),plaster,.01)
cube('Hearthside flat roof',(hx,2.55,4.33),(4.55,4.3,.18),stone,.02)
cube('Hearthside pale cornice',(hx,.5,4.37),(4.61,.37,.19),stone_light,.02)
cube('Hearthside side cornice',(hr+.05,2.55,4.37),(.32,4.3,.19),stone_light,.02)
for xx in [2.65,3.7,4.8,5.9,6.14]:cube('Pizzeria black window mullion',(xx,.79,1.65),(.055,.08,2.52),dark,.005)
for xx in [2.68,3.73,4.83]:cube('Pizzeria clear storefront glazing',(xx+.48,.84,1.65),(.92,.016,2.48),glass,0)
for zz in [.38,2.9]:cube('Hearthside storefront transom',(hx,.79,zz),(3.6,.09,.065),dark,.006)
cube('Pizzeria deep limestone window sill',(hx,.65,.35),(3.65,.53,.11),stone_light,.015)
for xx in [2.58,6.18]:cube('Pizzeria deep brick reveal',(xx,.7,1.65),(.14,.5,2.6),redbricks[4],.015)
# Taut cloth awning with subtle seam strips, thick scalloped valance.
mesh('Hearthside burgundy canvas canopy',[(hl-.1,.28,3.38),(hr+.12,.28,3.38),(hr+.12,-.95,2.66),(hl-.1,-.95,2.66)],[(0,1,2,3)],burgundy)
cube('Hearthside awning valance',(hx,-.96,2.57),(4.62,.035,.22),burgundy,.012)
for xx in [hl-.1,3.0,4.0,5.0,6.0,hr+.12]:beam('Awning fabric batten',(xx,.25,3.36),(xx,-.96,2.65),.016,burgundy)
for xx in [hl-.09,hr+.1]:beam('Awning steel support',(xx,.43,2.15),(xx,-.94,2.65),.016,dark)
aw=text('Hearthside sign on canvas','Hearthside',(hx,-.57,3.08),.49,ivory,'georgiai.ttf');aw.rotation_euler=(math.radians(59.6),0,0)
for xx in [2.8,4.4,6.0]:
    beam('Gooseneck wall lamp',(xx,.3,3.94),(xx,-.03,3.78),.019,dark)
    cyl('Wall lamp shade',(xx,-.03,3.73),.12,.09,dark,20,r2=.06);uvball('Wall lamp warm lens',(xx,-.03,3.68),(.07,.07,.022),bulb);point('Quiet awning downlight',(xx,-.04,3.62),45,(1,.52,.22))
for xx in [2.9,4,5.2,6.1]:practical(xx,.1,2.34,55)
# Rooftop rail, planted terrace, chimney.
for xx in [hl+i*.23 for i in range(20)]:beam('Terrace vertical railing',(xx,.5,4.45),(xx,.5,5.04),.018,dark)
for zz in [4.5,5.05]:beam('Terrace front rail',(hl,.5,zz),(hr,.5,zz),.026,dark)
for yy in [.55+i*.27 for i in range(14)]:beam('Terrace side railing',(hr,yy,4.45),(hr,yy,5.04),.016,dark)
beam('Terrace east top rail',(hr,.5,5.05),(hr,4.2,5.05),.025,dark)
brickwall('Hearthside chimney front',(5.55,3.1,4.4),.72,1.7,redbricks)
brickwall('Hearthside chimney side',(6.27,3.1,4.4),.68,1.7,redbricks,'y')
cube('Chimney limestone cap',(5.94,3.44,6.12),(.97,.94,.13),stone_light,.02)
for x in [2.55,3.3,4.3,5.25]:pot(x,1.2,4.45,.26,.35,.9,True)
# Curved wood-fired oven, visible through the right-hand bay.
ovenmat=material('Oven limewashed firebrick',(.57,.43,.27),.81,noise=45,bump=.13)
cube('Oven masonry hearth',(5.61,2.12,.72),(1.52,1.25,.94),ovenmat,.04)
dome=uvball('Oven plaster dome',(5.61,2.12,1.3),(.77,.64,.75),ovenmat,40,20)
inner=uvball('Oven hollow interior cutter',(5.61,2.12,1.3),(.66,.54,.64),dark,32,16);inner.hide_render=True;inner.hide_viewport=True
mod=dome.modifiers.new('Real hollow masonry oven','BOOLEAN');mod.operation='DIFFERENCE';mod.object=inner;mod.solver='EXACT'
# A true arched passage cuts through the masonry into the recessed fire chamber.
outline=[(-.46,1.02),(.46,1.02)]+[(math.cos(i*math.pi/20)*.46,1.34+math.sin(i*math.pi/20)*.4) for i in range(21)]
vv=[(5.61+x,y,z) for y in [1.0,2.16] for x,z in outline];nn=len(outline);ff=[tuple(reversed(range(nn))),tuple(range(nn,nn*2))]+[(i,(i+1)%nn,(i+1)%nn+nn,i+nn) for i in range(nn)]
cut=mesh('Oven actual arched opening cutter',vv,ff,dark);cut.hide_render=True;cut.hide_viewport=True
for boolean_mesh in [dome,inner,cut]:
    bm=bmesh.new();bm.from_mesh(boolean_mesh.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(boolean_mesh.data);bm.free()
mod=dome.modifiers.new('Actual open arched oven door','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;mod.solver='EXACT'
cube('Oven dark firebrick floor',(5.61,1.95,1.2),(1.1,.88,.045),dark,.01)
for i in range(11):
    a=(i+.5)*math.pi/11;x=5.61+math.cos(a)*.52;z=1.34+math.sin(a)*.44;o=cube('Oven arch voussoir',(x,1.41,z),(.16,.14,.18),stone_light,.016);o.rotation_euler[1]=a-math.pi/2
for i in range(5):
    xx=5.37+i*.11;uvball('Oven ember',(xx,1.9,1.25),(.065,.065,.025),fire,10,5)
for i in range(3):
    xx=5.42+i*.17;o=uvball('Small flame inside dark oven',(xx,1.96,1.36+random.random()*.025),(.026,.035,.10+random.random()*.05),fire,12,8);o.rotation_euler[1]=random.uniform(-.22,.22)
beam('Charred oven log',(5.32,1.84,1.25),(5.84,1.96,1.26),.043,dark)
point('Recessed amber oven fire',(5.6,1.9,1.4),70,(1,.23,.025),.15)
cube('Pizzeria service counter',(3.5,2.25,.88),(1.45,.7,.97),wood,.025)
cube('Pizzeria honed stone countertop',(3.5,2.25,1.4),(1.58,.83,.085),stone_light,.022)
for i in range(18):cube('Pizzeria counter oak fluting',(2.83+i*.078,1.886,.9),(.036,.027,.84),wood,.009)
for x in [3.02,3.18,3.34]:
    for j in range(4):cyl('Pizzeria stacked ceramic plates',(x,2.12,1.46+j*.026),.067,.016,ivory,20)
cyl('Pizzeria countertop earthenware pitcher',(3.82,2.3,1.57),.08,.25,potmats[2],20,r2=.065)
for z in [1.4,1.97,2.54]:
    cube('Pizzeria display shelf',(3.6,4.18,z),(2.45,.4,.06),wood)
    for x in [2.65,3,3.5,4,4.4]:cyl('Ceramic tableware',(x,4.15,z+.12),.075,.2,random.choice(potmats),12)
for xx in [3.1,4.0]:practical(xx,2.3,2.66,40)
wine=material('Dark olive wine bottle glass',(.035,.055,.014),.23,.1)
for x in [2.7,2.9,3.4,3.6,4.05,4.25]:
    cyl('Wine bottle body',(x,3.98,2.16),.035,.26,wine,12);cyl('Wine bottle neck',(x,3.98,2.33),.015,.09,wine,12)
area('Hearthside warm room',(4.1,2.8,2.8),500,3,(1,.60,.3),(4.1,.1,1.1))
area('Hearthside threshold warm spill',(4.5,.7,2.5),125,2.6,(1,.59,.26),(4.5,-1.6,.2))

def chair(x,y,angle=0):
    root=bpy.data.objects.new('Cafe chair',None);scene.collection.objects.link(root);root.location=(x,y,.07);root.rotation_euler.z=angle
    objs=[]
    for xx in [-.19,.19]:
        for yy in [-.18,.18]:objs.append(beam('Cafe chair slender leg',(xx,yy,0),(xx*.88,yy*.88,.47),.018,dark))
        objs.append(beam('Cafe chair back upright',(xx,.18,.4),(xx,.22,.91),.018,dark))
    objs.append(cube('Cafe chair woven seat',(0,0,.48),(.39,.38,.035),wood,.04))
    for i in range(9):
        xx=-.17+i*.0425;yy=.21+.035*(1-(xx/.2)**2);objs.append(cube('Cafe chair narrow curved back slat',(xx,yy,.74),(.023,.024,.31),wood,.009))
    objs.append(beam('Cafe chair upper back rail',(-.19,.22,.9),(.19,.22,.9),.02,dark))
    for o in objs:o.parent=root
def cafe_table(x,y):
    cyl('Cafe small round oak table',(x,y,.85),.42,.055,wood,32)
    beam('Cafe table pedestal',(x,y,.12),(x,y,.83),.035,dark)
    for a in [0,math.pi/2]:beam('Cafe table foot',(x-math.cos(a)*.3,y-math.sin(a)*.3,.1),(x+math.cos(a)*.3,y+math.sin(a)*.3,.1),.02,dark)
    cyl('Table candle votive',(x+.08,y,.92),.035,.08,bulb,12)
    for dx in [-.18,.18]:
        cyl('Cafe table ceramic plate',(x+dx,y,.889),.09,.015,ivory,24)
        cube('Folded linen table napkin',(x+dx,y+.12,.89),(.065,.11,.008),stone_light,.005)
    chair(x-.6,y+.03,-math.pi/2);chair(x+.6,y+.03,math.pi/2)
cafe_table(3.4,-1.75);cafe_table(5.45,-1.92)
pot(2.15,-1.6,.1,.29,.46,1.0,True);pot(6.8,-1.15,.1,.34,.58,1.15);pot(6.55,-2.38,.1,.26,.43,.8,True)
cube('Pizzeria sidewalk menu board',(6.32,-1.3,.79),(.55,.08,1.22),wood,.02)
cube('Pizzeria chalkboard inset',(6.32,-1.35,.79),(.47,.014,1.12),navy,.005)
for body,z in [('PIZZA',1.12),('WINE',.92),('GOOD',.72),('PEOPLE',.52)]:text('Chalk menu '+body,body,(6.32,-1.365,z),.115,ivory,'calibri.ttf')
for xx,hh in [(-8.4,3.8),(-7.9,4.1),(-2.9,5.6),(2.4,5.5)]:tree(xx,5.8,.13,hh,random.uniform(1.2,1.8))
rear_canopy=scanned_tree(2.6,6.2,.12,1.8,-.4)
canopy_overlap=rear_canopy.copy();canopy_overlap.data=rear_canopy.data;botanical_col.objects.link(canopy_overlap);canopy_overlap.name='Textured overlapping rear canopy • shared LOD1';canopy_overlap.location=(5.0,6.5,.12);canopy_overlap.scale=(1.72,)*3;canopy_overlap.rotation_euler.z=1.3
tree(-9.5,3.3,.12,3.2,1.8);tree(-4.8,5.2,.12,4.7,2.1)
cube('Fieldwork woodland soil bed',(-13.5,4,.055),(8,10,.12),soil,.01)
for i in range(48):shrub(random.uniform(-17,-9.3),random.uniform(-.7,8.3),.13,random.uniform(.6,1.3),i%5==0)
tree(-12,3,.15,3.6,1.7);tree(-10.6,6,.15,4.3,1.6)
for i in range(22):
    x=random.uniform(-9,8);y=random.uniform(4.4,5.7);shrub(x,y,.13,random.uniform(.8,1.5))
# Finish foliage as one mesh with stable assigned materials.
o=mesh('Botanical foliage • individually modeled curved leaves',fol_v,fol_f,None)
for m in leafmats+flowers+treeleafmats:o.data.materials.append(m)
for p,i in zip(o.data.polygons,fol_m):p.material_index=i;p.use_smooth=True

# Distant waterfront shapes provide atmosphere without competing with the city.
distant=emissive('Distant headland blue haze',(.009,.024,.032),.65)
for k in range(0):
    verts=[(-70,40+k*12,-1)];verts +=[(x,40+k*12,random.uniform(.1,.55)+k*.15) for x in range(-70,71,3)];verts +=[(70,40+k*12,-1)];mesh('Distant low waterfront headland',verts,[tuple(range(len(verts)))],distant)

# Procedural dusk atmosphere, softly graded, no generated picture backdrop.
world=bpy.data.worlds.new('Deep petrol maritime dusk');world.use_nodes=True;scene.world=world;n=world.node_tree.nodes;l=world.node_tree.links;n.clear()
out=n.new('ShaderNodeOutputWorld');bg=n.new('ShaderNodeBackground');bg.inputs['Strength'].default_value=.3
tc=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');l.new(tc.outputs['Normal'],sep.inputs[0]);r=n.new('ShaderNodeValToRGB')
r.color_ramp.elements[0].position=.0;r.color_ramp.elements[0].color=(.022,.075,.105,1);r.color_ramp.elements[1].position=.75;r.color_ramp.elements[1].color=(.004,.021,.034,1)
l.new(sep.outputs['Z'],r.inputs[0])
cloud=n.new('ShaderNodeTexNoise');cloud.inputs['Scale'].default_value=2.6;cloud.inputs['Detail'].default_value=4;cloud.inputs['Roughness'].default_value=.65
mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1,1,7);l.new(tc.outputs['Normal'],mapping.inputs[0]);l.new(mapping.outputs[0],cloud.inputs['Vector'])
cr=n.new('ShaderNodeValToRGB');cr.color_ramp.elements[0].position=.42;cr.color_ramp.elements[0].color=(.28,.35,.45,1);cr.color_ramp.elements[1].position=.66;cr.color_ramp.elements[1].color=(1.8,1.9,2.0,1);l.new(cloud.outputs['Fac'],cr.inputs[0])
mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.72;l.new(r.outputs[0],mix.inputs[1]);l.new(cr.outputs[0],mix.inputs[2]);l.new(mix.outputs[0],bg.inputs[0]);l.new(bg.outputs[0],out.inputs[0])
area('Broad cool dusk sky',(-4,-2,13),950,14,(.46,.62,.82),(0,1,0))
area('Cool foreground fill',(-9,-12,7),500,9,(.43,.60,.82),(0,0,2))
area('Warm reflected limestone fill',(-4,-7,4),120,8,(1,.72,.46),(0,0,3))
area('Quiet warm western edge',(-8,5,7),420,8,(1,.65,.34),(-2,1,2))
area('Right architectural rim',(10,3,9),600,7,(.52,.68,.86),(3,1,3))
area('Left garden soft reflected dusk bounce',(-8,-3,5.2),230,4.5,(.81,.77,.58),(-7,1.3,1.2))
area('Garden window reflected shore bounce',(-5,-.8,2.6),180,4.5,(1,.71,.4),(-5,-3.8,.25))
area('Upper timber reflected warm bounce',(-1.6,-.25,4.8),120,3.4,(1,.72,.43),(0,.75,5.3))
exec((Path(__file__).parent/'material_finish.py').read_text(),globals())

def camera(name,loc,target,lens,shift=0):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;d.sensor_width=36;d.sensor_fit='HORIZONTAL';d.shift_y=shift;return o
desktop=camera('CAMERA • desktop hero',(14,-28,7.4),(-1.8,1,4.1),63)
portrait=camera('CAMERA • portrait hero',(13,-30,7.1),(-.8,1,3.8),74,.32)
# A shallow 1.7% arrival, fully settled by one second; no ambient camera drift.
for c,target in [(desktop,Vector((-1.8,1,4.1))),(portrait,Vector((-.8,1,3.8)))]:
    original=c.location.copy();c.keyframe_insert('location',frame=1);c.location=target+(original-target)*.983;c.keyframe_insert('location',frame=25);c.keyframe_insert('location',frame=101);c.location=original

# Exact original project screenshots, packed in the blend for independent editing.
panelgroups={'desktop':[],'portrait':[]}
def screenshot_panel(brand,loc,w,h,variant='desktop'):
    asset_variant='desktop'
    image=bpy.data.images.load(str(ROOT/f'src/assets/work/concepts/{brand}-showcase-{asset_variant}.webp'));image.pack()
    m=material('Original '+brand+' '+variant+' screenshot',(1,1,1),.85);p=m.node_tree.nodes.get('Principled BSDF');tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);m.node_tree.links.new(tex.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.25
    root=bpy.data.objects.new('Presentation surface • '+brand+' • '+variant,None);scene.collection.objects.link(root);root.location=loc
    edgemat=material('Matte presentation edge • '+brand+' • '+variant,(.68,.64,.53),.86)
    backing=cube('Matte ivory presentation edge',(0,0,0),(w+.035,.065,h+.035),edgemat,.018);backing.parent=root
    o=mesh('Exact '+brand+' screenshot plane',[(-w/2,-.036,-h/2),(w/2,-.036,-h/2),(w/2,-.036,h/2),(-w/2,-.036,h/2)],[(0,1,2,3)],m);uv=o.data.uv_layers.new()
    for i,v in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=v
    o.parent=root
    for panelmat in [m,edgemat]:
        alpha=panelmat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'];alpha.default_value=0;alpha.keyframe_insert('default_value',frame=25 if variant=='desktop' else 19);alpha.default_value=1;alpha.keyframe_insert('default_value',frame=37 if variant=='desktop' else 29)
    panelgroups[variant].append(root)
    return root,[backing,o]
view_quat=desktop.rotation_euler.to_quaternion();view_right=view_quat@Vector((1,0,0));view_up=view_quat@Vector((0,1,0));view_forward=view_quat@Vector((0,0,-1))
row_depth=24;row_scale=row_depth/29;row_base=desktop.location+view_forward*row_depth-view_up*(row_depth*36/63/1.5*.30)
row_rotation=Matrix((view_right,view_forward,view_up)).transposed().to_euler()
for idx,(brand,x) in enumerate([('fieldwork',-4.7),('northline',-.45),('hearthside',3.8)]):
    image=bpy.data.images.load(str(ROOT/f'src/assets/work/concepts/{brand}-showcase-desktop.webp'));ratio=image.size[1]/image.size[0]
    w=3.375*row_scale;h=w*ratio;root,children=screenshot_panel(brand,(x,.1,1.65),w,h)
    root.keyframe_insert('location',frame=25);root.location=row_base+view_right*((idx-1)*3.65*row_scale)+view_up*(h/2);root.keyframe_insert('location',frame=77);root.keyframe_insert('location',frame=101)
    root.rotation_euler=(0,0,0);root.keyframe_insert('rotation_euler',frame=25);root.rotation_euler=row_rotation;root.keyframe_insert('rotation_euler',frame=77);root.keyframe_insert('rotation_euler',frame=101)
    for o in children:
        o.hide_render=True;o.keyframe_insert('hide_render',frame=24);o.hide_render=False;o.keyframe_insert('hide_render',frame=25)
pq=portrait.rotation_euler.to_quaternion();pr=pq@Vector((1,0,0));pu=pq@Vector((0,1,0));pf=pq@Vector((0,0,-1));pd=24
portrait_target=Vector((-.8,1,3.8));portrait_final=portrait_target+(portrait.location-portrait_target)*.983
phone_plane_end=portrait_final+pf*pd+pu*(portrait.data.shift_y*(pd*36/74)+(.5-.785)*(pd*36/74*1216/828))
root,children=screenshot_panel('fieldwork',phone_plane_end+pf*1.8,9.6*pd/29,9.6*pd/29*825/1240,'portrait')
root.keyframe_insert('location',frame=19);root.location=phone_plane_end;root.keyframe_insert('location',frame=59);root.keyframe_insert('location',frame=72)
root.rotation_euler=Matrix((pr,pf,pu)).transposed().to_euler()
for o in children:o.hide_render=True;o.keyframe_insert('hide_render',frame=18);o.hide_render=False;o.keyframe_insert('hide_render',frame=19)

def set_view(view):
    scene.camera=desktop if view=='desktop' else portrait
    scene.render.resolution_x,scene.render.resolution_y=(1440,960) if view=='desktop' else(828,1216)
    for kind,groups in panelgroups.items():
        for group in groups:
            for child in group.children:
                if kind!=view:child.hide_render=True;child.animation_data_clear()

# Panels have separate collections so renderer can toggle cameras without edits.
for kind,groups in panelgroups.items():
    col=bpy.data.collections.new('PANELS '+kind.upper());scene.collection.children.link(col)
    for group in groups:
        for o in [group]+list(group.children):
            for old in list(o.users_collection):old.objects.unlink(o)
            col.objects.link(o)
scene['project']='Wonder & Method / Living City';scene['source_screenshots']='Original src/assets/work/concepts files, no recreated screenshot type'
scene['motion_notes']='Desktop 101 frames at 24fps. Portrait 72 at 24fps. Camera settles at frame25. No ambient motion. Keep alternate panel collection excluded.'
scene.camera=desktop;scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.frame_set(1)
bpy.data.collections['PANELS PORTRAIT'].hide_render=True
# Pack fonts and screenshots into the editable source.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'living-city.blend'))
print('BUILD_SECONDS',round(time.time()-start,2),'OBJECTS',len(scene.objects),flush=True)
if args.mode in ['lookdev','cycles']:
    for view,camera_obj,sz in [('desktop',desktop,(1440,960)),('portrait',portrait,(828,1216))]:
        scene.camera=camera_obj;scene.render.resolution_x,scene.render.resolution_y=sz
        bpy.data.collections['PANELS DESKTOP'].hide_render=view!='desktop';bpy.data.collections['PANELS PORTRAIT'].hide_render=view!='portrait'
        scene.frame_set(1);scene.render.filepath=str(OUT/f'lookdev/{view}-start.png');t=time.time();bpy.ops.render.render(write_still=True);print('RENDER_SECONDS',view,round(time.time()-t,2),flush=True)
elif args.mode=='build':pass
