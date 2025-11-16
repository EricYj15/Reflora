// FILE: src/components/Header/Header.js

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  onNavigateAdmin = () => {},
  onNavigateMyOrders = () => {}
}) => {
  const { user, logout, loading, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileBrand, setShowMobileBrand] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmTarget, setLogoutConfirmTarget] = useState(null);
  const profilePanelRef = useRef(null);
  const profileToggleRef = useRef(null);

  const firstName = useMemo(() => {
    if (!user?.name) {
      return user?.email?.split('@')[0];
    }
    return user.name.split(' ')[0];
  }, [user]);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const toggleProfilePanel = () => setProfileOpen((prev) => !prev);
  
  const handleNavigate = (callback) => {
    callback();
    setMenuOpen(false);
  };

  const requestLogoutConfirmation = (target) => {
    setLogoutConfirmTarget(target);
  };

  const cancelLogoutConfirmation = () => {
    setLogoutConfirmTarget(null);
  };

  const handleConfirmLogout = () => {
    logout();
    if (logoutConfirmTarget === 'mobile') {
      setMenuOpen(false);
    }
    setLogoutConfirmTarget(null);
    setProfileOpen(false);
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

  useEffect(() => {
    if (menuOpen) {
      setProfileOpen(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleMediaChange = (event) => {
      setIsMobileView(event.matches);
    };

    handleMediaChange(mediaQuery);
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (
        profilePanelRef.current &&
        !profilePanelRef.current.contains(event.target) &&
        !profileToggleRef.current?.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!logoutConfirmTarget) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setLogoutConfirmTarget(null);
    }, 8000);

    return () => {
      clearTimeout(timer);
    };
  }, [logoutConfirmTarget]);

  useEffect(() => {
    if (!user) {
      setProfileOpen(false);
      setLogoutConfirmTarget(null);
    }
  }, [user]);

  useEffect(() => {
    if (!isMobileView) {
      setShowMobileBrand(false);
      return undefined;
    }

    const productsSection = document.getElementById('products');
    if (!productsSection) {
      setShowMobileBrand(true);
      return undefined;
    }

    const updateBrandVisibility = () => {
      const triggerPosition = Math.max(productsSection.offsetTop - 120, 0);
      setShowMobileBrand(window.scrollY >= triggerPosition);
    };

    updateBrandVisibility();
    window.addEventListener('scroll', updateBrandVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateBrandVisibility);
    };
  }, [isMobileView]);

  const mobileBrandClass = showMobileBrand ? styles.brandMobileVisible : styles.brandMobileHidden;

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
  <button type="button" className={styles.link} onClick={() => handleNavigate(onNavigateManifesto)}>Nos Conheça</button>
        <button type="button" className={styles.link} onClick={() => handleNavigate(onOpenPolicy)}>Garantia</button>
        <button type="button" className={styles.link} onClick={() => handleNavigate(onNavigateContact)}>Contato</button>
        {user && (
          <button type="button" className={styles.link} onClick={() => handleNavigate(onNavigateMyOrders)}>
            Meus Pedidos
          </button>
        )}
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
                {logoutConfirmTarget === 'mobile' ? (
                  <div className={styles.confirmLogout}>
                    <span>Confirmar saída?</span>
                    <div className={styles.confirmActions}>
                      <button type="button" onClick={cancelLogoutConfirmation} className={styles.confirmCancel}>Cancelar</button>
                      <button type="button" onClick={handleConfirmLogout} className={styles.confirmAccept}>Sair</button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.authLink}
                    onClick={() => requestLogoutConfirmation('mobile')}
                  >
                    Sair
                  </button>
                )}
              </div>
            </div>
            <div className={styles.mobileProfileCard}>
              <p className={styles.mobileProfileTitle}>Perfil Reflora</p>
              <p className={styles.mobileProfileEmail}>{user?.email}</p>
              <p className={styles.mobileProfileMessage}>
                Personalize seu garimpo e acompanhe pedidos e novidades em um só lugar.
              </p>
              <button
                type="button"
                className={styles.mobileProfileAction}
                onClick={() => handleNavigate(onNavigateMyOrders)}
              >
                Ir para meus pedidos
              </button>
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
            <span className={`${styles.brandMobile} ${mobileBrandClass}`}>Reflora</span>
          </button>

          {/* Nav para desktop - dentro do header */}
          <nav className={styles.navDesktop} aria-label="Navegação principal">
            <button type="button" className={styles.link} onClick={onNavigateProducts}>Peças</button>
            <button type="button" className={styles.link} onClick={onNavigateManifesto}>Nos Conheça</button>
            <button type="button" className={styles.link} onClick={onOpenPolicy}>Garantia</button>
            <button type="button" className={styles.link} onClick={onNavigateContact}>Contato</button>
            {user && (
              <button type="button" className={styles.link} onClick={onNavigateMyOrders}>
                Meus Pedidos
              </button>
            )}
            {isAdmin && (
              <button type="button" className={`${styles.link} ${styles.adminLink}`} onClick={onNavigateAdmin}>
                Painel
              </button>
            )}
          </nav>

        <div className={styles.actions}>
          {user ? (
            <>
              <div className={styles.session}>
                <button
                  type="button"
                  className={`${styles.profileToggle} ${profileOpen ? styles.profileToggleActive : ''}`}
                  onClick={toggleProfilePanel}
                  aria-expanded={profileOpen}
                  aria-controls="header-profile-panel"
                  ref={profileToggleRef}
                >
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
                    <span className={styles.profileLink}>Abrir perfil</span>
                  </div>
                </button>
                <div className={styles.logoutArea}>
                  {logoutConfirmTarget === 'desktop' ? (
                    <div className={styles.confirmLogout}>
                      <span>Confirmar saída?</span>
                      <div className={styles.confirmActions}>
                        <button type="button" onClick={cancelLogoutConfirmation} className={styles.confirmCancel}>Cancelar</button>
                        <button type="button" onClick={handleConfirmLogout} className={styles.confirmAccept}>Sair</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className={styles.authLink} onClick={() => requestLogoutConfirmation('desktop')}>
                      Sair
                    </button>
                  )}
                </div>
              </div>

              {profileOpen && (
                <div
                  className={styles.profilePanel}
                  id="header-profile-panel"
                  ref={profilePanelRef}
                  role="dialog"
                  aria-label="Perfil do cliente"
                >
                  <div className={styles.profilePanelHeader}>
                    <div className={styles.profilePanelAvatar} aria-hidden>
                      {firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className={styles.profilePanelTitle}>Perfil Reflora</p>
                      <span className={styles.profilePanelEmail}>{user?.email}</span>
                    </div>
                  </div>
                  <p className={styles.profilePanelMessage}>
                    Guardamos suas preferências para sugerir achados únicos e tornar cada visita mais pessoal.
                  </p>
                  <div className={styles.profileStats}>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatLabel}>Nome</span>
                      <strong>{user?.name || firstName || 'Cliente Reflora'}</strong>
                    </div>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatLabel}>Pedidos</span>
                      <strong>{user?.orderCount ?? 0}</strong>
                    </div>
                  </div>
                  <div className={styles.profileActions}>
                    <button
                      type="button"
                      className={styles.profileActionPrimary}
                      onClick={() => {
                        onNavigateMyOrders();
                        setProfileOpen(false);
                      }}
                    >
                      Acompanhar pedidos
                    </button>
                    {logoutConfirmTarget === 'profile' ? (
                      <div className={styles.confirmLogoutInline}>
                        <span>Confirmar saída?</span>
                        <div className={styles.confirmActions}>
                          <button type="button" onClick={cancelLogoutConfirmation} className={styles.confirmCancel}>Cancelar</button>
                          <button type="button" onClick={handleConfirmLogout} className={styles.confirmAccept}>Sair</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.profileActionGhost}
                        onClick={() => requestLogoutConfirmation('profile')}
                      >
                        Sair da conta
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
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
