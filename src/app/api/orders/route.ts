import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  const { userId, itemId, quantity, selectedType } = await request.json();

  try {
    const { data, error } = await supabase.from("cart").insert([
      {
        user_id: userId,
        item_id: itemId,
        quantity,
        selected_type: selectedType,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ message: "商品がカートに追加されました" });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(
      JSON.stringify({
        error: "カートに商品を追加できませんでした",
        details: errorMessage,
      }),
      {
        status: 500,
      }
    );
  }
}
