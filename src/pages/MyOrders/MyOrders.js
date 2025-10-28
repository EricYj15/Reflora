import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import styles from './MyOrders.module.css';

export default function MyOrders() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError('Você precisa fazer login para ver seus pedidos.');
      setLoading(false);
      return;
    }

    console.log('Buscando pedidos com token:', token ? 'Token presente' : 'Token ausente');

    try {
      const response = await apiFetch('/api/orders/my-orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro na resposta:', errorData);
        throw new Error(errorData.message || 'Erro ao buscar pedidos');
      }

      const data = await response.json();
      console.log('Pedidos recebidos:', data.length);
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
      setError(err.message || 'Não foi possível carregar seus pedidos.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) {
      setLoading(false);
      return;
    }
    
    fetchOrders();
  }, [user, token, fetchOrders]);

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  }

  function getStatusLabel(status) {
    const statusMap = {
      pending: 'Aguardando Pagamento',
      paid: 'Pago',
      processing: 'Em Processamento',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };
    return statusMap[status] || status;
  }

  function getStatusClass(status) {
    const classMap = {
      pending: styles.statusPending,
      paid: styles.statusPaid,
      processing: styles.statusProcessing,
      shipped: styles.statusShipped,
      delivered: styles.statusDelivered,
      cancelled: styles.statusCancelled
    };
    return classMap[status] || '';
  }

  function toggleOrderDetails(orderId) {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Faça login para ver seus pedidos</h2>
          <p>Entre na sua conta para acompanhar seus pedidos.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando pedidos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Erro ao carregar pedidos</h2>
          <p className={styles.error}>{error}</p>
          <button onClick={() => { setError(null); setLoading(true); fetchOrders(); }} className={styles.retryButton}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Meus Pedidos</h1>
        <p className={styles.subtitle}>Acompanhe o status dos seus pedidos</p>
      </div>

      {orders.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>Você ainda não fez nenhum pedido</h2>
          <p>Explore nossa coleção e faça seu primeiro pedido!</p>
          <a href="/#produtos" className={styles.shopButton}>
            Ver Produtos
          </a>
        </div>
      ) : (
        <div className={styles.ordersList}>
          {orders.map((order) => (
            <div key={order.id} className={styles.orderCard}>
              <div 
                className={styles.orderHeader}
                onClick={() => toggleOrderDetails(order.id)}
              >
                <div className={styles.orderInfo}>
                  <div className={styles.orderNumber}>
                    Pedido #{order.id.slice(0, 8)}
                  </div>
                  <div className={styles.orderDate}>
                    {formatDate(order.createdAt)}
                  </div>
                </div>
                <div className={styles.orderSummary}>
                  <span className={`${styles.status} ${getStatusClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                  <span className={styles.orderTotal}>
                    {formatPrice(order.total)}
                  </span>
                </div>
                <button className={styles.expandButton}>
                  {expandedOrderId === order.id ? '▲' : '▼'}
                </button>
              </div>

              {expandedOrderId === order.id && (
                <div className={styles.orderDetails}>
                  <div className={styles.section}>
                    <h3>Itens do Pedido</h3>
                    <div className={styles.items}>
                      {order.items.map((item, idx) => (
                        <div key={idx} className={styles.item}>
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className={styles.itemImage}
                            />
                          )}
                          <div className={styles.itemInfo}>
                            <div className={styles.itemName}>{item.name}</div>
                            <div className={styles.itemDetails}>
                              Qtd: {item.quantity} × {formatPrice(item.priceValue)}
                            </div>
                          </div>
                          <div className={styles.itemTotal}>
                            {formatPrice(item.priceValue * item.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.section}>
                    <h3>Resumo do Pedido</h3>
                    <div className={styles.summary}>
                      <div className={styles.summaryRow}>
                        <span>Subtotal:</span>
                        <span>{formatPrice(order.items.reduce((sum, item) => sum + (item.priceValue * item.quantity), 0))}</span>
                      </div>
                      {order.shipping?.price && (
                        <div className={styles.summaryRow}>
                          <span>Frete:</span>
                          <span>{order.shipping.formattedPrice || formatPrice(order.shipping.price)}</span>
                        </div>
                      )}
                      <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                        <span>Total:</span>
                        <span>{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  {order.customer && (
                    <div className={styles.section}>
                      <h3>Dados de Entrega</h3>
                      <div className={styles.customerInfo}>
                        <p><strong>Nome:</strong> {order.customer.name}</p>
                        <p><strong>Email:</strong> {order.customer.email}</p>
                        <p><strong>Telefone:</strong> {order.customer.phone}</p>
                        {order.customer.address && (
                          <>
                            <p>
                              <strong>Endereço:</strong> {order.customer.address.street}, {order.customer.address.number}
                            </p>
                            {order.customer.address.complement && (
                              <p><strong>Complemento:</strong> {order.customer.address.complement}</p>
                            )}
                            <p>
                              <strong>Bairro:</strong> {order.customer.address.neighborhood}
                            </p>
                            <p>
                              <strong>Cidade:</strong> {order.customer.address.city} - {order.customer.address.state}
                            </p>
                            <p><strong>CEP:</strong> {order.customer.address.cep}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {order.paymentMethod && (
                    <div className={styles.section}>
                      <h3>Forma de Pagamento</h3>
                      <p className={styles.paymentMethod}>
                        {order.paymentMethod === 'mercadopago' ? 'Mercado Pago' : 
                         order.paymentMethod === 'pix' ? 'PIX' : 
                         order.paymentMethod}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
