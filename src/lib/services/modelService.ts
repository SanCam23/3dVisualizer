import { createServerClient, isSupabaseReady } from "@/lib/supabase/server";
import { Model3D, ModelVersion, ConversionJob, ModelStatus } from "@/lib/types/models";

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

  // Populate signed URLs for available viewer_paths and thumbnails
  const modelsWithUrls = await Promise.all(
    (data || []).map(async (model) => {
      let viewer_url: string | null = null;
      let thumbnail_url: string | null = null;
      if (model.viewer_path) {
        viewer_url = await getModelFileSignedUrl(model.viewer_path);
      }
      if (model.thumbnail_path) {
        thumbnail_url = await getModelFileSignedUrl(model.thumbnail_path);
      }
      return {
        ...model,
        viewer_url,
        thumbnail_url,
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
  let thumbnail_url: string | null = null;
  if (data.viewer_path) {
    viewer_url = await getModelFileSignedUrl(data.viewer_path);
  }
  if (data.thumbnail_path) {
    thumbnail_url = await getModelFileSignedUrl(data.thumbnail_path);
  }

  return {
    ...data,
    viewer_url,
    thumbnail_url,
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

  let viewer_url: string | null = null;
  let thumbnail_url: string | null = null;
  if (data.viewer_path) {
    viewer_url = await getModelFileSignedUrl(data.viewer_path);
  }
  if (data.thumbnail_path) {
    thumbnail_url = await getModelFileSignedUrl(data.thumbnail_path);
  }

  return {
    ...data,
    viewer_url,
    thumbnail_url,
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

  // 1. Check existing model
  const { data: current, error: getErr } = await supabase
    .from("models")
    .select("*")
    .eq("id", model_id)
    .single();

  if (getErr || !current) {
    throw new Error("No se pudo localizar el modelo a actualizar.");
  }

  const nextVersion = current.version + 1;

  // 2. Register new version in model_versions (ready immediately)
  await supabase.from("model_versions").insert({
    model_id,
    version: nextVersion,
    source_path: new_glb_path,
    viewer_path: new_glb_path,
    status: "ready",
    file_size,
  });

  // 3. Update model record (available immediately)
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

  let viewer_url: string | null = null;
  let thumbnail_url: string | null = null;
  if (updated.viewer_path) {
    viewer_url = await getModelFileSignedUrl(updated.viewer_path);
  }
  if (updated.thumbnail_path) {
    thumbnail_url = await getModelFileSignedUrl(updated.thumbnail_path);
  }

  return {
    ...updated,
    viewer_url,
    thumbnail_url,
  } as Model3D;
}

export async function updateModelStatus(
  id: string,
  status: ModelStatus,
  queueJob: boolean = false
): Promise<Model3D> {
  const supabase = createServerClient();

  if (!supabase) {
    const idx = mockModels.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Modelo no encontrado");
    mockModels[idx].status = status;
    mockModels[idx].updated_at = new Date().toISOString();
    return { ...mockModels[idx] };
  }

  // 1. Update model record in database
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

  // 2. If status is set to processing and queueJob is true, queue a conversion job
  if (status === "processing" && queueJob && updated.source_path) {
    const targetGlb = updated.viewer_path || updated.source_path.replace(/source\.[^.]+$/, "model.glb");
    try {
      await supabase.from("conversion_jobs").insert({
        model_id: id,
        version: updated.version || 1,
        source_path: updated.source_path,
        target_path: targetGlb,
        status: "queued",
      });
    } catch (jobErr) {
      console.warn("Notice: conversion_job could not be inserted (might already exist):", jobErr);
    }
  } else if (status === "available") {
    // If switching back to available, remove any queued jobs so worker doesn't process them
    try {
      await supabase
        .from("conversion_jobs")
        .delete()
        .eq("model_id", id)
        .eq("status", "queued");
    } catch (cleanErr) {
      console.warn("Notice: could not cancel queued conversion_jobs:", cleanErr);
    }
  }

  // 3. Return model with signed URLs
  let viewer_url: string | null = null;
  let thumbnail_url: string | null = null;
  if (updated.viewer_path) {
    viewer_url = await getModelFileSignedUrl(updated.viewer_path);
  }
  if (updated.thumbnail_path) {
    thumbnail_url = await getModelFileSignedUrl(updated.thumbnail_path);
  }

  return {
    ...updated,
    viewer_url,
    thumbnail_url,
  } as Model3D;
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

