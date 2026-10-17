"""Build and render the Wonder & Method showcase ampersand.

The asset is an original continuous ribbon mesh: ivory mineral faces with aged
bronze edges.  It is designed to read clearly from the front while revealing
its metal-lined depth as it turns.

Run from the repository root with Blender 5.2:

  blender --background --python motion/blender/showcase_ampersand.py -- --poster
  blender --background --python motion/blender/showcase_ampersand.py -- --sequence

Outputs are written to output/experience/ampersand/.
"""

import math
import sys
import time
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "experience" / "ampersand"
FRAMES = OUT / "frames"
OUT.mkdir(parents=True, exist_ok=True)
FRAMES.mkdir(parents=True, exist_ok=True)

MODE = "sequence" if "--sequence" in sys.argv else "poster"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material_ivory():
    material = bpy.data.materials.new("Ivory mineral ribbon")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.77, 0.72, 0.63, 1)
    principled.inputs["Roughness"].default_value = 0.68

    noise = nodes.new("ShaderNodeTexNoise")
    noise.name = "Fine mineral variation"
    noise.inputs["Scale"].default_value = 48
    noise.inputs["Detail"].default_value = 5
    noise.inputs["Roughness"].default_value = 0.72

    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.name = "Warm ivory range"
    ramp.color_ramp.elements[0].position = 0.24
    ramp.color_ramp.elements[0].color = (0.48, 0.43, 0.35, 1)
    ramp.color_ramp.elements[1].position = 0.78
    ramp.color_ramp.elements[1].color = (0.94, 0.90, 0.82, 1)

    bump = nodes.new("ShaderNodeBump")
    bump.name = "Subtle mineral pores"
    bump.inputs["Strength"].default_value = 0.11
    bump.inputs["Distance"].default_value = 0.035

    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], principled.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], principled.inputs["Normal"])
    return material


def material_bronze():
    material = bpy.data.materials.new("Aged bronze inner faces")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = (0.23, 0.085, 0.025, 1)
    principled.inputs["Metallic"].default_value = 0.88
    principled.inputs["Roughness"].default_value = 0.26

    noise = nodes.new("ShaderNodeTexNoise")
    noise.name = "Bronze age variation"
    noise.inputs["Scale"].default_value = 10
    noise.inputs["Detail"].default_value = 4
    noise.inputs["Roughness"].default_value = 0.78

    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.name = "Aged bronze range"
    ramp.color_ramp.elements[0].position = 0.18
    ramp.color_ramp.elements[0].color = (0.055, 0.014, 0.006, 1)
    ramp.color_ramp.elements[1].position = 0.83
    ramp.color_ramp.elements[1].color = (0.50, 0.20, 0.045, 1)

    bump = nodes.new("ShaderNodeBump")
    bump.name = "Bronze brushing"
    bump.inputs["Strength"].default_value = 0.08
    bump.inputs["Distance"].default_value = 0.018

    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], principled.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], principled.inputs["Normal"])
    return material


def catmull_rom(points, samples_per_span=14):
    """Sample an open Catmull-Rom path through the supplied control points."""
    sampled = []
    for i in range(len(points) - 1):
        a = points[max(i - 1, 0)]
        b = points[i]
        c = points[i + 1]
        d = points[min(i + 2, len(points) - 1)]
        for step in range(samples_per_span):
            t = step / samples_per_span
            value = 0.5 * (
                (2 * b)
                + (-a + c) * t
                + (2 * a - 5 * b + 4 * c - d) * t * t
                + (-a + 3 * b - 3 * c + d) * t * t * t
            )
            sampled.append(value)
    sampled.append(points[-1].copy())
    return sampled


