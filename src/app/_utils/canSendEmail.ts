import { supabase } from "@/lib/supabaseClient";

/**
 * profilesテーブルに存在するメールアドレスなら送信可能
 */
export async function canSendEmail(email: string): Promise<boolean> {
  if (!email) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("email", email)
    .single();
  return !!data && !error;
}
