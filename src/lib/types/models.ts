export type ModelStatus = 
  | 'pending_upload' 
  | 'processing' 
  | 'available' 
  | 'error' 
  | 'updating';

export type VersionStatus = 
  | 'processing' 
  | 'ready' 
  | 'failed' 
  | 'superseded' 
  | 'cleaned_up';

export type JobStatus = 
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed';

export interface Model3D {
  id: string;
  name: string;
  source_path: string;       // Storage path of .blend
  viewer_path?: string | null; // Storage path of .glb
  thumbnail_path?: string | null;
  status: ModelStatus;
  version: number;
  file_size?: number;
  is_locked: boolean;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
  
  // Signed / computed URLs for client viewer and cards
  viewer_url?: string | null;
  source_url?: string | null;
  thumbnail_url?: string | null;
}

export interface ModelVersion {
  id: string;
  model_id: string;
  version: number;
  source_path: string;
  viewer_path?: string | null;
  status: VersionStatus;
  file_size?: number;
  error_message?: string | null;
  created_at: string;
}

export interface ConversionJob {
  id: string;
  model_id: string;
  version: number;
  source_path: string;
  target_path: string;
  status: JobStatus;
  attempts: number;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface UploadPayload {
  name: string;
  file: File;
}

export interface UpdatePayload {
  model_id: string;
  file: File;
}

export interface SystemStatus {
  isSupabaseConfigured: boolean;
  supabaseUrl?: string;
  isBlenderAvailable: boolean;
  blenderPath?: string;
  workerQueueCount: number;
  environment: string;
}

