import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './AdminDashboard.module.css';
import { useAuth } from '../../context/AuthContext';

const SIZE_KEYS = ['PP', 'P', 'M', 'G'];

const createDefaultSizes = () => SIZE_KEYS.reduce((acc, size) => ({ ...acc, [size]: true }), {});

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
  purchaseLink: '',
  stock: '1',
  sizes: createDefaultSizes(),
  images: []
});

const formatCurrency = (value) => {
  if (!Number.isFinite(Number(value))) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
};

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
      const response = await fetch('/api/orders', {
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
      const response = await fetch('/api/products');
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

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });

    setUploading(true);

    try {
      const response = await fetch('/api/uploads/images', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Não foi possível enviar as imagens.');
      }

      const urls = Array.isArray(data.urls) ? data.urls : [];
      if (urls.length === 0) {
        throw new Error('Nenhuma imagem válida foi retornada.');
      }

      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...urls]
      }));

      showFeedback('Imagens adicionadas com sucesso.');
    } catch (err) {
      console.error(err);
      showError(err.message || 'Falha ao subir imagens.');
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
    setForm({
      name: product.name || '',
      description: product.description || '',
      priceValue: String(product.priceValue ?? ''),
      purchaseLink: product.purchaseLink || '',
      stock: String(Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0),
      sizes: normalizeSizes(product.sizes),
      images: Array.isArray(product.images) ? [...product.images] : []
    });
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Tem certeza que deseja remover esta peça do catálogo?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/products/${productId}`, {
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
    const { name, description, priceValue, purchaseLink, stock, sizes, images } = form;

    const sanitizedImages = Array.isArray(images) ? images.filter(Boolean) : [];
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedLink = purchaseLink.trim();
    const stockNumber = Number(stock);

    if (!trimmedName || !trimmedDescription || !trimmedLink || !priceValue) {
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
      purchaseLink: trimmedLink,
      priceValue,
      stock: stockNumber,
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

      const response = await fetch(endpoint, {
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
                    <th>Total</th>
                    <th>Itens</th>
                    <th>Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td><code>{order.id}</code></td>
                      <td>{new Date(order.createdAt).toLocaleString('pt-BR')}</td>
                      <td>
                        <strong>{order.customer?.name}</strong>
                        <br />
                        <small>{order.customer?.email}</small>
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
                        {order.pix?.available && <span className={styles.badge}>PIX</span>}
                        {order.mercadoPago?.available && <span className={styles.badge}>MP</span>}
                      </td>
                    </tr>
                  ))}
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
                  required
                />
              </label>

              <label>
                Link de compra
                <input
                  type="url"
                  name="purchaseLink"
                  value={form.purchaseLink}
                  onChange={handleFormChange}
                  placeholder="https://"
                  required
                />
              </label>

              <fieldset className={styles.sizeFieldset}>
                <legend>Tamanhos disponíveis</legend>
                <div className={styles.sizeOptions}>
                  {SIZE_KEYS.map((size) => (
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
                          <strong>{Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0}</strong>
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
                      <a href={product.purchaseLink} target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
                        Ver link da peça ↗
                      </a>
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
