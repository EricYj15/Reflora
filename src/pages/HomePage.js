// FILE: src/pages/HomePage.js

import React from 'react';
import BotanicalDecor from '../components/BotanicalDecor/BotanicalDecor';
import Hero from '../components/Hero/Hero';
import ProductGrid from '../components/ProductGrid/ProductGrid';
import Manifesto from '../components/Manifesto/Manifesto';
import ContactFooter from '../components/ContactFooter/ContactFooter';

const HomePage = ({ onProductClick, onAddToCart }) => {
  return (
    <>
      <BotanicalDecor />
      <Hero />
      <ProductGrid onProductClick={onProductClick} onAddToCart={onAddToCart} />
      <Manifesto />
      <ContactFooter />
    </>
  );
};

export default HomePage;
