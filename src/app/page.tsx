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
        // ログイン済みの場合は注文ページへ
        router.push("/orders");
      } else {
        // 未ログインの場合はログインページへ
        router.push("/login");
      }
    };

    checkAuthStatus();
  }, []);

  return null;
}
