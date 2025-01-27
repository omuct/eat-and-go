import React from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ShoppingCart } from "lucide-react"; // ShoppingCartを追加
import { supabase } from "@/lib/supabaseClient";

const Header = () => {
  const router = useRouter();

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
