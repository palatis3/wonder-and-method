"""Save a compact editable master with packed fonts and relative texture paths.

Load output/living-city/living-city.blend before running this script. The working
master retains its packed originals; this second copy is suitable for source control.
"""
import bpy,json,os
from pathlib import Path
SOURCE=Path(__file__).resolve().parent;ROOT=SOURCE.parents[2]
bpy.ops.file.pack_all()
external=[]
for im in bpy.data.images:
    if im.source!='FILE':continue
    path=Path(bpy.path.abspath(im.filepath)).resolve()
    if not path.is_file():raise FileNotFoundError(str(path))
    if im.packed_file:im.unpack(method='USE_ORIGINAL')
    im.filepath='//'+os.path.relpath(path,SOURCE).replace('\\','/')
    external.append({'image':im.name,'relativePath':im.filepath,'bytes':path.stat().st_size})
bpy.context.scene.frame_set(1)
bpy.context.scene['source_readme']='README.md in this directory; prepare_materials.py + prepare_models.py restore verified external textures.'
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'living-city.blend'),compress=True,relative_remap=False)
report={'source':str(SOURCE/'living-city.blend'),'sourceBytes':(SOURCE/'living-city.blend').stat().st_size,'externalImages':external,'packedFonts':sum(bool(f.packed_file) for f in bpy.data.fonts)}
(ROOT/'output/living-city/source-preservation.json').write_text(json.dumps(report,indent=2))
print('SOURCE_SAVED',report['sourceBytes'],'bytes;',len(external),'external image records;',report['packedFonts'],'packed fonts')
