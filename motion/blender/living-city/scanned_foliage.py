"""CC0 botanical libraries, appended as data only and instanced economically.

Executed inside build_scene.py. Never opens an external scene or enables scripts.
"""
MODELS=OUT/'models'
botanical_col=bpy.data.collections.new('BOTANICAL • CC0 textured specimens')
scene.collection.children.link(botanical_col)
plant_templates=None
def append_botanical(asset,names):
    library=MODELS/asset/(asset+'_2k.blend')
    with bpy.data.libraries.load(str(library),link=False) as (source,target):
        target.objects=[n for n in source.objects if n in names]
    for ob in target.objects:
        # Imported data may carry drivers; the static geometry has no need for any.
        ob.animation_data_clear()
        for mat in ob.data.materials:
            if mat and mat.node_tree:
                mat.animation_data_clear();mat.node_tree.animation_data_clear()
                for n in mat.node_tree.nodes:
                    if n.type=='TEX_IMAGE' and n.image:
                        n.image.filepath=str(MODELS/asset/'textures'/Path(n.image.filepath).name)
                        n.image.reload();n.image.pack()
    return target.objects

def scanned_pot(x,y,z,height=1.45,angle=0):
    global plant_templates
    if plant_templates is None:
        plant_templates=append_botanical('potted_plant_01',['potted_plant_01_stem','potted_plant_01_pot','potted_plant_01_pebbles','potted_plant_01_leaves'])
        for ob in plant_templates:
            for mod in list(ob.modifiers):
                # The authored curved leaf mesh is already sufficiently detailed.
                # Keep all instances static with no imported node/driver execution.
                ob.modifiers.remove(mod)
    root=bpy.data.objects.new('Textured doorway plant • shared specimen',None);botanical_col.objects.link(root);root.location=(x,y,z);root.rotation_euler.z=angle;root.scale=(height/1.35078,)*3
    for template in plant_templates:
        ob=template.copy();ob.data=template.data;botanical_col.objects.link(ob);ob.parent=root
    return root

def scanned_tree(x,y,z,scale=1.45,angle=-.4):
    ob=append_botanical('island_tree_01',['island_tree_01_LOD1'])[0]
    ob.name='Textured broad rear canopy • island_tree_01 LOD1'
    botanical_col.objects.link(ob);ob.location=(x,y,z);ob.scale=(scale,)*3;ob.rotation_euler.z=angle
    ob['source']='https://polyhaven.com/a/island_tree_01';ob['license']='CC0-1.0';ob['lod']='LOD1'
    return ob
