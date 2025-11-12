const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const SUPABASE_SCHEMA = process.env.SUPABASE_SCHEMA || 'public';
const SUPABASE_PRODUCTS_TABLE = process.env.SUPABASE_PRODUCTS_TABLE || 'products';
const SUPABASE_ORDERS_TABLE = process.env.SUPABASE_ORDERS_TABLE || 'orders';

let adminClient = null;

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: SUPABASE_SCHEMA
      }
    });
  }

  return adminClient;
}

function normalizeProductForStorage(product) {
  if (!product || typeof product !== 'object') {
    return null;
  }

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : product.images
      ? [product.images]
      : [];

  return {
    ...product,
    priceValue: Number(product.priceValue) || 0,
    stock: Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0,
    images,
    sizes: product.sizes && typeof product.sizes === 'object' ? product.sizes : null
  };
}

async function fetchAllProducts() {
  const client = getSupabaseAdmin();
  if (!client) {
    return [];
  }

  const { data, error } = await client.from(SUPABASE_PRODUCTS_TABLE).select('*').order('createdAt', { ascending: false }).order('id', { ascending: false });
  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
}

async function upsertProducts(products = []) {
  const client = getSupabaseAdmin();
  if (!client) {
    return;
  }

  const payload = (products || [])
    .map((product) => normalizeProductForStorage(product))
    .filter(Boolean);

  if (payload.length === 0) {
    await deleteAllProducts();
    return;
  }

  const { error } = await client
    .from(SUPABASE_PRODUCTS_TABLE)
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    throw error;
  }

  const { data: existing, error: fetchError } = await client
    .from(SUPABASE_PRODUCTS_TABLE)
    .select('id');

  if (fetchError) {
    throw fetchError;
  }

  const keepIds = new Set(payload.map((product) => String(product.id)));
  const idsToDelete = (existing || [])
    .map((row) => String(row.id))
    .filter((id) => !keepIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await client
      .from(SUPABASE_PRODUCTS_TABLE)
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }
}

async function upsertSingleProduct(product) {
  if (!product) {
    return;
  }

  await upsertProducts([product]);
}

async function deleteProductById(id) {
  const client = getSupabaseAdmin();
  if (!client || id == null) {
    return;
  }

  const { error } = await client
    .from(SUPABASE_PRODUCTS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

async function deleteAllProducts() {
  const client = getSupabaseAdmin();
  if (!client) {
    return;
  }

  await client.from(SUPABASE_PRODUCTS_TABLE).delete().neq('id', null);
}

module.exports = {
  isSupabaseConfigured,
  fetchAllProducts,
  upsertProducts,
  upsertSingleProduct,
  deleteProductById,
  deleteAllProducts,
  getSupabaseAdmin,
  SUPABASE_PRODUCTS_TABLE,
  SUPABASE_ORDERS_TABLE
};
