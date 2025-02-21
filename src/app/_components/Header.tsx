import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ShoppingCart, Settings, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const Header = () => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const MenuItems = () => (
    <>
      <div
        onClick={() => {
          router.push("/orders/cart");
          setIsMenuOpen(false);
        }}
        className="flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors"
      >
        <ShoppingCart size={24} />
        <span className="text-xs mt-1 sm:hidden">カート</span>
      </div>
      {isAdmin && (
        <div
          onClick={() => {
            router.push("/admin");
            setIsMenuOpen(false);
          }}
          className="flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors"
        >
          <Settings size={24} />
          <span className="text-xs mt-1">管理者</span>
        </div>
      )}
      <div
        onClick={() => {
          router.push("/user");
          setIsMenuOpen(false);
        }}
        className="flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors"
      >
        <User size={24} />
        <span className="text-xs mt-1 sm:hidden">アカウント</span>
      </div>
      <button
        onClick={handleLogout}
        className="flex flex-col items-center hover:text-red-600 transition-colors"
      >
        <LogOut size={24} />
        <span className="text-xs mt-1 sm:hidden">ログアウト</span>
      </button>
    </>
  );

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div
            onClick={() => router.push("/")}
            className="text-lg sm:text-xl font-bold cursor-pointer hover:text-blue-600 transition-colors"
          >
            学食モバイルオーダー
          </div>

          {/* PC・タブレット用メニュー */}
          <div className="hidden sm:flex items-center space-x-4">
            <MenuItems />
          </div>

          {/* モバイル用メニューボタン */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="sm:hidden p-2"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* モバイル用ドロップダウンメニュー */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-gray-200">
          <div className="flex justify-around py-4 px-2 bg-white">
            <MenuItems />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
