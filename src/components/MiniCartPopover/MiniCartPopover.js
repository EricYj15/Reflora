// FILE: src/components/MiniCartPopover/MiniCartPopover.js

import React, { useEffect, useRef } from 'react';
import styles from './MiniCartPopover.module.css';

const MiniCartPopover = ({
  open,
  position,
  items = [],
  recentItem,
  onClose,
  onGoToCart,
  onMouseEnter = () => {},
  onMouseLeave = () => {},
}) => {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const total = items.reduce((sum, item) => sum + (item.priceValue || 0) * (item.quantity || 1), 0);

  const formatCurrency = (value) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const highlightedItem = items.length
    ? (recentItem ? items.find((item) => item.id === recentItem.id) || recentItem : items[items.length - 1])
    : null;

  const renderThumbnail = () => {
    if (highlightedItem?.image) {
      return (
        <img
          src={highlightedItem.image}
          alt={highlightedItem.name}
          className={styles.thumbnail}
        />
      );
    }

    return (
      <div className={styles.placeholder} aria-hidden="true">
        ✶
      </div>
    );
  };

  if (!open) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      className={`${styles.popover} ${open ? styles.open : ''}`}
      style={{ top: position?.top ?? 0, right: position?.right ?? 16 }}
      role="status"
      aria-live="polite"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.arrow} aria-hidden="true" />
      <header className={styles.header}>
        <span className={styles.title}>Sacola</span>
        <span className={styles.count}>{itemCount === 1 ? '1 item' : `${itemCount} itens`}</span>
      </header>

      {highlightedItem ? (
        <div className={styles.itemRow}>
          {renderThumbnail()}
          <div className={styles.itemDetails}>
            <p className={styles.itemName} title={highlightedItem.name}>
              {highlightedItem.name}
            </p>
            <span className={styles.itemQuantity}>
              Quantidade: {highlightedItem.quantity || 1}
            </span>
          </div>
          <strong className={styles.itemPrice}>
            {formatCurrency((highlightedItem.priceValue || 0) * (highlightedItem.quantity || 1))}
          </strong>
        </div>
      ) : (
        <p className={styles.empty}>Seu carrinho está vazio.</p>
      )}

      <div className={styles.footer}>
        <div className={styles.total}>
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.viewCartButton} onClick={() => onGoToCart?.()}>
            Ir para a sacola
          </button>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => onClose?.()}
            aria-label="Fechar resumo da sacola"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniCartPopover;
