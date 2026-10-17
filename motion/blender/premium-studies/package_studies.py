"""Resize final Blender PNGs for web delivery and record asset provenance.
Run with Python + Pillow after build_studies.py --final completes.
"""
from pathlib import Path
from PIL import Image
import hashlib,json,struct
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/premium-studies'; PUB=ROOT/'public/premium-studies'
EV=ROOT/'evidence/premium-audit-20261015'; EV.mkdir(parents=True,exist_ok=True)
records=[]
for name in ['river-and-elevator','civic-aperture']:
    img=Image.open(OUT/(name+'.png')).convert('RGB')
    img.resize((1400,round(img.height*1400/img.width)),Image.Resampling.LANCZOS).save(PUB/(name+'.webp'),quality=91,method=6)
    raw=(OUT/(name+'.glb')).read_bytes(); size,kind=struct.unpack_from('<II',raw,12)
    gltf=json.loads(raw[20:20+size])
    stat=json.loads((OUT/(name+'-stats.json')).read_text())
    stat.update({'gltf_meshes':len(gltf['meshes']),'gltf_materials':len(gltf.get('materials',[])),'gltf_external_images':len(gltf.get('images',[])),'conceptual_model_dimensions': [8.2,5.5,3.2775] if name=='river-and-elevator' else [6.7,6.7,5.442], 'units':'conceptual Blender units; not a surveyed scale model','files':[]})
    for path in [OUT/(name+'.png'),PUB/(name+'.webp'),OUT/(name+'.blend'),OUT/(name+'.glb')]:
        stat['files'].append({'path':path.relative_to(ROOT).as_posix(),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    records.append(stat)
provenance={'created':'2026-10-15','author':'Astra delegated Blender study author','software':'Blender 5.2.2 LTS','renderer':'Cycles 128 samples with denoising, AgX Medium High Contrast','method':'Original procedural mesh/curve architecture, all curves converted to editable mesh, custom primitive assemblies, bevel modifiers and procedural material microstructure. No generated or photographic image plane architecture.','palette':['sage cast mineral','warm ivory limestone','ink navy steel and water','brushed brass'],'external_assets':[],'geographic_fidelity':'Buffalo-inspired industrial and civic abstractions; not measured replicas or an accurate skyline.','hero_scope':'No BUFFALO word model or hero animation is changed.','sources':['motion/blender/premium-studies/build_studies.py','motion/blender/premium-studies/package_studies.py'],'scenes':records,'limitations':['GLB preserves mesh geometry and PBR base materials; Blender procedural grain and Cycles lighting are not identical in glTF viewers.','Still images are the website-ready delivery; editable scenes are provided for future art direction.','No animation or additional autoplay was introduced.']}
(EV/'blender-provenance.json').write_text(json.dumps(provenance,indent=2))
print(json.dumps([{'name':r['name'],'files':r['files']} for r in records],indent=2))
