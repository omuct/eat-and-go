"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  List,
  Users,
  ShoppingBag,
  Calendar,
  Bell,
  Store,
  MapPin,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const router = useRouter();
  const [isStaff, setIsStaff] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const menuItems = [
    {
      title: "メニュー管理",
      description: "商品の追加・編集・削除、公開設定",
      icon: <List size={24} />,
      path: "/admin/add-menu",
    },
    {
      title: "ユーザー管理",
      description: "ユーザー情報の確認・管理",
      icon: <Users size={24} />,
      path: "/admin/users",
    },
    {
      title: "注文管理",
      description: "注文履歴・状況の確認",
      icon: <ShoppingBag size={24} />,
      path: "/admin/order-history",
    },
    {
      title: "営業カレンダー",
      description: "営業時間と休業日の管理",
      icon: <Calendar size={24} />,
      path: "/admin/business-time",
    },
    {
      title: "お知らせ管理",
      description: "お知らせの作成・編集・公開設定",
      icon: <Bell size={24} />,
      path: "/admin/announcement",
    },
    {
      title: "お店管理",
      description: "お店の作成・編集・公開設定",
      icon: <Store size={24} />,
      path: "/admin/shops",
    },
    {
      title: "場所管理",
      description: "会場・地図の新規登録・編集・公開設定",
      icon: <MapPin size={24} />,
      path: "/admin/map",
    },
    {
      title: "ゴミ箱管理",
      description: "地図上のゴミ箱の追加・一覧・ごみ量の確認",
      icon: <Trash2 size={24} />,
      path: "/admin/trash",
    },
  ];

  useEffect(() => {
    const init = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) {
          router.push("/login");
          return;
        }
        // プロフィールから役割/管理者フラグを確認
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_admin")
          .eq("id", session.user.id)
          .single();

        const role = (profile as any)?.role as string | undefined;
        const isAdmin = Boolean((profile as any)?.is_admin);

        let staff = false;
        if (!isAdmin) {
          if (role === "staff") {
            staff = true;
          } else {
            const { data: storeStaffRows } = await supabase
              .from("store_staff")
              .select("id")
              .eq("user_id", session.user.id)
              .limit(1);
            staff = Array.isArray(storeStaffRows) && storeStaffRows.length > 0;
          }
        }
        setIsStaff(staff);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const visibleMenuItems = isStaff
    ? menuItems.filter((m) =>
        ["メニュー管理", "注文管理", "お店管理"].includes(m.title)
      )
    : menuItems;

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-6">管理者ダッシュボード</h1>

        {loading ? (
          <div className="text-gray-500">読み込み中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleMenuItems.map((item) => (
              <div
                key={item.path}
                onClick={() => router.push(item.path)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <div className="flex items-center mb-4 text-gray-600">
                  {item.icon}
                  <h2 className="text-xl font-semibold ml-3">{item.title}</h2>
                </div>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
