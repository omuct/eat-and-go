import React, { createContext, useContext, useState, ReactNode } from "react";
import { Food } from "@/app/_types/food";

interface CartItem extends Food {
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (food: Food) => void;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (food: Food) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === food.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === food.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevItems, { ...food, quantity: 1 }];
      }
    });
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider value={{ cartItems, addToCart, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
