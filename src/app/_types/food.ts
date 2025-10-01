// src/app/_types/food.ts
export type FoodCategory =
  | "丼"
  | "麺"
  | "季節限定"
  | "ホットスナック"
  | "その他";

export type WasteCategory = "プラスチック" | "燃えるゴミ";

export const CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: "丼", label: "丼もの" },
  { value: "麺", label: "麺類" },
  { value: "季節限定", label: "季節限定" },
  { value: "ホットスナック", label: "ホットスナック" },
  { value: "その他", label: "その他" },
];

export const WASTE_CATEGORIES: { value: WasteCategory; label: string }[] = [
  { value: "プラスチック", label: "プラスチック" },
  { value: "燃えるゴミ", label: "燃えるゴミ" },
];

export interface Food {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string;
  category: FoodCategory;
  waste_category?: WasteCategory;
  is_published: boolean;
  publish_start_date: string | null;
  publish_end_date: string | null;
  store_name: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  phone: string;
  opening_hours: string;
  description?: string;
  image_url?: string;
}
