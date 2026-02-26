// Media metadata type definitions for world_lore_entries.metadata JSONB column

export interface DocumentMeta {
  media_type: 'document';
  page_count?: number;
  word_count?: number;
  language?: string;
  headings?: string[];
}

export interface ImageMeta {
  media_type: 'image';
  width?: number;
  height?: number;
  alt_text?: string;
  scene_description?: string;
  dominant_colors?: string[];
}

export interface AudioMeta {
  media_type: 'audio';
  duration_seconds?: number;
  transcript_status?: 'pending' | 'partial' | 'complete';
  speaker_count?: number;
}

export interface VideoMeta {
  media_type: 'video';
  duration_seconds?: number;
  frame_count?: number;
  transcript_status?: 'pending' | 'partial' | 'complete';
}

export interface NoteMeta {
  media_type: 'note';
  source?: string;
  category?: string;
}

export type LoreMediaMeta = DocumentMeta | ImageMeta | AudioMeta | VideoMeta | NoteMeta;

/** Extract typed media metadata from a raw metadata JSONB value */
export function parseLoreMediaMeta(raw: Record<string, unknown>): LoreMediaMeta | null {
  const mediaType = raw?.media_type;
  if (typeof mediaType === 'string' && ['document', 'image', 'audio', 'video', 'note'].includes(mediaType)) {
    return raw as unknown as LoreMediaMeta;
  }
  return null;
}

/** Infer media_type from file MIME type */
export function inferMediaType(fileType: string | null): LoreMediaMeta['media_type'] | null {
  if (!fileType) return null;
  if (fileType.startsWith('image/')) return 'image';
  if (fileType.startsWith('audio/')) return 'audio';
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('word') || fileType.includes('text/')) return 'document';
  return 'note';
}
