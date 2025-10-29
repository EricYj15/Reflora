// FILE: src/components/PolicyModal/PolicyModal.js

import React, { useEffect } from 'react';
import styles from './PolicyModal.module.css';

const PolicyModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
        onClick={stopPropagation}
      >
        <header className={styles.header}>
          <h2 id="policy-modal-title">Garantia, pagamento seguro e acompanhamento claro</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar política">
            ×
          </button>
        </header>

        <div className={styles.content}>
          <section className={styles.block}>
            <h3>1. Política de confiança</h3>
            <ul>
              <li>Devolução em até <strong>7 dias</strong> após o recebimento sem custo adicional.</li>
              <li>Ajustes ou troca por defeito garantidos por <strong>30 dias</strong>.</li>
              <li>CNPJ, endereço e canais oficiais exibidos no rodapé e no checkout.</li>
            </ul>
          </section>

          <section className={styles.block}>
            <h3>2. Pagamento protegido</h3>
            <ul>
              <li>Confirme os dados no resumo e clique para pagar.</li>
              <li>Escolha PIX, cartão ou boleto no Mercado Pago.</li>
              <li>O status do pagamento fica registrado com o pedido.</li>
              <li>Cartão de crédito, débito e boleto disponíveis diretamente pelo checkout Mercado Pago.</li>
            </ul>
          </section>

          <section className={styles.block}>
            <h3>3. Registro para os dois lados</h3>
            <ul>
              <li>Os dados do cliente, endereço e itens ficam salvos no painel interno.</li>
              <li>Cada pedido gera um número único para consultas futuras.</li>
              <li>A equipe Reflora confirma o pagamento e envia o código de rastreio.</li>
            </ul>
          </section>

          <section className={styles.timeline}>
            <h3>Fluxo rápido e seguro</h3>
            <ol>
              <li>Cliente inclui produtos no carrinho e revisa o resumo.</li>
              <li>Preenche os dados no checkout e aceita os termos de devolução.</li>
              <li>Salva o pedido e paga via Mercado Pago (PIX, cartão ou boleto). Confirmação automática.</li>
              <li>Reflora valida o pagamento, prepara o envio e envia o código de rastreio.</li>
            </ol>
          </section>
        </div>

        <footer className={styles.footer}>
          <div className={styles.contactBox}>
            <h3>Precisa falar com alguém?</h3>
            <p>
              WhatsApp <a href="https://wa.me/5511966076801" target="_blank" rel="noreferrer">(11) 96607-6801</a> · Atendimento das 9h às 18h.
            </p>
            <p>
              E-mail de suporte: <a href="mailto:reflorar123@gmail.com">reflorar123@gmail.com</a>
            </p>
          </div>
          <button type="button" className={styles.actionButton} onClick={onClose}>
            Entendi
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PolicyModal;
