// FILE: src/components/ProductGrid/ProductGrid.js

import React, { useEffect, useRef, useState } from 'react';
import styles from './ProductGrid.module.css';
import { products } from '../../data/products';

const ProductGrid = ({ onProductClick, onAddToCart }) => {
  const [isVisible, setIsVisible] = useState([]);
  const itemsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = itemsRef.current.indexOf(entry.target);
            if (index !== -1) {
              setIsVisible((prev) => {
                const newVisible = [...prev];
                newVisible[index] = true;
                return newVisible;
              });
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
    );

    const currentItems = itemsRef.current;

    currentItems.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => {
      currentItems.forEach((item) => {
        if (item) observer.unobserve(item);
      });
    };
  }, []);

  return (
    <section id="products" className={styles.section}>
      <h2 className={styles.title}>Flores do Jardim Noturno</h2>
      <div className={styles.grid}>
        {products.map((product, index) => (
          <div
            key={product.id}
            ref={(el) => (itemsRef.current[index] = el)}
            className={`${styles.productCard} ${isVisible[index] ? styles.visible : ''}`}
            aria-label={`Cartão do produto ${product.name}`}
          >
            <div className={styles.imageContainer}>
              <img 
                src={product.images[0]} 
                alt={product.name}
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.overlay}>
                <button className={styles.cta} onClick={() => onProductClick(product)} aria-label={`Ver detalhes de ${product.name}`}>
                  Ver detalhes
                </button>
                <button className={`${styles.cta} ${styles.primary}`} onClick={() => onAddToCart(product)} aria-label={`Adicionar ${product.name} ao carrinho`}>
                  Adicionar ao carrinho
                </button>
              </div>
            </div>
            <div className={styles.info}>
              <h3 className={styles.productName}>{product.name}</h3>
              <p className={styles.price}>{product.price}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductGrid;
