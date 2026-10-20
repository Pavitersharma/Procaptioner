import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export interface UserUsage {
  plan: "free" | "creator_pro";
  storageUsedBytes: number;
  storageLimitBytes: number;
  storagePercent: number;
  transcriptionSecondsUsed: number;
  transcriptionUsedSeconds: number;
  transcriptionRemainingSeconds: number;
  transcriptionLimitSeconds: number;
  transcriptionPercent: number;
  audioCleanUsed: number;
  audioCleanLimit: number;
  projectCount: number;
}

const DEFAULT_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5.0 GB
const DEFAULT_TRANSCRIPTION_LIMIT = 3600; // 60 minutes = 3600 seconds
const DEFAULT_AUDIO_CLEAN_LIMIT = 3;

export const DEFAULT_USAGE: UserUsage = {
  plan: "free",
  storageUsedBytes: 0,
  storageLimitBytes: DEFAULT_STORAGE_LIMIT,
  storagePercent: 0,
  transcriptionSecondsUsed: 0,
  transcriptionUsedSeconds: 0,
  transcriptionRemainingSeconds: DEFAULT_TRANSCRIPTION_LIMIT,
  transcriptionLimitSeconds: DEFAULT_TRANSCRIPTION_LIMIT,
  transcriptionPercent: 0,
  audioCleanUsed: 0,
  audioCleanLimit: DEFAULT_AUDIO_CLEAN_LIMIT,
  projectCount: 0,
};

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatMinutes(seconds: number): string {
  const mins = seconds / 60;
  if (mins < 1) return `${Math.round(seconds)} sec`;
  if (mins < 60) return `${mins.toFixed(1)} min`;
  const hours = Math.floor(mins / 60);
  const remMins = Math.round(mins % 60);
  return `${hours}h ${remMins}m`;
}

export function validateUploadQuota(
  file: File,
  usage: UserUsage,
): { allowed: boolean; valid: boolean; reason?: string } {
  // 1. Check storage quota
  const newStorage = usage.storageUsedBytes + file.size;
  if (newStorage > usage.storageLimitBytes) {
    const remaining = Math.max(0, usage.storageLimitBytes - usage.storageUsedBytes);
    return {
      allowed: false,
      valid: false,
      reason: `Storage quota exceeded. This file is ${formatBytes(file.size)}, but you only have ${formatBytes(remaining)} remaining of your ${formatBytes(usage.storageLimitBytes)} quota. Delete older projects or upgrade to Creator Pro.`,
    };
  }

  // 2. Check total monthly transcription limit
  if (usage.transcriptionSecondsUsed >= usage.transcriptionLimitSeconds) {
    return {
      allowed: false,
      valid: false,
      reason: "Monthly transcription limit of 60 minutes reached. Please upgrade to Creator Pro for extended allowances.",
    };
  }

  return { allowed: true, valid: true };
}

interface UsageContextType {
  usage: UserUsage;
  loadingUsage: boolean;
  refreshUsage: () => Promise<void>;
}

const UsageContext = createContext<UsageContextType>({
  usage: DEFAULT_USAGE,
  loadingUsage: false,
  refreshUsage: async () => {},
});

export function UsageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UserUsage>(DEFAULT_USAGE);
  const [loadingUsage, setLoadingUsage] = useState(false);

  const calculateUsage = useCallback(async () => {
    if (!user) {
      setUsage(DEFAULT_USAGE);
      return;
    }

    setLoadingUsage(true);
    try {
      // 1. Fetch user projects to calculate exact live usage safely
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id);

      let totalStorage = 0;
      let totalDuration = 0;
      let totalAudioCleans = 0;
      const count = projects?.length || 0;

      if (!projectsError && projects) {
        for (const p of projects as Record<string, unknown>[]) {
          totalStorage += Number(p.file_size || 0);
          totalDuration += Number(p.duration || 0);
          if (p.audio_clean_applied) totalAudioCleans += 1;
        }
      }

      // 2. Fetch user profile for plan and storage
      let plan: "free" | "creator_pro" = "free";
      const storageLimit = DEFAULT_STORAGE_LIMIT;
      const transcriptionLimit = DEFAULT_TRANSCRIPTION_LIMIT;
      const audioCleanLimit = DEFAULT_AUDIO_CLEAN_LIMIT;

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, storage_used_bytes")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        if (profile.plan === "creator_pro") plan = "creator_pro";
        const profileBytes = Number(profile.storage_used_bytes || 0);
        if (profileBytes > totalStorage) {
          totalStorage = profileBytes;
        }
      }

      const storagePercent = Math.min(100, Math.round((totalStorage / storageLimit) * 100));
      const transcriptionPercent = Math.min(
        100,
        Math.round((totalDuration / transcriptionLimit) * 100),
      );

      setUsage({
        plan,
        storageUsedBytes: totalStorage,
        storageLimitBytes: storageLimit,
        storagePercent,
        transcriptionSecondsUsed: totalDuration,
        transcriptionUsedSeconds: totalDuration,
        transcriptionRemainingSeconds: Math.max(0, transcriptionLimit - totalDuration),
        transcriptionLimitSeconds: transcriptionLimit,
        transcriptionPercent,
        audioCleanUsed: totalAudioCleans,
        audioCleanLimit,
        projectCount: count,
      });
    } catch (err) {
      console.warn("Could not calculate user usage:", err);
    } finally {
      setLoadingUsage(false);
    }
  }, [user]);

  useEffect(() => {
    calculateUsage();
  }, [calculateUsage]);

  return (
    <UsageContext.Provider value={{ usage, loadingUsage, refreshUsage: calculateUsage }}>
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  return useContext(UsageContext);
}
