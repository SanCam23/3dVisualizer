import { NextRequest, NextResponse } from "next/server";
import { getModelById, getModelFileSignedUrl } from "@/lib/services/modelService";

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

    if (model.viewer_url) {
      return NextResponse.redirect(model.viewer_url, 307);
    }

    if (model.viewer_path) {
      const signedUrl = await getModelFileSignedUrl(model.viewer_path);
      if (signedUrl) {
        return NextResponse.redirect(signedUrl, 307);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "El modelo todavía no cuenta con un archivo .glb disponible.",
        status: model.status,
      },
      { status: 404 }
    );
  } catch (err: unknown) {
    console.error("API GET /api/models/[id]/file error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al obtener el archivo del modelo" },
      { status: 500 }
    );
  }
}

