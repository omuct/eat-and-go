import React from "react";
import { Food } from "@/app/_types/food";

type Props = {
  food: Food;
};

const ProductCard: React.FC<Props> = ({ food }) => {
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
    </div>
  );
};

export default ProductCard;
