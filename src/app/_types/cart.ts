export interface CartItem {
  id: string; // UUIDなのでstring型
  food_id: string; // UUIDなのでstring型
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  size: "regular" | "large";
  is_takeout: boolean;
  total_price: number;
}
