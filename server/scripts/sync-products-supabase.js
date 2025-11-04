#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const serverEnvPath = path.resolve(__dirname, '..', '.env');
const rootEnvPath = path.resolve(__dirname, '..', '..', '.env');

[serverEnvPath, rootEnvPath]
  .filter((envPath) => fs.existsSync(envPath))
  .forEach((envPath) => {
    dotenv.config({ path: envPath });
  });

const {
  isSupabaseConfigured,
  upsertProducts,
  fetchAllProducts
} = require('../db/supabase');

const productsFile = path.resolve(__dirname, '..', 'db', 'products.json');

function loadLocalProducts() {
  try {
    if (!fs.existsSync(productsFile)) {
      return [];
    }

    const raw = fs.readFileSync(productsFile, 'utf-8');
    const parsed = JSON.parse(raw || '{}');
    return Array.isArray(parsed.products) ? parsed.products : [];
  } catch (error) {
    console.error('Erro ao carregar catálogo local:', error);
    return [];
  }
}

async function pushToSupabase() {
  const products = loadLocalProducts();
  await upsertProducts(products);
  console.log(`Supabase • ${products.length} produtos enviados.`);
}

async function pullFromSupabase() {
  const remoteProducts = await fetchAllProducts();
  fs.writeFileSync(productsFile, JSON.stringify({ products: remoteProducts }, null, 2));
  console.log(`Supabase • ${remoteProducts.length} produtos baixados.`);
}

async function main() {
  if (!isSupabaseConfigured()) {
    console.error('Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
    process.exit(1);
  }

  const direction = process.argv.includes('--pull') ? 'pull' : 'push';

  if (direction === 'pull') {
    await pullFromSupabase();
    return;
  }

  await pushToSupabase();
}

main().catch((error) => {
  console.error('Supabase • Falha na sincronização:', error);
  process.exit(1);
});
