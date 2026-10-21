"""Read-only baseline inspection for the Living City refinement gate."""
import bpy, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'output/living-city-refinement'
OUT.mkdir(parents=True, exist_ok=True)
s = bpy.context.scene

def simple_props(value):
    result = {}
    for prop in value.bl_rna.properties:
        if prop.identifier == 'rna_type' or prop.type in {'POINTER','COLLECTION'}:
            continue
        try:
            v = getattr(value, prop.identifier)
            if prop.is_array:
                v = list(v)
            if isinstance(v, (str,int,float,bool,list)):
                result[prop.identifier] = v
        except Exception:
            pass
    return result

cameras = {}
for ob in bpy.data.objects:
    if ob.type != 'CAMERA':
        continue
    poses = {}
    for frame in [1,25,101]:
        s.frame_set(frame)
        poses[str(frame)] = {'location':list(ob.location),'rotation':list(ob.rotation_euler)}
    cameras[ob.name] = {'poses':poses,'lens':ob.data.lens,'shift_y':ob.data.shift_y}
s.frame_set(1)
lights = [{'name':ob.name,'type':ob.data.type,'energy':ob.data.energy,'color':list(ob.data.color),'location':list(ob.location),'size':getattr(ob.data,'size',None),'visible_glossy':ob.visible_glossy,'visible_transmission':ob.visible_transmission} for ob in bpy.data.objects if ob.type=='LIGHT']
materials = {}
for m in bpy.data.materials:
    if not m.node_tree or not any(word in m.name.lower() for word in ['water','glass','flame','ember']):
        continue
    materials[m.name] = {'props':simple_props(m),'nodes':[{'name':n.name,'type':n.bl_idname,'inputs':{i.name:list(i.default_value) if hasattr(i.default_value,'__len__') and not isinstance(i.default_value,str) else i.default_value for i in n.inputs if hasattr(i,'default_value') and isinstance(i.default_value,(float,int,str,bool)) or (hasattr(i,'default_value') and n.bl_idname in ['ShaderNodeBsdfPrincipled','ShaderNodeTexNoise'] and hasattr(i.default_value,'__len__'))}} for n in m.node_tree.nodes]}
plants = [{'name':ob.name,'type':ob.type,'location':list(ob.location),'parent':ob.parent.name if ob.parent else None,'vertices':len(ob.data.vertices) if ob.type=='MESH' else None,'materials':[m.name if m else None for m in ob.data.materials] if ob.type=='MESH' else []} for ob in bpy.data.objects if any(word in ob.name.lower() for word in ['foliage','potted_plant','canopy','botanical'])]
report={'blender_version':bpy.app.version_string,'baseline':bpy.data.filepath,'objects':len(bpy.data.objects),'engine':s.render.engine,'cycles':simple_props(s.cycles),'eevee':simple_props(s.eevee),'raytrace':simple_props(s.eevee.ray_tracing_options),'view_settings':simple_props(s.view_settings),'cameras':cameras,'lights':lights,'materials':materials,'plants':plants,'collections':[{'name':c.name,'hide_render':c.hide_render,'objects':len(c.objects)} for c in bpy.data.collections]}
(OUT/'baseline-inspection.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('INSPECTED',json.dumps({'blender':report['blender_version'],'objects':report['objects'],'lights':len(lights),'plants':len(plants),'path':str(OUT/'baseline-inspection.json')}),flush=True)
