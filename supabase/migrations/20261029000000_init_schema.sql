-- ==============================================================================
-- 3D VISUALIZER DATABASE SCHEMA & MIGRATION
-- Supports: Models, Versioning, Safe Updates, Blender Conversion Queue, Audit
-- ==============================================================================

-- 1. Enable pgcrypto / uuid extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Models Table
CREATE TABLE IF NOT EXISTS public.models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    source_path TEXT NOT NULL,
    viewer_path TEXT,
    thumbnail_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending_upload' CHECK (status IN ('pending_upload', 'processing', 'available', 'error', 'updating')),
    version INTEGER NOT NULL DEFAULT 1,
    file_size BIGINT DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for listing and sorting
CREATE INDEX IF NOT EXISTS idx_models_updated_at ON public.models(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_models_status ON public.models(status);
CREATE INDEX IF NOT EXISTS idx_models_name ON public.models(name text_pattern_ops);

-- 3. Model Versions Table (Audit & Safe Rollback History)
CREATE TABLE IF NOT EXISTS public.model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    source_path TEXT NOT NULL,
    viewer_path TEXT,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed', 'superseded', 'cleaned_up')),
    file_size BIGINT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_model_version UNIQUE (model_id, version)
);

CREATE INDEX IF NOT EXISTS idx_model_versions_model_id ON public.model_versions(model_id);

-- 4. Conversion Jobs Queue (Worker interface)
CREATE TABLE IF NOT EXISTS public.conversion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status ON public.conversion_jobs(status, created_at ASC);

-- 5. Automatic trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_models_updated_at ON public.models;
CREATE TRIGGER set_models_updated_at
    BEFORE UPDATE ON public.models
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_conversion_jobs_updated_at ON public.conversion_jobs;
CREATE TRIGGER set_conversion_jobs_updated_at
    BEFORE UPDATE ON public.conversion_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. Storage Bucket initialization (Supabase Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'models3d',
    'models3d',
    true, -- Set to true for direct CDN/viewer access or false with signed URLs
    268435456, -- 256 MB max file limit
    ARRAY['application/octet-stream', 'model/gltf-binary', 'model/gltf+json', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 7. Row Level Security (RLS)
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_jobs ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (public library view)
CREATE POLICY "Allow public read access on models"
    ON public.models FOR SELECT USING (true);

CREATE POLICY "Allow public insert on models"
    ON public.models FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on models"
    ON public.models FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on models"
    ON public.models FOR DELETE USING (true);

-- Model versions policies
CREATE POLICY "Allow public read access on model_versions"
    ON public.model_versions FOR SELECT USING (true);

CREATE POLICY "Allow public write access on model_versions"
    ON public.model_versions FOR ALL USING (true);

-- Conversion jobs policies
CREATE POLICY "Allow public read access on conversion_jobs"
    ON public.conversion_jobs FOR SELECT USING (true);

CREATE POLICY "Allow public write access on conversion_jobs"
    ON public.conversion_jobs FOR ALL USING (true);

-- Storage Policies for models3d bucket
CREATE POLICY "Allow public download from models3d"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'models3d');

CREATE POLICY "Allow public upload to models3d"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'models3d');

CREATE POLICY "Allow public update in models3d"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'models3d');

CREATE POLICY "Allow public delete in models3d"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'models3d');

