import { NextRequest, NextResponse } from "next/server";
import { getModelById, deleteModelRecord, updateModelStatus } from "@/lib/services/modelService";
import { ModelStatus } from "@/lib/types/models";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const status = body.status as ModelStatus;

    if (!status) {
      return NextResponse.json(
        { success: false, error: "El campo 'status' es obligatorio" },
        { status: 400 }
      );
    }

    const model = await updateModelStatus(id, status, true);
    return NextResponse.json({ success: true, model });
  } catch (err: unknown) {
    console.error("API PATCH /api/models/[id] error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error)?.message || "Error al actualizar estado del modelo" },
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

