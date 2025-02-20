"use client";

import { useAdmin } from "../../hocks/useAdmin";
import Header from "@/app/_components/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      <Header />
      <div className="container mx-auto px-4">{children}</div>
    </div>
  );
}
