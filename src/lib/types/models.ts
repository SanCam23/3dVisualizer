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

export interface Model3D {
  id: string;
  name: string;
  source_path: string;         // Storage path of native .glb
  viewer_path?: string | null;   // Storage path of .glb
  thumbnail_path?: string | null;
  status: ModelStatus;
  version: number;
  file_size?: number;
  is_locked: boolean;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
  
  // Direct public URLs for client viewer and cards
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

export interface UploadPayload {
  name: string;
  file: File;
}

export interface UpdatePayload {
  model_id: string;
  file: File;
}
