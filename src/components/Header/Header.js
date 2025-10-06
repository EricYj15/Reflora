// FILE: src/components/Header/Header.js

import React from 'react';
import styles from './Header.module.css';

const Header = ({
  onCartClick,
  cartCount = 0,
  onOpenPolicy = () => {},
  cartButtonRef,
  onNavigateHome = () => {},
  onNavigateProducts = () => {},
  onNavigateManifesto = () => {},
  onNavigateContact = () => {},
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button type="button" className={styles.brand} aria-label="Reflora Home" onClick={onNavigateHome}>
          <span>Reflora</span>
        </button>

        <nav className={styles.nav} aria-label="Navegação principal">
          <button type="button" className={styles.link} onClick={onNavigateProducts}>Peças</button>
          <button type="button" className={styles.link} onClick={onNavigateManifesto}>Manifesto</button>
          <button type="button" className={styles.link} onClick={onOpenPolicy}>Garantia</button>
          <button type="button" className={styles.link} onClick={onNavigateContact}>Contato</button>
        </nav>

        <button
          ref={cartButtonRef}
          className={styles.cartButton}
          onClick={onCartClick}
          aria-label="Abrir carrinho"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6H20L19 12H8L6 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="18" r="1.75" fill="currentColor"/>
            <circle cx="17" cy="18" r="1.75" fill="currentColor"/>
          </svg>
          {cartCount > 0 && <span className={styles.badge} aria-label={`${cartCount} itens no carrinho`}>{cartCount}</span>}
        </button>
      </div>
    </header>
  );
};

export default Header;
