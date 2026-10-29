"""
Blender Headless GLB Exporter
-----------------------------
Usage:
  blender -b "<input.blend>" -P export_glb.py -- "<output.glb>"
or
  blender -b -P export_glb.py -- "<input.blend>" "<output.glb>"

Exports all meshes, materials, animations, and textures from the Blender scene
into a standalone, optimized .glb file for web visualization with Three.js.
"""

import sys
import os
import json
import traceback

def log(msg):
    print(f"[BLENDER-EXPORT] {msg}", flush=True)

def main():
    try:
        import bpy # type: ignore
    except ImportError:
        print(json.dumps({"status": "error", "message": "This script must be run within Blender: blender -b -P export_glb.py -- ..."}))
        sys.exit(1)

    raw_args = sys.argv
    if "--" not in raw_args:
        print(json.dumps({"status": "error", "message": "No arguments provided after '--' delimiter."}))
        sys.exit(1)

    args = raw_args[raw_args.index("--") + 1:]
    
    input_path = None
    output_path = None

    if len(args) == 1:
        # Blender was invoked with: blender -b input.blend -P export_glb.py -- output.glb
        output_path = os.path.abspath(args[0])
    elif len(args) >= 2:
        # Blender was invoked with: blender -b -P export_glb.py -- input.blend output.glb
        input_path = os.path.abspath(args[0])
        output_path = os.path.abspath(args[1])
    else:
        print(json.dumps({"status": "error", "message": "Insufficient arguments. Usage: blender -b [input.blend] -P export_glb.py -- [input.blend] output.glb"}))
        sys.exit(1)

    # If input path was explicitly provided via CLI args and isn't loaded yet
    if input_path and os.path.exists(input_path):
        log(f"Opening blend file: {input_path}")
        bpy.ops.wm.open_mainfile(filepath=input_path)

    current_file = bpy.data.filepath
    log(f"Active Blender file: {current_file or 'in-memory'}")
    log(f"Target GLB destination: {output_path}")

    # Ensure output directory exists
    out_dir = os.path.dirname(output_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    # Inspect scene objects
    mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')
    total_objects = len(bpy.data.objects)
    log(f"Found {mesh_count} meshes among {total_objects} total objects.")

    if mesh_count == 0:
        log("Warning: Scene contains no mesh objects. Export will proceed but may be empty.")

    # Remove non-exportable invalid geometries or hidden elements if needed
    # Unpack packed textures so the glTF exporter can access and pack them into the binary GLB
    try:
        if bpy.data.images:
            bpy.ops.file.unpack_all(method='USE_LOCAL')
    except Exception as unpack_err:
        log(f"Texture unpack notice: {unpack_err}")

    # Export to GLB with modern, web-optimized settings
    # We apply modifiers so Subdivision Surface, Mirror, Bevel, etc. are baked into the mesh
    log("Beginning glTF/GLB export...")
    
    export_kwargs = {
        "filepath": output_path,
        "export_format": "GLB",
        "use_selection": False,
        "use_visible": True,
        "export_apply": True, # Apply modifiers
        "export_materials": "EXPORT",
        "export_colors": True,
        "export_animations": True,
        "export_morph": True,
        "export_skins": True,
        "export_yup": True, # Ensure Y-up coordinates for Three.js
    }

    # Run the glTF exporter operator
    try:
        bpy.ops.export_scene.gltf(**export_kwargs)
    except TypeError:
        # Fallback for older Blender versions if some arguments vary slightly
        log("Fallback to standard gltf export parameters...")
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format="GLB",
            export_apply=True
        )

    # Verify that output file exists and is not empty
    if not os.path.exists(output_path):
        raise FileNotFoundError(f"Export finished without error, but GLB was not found at {output_path}")

    file_size = os.path.getsize(output_path)
    if file_size == 0:
        raise ValueError(f"Generated GLB file is 0 bytes at {output_path}")

    log(f"Successfully generated GLB: {file_size} bytes.")

    result = {
        "status": "success",
        "output_path": output_path,
        "file_size": file_size,
        "mesh_count": mesh_count,
        "total_objects": total_objects
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

