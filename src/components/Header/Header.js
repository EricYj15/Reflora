// FILE: src/components/Header/Header.js

import React from 'react';
import styles from './Header.module.css';

const Header = ({ onCartClick, cartCount = 0 }) => {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a href="#top" className={styles.brand} aria-label="Reflora Home">
          Reflora
        </a>

        <nav className={styles.nav} aria-label="Navegação principal">
          <a href="#products" className={styles.link}>Peças</a>
          <a href="#manifesto" className={styles.link}>Manifesto</a>
          <a href="#contato" className={styles.link}>Contato</a>
        </nav>

        <button className={styles.cartButton} onClick={onCartClick} aria-label="Abrir carrinho">
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
