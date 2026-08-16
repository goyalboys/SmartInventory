import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    return saved ? JSON.parse(saved) : { merchantId: null, items: [] };
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (merchantId, product, quantity = 1) => {
    setCart((prev) => {
      if (prev.merchantId && prev.merchantId !== merchantId) {
        const confirmed = window.confirm(
          "Your cart has items from another store. Clear cart and add this item?"
        );
        if (!confirmed) return prev;

        return {
          merchantId,
          items: [
            {
              productId: product._id,
              name: product.name,
              price: product.price,
              quantity,
              imageUrl: product.imageUrl || "",
            },
          ],
        };
      }

      const existing = prev.items.find((item) => item.productId === product._id);

      if (existing) {
        return {
          merchantId,
          items: prev.items.map((item) =>
            item.productId === product._id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      }

      return {
        merchantId,
        items: [
          ...prev.items,
          {
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity,
            imageUrl: product.imageUrl || "",
          },
        ],
      };
    });
  };

  const isInCart = (productId) => {
    return cart.items.some((item) => item.productId === productId);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      ),
    }));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const items = prev.items.filter((item) => item.productId !== productId);
      return {
        merchantId: items.length ? prev.merchantId : null,
        items,
      };
    });
  };

  const clearCart = () => {
    setCart({ merchantId: null, items: [] });
  };

  const cartTotal = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        isInCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
