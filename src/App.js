// FILE: src/App.js

import React, { useState } from 'react';
import './App.css';
import Hero from './components/Hero/Hero';
import ProductGrid from './components/ProductGrid/ProductGrid';
import ProductModal from './components/ProductModal/ProductModal';
import Manifesto from './components/Manifesto/Manifesto';
import ContactFooter from './components/ContactFooter/ContactFooter';
import Header from './components/Header/Header';
import CartDrawer from './components/CartDrawer/CartDrawer';
import BotanicalDecor from './components/BotanicalDecor/BotanicalDecor';

function App() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const parsePrice = (priceStr) => {
    // Expecting format: "R$ 189,00" -> 189.00
    const normalized = priceStr.replace(/[^0-9,]/g, '').replace(',', '.');
    const value = parseFloat(normalized);
    return isNaN(value) ? 0 : value;
  };

  const addToCart = (product) => {
    setCartItems((prev) => {
      const exists = prev.find((it) => it.id === product.id);
      if (exists) {
        return prev.map((it) => (it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          image: product.images?.[0],
          priceValue: parsePrice(product.price),
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (id) => setCartItems((prev) => prev.filter((it) => it.id !== id));
  const incQty = (id) => setCartItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: it.quantity + 1 } : it)));
  const decQty = (id) => setCartItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it)));

  const cartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div className="App">
      <Header onCartClick={() => setCartOpen(true)} cartCount={cartCount} />
      <BotanicalDecor />
      <Hero />
      <ProductGrid onProductClick={handleProductClick} onAddToCart={addToCart} />
      <Manifesto />
      <ContactFooter />
      
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={handleCloseModal}
          onAddToCart={() => addToCart(selectedProduct)}
        />
      )}

      <CartDrawer 
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onIncrement={incQty}
        onDecrement={decQty}
      />
    </div>
  );
}

export default App;
