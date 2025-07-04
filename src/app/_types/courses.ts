export interface UserProfile {
  id: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
  role: "admin" | "store_staff" | "user";
  phone: string | null;
  address: string | null;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
  opening_hours: string;
  description?: string;
  image_url?: string;
  created_at?: string;
}

export interface StoreStaff {
  id: string;
  user_id: string;
  store_id: number;
  store_name?: string;
}

export type UserRole = "admin" | "store_staff" | "user";
