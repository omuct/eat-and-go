import React from "react";
import { Food } from "@/app/_types/food";

type Props = {
  food: Food;
};

const ProductCard: React.FC<Props> = ({ food }) => {
  return (
    <div className="border p-4 rounded shadow">
      <img
        src={food.imageUrl}
        alt={food.name}
        className="w-full h-48 object-cover mb-4"
      />
      <h2 className="text-xl mb-2">{food.name}</h2>
      <p className="text-gray-700">{food.description}</p>
      <p className="text-gray-900 font-bold">¥{food.price}</p>
      <button className="mt-2 bg-blue-500 text-white p-2 rounded">
        カートに追加
      </button>
    </div>
  );
};

export default ProductCard;
