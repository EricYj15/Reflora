// FILE: src/components/SecurePurchase/SecurePurchase.js

import React from 'react';
import styles from './SecurePurchase.module.css';

const SecurePurchase = () => {
  return (
    <section id="garantia" className={styles.section}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.kicker}>Compra tranquila</p>
          <h2>Garantia, pagamento seguro e acompanhamento claro</h2>
          <p className={styles.subtitle}>
            Organizamos um fluxo simples para proteger cliente e Reflora: política de devolução transparente, pagamento verificado e registro completo do pedido.
          </p>
        </header>

        <div className={styles.grid}>
          <article className={styles.card}>
            <h3>1. Política de confiança</h3>
            <ul>
              <li>Devolução em até <strong>7 dias</strong> após o recebimento sem custo adicional.</li>
              <li>Ajustes ou troca por defeito garantidos por <strong>30 dias</strong>.</li>
              <li>CNPJ, endereço e canais oficiais exibidos no rodapé e no checkout.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h3>2. Pagamento protegido</h3>
            <ul>
              <li>Confirme os dados no resumo e clique para pagar.</li>
              <li>Escolha PIX, cartão ou boleto no Mercado Pago.</li>
              <li>O status do pagamento fica registrado com o pedido.</li>
              <li>Cartão de crédito, débito e boleto disponíveis diretamente pelo checkout Mercado Pago.</li>
            </ul>
          </article>

          <article className={styles.card}>
            <h3>3. Registro para os dois lados</h3>
            <ul>
              <li>Os dados do cliente, endereço e itens ficam salvos no painel interno.</li>
              <li>Cada pedido gera um número único para consultas futuras.</li>
              <li>A equipe Reflora confirma o pagamento e envia o código de rastreio.</li>
            </ul>
          </article>
        </div>

        <div className={styles.timeline}>
          <h3>Fluxo rápido e seguro</h3>
          <ol>
            <li>
              Cliente inclui produtos no carrinho e revisa o resumo.
            </li>
            <li>
              Preenche os dados no checkout e aceita os termos de devolução.
            </li>
            <li>
              Salva o pedido e paga via Mercado Pago (PIX, cartão ou boleto). Confirmação automática.
            </li>
            <li>
              Reflora valida o comprovante, prepara o envio e atualiza o cliente com o rastreio.
            </li>
          </ol>
        </div>

        <div className={styles.contactBox}>
          <h3>Precisa falar com alguém?</h3>
          <p>
            Canal direto pelo WhatsApp <a href="https://wa.me/5511966076801" target="_blank" rel="noreferrer">(11) 96607-6801</a> · Atendimento das 9h às 18h.
          </p>
          <p>
            E-mail de suporte: <a href="mailto:sostahel@gmail.com">sostahel@gmail.com</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default SecurePurchase;
