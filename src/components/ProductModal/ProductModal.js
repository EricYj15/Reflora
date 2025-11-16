// FILE: src/components/ProductModal/ProductModal.js

import React, { useState, useEffect, useRef, useMemo } from 'react';
import styles from './ProductModal.module.css';

const ProductModal = ({ product, onClose, onAddToCart }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const modalRef = useRef(null);

  useEffect(() => {
    // Bloquear scroll do body quando o modal está aberto
    document.body.style.overflow = 'hidden';

    // Focar no modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Listener para tecla ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Navegação por miniaturas (sem setas para evitar vibe de slideshow)

  if (!product) return null;

  const isExclusive = Boolean(product.isExclusive);
  const parsedStock = Number(product.stock);
  const stock = Number.isFinite(parsedStock) ? parsedStock : (isExclusive ? 1 : 0);
  const outOfStock = stock <= 0;

  const stockStatus = useMemo(() => {
    if (outOfStock) {
      return 'Esgotado no momento';
    }

    return isExclusive ? 'Estoque único (1 unidade)' : `Estoque: ${stock}`;
  }, [isExclusive, outOfStock, stock]);

  const handleAddToCart = () => {
    if (outOfStock) {
      return;
    }

    onAddToCart?.();
    onClose?.();
  };

  return (
    <div 
      className={styles.backdrop} 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={styles.modal}
        ref={modalRef}
        tabIndex={-1}
      >
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fechar modal"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="#F5F5DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className={styles.content}>
          <div className={styles.gallery}>
            <div className={styles.imageContainer}>
              <img 
                src={product.images[currentImageIndex]} 
                alt={`${product.name} - Imagem ${currentImageIndex + 1}`}
                className={styles.image}
              />
            </div>
            {product.images.length > 1 && (
              <div className={styles.thumbs}>
                {product.images.map((src, index) => (
                  <button key={index} className={`${styles.thumb} ${index === currentImageIndex ? styles.activeThumb : ''}`} onClick={() => setCurrentImageIndex(index)}>
                    <img src={src} alt={`${product.name} miniatura ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.details}>
            <h2 id="modal-title" className={styles.title}>{product.name}</h2>
            <p className={styles.price}>{product.price}</p>
            <p className={styles.description}>{product.description}</p>

            <div className={styles.metaInfo}>
              {isExclusive && <span className={styles.exclusiveBadge}>Peça exclusiva</span>}
              <p className={`${styles.stockStatus} ${outOfStock ? styles.stockOut : ''}`}>{stockStatus}</p>
            </div>
            
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.purchaseButton} ${styles.primary}`}
                onClick={handleAddToCart}
                disabled={outOfStock}
                aria-disabled={outOfStock}
              >
                {outOfStock ? 'Esgotado' : 'Adicionar ao carrinho'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
