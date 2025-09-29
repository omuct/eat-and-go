import { supabase } from "@/lib/supabaseClient";

export async function canSendEmail(email: string): Promise<boolean> {
  if (!email) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("email", email)
    .single();
  return !!data && !error;
}
