import { supabase } from "./supabase";

export interface StorageUploadResult {
  storagePath: string;
  publicUrl: string;
  videoUrl: string;
}

/**
 * Upload an actual video file to the Supabase Storage 'videos' bucket.
 * Files are isolated by user ID: `videos/{userId}/{timestamp}_{sanitized_name}`
 */
export async function uploadVideoToStorage(
  file: File,
  userId: string,
): Promise<StorageUploadResult | null> {
  try {
    const ext = file.name.split(".").pop() || "mp4";
    const cleanBase = file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const storagePath = `${userId}/${Date.now()}_${cleanBase}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase Storage upload warning (falling back to local):", uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from("videos").getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: urlData.publicUrl,
      videoUrl: urlData.publicUrl,
    };
  } catch (err) {
    console.warn("Storage upload exception:", err);
    return null;
  }
}

/**
 * Delete a video file from the Supabase Storage bucket.
 */
export async function deleteVideoFromStorage(storagePath: string): Promise<boolean> {
  if (!storagePath) return false;
  try {
    const { error } = await supabase.storage.from("videos").remove([storagePath]);
    if (error) {
      console.warn("Supabase Storage deletion warning:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Storage deletion exception:", err);
    return false;
  }
}
