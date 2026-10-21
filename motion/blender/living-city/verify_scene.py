"""Prove exact static holds and record source/render invariants before encoding."""
import bpy,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'output/living-city';s=bpy.context.scene
report={'blendSha256':hashlib.sha256(Path(bpy.data.filepath).read_bytes()).hexdigest(),'fps':s.render.fps,'objectCount':len(s.objects),'cameras':{},'packedImages':sum(bool(i.packed_file) for i in bpy.data.images)}
for view,count,hold in [('desktop',101,77),('portrait',72,59)]:
    cam=bpy.data.objects['CAMERA • '+view+' hero'];col=bpy.data.collections['PANELS '+view.upper()]
    objs=[cam]+list(col.objects);hashes={};representatives={};records=[]
    for frame in range(1,count+1):
        s.frame_set(frame);bpy.context.view_layer.update();state=[]
        for ob in objs:
            matstate=[]
            if ob.type=='MESH':
                for m in ob.data.materials:
                    if m and m.use_nodes:
                        p=m.node_tree.nodes.get('Principled BSDF')
                        if p:matstate.append((m.name,p.inputs['Alpha'].default_value))
            state.append((ob.name,[float(v) for row in ob.matrix_world for v in row],ob.hide_render,matstate))
        digest=hashlib.sha256(json.dumps(state,separators=(',',':')).encode()).hexdigest()
        representatives.setdefault(digest,frame);hashes[frame]=digest;records.append({'frame':frame,'renderFrame':representatives[digest]})
    identical=all(hashes[f]==hashes[hold] for f in range(hold,count+1))
    if not identical:raise RuntimeError(view+' hold contains changing evaluated transforms/materials')
    report['cameras'][view]={'frames':count,'durationSeconds':count/24,'settledFrame':hold,'holdExactlyIdentical':identical,'uniqueRenderFrames':len(representatives),'frameMap':records}
report['screenshots']=[{'name':im.name,'size':list(im.size),'packed':bool(im.packed_file)} for im in bpy.data.images if 'showcase' in im.name]
(OUT/'scene-verification.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:{kk:vv for kk,vv in v.items() if kk!='frameMap'} for k,v in report['cameras'].items()},indent=2))
