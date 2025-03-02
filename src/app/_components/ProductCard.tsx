import React, { useState, useEffect } from "react";
import { Food } from "@/app/_types/food";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  food: Food;
  onAddToCart: (selectedType: string, additionalPrice: number) => void;
};

const ProductCard: React.FC<Props> = ({ food, onAddToCart }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [additionalPrice, setAdditionalPrice] = useState(0);
  const [otherFoods, setOtherFoods] = useState<Food[]>([]);

  useEffect(() => {
    const fetchOtherFoods = async () => {
      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .eq("category", "その他");

      if (error) {
        console.error("Error fetching other foods:", error);
      } else {
        setOtherFoods(data);
      }
    };

    if (food.category === "その他") {
      fetchOtherFoods();
    }
  }, [food.category]);

  const handleAddToCart = () => {
    onAddToCart(selectedType, additionalPrice);
    setShowModal(false);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setAdditionalPrice(100);
    } else {
      setAdditionalPrice(0);
    }
  };

  return (
    <div className="border p-4 rounded shadow hover:shadow-md transition-shadow">
      <img
        src={food.image_url}
        alt={food.name}
        className="w-full h-48 object-cover mb-4"
      />
      <h2 className="text-xl mb-2">{food.name}</h2>
      <p className="text-gray-700 line-clamp-2">{food.description}</p>
      <p className="text-gray-900 font-bold mt-2">¥{food.price}</p>
      <button className="mt-2 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors">

        カートに追加
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">商品詳細</h3>
            <p className="mb-4">{food.description}</p>
            {food.category === "麺" && (
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    onChange={handleCheckboxChange}
                    className="mr-2"
                  />
                  麺大盛り (+¥100)
                </label>
              </div>
            )}
            {food.category === "丼" && (
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    onChange={handleCheckboxChange}
                    className="mr-2"
                  />
                  ごはん大盛り (+¥100)
                </label>
              </div>
            )}
            {food.category === "その他" && (
              <div className="mb-4">
                <label className="block mb-2">種類を選択</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                >
                  <option value="">選択してください</option>
                  {otherFoods.map((otherFood) => (
                    <option key={otherFood.id} value={otherFood.name}>
                      {otherFood.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleAddToCart}
              className="bg-blue-500 text-white p-2 rounded w-full"
              disabled={food.category === "その他" && !selectedType}
            >
              カートに追加
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="mt-2 text-gray-500 hover:text-gray-700 w-full"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
