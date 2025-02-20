// src/app/admin/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { List, Users, ShoppingBag } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();

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
      path: "/admin/orders",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-6">管理者ダッシュボード</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => router.push(item.path)}
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4 text-blue-600">
                {item.icon}
                <h2 className="text-xl font-semibold ml-3">{item.title}</h2>
              </div>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
