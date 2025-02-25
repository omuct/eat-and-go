import React, { useState } from "react";
import { Food } from "@/app/_types/food";

type Props = {
  food: Food;
  onAddToCart: (selectedType: string, additionalPrice: number) => void;
};

const ProductCard: React.FC<Props> = ({ food, onAddToCart }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [additionalPrice, setAdditionalPrice] = useState(0);

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
    <div className="border p-4 rounded shadow">
      <img
        src={food.image_url}
        alt={food.name}
        className="w-full h-48 object-cover mb-4"
      />
      <h2 className="text-xl mb-2">{food.name}</h2>
      <p className="text-gray-700">{food.description}</p>
      <p className="text-gray-900 font-bold">¥{food.price}</p>
      <button
        onClick={() => setShowModal(true)}
        className="mt-2 bg-blue-500 text-white p-2 rounded"
      >
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
            <button
              onClick={handleAddToCart}
              className="bg-blue-500 text-white p-2 rounded w-full"
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
