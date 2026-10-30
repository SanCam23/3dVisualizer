import { NextRequest, NextResponse } from "next/server";
import { getModelById, getModelFilePublicUrl } from "@/lib/services/modelService";

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

    const targetUrl = model.viewer_url || (model.viewer_path ? getModelFilePublicUrl(model.viewer_path) : null);

    if (targetUrl) {
      return NextResponse.redirect(targetUrl, {
        status: 307,
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
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
