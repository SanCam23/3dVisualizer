import { NextRequest, NextResponse } from "next/server";
import { getModelById, updateModelVersion } from "@/lib/services/modelService";
import { createServerClient } from "@/lib/supabase/server";
import { validateBlendFile } from "@/lib/utils/blendValidator";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentModel = await getModelById(id);

    if (!currentModel) {
      return NextResponse.json(
        { success: false, error: "El modelo no existe" },
        { status: 404 }
      );
    }

    if (currentModel.is_locked || currentModel.status === "updating") {
      return NextResponse.json(
        {
          success: false,
          error: "El modelo ya está en proceso de actualización por otra operación activa.",
        },
        { status: 409 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo .blend para la actualización" },
        { status: 400 }
      );
    }

    const validation = await validateBlendFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const nextVersion = currentModel.version + 1;
    const newSourcePath = `models/${id}/v${nextVersion}/source.blend`;

    // Upload new version to Storage
    const supabase = createServerClient();
    if (supabase) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "models3d";
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(newSourcePath, buffer, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      if (uploadErr) {
        return NextResponse.json(
          {
            success: false,
            error: `Fallo al almacenar la nueva versión .blend: ${uploadErr.message}`,
          },
          { status: 500 }
        );
      }
    }

    // Atomic update in Database
    const updated = await updateModelVersion({
      model_id: id,
      new_source_path: newSourcePath,
      file_size: file.size,
    });

    return NextResponse.json({
      success: true,
      model: updated,
      message: `Nueva versión v${nextVersion} subida y encolada. La versión anterior permanece activa hasta confirmar la conversión.`,
    });
  } catch (err: unknown) {
    console.error("API POST /api/models/[id]/update error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al actualizar la versión del modelo" },
      { status: 500 }
    );
  }
}

