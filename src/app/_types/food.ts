// src/app/_types/food.ts
export type FoodCategory =
  | "丼"
  | "麺"
  | "季節限定"
  | "ホットスナック"
  | "その他";

export const CATEGORIES: FoodCategory[] = [
  "丼",
  "麺",
  "季節限定",
  "ホットスナック",
  "その他",
];

export interface Food {
  id: number;
  name: string;
  price: number;
  description: string | null;
  image_url: string;
  category: FoodCategory;
  is_published: boolean;
  publish_start_date: string | null;
  publish_end_date: string | null;
}
