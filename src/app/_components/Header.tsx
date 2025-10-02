import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ShoppingCart, Settings, Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";

interface HeaderProps {
  cartCount?: number;
  cartAnimating?: boolean;
}

const Header = ({ cartCount = 0, cartAnimating = false }: HeaderProps) => {
  const router = useRouter();
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
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
          .select("role, is_admin")
          .eq("id", session.user.id)
          .single();

        if (!profileError && profile) {
          // adminまたはstore_staffの場合は管理者機能にアクセス可能
          setCanAccessAdmin(
            profile.role === "admin" || profile.role === "store_staff"
          );
        }
      } catch (error) {
        console.error("Error checking admin access:", error);
      }
    };

    checkAdminAccess();
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
        className="flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors relative"
      >
        {cartAnimating ? (
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -15, 15, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.5 }}
          >
            <ShoppingCart size={24} />
          </motion.div>
        ) : (
          <ShoppingCart size={24} />
        )}
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {cartCount}
          </span>
        )}
        <span className="text-xs mt-1 sm:hidden">カート</span>
      </div>
      {/* 地図リンクアイコン追加 */}
      <div
        onClick={() => {
          router.push("/orders/map");
        }}
        className="flex flex-col items-center cursor-pointer hover:text-blue-600 transition-colors"
      >
        {/* LucideのMapPinアイコンを利用 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2zm0 10c-4.418 0-8-4.03-8-9 0-4.418 3.582-8 8-8s8 3.582 8 8c0 4.97-3.582 9-8 9z"
          />
        </svg>
        <span className="text-xs mt-1">地図</span>
      </div>
      {canAccessAdmin && (
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
    <header className="bg-white shadow-md sticky top-0 z-50 sm:static">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div
            onClick={() => router.push("/orders")}
            className="text-lg sm:text-xl font-bold cursor-pointer hover:text-blue-600 transition-colors"
          >
            EAT & GO
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
