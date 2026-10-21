"""CC0 photographic surface finish; executed inside build_scene.py's namespace.

The Poly Haven originals are untouched. Per-face UVs sample the interior of a
real stone/brick/board so photographed mortar never doubles the modeled joints.
"""
TEXTURES=OUT/'textures'
def photographed_finish(mats,asset,tint=(1,1,1),normal_strength=.42,bump_distance=.008,roughness=.7):
    for index,m in enumerate(mats):
        n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
        for socket in ['Base Color','Normal','Roughness']:
            for link in list(p.inputs[socket].links):l.remove(link)
        maps={}
        for key,suffix,ext in [('color','diff','jpg'),('normal','nor_gl','png'),('rough','rough','jpg'),('height','disp','png')]:
            im=bpy.data.images.load(str(TEXTURES/asset/f'{asset}_{suffix}_2k.{ext}'),check_existing=True)
            if key!='color':im.colorspace_settings.name='Non-Color'
            im.pack();node=n.new('ShaderNodeTexImage');node.image=im;node.label='CC0 Poly Haven • '+key;maps[key]=node
        mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*[c*(.93+index*.018) for c in tint],1);l.new(maps['color'].outputs['Color'],mix.inputs[1]);l.new(mix.outputs[0],p.inputs['Base Color'])
        rm=n.new('ShaderNodeMapRange');rm.inputs['From Min'].default_value=0;rm.inputs['From Max'].default_value=1;rm.inputs['To Min'].default_value=roughness-.17+index*.012;rm.inputs['To Max'].default_value=roughness+.12+index*.012;l.new(maps['rough'].outputs[0],rm.inputs[0]);l.new(rm.outputs[0],p.inputs['Roughness'])
        nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=normal_strength;l.new(maps['normal'].outputs[0],nm.inputs['Color'])
        bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=bump_distance;l.new(maps['height'].outputs[0],bump.inputs['Height']);l.new(nm.outputs[0],bump.inputs['Normal']);l.new(bump.outputs[0],p.inputs['Normal'])

