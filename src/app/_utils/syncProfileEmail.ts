import { supabase } from "@/lib/supabaseClient";

export async function syncProfileEmail() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ email: user.email })
    .eq("id", user.id);
}
