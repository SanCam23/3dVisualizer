import { createServerClient } from "@/lib/supabase/server";
import { Model3D, ModelStatus } from "@/lib/types/models";

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "models3d";

// In-memory store for local demo/fallback when Supabase is not yet connected
let mockModels: Model3D[] = [];

/**
 * Returns the permanent, cacheable public URL for a file in the Supabase models3d bucket.
 * Since models3d has public read access, this URL never expires, supports HTTP caching & ETags,
 * and requires zero extra roundtrips to the storage signing endpoint.
 */
export function getModelFilePublicUrl(path: string): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qgmknxajjfredukqiyfs.supabase.co";
  const baseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export async function getModelFileSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  return getModelFilePublicUrl(path);
}

export async function listModels(query?: string, statusFilter?: string): Promise<Model3D[]> {
  const supabase = createServerClient();

  if (!supabase) {
    let list = [...mockModels];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (statusFilter && statusFilter !== "all") {
      list = list.filter((m) => m.status === statusFilter);
    }
    return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  let dbQuery = supabase.from("models").select("*").order("updated_at", { ascending: false });

  if (query) {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }
  if (statusFilter && statusFilter !== "all") {
    dbQuery = dbQuery.eq("status", statusFilter);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error("Database query error:", error);
    throw new Error(`Error al consultar modelos: ${error.message}`);
  }

  // Populate public URLs directly in-memory (0ms extra network latency)
  return (data || []).map((model) => ({
    ...model,
    viewer_url: model.viewer_path ? getModelFilePublicUrl(model.viewer_path) : null,
    thumbnail_url: model.thumbnail_path ? getModelFilePublicUrl(model.thumbnail_path) : null,
  })) as Model3D[];
}

export async function getModelById(id: string): Promise<Model3D | null> {
  const supabase = createServerClient();

  if (!supabase) {
    const found = mockModels.find((m) => m.id === id);
    return found ? { ...found } : null;
  }

  const { data, error } = await supabase.from("models").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Database error fetching model:", error);
    throw new Error(`Error al obtener el modelo: ${error.message}`);
  }

  if (!data) return null;

  return {
    ...data,
    viewer_url: data.viewer_path ? getModelFilePublicUrl(data.viewer_path) : null,
    thumbnail_url: data.thumbnail_path ? getModelFilePublicUrl(data.thumbnail_path) : null,
  } as Model3D;
}