if TEXTURES.exists():
    photographed_finish([wood],'wood_planks',(1.18,.98,.77),.38,.007,.61)
    photographed_finish(redbricks,'red_brick',(.86,.8,.75),.58,.006,.79)
    photographed_finish(whitebricks,'sandstone_blocks_08',(1.08,1.12,1.14),.42,.008,.8)
    photographed_finish(pavemats,'sandstone_blocks_08',(.48,.53,.57),.5,.011,.39)
    photographed_finish([stone,stone_light],'sandstone_blocks_08',(1.0,1.02,1.03),.42,.008,.77)
    pbr_materials=set([wood,stone,stone_light]+redbricks+whitebricks+pavemats)
    for ob in list(scene.objects):
        if ob.type!='MESH' or not any(m in pbr_materials for m in ob.data.materials):continue
        me=ob.data;uv=me.uv_layers.new(name='Photographed physical surface')
        iswood=any(m==wood for m in me.materials);isbrick=any(m in redbricks for m in me.materials);iswhite=any(m in whitebricks for m in me.materials)
        rng=random.Random(ob.name);offset=rng.random()
        size=Vector((max(abs(v.co.x) for v in me.vertices)*2 or .01,max(abs(v.co.y) for v in me.vertices)*2 or .01,max(abs(v.co.z) for v in me.vertices)*2 or .01))
        if iswood:
            longaxis=max(range(3),key=lambda i:size[i])
            for poly in me.polygons:
                normalaxis=max(range(3),key=lambda i:abs(poly.normal[i]));other=[i for i in range(3) if i!=normalaxis];uaxis=longaxis if longaxis!=normalaxis else other[0];vaxis=next(i for i in other if i!=uaxis)
                for li in poly.loop_indices:
                    co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(co[uaxis]/1.5+offset,.04+co[vaxis]/max(size[vaxis],.01)*.065)
        else:
            for poly in me.polygons:
                # Red clay is sampled from intact brick interiors in the top row.
                if isbrick:
                    brick=poly.index//6;u0=.047+(brick%5)*.166;v0=.960;uw=.137;vh=.029
                elif iswhite:u0=.035+(poly.index//6%3)*.052;v0=.84;uw=.10;vh=.11
                else:u0=.03+offset*.1;v0=.83;uw=.12;vh=.14
                normalaxis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=normalaxis]
                vals=[[me.vertices[me.loops[li].vertex_index].co[a] for li in poly.loop_indices] for a in axes]
                mins=[min(v) for v in vals];spans=[max(v)-min(v) or 1 for v in vals]
                for j,li in enumerate(poly.loop_indices):uv.data[li].uv=(u0+(vals[0][j]-mins[0])/spans[0]*uw,v0+(vals[1][j]-mins[1])/spans[1]*vh)
    # The source environment contributes physically varied glass/water reflections.
    env=world.node_tree.nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(TEXTURES/'aarfontein_dusk/aarfontein_dusk_2k.hdr'));env.image.pack()
    envcoord=world.node_tree.nodes.new('ShaderNodeTexCoord');envmap=world.node_tree.nodes.new('ShaderNodeMapping');envmap.inputs['Rotation'].default_value=(0,0,math.radians(113));world.node_tree.links.new(envcoord.outputs['Generated'],envmap.inputs['Vector']);world.node_tree.links.new(envmap.outputs[0],env.inputs[0])
    envbg=world.node_tree.nodes.new('ShaderNodeBackground');envbg.inputs['Strength'].default_value=.10;world.node_tree.links.new(env.outputs[0],envbg.inputs[0])
    # A second CC0 photographed pure-sky environment supplies quiet cloud banks.
    # Sky coordinates are static world coordinates, never a camera-facing image.
    skymap=world.node_tree.nodes.new('ShaderNodeMapping');skymap.inputs['Rotation'].default_value=(0,0,math.radians(-95));world.node_tree.links.new(envcoord.outputs['Generated'],skymap.inputs[0])
    skywarp=world.node_tree.nodes.new('ShaderNodeVectorMath');skywarp.operation='MULTIPLY';skywarp.inputs[1].default_value=(1,1,.7);world.node_tree.links.new(skymap.outputs[0],skywarp.inputs[0])
    skycoords=world.node_tree.nodes.new('ShaderNodeVectorMath');skycoords.operation='ADD';skycoords.inputs[1].default_value=(0,0,.10);world.node_tree.links.new(skywarp.outputs[0],skycoords.inputs[0])
    skyenv=world.node_tree.nodes.new('ShaderNodeTexEnvironment');skyenv.image=bpy.data.images.load(str(TEXTURES/'belfast_sunset_puresky/belfast_sunset_puresky_2k.hdr'));skyenv.image.pack();world.node_tree.links.new(skycoords.outputs[0],skyenv.inputs[0])
    grade=world.node_tree.nodes.new('ShaderNodeMixRGB');grade.blend_type='MULTIPLY';grade.inputs[0].default_value=1;grade.inputs[2].default_value=(.052,.155,.225,1);world.node_tree.links.new(skyenv.outputs[0],grade.inputs[1]);world.node_tree.links.new(grade.outputs[0],bg.inputs[0]);bg.inputs['Strength'].default_value=.34
    lp=world.node_tree.nodes.new('ShaderNodeLightPath');shader=world.node_tree.nodes.new('ShaderNodeMixShader');world.node_tree.links.new(lp.outputs['Is Camera Ray'],shader.inputs[0]);world.node_tree.links.new(envbg.outputs[0],shader.inputs[1]);world.node_tree.links.new(bg.outputs[0],shader.inputs[2]);world.node_tree.links.new(shader.outputs[0],out.inputs[0])
    scene['material_sources']='Poly Haven CC0: wood_planks, sandstone_blocks_08, red_brick, aarfontein_dusk, belfast_sunset_puresky. See material-sources.json for originals/hashes/license.'

for m in leafmats+treeleafmats:
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.62;p.inputs['Subsurface Weight'].default_value=.045;p.inputs['Subsurface Radius'].default_value=(.05,.12,.025)
for ob in list(scene.objects):
    if ob.type=='MESH' and len(ob.data.polygons)==1 and any(m==glass for m in ob.data.materials):
        mod=ob.modifiers.new('Actual six millimeter glass sheet','SOLIDIFY');mod.thickness=.006
