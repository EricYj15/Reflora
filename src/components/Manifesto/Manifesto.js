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
            Não somos uma fábrica; somos um pequeno jardim de costuras conduzido à mão.
            Cada lote nasce aos poucos, entre conversas, café e linhas reutilizadas.
          </p>
          <p>
            Recolhemos tecidos rejeitados, mapeamos suas cicatrizes e decidimos quais
            histórias eles ainda carregam. Depois, transformamos em peças que respeitam a
            origem de cada fibra, sem esconder marcas do tempo.
          </p>
          <p>
            <strong>Reflora</strong> acredita que autenticidade floresce da transparência:
            você sabe de onde veio, quem fez e quantas horas dedicamos à sua peça.
            Não há estoques infinitos nem coleções apressadas; há cuidado e intenção.
          </p>
          <p>
            Quando você veste Reflora, escolhe ampliar a vida útil de um material, apoiar
            artesãos locais e vestir uma estética que não se repete. É moda que convida à
            presença, não ao descarte.
          </p>
          <p className={styles.signature}>
            Obrigada por cultivar esse jardim junto com a gente.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Manifesto;
