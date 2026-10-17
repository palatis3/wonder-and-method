from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[3];REV=ROOT/'output/civic-sculpture/finale-v2'
bpy.ops.wm.open_mainfile(filepath=str(REV/'buffalo-civic-finale.blend'))
sc=bpy.data.scenes['Civic ambient loop 4 seconds'];bpy.context.window.scene=sc;sc.frame_set(25)
cam=sc.camera;cam.animation_data_clear()
for c in list(cam.constraints):cam.constraints.remove(c)
cam.location=(8.3,-6.4,2.0);target=Vector((6.35,-3.1,.15));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=55
sc.render.resolution_x=1000;sc.render.resolution_y=600;sc.cycles.samples=16;sc.render.filepath=str(REV/'traffic-drafts/traffic-detail.png');bpy.ops.render.render(write_still=True)