export async function createModelRecord(params: {
  id?: string;
  name: string;
  glb_path: string;
  thumbnail_path?: string | null;
  file_size: number;
}): Promise<Model3D> {
  const supabase = createServerClient();
  const id = params.id || (typeof crypto !== "undefined" ? crypto.randomUUID() : `m-${Date.now()}`);

  if (!supabase) {
    const newModel: Model3D = {
      id,
      name: params.name,
      source_path: params.glb_path,
      viewer_path: params.glb_path,
      thumbnail_path: params.thumbnail_path || null,
      status: "available",
      version: 1,
      file_size: params.file_size,
      is_locked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      viewer_url: getModelFilePublicUrl(params.glb_path),
      thumbnail_url: params.thumbnail_path ? getModelFilePublicUrl(params.thumbnail_path) : null,
    };
    mockModels.unshift(newModel);
    return newModel;
  }

  // 1. Create model record directly as 'available'
  const { data, error } = await supabase
    .from("models")
    .insert({
      id,
      name: params.name,
      source_path: params.glb_path,
      viewer_path: params.glb_path,
      thumbnail_path: params.thumbnail_path || null,
      status: "available",
      version: 1,
      file_size: params.file_size,
      is_locked: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating model record:", error);
    throw new Error(`Fallo al registrar modelo en base de datos: ${error.message}`);
  }

  // 2. Create model_versions record directly as 'ready'
  await supabase.from("model_versions").insert({
    model_id: id,
    version: 1,
    source_path: params.glb_path,
    viewer_path: params.glb_path,
    status: "ready",
    file_size: params.file_size,
  });

  return {
    ...data,
    viewer_url: data.viewer_path ? getModelFilePublicUrl(data.viewer_path) : null,
    thumbnail_url: data.thumbnail_path ? getModelFilePublicUrl(data.thumbnail_path) : null,
  } as Model3D;
}

export async function updateModelVersion(params: {
  model_id: string;
  new_glb_path: string;
  new_thumbnail_path?: string | null;
  file_size: number;
}): Promise<Model3D> {
  const supabase = createServerClient();
  const { model_id, new_glb_path, new_thumbnail_path, file_size } = params;

  if (!supabase) {
    const existing = mockModels.find((m) => m.id === model_id);
    if (!existing) throw new Error("Modelo no encontrado.");
    const nextVer = existing.version + 1;
    existing.source_path = new_glb_path;
    existing.viewer_path = new_glb_path;
    if (new_thumbnail_path) existing.thumbnail_path = new_thumbnail_path;
    existing.status = "available";
    existing.version = nextVer;
    existing.file_size = file_size;
    existing.updated_at = new Date().toISOString();
    return { ...existing };
  }

  const { data: current, error: getErr } = await supabase
    .from("models")
    .select("*")
    .eq("id", model_id)
    .single();

  if (getErr || !current) {
    throw new Error("No se pudo localizar el modelo a actualizar.");
  }

  const nextVersion = current.version + 1;

  // Register new version in model_versions
  await supabase.from("model_versions").insert({
    model_id,
    version: nextVersion,
    source_path: new_glb_path,
    viewer_path: new_glb_path,
    status: "ready",
    file_size,
  });

  // Update model record
  const { data: updated, error: updateErr } = await supabase
    .from("models")
    .update({
      version: nextVersion,
      source_path: new_glb_path,
      viewer_path: new_glb_path,
      ...(new_thumbnail_path ? { thumbnail_path: new_thumbnail_path } : {}),
      status: "available",
      is_locked: false,
      file_size,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", model_id)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Fallo al actualizar el modelo: ${updateErr?.message || "Error desconocido"}`);
  }

  return {
    ...updated,
    viewer_url: updated.viewer_path ? getModelFilePublicUrl(updated.viewer_path) : null,
    thumbnail_url: updated.thumbnail_path ? getModelFilePublicUrl(updated.thumbnail_path) : null,
  } as Model3D;
}

export async function updateModelStatus(
  id: string,
  status: ModelStatus
): Promise<Model3D> {
  const supabase = createServerClient();

  if (!supabase) {
    const idx = mockModels.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Modelo no encontrado");
    mockModels[idx].status = status;
    mockModels[idx].updated_at = new Date().toISOString();
    return { ...mockModels[idx] };
  }

  // Update status directly in database (no conversion jobs needed)
  const { data: updated, error } = await supabase
    .from("models")
    .update({
      status,
      last_error: status === "processing" ? null : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !updated) {
    throw new Error(`Error al actualizar estado del modelo: ${error?.message || "No encontrado"}`);
  }

  return {
    ...updated,
    viewer_url: updated.viewer_path ? getModelFilePublicUrl(updated.viewer_path) : null,
    thumbnail_url: updated.thumbnail_path ? getModelFilePublicUrl(updated.thumbnail_path) : null,
  } as Model3D;
}

export async function deleteModelRecord(id: string): Promise<boolean> {
  const supabase = createServerClient();

  if (!supabase) {
    mockModels = mockModels.filter((m) => m.id !== id);
    return true;
  }

  const { data: model, error: getErr } = await supabase
    .from("models")
    .select("*")
    .eq("id", id)
    .single();

  if (getErr || !model) {
    throw new Error("El modelo no existe.");
  }

  if (model.is_locked || model.status === "updating") {
    throw new Error("No se puede eliminar el modelo: tiene una actualización en curso.");
  }

  // Collect all storage files for all versions
  const { data: versions } = await supabase
    .from("model_versions")
    .select("source_path, viewer_path")
    .eq("model_id", id);

  const filesToDelete: string[] = [];
  if (model.source_path) filesToDelete.push(model.source_path);
  if (model.viewer_path && !filesToDelete.includes(model.viewer_path)) filesToDelete.push(model.viewer_path);
  if (model.thumbnail_path && !filesToDelete.includes(model.thumbnail_path)) filesToDelete.push(model.thumbnail_path);

  if (versions) {
    for (const v of versions) {
      if (v.source_path && !filesToDelete.includes(v.source_path)) {
        filesToDelete.push(v.source_path);
      }
      if (v.viewer_path && !filesToDelete.includes(v.viewer_path)) {
        filesToDelete.push(v.viewer_path);
      }
    }
  }

  // Delete files from storage
  if (filesToDelete.length > 0) {
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove(filesToDelete);
    } catch (storageErr) {
      console.warn("Storage deletion warning:", storageErr);
    }
  }

  // Delete database record (cascades to model_versions)
  const { error: delErr } = await supabase.from("models").delete().eq("id", id);
  if (delErr) {
    throw new Error(`Fallo al eliminar el registro del modelo: ${delErr.message}`);
  }

  return true;
}
