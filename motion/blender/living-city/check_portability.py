"""Validate the compact editable master without modifying it or render state."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];missing=[];images=[]
for im in bpy.data.images:
    if im.source!='FILE':continue
    path=Path(bpy.path.abspath(im.filepath))
    valid=path.is_file() and im.filepath.startswith('//')
    if not valid:missing.append(im.filepath)
    images.append({'name':im.name,'relativePath':im.filepath,'exists':path.is_file(),'dimensions':list(im.size)})
fonts=[{'name':font.name,'packed':bool(font.packed_file)} for font in bpy.data.fonts if font.filepath!='<builtin>']
if missing or any(not f['packed'] for f in fonts):raise RuntimeError('Unresolved portable resources: '+str(missing))
tree_objects=[o for o in bpy.context.scene.objects if 'shared LOD1' in o.name or 'island_tree_01 LOD1' in o.name]
drivers=[o.name for o in bpy.context.scene.objects if o.animation_data and len(o.animation_data.drivers)]
if drivers:raise RuntimeError('Unexpected scripted object drivers: '+str(drivers))
report={'master':str(Path(bpy.data.filepath)),'sourceBytes':Path(bpy.data.filepath).stat().st_size,'objects':len(bpy.context.scene.objects),'relativeImageCount':len(images),'packedFontCount':len(fonts),'missingResources':missing,'treeMeshShared':len(tree_objects)==2 and tree_objects[0].data==tree_objects[1].data,'scriptedObjectDrivers':drivers,'images':images,'fonts':fonts}
(ROOT/'output/living-city/portability-verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k not in ['images','fonts']},indent=2))
