// FILE: src/components/ProductGrid/ProductGrid.js

import React, { useEffect, useRef, useState } from 'react';
import styles from './ProductGrid.module.css';
import { products as fallbackProducts } from '../../data/products';

const SIZE_KEYS = ['PP', 'P', 'M', 'G'];

const normalizeProduct = (product) => {
  if (!product) {
    return null;
  }

  const stockValue = Number(product.stock);
  const stock = Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : 0;

  const sizes = SIZE_KEYS.reduce((acc, size) => {
    const value = product?.sizes?.[size];
    acc[size] = typeof value === 'boolean' ? value : Boolean(value);
    return acc;
  }, {});

  if (!Object.values(sizes).some(Boolean)) {
    SIZE_KEYS.forEach((size) => {
      sizes[size] = true;
    });
  }

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : product.images
      ? [product.images]
      : [];

  return {
    ...product,
    stock,
    sizes,
    images
  };
};

const ProductGrid = ({ onProductClick, onAddToCart }) => {
  const [catalog, setCatalog] = useState(() => fallbackProducts.map((product) => normalizeProduct(product)).filter(Boolean));
  const [isVisible, setIsVisible] = useState([]);
  const itemsRef = useRef([]);

  useEffect(() => {
    itemsRef.current.length = catalog.length;
    setIsVisible(new Array(catalog.length).fill(false));
  }, [catalog]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();

        if (!isMounted) {
          return;
        }

        if (response.ok && Array.isArray(data.products) && data.products.length > 0) {
          setCatalog(data.products.map((product) => normalizeProduct(product)).filter(Boolean));
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('Catálogo remoto indisponível, usando fallback local.');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Não foi possível carregar produtos do servidor. Usando fallback.', error);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

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

    itemsRef.current.forEach((item) => {
      if (item) observer.observe(item);
    });

    return () => {
      observer.disconnect();
    };
  }, [catalog]);

  return (
    <section id="products" className={styles.section}>
      <h2 className={styles.title}>Flores do Jardim Noturno</h2>
      <div className={styles.grid}>
        {catalog.map((product, index) => {
          if (!product) {
            return null;
          }

          const outOfStock = product.stock <= 0;

          return (
          <div
            key={product.id || index}
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
                <button
                  type="button"
                  className={styles.cta}
                  onClick={() => onProductClick(product)}
                  aria-label={`Ver detalhes de ${product.name}`}
                >
                  Ver detalhes
                </button>
                <button
                  type="button"
                  className={`${styles.cta} ${styles.primary} ${outOfStock ? styles.ctaDisabled : ''}`}
                  onClick={() => onAddToCart(product)}
                  aria-label={outOfStock ? `${product.name} está esgotado` : `Adicionar ${product.name} ao carrinho`}
                  disabled={outOfStock}
                >
                  {outOfStock ? 'Esgotado' : 'Adicionar ao carrinho'}
                </button>
              </div>
            </div>
            <div className={styles.info}>
              <h3 className={styles.productName}>{product.name}</h3>
              <p className={styles.price}>{product.price}</p>
              <p className={`${styles.stock} ${outOfStock ? styles.stockOut : ''}`}>
                {outOfStock ? 'Esgotado no momento' : `Estoque: ${product.stock}`}
              </p>
              <div className={styles.sizeRow} role="group" aria-label="Disponibilidade por tamanho">
                {SIZE_KEYS.map((size) => {
                  const available = Boolean(product.sizes?.[size]);
                  return (
                    <span
                      key={`${product.id || index}-${size}`}
                      className={`${styles.sizeBadge} ${available ? styles.sizeAvailable : styles.sizeUnavailable}`}
                      aria-label={`Tamanho ${size} ${available ? 'disponível' : 'indisponível'}`}
                    >
                      {size}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
};

export default ProductGrid;
