// FILE: src/components/Manifesto/Manifesto.js

import React, { useEffect, useRef, useState } from 'react';
import styles from './Manifesto.module.css';

const Manifesto = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    const currentSection = sectionRef.current;
    
    if (currentSection) {
      observer.observe(currentSection);
    }

    return () => {
      if (currentSection) {
        observer.unobserve(currentSection);
      }
    };
  }, []);

  return (
    <section 
      id="manifesto"
      ref={sectionRef}
      className={`${styles.section} ${isVisible ? styles.visible : ''}`}
    >
      <div className={styles.content}>
        <h2 className={styles.title}>Nosso Manifesto</h2>
        
        <div className={styles.text}>
          <p>
            Em um mundo que descarta, nós escolhemos renovar.
          </p>
          <p>
            Cada peça que floresce em nossas mãos carrega uma história — 
            tecidos esquecidos que encontram nova vida, 
            costuras que unem passado e futuro, 
            cores que renascem sob o toque do artesanal.
          </p>
          <p>
            <strong>Reflora</strong> é mais que moda. 
            É um convite para desacelerar, 
            para valorizar o único, 
            para vestir-se de propósito.
          </p>
          <p>
            Aqui, cada imperfeição é celebrada. 
            Cada peça é uma flor noturna — 
            rara, misteriosa, autêntica.
          </p>
          <p className={styles.signature}>
            Vista a mudança que você quer ver no mundo.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Manifesto;
