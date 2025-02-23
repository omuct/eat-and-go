// src/app/_utils/imageUrl.ts
import { supabase } from "@/lib/supabaseClient";

export const getStorageImageUrl = (path: string | null) => {
  if (!path) return null;

  try {
    const { data } = supabase.storage.from("announcements").getPublicUrl(path);

    // デバッグ用
    console.log("Getting image URL for path:", path);
    console.log("Generated URL:", data.publicUrl);

    return data.publicUrl;
  } catch (error) {
    console.error("Error getting public URL:", error);
    return null;
  }
};
