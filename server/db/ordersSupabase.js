const {
  getSupabaseAdmin,
  isSupabaseConfigured,
  SUPABASE_ORDERS_TABLE
} = require('./supabase');

function normalizeOrderForStorage(order) {
  if (!order || typeof order !== 'object') {
    return null;
  }

  const createdAt = order.createdAt || new Date().toISOString();
  const updatedAt = order.updatedAt || createdAt;

  const items = Array.isArray(order.items)
    ? order.items.map((item) => ({
        id: item?.id ? String(item.id) : undefined,
        name: item?.name || '',
        quantity: Number(item?.quantity) || 0,
        priceValue: Number(item?.priceValue) || 0
      }))
    : [];

  const statusHistory = Array.isArray(order.statusHistory)
    ? order.statusHistory.map((entry) => ({
        status: entry?.status || '',
        timestamp: entry?.timestamp || null,
        description: entry?.description || ''
      }))
    : [];

  const payload = {
    ...order,
    id: String(order.id || ''),
    userId: order.userId || null,
    customer: order.customer || null,
    address: order.address || null,
    shipping: order.shipping || null,
    coupon: order.coupon || null,
    payment: order.payment || null,
    createdAt,
    updatedAt,
    items,
    statusHistory,
    inventoryLocked: Boolean(order.inventoryLocked),
    inventoryLockedAt: order.inventoryLockedAt || null,
    inventoryUnlockedAt: order.inventoryUnlockedAt || null,
    trackingCode: order.trackingCode || null,
    trackingAddedAt: order.trackingAddedAt || null
  };

  const email = payload.customer?.email || order.email || null;
  const total = Number.isFinite(Number(payload.total)) ? Number(payload.total) : 0;
  const status = payload.status || 'pending_payment';

  return {
    id: payload.id,
    user_id: payload.userId,
    email,
    status,
    total,
    data: payload,
    created_at: createdAt,
    updated_at: updatedAt
  };
}

function mapOrderFromStorage(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const payload = row.data && typeof row.data === 'object' ? row.data : {};
  const id = String(row.id || payload.id || '');
  const createdAt = payload.createdAt || row.created_at || null;
  const updatedAt = payload.updatedAt || row.updated_at || createdAt;
  const status = payload.status || row.status || 'pending_payment';
  const total = Number.isFinite(Number(row.total))
    ? Number(row.total)
    : Number.isFinite(Number(payload.total))
      ? Number(payload.total)
      : 0;

  const normalized = {
    ...payload,
    id,
    userId: payload.userId || row.user_id || null,
    status,
    total,
    createdAt,
    updatedAt,
    customer: payload.customer || (row.email ? { ...payload.customer, email: row.email } : payload.customer) || null,
    items: Array.isArray(payload.items) ? payload.items : [],
    statusHistory: Array.isArray(payload.statusHistory) ? payload.statusHistory : []
  };

  if (!normalized.customer && row.email) {
    normalized.customer = { email: row.email };
  } else if (normalized.customer && row.email && !normalized.customer.email) {
    normalized.customer.email = row.email;
  }

  return normalized;
}

async function fetchAllOrders() {
  const client = getSupabaseAdmin();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from(SUPABASE_ORDERS_TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map(mapOrderFromStorage).filter(Boolean) : [];
}

async function fetchOrdersByUser(userId) {
  if (!userId) {
    return [];
  }

  const client = getSupabaseAdmin();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from(SUPABASE_ORDERS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.map(mapOrderFromStorage).filter(Boolean) : [];
}

async function upsertOrders(orders = []) {
  const client = getSupabaseAdmin();
  if (!client) {
    return;
  }

  const payload = (orders || [])
    .map(normalizeOrderForStorage)
    .filter((entry) => entry && entry.id);

  if (payload.length === 0) {
    await deleteAllOrders();
    return;
  }

  const { error } = await client
    .from(SUPABASE_ORDERS_TABLE)
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    throw error;
  }

  const { data: existing, error: fetchError } = await client
    .from(SUPABASE_ORDERS_TABLE)
    .select('id');

  if (fetchError) {
    throw fetchError;
  }

  const keepIds = new Set(payload.map((entry) => String(entry.id)));
  const idsToDelete = (existing || [])
    .map((row) => String(row.id))
    .filter((id) => !keepIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await client
      .from(SUPABASE_ORDERS_TABLE)
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }
}

async function upsertSingleOrder(order) {
  if (!order) {
    return;
  }

  await upsertOrders([order]);
}

async function deleteOrderById(id) {
  const client = getSupabaseAdmin();
  if (!client || !id) {
    return;
  }

  const { error } = await client
    .from(SUPABASE_ORDERS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

async function deleteAllOrders() {
  const client = getSupabaseAdmin();
  if (!client) {
    return;
  }

  await client.from(SUPABASE_ORDERS_TABLE).delete().neq('id', null);
}

module.exports = {
  isSupabaseConfigured,
  fetchAllOrders,
  fetchOrdersByUser,
  upsertOrders,
  upsertSingleOrder,
  deleteOrderById,
  deleteAllOrders
};
