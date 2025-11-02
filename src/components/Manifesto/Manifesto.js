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
        <h2 className={styles.title}>Nos Conheça</h2>

        <div className={styles.text}>
          <p>
            A <strong>Reflora</strong> é uma marca autoral de upcycling feita com muito carinho.
            Cada peça é pensada de forma individual, respeitando o que cada tecido tem de especial.
          </p>
          <p>
            Acreditamos que roupa também é forma de expressão. Por isso, transformamos
            materiais já existentes em peças únicas, cheias de personalidade e história.
          </p>
          <p>
            Aqui, tudo é feito com calma, cuidado e propósito. A Reflora é sobre dar um novo ciclo
            às roupas e colocar arte em cada detalhe.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Manifesto;
