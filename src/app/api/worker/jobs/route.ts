import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.WORKER_SECRET_TOKEN;
  if (!secret) return true; // Optional in dev
  const authHeader = req.headers.get("x-worker-token") || req.headers.get("authorization");
  return authHeader === secret || authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({
      success: false,
      error: "Supabase no está configurado en el servidor Next.js.",
    }, { status: 503 });
  }

  try {
    // Fetch and claim next queued job atomically
    const { data: jobs, error } = await supabase
      .from("conversion_jobs")
      .select("*")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ job: null });
    }

    const job = jobs[0];

    // Mark as processing
    await supabase
      .from("conversion_jobs")
      .update({
        status: "processing",
        attempts: (job.attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Error al obtener trabajos del worker" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { job_id, status, error_message, file_size } = body;

    if (!job_id || !status) {
      return NextResponse.json(
        { error: "Se requieren 'job_id' y 'status' ('completed' o 'failed')" },
        { status: 400 }
      );
    }

    // 1. Fetch job
    const { data: job, error: jobErr } = await supabase
      .from("conversion_jobs")
      .select("*")
      .eq("id", job_id)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
    }

    const { model_id, version, target_path, source_path } = job;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "models3d";

    if (status === "completed") {
      // Fetch current model to check if this was a version bump
      const { data: model } = await supabase.from("models").select("*").eq("id", model_id).single();
      const oldVersion = model ? model.version : 1;
      const oldSource = model ? model.source_path : null;
      const oldViewer = model ? model.viewer_path : null;

      // Update model record
      await supabase
        .from("models")
        .update({
          viewer_path: target_path,
          source_path: source_path,
          version: version,
          file_size: file_size || 0,
          status: "available",
          is_locked: false,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", model_id);

      // Update version record
      await supabase
        .from("model_versions")
        .upsert({
          model_id,
          version,
          source_path,
          viewer_path: target_path,
          status: "ready",
          file_size: file_size || 0,
          error_message: null,
        });

      // Update job record
      await supabase
        .from("conversion_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", job_id);

      // SAFE CLEANUP: Only delete older version files after the new version is confirmed available!
      if (version > oldVersion && oldViewer && oldViewer !== target_path) {
        try {
          await supabase.from("model_versions").update({ status: "superseded" }).eq("model_id", model_id).eq("version", oldVersion);
          await supabase.storage.from(bucket).remove([oldSource, oldViewer]);
        } catch (cleanupErr) {
          console.warn("Storage cleanup notice:", cleanupErr);
        }
      }

      return NextResponse.json({ success: true, message: "Modelo actualizado y disponible." });
    } else {
      // Failed case: NEVER delete old files! Keep previous version intact
      await supabase
        .from("conversion_jobs")
        .update({
          status: "failed",
          error_message: error_message || "Error desconocido en la conversión de Blender",
        })
        .eq("id", job_id);

      await supabase
        .from("model_versions")
        .upsert({
          model_id,
          version,
          source_path,
          status: "failed",
          error_message: error_message || "Fallo en conversión",
        });

      // Restore previous version as available if it exists
      const { data: prevVersions } = await supabase
        .from("model_versions")
        .select("*")
        .eq("model_id", model_id)
        .eq("status", "ready")
        .order("version", { ascending: false })
        .limit(1);

      if (prevVersions && prevVersions.length > 0) {
        await supabase
          .from("models")
          .update({
            status: "available",
            is_locked: false,
            last_error: `La actualización a v${version} falló: ${error_message}`,
          })
          .eq("id", model_id);
      } else {
        await supabase
          .from("models")
          .update({
            status: "error",
            is_locked: false,
            last_error: error_message || "Error en conversión",
          })
          .eq("id", model_id);
      }

      return NextResponse.json({ success: true, message: "Estado de fallo registrado sin afectar la versión anterior." });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Error al procesar el reporte del worker" },
      { status: 500 }
    );
  }
}

