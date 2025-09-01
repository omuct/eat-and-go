import { supabase } from "@/lib/supabaseClient";

// サインアップ/ログイン後に呼び出す
export async function syncProfileEmail() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // profiles テーブルに email を保存（既存なら update, なければ insert）
  await supabase
    .from("profiles")
    .update({ email: user.email })
    .eq("id", user.id);
}
