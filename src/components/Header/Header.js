// FILE: src/components/Header/Header.js

import React, { useMemo } from 'react';
import styles from './Header.module.css';
import { useAuth } from '../../context/AuthContext';

const Header = ({
  onCartClick,
  cartCount = 0,
  onOpenPolicy = () => {},
  cartButtonRef,
  onNavigateHome = () => {},
  onNavigateProducts = () => {},
  onNavigateManifesto = () => {},
  onNavigateContact = () => {},
  onOpenAuth = () => {},
  onNavigateAdmin = () => {}
}) => {
  const { user, logout, loading, isAdmin } = useAuth();

  const firstName = useMemo(() => {
    if (!user?.name) {
      return user?.email?.split('@')[0];
    }
    return user.name.split(' ')[0];
  }, [user]);

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
          {isAdmin && (
            <button type="button" className={`${styles.link} ${styles.adminLink}`} onClick={onNavigateAdmin}>
              Painel
            </button>
          )}
        </nav>

        <div className={styles.actions}>
          {user ? (
            <div className={styles.session}>
              <div className={styles.avatar} aria-hidden>
                {firstName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.welcome}>
                  Olá,
                  {' '}
                  <strong>{firstName || 'cliente'}</strong>
                </span>
                {isAdmin && <span className={styles.adminBadge}>Admin</span>}
                <button type="button" className={styles.authLink} onClick={logout}>
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={styles.authButton} onClick={onOpenAuth} disabled={loading}>
              {loading ? 'Carregando...' : 'Entrar / Criar conta'}
            </button>
          )}

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
      </div>
    </header>
  );
};

export default Header;
