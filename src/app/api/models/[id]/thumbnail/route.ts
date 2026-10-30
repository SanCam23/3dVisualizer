import { NextRequest, NextResponse } from "next/server";
import { getModelById, getModelFileSignedUrl, getModelFilePublicUrl } from "@/lib/services/modelService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const model = await getModelById(id);

    if (!model) {
      return NextResponse.json(
        { success: false, error: "Modelo no encontrado" },
        { status: 404 }
      );
    }

    // 1. Direct thumbnail_url if available
    if (model.thumbnail_url) {
      return NextResponse.redirect(model.thumbnail_url, 307);
    }

    // 2. If thumbnail_path exists, generate signed or public URL
    if (model.thumbnail_path) {
      const signedUrl = await getModelFileSignedUrl(model.thumbnail_path);
      if (signedUrl) {
        return NextResponse.redirect(signedUrl, 307);
      }
      const publicUrl = getModelFilePublicUrl(model.thumbnail_path);
      return NextResponse.redirect(publicUrl, 307);
    }

    return NextResponse.json(
      { success: false, error: "Este modelo no tiene miniatura generada" },
      { status: 404 }
    );
  } catch (err: unknown) {
    console.error("API GET /api/models/[id]/thumbnail error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al obtener la miniatura" },
      { status: 500 }
    );
  }
}

