// FILE: src/components/Checkout/Checkout.js

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './Checkout.module.css';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  document: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  zip: ''
};

const Checkout = ({ items = [], onOrderComplete, onOpenPolicy = () => {} }) => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [zipLookupLoading, setZipLookupLoading] = useState(false);
  const [zipLookupError, setZipLookupError] = useState('');
  const [zipLookupMessage, setZipLookupMessage] = useState('');
  const { user, token, loading: authLoading } = useAuth();
  const lastZipLookupRef = useRef('');

  const itemsCount = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 1), 0),
    [items]
  );

  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.priceValue || 0) * (item.quantity || 1), 0),
    [items]
  );

  const grandTotal = useMemo(
    () => itemsTotal + (shippingQuote?.price || 0),
    [itemsTotal, shippingQuote]
  );

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiFetch('/api/orders', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Não foi possível carregar pedidos salvos.', err);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      name: user.name || prev.name,
      email: user.email || prev.email
    }));
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'zip') {
      const digits = value.replace(/\D/g, '').slice(0, 8);
      const formatted = digits.replace(/(\d{5})(\d{0,3})/, (match, part1, part2) => (part2 ? `${part1}-${part2}` : part1));
      setForm((prev) => ({ ...prev, [name]: formatted }));
      if (shippingQuote) {
        setShippingQuote(null);
      }
      if (shippingError) {
        setShippingError('');
      }
      if (zipLookupError) {
        setZipLookupError('');
      }
      if (zipLookupMessage) {
        setZipLookupMessage('');
      }
      if (digits !== lastZipLookupRef.current) {
        lastZipLookupRef.current = '';
      }
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCalculateShipping = useCallback(async ({ silent = false } = {}) => {
    setShippingError('');

    if (!items.length) {
      setShippingQuote(null);
      if (!silent) {
        setShippingError('Adicione produtos ao carrinho para calcular o frete.');
      }
      return;
    }

    const cepDigits = form.zip.replace(/\D/g, '');

    if (cepDigits.length !== 8) {
      setShippingQuote(null);
      if (!silent) {
        setShippingError('Informe um CEP válido com 8 dígitos.');
      }
      return;
    }

    setShippingLoading(true);

    try {
      const response = await apiFetch('/api/shipping/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          cep: cepDigits,
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            priceValue: item.priceValue
          }))
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Não foi possível calcular o frete.');
      }

      setShippingQuote(data.quote);
      setError('');
    } catch (calcError) {
      console.error('Erro ao calcular frete:', calcError);
      setShippingQuote(null);
      setShippingError(calcError.message || 'Não foi possível calcular o frete.');
    } finally {
      setShippingLoading(false);
    }
  }, [form.zip, items, token]);

  const handleCepLookup = useCallback(async (incomingCep, { auto = false } = {}) => {
    const cepDigits = (incomingCep || form.zip).replace(/\D/g, '');

    if (cepDigits.length !== 8) {
      if (!auto) {
        setZipLookupError('Informe um CEP válido com 8 dígitos.');
        setZipLookupMessage('');
      }
      return;
    }

    if (zipLookupLoading && auto) {
      return;
    }

    setZipLookupLoading(true);
    setZipLookupError('');
    if (!auto) {
      setZipLookupMessage('');
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);

      if (!response.ok) {
        throw new Error('Não foi possível consultar o CEP no momento.');
      }

      const data = await response.json();

      if (data?.erro) {
        throw new Error('CEP não encontrado. Confira o número digitado.');
      }

      const normalizeValue = (value, current) => {
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
        return current;
      };

      setForm((prev) => ({
        ...prev,
        street: normalizeValue(data.logradouro, prev.street),
        district: normalizeValue(data.bairro, prev.district),
        city: normalizeValue(data.localidade, prev.city),
        state: normalizeValue(data.uf, prev.state)
      }));

      lastZipLookupRef.current = cepDigits;
      setZipLookupMessage('Endereço preenchido automaticamente. Confira os dados antes de prosseguir.');
      setZipLookupError('');

      if (items.length > 0) {
        await handleCalculateShipping({ silent: true });
      }
    } catch (lookupError) {
      console.error('Erro ao buscar CEP:', lookupError);
      setZipLookupError(lookupError.message || 'Não foi possível consultar o CEP. Tente novamente em instantes.');
      setZipLookupMessage('');
      lastZipLookupRef.current = cepDigits;
    } finally {
      setZipLookupLoading(false);
    }
  }, [form.zip, handleCalculateShipping, items.length, zipLookupLoading]);

  useEffect(() => {
    const digits = form.zip.replace(/\D/g, '');

    if (digits.length === 8 && digits !== lastZipLookupRef.current) {
      handleCepLookup(digits, { auto: true });
    }
  }, [form.zip, handleCepLookup]);

  useEffect(() => {
    if (!shippingQuote) {
      return;
    }

    if (shippingQuote.itemsCount === itemsCount) {
      return;
    }

    setShippingQuote(null);

    const cepDigits = form.zip.replace(/\D/g, '');

    if (itemsCount > 0 && cepDigits.length === 8) {
      handleCalculateShipping({ silent: true });
      setShippingError('');
    } else {
      setShippingError('Os itens do carrinho foram alterados. Calcule o frete novamente.');
    }
  }, [form.zip, handleCalculateShipping, itemsCount, shippingQuote]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!items.length) {
      setError('Adicione pelo menos um produto ao carrinho antes de finalizar.');
      return;
    }

    if (!form.name || !form.email || !form.street || !form.city || !form.state) {
      setError('Preencha os campos obrigatórios do formulário (Nome, E-mail, Endereço, Cidade e Estado).');
      return;
    }

    if (!acceptedTerms) {
      setError('Aceite a política de devolução e segurança para concluir o pedido.');
      return;
    }

    if (!shippingQuote) {
      setError('Calcule o frete informando o CEP antes de finalizar.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            document: form.document
          },
          address: {
            street: form.street,
            number: form.number,
            complement: form.complement,
            district: form.district,
            city: form.city,
            state: form.state,
            zip: form.zip
          },
          items,
          shipping: shippingQuote,
          total: grandTotal
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Não foi possível registrar o pedido.');
      }

      setSuccess(data);
      setForm(initialForm);
      setAcceptedTerms(false);
      setShippingQuote(null);
      setShippingError('');
      fetchOrders();
      onOrderComplete?.();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao finalizar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPixPayload = async () => {
    if (!success?.pix?.payload) return;

    try {
      if (!navigator.clipboard) {
        window.prompt('Copie o código PIX abaixo:', success.pix.payload);
        return;
      }
      await navigator.clipboard.writeText(success.pix.payload);
      alert('Código PIX copiado!');
    } catch (err) {
      console.error('Erro ao copiar PIX:', err);
    }
  };

  const mpData = success?.mercadoPago;

  return (
    <section id="checkout" className={styles.checkoutSection}>
      <div className={styles.container}>
        <div className={styles.headerArea}>
          <div>
            <p className={styles.kicker}>Finalize sua compra</p>
            <h2>Dados para entrega e pagamento</h2>
            <p className={styles.subtitle}>
              Preencha os dados abaixo para registrar a venda e gerar o QR Code PIX. Os pedidos ficam salvos no painel para consulta.
            </p>
            <p className={styles.authHint}>
              {authLoading
                ? 'Verificando sua sessão...'
                : user
                  ? `Você está conectado como ${user.name || user.email}. Seus pedidos ficarão vinculados a esta conta.`
                  : 'Crie uma conta ou faça login para salvar seus pedidos com mais segurança e reutilizar seus dados.'}
            </p>
          </div>
          <div className={styles.summaryCard}>
            <h3>Resumo do carrinho</h3>
            {items.length === 0 ? (
              <p className={styles.emptyCart}>Seu carrinho está vazio no momento.</p>
            ) : (
              <ul className={styles.summaryList}>
                {items.map((item) => (
                  <li key={item.id}>
                    <span>
                      {item.name}
                      <small> × {item.quantity}</small>
                    </span>
                    <strong>R$ {(item.priceValue * item.quantity).toFixed(2)}</strong>
                  </li>
                ))}
              </ul>
            )}
            {items.length > 0 && (
              <>
                <div className={styles.totalRow}>
                  <span>Subtotal</span>
                  <strong>R$ {itemsTotal.toFixed(2)}</strong>
                </div>
                {shippingQuote ? (
                  <div className={`${styles.totalRow} ${styles.shippingRow}`}>
                    <span>
                      Frete
                      {shippingQuote.deliveryEstimate ? (
                        <small> {shippingQuote.deliveryEstimate}</small>
                      ) : null}
                    </span>
                    <strong>{shippingQuote.formattedPrice}</strong>
                  </div>
                ) : (
                  <p className={styles.shippingReminder}>Calcule o frete informando o CEP.</p>
                )}
                <div className={`${styles.totalRow} ${styles.grandTotalRow}`}>
                  <span>{shippingQuote ? 'Total com frete' : 'Total'}</span>
                  <strong>R$ {(shippingQuote ? grandTotal : itemsTotal).toFixed(2)}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.contentGrid}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <fieldset>
              <legend>Dados pessoais</legend>
              <div className={styles.fieldGroup}>
                <label>
                  Nome completo*
                  <input name="name" value={form.name} onChange={handleChange} placeholder="Ex: Ana Souza" required />
                </label>
                <label>
                  E-mail*
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="contato@email.com" required />
                </label>
              </div>
              <div className={styles.fieldGroup}>
                <label>
                  Telefone
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 90000-0000" />
                </label>
                <label>
                  CPF/CNPJ
                  <input name="document" value={form.document} onChange={handleChange} placeholder="000.000.000-00" />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Endereço para envio</legend>

              <div className={styles.cepControl}>
                <label className={styles.cepLabel}>
                  CEP*
                  <div className={styles.cepRow}>
                    <input
                      name="zip"
                      value={form.zip}
                      onChange={handleChange}
                      placeholder="00000-000"
                      maxLength={9}
                      required
                    />
                    <button
                      type="button"
                      className={styles.cepLookupButton}
                      onClick={() => handleCepLookup()}
                      disabled={zipLookupLoading}
                    >
                      {zipLookupLoading ? 'Buscando...' : 'Buscar CEP'}
                    </button>
                  </div>
                </label>
                <div className={styles.cepStatusArea}>
                  {zipLookupError && <p className={styles.cepStatusError}>{zipLookupError}</p>}
                  {!zipLookupError && zipLookupMessage && (
                    <p className={styles.cepStatusMessage}>{zipLookupMessage}</p>
                  )}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label>
                  Rua / Avenida*
                  <input name="street" value={form.street} onChange={handleChange} placeholder="Rua das Flores" required />
                </label>
                <label>
                  Número
                  <input name="number" value={form.number} onChange={handleChange} placeholder="123" />
                </label>
              </div>
              <div className={styles.fieldGroup}>
                <label>
                  Complemento
                  <input name="complement" value={form.complement} onChange={handleChange} placeholder="Apto / Casa" />
                </label>
                <label>
                  Bairro
                  <input name="district" value={form.district} onChange={handleChange} placeholder="Centro" />
                </label>
              </div>
              <div className={styles.fieldGroup}>
                <label>
                  Cidade*
                  <input name="city" value={form.city} onChange={handleChange} placeholder="São Paulo" required />
                </label>
                <label>
                  Estado*
                  <input name="state" value={form.state} onChange={handleChange} placeholder="SP" required />
                </label>
              </div>
            </fieldset>

            {items.length > 0 && (
              <div className={styles.shippingInfoBox}>
                {shippingQuote ? (
                  <div className={styles.shippingInfoContent}>
                    <p>
                      Frete para <strong>{shippingQuote.label || 'o CEP informado'}</strong>:
                      {' '}
                      <span>{shippingQuote.formattedPrice}</span>
                    </p>
                    <p className={styles.shippingEstimate}>
                      Prazo estimado: {shippingQuote.deliveryEstimate}.
                    </p>
                    <button
                      type="button"
                      className={styles.recalculateButton}
                      onClick={handleCalculateShipping}
                      disabled={shippingLoading}
                    >
                      Recalcular frete
                    </button>
                  </div>
                ) : (
                  <div className={styles.shippingCalculateBox}>
                    <p className={styles.shippingInfoHint}>
                      Informe o CEP para visualizar o valor e o prazo estimado da entrega.
                    </p>
                    <button
                      type="button"
                      className={styles.calculateButton}
                      onClick={() => handleCalculateShipping()}
                      disabled={shippingLoading || form.zip.replace(/\D/g, '').length !== 8}
                    >
                      {shippingLoading ? 'Calculando...' : 'Calcular frete'}
                    </button>
                  </div>
                )}
                {shippingError && <p className={styles.shippingError}>{shippingError}</p>}
              </div>
            )}

            <label className={styles.termsCheck}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
              />
              <span>
                Li e concordo com a{' '}
                <button
                  type="button"
                  className={styles.policyLink}
                  onClick={onOpenPolicy}
                >
                  política de devolução e segurança Reflora
                </button>
                .
              </span>
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" disabled={submitting} className={styles.submitButton}>
              {submitting ? 'Gerando pedido...' : 'Registrar pedido e gerar PIX'}
            </button>
          </form>

          <div className={styles.paymentPanel}>
            {success?.pix ? (
              <div className={styles.pixCard}>
                <h3>Pagamento PIX</h3>
                {success.order && (
                  <p className={styles.orderInfo}>
                    Pedido <strong>#{success.order.id}</strong> • Total R$ {Number(success.order.total || grandTotal).toFixed(2)}
                  </p>
                )}
                {success.order?.shipping && (
                  <p className={styles.orderShippingInfo}>
                    Frete ({success.order.shipping.deliveryEstimate || 'estimado'}): {success.order.shipping.formattedPrice}
                  </p>
                )}
                {success.pix.available ? (
                  <>
                    <img src={success.pix.qrCode} alt="QR Code para pagamento via PIX" className={styles.qrCode} />
                    <p className={styles.pixInstruction}>
                      Abra o app do seu banco, escolha pagar via QR Code e escaneie a imagem. Você também pode copiar o código abaixo e colar no Internet Banking.
                    </p>
                    <textarea
                      readOnly
                      value={success.pix.payload}
                      rows={4}
                      className={styles.pixPayload}
                    />
                    <button type="button" onClick={copyPixPayload} className={styles.copyButton}>
                      Copiar código PIX
                    </button>
                  </>
                ) : (
                  <p className={styles.pixUnavailable}>
                    {success.pix.message || 'Configure suas informações PIX para habilitar o QR Code.'}
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.placeholderCard}>
                <h3>QR Code PIX</h3>
                <p>
                  Assim que você salvar um pedido, o QR Code PIX gerado aparecerá aqui automaticamente.
                </p>
              </div>
            )}

            <div className={styles.mpCard}>
              <h3>Cartão ou boleto (Mercado Pago)</h3>
              {success ? (
                mpData?.available ? (
                  <>
                    <p className={styles.mpInfo}>
                      Use o checkout Mercado Pago para pagar com cartão de crédito, débito, boleto ou saldo em conta com toda a proteção da plataforma.
                    </p>
                    <a
                      href={mpData.initPoint || mpData.sandboxInitPoint}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.mpButton}
                    >
                      Abrir pagamento Mercado Pago
                    </a>
                    <p className={styles.mpDisclaimer}>
                      O link abre em outra aba. Após a confirmação pelo Mercado Pago, atualize o status do pedido e informe o cliente.
                    </p>
                  </>
                ) : (
                  <p className={styles.mpUnavailable}>
                    {mpData?.message || 'Configure as credenciais do Mercado Pago no arquivo .env para liberar o pagamento por cartão.'}
                  </p>
                )
              ) : (
                <p className={styles.mpInfo}>
                  Complete os dados e salve o pedido para gerar o link seguro do Mercado Pago.
                </p>
              )}
            </div>

            <div className={styles.ordersPanel}>
              <button type="button" className={styles.toggleOrders} onClick={() => setShowOrders((prev) => !prev)}>
                {showOrders ? 'Esconder cadastros' : 'Ver cadastros salvos'} ({orders.length})
              </button>

              {showOrders && (
                <div className={styles.ordersTableWrapper}>
                  {orders.length === 0 ? (
                    <p className={styles.noOrders}>
                      {user
                        ? 'Nenhum pedido cadastrado ainda.'
                        : 'Faça login ou crie uma conta para visualizar seus pedidos salvos.'}
                    </p>
                  ) : (
                    <table className={styles.ordersTable}>
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Cliente</th>
                          <th>E-mail</th>
                          <th>Cidade</th>
                          <th>Produtos</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr key={order.id}>
                            <td>{new Date(order.createdAt).toLocaleString('pt-BR')}</td>
                            <td>{order.customer?.name}</td>
                            <td>{order.customer?.email}</td>
                            <td>{order.address?.city}/{order.address?.state}</td>
                            <td>
                              {order.items?.map((item) => `${item.name} (x${item.quantity})`).join(', ')}
                            </td>
                            <td>
                              R$ {Number(order.total || 0).toFixed(2)}
                              {order.shipping?.price ? (
                                <small className={styles.shippingTableNote}>
                                  Frete: {order.shipping.formattedPrice}
                                </small>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Checkout;
