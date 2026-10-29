import { NextRequest, NextResponse } from "next/server";
import { listModels, createModelRecord } from "@/lib/services/modelService";
import { createServerClient } from "@/lib/supabase/server";
import { validateBlendFile } from "@/lib/utils/blendValidator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const status = searchParams.get("status") || undefined;

    const models = await listModels(q, status);
    return NextResponse.json({ success: true, models });
  } catch (err: unknown) {
    console.error("API GET /api/models error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al listar modelos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    let name = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo .blend" },
        { status: 400 }
      );
    }

    // 1. Validation
    const validation = await validateBlendFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Default name if omitted
    if (!name || !name.trim()) {
      name = file.name.replace(/\.blend$/i, "").replace(/[-_]/g, " ");
    }

    const modelId = typeof crypto !== "undefined" ? crypto.randomUUID() : `m-${Date.now()}`;
    const storagePath = `models/${modelId}/v1/source.blend`;

    // 2. Upload to Supabase Storage if configured
    const supabase = createServerClient();
    if (supabase) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "models3d";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        return NextResponse.json(
          { success: false, error: `Fallo al subir a Supabase Storage: ${uploadErr.message}` },
          { status: 500 }
        );
      }
    }

    // 3. Create Database Record & Conversion Job
    const model = await createModelRecord({
      id: modelId,
      name: name.trim(),
      source_path: storagePath,
      file_size: file.size,
    });

    return NextResponse.json({
      success: true,
      model,
      message: "Modelo subido y registrado correctamente. En cola de procesamiento.",
    });
  } catch (err: unknown) {
    console.error("API POST /api/models error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al procesar la subida del modelo" },
      { status: 500 }
    );
  }
}

