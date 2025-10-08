// FILE: src/App.js

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import './App.css';
import ProductModal from './components/ProductModal/ProductModal';
import Header from './components/Header/Header';
import CartDrawer from './components/CartDrawer/CartDrawer';
import PolicyModal from './components/PolicyModal/PolicyModal';
import MiniCartPopover from './components/MiniCartPopover/MiniCartPopover';
import HomePage from './pages/HomePage';
import CheckoutPage from './pages/CheckoutPage';
import AuthModal from './components/Auth/AuthModal';
import { useAuth } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';

const RequireAdmin = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '8rem 1.5rem', textAlign: 'center' }}>
        Carregando painel…
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const cartButtonRef = useRef(null);
  const pendingScrollRef = useRef(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const [miniCartPosition, setMiniCartPosition] = useState({ top: 0, right: 16 });
  const [recentItem, setRecentItem] = useState(null);
  const miniCartTimeoutRef = useRef(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user } = useAuth();

  const handleProductClick = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const scrollToSection = useCallback((sectionId) => {
    if (!sectionId) return;
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const parsePrice = (priceStr) => {
    // Expecting format: "R$ 189,00" -> 189.00
    const normalized = priceStr.replace(/[^0-9,]/g, '').replace(',', '.');
    const value = parseFloat(normalized);
    return isNaN(value) ? 0 : value;
  };

  const updateMiniCartPosition = useCallback(() => {
    if (!cartButtonRef.current) {
      return;
    }

    const rect = cartButtonRef.current.getBoundingClientRect();
    const rightOffset = Math.max(window.innerWidth - rect.right - 16, 16);

    setMiniCartPosition({
      top: rect.bottom + 12,
      right: rightOffset,
    });
  }, []);

  const openMiniCart = useCallback(() => {
    updateMiniCartPosition();
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(updateMiniCartPosition);
    }
    setIsMiniCartOpen(true);

    if (miniCartTimeoutRef.current) {
      clearTimeout(miniCartTimeoutRef.current);
    }

    miniCartTimeoutRef.current = setTimeout(() => {
      setIsMiniCartOpen(false);
      miniCartTimeoutRef.current = null;
    }, 5000);
  }, [updateMiniCartPosition]);

  const closeMiniCart = useCallback(() => {
    if (miniCartTimeoutRef.current) {
      clearTimeout(miniCartTimeoutRef.current);
      miniCartTimeoutRef.current = null;
    }
    setIsMiniCartOpen(false);
  }, []);

  const handleMiniCartMouseEnter = useCallback(() => {
    if (miniCartTimeoutRef.current) {
      clearTimeout(miniCartTimeoutRef.current);
      miniCartTimeoutRef.current = null;
    }
  }, []);

  const handleMiniCartMouseLeave = useCallback(() => {
    if (miniCartTimeoutRef.current) {
      clearTimeout(miniCartTimeoutRef.current);
    }

    miniCartTimeoutRef.current = setTimeout(() => {
      setIsMiniCartOpen(false);
      miniCartTimeoutRef.current = null;
    }, 2500);
  }, []);

  const handleNavigateToSection = useCallback(
    (sectionId) => {
      if (!sectionId) return;

      closeMiniCart();
      setCartOpen(false);

      if (location.pathname !== '/') {
        pendingScrollRef.current = sectionId;
        navigate('/', { state: { scrollTo: sectionId } });
      } else {
        scrollToSection(sectionId);
      }
    },
    [closeMiniCart, location.pathname, navigate, scrollToSection, setCartOpen]
  );

  const handleNavigateHome = useCallback(() => {
    closeMiniCart();
    setCartOpen(false);

    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [closeMiniCart, location.pathname, navigate, setCartOpen]);

  const handleNavigateContact = useCallback(() => {
    handleNavigateToSection('contato');
  }, [handleNavigateToSection]);

  const handleNavigateProducts = useCallback(() => {
    handleNavigateToSection('products');
  }, [handleNavigateToSection]);

  const handleNavigateManifesto = useCallback(() => {
    handleNavigateToSection('manifesto');
  }, [handleNavigateToSection]);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const exists = prev.find((it) => it.id === product.id);
      if (exists) {
        return prev.map((it) => (it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it));
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          image: product.images?.[0],
          priceValue: parsePrice(product.price),
          quantity: 1,
        },
      ];
    });

    setRecentItem({
      id: product.id,
      name: product.name,
      image: product.images?.[0],
    });
    openMiniCart();
  };

  const removeFromCart = (id) => setCartItems((prev) => prev.filter((it) => it.id !== id));
  const incQty = (id) => setCartItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: it.quantity + 1 } : it)));
  const decQty = (id) => setCartItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it)));

  const cartCount = cartItems.reduce((sum, it) => sum + it.quantity, 0);

  const navigateToCheckout = useCallback(() => {
    closeMiniCart();
    setCartOpen(false);
    navigate('/checkout');
  }, [closeMiniCart, navigate, setCartOpen]);

  const handleOrderComplete = () => {
    setCartItems([]);
  };

  useEffect(
    () => () => {
      if (miniCartTimeoutRef.current) {
        clearTimeout(miniCartTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!isMiniCartOpen) {
      return undefined;
    }

    updateMiniCartPosition();

    const handleResize = () => {
      updateMiniCartPosition();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMiniCartOpen, updateMiniCartPosition]);

  useEffect(() => {
    if (location.pathname !== '/') {
      return;
    }

    const targetSection = pendingScrollRef.current || location.state?.scrollTo;

    if (targetSection) {
      pendingScrollRef.current = null;
      scrollToSection(targetSection);

      if (location.state?.scrollTo) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location, navigate, scrollToSection]);

  const handleCartButtonClick = useCallback(() => {
    closeMiniCart();
    setCartOpen(true);
  }, [closeMiniCart, setCartOpen]);

  const handleGoToCart = useCallback(() => {
    closeMiniCart();
    setCartOpen(true);
  }, [closeMiniCart, setCartOpen]);

  const handleOpenAuth = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const handleNavigateAdmin = useCallback(() => {
    closeMiniCart();
    setCartOpen(false);
    navigate('/admin');
  }, [closeMiniCart, navigate, setCartOpen]);

  useEffect(() => {
    if (user) {
      setIsAuthModalOpen(false);
    }
  }, [user]);

  const headerProps = useMemo(() => ({
    onCartClick: handleCartButtonClick,
    cartCount,
    onOpenPolicy: () => setIsPolicyOpen(true),
    cartButtonRef,
    onNavigateHome: handleNavigateHome,
    onNavigateProducts: handleNavigateProducts,
    onNavigateManifesto: handleNavigateManifesto,
    onNavigateContact: handleNavigateContact,
    onOpenAuth: handleOpenAuth,
    onNavigateAdmin: handleNavigateAdmin
  }), [cartCount, handleCartButtonClick, handleNavigateAdmin, handleNavigateContact, handleNavigateHome, handleNavigateManifesto, handleNavigateProducts, handleOpenAuth, setIsPolicyOpen]);

  return (
    <div className="App">
      <Header {...headerProps} />
      <MiniCartPopover
        open={isMiniCartOpen && cartItems.length > 0}
        position={miniCartPosition}
        items={cartItems}
        recentItem={recentItem}
        onClose={closeMiniCart}
        onGoToCart={handleGoToCart}
        onMouseEnter={handleMiniCartMouseEnter}
        onMouseLeave={handleMiniCartMouseLeave}
      />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage onProductClick={handleProductClick} onAddToCart={addToCart} />
          }
        />
        <Route
          path="/checkout"
          element={
            <CheckoutPage
              items={cartItems}
              onOrderComplete={handleOrderComplete}
              onOpenPolicy={() => setIsPolicyOpen(true)}
            />
          }
        />
        <Route
          path="/admin"
          element={(
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          )}
        />
      </Routes>
      <PolicyModal isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} />
      
      {selectedProduct && (
        <ProductModal 
          product={selectedProduct} 
          onClose={handleCloseModal}
          onAddToCart={() => addToCart(selectedProduct)}
        />
      )}

      <CartDrawer 
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onRemove={removeFromCart}
        onIncrement={incQty}
        onDecrement={decQty}
        onCheckout={navigateToCheckout}
      />

      <AuthModal open={isAuthModalOpen} onClose={handleCloseAuth} />
    </div>
  );
}

export default App;
