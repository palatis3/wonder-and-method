"""Save a portable scene plus exact relative image dependencies under 100 MB each.

The approved full packed render master is never rewritten. No image pixels or
visible scene data are changed. A structural snapshot is compared after reopen.
"""
from __future__ import annotations
import array, hashlib, json, re
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/living-city-refinement'
SOURCE=OUT/'living-city-refined-loop4.blend'
DEST=Path(__file__).parent
MASTER_SHA='7963732b4c6adcdd8788e5b9a6852213f3a66bd35fb03d27b11481a72084a945'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def simple(value):
    if value is None or isinstance(value,(str,int,float,bool)):
        return value
    if isinstance(value,bpy.types.ID):
        return value.name_full
    if hasattr(value,'__iter__'):
        try:return [simple(v) for v in value]
        except TypeError:return None
    return None

def properties(owner,exclude=()):
    result={}
    for p in owner.bl_rna.properties:
        if p.identifier in {'rna_type','session_uid',*exclude} or p.type=='COLLECTION':continue
        if p.type=='POINTER' and not isinstance(getattr(owner,p.identifier,None),bpy.types.ID):continue
        try:result[p.identifier]=simple(getattr(owner,p.identifier))
        except (AttributeError,TypeError):pass
    return result

def packed_array(collection,field,count,kind='f'):
    data=array.array(kind,[0])*count
    collection.foreach_get(field,data)
    return sha(data.tobytes())

def animation(owner):
    data=owner.animation_data
    if not data:return None
    return {'action':data.action.name if data.action else None,'drivers':[
        {'path':d.data_path,'index':d.array_index,'expression':d.driver.expression,
         'variables':[{'name':v.name,'type':v.type,'targets':[{
             'id':t.id.name if t.id else None,'path':t.data_path,'bone':t.bone_target,
             'transformType':t.transform_type,'transformSpace':t.transform_space} for t in v.targets]} for v in d.driver.variables]}
        for d in data.drivers]}

def node_tree(tree):
    if not tree:return None
    return {'nodes':[{'properties':properties(node,{'id_data','internal_links','dimensions','select','width','height','location','location_absolute','parent'}),
                     'inputs':[(socket.identifier,simple(getattr(socket,'default_value',None))) for socket in node.inputs]}
                    for node in sorted(tree.nodes,key=lambda n:n.name)],
            'links':sorted((link.from_node.name,link.from_socket.identifier,link.to_node.name,link.to_socket.identifier) for link in tree.links),
            'animation':animation(tree)}

def structural_snapshot():
    s=bpy.context.scene
    result={'objects':{},'meshes':{},'materials':{},'cameras':{},'lights':{},'images':{},'worlds':{},'curves':{},
        'scene':{'camera':s.camera.name,'frameStart':s.frame_start,'frameEnd':s.frame_end,
                 'render':properties(s.render,{'filepath','use_lock_interface'}),
                 'cycles':properties(s.cycles),'view':properties(s.view_settings)},
        'collections':{c.name:{'hideRender':c.hide_render,'objects':sorted(o.name for o in c.objects)} for c in bpy.data.collections},
        'actionNames':sorted(a.name for a in bpy.data.actions)}
    for o in bpy.data.objects:
        result['objects'][o.name]={'type':o.type,'parent':o.parent.name if o.parent else None,
            'matrix':simple(o.matrix_world),'data':o.data.name if o.data else None,'hideRender':o.hide_render,
            'materials':[slot.material.name if slot.material else None for slot in o.material_slots],
            'modifiers':[properties(m) for m in o.modifiers],'animation':animation(o)}
    for m in bpy.data.meshes:
        record={'vertices':packed_array(m.vertices,'co',len(m.vertices)*3),
                'loopVertexIndices':packed_array(m.loops,'vertex_index',len(m.loops),'i'),
                'polygonMaterialIndices':packed_array(m.polygons,'material_index',len(m.polygons),'i'),
                'polygonSmooth':packed_array(m.polygons,'use_smooth',len(m.polygons),'i'),
                'uv':{uv.name:packed_array(uv.data,'uv',len(uv.data)*2) for uv in m.uv_layers},
                'materials':[mat.name if mat else None for mat in m.materials]}
        if m.shape_keys:
            record['shapeKeys']={k.name:{'value':k.value,'coordinates':packed_array(k.data,'co',len(k.data)*3)} for k in m.shape_keys.key_blocks}
            record['shapeAnimation']=animation(m.shape_keys)
        result['meshes'][m.name]=record
    for m in bpy.data.materials:
        result['materials'][m.name]={'properties':properties(m,{'preview','original','library','override_library','asset_data'}),'nodes':node_tree(m.node_tree)}
    for collection,key in [(bpy.data.cameras,'cameras'),(bpy.data.lights,'lights')]:
        for datablock in collection:
            result[key][datablock.name]={'properties':properties(datablock,{'preview','original','library','override_library','asset_data'}),'animation':animation(datablock)}
    for curve in bpy.data.curves:
        result['curves'][curve.name]=properties(curve,{'preview','original','library','override_library','asset_data'})
    for world in bpy.data.worlds:
        result['worlds'][world.name]={'color':simple(world.color),'nodes':node_tree(world.node_tree)}
    for im in bpy.data.images:
        if im.source!='FILE':continue
        contents=im.packed_file.data if im.packed_file else Path(bpy.path.abspath(im.filepath)).read_bytes()
        result['images'][im.name]={'sha256':sha(contents),'size':simple(im.size),'colorspace':im.colorspace_settings.name,
            'alphaMode':im.alpha_mode,'source':im.source,'useViewAsRender':im.use_view_as_render}
    return result

