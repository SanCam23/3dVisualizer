import { NextRequest, NextResponse } from "next/server";
import { getModelById, updateModelVersion } from "@/lib/services/modelService";
import { createServerClient } from "@/lib/supabase/server";
import { validateGlbFile } from "@/lib/utils/glbValidator";

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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const thumbnail = formData.get("thumbnail") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo .glb para la actualización" },
        { status: 400 }
      );
    }

    const validation = await validateGlbFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const nextVersion = currentModel.version + 1;
    const newGlbPath = `models/${id}/v${nextVersion}/model.glb`;
    let newThumbnailPath: string | null = null;

    // Upload new version to Storage
    const supabase = createServerClient();
    if (supabase) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "models3d";
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(newGlbPath, buffer, {
          contentType: "model/gltf-binary",
          upsert: true,
        });

      if (uploadErr) {
        return NextResponse.json(
          {
            success: false,
            error: `Fallo al almacenar la nueva versión .glb: ${uploadErr.message}`,
          },
          { status: 500 }
        );
      }

      // Upload client thumbnail if provided
      if (thumbnail) {
        newThumbnailPath = `models/${id}/v${nextVersion}/thumbnail.png`;
        const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
        await supabase.storage
          .from(bucket)
          .upload(newThumbnailPath, thumbBuffer, {
            contentType: "image/png",
            upsert: true,
          });
      }
    }

    // Atomic update in Database (immediately available!)
    const updated = await updateModelVersion({
      model_id: id,
      new_glb_path: newGlbPath,
      new_thumbnail_path: newThumbnailPath,
      file_size: file.size,
    });

    return NextResponse.json({
      success: true,
      model: updated,
      message: `Nueva versión v${nextVersion} subida y disponible inmediatamente.`,
    });
  } catch (err: unknown) {
    console.error("API POST /api/models/[id]/update error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al actualizar la versión del modelo" },
      { status: 500 }
    );
  }
}

