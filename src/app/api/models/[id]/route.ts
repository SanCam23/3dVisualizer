import { NextRequest, NextResponse } from "next/server";
import { getModelById, deleteModelRecord } from "@/lib/services/modelService";

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

    return NextResponse.json({ success: true, model });
  } catch (err: unknown) {
    console.error("API GET /api/models/[id] error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al obtener el modelo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteModelRecord(id);

    return NextResponse.json({
      success: true,
      message: "Modelo y almacenamiento eliminados correctamente",
    });
  } catch (err: unknown) {
    console.error("API DELETE /api/models/[id] error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al eliminar el modelo" },
      { status: 400 }
    );
  }
}