if sha(SOURCE.read_bytes())!=MASTER_SHA:raise RuntimeError('Approved master identity changed.')
bpy.ops.wm.open_mainfile(filepath=str(SOURCE),load_ui=False,use_scripts=False)
before=structural_snapshot()
bpy.ops.file.pack_all()
texture_folder=DEST/'textures'
texture_folder.mkdir(exist_ok=True)
dependencies=[]
for im in bpy.data.images:
    if im.source!='FILE':continue
    if not im.packed_file:raise RuntimeError('Master contains an unpacked file image: '+im.name)
    data=im.packed_file.data
    digest=sha(data)
    original_name=Path(im.filepath.replace('\\','/')).name
    safe_name=re.sub(r'[^A-Za-z0-9._-]+','-',original_name)
    filename=digest[:12]+'-'+safe_name
    path=texture_folder/filename
    if len(data)>=100000000:raise RuntimeError('An image exceeds the individual tracked-file limit.')
    path.write_bytes(data)
    if sha(path.read_bytes())!=digest:raise RuntimeError('An extracted image changed bytes.')
    im.unpack(method='REMOVE')
    im.filepath='//textures/'+filename
    dependencies.append({'image':im.name,'relativePath':im.filepath,'bytes':len(data),'sha256':digest})
fonts=[{'name':f.name,'packed':bool(f.packed_file),'sha256':sha(f.packed_file.data) if f.packed_file else None} for f in bpy.data.fonts if f.filepath!='<builtin>']
if bpy.data.libraries or any(not f['packed'] for f in fonts):raise RuntimeError('Unpacked font or linked library remains.')
target=DEST/'living-city-refined-loop4.blend'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(target),compress=True,relative_remap=False)
if target.stat().st_size>=100000000:raise RuntimeError('Compact editable scene exceeds 100 MB.')
bpy.ops.wm.open_mainfile(filepath=str(target),load_ui=False,use_scripts=False)
after=structural_snapshot()
changes=[key for key in before if before[key]!=after[key]]
if changes:
    (OUT/'compact-source-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8')
    (OUT/'compact-source-after.json').write_text(json.dumps(after,indent=2),encoding='utf-8')
    raise RuntimeError('Scene data changed after portable save: '+str(changes))
if sha(SOURCE.read_bytes())!=MASTER_SHA:raise RuntimeError('Approved packed master was modified.')
structural_hash=sha(json.dumps(before,sort_keys=True,separators=(',',':')).encode())
report={'packedRenderMaster':str(SOURCE),'packedRenderMasterSha256':MASTER_SHA,'packedRenderMasterUnchanged':True,
    'portableBlend':str(target),'portableBlendSha256':sha(target.read_bytes()),'portableBlendBytes':target.stat().st_size,
    'imageCount':len(dependencies),'dependencies':dependencies,'fonts':fonts,'linkedLibraries':0,
    'structuralSnapshotSha256':structural_hash,'structuralSnapshotBeforeEqualsAfter':True,
    'verifiedCategories':list(before),'imageBytesPreservedExactly':True,'allPathsRelative':True,
    'allIndividualFilesUnder100MB':True,'visualGeometryOrMaterialsChanged':False,
    'totalBundleBytes':target.stat().st_size+sum(p.stat().st_size for p in texture_folder.iterdir() if p.is_file())}
(OUT/'source-bundle-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(DEST/'source-bundle.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in {'dependencies','fonts'}},indent=2))
