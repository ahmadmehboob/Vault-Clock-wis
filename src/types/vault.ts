export type MediaType = 'photo' | 'video';

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  dataUrl: string; // Base64 data URL or Blob URL
  thumbnailUrl?: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  album: string;
  tags: string[];
  width?: number;
  height?: number;
  duration?: number; // In seconds for videos
  isEncrypted?: boolean;
}

export interface NoteChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  category: string;
  tags: string[];
  checklist?: NoteChecklistItem[];
  createdAt: number;
  updatedAt: number;
  isEncrypted?: boolean;
}

export interface IntruderLog {
  id: string;
  timestamp: number;
  enteredInput: string;
  snapshotUrl?: string; // Captured camera image or silhouette
  reason: string;
}

export interface SecurityConfig {
  masterPin: string; // default "1234"
  decoyPin: string; // default "9999"
  triggerKey: '=' | '%' | 'long_equals';
  autoLockDelaySeconds: number; // 0 (off), 30, 60, 300
  lockOnWindowBlur: boolean; // flip-to-hide
  maxFailedAttemptsBeforeWipe: number; // 0 = disabled, e.g. 5
  intruderDetectionEnabled: boolean;
  intruderCameraEnabled: boolean;
  failedAttemptsCount: number;
  camouflageStyle: 'apple_dark' | 'scientific_slate' | 'retro_oled' | 'clean_light';
  hasCompletedFirstTimeSetup: boolean;
}

export interface VaultStats {
  photoCount: number;
  videoCount: number;
  noteCount: number;
  totalSizeBytes: number;
  securityHealthScore: number;
}
