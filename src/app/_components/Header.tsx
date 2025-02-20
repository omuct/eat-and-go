import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ShoppingCart, Settings } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const Header = () => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .single();

        if (!profileError && profile?.is_admin) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
      }
    };

    checkAdminStatus();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex justify-between items-center p-4 bg-white shadow-md">
      <div
        onClick={() => router.push("/")}
        className="text-xl font-bold cursor-pointer hover:text-blue-600 transition-colors"
      >
        学食モバイルオーダー
      </div>
      <div className="flex items-center space-x-4">
        <div
          onClick={() => router.push("/orders/cart")}
          className="cursor-pointer hover:text-blue-600 transition-colors"
        >
          <ShoppingCart size={24} />
        </div>
        {isAdmin && (
          <div
            onClick={() => router.push("/admin")}
            className="cursor-pointer hover:text-blue-600 transition-colors flex items-center"
          >
            <Settings size={24} />
            <span className="ml-1 text-sm">管理者</span>
          </div>
        )}
        <div
          onClick={() => router.push("/user")}
          className="cursor-pointer hover:text-blue-600 transition-colors"
        >
          <User size={24} />
        </div>
        <button
          onClick={handleLogout}
          className="hover:text-red-600 transition-colors"
        >
          <LogOut size={24} />
        </button>
      </div>
    </header>
  );
};

export default Header;
