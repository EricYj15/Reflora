// FILE: src/components/ContactFooter/ContactFooter.js

import React, { useState } from 'react';
import styles from './ContactFooter.module.css';

const ContactFooter = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // O formulário será enviado para o Formspree quando você adicionar seu endpoint
    console.log('Email:', email, 'Message:', message);
  };

  return (
    <footer id="contato" className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Seção de Newsletter */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Floresça Conosco</h3>
            <p className={styles.sectionDescription}>
              Receba em primeira mão sobre novas peças e histórias do jardim noturno.
            </p>
            
            <form 
              className={styles.form}
              action="https://formspree.io/f/SEU_FORMSPREE_ID" 
              method="POST"
              onSubmit={handleSubmit}
            >
              <div className={styles.inputGroup}>
                <input
                  type="email"
                  name="email"
                  placeholder="Seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={styles.input}
                  aria-label="Digite seu e-mail"
                />
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  aria-label="Enviar e-mail"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="#F5F5DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              
              <textarea
                name="message"
                placeholder="Deixe sua mensagem (opcional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={styles.textarea}
                rows="4"
                aria-label="Digite sua mensagem"
              />
            </form>
          </div>

          {/* Seção de Redes Sociais */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Conecte-se</h3>
            <p className={styles.sectionDescription}>
              Acompanhe nossa jornada pelas redes sociais.
            </p>
            
            <div className={styles.socialLinks}>
              <a 
                href="https://instagram.com/reflora.r" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="Instagram"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/>
                </svg>
                <span>Instagram</span>
              </a>
              
              <a 
                href="https://tiktok.com/@reflora0" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="TikTok"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>TikTok</span>
              </a>
              
              <a 
                href="https://wa.me/5511966076801" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="WhatsApp"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className={styles.copyright}>
          <p>© 2025 Reflora. Moda Upcycling Artesanal.</p>
          <p className={styles.tagline}>Criado com amor e consciência.</p>
        </div>
      </div>
    </footer>
  );
};

export default ContactFooter;
