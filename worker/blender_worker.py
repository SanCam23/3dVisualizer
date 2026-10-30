#!/usr/bin/env python3
"""
Decoupled Blender Conversion Worker
-----------------------------------
Runs headless Blender to convert uploaded .blend models to .glb format,
preserves PBR textures, renders 512x512 preview thumbnails,
and synchronizes with Supabase Storage & PostgreSQL.

Works out of the box with standard Python (no pip packages required!)
by using standard library urllib.request.

Can be run:
  1. As a continuous worker polling Supabase:
     python worker/blender_worker.py --poll 5

  2. As a one-shot batch runner:
     python worker/blender_worker.py --once

  3. Reprocess an existing model to generate textures and thumbnail:
     python worker/blender_worker.py --reprocess [model_id]

  4. As a direct CLI converter (standalone test):
     python worker/blender_worker.py --convert ./sample.blend ./sample.glb
"""

import os
import sys
import time
import json
import shutil
import argparse
import tempfile
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional, Dict, Any, List

# 1. Automatically load .env.local from parent directory
def load_env_local():
    env_file = Path(__file__).resolve().parent.parent / ".env.local"
    if env_file.is_file():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key:
                        os.environ[key] = val

load_env_local()

def clean_url(url: Optional[str]) -> str:
    if not url:
        return ""
    u = url.strip()
    if u.endswith("/rest/v1/") or u.endswith("/rest/v1"):
        u = u.replace("/rest/v1", "")
    return u.rstrip("/")

SUPABASE_URL = clean_url(os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL"))
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)
STORAGE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "models3d")

