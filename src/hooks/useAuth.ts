import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export type UserRole = "admin" | "store_staff" | "user";

interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  is_admin: boolean;
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
  stores?: number[];
}

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, name, role, is_admin, phone, address, created_at, updated_at"
          )
          .eq("id", session.user.id)
          .single();

        if (profileError || !profile) {
          setUser(null);
          setLoading(false);
          return;
        }

        const typedProfile = {
          id: String(profile.id),
          name: String(profile.name || ""),
          role: profile.role as UserRole,
          is_admin: Boolean(profile.is_admin),
          phone: profile.phone ? String(profile.phone) : undefined,
          address: profile.address ? String(profile.address) : undefined,
          created_at: profile.created_at
            ? String(profile.created_at)
            : undefined,
          updated_at: profile.updated_at
            ? String(profile.updated_at)
            : undefined,
        };

        let stores: number[] = [];
        if (typedProfile.role === "store_staff") {
          const { data: storeData, error: storeError } = await supabase
            .from("store_staff")
            .select("store_id")
            .eq("user_id", session.user.id);

          if (!storeError && storeData) {
            stores = storeData
              .map((s: any) => {
                const storeId = Number(s.store_id);
                return isNaN(storeId) ? null : storeId;
              })
              .filter((id): id is number => id !== null);
          }
        }

        setUser({
          ...typedProfile,
          is_admin: typedProfile.is_admin || typedProfile.role === "admin",
          stores,
        });
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (requiredRole: UserRole | UserRole[]) => {
    if (!user) return false;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  };

  const canAccessStore = (storeId: number) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "store_staff")
      return user.stores?.includes(storeId) || false;
    return false;
  };

  const canAccessAdmin = () => {
    return user && (user.role === "admin" || user.role === "store_staff");
  };

  const canAccessFullAdmin = () => {
    return user && user.role === "admin";
  };

  const redirectIfUnauthorized = (path: string) => {
    if (!user) {
      router.push("/login");
      return true;
    }

    if (user.role === "user" && path.startsWith("/admin")) {
      router.push("/");
      return true;
    }
    return false;
  };

  return {
    user,
    loading,
    hasRole,
    canAccessStore,
    canAccessAdmin,
    canAccessFullAdmin,
    redirectIfUnauthorized,
    isAdmin: user?.role === "admin",
    isStoreStaff: user?.role === "store_staff",
    isUser: user?.role === "user",
  };
};
