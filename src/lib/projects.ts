import { supabase } from "./supabase";
import { deleteVideoFromStorage } from "./storage";

export interface SubtitleWord {
  word: string;
  roman_word?: string;
  start: number;
  end: number;
  confidence: number;
}

export interface SubtitleEntry {
  index: number;
  start: number;
  end: number;
  text: string;
  roman_text?: string;
  words: SubtitleWord[];
}

export interface SavedProject {
  id: string;
  user_id?: string;
  job_id: string;
  name: string;
  title: string;
  filename: string;
  duration: number;
  language: string;
  subtitles: SubtitleEntry[];
  caption_style?: Record<string, unknown>;
  file_size?: number;
  storage_path?: string | null;
  video_url?: string | null;
  status?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Normalizes a database row from public.projects into a clean SavedProject.
 * Handles both the core schema (title, video_url) and the extended schema (name, filename, job_id, storage_path).
 */
export function normalizeProject(raw: Record<string, unknown>): SavedProject {
  const id = String(raw.id || "");
  const title = String(raw.title || raw.name || raw.filename || "Untitled Project");
  const job_id = String(raw.job_id || raw.id || `job_${id}`);
  const duration = Number(raw.duration || 0);
  const language = String(raw.language || "auto");
  const subtitles = (Array.isArray(raw.subtitles) ? raw.subtitles : []) as SubtitleEntry[];
  const caption_style = (raw.caption_style || {}) as Record<string, unknown>;
  const video_url = (raw.video_url as string) || null;
  const storage_path = (raw.storage_path as string) || null;
  const file_size = Number(raw.file_size || 0);
  const status = String(raw.status || "completed");
  const created_at = String(raw.created_at || new Date().toISOString());
  const updated_at = String(raw.updated_at || created_at);

  return {
    id,
    user_id: raw.user_id as string | undefined,
    job_id,
    name: title,
    title,
    filename: title,
    duration,
    language,
    subtitles,
    caption_style,
    file_size,
    storage_path,
    video_url,
    status,
    created_at,
    updated_at,
  };
}

export interface SaveProjectOptions {
  userId: string;
  jobId: string;
  filename: string;
  duration: number;
  language?: string;
  subtitles?: SubtitleEntry[];
  captionStyle?: Record<string, unknown>;
  fileSize?: number;
  storagePath?: string | null;
  videoUrl?: string | null;
  status?: string;
}

/**
 * Persists project metadata to Supabase 'projects' table.
 * First tries the full schema (including job_id, filename, file_size, storage_path).
 * If the database schema has not been migrated yet, falls back seamlessly to the core columns
 * (title, video_url, duration, language, status, subtitles, caption_style).
 */
export async function saveProjectRecord(opts: SaveProjectOptions): Promise<boolean> {
  const {
    userId,
    jobId,
    filename,
    duration,
    language = "auto",
    subtitles = [],
    captionStyle = {},
    fileSize = 0,
    storagePath = null,
    videoUrl = null,
    status = "completed",
  } = opts;

  const title = filename || "Untitled Project";

  // 1. Try full schema upsert
  try {
    const fullPayload: Record<string, unknown> = {
      user_id: userId,
      job_id: jobId,
      title,
      name: title,
      filename: title,
      duration,
      language,
      subtitles,
      caption_style: captionStyle,
      file_size: fileSize,
      storage_path: storagePath,
      video_url: videoUrl,
      status,
      updated_at: new Date().toISOString(),
    };

    const { error: fullError } = await supabase
      .from("projects")
      .upsert(fullPayload, { onConflict: "job_id" });

    if (!fullError) {
      // Keep profiles storage_used_bytes synced
      if (fileSize > 0) {
        updateProfileStorage(userId, fileSize).catch(() => {});
      }
      return true;
    }

    console.warn("Full project upsert failed, attempting fallback:", fullError.message);
  } catch (err) {
    console.warn("Full project upsert exception:", err);
  }

  // 2. Fallback to core columns that are guaranteed to exist in the table
  try {
    const corePayload = {
      user_id: userId,
      title,
      video_url: videoUrl,
      duration,
      language,
      status,
      subtitles,
      caption_style: captionStyle,
      updated_at: new Date().toISOString(),
    };

    const { error: coreError } = await supabase.from("projects").insert(corePayload);
    if (coreError) {
      console.error("Core project insert failed:", coreError.message);
      return false;
    }

    if (fileSize > 0) {
      updateProfileStorage(userId, fileSize).catch(() => {});
    }
    return true;
  } catch (err) {
    console.error("Core project insert exception:", err);
    return false;
  }
}

/**
 * Deletes a project record from Supabase and removes its video from storage if present.
 */
export async function deleteProjectRecord(proj: SavedProject): Promise<boolean> {
  try {
    if (proj.storage_path) {
      await deleteVideoFromStorage(proj.storage_path);
    }
    const { error } = await supabase.from("projects").delete().eq("id", proj.id);
    return !error;
  } catch (err) {
    console.error("Failed to delete project:", err);
    return false;
  }
}

async function updateProfileStorage(userId: string, addedBytes: number) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("storage_used_bytes")
      .eq("id", userId)
      .maybeSingle();

    const current = Number(profile?.storage_used_bytes || 0);
    await supabase
      .from("profiles")
      .update({ storage_used_bytes: current + addedBytes })
      .eq("id", userId);
  } catch {
    // Non-fatal
  }
}
