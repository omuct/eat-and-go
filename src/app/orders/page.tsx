"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";

export default function Orders() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // 未認証の場合はログインページにリダイレクト
        router.push("/login");
      }
    };

    checkUser();
  }, []);

  return (
    <div>
      <Header />
      <div className="p-8">
        <h1 className="text-2xl mb-4">注文一覧</h1>
      </div>
    </div>
  );
}
