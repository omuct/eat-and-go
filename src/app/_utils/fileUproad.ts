// src/app/_utils/fileUproad.ts
import { SupabaseClient } from "@supabase/supabase-js";

export const uploadImage = async (supabase: SupabaseClient, file: File) => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from("announcements")
      .upload(filePath, file);

    if (error) {
      throw error;
    }

    return data.path;
  } catch (error) {
    console.error("画像アップロードエラー:", error);
    throw error;
  }
};
