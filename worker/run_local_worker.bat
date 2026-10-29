@echo off
REM ==============================================================================
REM Run Blender Conversion Worker Locally
REM Uses locally installed Blender 5.2 (or autodetected) to process jobs from Supabase
REM ==============================================================================

set BLENDER_PATH=C:\Program Files\Blender Foundation\Blender 5.2\blender.exe
echo [WORKER] Starting local Blender conversion worker...
echo [WORKER] Blender binary: "%BLENDER_PATH%"

python worker\blender_worker.py --poll 5
pause

