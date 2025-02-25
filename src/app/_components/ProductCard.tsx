import React, { useState } from "react";
import { Food } from "@/app/_types/food";

type Props = {
  food: Food;
  onAddToCart: (selectedType: string) => void;
};

const ProductCard: React.FC<Props> = ({ food, onAddToCart }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState("");

  const handleAddToCart = () => {
    onAddToCart(selectedType);
    setShowModal(false);
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
        種類を選択
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">おにぎりの種類を選択</h3>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            >
              <option value="">選択してください</option>
              <option value="梅">梅</option>
              <option value="鮭">鮭</option>
              <option value="昆布">昆布</option>
            </select>
            <button
              onClick={handleAddToCart}
              className="bg-blue-500 text-white p-2 rounded w-full"
              disabled={!selectedType}
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