def build_ribbon(ivory, bronze):
    # The path begins inside the upper loop, circles it, crosses down to the
    # lower-right, then sweeps around the lower bowl and exits in a short,
    # lifted terminal.  Small Y offsets make the diagonal pass legibly above
    # the returning bowl at the crossing.
    controls = [Vector(p) for p in [
        (0.32, 0.08, 3.05),
        (1.05, 0.04, 3.48),
        (1.30, 0.02, 4.22),
        (0.96, 0.00, 4.88),
        (0.15, 0.00, 5.18),
        (-0.72, 0.00, 4.99),
        (-1.18, 0.00, 4.33),
        (-1.02, -0.02, 3.60),
        (-0.40, -0.12, 2.96),
        (0.34, -0.22, 2.28),
        (1.05, -0.26, 1.58),
        (1.57, -0.22, 0.86),
        (1.54, -0.10, 0.21),
        (0.93, 0.05, -0.28),
        (0.05, 0.12, -0.47),
        (-0.84, 0.13, -0.22),
        (-1.38, 0.10, 0.38),
        (-1.43, 0.08, 1.10),
        (-1.05, 0.06, 1.73),
        (-0.39, 0.05, 2.12),
        (0.31, 0.04, 2.03),
        (0.88, 0.03, 1.58),
        (1.33, 0.02, 1.15),
        (1.78, 0.01, 0.96),
        (2.18, 0.00, 1.04),
        (2.38, 0.00, 1.38),
    ]]
    points = catmull_rom(controls)
    width = 0.60
    depth = 0.24
    vertices = []

    for i, point in enumerate(points):
        previous = points[max(i - 1, 0)]
        following = points[min(i + 1, len(points) - 1)]
        tangent = (following - previous).normalized()
        side = Vector((-tangent.z, 0.0, tangent.x)).normalized()
        front = Vector((0.0, -depth / 2, 0.0))
        back = Vector((0.0, depth / 2, 0.0))
        vertices.extend([
            tuple(point - side * width / 2 + front),
            tuple(point + side * width / 2 + front),
            tuple(point + side * width / 2 + back),
            tuple(point - side * width / 2 + back),
        ])

    faces = []
    materials = []
    for i in range(len(points) - 1):
        a = i * 4
        b = (i + 1) * 4
        # Broad front and back faces are ivory; the ribbon depth is bronze.
        faces.extend([
            (a, b, b + 1, a + 1),
            (a + 3, a + 2, b + 2, b + 3),
            (a + 1, b + 1, b + 2, a + 2),
            (a + 3, b + 3, b, a),
        ])
        materials.extend([0, 0, 1, 1])
    faces.extend([(0, 1, 2, 3), (len(vertices) - 4, len(vertices) - 1, len(vertices) - 2, len(vertices) - 3)])
    materials.extend([1, 1])

    mesh = bpy.data.meshes.new("Original showcase ampersand ribbon")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(ivory)
    mesh.materials.append(bronze)
    for polygon, material_index in zip(mesh.polygons, materials):
        polygon.material_index = material_index
        polygon.use_smooth = True
    mesh.update()

    ribbon = bpy.data.objects.new("Wonder & Method showcase ampersand", mesh)
    bpy.context.collection.objects.link(ribbon)
    bevel = ribbon.modifiers.new("Soft cast edges", "BEVEL")
    bevel.width = 0.045
    bevel.segments = 3
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(28)
    bevel.material = 1
    return ribbon


def add_lighting():
    world = bpy.data.worlds.new("Transparent warm studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.025, 0.04, 0.045, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.32
    bpy.context.scene.world = world

    def area(name, location, energy, size, color, target=(0.1, 0.0, 2.35)):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()

    area("Large warm key", (-4.5, -6.0, 8.0), 1150, 4.5, (1.0, 0.72, 0.47))
    area("Soft cool fill", (5.5, -4.0, 5.2), 760, 4.0, (0.62, 0.82, 1.0))
    area("Bronze rim", (3.5, 2.0, 6.4), 1350, 3.0, (1.0, 0.48, 0.18))
    area("Lower bounce", (-1.0, -3.0, -2.0), 420, 3.0, (1.0, 0.82, 0.62))


def add_camera():
    data = bpy.data.cameras.new("Showcase ampersand camera")
    camera = bpy.data.objects.new("Showcase ampersand camera", data)
    bpy.context.collection.objects.link(camera)
    camera.location = (6.0, -15.5, 5.7)
    target = Vector((0.18, 0.0, 2.35))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    data.type = "ORTHO"
    data.ortho_scale = 6.9
    bpy.context.scene.camera = camera


def configure_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.compression = 28
    scene.render.resolution_percentage = 100
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = 24


def export_asset(ribbon, pivot):
    scene = bpy.context.scene
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "showcase-ampersand.blend"))
    bpy.ops.object.select_all(action="DESELECT")
    pivot.select_set(True)
    ribbon.select_set(True)
    bpy.context.view_layer.objects.active = ribbon
    bpy.ops.export_scene.gltf(
        filepath=str(OUT / "showcase-ampersand.glb"),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_apply=True,
    )
    scene.frame_set(1)


def render_poster():
    scene = bpy.context.scene
    scene.render.resolution_x = 700
    scene.render.resolution_y = 800
    scene.render.filepath = str(OUT / "showcase-ampersand-poster.png")
    started = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    print("AMPERSAND_POSTER_SECONDS", round(time.perf_counter() - started, 2), flush=True)


def render_sequence(pivot):
    scene = bpy.context.scene
    scene.render.resolution_x = 480
    scene.render.resolution_y = 560
    scene.render.resolution_percentage = 100
    for frame in range(1, 25):
        t = (frame - 1) / 23
        eased = 0.5 - 0.5 * math.cos(math.pi * t)
        pivot.rotation_euler.z = math.radians(-25 + 50 * eased)
        bpy.context.view_layer.update()
        scene.frame_set(frame)
        scene.render.filepath = str(FRAMES / f"ampersand-{frame:04}.png")
        started = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        print(
            "AMPERSAND_SEQUENCE_FRAME",
            frame,
            "SECONDS",
            round(time.perf_counter() - started, 2),
            flush=True,
        )
    pivot.rotation_euler.z = 0.0
    scene.frame_set(1)
    bpy.context.view_layer.update()


def main():
    reset_scene()
    bpy.context.preferences.filepaths.save_version = 0
    ivory = material_ivory()
    bronze = material_bronze()
    ribbon = build_ribbon(ivory, bronze)
    pivot = bpy.data.objects.new("Ampersand turntable", None)
    bpy.context.collection.objects.link(pivot)
    ribbon.parent = pivot
    add_lighting()
    add_camera()
    configure_render()
    export_asset(ribbon, pivot)
    if MODE == "sequence":
        render_sequence(pivot)
    else:
        render_poster()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "showcase-ampersand.blend"))
    print("AMPERSAND_COMPLETE", MODE, str(OUT), flush=True)


if __name__ == "__main__":
    main()
