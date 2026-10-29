#!/usr/bin/env python3
"""
Decoupled Blender Conversion Worker
-----------------------------------
Runs headless Blender to convert uploaded .blend models to .glb format,
and synchronizes with Supabase Storage & PostgreSQL.

Can be run:
  1. As a continuous worker polling Supabase:
     python blender_worker.py --poll 5

  2. As a one-shot batch runner:
     python blender_worker.py --once

  3. As a direct CLI converter (standalone test):
     python blender_worker.py --convert ./sample.blend ./sample.glb
"""

import os
import sys
import time
import json
import shutil
import argparse
import tempfile
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None

# Auto-detect Blender binary
def find_blender_binary() -> Optional[str]:
    # 1. Environment variable
    env_path = os.environ.get("BLENDER_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    # 2. PATH lookup
    path_bin = shutil.which("blender")
    if path_bin:
        return path_bin

    # 3. Standard Windows locations
    if sys.platform == "win32":
        candidates = [
            r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 5.0\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c

    # 4. Standard Linux locations
    if sys.platform.startswith("linux"):
        candidates = [
            "/usr/bin/blender",
            "/usr/local/bin/blender",
            "/snap/bin/blender"
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c

    # 5. Standard macOS locations
    if sys.platform == "darwin":
        candidates = [
            "/Applications/Blender.app/Contents/MacOS/Blender",
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c

    return None

BLENDER_BIN = find_blender_binary()
CURRENT_DIR = Path(__file__).resolve().parent
EXPORT_SCRIPT = CURRENT_DIR / "export_glb.py"

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
STORAGE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "models3d")

def log(msg: str):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [WORKER] {msg}", flush=True)

def run_blender_conversion(input_path: str, output_path: str) -> Dict[str, Any]:
    if not BLENDER_BIN:
        raise RuntimeError("Blender executable not found. Please set BLENDER_PATH or install Blender.")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input .blend file does not exist: {input_path}")

    # Blender CLI execution:
    # blender -b <input.blend> -P export_glb.py -- <output.glb>
    cmd = [
        BLENDER_BIN,
        "-b",
        str(input_path),
        "-P",
        str(EXPORT_SCRIPT),
        "--",
        str(output_path)
    ]

    log(f"Executing: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    stdout = result.stdout
    stderr = result.stderr

    if result.returncode != 0:
        log(f"Blender failed with exit code {result.returncode}")
        log(f"Stderr: {stderr}")
        raise RuntimeError(f"Blender conversion error (code {result.returncode}): {stderr or stdout}")

    # Parse JSON output from script
    parsed_json = None
    if "--- RESULT JSON ---" in stdout:
        try:
            json_block = stdout.split("--- RESULT JSON ---")[1].split("--- END RESULT JSON ---")[0].strip()
            parsed_json = json.loads(json_block)
        except Exception as e:
            log(f"Failed to parse script JSON output: {e}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError(f"Conversion produced missing or empty .glb file at {output_path}")

    size = os.path.getsize(output_path)
    log(f"Conversion complete! Result GLB size: {size} bytes ({size / (1024*1024):.2f} MB)")
    return {
        "status": "success",
        "output_path": output_path,
        "file_size": size,
        "details": parsed_json
    }

def get_supabase_client() -> Optional[Any]:
    if not create_client:
        log("Notice: 'supabase' Python package not installed (run 'pip install supabase').")
        return None
    if not SUPABASE_URL or not SUPABASE_KEY:
        log("Notice: Supabase URL or Key not set in environment.")
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def process_single_job(supabase: Any, job: Dict[str, Any]) -> bool:
    job_id = job["id"]
    model_id = job["model_id"]
    version = job.get("version", 1)
    source_path = job["source_path"]
    target_path = job["target_path"]

    log(f"Processing job {job_id} for model {model_id} (version {version})...")

    # Mark job as processing
    supabase.table("conversion_jobs").update({
        "status": "processing",
        "attempts": job.get("attempts", 0) + 1,
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }).eq("id", job_id).execute()

    # Create temporary scratch directory
    temp_dir = tempfile.mkdtemp(prefix="blender_worker_")
    local_blend = os.path.join(temp_dir, "input.blend")
    local_glb = os.path.join(temp_dir, "model.glb")

    try:
        # 1. Download .blend from Supabase Storage
        log(f"Downloading source {source_path} from bucket '{STORAGE_BUCKET}'...")
        file_bytes = supabase.storage.from_(STORAGE_BUCKET).download(source_path)
        with open(local_blend, "wb") as f:
            f.write(file_bytes)
        log(f"Downloaded {len(file_bytes)} bytes.")

        # 2. Run Blender Headless conversion
        conv_result = run_blender_conversion(local_blend, local_glb)
        glb_size = conv_result["file_size"]

        # 3. Upload .glb to Supabase Storage
        log(f"Uploading generated .glb to {target_path}...")
        with open(local_glb, "rb") as f:
            glb_data = f.read()

        supabase.storage.from_(STORAGE_BUCKET).upload(
            path=target_path,
            file=glb_data,
            file_options={"content-type": "model/gltf-binary", "upsert": "true"}
        )
        log("Upload to Supabase Storage finished.")

        # 4. Atomic database update: model is now available!
        # First retrieve current model to check if this was an update
        curr_model = supabase.table("models").select("*").eq("id", model_id).single().execute().data
        old_source_path = curr_model.get("source_path") if curr_model else None
        old_viewer_path = curr_model.get("viewer_path") if curr_model else None
        old_version = curr_model.get("version", 1) if curr_model else 1

        # Update model record
        supabase.table("models").update({
            "viewer_path": target_path,
            "source_path": source_path,
            "version": version,
            "file_size": glb_size,
            "status": "available",
            "is_locked": False,
            "last_error": None,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }).eq("id", model_id).execute()

        # Update model_versions record
        supabase.table("model_versions").upsert({
            "model_id": model_id,
            "version": version,
            "source_path": source_path,
            "viewer_path": target_path,
            "status": "ready",
            "file_size": glb_size,
            "error_message": None
        }).execute()

        # Update job to completed
        supabase.table("conversion_jobs").update({
            "status": "completed",
            "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "error_message": None
        }).eq("id", job_id).execute()

        log(f"Model {model_id} is now LIVE at version {version}!")

        # 5. SAFE CLEANUP of old version:
        # Critical rule: Only clean up older files if this was a version upgrade AND new version is live
        if version > old_version and old_viewer_path and old_viewer_path != target_path:
            log(f"Safe cleanup: cleaning older files from version {old_version}...")
            try:
                # Mark previous version as superseded/cleaned_up in DB
                supabase.table("model_versions").update({
                    "status": "superseded"
                }).eq("model_id", model_id).eq("version", old_version).execute()

                # Remove old files from storage
                supabase.storage.from_(STORAGE_BUCKET).remove([old_source_path, old_viewer_path])
                log(f"Successfully cleaned old storage files: {old_source_path}, {old_viewer_path}")
            except Exception as clean_err:
                log(f"Notice: Cleanup of old files had a non-fatal warning: {clean_err}")

        return True

    except Exception as e:
        err_msg = str(e)
        log(f"Error processing job {job_id}: {err_msg}")

        # In case of failure: DO NOT delete older version!
        # Check if model has a previous ready version
        prev_version = None
        try:
            prev_ready = supabase.table("model_versions") \
                .select("*") \
                .eq("model_id", model_id) \
                .eq("status", "ready") \
                .order("version", desc=True) \
                .limit(1).execute().data
            if prev_ready and len(prev_ready) > 0:
                prev_version = prev_ready[0]
        except Exception:
            pass

        # Update job as failed
        supabase.table("conversion_jobs").update({
            "status": "failed",
            "error_message": err_msg
        }).eq("id", job_id).execute()

        # Update version record as failed
        supabase.table("model_versions").upsert({
            "model_id": model_id,
            "version": version,
            "source_path": source_path,
            "status": "failed",
            "error_message": err_msg
        }).execute()

        # Unlock model and restore or set error
        if prev_version:
            # Rollback active pointer to previous ready version, unlock
            supabase.table("models").update({
                "status": "available",
                "is_locked": False,
                "last_error": f"Update to v{version} failed: {err_msg}"
            }).eq("id", model_id).execute()
            log(f"Rollback: Preserved previous version {prev_version['version']} as active.")
        else:
            supabase.table("models").update({
                "status": "error",
                "is_locked": False,
                "last_error": err_msg
            }).eq("id", model_id).execute()

        return False

    finally:
        # Cleanup local scratch files
        shutil.rmtree(temp_dir, ignore_errors=True)

def poll_and_process(supabase: Any, interval: int = 5):
    log(f"Starting Blender conversion worker polling every {interval}s...")
    log(f"Blender Binary: {BLENDER_BIN or 'NOT FOUND'}")
    log(f"Storage Bucket: {STORAGE_BUCKET}")

    while True:
        try:
            # Query oldest queued job
            res = supabase.table("conversion_jobs") \
                .select("*") \
                .eq("status", "queued") \
                .order("created_at", desc=False) \
                .limit(1) \
                .execute()

            jobs = res.data or []
            if jobs:
                job = jobs[0]
                process_single_job(supabase, job)
            else:
                time.sleep(interval)

        except KeyboardInterrupt:
            log("Worker stopped by user.")
            break
        except Exception as e:
            log(f"Polling loop error: {e}")
            time.sleep(interval)

def main():
    parser = argparse.ArgumentParser(description="Blender .blend to .glb Conversion Worker")
    parser.add_argument("--poll", type=int, default=0, help="Poll interval in seconds (e.g. 5)")
    parser.add_argument("--once", action="store_true", help="Process at most one pending job and exit")
    parser.add_argument("--convert", nargs=2, metavar=("INPUT_BLEND", "OUTPUT_GLB"), help="Convert local blend file directly to glb")
    args = parser.parse_args()

    # Standalone CLI mode
    if args.convert:
        input_blend, output_glb = args.convert
        log(f"Direct conversion mode: {input_blend} -> {output_glb}")
        res = run_blender_conversion(input_blend, output_glb)
        print(json.dumps(res, indent=2))
        sys.exit(0)

    # Supabase cloud worker mode
    supabase = get_supabase_client()
    if not supabase:
        print("\n[ERROR] Supabase client could not be initialized.")
        print("Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
        print(f"Blender detected at: {BLENDER_BIN or 'NONE'}")
        sys.exit(1)

    if args.once:
        res = supabase.table("conversion_jobs").select("*").eq("status", "queued").order("created_at", desc=False).limit(1).execute()
        jobs = res.data or []
        if jobs:
            process_single_job(supabase, jobs[0])
        else:
            log("No pending jobs found.")
    else:
        poll_interval = args.poll if args.poll > 0 else 5
        poll_and_process(supabase, poll_interval)

if __name__ == "__main__":
    main()

