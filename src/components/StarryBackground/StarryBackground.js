// FILE: src/components/StarryBackground/StarryBackground.js

import React, { useEffect, useRef } from 'react';
import styles from './StarryBackground.module.css';

const StarryBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let stars = [];

    // Configurar tamanho do canvas
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = document.documentElement.scrollHeight;
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Criar estrelas
    const createStars = () => {
      const starCount = Math.floor((canvas.width * canvas.height) / 8000);
      stars = [];
      
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.3,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.7 ? '#7B0F12' : '#F5F5DC'
        });
      }
    };

    createStars();

    // Animar estrelas
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Efeito parallax baseado no scroll
      const scrollY = window.pageYOffset;
      const scrollRatio = scrollY / canvas.height;

      stars.forEach((star) => {
        star.phase += star.twinkleSpeed;
        const twinkle = Math.sin(star.phase) * 0.3 + 0.7;
        
        // Efeito parallax sutil
        const parallaxY = star.y - scrollRatio * 50;

        ctx.beginPath();
        ctx.arc(star.x, parallaxY, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.opacity * twinkle;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.canvas} />;
};

export default StarryBackground;
