// hooks/useAdmin.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          router.push("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (profileError || !profile?.is_admin) {
          router.push("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Admin check error:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [router]);

  return { isAdmin, loading };
};
