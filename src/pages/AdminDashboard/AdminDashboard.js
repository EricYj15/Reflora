import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminDashboard.module.css';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';

const SIZE_KEYS = ['PP', 'P', 'M', 'G', '36', '37', '38', '39', '40', '41', '42', '43', '44'];

const createDefaultSizes = () => SIZE_KEYS.reduce((acc, size) => ({ ...acc, [size]: false }), {}); // Mudado para false

const normalizeSizes = (rawSizes) => {
  const normalized = createDefaultSizes();

  SIZE_KEYS.forEach((size) => {
    const value = rawSizes?.[size];
    if (typeof value === 'boolean') {
      normalized[size] = value;
    } else if (value != null) {
      normalized[size] = Boolean(value);
    }
  });

  return normalized;
};

const createEmptyProduct = () => ({
  name: '',
  description: '',
  priceValue: '',
  stock: '1',
  isExclusive: false,
  sizeType: 'clothing', // 'clothing' ou 'numeric'
  sizes: createDefaultSizes(),
  images: []
});

const formatCurrency = (value) => {
  if (!Number.isFinite(Number(value))) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
};

const formatCep = (value = '') => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return value || '';
};

const buildAddressLines = (address = {}) => {
  if (!address || typeof address !== 'object') {
    return [];
  }

  const { street, number, complement, district, city, state, zip } = address;
  const lines = [];

  const baseLine = [street, number].filter(Boolean).join(', ');
  if (baseLine) {
    lines.push(complement ? `${baseLine} - ${complement}` : baseLine);
  } else if (complement) {
    lines.push(complement);
  }

  if (district) {
    lines.push(district);
  }

  const cityState = [city, state].filter(Boolean).join(' - ');
  if (cityState) {
    lines.push(cityState);
  }

  if (zip) {
    lines.push(`CEP: ${formatCep(zip)}`);
  }

  return lines;
};

const STATUS_BADGES = {
  pending_payment: { label: 'Aguardando pagamento', className: 'statusPending' },
  paid: { label: 'Pagamento confirmado', className: 'statusPaid' },
  shipped: { label: 'Pedido enviado', className: 'statusShipped' },
  in_transit: { label: 'Em trânsito', className: 'statusTransit' },
  delivered: { label: 'Pedido entregue', className: 'statusDelivered' },
  cancelled: { label: 'Cancelado', className: 'statusCancelled' }
};

const CANCEL_NOTE_DEFAULT = 'Pedido cancelado e reembolso realizado.';

