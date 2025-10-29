// FILE: src/components/ProductModal/ProductModal.js

import React, { useState, useEffect, useRef } from 'react';
import styles from './ProductModal.module.css';

const ProductModal = ({ product, onClose, onAddToCart }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const modalRef = useRef(null);

  const handleBuyNow = () => {
    // Adicionar ao carrinho
    onAddToCart();
    // Fechar modal
    onClose();
    // Redirecionar para checkout
    window.location.hash = '#checkout';
  };

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
            
            <div className={styles.actions}>
              <button className={`${styles.purchaseButton} ${styles.primary}`} onClick={() => {
                onAddToCart();
                onClose();
              }}>
                Adicionar ao carrinho
              </button>
              <button 
                className={styles.purchaseButton}
                onClick={handleBuyNow}
              >
                Comprar agora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