# 2. Auto-detect Blender binary
def find_blender_binary() -> Optional[str]:
    env_path = os.environ.get("BLENDER_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    path_bin = shutil.which("blender")
    if path_bin:
        return path_bin

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

    if sys.platform.startswith("linux"):
        for c in ["/usr/bin/blender", "/usr/local/bin/blender", "/snap/bin/blender"]:
            if os.path.isfile(c):
                return c

    if sys.platform == "darwin":
        c = "/Applications/Blender.app/Contents/MacOS/Blender"
        if os.path.isfile(c):
            return c

    return None

BLENDER_BIN = find_blender_binary()
CURRENT_DIR = Path(__file__).resolve().parent
EXPORT_SCRIPT = CURRENT_DIR / "export_glb.py"

def log(msg: str):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [WORKER] {msg}", flush=True)

# 3. Built-in HTTP client for Supabase
class SupabaseHttp:
    def __init__(self, base_url: str, key: str, bucket: str):
        self.base_url = base_url
        self.key = key
        self.bucket = bucket

    def _headers(self, extra: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        h = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }
        if extra:
            h.update(extra)
        return h

    def get_queued_jobs(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rest/v1/conversion_jobs?status=eq.queued&order=created_at.asc&limit=1"
        req = urllib.request.Request(url, headers=self._headers({"Accept": "application/json"}))
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                return json.loads(res.read().decode("utf-8"))
        except Exception as e:
            log(f"Error fetching queued jobs: {e}")
            return []

    def update_job(self, job_id: str, fields: Dict[str, Any]):
        url = f"{self.base_url}/rest/v1/conversion_jobs?id=eq.{job_id}"
        data = json.dumps(fields).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers=self._headers({"Content-Type": "application/json", "Prefer": "return=minimal"}),
            method="PATCH"
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            return res.status

    def get_model(self, model_id: str) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/rest/v1/models?id=eq.{model_id}&limit=1"
        req = urllib.request.Request(url, headers=self._headers({"Accept": "application/json"}))
        with urllib.request.urlopen(req, timeout=15) as res:
            items = json.loads(res.read().decode("utf-8"))
            return items[0] if items else None

    def update_model(self, model_id: str, fields: Dict[str, Any]):
        url = f"{self.base_url}/rest/v1/models?id=eq.{model_id}"
        data = json.dumps(fields).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers=self._headers({"Content-Type": "application/json", "Prefer": "return=minimal"}),
            method="PATCH"
        )
        with urllib.request.urlopen(req, timeout=15) as res:
            return res.status

    def upsert_version(self, version_record: Dict[str, Any]):
        url = f"{self.base_url}/rest/v1/model_versions"
        data = json.dumps(version_record).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers=self._headers({
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }),
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                return res.status
        except urllib.error.HTTPError as he:
            log(f"Notice: upsert_version returned status {he.code}")

    def download_storage_file(self, path: str, local_dest: str):
        url = f"{self.base_url}/storage/v1/object/{self.bucket}/{path}"
        req = urllib.request.Request(url, headers=self._headers())
        with urllib.request.urlopen(req, timeout=60) as res:
            with open(local_dest, "wb") as f:
                shutil.copyfileobj(res, f)

    def upload_storage_file(self, local_src: str, target_path: str, content_type: str = "model/gltf-binary"):
        url = f"{self.base_url}/storage/v1/object/{self.bucket}/{target_path}"
        with open(local_src, "rb") as f:
            data = f.read()

        req = urllib.request.Request(
            url,
            data=data,
            headers=self._headers({
                "Content-Type": content_type,
                "x-upsert": "true"
            }),
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=60) as res:
            return res.status

    def remove_storage_files(self, paths: List[str]):
        if not paths:
            return
        url = f"{self.base_url}/storage/v1/object/{self.bucket}"
        payload = json.dumps({"prefixes": paths}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers=self._headers({"Content-Type": "application/json"}),
            method="DELETE"
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                return res.status
        except Exception as e:
            log(f"Notice: Storage cleanup warning: {e}")

# 4. Blender Execution
def run_blender_conversion(input_path: str, output_path: str, thumb_path: Optional[str] = None) -> Dict[str, Any]:
    if not BLENDER_BIN:
        raise RuntimeError(
            "No se encontró el ejecutable de Blender. Asegúrate de tener Blender instalado o define BLENDER_PATH."
        )

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"El archivo .blend no existe en: {input_path}")

    cmd = [
        BLENDER_BIN,
        "-b",
        str(input_path),
        "-P",
        str(EXPORT_SCRIPT),
        "--",
        str(output_path)
    ]
    if thumb_path:
        cmd.append(str(thumb_path))

    log(f"Ejecutando Blender: {' '.join(cmd)}")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0:
        log(f"Error en Blender (código {result.returncode})")
        log(f"Detalle: {result.stderr or result.stdout}")
        raise RuntimeError(f"Fallo de exportación en Blender: {result.stderr or result.stdout}")

    if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError(f"La conversión no generó el archivo .glb esperado en {output_path}")

    size = os.path.getsize(output_path)
    has_thumb = thumb_path and os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0
    log(f"Conversión exitosa! Archivo .glb generado: {size} bytes ({size / (1024*1024):.2f} MB)")
    if has_thumb:
        log(f"Miniatura generada con éxito ({os.path.getsize(thumb_path)} bytes).")

    return {
        "status": "success",
        "output_path": output_path,
        "thumbnail_path": thumb_path if has_thumb else None,
        "file_size": size,
    }

# 5. Process single job
def process_single_job(client: SupabaseHttp, job: Dict[str, Any]) -> bool:
    job_id = job["id"]
    model_id = job["model_id"]
    version = job.get("version", 1)
    source_path = job["source_path"]
    target_path = job["target_path"]

    log(f"==> Iniciando procesamiento de trabajo {job_id} para modelo {model_id} (versión {version})...")

    # Mark job as processing
    if not str(job_id).startswith("manual-"):
        client.update_job(job_id, {
            "status": "processing",
            "attempts": (job.get("attempts") or 0) + 1,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        })

    temp_dir = tempfile.mkdtemp(prefix="blender_worker_")
    local_blend = os.path.join(temp_dir, "input.blend")
    local_glb = os.path.join(temp_dir, "model.glb")
    local_thumb = os.path.join(temp_dir, "thumbnail.png")

    try:
        # 1. Download source .blend
        log(f"Descargando {source_path} desde el bucket '{client.bucket}'...")
        client.download_storage_file(source_path, local_blend)
        log(f"Descarga completa: {os.path.getsize(local_blend)} bytes.")

        # 2. Run Blender Headless conversion (PBR Materials + 512x512 Thumbnail)
        conv_res = run_blender_conversion(local_blend, local_glb, local_thumb)
        glb_size = conv_res["file_size"]

        # 3. Upload .glb to Supabase Storage
        log(f"Subiendo .glb convertido a {target_path}...")
        client.upload_storage_file(local_glb, target_path, "model/gltf-binary")

        # 4. Upload thumbnail if generated
        target_thumb_path = None
        if os.path.exists(local_thumb) and os.path.getsize(local_thumb) > 0:
            target_thumb_path = f"models/{model_id}/v{version}/thumbnail.png"
            log(f"Subiendo miniatura generada a {target_thumb_path}...")
            client.upload_storage_file(local_thumb, target_thumb_path, "image/png")

        # 5. Atomic database update
        curr_model = client.get_model(model_id)
        old_version = curr_model.get("version", 1) if curr_model else 1
        old_viewer_path = curr_model.get("viewer_path") if curr_model else None
        old_source_path = curr_model.get("source_path") if curr_model else None

        model_update = {
            "viewer_path": target_path,
            "source_path": source_path,
            "version": version,
            "file_size": glb_size,
            "status": "available",
            "is_locked": False,
            "last_error": None,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        if target_thumb_path:
            model_update["thumbnail_path"] = target_thumb_path

        client.update_model(model_id, model_update)

        client.upsert_version({
            "model_id": model_id,
            "version": version,
            "source_path": source_path,
            "viewer_path": target_path,
            "status": "ready",
            "file_size": glb_size,
            "error_message": None
        })

        if not str(job_id).startswith("manual-"):
            client.update_job(job_id, {
                "status": "completed",
                "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "error_message": None
            })

        log(f"¡ÉXITO! El modelo {model_id} está ahora DISPONIBLE en Three.js con texturas PBR y miniatura (versión {version}).")

        # 6. Safe cleanup of old version
        if version > old_version and old_viewer_path and old_viewer_path != target_path:
            log(f"Limpieza segura: liberando archivos antiguos de v{old_version}...")
            client.remove_storage_files([old_source_path, old_viewer_path])

        return True

    except Exception as e:
        err_msg = str(e)
        log(f"ERROR procesando modelo {model_id}: {err_msg}")

        client.update_job(job_id, {
            "status": "failed",
            "error_message": err_msg
        })

        client.update_model(model_id, {
            "status": "error",
            "is_locked": False,
            "last_error": f"Fallo en conversión de Blender: {err_msg}"
        })

        return False

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

# 6. Reprocess an existing model
def reprocess_model(client: SupabaseHttp, model_id: str):
    log(f"Reprocesando modelo existente: {model_id}...")
    model = client.get_model(model_id)
    if not model:
        log(f"Modelo {model_id} no encontrado en Supabase.")
        return False

    dummy_job = {
        "id": f"manual-{int(time.time())}",
        "model_id": model["id"],
        "version": model.get("version", 1),
        "source_path": model["source_path"],
        "target_path": model.get("viewer_path") or f"models/{model['id']}/v{model.get('version', 1)}/model.glb",
    }
    return process_single_job(client, dummy_job)

# 7. Polling loop
def poll_and_process(client: SupabaseHttp, interval: int = 5):
    log("==================================================================")
    log("Cheat Cook · Worker de Conversión Blender (.blend -> .glb)")
    log(f"Supabase URL:    {client.base_url}")
    log(f"Storage Bucket:  {client.bucket}")
    log(f"Blender Binario: {BLENDER_BIN or 'NO DETECTADO'}")
    log(f"Intervalo:       {interval}s")
    log("==================================================================")
    log("Escuchando cola de trabajos en Supabase... (Ctrl+C para salir)")

    while True:
        try:
            jobs = client.get_queued_jobs()
            if jobs:
                job = jobs[0]
                process_single_job(client, job)
            else:
                time.sleep(interval)
        except KeyboardInterrupt:
            log("Worker detenido por el usuario.")
            break
        except Exception as e:
            log(f"Excepción en el bucle del worker: {e}")
            time.sleep(interval)

def main():
    parser = argparse.ArgumentParser(description="Blender .blend to .glb Conversion Worker")
    parser.add_argument("--poll", type=int, default=0, help="Poll interval in seconds (e.g. 5)")
    parser.add_argument("--once", action="store_true", help="Process at most one pending job and exit")
    parser.add_argument("--reprocess", type=str, help="Reprocess an existing model by UUID")
    parser.add_argument("--convert", nargs=2, metavar=("INPUT_BLEND", "OUTPUT_GLB"), help="Convert local blend file directly to glb")
    args = parser.parse_args()

    if args.convert:
        input_blend, output_glb = args.convert
        res = run_blender_conversion(input_blend, output_glb)
        print(json.dumps(res, indent=2))
        sys.exit(0)

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n[ERROR] No se encontraron credenciales de Supabase.")
        print("Asegúrate de definir NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local")
        sys.exit(1)

    client = SupabaseHttp(SUPABASE_URL, SUPABASE_KEY, STORAGE_BUCKET)

    if args.reprocess:
        reprocess_model(client, args.reprocess)
        sys.exit(0)

    if args.once:
        jobs = client.get_queued_jobs()
        if jobs:
            process_single_job(client, jobs[0])
        else:
            log("No hay trabajos pendientes en cola.")
    else:
        interval = args.poll if args.poll > 0 else 5
        poll_and_process(client, interval)

if __name__ == "__main__":
    main()
