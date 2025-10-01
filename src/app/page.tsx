"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push(`/user/${session.user.id}/account`);
      } else {
        router.push("/login");
      }
    };
    checkAuthStatus();
  }, []);
  return null;
}
