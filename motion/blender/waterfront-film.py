"""Render an original camera/water study from the editable waterfront scene."""
import bpy, math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'output/waterfront-3d/water-and-grain.blend'))
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=12
scene.cycles.use_denoising=True
scene.render.resolution_x=1000
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True
scene.render.fps=24
scene.frame_start=1
scene.frame_end=96
scene.camera.data.ortho_scale=14.4
frames=ROOT/'public/waterfront-frames'
frames.mkdir(parents=True,exist_ok=True)
water=bpy.data.objects['Water — real ripple geometry']
base_vertices=[v.co.copy() for v in water.data.vertices]
scene.camera.animation_data_clear()
for frame in range(1,97):
    phase=(frame-1)/96
    angle=math.radians(-124)+math.sin(phase*math.tau)*math.radians(7)
    scene.camera.location=(19.4*math.cos(angle),19.4*math.sin(angle),10+.2*math.sin(phase*math.tau))
    scene.camera.rotation_euler=(Vector((0,0,2.6))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    for vertex,base in zip(water.data.vertices,base_vertices):
        x,y=base.x,base.y
        vertex.co.z=.008+math.sin(x*3.2+y*6.1+math.sin(x*.7)-phase*math.tau)*.012+math.sin(x*7.3-y*10.7-phase*math.tau)*.004
    water.data.update()
    scene.frame_set(frame)
    scene.render.filepath=str(frames/f'{frame:04}.png')
    bpy.ops.render.render(write_still=True)
    print('WATERFRONT_FILM_FRAME',frame,flush=True)
print('WATERFRONT_FILM_COMPLETE',flush=True)
