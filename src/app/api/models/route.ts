import { NextRequest, NextResponse } from "next/server";
import { listModels, createModelRecord } from "@/lib/services/modelService";
import { createServerClient } from "@/lib/supabase/server";
import { validateGlbFile } from "@/lib/utils/glbValidator";

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
    const thumbnail = formData.get("thumbnail") as File | null;
    let name = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo .glb" },
        { status: 400 }
      );
    }

    // 1. Validation (glTF 2.0 Binary)
    const validation = await validateGlbFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Default name if omitted
    if (!name || !name.trim()) {
      name = file.name.replace(/\.glb$/i, "").replace(/[-_]/g, " ");
    }

    const modelId = typeof crypto !== "undefined" ? crypto.randomUUID() : `m-${Date.now()}`;
    const glbStoragePath = `models/${modelId}/v1/model.glb`;
    let thumbnailStoragePath: string | null = null;

    // 2. Upload to Supabase Storage
    const supabase = createServerClient();
    if (supabase) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "models3d";
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload GLB
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(glbStoragePath, buffer, {
          contentType: "model/gltf-binary",
          upsert: true,
        });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        return NextResponse.json(
          { success: false, error: `Fallo al subir archivo .glb a Supabase Storage: ${uploadErr.message}` },
          { status: 500 }
        );
      }

      // Upload client-generated thumbnail if present
      if (thumbnail) {
        thumbnailStoragePath = `models/${modelId}/v1/thumbnail.png`;
        const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
        await supabase.storage
          .from(bucket)
          .upload(thumbnailStoragePath, thumbBuffer, {
            contentType: "image/png",
            upsert: true,
          });
      }
    }

    // 3. Create Database Record (status available immediately, no worker required!)
    const model = await createModelRecord({
      id: modelId,
      name: name.trim(),
      glb_path: glbStoragePath,
      thumbnail_path: thumbnailStoragePath,
      file_size: file.size,
    });

    return NextResponse.json({
      success: true,
      model,
      message: "Modelo .glb subido y disponible inmediatamente para visualización.",
    });
  } catch (err: unknown) {
    console.error("API POST /api/models error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al procesar la subida del modelo" },
      { status: 500 }
    );
  }
}

