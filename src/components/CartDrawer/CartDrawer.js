// FILE: src/components/CartDrawer/CartDrawer.js

import React from 'react';
import styles from './CartDrawer.module.css';

const CartDrawer = ({ open, items, onClose, onRemove, onIncrement, onDecrement }) => {
  const subtotal = items.reduce((sum, item) => sum + item.priceValue * item.quantity, 0);

  return (
    <div className={`${styles.overlay} ${open ? styles.open : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={`${styles.drawer} ${open ? styles.open : ''}`} aria-hidden={!open} aria-label="Carrinho de compras">
        <div className={styles.header}>
          <h3>Carrinho</h3>
          <button className={styles.close} onClick={onClose} aria-label="Fechar carrinho">×</button>
        </div>

        <div className={styles.content}>
          {items.length === 0 ? (
            <p className={styles.empty}>Seu carrinho está vazio.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className={styles.item}>
                <img src={item.image} alt={item.name} className={styles.itemImage} />
                <div className={styles.itemInfo}>
                  <div className={styles.itemTop}>
                    <h4 className={styles.itemName}>{item.name}</h4>
                    <button onClick={() => onRemove(item.id)} className={styles.remove} aria-label={`Remover ${item.name}`}>Remover</button>
                  </div>
                  <div className={styles.itemBottom}>
                    <div className={styles.qty}>
                      <button onClick={() => onDecrement(item.id)} aria-label="Diminuir quantidade">−</button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button onClick={() => onIncrement(item.id)} aria-label="Aumentar quantidade">+</button>
                    </div>
                    <span className={styles.price}>R$ {item.priceValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.subtotal}>
            <span>Subtotal</span>
            <strong>R$ {subtotal.toFixed(2)}</strong>
          </div>
          <a href="https://checkout.seu-gateway.com" target="_blank" rel="noreferrer" className={styles.checkout}>Finalizar compra</a>
        </div>
      </aside>
    </div>
  );
};

export default CartDrawer;
