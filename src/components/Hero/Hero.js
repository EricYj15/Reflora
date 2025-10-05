// FILE: src/components/Hero/Hero.js

import React, { useEffect, useRef } from 'react';
import styles from './Hero.module.css';

const Hero = () => {
  const arrowRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset;
      if (arrowRef.current) {
        arrowRef.current.style.opacity = Math.max(0, 1 - scrollY / 300);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToContent = () => {
    const nextSection = document.getElementById('products');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="top" className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.logoContainer}>
          <h1 className={styles.logo}>Reflora</h1>
        </div>
        <p className={styles.slogan}>Moda que floresce de novo.</p>
      </div>
      
      <div 
        ref={arrowRef}
        className={styles.scrollArrow} 
        onClick={scrollToContent}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && scrollToContent()}
        aria-label="Rolar para produtos"
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="#7B0F12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </section>
  );
};

export default Hero;
