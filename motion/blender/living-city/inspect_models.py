"""Read-only append inspection; external Blend scripts never execute."""
import bpy,json
from pathlib import Path
root=Path(__file__).resolve().parents[3]/'output/living-city/models'
for asset in ['potted_plant_01','island_tree_01']:
    path=root/asset/(asset+'_2k.blend')
    with bpy.data.libraries.load(str(path),link=False) as (source,target):
        target.objects=[x for x in source.objects if asset=='potted_plant_01' or x=='island_tree_01_LOD1']
    records=[]
    for ob in target.objects:
        bpy.context.scene.collection.objects.link(ob)
        bpy.context.view_layer.update()
        records.append({'name':ob.name,'type':ob.type,'location':list(ob.location),'scale':list(ob.scale),'dimensions':list(ob.dimensions),'vertices':len(ob.data.vertices) if ob.type=='MESH' else None,'faces':len(ob.data.polygons) if ob.type=='MESH' else None,'modifiers':[(m.name,m.type) for m in ob.modifiers],'parent':ob.parent.name if ob.parent else None})
    print('MODEL_INFO',json.dumps({'asset':asset,'objects':records}),flush=True)
print('IMAGES',json.dumps([{'name':im.name,'path':im.filepath,'packed':bool(im.packed_file)} for im in bpy.data.images if im.source=='FILE']),flush=True)
