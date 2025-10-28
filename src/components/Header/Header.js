// FILE: src/components/Header/Header.js

import React, { useMemo, useState, useEffect } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName = useMemo(() => {
    if (!user?.name) {
      return user?.email?.split('@')[0];
    }
    return user.name.split(' ')[0];
  }, [user]);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  
  const handleNavigate = (callback) => {
    callback();
    setMenuOpen(false);
  };

  // Prevenir scroll quando menu está aberto
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  return (
    <>
      {/* Overlay escuro quando menu está aberto */}
      {menuOpen && (
        <div 
          className={styles.overlay} 
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu lateral - fora do header para z-index funcionar */}
      <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`} aria-label="Navegação principal">
        <div className={styles.menuHeader}>
          <h2 className={styles.menuTitle}>Reflora</h2>
          <button 
            type="button" 
            className={styles.closeMenu}
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>
        
        <button type="button" className={styles.link} onClick={() => handleNavigate(onNavigateProducts)}>Peças</button>
        <button type="button" className={styles.link} onClick={() => handleNavigate(onNavigateManifesto)}>Manifesto</button>
        <button type="button" className={styles.link} onClick={() => handleNavigate(onOpenPolicy)}>Garantia</button>
        <button type="button" className={styles.link} onClick={() => handleNavigate(onNavigateContact)}>Contato</button>
        {isAdmin && (
          <button type="button" className={`${styles.link} ${styles.adminLink}`} onClick={() => handleNavigate(onNavigateAdmin)}>
            Painel
          </button>
        )}
        
        {/* User info no menu mobile */}
        <div className={styles.mobileUserSection}>
          {user ? (
            <div className={styles.mobileSession}>
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
                <button type="button" className={styles.authLink} onClick={() => { logout(); setMenuOpen(false); }}>
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={styles.authButton} onClick={() => { onOpenAuth(); setMenuOpen(false); }} disabled={loading}>
              {loading ? 'Carregando...' : 'Entrar / Criar conta'}
            </button>
          )}
        </div>
      </nav>

      <header className={styles.header}>
        <div className={styles.inner}>
          <button 
            type="button" 
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
            onClick={toggleMenu}
            aria-label="Menu de navegação"
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <button type="button" className={styles.brand} aria-label="Reflora Home" onClick={onNavigateHome}>
            <span className={styles.brandText}>Reflora</span>
            <span className={styles.brandMobile}>Re.</span>
          </button>

          {/* Nav para desktop - dentro do header */}
          <nav className={styles.navDesktop} aria-label="Navegação principal">
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
    </>
  );
};

export default Header;
