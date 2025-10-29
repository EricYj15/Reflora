// FILE: src/components/Checkout/CouponInput.js

import React, { useState } from 'react';
import styles from './CouponInput.module.css';
import { apiFetch } from '../../utils/api';

const CouponInput = ({ onCouponApplied, onCouponRemoved, disabled = false }) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    
    if (!couponCode.trim()) {
      setError('Digite o código do cupom');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: couponCode.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Cupom inválido');
        return;
      }

      setAppliedCoupon(data.coupon);
      setError('');
      setCouponCode('');
      
      if (onCouponApplied) {
        onCouponApplied(data.coupon);
      }
    } catch (err) {
      console.error('Erro ao validar cupom:', err);
      setError('Não foi possível validar o cupom. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setError('');
    
    if (onCouponRemoved) {
      onCouponRemoved();
    }
  };

  if (appliedCoupon) {
    return (
      <div className={styles.couponApplied}>
        <div className={styles.couponInfo}>
          <svg 
            className={styles.checkIcon} 
            width="20" 
            height="20" 
            viewBox="0 0 20 20" 
            fill="none"
          >
            <path 
              d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm-1.5 14.5l-4-4 1.41-1.41L8.5 11.67l5.09-5.09L15 8l-6.5 6.5z" 
              fill="currentColor"
            />
          </svg>
          <div className={styles.couponDetails}>
            <strong>Cupom "{appliedCoupon.code}" aplicado!</strong>
            <span>{appliedCoupon.description}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRemoveCoupon}
          className={styles.removeButton}
          disabled={disabled}
        >
          Remover
        </button>
      </div>
    );
  }

  return (
    <div className={styles.couponContainer}>
      <form onSubmit={handleApplyCoupon} className={styles.couponForm}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder="Digite o cupom de desconto"
            className={styles.couponInput}
            disabled={loading || disabled}
            maxLength={20}
          />
          <button
            type="submit"
            className={styles.applyButton}
            disabled={loading || disabled || !couponCode.trim()}
          >
            {loading ? 'Validando...' : 'Aplicar'}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
};

export default CouponInput;
