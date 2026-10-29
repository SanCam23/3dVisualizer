import { createServerClient, isSupabaseReady } from "@/lib/supabase/server";
import { Model3D, ModelVersion, ConversionJob } from "@/lib/types/models";

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "models3d";

// In-memory store for local demo/fallback when Supabase is not yet connected
let mockModels: Model3D[] = [];

export async function getModelFileSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const supabase = createServerClient();
  if (!supabase) {
    return null;
  }

  try {
    // Generate signed URL valid for 3600 seconds (1 hour)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      // Fallback: check public URL if bucket is public
      const { data: pubData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
      return pubData.publicUrl;
    }
    return data.signedUrl;
  } catch (err) {
    console.error("Error creating signed URL for:", path, err);
    return null;
  }
}

export async function listModels(query?: string, statusFilter?: string): Promise<Model3D[]> {
  const supabase = createServerClient();

  if (!supabase) {
    // Mock fallback mode
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

  // Populate signed URLs for available viewer_paths
  const modelsWithUrls = await Promise.all(
    (data || []).map(async (model) => {
      let viewer_url: string | null = null;
      if (model.viewer_path) {
        viewer_url = await getModelFileSignedUrl(model.viewer_path);
      }
      return {
        ...model,
        viewer_url,
      } as Model3D;
    })
  );

  return modelsWithUrls;
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

  let viewer_url: string | null = null;
  if (data.viewer_path) {
    viewer_url = await getModelFileSignedUrl(data.viewer_path);
  }

  return {
    ...data,
    viewer_url,
  } as Model3D;
}

export async function createModelRecord(params: {
  id?: string;
  name: string;
  source_path: string;
  file_size: number;
}): Promise<Model3D> {
  const supabase = createServerClient();
  const id = params.id || (typeof crypto !== "undefined" ? crypto.randomUUID() : `m-${Date.now()}`);

  if (!supabase) {
    const newModel: Model3D = {
      id,
      name: params.name,
      source_path: params.source_path,
      viewer_path: null,
      status: "processing",
      version: 1,
      file_size: params.file_size,
      is_locked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockModels.unshift(newModel);
    return newModel;
  }

  // 1. Create model record
  const { data, error } = await supabase
    .from("models")
    .insert({
      id,
      name: params.name,
      source_path: params.source_path,
      status: "processing",
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

  // 2. Create model_versions record
  await supabase.from("model_versions").insert({
    model_id: id,
    version: 1,
    source_path: params.source_path,
    status: "processing",
    file_size: params.file_size,
  });

  // 3. Create conversion_jobs record for Blender worker
  const targetGlbPath = `models/${id}/v1/model.glb`;
  await supabase.from("conversion_jobs").insert({
    model_id: id,
    version: 1,
    source_path: params.source_path,
    target_path: targetGlbPath,
    status: "queued",
  });

  return data as Model3D;
}

export async function updateModelVersion(params: {
  model_id: string;
  new_source_path: string;
  file_size: number;
}): Promise<Model3D> {
  const supabase = createServerClient();
  const { model_id, new_source_path, file_size } = params;

  if (!supabase) {
    const existing = mockModels.find((m) => m.id === model_id);
    if (!existing) throw new Error("Modelo no encontrado.");
    if (existing.is_locked || existing.status === "updating") {
      throw new Error("El modelo ya se encuentra en proceso de actualización.");
    }

    const nextVer = existing.version + 1;
    existing.is_locked = true;
    existing.status = "updating";
    existing.version = nextVer;
    existing.updated_at = new Date().toISOString();
    return { ...existing };
  }

  // 1. Check existing model and concurrency lock
  const { data: current, error: getErr } = await supabase
    .from("models")
    .select("*")
    .eq("id", model_id)
    .single();

  if (getErr || !current) {
    throw new Error("No se pudo localizar el modelo a actualizar.");
  }

  if (current.is_locked || current.status === "updating") {
    throw new Error("El modelo tiene una actualización activa en curso. Espere a que finalice.");
  }

  const nextVersion = current.version + 1;
  const targetGlbPath = `models/${model_id}/v${nextVersion}/model.glb`;

  // 2. Lock model & set status to updating
  const { data: updated, error: lockErr } = await supabase
    .from("models")
    .update({
      is_locked: true,
      status: "updating",
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", model_id)
    .select()
    .single();

  if (lockErr) {
    throw new Error(`No se pudo bloquear el modelo para actualización: ${lockErr.message}`);
  }

  // 3. Register new version in model_versions (status: processing)
  await supabase.from("model_versions").insert({
    model_id,
    version: nextVersion,
    source_path: new_source_path,
    status: "processing",
    file_size,
  });

  // 4. Queue conversion job for Blender headless worker
  await supabase.from("conversion_jobs").insert({
    model_id,
    version: nextVersion,
    source_path: new_source_path,
    target_path: targetGlbPath,
    status: "queued",
  });

  return updated as Model3D;
}

export async function deleteModelRecord(id: string): Promise<boolean> {
  const supabase = createServerClient();

  if (!supabase) {
    const idx = mockModels.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    const model = mockModels[idx];
    if (model.is_locked || model.status === "updating") {
      throw new Error("No se puede eliminar un modelo mientras se encuentra en actualización.");
    }
    mockModels.splice(idx, 1);
    return true;
  }

  // 1. Check current status
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

  // 2. Collect all storage files for all versions
  const { data: versions } = await supabase
    .from("model_versions")
    .select("source_path, viewer_path")
    .eq("model_id", id);

  const filesToDelete: string[] = [];
  if (model.source_path) filesToDelete.push(model.source_path);
  if (model.viewer_path) filesToDelete.push(model.viewer_path);

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

  // 3. Delete files from storage
  if (filesToDelete.length > 0) {
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove(filesToDelete);
    } catch (storageErr) {
      console.warn("Storage deletion warning (some files might not exist):", storageErr);
    }
  }

  // 4. Delete database record (cascades to model_versions and conversion_jobs)
  const { error: delErr } = await supabase.from("models").delete().eq("id", id);
  if (delErr) {
    throw new Error(`Fallo al eliminar el registro del modelo: ${delErr.message}`);
  }

  return true;
}

