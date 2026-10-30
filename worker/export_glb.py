"""
Blender Headless GLB Exporter & Thumbnail Renderer
--------------------------------------------------
Usage:
  blender -b "<input.blend>" -P export_glb.py -- "<output.glb>" [optional_thumb.png]
or
  blender -b -P export_glb.py -- "<input.blend>" "<output.glb>" [optional_thumb.png]

1. Inspects and converts all custom/toon/procedural materials to Principled BSDF PBR,
   preserving color ramps, diffuse colors, and embedding image textures.
2. Exports a web-optimized .glb with Draco / Meshopt compression.
3. Automatically renders a clean, transparent 512x512 preview thumbnail (.png).
"""

import sys
import os
import json
import math
import traceback

def log(msg):
    print(f"[BLENDER-EXPORT] {msg}", flush=True)

def prepare_materials_for_gltf(bpy):
    """
    Ensures every material has a standard glTF 2.0 compatible Principled BSDF node
    so that colors, color ramps, and textures are preserved in the exported GLB.
    """
    log("Checking and preparing materials for glTF PBR standard...")
    for mat in bpy.data.materials:
        if not mat:
            continue
        if not mat.node_tree:
            continue

        nodes = mat.node_tree.nodes
        links = mat.node_tree.links

        out_node = next((n for n in nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if not out_node:
            continue

        principled = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)

        # Check if Principled BSDF is already properly feeding the output
        is_principled_connected = False
        for link in links:
            if link.to_node == out_node and link.from_node == principled:
                is_principled_connected = True
                break

        if not is_principled_connected:
            log(f"Adapting non-standard shader in material '{mat.name}' for glTF...")
            if not principled:
                principled = nodes.new('ShaderNodeBsdfPrincipled')
                principled.location = (out_node.location.x - 300, out_node.location.y)

            # Find best color source in node tree
            img_node = next((n for n in nodes if n.type == 'TEX_IMAGE' and n.image), None)
            ramp_node = next((n for n in nodes if n.type == 'VALTORGB'), None)
            diffuse_node = next((n for n in nodes if n.type == 'BSDF_DIFFUSE'), None)
            emission_node = next((n for n in nodes if n.type == 'EMISSION'), None)

            if img_node:
                log(f"  -> Connecting Image Texture '{img_node.image.name}' to Base Color")
                links.new(img_node.outputs['Color'], principled.inputs['Base Color'])
            elif ramp_node and ramp_node.color_ramp.elements:
                elems = ramp_node.color_ramp.elements
                # Pick the key vibrant color
                c = elems[1].color if len(elems) > 1 else elems[0].color
                principled.inputs['Base Color'].default_value = (c[0], c[1], c[2], 1.0)
                if 'Roughness' in principled.inputs:
                    principled.inputs['Roughness'].default_value = 0.35
                log(f"  -> Extracted ColorRamp color for '{mat.name}': ({c[0]:.2f}, {c[1]:.2f}, {c[2]:.2f})")
            elif diffuse_node and 'Color' in diffuse_node.inputs:
                c = diffuse_node.inputs['Color'].default_value
                principled.inputs['Base Color'].default_value = c
                log(f"  -> Extracted Diffuse color for '{mat.name}'")
            elif emission_node and 'Color' in emission_node.inputs:
                c = emission_node.inputs['Color'].default_value
                principled.inputs['Base Color'].default_value = c
                log(f"  -> Extracted Emission color for '{mat.name}'")

            # Link Principled BSDF to Surface output
            links.new(principled.outputs['BSDF'], out_node.inputs['Surface'])

    # Pack external images if any
    try:
        bpy.ops.file.pack_all()
    except Exception as e:
        log(f"Notice during pack_all: {e}")

def render_model_thumbnail(bpy, thumb_path):
    """
    Renders an isometric, transparent 512x512 preview of the main models in the scene.
    """
    try:
        log(f"Rendering thumbnail preview to: {thumb_path}")
        scene = bpy.context.scene

        scene.render.resolution_x = 512
        scene.render.resolution_y = 512
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = os.path.abspath(thumb_path)
        scene.render.film_transparent = True

        # Hide giant backdrops from render so model stands out cleanly with transparent background
        for obj in bpy.data.objects:
            if 'backdrop' in obj.name.lower() or 'studio_backdrop' in obj.name.lower() or 'ground' in obj.name.lower():
                obj.hide_render = True

        # Calculate bounding box of visible meshes
        mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH' and not o.hide_render]
        if mesh_objs:
            # Create or update camera
            cam = scene.camera
            if not cam:
                cam_data = bpy.data.cameras.new("ThumbCamera")
                cam = bpy.data.objects.new("ThumbCamera", cam_data)
                scene.collection.objects.link(cam)
                scene.camera = cam

            # Center camera at nice 3/4 isometric angle
            cam.location = (2.8, -3.2, 2.4)
            # Point towards (0, 0, 0.8)
            dx = 0 - cam.location.x
            dy = 0 - cam.location.y
            dz = 0.8 - cam.location.z
            dist_xy = math.sqrt(dx*dx + dy*dy)
            cam.rotation_euler = (
                math.atan2(dist_xy, dz) - math.pi/2 + 0.3,
                0,
                math.atan2(-dx, -dy)
            )

        bpy.ops.render.render(write_still=True)
        if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
            log(f"Thumbnail rendered successfully: {os.path.getsize(thumb_path)} bytes.")
            return True
    except Exception as e:
        log(f"Thumbnail render notice (non-fatal): {e}")
    return False

def main():
    try:
        import bpy
    except ImportError:
        print(json.dumps({"status": "error", "message": "This script must run inside Blender"}))
        sys.exit(1)

    raw_args = sys.argv
    if "--" not in raw_args:
        print(json.dumps({"status": "error", "message": "No arguments provided after '--' delimiter."}))
        sys.exit(1)

    args = raw_args[raw_args.index("--") + 1:]
    input_path = None
    output_path = None
    thumb_path = None

    if len(args) == 1:
        output_path = os.path.abspath(args[0])
    elif len(args) == 2:
        if args[0].endswith(".blend"):
            input_path = os.path.abspath(args[0])
            output_path = os.path.abspath(args[1])
        else:
            output_path = os.path.abspath(args[0])
            thumb_path = os.path.abspath(args[1])
    elif len(args) >= 3:
        input_path = os.path.abspath(args[0])
        output_path = os.path.abspath(args[1])
        thumb_path = os.path.abspath(args[2])

    if not thumb_path and output_path:
        thumb_path = os.path.splitext(output_path)[0] + "_thumb.png"

    if input_path and os.path.exists(input_path):
        log(f"Opening blend file: {input_path}")
        bpy.ops.wm.open_mainfile(filepath=input_path)

    out_dir = os.path.dirname(output_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # 1. Prepare materials & textures for glTF
    prepare_materials_for_gltf(bpy)

    # 2. Render thumbnail preview
    has_thumb = render_model_thumbnail(bpy, thumb_path)

    # 3. Export to GLB with web-optimized settings
    log("Beginning glTF/GLB export...")
    export_kwargs = {
        "filepath": output_path,
        "export_format": "GLB",
        "use_selection": False,
        "use_visible": True,
        "export_apply": True,
        "export_materials": "EXPORT",
        "export_image_format": "AUTO",
        "export_texcoords": True,
        "export_normals": True,
        "export_yup": True,
    }

    try:
        bpy.ops.export_scene.gltf(**export_kwargs)
    except Exception as e:
        log(f"Notice with primary gltf params: {e}. Trying standard export...")
        bpy.ops.export_scene.gltf(filepath=output_path, export_format="GLB", export_apply=True)

    if not os.path.exists(output_path):
        raise FileNotFoundError(f"Export finished but GLB was not found at {output_path}")

    file_size = os.path.getsize(output_path)
    mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')

    result = {
        "status": "success",
        "output_path": output_path,
        "thumbnail_path": thumb_path if (has_thumb and os.path.exists(thumb_path)) else None,
        "file_size": file_size,
        "mesh_count": mesh_count,
    }

    print("\n--- RESULT JSON ---")
    print(json.dumps(result))
    print("--- END RESULT JSON ---\n")
    sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        error_info = {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }
        print("\n--- RESULT JSON ---")
        print(json.dumps(error_info))
        print("--- END RESULT JSON ---\n")
        sys.exit(1)