const AdminDashboard = () => {
  const { token, user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [form, setForm] = useState(() => createEmptyProduct());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState({});

  const authHeaders = useMemo(() => (
    token
      ? {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      : { 'Content-Type': 'application/json' }
  ), [token]);

  const showFeedback = useCallback((message, type = 'success') => {
    setError(null);
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const showSuccess = useCallback((message) => {
    setError(null);
    setFeedback({ message, type: 'success' });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const showError = useCallback((message) => {
    setFeedback(null);
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!token) {
      return;
    }

    setOrdersLoading(true);
    try {
      const response = await apiFetch('/api/orders', {
        headers: authHeaders
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível carregar os pedidos.');
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Não foi possível buscar os pedidos.');
    } finally {
      setOrdersLoading(false);
    }
  }, [authHeaders, showError, token]);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const response = await apiFetch('/api/products');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível carregar os produtos.');
      }
      const normalizedProducts = Array.isArray(data.products)
        ? data.products.map((product) => ({
            ...product,
            stock: Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0,
            sizes: normalizeSizes(product?.sizes)
          }))
        : [];

      setProducts(normalizedProducts);
    } catch (err) {
      console.error(err);
      showError(err.message || 'Não foi possível buscar os produtos.');
    } finally {
      setProductsLoading(false);
    }
  }, [showError]);

  const handleAddTracking = useCallback(async (orderId) => {
    const trackingCode = prompt('Digite o código de rastreamento dos Correios (ex: AA123456789BR):');
    
    if (!trackingCode) return;

    const normalized = trackingCode.trim().toUpperCase();
    
    if (!/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(normalized)) {
      showError('Código inválido. Use o formato: AA123456789BR');
      return;
    }

    try {
      if (!token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await apiFetch(`/api/orders/${orderId}/tracking`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackingCode: normalized })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao adicionar código de rastreamento');
      }

      showSuccess('Código de rastreamento adicionado com sucesso!');
      fetchOrders(); // Recarregar pedidos
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao adicionar código de rastreamento.');
    }
  }, [showError, showSuccess, fetchOrders]);

  const handleCancelOrder = useCallback(async (order) => {
    if (!order || order.status === 'cancelled') {
      return;
    }

    const confirmCancel = window.confirm(`Cancelar o pedido ${order.id}? O cliente será notificado e o estoque retornará.`);
    if (!confirmCancel) {
      return;
    }

    const noteInput = window.prompt('Escreva uma nota para o cliente (opcional):', CANCEL_NOTE_DEFAULT);
    const note = noteInput && noteInput.trim() ? noteInput.trim() : CANCEL_NOTE_DEFAULT;

    try {
      setStatusUpdating((prev) => ({ ...prev, [order.id]: true }));
      const response = await apiFetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'cancelled', description: note })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível cancelar o pedido.');
      }

      showSuccess('Pedido cancelado e estoque atualizado. Cliente receberá a notificação.');
      fetchOrders();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao cancelar pedido.');
    } finally {
      setStatusUpdating((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
    }
  }, [authHeaders, fetchOrders, showError, showSuccess]);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    refreshUser().catch(() => {});
  }, [fetchOrders, fetchProducts, refreshUser]);

  const handleTabChange = (tab) => setActiveTab(tab);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    if (name === 'stock') {
      const sanitized = value.replace(/[^0-9]/g, '');
      setForm((prev) => ({ ...prev, stock: sanitized }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleSize = (size) => {
    setForm((prev) => ({
      ...prev,
      sizes: {
        ...prev.sizes,
        [size]: !prev.sizes[size]
      }
    }));
  };

  const handleToggleExclusive = () => {
    setForm((prev) => {
      const nextExclusive = !prev.isExclusive;
      return {
        ...prev,
        isExclusive: nextExclusive,
        stock: nextExclusive ? '1' : (prev.stock === '' ? '1' : prev.stock)
      };
    });
  };

  const handleSizeTypeChange = (event) => {
    const newType = event.target.value;
    setForm((prev) => ({
      ...prev,
      sizeType: newType,
      // Limpar tamanhos ao trocar de tipo
      sizes: createDefaultSizes()
    }));
  };

  const handleRemoveImage = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== index)
    }));
  };

  const handleUploadImages = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    // Validar tamanho dos arquivos (5MB cada)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
      showError(`Alguns arquivos são muito grandes. Máximo: 5MB por arquivo.`);
      event.target.value = '';
      return;
    }

    // Validar tipo dos arquivos
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidTypes = files.filter(file => !validTypes.includes(file.type));
    if (invalidTypes.length > 0) {
      showError(`Apenas imagens JPG, PNG e WebP são permitidas.`);
      event.target.value = '';
      return;
    }

    setUploading(true);

    try {
      // Cloudinary configuration
      const CLOUD_NAME = 'df3pdowi0';
      const UPLOAD_PRESET = 'reflora_uploads';
      const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

      // Upload cada arquivo para o Cloudinary
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'reflora');

        const response = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Falha ao fazer upload da imagem');
        }

        const data = await response.json();
        return data.secure_url; // URL permanente da imagem
      });

      const urls = await Promise.all(uploadPromises);

      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));

      showFeedback(`${urls.length} imagem(ns) adicionada(s) com sucesso.`);
    } catch (err) {
      console.error('Erro no upload:', err);
      showError(err.message || 'Falha ao fazer upload das imagens.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const resetForm = () => {
    setForm(createEmptyProduct());
    setEditingId(null);
  };

  const handleEditProduct = (product) => {
    setEditingId(product.id);
    setActiveTab('products');
    
    // Detectar tipo de tamanho baseado nos tamanhos marcados
    const clothingSizes = ['PP', 'P', 'M', 'G'];
    const numericSizes = ['36', '37', '38', '39', '40', '41', '42', '43', '44'];
    const sizes = normalizeSizes(product.sizes);
    
    const hasClothing = clothingSizes.some(size => sizes[size]);
    const hasNumeric = numericSizes.some(size => sizes[size]);
    
    let sizeType = 'clothing';
    if (hasNumeric && !hasClothing) {
      sizeType = 'numeric';
    } else if (hasClothing && hasNumeric) {
      // Se tem ambos, prioriza o que tem mais marcados
      const clothingCount = clothingSizes.filter(size => sizes[size]).length;
      const numericCount = numericSizes.filter(size => sizes[size]).length;
      sizeType = numericCount > clothingCount ? 'numeric' : 'clothing';
    }
    
    setForm({
      name: product.name || '',
      description: product.description || '',
      priceValue: String(product.priceValue ?? ''),
      stock: String(Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0),
      isExclusive: Boolean(product.isExclusive),
      sizeType,
      sizes: sizes,
      images: Array.isArray(product.images) ? [...product.images] : []
    });
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Tem certeza que deseja remover esta peça do catálogo?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await apiFetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível remover o produto.');
      }
      showFeedback('Produto removido com sucesso.');
      fetchProducts();
      resetForm();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Falha ao remover o produto.');
    } finally {
      setSaving(false);
    }
  };

  const buildPayload = () => {
    const { name, description, priceValue, stock, sizes, images, isExclusive } = form;

    const sanitizedImages = Array.isArray(images) ? images.filter(Boolean) : [];
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const stockNumber = isExclusive ? 1 : Number(stock);

    if (!trimmedName || !trimmedDescription || !priceValue) {
      throw new Error('Preencha todos os campos obrigatórios da peça.');
    }

    if (!Number.isFinite(stockNumber) || stockNumber < 0) {
      throw new Error('Informe uma quantidade em estoque válida.');
    }

    if (sanitizedImages.length === 0) {
      throw new Error('Envie ao menos uma imagem para a peça.');
    }

    const normalizedSizes = normalizeSizes(sizes);

    if (!Object.values(normalizedSizes).some(Boolean)) {
      throw new Error('Selecione ao menos um tamanho disponível.');
    }

    return {
      name: trimmedName,
      description: trimmedDescription,
      priceValue,
      stock: stockNumber,
      isExclusive: Boolean(isExclusive),
      sizes: normalizedSizes,
      images: sanitizedImages
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const payload = buildPayload();
      setSaving(true);
      setError(null);

      const endpoint = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';

      const response = await apiFetch(endpoint, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Não foi possível salvar o produto.');
      }

      showFeedback(editingId ? 'Produto atualizado com sucesso.' : 'Produto criado com sucesso.');
      fetchProducts();
      resetForm();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Falha ao salvar o produto.');
    } finally {
      setSaving(false);
    }
  };

  const totalSalesValue = useMemo(() => {
    return orders.reduce((acc, order) => acc + (Number(order.total) || 0), 0);
  }, [orders]);

  const uniqueCustomers = useMemo(() => {
    const emails = new Set();
    orders.forEach((order) => {
      if (order?.customer?.email) {
        emails.add(order.customer.email.toLowerCase());
      }
    });
    return emails.size;
  }, [orders]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>Painel administrativo</h1>
          <p>Gerencie seu catálogo, acompanhe pedidos e cuide da experiência Reflora.</p>
        </div>
        <div className={styles.breadcrumbs}>
          <Link to="/">← Voltar para a loja</Link>
        </div>
      </header>

      <section className={styles.metrics}>
        <article className={styles.metricCard}>
          <span>Total de pedidos</span>
          <strong>{orders.length}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Clientes únicos</span>
          <strong>{uniqueCustomers}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Receita estimada</span>
          <strong>{formatCurrency(totalSalesValue)}</strong>
        </article>
        <article className={styles.metricCard}>
          <span>Peças ativas</span>
          <strong>{products.length}</strong>
        </article>
      </section>

      <nav className={styles.tabs} aria-label="Seções do painel administrativo">
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'orders' ? styles.active : ''}`}
          onClick={() => handleTabChange('orders')}
        >
          Pedidos
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'products' ? styles.active : ''}`}
          onClick={() => handleTabChange('products')}
        >
          Catálogo
        </button>
      </nav>

      {(feedback || error) && (
        <div className={`${styles.feedback} ${feedback ? styles.success : styles.error}`} role="status">
          {feedback?.message || error}
        </div>
      )}

      {activeTab === 'orders' && (
        <section className={styles.panelSection}>
          {ordersLoading ? (
            <p className={styles.placeholder}>Carregando pedidos…</p>
          ) : orders.length === 0 ? (
            <p className={styles.placeholder}>Nenhum pedido ainda. Divulgue suas peças e acompanhe os resultados por aqui.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Entrega e contato</th>
                    <th>Total</th>
                    <th>Itens</th>
                    <th>Status</th>
                    <th>Pagamento</th>
                    <th>Rastreamento</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const addressLines = buildAddressLines(order.address);
                    const statusInfo = STATUS_BADGES[order.status] || { label: order.status || 'Status desconhecido', className: 'statusDefault' };
                    const statusClass = styles[statusInfo.className] || styles.statusDefault;
                    const statusInProgress = Boolean(statusUpdating[order.id]);
                    const latestStatusEntry = Array.isArray(order.statusHistory) && order.statusHistory.length
                      ? order.statusHistory[order.statusHistory.length - 1]
                      : null;
                    const lastUpdateRaw = latestStatusEntry?.timestamp || order.updatedAt || order.createdAt;
                    const lastUpdateDate = lastUpdateRaw ? new Date(lastUpdateRaw) : null;
                    const lastUpdateText = lastUpdateDate && !Number.isNaN(lastUpdateDate.getTime())
                      ? lastUpdateDate.toLocaleString('pt-BR')
                      : 'Sem registro';
                    return (
                      <tr key={order.id}>
                      <td><code>{order.id}</code></td>
                      <td>{new Date(order.createdAt).toLocaleString('pt-BR')}</td>
                      <td>
                        <strong>{order.customer?.name}</strong>
                        <br />
                        <small>{order.customer?.email}</small>
                      </td>
                      <td>
                        <div className={styles.addressBlock}>
                          {addressLines.map((line, index) => (
                            <span key={`${order.id}-addr-${index}`} className={styles.addressLine}>
                              {line}
                            </span>
                          ))}
                          {addressLines.length === 0 && (
                            <span className={styles.addressPlaceholder}>Endereço não informado</span>
                          )}
                          {order.customer?.phone && (
                            <span className={styles.contactLine}>Telefone: {order.customer.phone}</span>
                          )}
                        </div>
                      </td>
                      <td>{formatCurrency(order.total)}</td>
                      <td>
                        <ul className={styles.itemList}>
                          {order.items.map((item) => (
                            <li key={item.id}>
                              {item.name}
                              <span>
                                {' '}
                                ×
                                {' '}
                                {item.quantity}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <div className={styles.statusCell}>
                          <span className={`${styles.statusBadge} ${statusClass}`}>
                            {statusInfo.label}
                          </span>
                          <div className={styles.statusMeta}>
                            <span>
                              Atualizado em {lastUpdateText}
                            </span>
                            {order.inventoryLocked && order.status !== 'cancelled' && (
                              <span className={styles.statusMetaLine}>Estoque reservado</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {order.pix?.available && <span className={styles.badge}>PIX</span>}
                        {order.mercadoPago?.available && <span className={styles.badge}>MP</span>}
                      </td>
                      <td>
                        {order.trackingCode ? (
                          <div className={styles.trackingCell}>
                            <code>{order.trackingCode}</code>
                          </div>
                        ) : (
                          <button 
                            className={styles.addTrackingButton}
                            onClick={() => handleAddTracking(order.id)}
                            title="Adicionar código de rastreamento"
                          >
                            + Adicionar
                          </button>
                        )}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => handleCancelOrder(order)}
                            disabled={order.status === 'cancelled' || statusInProgress}
                          >
                            {statusInProgress ? 'Cancelando…' : order.status === 'cancelled' ? 'Cancelado' : 'Cancelar pedido'}
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === 'products' && (
        <section className={styles.productsGrid}>
          <div className={styles.formCard}>
            <h2>{editingId ? 'Editar peça' : 'Nova peça'}</h2>
            <form className={styles.form} onSubmit={handleSubmit}>
              <label>
                Nome da peça
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Ex.: Colar Aurora"
                  required
                />
              </label>

              <label>
                Descrição
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Conte a história por trás da peça…"
                  rows={4}
                  required
                />
              </label>

              <label>
                Preço
                <input
                  type="number"
                  name="priceValue"
                  step="0.01"
                  min="0"
                  value={form.priceValue}
                  onChange={handleFormChange}
                  placeholder="189.90"
                  required
                />
              </label>

              <label>
                Quantidade em estoque
                <input
                  type="number"
                  name="stock"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={handleFormChange}
                  placeholder="1"
                    disabled={form.isExclusive}
                  required
                />
              </label>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={!!form.isExclusive}
                    onChange={handleToggleExclusive}
                  />
                  Peça exclusiva (estoque unitário)
                </label>

              <fieldset className={styles.sizeFieldset}>
                <legend>Tamanhos disponíveis</legend>
                
                <label className={styles.sizeTypeSelector}>
                  Tipo de produto:
                  <select 
                    value={form.sizeType || 'clothing'} 
                    onChange={handleSizeTypeChange}
                    className={styles.sizeTypeSelect}
                  >
                    <option value="clothing">Roupas (PP, P, M, G)</option>
                    <option value="numeric">Calçados/Calças (36-44)</option>
                  </select>
                </label>

                {form.sizeType === 'clothing' ? (
                  <div className={styles.sizeGroup}>
                    <h4 className={styles.sizeGroupTitle}>Tamanhos de Roupas</h4>
                    <div className={styles.sizeOptions}>
                      {['PP', 'P', 'M', 'G'].map((size) => (
                        <label
                          key={size}
                          className={`${styles.sizeOption} ${form.sizes[size] ? styles.sizeOptionActive : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={!!form.sizes[size]}
                            onChange={() => handleToggleSize(size)}
                          />
                          {size}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.sizeGroup}>
                    <h4 className={styles.sizeGroupTitle}>Tamanhos Numéricos</h4>
                    <div className={styles.sizeOptions}>
                      {['36', '37', '38', '39', '40', '41', '42', '43', '44'].map((size) => (
                        <label
                          key={size}
                          className={`${styles.sizeOption} ${form.sizes[size] ? styles.sizeOptionActive : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={!!form.sizes[size]}
                            onChange={() => handleToggleSize(size)}
                          />
                          {size}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </fieldset>

              <div className={styles.imageUploader}>
                <div className={styles.uploadControls}>
                  <label className={`${styles.uploadLabel} ${uploading ? styles.uploadLabelBusy : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadImages}
                      disabled={uploading}
                    />
                    {uploading ? 'Enviando imagens…' : 'Selecionar imagens'}
                  </label>
                  <p className={styles.uploadHint}>Formatos JPG/PNG, até 5MB por arquivo.</p>
                </div>

                {form.images.length === 0 ? (
                  <p className={styles.placeholder}>Nenhuma imagem enviada até o momento.</p>
                ) : (
                  <ul className={styles.imagePreviewList}>
                    {form.images.map((imageUrl, index) => (
                      <li key={imageUrl} className={styles.imagePreview}>
                        <img src={imageUrl} alt={`Pré-visualização ${index + 1}`} />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className={styles.removeImageButton}
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.formActions}>
                {editingId && (
                  <button type="button" className={styles.secondaryButton} onClick={resetForm} disabled={saving}>
                    Cancelar edição
                  </button>
                )}
                <button type="submit" className={styles.primaryButton} disabled={saving || uploading}>
                  {saving ? 'Salvando…' : uploading ? 'Aguarde o envio…' : editingId ? 'Atualizar peça' : 'Adicionar peça'}
                </button>
              </div>
            </form>
          </div>

          <div className={styles.catalogList}>
            <div className={styles.catalogHeader}>
              <h2>Catálogo atual</h2>
              <button type="button" onClick={fetchProducts} className={styles.refreshButton} disabled={productsLoading}>
                {productsLoading ? 'Atualizando…' : 'Recarregar' }
              </button>
            </div>

            {productsLoading ? (
              <p className={styles.placeholder}>Carregando catálogo…</p>
            ) : products.length === 0 ? (
              <p className={styles.placeholder}>Ainda não há peças cadastradas. Utilize o formulário ao lado para começar.</p>
            ) : (
              <ul className={styles.cardList}>
                {products.map((product) => (
                  <li key={product.id} className={styles.catalogCard}>
                    <div className={styles.cardImage}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} loading="lazy" />
                      ) : (
                        <div className={styles.imagePlaceholder}>Sem imagem</div>
                      )}
                    </div>
                    <div className={styles.cardContent}>
                      <h3>{product.name}</h3>
                      <p className={styles.cardPrice}>{formatCurrency(product.priceValue)}</p>
                      <div className={styles.cardMeta}>
                        <span>
                          Estoque:
                          {' '}
                          <strong>{product.isExclusive ? 'Peça exclusiva' : (Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0)}</strong>
                        </span>
                        <div className={styles.sizeBadges}>
                          {SIZE_KEYS.map((size) => (
                            <span
                              key={size}
                              className={`${styles.sizeBadge} ${product.sizes?.[size] ? styles.sizeBadgeAvailable : styles.sizeBadgeUnavailable}`}
                            >
                              {size}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className={styles.cardDescription}>{product.description}</p>
                      <div className={styles.cardActions}>
                        <button type="button" onClick={() => handleEditProduct(product)} className={styles.smallButton}>
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          className={`${styles.smallButton} ${styles.danger}`}
                          disabled={saving}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <p>
          Logado como <strong>{user?.name || user?.email}</strong> ·
          {' '}
          <span className={styles.badge}>Admin</span>
        </p>
      </footer>
    </div>
  );
};

export default AdminDashboard;
