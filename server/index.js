const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const QRCode = require('qrcode');
const mercadopago = require('mercadopago');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
// const nodemailer = require('nodemailer');
const SibApiV3Sdk = require('sib-api-v3-sdk');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const productsSupabase = require('./db/supabase');
const ordersSupabase = require('./db/ordersSupabase');
require('dotenv').config();

const fetch = globalThis.fetch
  ? (...args) => globalThis.fetch(...args)
  : (...args) => import('node-fetch').then(({ default: fetchFn }) => fetchFn(...args));

const app = express();
const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 4000);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'reflorar123@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (process.env.MP_ACCESS_TOKEN) {
  mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
}

const dbDir = path.join(__dirname, 'db');
const dbFile = path.join(dbDir, 'orders.json');
const usersFile = path.join(dbDir, 'users.json');
const productsFile = path.join(dbDir, 'products.json');
const couponsFile = path.join(dbDir, 'coupons.json');
const uploadsDir = path.join(__dirname, 'uploads');
let supabaseSyncQueue = Promise.resolve();
let ordersSupabaseSyncQueue = Promise.resolve();

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.JWT_EXPIRATION || '7d';
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || 0);
const RESET_TOKEN_EXPIRATION_MINUTES = Number(process.env.RESET_TOKEN_EXPIRATION_MINUTES || 15);
const RESET_MAX_ATTEMPTS = Number(process.env.RESET_MAX_ATTEMPTS || 5);
const RESET_REQUEST_COOLDOWN_MINUTES = Number(process.env.RESET_REQUEST_COOLDOWN_MINUTES || 2);
// SMTP config deprecated for Brevo API
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SMTP_FROM = process.env.SMTP_FROM || process.env.MAIL_FROM || '';
const TRACKING_PROVIDER = String(process.env.TRACKING_PROVIDER || 'correios').toLowerCase();
const TRACKING_CACHE_TTL_SECONDS = Number(process.env.TRACKING_CACHE_TTL_SECONDS || 180);
const TRACKING_USER_AGENT = process.env.TRACKING_USER_AGENT || 'RefloraBackend/1.0';
const CORREIOS_TRACKING_BASE_URL = process.env.CORREIOS_TRACKING_BASE_URL || 'https://proxyapp.correios.com.br/v1/sro-rastro';
const CORREIOS_TRACKING_RESULT = process.env.CORREIOS_TRACKING_RESULT || 'T';
const LINKETRACK_USER = process.env.LINKETRACK_USER || process.env.TRACKING_LINKETRACK_USER || '';
const LINKETRACK_TOKEN = process.env.LINKETRACK_TOKEN || process.env.TRACKING_LINKETRACK_TOKEN || '';
const TRACKING_FALLBACK_TO_MOCK = String(process.env.TRACKING_FALLBACK_TO_MOCK || '').toLowerCase() === 'true';
const EMAIL_VERIFICATION_EXPIRATION_MINUTES = Number(process.env.EMAIL_VERIFICATION_EXPIRATION_MINUTES || 60);
const EMAIL_VERIFICATION_COOLDOWN_MINUTES = Number(process.env.EMAIL_VERIFICATION_COOLDOWN_MINUTES || 5);
const EMAIL_VERIFICATION_MAX_ATTEMPTS = Number(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS || 5);

const trackingCache = new Map();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${randomUUID().slice(0, 8)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE || 5) * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Apenas arquivos de imagem são permitidos.'));
      return;
    }
    cb(null, true);
  }
});

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ orders: [] }, null, 2));
}

if (!fs.existsSync(usersFile)) {
  fs.writeFileSync(usersFile, JSON.stringify({ users: [] }, null, 2));
}

if (!fs.existsSync(productsFile)) {
  const seedPath = path.join(__dirname, '..', 'src', 'data', 'products.js');
  let productsSeed = [];

  try {
    if (fs.existsSync(seedPath)) {
      // Attempt to extract the default export array from the products.js file without executing it.
      const content = fs.readFileSync(seedPath, 'utf-8');
      const match = content.match(/export const products = (\[[\s\S]*?\]);/);
      if (match && match[1]) {
        const parsed = Function(`"use strict"; return (${match[1]});`)();
        if (Array.isArray(parsed)) {
          productsSeed = parsed.map((product) => ({
            ...product,
            priceValue: product.priceValue || Number(String(product.price).replace(/[^0-9,]/g, '').replace(',', '.')) || 0,
            stock: Number.isFinite(Number(product.stock)) ? Number(product.stock) : 1,
            sizes: product.sizes && typeof product.sizes === 'object'
              ? {
                  PP: typeof product.sizes.PP === 'boolean'
                    ? product.sizes.PP
                    : (typeof product.sizes.P === 'boolean' ? product.sizes.P : true),
                  P: typeof product.sizes.P === 'boolean' ? product.sizes.P : true,
                  M: typeof product.sizes.M === 'boolean' ? product.sizes.M : true,
                  G: typeof product.sizes.G === 'boolean' ? product.sizes.G : true
                }
              : { PP: true, P: true, M: true, G: true }
          }));
        }
      }
    }
  } catch (seedError) {
    console.error('Não foi possível importar seed de produtos:', seedError);
  }

  fs.writeFileSync(productsFile, JSON.stringify({ products: productsSeed }, null, 2));
}

if (productsSupabase.isSupabaseConfigured()) {
  hydrateProductsFromSupabase().catch((error) => {
    console.error('Supabase • Erro de inicialização:', error);
  });
}

if (ordersSupabase.isSupabaseConfigured()) {
  hydrateOrdersFromSupabase().catch((error) => {
    console.error('Supabase • Erro de inicialização (pedidos):', error);
  });
}

if (!fs.existsSync(couponsFile)) {
  const defaultCoupons = {
    coupons: [
      {
        code: 'REFLORAGRATIS',
        type: 'free_shipping',
        description: 'Frete grátis',
        discount: 0,
        freeShipping: true,
        active: true,
        expiresAt: null,
        usageLimit: null,
        usageCount: 0,
        createdAt: new Date().toISOString()
      }
    ]
  };
  fs.writeFileSync(couponsFile, JSON.stringify(defaultCoupons, null, 2));
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function readDatabase() {
  try {
    const raw = fs.readFileSync(dbFile, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao ler o banco de dados:', error);
    return { orders: [] };
  }
}

function writeDatabase(data, options = {}) {
  const { skipSupabaseSync = false } = options;

  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));

  if (!skipSupabaseSync && ordersSupabase.isSupabaseConfigured()) {
    const snapshot = Array.isArray(data?.orders) ? data.orders : [];
    ordersSupabaseSyncQueue = ordersSupabaseSyncQueue
      .catch(() => undefined)
      .then(() => ordersSupabase.upsertOrders(snapshot))
      .catch((error) => {
        console.error('Erro ao sincronizar pedidos com Supabase:', error);
      });
  }
}

function readUsers() {
  try {
    const raw = fs.readFileSync(usersFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.users) ? parsed : { users: [] };
  } catch (error) {
    console.error('Erro ao ler usuários:', error);
    return { users: [] };
  }
}

function writeUsers(data) {
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

// Arquivo para registrar cadastros pendentes que aguardam verificação por código
const pendingFile = path.join(dbDir, 'pending_registrations.json');

function readPendingRegistrations() {
  try {
    if (!fs.existsSync(pendingFile)) {
      fs.writeFileSync(pendingFile, JSON.stringify({ pending: [] }, null, 2));
      return { pending: [] };
    }
    const raw = fs.readFileSync(pendingFile, 'utf-8');
    const parsed = JSON.parse(raw || '{"pending":[]}');
    return Array.isArray(parsed.pending) ? parsed : { pending: [] };
  } catch (error) {
    console.error('Erro ao ler pending_registrations.json:', error);
    return { pending: [] };
  }
}

function writePendingRegistrations(data) {
  try {
    fs.writeFileSync(pendingFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao escrever pending_registrations.json:', error);
  }
}

function readProducts() {
  try {
    const raw = fs.readFileSync(productsFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.products) ? parsed : { products: [] };
  } catch (error) {
    console.error('Erro ao ler produtos:', error);
    return { products: [] };
  }
}

function writeProducts(data, options = {}) {
  const { skipSupabaseSync = false } = options;

  fs.writeFileSync(productsFile, JSON.stringify(data, null, 2));

  if (!skipSupabaseSync && productsSupabase.isSupabaseConfigured()) {
    const snapshot = Array.isArray(data?.products) ? data.products : [];
    supabaseSyncQueue = supabaseSyncQueue
      .catch(() => undefined)
      .then(() => productsSupabase.upsertProducts(snapshot))
      .catch((error) => {
        console.error('Erro ao sincronizar produtos com Supabase:', error);
      });
  }
}

function readCoupons() {
  try {
    const raw = fs.readFileSync(couponsFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.coupons) ? parsed : { coupons: [] };
  } catch (error) {
    console.error('Erro ao ler cupons:', error);
    return { coupons: [] };
  }
}

function writeCoupons(data) {
  fs.writeFileSync(couponsFile, JSON.stringify(data, null, 2));
}

async function hydrateProductsFromSupabase() {
  try {
    const remoteProducts = await productsSupabase.fetchAllProducts();

    if (Array.isArray(remoteProducts) && remoteProducts.length > 0) {
      writeProducts({ products: remoteProducts }, { skipSupabaseSync: true });
      console.info(`Supabase • catálogo carregado (${remoteProducts.length} produtos).`);
      return;
    }

    const localSnapshot = readProducts();
    const localProducts = Array.isArray(localSnapshot.products) ? localSnapshot.products : [];

    if (localProducts.length > 0) {
      await productsSupabase.upsertProducts(localProducts);
      console.info('Supabase • catálogo local enviado (coleção remota vazia).');
    }
  } catch (error) {
    console.error('Supabase • Falha ao sincronizar catálogo:', error);
  }
}

async function hydrateOrdersFromSupabase() {
  try {
    const remoteOrders = await ordersSupabase.fetchAllOrders();

    if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
      writeDatabase({ orders: remoteOrders }, { skipSupabaseSync: true });
      console.info(`Supabase • pedidos carregados (${remoteOrders.length} registros).`);
      return;
    }

    const localSnapshot = readDatabase();
    const localOrders = Array.isArray(localSnapshot.orders) ? localSnapshot.orders : [];

    if (localOrders.length > 0) {
      await ordersSupabase.upsertOrders(localOrders);
      console.info('Supabase • pedidos locais enviados (coleção remota vazia).');
    }
  } catch (error) {
    console.error('Supabase • Falha ao sincronizar pedidos:', error);
  }
}

function validateCoupon(code) {
  const db = readCoupons();
  const coupon = db.coupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
  
  if (!coupon) {
    return { valid: false, message: 'Cupom inválido ou expirado.' };
  }

  // Verificar se expirou
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, message: 'Este cupom expirou.' };
  }

  // Verificar limite de uso
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, message: 'Este cupom atingiu o limite de uso.' };
  }

  return {
    valid: true,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      description: coupon.description,
      discount: coupon.discount || 0,
      freeShipping: coupon.freeShipping || false,
      active: true,
      discountPercent: coupon.discountPercent || 0,
      discountAmount: coupon.discountAmount || 0
    }
  };
}

function applyCoupon(code) {
  const db = readCoupons();
  const couponIndex = db.coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
  
  if (couponIndex !== -1) {
    db.coupons[couponIndex].usageCount = (db.coupons[couponIndex].usageCount || 0) + 1;
    writeCoupons(db);
  }
}

const SIZE_KEYS = ['PP', 'P', 'M', 'G', '36', '37', '38', '39', '40', '41', '42', '43', '44'];


function isEmailTransportConfigured() {
  return Boolean(BREVO_API_KEY && SMTP_FROM);
}

async function sendBrevoEmail({ to, subject, text, html }) {
  if (!isEmailTransportConfigured()) {
    console.info(`[Brevo] E-mail não enviado (API não configurada).`);
    return false;
  }
  try {
    SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = BREVO_API_KEY;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: SMTP_FROM };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.textContent = text;
    sendSmtpEmail.htmlContent = html;
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail via Brevo API:', error);
    return false;
  }
}

async function sendPasswordResetEmail(recipient, code) {
  if (!recipient || !code) return false;
  const subject = 'Reflora - Código de redefinição de senha';
  const text = `Olá!\n\nRecebemos um pedido para redefinir a senha da sua conta Reflora. Utilize o código abaixo dentro de ${RESET_TOKEN_EXPIRATION_MINUTES} minutos:\n\n${code}\n\nSe você não solicitou a alteração, ignore esta mensagem.\n\nEquipe Reflora`;
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e1e1e;">
      <p>Olá!</p>
      <p>Recebemos um pedido para redefinir a senha da sua conta Reflora.</p>
      <p>Utilize o código abaixo dentro de <strong>${RESET_TOKEN_EXPIRATION_MINUTES} minutos</strong>:</p>
      <p style="font-size: 1.75rem; letter-spacing: 0.35rem; font-weight: 600; color: #7b0f12;">${code}</p>
      <p>Se você não solicitou a alteração, ignore esta mensagem.</p>
      <p style="margin-top: 24px;">Com carinho,<br />Equipe Reflora</p>
    </div>
  `;
  return await sendBrevoEmail({ to: recipient, subject, text, html });
}

async function sendEmailVerificationEmail(recipient, code) {
  if (!recipient || !code) return false;
  const subject = 'Confirme seu e-mail - Reflora';
  const text = `Olá!\n\nObrigado por criar uma conta na Reflora. Para concluir o seu cadastro, informe o código abaixo dentro de ${EMAIL_VERIFICATION_EXPIRATION_MINUTES} minutos:\n\n${code}\n\nSe você não criou a conta, ignore esta mensagem.\n\nEquipe Reflora`;
  const html = `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e1e1e;">
      <p>Olá!</p>
      <p>Obrigado por criar sua conta na <strong>Reflora</strong>.</p>
      <p>Para concluir o cadastro, insira o código abaixo dentro de <strong>${EMAIL_VERIFICATION_EXPIRATION_MINUTES} minutos</strong>:</p>
      <p style="font-size: 1.75rem; letter-spacing: 0.35rem; font-weight: 600; color: #1b4332;">${code}</p>
      <p>Se você não criou essa conta, pode ignorar este e-mail.</p>
      <p style="margin-top: 24px;">Com carinho,<br />Equipe Reflora</p>
    </div>
  `;
  return await sendBrevoEmail({ to: recipient, subject, text, html });
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCepHuman(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return value || '';
}

function buildOrderAddressLines(address = {}) {
  if (!address || typeof address !== 'object') {
    return [];
  }

  const { street, number, complement, district, city, state, zip } = address;
  const lines = [];

  const baseLine = [street, number].filter(Boolean).join(', ');
  if (baseLine) {
    lines.push(baseLine);
  }

  if (complement) {
    lines.push(complement);
  }

  if (district) {
    lines.push(district);
  }

  const cityState = [city, state].filter(Boolean).join(' - ');
  if (cityState) {
    lines.push(cityState);
  }

  const formattedCep = formatCepHuman(zip);
  if (formattedCep) {
    lines.push(`CEP ${formattedCep}`);
  }

  return lines;
}

const ORDER_STATUS_LABELS = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pagamento aprovado',
  shipped: 'Pedido enviado',
  in_transit: 'Pedido em trânsito',
  delivered: 'Pedido entregue',
  cancelled: 'Pedido cancelado'
};

const ORDER_EMAIL_TEMPLATES = {
  pending_payment: {
    subject: (order) => `Recebemos o pedido ${order.id}`,
    intro: () => 'Seu pedido foi registrado e estamos aguardando a confirmação do pagamento.'
  },
  paid: {
    subject: (order) => `Pagamento confirmado • Pedido ${order.id}`,
    intro: () => 'Pagamento aprovado! Estamos preparando sua peça para envio.'
  },
  shipped: {
    subject: (order) => `Pedido ${order.id} enviado`,
    intro: (order) => order.trackingCode
      ? `Seu pedido saiu para envio. Código de rastreio: ${order.trackingCode}.`
      : 'Seu pedido saiu para envio.'
  },
  in_transit: {
    subject: (order) => `Pedido ${order.id} está a caminho`,
    intro: () => 'O pedido está em trânsito até o seu endereço.'
  },
  delivered: {
    subject: (order) => `Pedido ${order.id} entregue`,
    intro: () => 'Esperamos que você ame a sua peça! Qualquer dúvida, estamos por aqui.'
  },
  cancelled: {
    subject: (order) => `Pedido ${order.id} cancelado`,
    intro: () => 'O pedido foi cancelado. Se precisar de suporte, conte conosco.'
  },
  generic: {
    subject: (order, statusLabel) => `Atualização do pedido ${order.id}`,
    intro: (_order, statusLabel) => `Status atualizado: ${statusLabel}.`
  }
};

const LOCK_INVENTORY_STATUSES = new Set(['paid', 'shipped', 'in_transit', 'delivered']);

function lockInventoryForOrder(order) {
  if (!order || order.inventoryLocked || !Array.isArray(order.items) || order.items.length === 0) {
    return false;
  }

  const productsDb = readProducts();
  if (!productsDb || !Array.isArray(productsDb.products) || productsDb.products.length === 0) {
    return false;
  }

  let matchedAny = false;
  let productsChanged = false;
  const now = new Date().toISOString();

  order.items.forEach((item) => {
    if (!item) {
      return;
    }

    const productIndex = productsDb.products.findIndex((product) => String(product.id) === String(item.id));
    if (productIndex === -1) {
      return;
    }

    matchedAny = true;

    const product = productsDb.products[productIndex];
    const currentStockRaw = Number(product.stock);
    const currentStock = Number.isFinite(currentStockRaw) ? currentStockRaw : 0;
    const quantity = Math.max(1, Number(item.quantity) || 1);

    let newStock = currentStock;
    if (product.isExclusive) {
      newStock = 0;
    } else {
      newStock = Math.max(0, currentStock - quantity);
    }

    if (newStock !== currentStock) {
      product.stock = newStock;
      product.updatedAt = now;
      productsChanged = true;
    }
  });

  if (productsChanged) {
    writeProducts(productsDb);
  }

  if (matchedAny) {
    order.inventoryLocked = true;
    order.inventoryLockedAt = now;
    if (order.inventoryUnlockedAt) {
      order.inventoryUnlockedAt = null;
    }
  }

  return matchedAny;
}

function unlockInventoryForOrder(order) {
  if (!order || !order.inventoryLocked || !Array.isArray(order.items) || order.items.length === 0) {
    return false;
  }

  const productsDb = readProducts();
  if (!productsDb || !Array.isArray(productsDb.products) || productsDb.products.length === 0) {
    order.inventoryLocked = false;
    order.inventoryUnlockedAt = new Date().toISOString();
    return false;
  }

  let matchedAny = false;
  let productsChanged = false;
  const now = new Date().toISOString();

  order.items.forEach((item) => {
    if (!item) {
      return;
    }

    const productIndex = productsDb.products.findIndex((product) => String(product.id) === String(item.id));
    if (productIndex === -1) {
      return;
    }

    matchedAny = true;

    const product = productsDb.products[productIndex];
    const currentStockRaw = Number(product.stock);
    const currentStock = Number.isFinite(currentStockRaw) ? currentStockRaw : 0;
    const quantity = Math.max(1, Number(item.quantity) || 1);

    let newStock = currentStock;
    if (product.isExclusive) {
      newStock = Math.max(currentStock, quantity);
    } else {
      newStock = currentStock + quantity;
    }

    if (newStock !== currentStock) {
      product.stock = newStock;
      product.updatedAt = now;
      productsChanged = true;
    }
  });

  if (productsChanged) {
    writeProducts(productsDb);
  }

  order.inventoryLocked = false;
  order.inventoryUnlockedAt = now;

  return matchedAny;
}

function buildOrderItemsHtml(order) {
  if (!Array.isArray(order?.items) || order.items.length === 0) {
    return '<p>Nenhum item identificado.</p>';
  }

  const rows = order.items.map((item) => {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = formatCurrencyBRL(Number(item.priceValue) || 0);
    const subtotal = formatCurrencyBRL((Number(item.priceValue) || 0) * quantity);
    return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #ececec;">
          <strong>${escapeHtml(item.name)}</strong><br />
          <small>${quantity}× ${unitPrice} — ${subtotal}</small>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildOrderTotalsHtml(order) {
  const segments = [];

  if (order?.shipping?.price) {
    segments.push({
      label: 'Frete',
      value: formatCurrencyBRL(Number(order.shipping.price) || 0)
    });
  }

  if (order?.coupon?.code) {
    const couponLabel = order.coupon.description
      ? `${order.coupon.code} — ${order.coupon.description}`
      : order.coupon.code;
    segments.push({
      label: `Cupom (${escapeHtml(couponLabel)})`,
      value: 'Aplicado'
    });
  }

  segments.push({
    label: 'Total',
    value: formatCurrencyBRL(Number(order?.total) || 0),
    highlight: true
  });

  const rows = segments.map((segment) => `
    <tr>
      <td style="padding: 6px 0; color: #555; font-size: 0.95rem;">
        ${segment.label}
      </td>
      <td style="padding: 6px 0; text-align: right; font-weight: ${segment.highlight ? '600' : '500'}; color: ${segment.highlight ? '#7b0f12' : '#333'};">
        ${segment.value}
      </td>
    </tr>
  `).join('');

  return `
    <table style="width: 100%; margin-top: 12px;">
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildOrderEmailHtml(order, { statusLabel, intro, note }) {
  const customerName = order?.customer?.name ? escapeHtml(order.customer.name.split(' ')[0]) : 'Olá';
  const addressLines = buildOrderAddressLines(order?.address);
  const addressHtml = addressLines.length
    ? `<div style="margin-top: 12px; font-size: 0.95rem; color: #4a4a4a;">
        <strong>Entrega:</strong><br />
        ${addressLines.map((line) => escapeHtml(line)).join('<br />')}
      </div>`
    : '';

  const contactLine = order?.customer?.phone
    ? `<p style="margin: 16px 0 0; font-size: 0.95rem; color: #4a4a4a;">Telefone: ${escapeHtml(order.customer.phone)}</p>`
    : '';

  return `
    <div style="font-family: 'Segoe UI', Roboto, sans-serif; color: #1f1f1f; line-height: 1.55;">
      <p style="margin-top: 0;">${customerName},</p>
      <p>${escapeHtml(intro)}</p>
      ${note ? `<p style="margin-top: 12px; color: #5b5b5b;">${escapeHtml(note)}</p>` : ''}
      <div style="margin: 20px 0; padding: 16px; border: 1px solid #f0d9d9; border-radius: 12px; background: #fff7f7;">
        <h2 style="margin: 0 0 8px; font-size: 1.15rem; color: #7b0f12;">Pedido ${escapeHtml(order.id)} • ${escapeHtml(statusLabel)}</h2>
        ${buildOrderItemsHtml(order)}
        ${buildOrderTotalsHtml(order)}
        ${addressHtml}
      </div>
      ${contactLine}
      <p style="margin-top: 24px; font-size: 0.95rem; color: #555;">Qualquer dúvida, responda este e-mail ou fale conosco pelo WhatsApp.</p>
      <p style="margin-top: 24px;">Com carinho,<br />Equipe Reflora</p>
    </div>
  `;
}

function buildOrderEmailText(order, { statusLabel, intro, note }) {
  const lines = [];
  lines.push(`Pedido ${order?.id || ''} • ${statusLabel}`);
  lines.push('');
  lines.push(intro);
  if (note) {
    lines.push(note);
  }
  lines.push('');
  if (Array.isArray(order?.items) && order.items.length) {
    lines.push('Itens:');
    order.items.forEach((item) => {
      const quantity = Number(item.quantity) || 1;
      const unitPrice = formatCurrencyBRL(Number(item.priceValue) || 0);
      const subtotal = formatCurrencyBRL((Number(item.priceValue) || 0) * quantity);
      lines.push(`- ${quantity}× ${item.name} (${unitPrice}) — ${subtotal}`);
    });
    lines.push('');
  }

  if (order?.shipping?.price) {
    lines.push(`Frete: ${formatCurrencyBRL(Number(order.shipping.price) || 0)}`);
  }

  lines.push(`Total: ${formatCurrencyBRL(Number(order?.total) || 0)}`);

  const addressLines = buildOrderAddressLines(order?.address);
  if (addressLines.length) {
    lines.push('');
    lines.push('Entrega:');
    addressLines.forEach((line) => lines.push(line));
  }

  if (order?.customer?.phone) {
    lines.push('');
    lines.push(`Telefone: ${order.customer.phone}`);
  }

  lines.push('');
  lines.push('Equipe Reflora');
  return lines.join('\n');
}

async function sendOrderStatusEmail(order, status, description = '') {
  if (!order?.customer?.email) {
    return false;
  }

  if (!isEmailTransportConfigured()) {
    console.info(`[Order Email] ${status} para ${order.customer.email} não enviado (SMTP não configurado).`);
    return false;
  }

  try {
    const transporter = getMailTransporter();
    if (!transporter) {
      return false;
    }

    const statusLabel = ORDER_STATUS_LABELS[status] || status;
    const template = ORDER_EMAIL_TEMPLATES[status] || ORDER_EMAIL_TEMPLATES.generic;
    const subjectFactory = template.subject || ORDER_EMAIL_TEMPLATES.generic.subject;
    const introFactory = template.intro || ORDER_EMAIL_TEMPLATES.generic.intro;

    const intro = introFactory(order, statusLabel);
    const note = description && description !== intro ? description : '';

    const html = buildOrderEmailHtml(order, { statusLabel, intro, note });
    const text = buildOrderEmailText(order, { statusLabel, intro, note });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: order.customer.email,
      subject: subjectFactory(order, statusLabel),
      text,
      html
    });

    return true;
  } catch (error) {
    console.error(`Erro ao enviar e-mail para status ${status} do pedido ${order?.id}:`, error);
    return false;
  }
}

function notifyOrderStatusByEmail(order, status, description = '') {
  if (!order || !status) {
    return;
  }

  sendOrderStatusEmail(order, status, description).catch((error) => {
    console.error('Erro inesperado ao disparar e-mail de status:', error);
  });
}

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createResetRecord(codeHash) {
  const now = Date.now();
  return {
    codeHash,
    attempts: 0,
    expiresAt: new Date(now + RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000).toISOString(),
    issuedAt: new Date(now).toISOString()
  };
}

function createVerificationRecord(codeHash) {
  const now = Date.now();
  return {
    codeHash,
    attempts: 0,
    expiresAt: new Date(now + EMAIL_VERIFICATION_EXPIRATION_MINUTES * 60 * 1000).toISOString(),
    issuedAt: new Date(now).toISOString()
  };
}

function isResetRequestExpired(resetRequest = null) {
  if (!resetRequest?.expiresAt) {
    return true;
  }
  const expires = Date.parse(resetRequest.expiresAt);
  return Number.isNaN(expires) || Date.now() > expires;
}

function isVerificationExpired(verification = null) {
  if (!verification?.expiresAt) {
    return true;
  }
  const expires = Date.parse(verification.expiresAt);
  return Number.isNaN(expires) || Date.now() > expires;
}

function isVerificationOnCooldown(verification = null) {
  if (!verification?.issuedAt) {
    return false;
  }
  const issued = Date.parse(verification.issuedAt);
  if (Number.isNaN(issued)) {
    return false;
  }
  const diff = Date.now() - issued;
  return diff < EMAIL_VERIFICATION_COOLDOWN_MINUTES * 60 * 1000;
}

function isResetRequestOnCooldown(resetRequest = null) {
  if (!resetRequest?.issuedAt) {
    return false;
  }
  const issued = Date.parse(resetRequest.issuedAt);
  if (Number.isNaN(issued)) {
    return false;
  }
  const diff = Date.now() - issued;
  return diff < RESET_REQUEST_COOLDOWN_MINUTES * 60 * 1000;
}

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function sanitizePublicUser(user) {
  if (!user) {
    return null;
  }

  const { passwordHash, googleId, resetRequest, emailVerification, ...rest } = user;
  return {
    ...rest,
    role: user.role || 'customer',
    emailVerified: Boolean(user.emailVerifiedAt)
  };
}

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

async function validateRecaptchaToken(token, remoteIp) {
  if (!RECAPTCHA_SECRET) {
    return true;
  }

  if (typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('Token reCAPTCHA ausente.');
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', RECAPTCHA_SECRET);
    params.append('response', token);
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    if (!response.ok) {
      throw new Error(`Serviço reCAPTCHA indisponível (status ${response.status}).`);
    }

    const payload = await response.json();

    if (!payload.success) {
      const codes = Array.isArray(payload['error-codes']) ? payload['error-codes'].join(', ') : 'unknown_error';
      const error = new Error(`reCAPTCHA rejeitado (${codes}).`);
      error.codes = codes;
      throw error;
    }

    if (RECAPTCHA_MIN_SCORE > 0 && typeof payload.score === 'number' && payload.score < RECAPTCHA_MIN_SCORE) {
      const error = new Error(`reCAPTCHA com score insuficiente (${payload.score}).`);
      error.score = payload.score;
      throw error;
    }

    return true;
  } catch (error) {
    error.isRecaptchaError = true;
    throw error;
  }
}

function ensureJwtSecretOrRespond(res) {
  if (JWT_SECRET) {
    return true;
  }

  res.status(500).json({
    success: false,
    message: 'Configuração inválida: defina a variável JWT_SECRET no arquivo .env do servidor.'
  });
  return false;
}

function createTokenForUser(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado.');
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      role: user.role || 'customer'
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRATION
    }
  );
}

function extractTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

function authenticateToken(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: 'Configuração inválida: defina a variável JWT_SECRET no arquivo .env do servidor.'
    });
  }

  const token = extractTokenFromHeader(req);

  if (!token) {
    console.log('Autenticação falhou: Token ausente');
    return res.status(401).json({ success: false, message: 'Token ausente. Faça login novamente.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.userRole = payload.role || 'customer';
    console.log(`Autenticação OK: userId=${req.userId}, email=${req.userEmail}`);
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error.message);
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado. Faça login novamente.' });
  }
}

function attachUserIfPresent(req, _res, next) {
  if (!JWT_SECRET) {
    return next();
  }

  const token = extractTokenFromHeader(req);
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.userRole = payload.role || 'customer';
  } catch (error) {
    // Token inválido é ignorado silenciosamente aqui; rotas específicas podem exigir autenticação.
  }

  next();
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email || ''));
}

function ensureRole(user) {
  if (user.role && typeof user.role === 'string') {
    return user.role;
  }
  return isAdminEmail(user.email) ? 'admin' : 'customer';
}

function requireAdmin(req, res, next) {
  if (req.userRole === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Acesso restrito a administradores.' });
}

function sanitize(value = '', maxLength) {
  return value
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .slice(0, maxLength)
    .toUpperCase();
}

function formatField(id, value) {
  const length = String(value.length).padStart(2, '0');
  return `${id}${length}${value}`;
}

function computeCRC16(payload) {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload({ pixKey, merchantName, merchantCity, description, amount, txid }) {
  const payloadFormatIndicator = formatField('00', '01');
  const initiationMethod = formatField('01', '11');

  const merchantGui = formatField('00', 'br.gov.bcb.pix');
  const merchantKey = formatField('01', pixKey);
  const merchantDescription = description ? formatField('02', description.slice(0, 50)) : '';
  const merchantAccountInfo = formatField('26', merchantGui + merchantKey + merchantDescription);

  const merchantCategoryCode = formatField('52', '0000');
  const currencyCode = formatField('53', '986');
  const amountField = Number(amount) > 0 ? formatField('54', Number(amount).toFixed(2)) : '';
  const countryCode = formatField('58', 'BR');
  const nameField = formatField('59', sanitize(merchantName || 'Reflora', 25) || 'RECEBEDOR');
  const cityField = formatField('60', sanitize(merchantCity || 'SAO PAULO', 15) || 'SAO PAULO');
  const txidField = formatField('05', (txid || '***').slice(0, 25));
  const additionalData = formatField('62', txidField);

  const partialPayload =
    payloadFormatIndicator +
    initiationMethod +
    merchantAccountInfo +
    merchantCategoryCode +
    currencyCode +
    amountField +
    countryCode +
    nameField +
    cityField +
    additionalData;

  const crc = formatField('63', computeCRC16(partialPayload + '6304'));
  return partialPayload + crc;
}

function createOrderId() {
  return randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
}

function formatPriceDisplay(value) {
  return formatCurrencyBRL(value).replace(/\u00A0/g, ' ');
}

function parsePriceValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number(value);
  }

  if (typeof value === 'string') {
    const normalized = value
      .replace(/[^0-9,.-]/g, '')
      .replace(/\.(?=.*\.)/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function sanitizeProduct(product) {
  if (!product) {
    return null;
  }

  const stockValue = Number(product.stock);
  const isExclusive = Boolean(
    product.isExclusive === true || product.isExclusive === 'true' || product.isExclusive === 1
  );
  let stock = Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : 0;
  if (isExclusive && stock < 1) {
    stock = 1;
  }

  const normalizedSizes = SIZE_KEYS.reduce((acc, size) => {
    const value = product.sizes?.[size];

    if (typeof value === 'boolean') {
      acc[size] = value;
    } else if (typeof value === 'string') {
      acc[size] = value === 'true';
    } else if (value != null) {
      acc[size] = Boolean(value);
    } else {
      acc[size] = false;
    }

    return acc;
  }, {});

  if (!Object.values(normalizedSizes).some(Boolean)) {
    ['PP', 'P', 'M', 'G'].forEach((size) => {
      normalizedSizes[size] = true;
    });
  }

  return {
    ...product,
    stock,
    isExclusive,
    sizes: normalizedSizes,
    priceValue: Number(product.priceValue || 0),
    price: product.price ? String(product.price) : formatPriceDisplay(product.priceValue || 0)
  };
}

function normalizeProductInput(payload = {}, existing = {}) {
  const name = String(payload.name ?? existing.name ?? '').trim();
  if (!name) {
    throw new Error('Informe o nome da peça.');
  }

  const description = String(payload.description ?? existing.description ?? '').trim();
  if (!description) {
    throw new Error('Informe a descrição da peça.');
  }

  const purchaseLinkRaw = payload.purchaseLink ?? existing.purchaseLink ?? '';
  const purchaseLink = typeof purchaseLinkRaw === 'string' ? purchaseLinkRaw.trim() : '';

  const priceValueInput = payload.priceValue ?? payload.price ?? existing.priceValue ?? existing.price;
  const priceValue = parsePriceValue(priceValueInput);
  if (priceValue === null || priceValue <= 0) {
    throw new Error('Informe um valor de preço válido.');
  }

  const exclusiveRaw = payload.isExclusive ?? payload.exclusive ?? existing.isExclusive ?? false;
  const isExclusive = typeof exclusiveRaw === 'string'
    ? exclusiveRaw.toLowerCase() === 'true'
    : Boolean(exclusiveRaw);

  const stockInput = payload.stock ?? existing.stock ?? (isExclusive ? 1 : 0);
  let stockValue = Number(stockInput);
  if (isExclusive) {
    stockValue = 1;
  }
  if (!Number.isFinite(stockValue) || stockValue < 0) {
    throw new Error('Informe uma quantidade em estoque válida.');
  }

  const baseSizes = SIZE_KEYS.reduce((acc, size) => {
    const value = existing.sizes && typeof existing.sizes === 'object' ? existing.sizes[size] : undefined;
    if (typeof value === 'boolean') {
      acc[size] = value;
    } else if (value != null) {
      acc[size] = Boolean(value);
    } else {
      acc[size] = true;
    }
    return acc;
  }, {});

  const rawSizes = payload.sizes && typeof payload.sizes === 'object'
    ? payload.sizes
    : Array.isArray(payload.availableSizes)
      ? payload.availableSizes.reduce((acc, size) => ({ ...acc, [size]: true }), {})
      : baseSizes;

  const sizes = SIZE_KEYS.reduce((acc, size) => {
    const value = rawSizes[size];
    if (typeof value === 'boolean') {
      acc[size] = value;
    } else if (typeof value === 'string') {
      acc[size] = value === 'true';
    } else if (value != null) {
      acc[size] = Boolean(value);
    } else {
      acc[size] = false; // Mudado de true para false - não marca todos por padrão
    }
    return acc;
  }, {});

  // Verificar se tem pelo menos um tamanho marcado
  if (!Object.values(sizes).some(Boolean)) {
    throw new Error('Selecione ao menos um tamanho disponível.');
  }

  let imagesRaw = payload.images ?? existing.images ?? [];
  if (typeof imagesRaw === 'string') {
    imagesRaw = imagesRaw
      .split(/\r?\n|,/) // split by newline or comma
      .map((url) => url.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(imagesRaw)) {
    throw new Error('As imagens devem ser fornecidas como lista.');
  }

  const images = imagesRaw
    .map((url) => String(url || '').trim())
    .filter(Boolean);

  if (images.length === 0) {
    throw new Error('Informe pelo menos uma imagem.');
  }

  const normalized = {
    name,
    description,
    priceValue: Number(priceValue.toFixed(2)),
    price: formatPriceDisplay(priceValue),
    images,
    stock: Number(Math.round(stockValue)),
    isExclusive,
    sizes
  };

  if (purchaseLink) {
    normalized.purchaseLink = purchaseLink;
  }

  return normalized;
}

async function buildPixData({ amount, txid, description }) {
  const pixKey = process.env.PIX_KEY;

  if (!pixKey) {
    return {
      available: false,
      message: 'Configure suas variáveis PIX no arquivo .env para gerar o QR Code.'
    };
  }

  const payload = generatePixPayload({
    pixKey,
    merchantName: process.env.PIX_MERCHANT_NAME || 'Reflora',
    merchantCity: process.env.PIX_MERCHANT_CITY || 'SAO PAULO',
    description: description || `Pedido ${txid}`,
    amount,
    txid
  });
  const qrCode = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', width: 320 });

  return {
    available: true,
    payload,
    qrCode
  };
}

async function buildMercadoPagoData(order) {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    return {
      available: false,
      message: 'Configure o MP_ACCESS_TOKEN no arquivo .env para liberar pagamento via Mercado Pago.'
    };
  }

  try {
    mercadopago.configure({ access_token: accessToken });

    console.log('=== DEBUG MERCADO PAGO ===');
    console.log('Order completa:', JSON.stringify(order, null, 2));
    console.log('Cupom no pedido:', order.coupon);

    const items = order.items.map((item) => ({
      title: item.name,
      quantity: Number(item.quantity) || 1,
      currency_id: 'BRL',
      unit_price: Number(item.priceValue) || 0
    }));

    // Verificar se tem cupom aplicado e calcular frete com desconto
    let shippingPrice = order.shipping?.price || 0;
    const hasCoupon = order.coupon && (order.coupon.active || order.coupon.freeShipping || order.coupon.discount > 0);
    
    console.log('Frete original:', shippingPrice);
    console.log('Tem cupom ativo?', hasCoupon);
    console.log('Cupom oferece frete grátis?', order.coupon?.freeShipping);
    
    // Se o cupom oferece frete grátis, zerar o valor do frete
    if (order.coupon && order.coupon.freeShipping) {
      console.log('APLICANDO FRETE GRÁTIS!');
      shippingPrice = 0;
    }

    // Adicionar frete como item separado se existir e for maior que 0
    if (shippingPrice > 0) {
      items.push({
        title: 'Frete',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(shippingPrice)
      });
    }

    // Se houver desconto percentual, aplicar aos itens
    if (order.coupon && (order.coupon.discountPercent > 0 || order.coupon.discount > 0)) {
      const percent = order.coupon.discountPercent || order.coupon.discount || 0;
      if (percent > 0) {
        const discountMultiplier = 1 - (percent / 100);
        items.forEach(item => {
          if (item.title !== 'Frete') {
            item.unit_price = Math.max(0, item.unit_price * discountMultiplier);
          }
        });
      }
    }

    // Se houver desconto fixo, adicionar como item negativo
    if (order.coupon && order.coupon.discountAmount > 0) {
      items.push({
        title: `Desconto - Cupom ${order.coupon.code}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: -Math.abs(Number(order.coupon.discountAmount))
      });
    }

    console.log('Mercado Pago - Itens finais:', JSON.stringify(items, null, 2));
    console.log('Mercado Pago - Frete final:', shippingPrice);
    if (hasCoupon) {
      console.log('Mercado Pago - Cupom aplicado:', order.coupon.code, order.coupon);
    }
    console.log('=== FIM DEBUG ===');

    const preference = {
      items: items,
      payer: {
        name: order.customer.name,
        email: order.customer.email
      },
      external_reference: order.id,
      statement_descriptor: (process.env.PIX_MERCHANT_NAME || 'Reflora').slice(0, 20),
      back_urls: {
        success: process.env.MP_SUCCESS_URL || 'http://localhost:3000/#checkout?status=success',
        failure: process.env.MP_FAILURE_URL || 'http://localhost:3000/#checkout?status=failure',
        pending: process.env.MP_FAILURE_URL || 'http://localhost:3000/#checkout?status=pending'
      },
      auto_return: 'approved'
    };

    if (process.env.MP_NOTIFICATION_URL) {
      preference.notification_url = process.env.MP_NOTIFICATION_URL;
    }

    const response = await mercadopago.preferences.create(preference);
    const pref = response.body || response;

    return {
      available: true,
      initPoint: pref.init_point,
      sandboxInitPoint: pref.sandbox_init_point,
      preferenceId: pref.id
    };
  } catch (error) {
    console.error('Erro ao criar preferência Mercado Pago:', error);
    return {
      available: false,
      message: 'Não foi possível gerar o link de pagamento Mercado Pago.',
      error: error.message
    };
  }
}

const SHIPPING_RULES = [
  {
    id: 'sp',
    prefixes: ['0'],
    region: 'Sudeste',
    label: 'São Paulo',
    base: 18.9,
    perItem: 4.5,
    minDays: 2,
    maxDays: 3
  },
  {
    id: 'rj-es',
    prefixes: ['1'],
    region: 'Sudeste',
    label: 'Rio de Janeiro / Espírito Santo',
    base: 21.9,
    perItem: 4.9,
    minDays: 2,
    maxDays: 4
  },
  {
    id: 'mg',
    prefixes: ['2'],
    region: 'Sudeste',
    label: 'Minas Gerais',
    base: 21.9,
    perItem: 5.2,
    minDays: 2,
    maxDays: 4
  },
  {
    id: 'ba-se',
    prefixes: ['3'],
    region: 'Nordeste',
    label: 'Bahia / Sergipe',
    base: 26.9,
    perItem: 6.2,
    minDays: 3,
    maxDays: 6
  },
  {
    id: 'pe-al-pb-rn',
    prefixes: ['4'],
    region: 'Nordeste',
    label: 'Pernambuco / Alagoas / Paraíba / Rio Grande do Norte',
    base: 27.9,
    perItem: 6.5,
    minDays: 4,
    maxDays: 7
  },
  {
    id: 'ce-pi-ma',
    prefixes: ['5'],
    region: 'Nordeste',
    label: 'Ceará / Piauí / Maranhão',
    base: 29.9,
    perItem: 6.9,
    minDays: 4,
    maxDays: 8
  },
  {
    id: 'centro-oeste',
    prefixes: ['6'],
    region: 'Centro-Oeste',
    label: 'Distrito Federal / Goiás / Tocantins / Mato Grosso / Mato Grosso do Sul',
    base: 32.9,
    perItem: 7.4,
    minDays: 3,
    maxDays: 6
  },
  {
    id: 'sul-pr-sc',
    prefixes: ['7'],
    region: 'Sul',
    label: 'Paraná / Santa Catarina',
    base: 23.9,
    perItem: 5.2,
    minDays: 3,
    maxDays: 5
  },
  {
    id: 'sul-rs',
    prefixes: ['8'],
    region: 'Sul',
    label: 'Rio Grande do Sul',
    base: 24.9,
    perItem: 5.4,
    minDays: 3,
    maxDays: 5
  },
  {
    id: 'norte',
    prefixes: ['9'],
    region: 'Norte',
    label: 'Região Norte',
    base: 38.9,
    perItem: 8.9,
    minDays: 5,
    maxDays: 9
  }
];

function normalizeCep(cep = '') {
  return String(cep).replace(/\D/g, '').slice(0, 8);
}

function findShippingRule(cepDigits) {
  if (!cepDigits || cepDigits.length === 0) {
    return null;
  }

  const firstDigit = cepDigits[0];
  return SHIPPING_RULES.find((rule) => rule.prefixes.includes(firstDigit)) || null;
}

function formatCurrencyBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildShippingQuote({ cep, items = [] }) {
  const sanitizedCep = normalizeCep(cep);

  if (sanitizedCep.length !== 8) {
    return { error: 'Informe um CEP válido com 8 dígitos.' };
  }

  const rule = findShippingRule(sanitizedCep);

  if (!rule) {
    return { error: 'Não foi possível determinar a região do CEP informado.' };
  }

  const itemsCount = Array.isArray(items) && items.length
    ? items.reduce((total, item) => total + (Number(item.quantity) || 1), 0)
    : 1;

  const variableMultiplier = Math.max(itemsCount - 1, 0);
  const rawPrice = rule.base + variableMultiplier * rule.perItem;
  const price = Number(rawPrice.toFixed(2));

  const estimatedText = rule.minDays === rule.maxDays
    ? `${rule.minDays} dia útil`
    : `${rule.minDays} a ${rule.maxDays} dias úteis`;

  return {
    cep: sanitizedCep,
    region: rule.region,
    label: rule.label,
    itemsCount,
    price,
    formattedPrice: formatCurrencyBRL(price),
    minDays: rule.minDays,
    maxDays: rule.maxDays,
    deliveryEstimate: estimatedText,
    updatedAt: new Date().toISOString()
  };
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

app.post(
  '/api/auth/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Informe um nome válido.'),
    body('email').isEmail().withMessage('Informe um e-mail válido.'),
    body('password').isLength({ min: 8 }).withMessage('A senha deve conter ao menos 8 caracteres.')
  ],
  async (req, res) => {
    if (!ensureJwtSecretOrRespond(res)) {
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (RECAPTCHA_SECRET) {
      const incomingToken = req.body?.captchaToken;
      const tokenLength = typeof incomingToken === 'string' ? incomingToken.length : 0;
      console.debug(
        'reCAPTCHA • tentativa de cadastro',
        typeof incomingToken === 'string' ? `token ${tokenLength} caracteres` : 'token ausente'
      );
      try {
        await validateRecaptchaToken(incomingToken, extractClientIp(req));
      } catch (captchaError) {
        console.warn('Falha na validação reCAPTCHA:', captchaError);
        return res.status(400).json({
          success: false,
          message: 'Não foi possível validar sua identidade. Recarregue a página e tente novamente.'
        });
      }
    }

    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const db = readUsers();
    const pendingDb = readPendingRegistrations();

    const existing = db.users.find((user) => user.email === normalizedEmail);
    const existingPending = pendingDb.pending.find((p) => p.email === normalizedEmail);

    if (existing || existingPending) {
      return res.status(409).json({
        success: false,
        message: 'Este e-mail já está em uso ou aguardando confirmação. Verifique seu e-mail ou utilize outro e-mail.'
      });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const role = isAdminEmail(normalizedEmail) ? 'admin' : 'customer';
      const verificationCode = generateResetCode();
      const verificationHash = await bcrypt.hash(verificationCode, 12);
      const verificationRecord = createVerificationRecord(verificationHash);
      const pending = {
        id: randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        provider: 'local',
        role,
        createdAt: new Date().toISOString(),
        emailVerification: verificationRecord
      };

      pendingDb.pending.push(pending);
      writePendingRegistrations(pendingDb);

      const dispatched = await sendEmailVerificationEmail(normalizedEmail, verificationCode);
      if (!dispatched) {
        console.info(`Código de verificação gerado para ${normalizedEmail}: ${verificationCode}`);
      }

      res.status(201).json({
        success: true,
        verificationRequired: true,
        email: normalizedEmail,
        message: 'Enviamos um código de confirmação para o seu e-mail. Informe-o para finalizar o cadastro.',
        expiresAt: verificationRecord.expiresAt
      });
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      res.status(500).json({ success: false, message: 'Não foi possível concluir o cadastro.' });
    }
  }
);

app.post(
  '/api/auth/login',
  [
    body('email').isEmail().withMessage('Informe um e-mail válido.'),
    body('password').isLength({ min: 8 }).withMessage('Informe uma senha válida.')
  ],
  async (req, res) => {
    if (!ensureJwtSecretOrRespond(res)) {
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const db = readUsers();
    const user = db.users.find((u) => u.email === normalizedEmail);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
    }

    try {
      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
      }

      if (!user.emailVerifiedAt) {
        if (user.emailVerification) {
          return res.status(403).json({
            success: false,
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Confirme seu e-mail antes de entrar.'
          });
        }

        user.emailVerifiedAt = user.createdAt || new Date().toISOString();
        writeUsers(db);
      }

      const role = ensureRole(user);
      if (role !== user.role) {
        user.role = role;
        writeUsers(db);
      }

      const token = createTokenForUser(user);

      res.json({ success: true, user: sanitizePublicUser(user), token });
    } catch (error) {
      console.error('Erro ao efetuar login:', error);
      res.status(500).json({ success: false, message: 'Não foi possível efetuar login.' });
    }
  }
);

app.post(
  '/api/auth/verify-email',
  [
    body('email').isEmail().withMessage('Informe um e-mail válido.'),
    body('code').isLength({ min: 4 }).withMessage('Informe o código recebido.')
  ],
  async (req, res) => {
    if (!ensureJwtSecretOrRespond(res)) {
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const normalizedEmail = normalizeEmail(req.body.email);
    const providedCode = String(req.body.code || '').trim();

    const db = readUsers();
    const pendingDb = readPendingRegistrations();

    let userIndex = db.users.findIndex((u) => u.email === normalizedEmail);
    let user = null;
    let isPending = false;

    if (userIndex !== -1) {
      user = db.users[userIndex];
    } else {
      const pendingIndex = pendingDb.pending.findIndex((p) => p.email === normalizedEmail);
      if (pendingIndex === -1) {
        return res.status(400).json({ success: false, message: 'Código inválido ou expirado.' });
      }
      user = pendingDb.pending[pendingIndex];
      isPending = true;
      // normalize reference for later updates
      userIndex = pendingIndex;
    }

    if (user.emailVerifiedAt && !isPending) {
      const token = createTokenForUser(user);
      return res.json({
        success: true,
        message: 'E-mail já confirmado anteriormente.',
        user: sanitizePublicUser(user),
        token
      });
    }

    const verification = user.emailVerification;

    if (!verification) {
      return res.status(400).json({ success: false, message: 'Solicite um novo código de confirmação.' });
    }

    if (isVerificationExpired(verification)) {
      if (isPending) {
        // remove pending
        pendingDb.pending.splice(userIndex, 1);
        writePendingRegistrations(pendingDb);
      } else {
        delete user.emailVerification;
        db.users[userIndex] = user;
        writeUsers(db);
      }
      return res.status(400).json({ success: false, message: 'Código expirado. Solicite um novo código.' });
    }

    if (verification.attempts >= EMAIL_VERIFICATION_MAX_ATTEMPTS) {
      if (isPending) {
        pendingDb.pending.splice(userIndex, 1);
        writePendingRegistrations(pendingDb);
      } else {
        delete user.emailVerification;
        db.users[userIndex] = user;
        writeUsers(db);
      }
      return res.status(400).json({ success: false, message: 'Número máximo de tentativas excedido. Solicite um novo código.' });
    }

    const valid = await bcrypt.compare(providedCode, verification.codeHash || '');

    if (!valid) {
      const updated = {
        ...verification,
        attempts: (verification.attempts || 0) + 1
      };
      if (isPending) {
        pendingDb.pending[userIndex].emailVerification = updated;
        writePendingRegistrations(pendingDb);
      } else {
        db.users[userIndex].emailVerification = updated;
        writeUsers(db);
      }
      return res.status(400).json({ success: false, message: 'Código inválido. Verifique e tente novamente.' });
    }

    // Código válido -> migrar pending para users ou marcar usuário existente como verificado
    if (isPending) {
      const newUser = {
        id: user.id || randomUUID(),
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        provider: user.provider || 'local',
        role: user.role || 'customer',
        createdAt: user.createdAt || new Date().toISOString(),
        emailVerifiedAt: new Date().toISOString()
      };
      db.users.push(newUser);
      writeUsers(db);
      // remove pending
      pendingDb.pending.splice(userIndex, 1);
      writePendingRegistrations(pendingDb);
      const token = createTokenForUser(newUser);
      return res.json({ success: true, message: 'E-mail confirmado com sucesso!', user: sanitizePublicUser(newUser), token });
    }

    // existing user flow
    user.emailVerifiedAt = new Date().toISOString();
    delete user.emailVerification;
    db.users[userIndex] = user;
    writeUsers(db);

    const token = createTokenForUser(user);

    res.json({
      success: true,
      message: 'E-mail confirmado com sucesso!',
      user: sanitizePublicUser(user),
      token
    });
  }
);

app.post(
  '/api/auth/verify-email/resend',
  [body('email').isEmail().withMessage('Informe um e-mail válido.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const normalizedEmail = normalizeEmail(req.body.email);
    const db = readUsers();
    const pendingDb = readPendingRegistrations();

    let userIndex = db.users.findIndex((u) => u.email === normalizedEmail);
    let isPending = false;
    let target = null;

    if (userIndex !== -1) {
      target = db.users[userIndex];
    } else {
      const pendingIndex = pendingDb.pending.findIndex((p) => p.email === normalizedEmail);
      if (pendingIndex === -1) {
        return res.status(400).json({ success: false, message: 'E-mail não encontrado.' });
      }
      isPending = true;
      userIndex = pendingIndex;
      target = pendingDb.pending[pendingIndex];
    }

    if (target.emailVerifiedAt && !isPending) {
      return res.json({ success: true, message: 'E-mail já confirmado. Faça login normalmente.' });
    }

    const verification = target.emailVerification;

    if (verification && !isVerificationExpired(verification) && isVerificationOnCooldown(verification)) {
      return res.status(429).json({ success: false, message: 'Aguarde alguns minutos antes de solicitar um novo código.' });
    }

    const newCode = generateResetCode();
    const newHash = await bcrypt.hash(newCode, 12);
    const newRecord = createVerificationRecord(newHash);

    if (isPending) {
      pendingDb.pending[userIndex].emailVerification = newRecord;
      writePendingRegistrations(pendingDb);
    } else {
      db.users[userIndex].emailVerification = newRecord;
      writeUsers(db);
    }

    const dispatched = await sendEmailVerificationEmail(normalizedEmail, newCode);
    if (!dispatched) {
      console.info(`Novo código de verificação gerado para ${normalizedEmail}: ${newCode}`);
    }

    res.json({
      success: true,
      message: 'Enviamos um novo código para o seu e-mail.',
      expiresAt: newRecord.expiresAt
    });
  }
);

app.post(
  '/api/auth/reset-password/request',
  [body('email').isEmail().withMessage('Informe um e-mail válido.')],
  async (req, res) => {
    if (!ensureJwtSecretOrRespond(res)) {
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (RECAPTCHA_SECRET) {
      const incomingToken = req.body?.captchaToken;
      const tokenLength = typeof incomingToken === 'string' ? incomingToken.length : 0;
      console.debug(
        'reCAPTCHA • solicitação de reset',
        typeof incomingToken === 'string' ? `token ${tokenLength} caracteres` : 'token ausente'
      );
      try {
        await validateRecaptchaToken(incomingToken, extractClientIp(req));
      } catch (captchaError) {
        console.warn('Falha na validação reCAPTCHA (reset request):', captchaError);
        return res.status(400).json({
          success: false,
          message: 'Não foi possível validar sua identidade. Recarregue a página e tente novamente.'
        });
      }
    }

    const normalizedEmail = normalizeEmail(req.body.email);
    const db = readUsers();
    const userIndex = db.users.findIndex((u) => u.email === normalizedEmail);

    if (userIndex !== -1) {
      const user = db.users[userIndex];

      if (user.provider === 'google' && !user.passwordHash) {
        // Usuários exclusivos do Google não possuem senha local para redefinir.
        console.info(`Solicitação de redefinição ignorada para conta Google sem senha local: ${normalizedEmail}.`);
      } else {
        const existingRequest = user.resetRequest;
        if (existingRequest && !isResetRequestExpired(existingRequest) && isResetRequestOnCooldown(existingRequest)) {
          console.info(`Solicitação de redefinição para ${normalizedEmail} ignorada (cooldown ativo).`);
        } else {
          const code = generateResetCode();
          const codeHash = await bcrypt.hash(code, 12);
          user.resetRequest = createResetRecord(codeHash);
          db.users[userIndex] = user;
          writeUsers(db);

          const dispatched = await sendPasswordResetEmail(normalizedEmail, code);
          if (!dispatched) {
            console.info(`Código de redefinição gerado para ${normalizedEmail}: ${code}`);
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Se o e-mail estiver cadastrado, enviaremos um código de verificação.'
    });
  }
);

app.post(
  '/api/auth/reset-password/confirm',
  [
    body('email').isEmail().withMessage('Informe um e-mail válido.'),
    body('code').isLength({ min: 4 }).withMessage('Informe o código recebido.'),
    body('newPassword').isLength({ min: 8 }).withMessage('A nova senha deve conter ao menos 8 caracteres.')
  ],
  async (req, res) => {
    if (!ensureJwtSecretOrRespond(res)) {
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    if (RECAPTCHA_SECRET) {
      const incomingToken = req.body?.captchaToken;
      const tokenLength = typeof incomingToken === 'string' ? incomingToken.length : 0;
      console.debug(
        'reCAPTCHA • confirmação de reset',
        typeof incomingToken === 'string' ? `token ${tokenLength} caracteres` : 'token ausente'
      );
      try {
        await validateRecaptchaToken(incomingToken, extractClientIp(req));
      } catch (captchaError) {
        console.warn('Falha na validação reCAPTCHA (reset confirm):', captchaError);
        return res.status(400).json({
          success: false,
          message: 'Não foi possível validar sua identidade. Recarregue a página e tente novamente.'
        });
      }
    }

    const normalizedEmail = normalizeEmail(req.body.email);
    const providedCode = String(req.body.code || '').trim();
    const newPassword = req.body.newPassword;

    const db = readUsers();
    const userIndex = db.users.findIndex((u) => u.email === normalizedEmail);

    if (userIndex === -1) {
      return res.status(400).json({ success: false, message: 'Código inválido ou expirado.' });
    }

    const user = db.users[userIndex];

    if (user.provider === 'google' && !user.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Esta conta utiliza login do Google. Defina uma senha pelo painel administrativo antes de usar o fluxo de redefinição.'
      });
    }

    const resetRequest = user.resetRequest;
    if (!resetRequest) {
      return res.status(400).json({ success: false, message: 'Código inválido ou expirado.' });
    }

    if (isResetRequestExpired(resetRequest)) {
      delete user.resetRequest;
      db.users[userIndex] = user;
      writeUsers(db);
      return res.status(400).json({ success: false, message: 'Código inválido ou expirado.' });
    }

    if (resetRequest.attempts >= RESET_MAX_ATTEMPTS) {
      delete user.resetRequest;
      db.users[userIndex] = user;
      writeUsers(db);
      return res.status(400).json({ success: false, message: 'Número máximo de tentativas excedido. Solicite um novo código.' });
    }

    const validCode = await bcrypt.compare(providedCode, resetRequest.codeHash || '');

    if (!validCode) {
      user.resetRequest = {
        ...resetRequest,
        attempts: (resetRequest.attempts || 0) + 1
      };
      db.users[userIndex] = user;
      writeUsers(db);
      return res.status(400).json({ success: false, message: 'Código inválido ou expirado.' });
    }

    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      user.passwordHash = passwordHash;
      user.provider = user.provider || 'local';
      user.updatedAt = new Date().toISOString();
      delete user.resetRequest;
      db.users[userIndex] = user;
      writeUsers(db);

      return res.json({ success: true, message: 'Senha atualizada com sucesso.' });
    } catch (error) {
      console.error('Erro ao confirmar redefinição de senha:', error);
      return res.status(500).json({ success: false, message: 'Não foi possível redefinir a senha.' });
    }
  }
);

app.post('/api/auth/google', async (req, res) => {
  if (!ensureJwtSecretOrRespond(res)) {
    return;
  }

  if (!googleClient) {
    return res.status(500).json({
      success: false,
      message: 'Configuração inválida: defina GOOGLE_CLIENT_ID no arquivo .env do servidor.'
    });
  }

  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ success: false, message: 'Token Google ausente.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = normalizeEmail(payload?.email || '');

    if (!email) {
      return res.status(400).json({ success: false, message: 'E-mail não informado pelo Google.' });
    }

    const name = payload?.name?.trim() || payload?.given_name || 'Usuário Google';
    const googleId = payload?.sub;

    const db = readUsers();
    let user = db.users.find((u) => u.email === email);

    if (!user) {
      user = {
        id: randomUUID(),
        name,
        email,
        passwordHash: null,
        provider: 'google',
        googleId,
        role: isAdminEmail(email) ? 'admin' : 'customer',
        createdAt: new Date().toISOString(),
        emailVerifiedAt: new Date().toISOString()
      };
      db.users.push(user);
      writeUsers(db);
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.provider = user.provider || 'google';
      const role = ensureRole(user);
      if (role !== user.role) {
        user.role = role;
      }
      if (!user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date().toISOString();
      }
      writeUsers(db);
    } else {
      const role = ensureRole(user);
      if (role !== user.role) {
        user.role = role;
        writeUsers(db);
      } else if (!user.emailVerifiedAt) {
        user.emailVerifiedAt = new Date().toISOString();
        writeUsers(db);
      }
    }

    const token = createTokenForUser(user);

    res.json({ success: true, user: sanitizePublicUser(user), token });
  } catch (error) {
    console.error('Erro ao autenticar com Google:', error);
    res.status(401).json({ success: false, message: 'Falha na autenticação com o Google.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const db = readUsers();
    let user = db.users.find((u) => u.id === req.userId);

    // Se o usuário não foi encontrado, tentar buscar pelo email
    if (!user && req.userEmail) {
      console.log(`Usuário não encontrado pelo ID ${req.userId}, buscando pelo email ${req.userEmail}`);
      user = db.users.find((u) => u.email === req.userEmail);
      
      if (user) {
        console.log(`Usuário encontrado pelo email, atualizando token...`);
        // Token tem ID antigo, usuário foi recriado. Vamos recriar o token.
        const newToken = createTokenForUser(user);
        return res.json({ 
          success: true, 
          user: sanitizePublicUser(user),
          token: newToken,
          message: 'Token atualizado'
        });
      }
    }

    if (!user) {
      console.error(`Usuário não encontrado: userId=${req.userId}, userEmail=${req.userEmail}`);
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado. Faça login novamente.',
        userId: req.userId,
        userEmail: req.userEmail
      });
    }

    const role = ensureRole(user);
    if (role !== user.role) {
      user.role = role;
      writeUsers(db);
    }

    res.json({ success: true, user: sanitizePublicUser(user) });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/orders', attachUserIfPresent, (req, res) => {
  const db = readDatabase();

  if (req.userRole === 'admin') {
    return res.json({ orders: db.orders });
  }

  if (req.userId) {
    const filtered = db.orders.filter((order) => order.userId === req.userId);
    return res.json({ orders: filtered });
  }

  res.json({ orders: db.orders });
});

app.get('/api/orders/my-orders', authenticateToken, (req, res) => {
  try {
    console.log(`Buscando pedidos para userId: ${req.userId}`);
    const db = readDatabase();
    const userOrders = db.orders.filter((order) => order.userId === req.userId);
    
    console.log(`Encontrados ${userOrders.length} pedidos para o usuário`);
    
    // Ordenar por data mais recente
    const sortedOrders = userOrders.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(sortedOrders);
  } catch (error) {
    console.error('Erro ao buscar pedidos do usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar pedidos.' });
  }
});

app.post('/api/shipping/quote', (req, res) => {
  try {
    const { cep, items } = req.body || {};
    const quote = buildShippingQuote({ cep, items });

    if (quote?.error) {
      return res.status(400).json({ success: false, message: quote.error });
    }

    res.json({ success: true, quote });
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    res.status(500).json({ success: false, message: 'Não foi possível calcular o frete no momento.' });
  }
});

app.post('/api/coupons/validate', (req, res) => {
  try {
    const { code } = req.body || {};
    
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Informe o código do cupom.' });
    }

    const result = validateCoupon(code.trim());
    
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({ 
      success: true, 
      coupon: result.coupon,
      message: `Cupom "${result.coupon.code}" aplicado com sucesso!`
    });
  } catch (error) {
    console.error('Erro ao validar cupom:', error);
    res.status(500).json({ success: false, message: 'Não foi possível validar o cupom.' });
  }
});

app.get('/api/products', (_req, res) => {
  const db = readProducts();
  res.json({ products: db.products.map((product) => sanitizeProduct(product)) });
});

app.post('/api/uploads/images', authenticateToken, requireAdmin, (req, res) => {
  upload.array('images', Number(process.env.MAX_UPLOAD_FILES || 6))(req, res, (err) => {
    if (err) {
      const status = err.message?.includes('maior') || err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message: err.message || 'Falha ao enviar imagem.' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'Selecione ao menos uma imagem válida.' });
    }

    const urls = files.map((file) => `/uploads/${file.filename}`);
    res.status(201).json({ success: true, urls });
  });
});

app.post('/api/products', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readProducts();
    const normalized = normalizeProductInput(req.body || {});
    const product = {
      id: randomUUID(),
      ...normalized,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.products.unshift(product);
    writeProducts(db);

    res.status(201).json({ success: true, product: sanitizeProduct(product) });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(400).json({ success: false, message: error.message || 'Não foi possível criar o produto.' });
  }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const productId = req.params.id;
  const db = readProducts();
  const index = db.products.findIndex((item) => String(item.id) === String(productId));

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
  }

  try {
    const existing = db.products[index];
    const normalized = normalizeProductInput(req.body || {}, existing);
    const updated = {
      ...existing,
      ...normalized,
      updatedAt: new Date().toISOString()
    };

    db.products[index] = updated;
    writeProducts(db);

    res.json({ success: true, product: sanitizeProduct(updated) });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(400).json({ success: false, message: error.message || 'Não foi possível atualizar o produto.' });
  }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, (req, res) => {
  const productId = req.params.id;
  const db = readProducts();
  const index = db.products.findIndex((item) => String(item.id) === String(productId));

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
  }

  const [removed] = db.products.splice(index, 1);
  writeProducts(db);

  res.json({ success: true, product: sanitizeProduct(removed) });
});

app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Sessão expirada. Faça login novamente.' });
    }

    const { customer, address, items, total, shipping, coupon } = req.body;

    if (!customer?.name || !address?.street || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados insuficientes. Verifique se o formulário foi preenchido corretamente.'
      });
    }

    const sessionEmail = typeof req.userEmail === 'string' ? req.userEmail.trim() : '';
    const normalizedCustomerEmail = sessionEmail || String(customer?.email || '').trim();

    if (!normalizedCustomerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Não foi possível identificar o e-mail do cliente. Faça login novamente.'
      });
    }

    const orderId = createOrderId();

    // Aplicar cupom se fornecido
    let appliedCoupon = null;
    if (coupon && coupon.code) {
      const validation = validateCoupon(coupon.code);
      if (validation.valid) {
        appliedCoupon = validation.coupon;
        // Incrementar uso do cupom
        applyCoupon(coupon.code);
      }
    }

    const nowIso = new Date().toISOString();
    const createdDescription = 'Pedido criado, aguardando pagamento';

    const order = {
      id: orderId,
      userId: req.userId,
      status: 'pending_payment', // pending_payment, paid, shipped, in_transit, delivered, cancelled
      customer: {
        name: customer.name.trim(),
        email: normalizedCustomerEmail,
        phone: customer.phone?.trim() || '',
        document: customer.document?.trim() || ''
      },
      address: {
        street: address.street.trim(),
        number: address.number?.trim() || '',
        complement: address.complement?.trim() || '',
        district: address.district?.trim() || '',
        city: address.city?.trim() || '',
        state: address.state?.trim() || '',
        zip: address.zip?.trim() || ''
      },
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        priceValue: Number(item.priceValue) || 0
      })),
      shipping: shipping && typeof shipping === 'object'
        ? {
            cep: normalizeCep(shipping.cep || address.zip?.trim() || ''),
            price: Number(shipping.price) || 0,
            formattedPrice: shipping.formattedPrice || formatCurrencyBRL(Number(shipping.price) || 0),
            deliveryEstimate: shipping.deliveryEstimate || '',
            region: shipping.region || '',
            label: shipping.label || ''
          }
        : null,
      coupon: appliedCoupon || null,
      total: Number(total) || 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      inventoryLocked: false,
      inventoryLockedAt: null,
      inventoryUnlockedAt: null,
      statusHistory: [
        {
          status: 'pending_payment',
          timestamp: nowIso,
          description: createdDescription
        }
      ]
    };

    const db = readDatabase();
    db.orders.unshift(order);
    writeDatabase(db);

    notifyOrderStatusByEmail(order, 'pending_payment', createdDescription);

    console.log('Pedido criado:', {
      id: order.id,
      total: order.total,
      shipping: order.shipping?.price,
      itemsTotal: order.items.reduce((sum, item) => sum + (item.priceValue * item.quantity), 0)
    });

    const [pix, mercadoPago] = await Promise.all([
      buildPixData({ amount: order.total, txid: order.id, description: `Pedido ${order.id}` }),
      buildMercadoPagoData(order)
    ]);

    res.status(201).json({ success: true, order, pix, mercadoPago });
  } catch (error) {
    console.error('Erro ao registrar pedido:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao processar o pedido.' });
  }
});

app.get('/api/pix', async (req, res) => {
  try {
    const { amount = '0', txid = 'demo', description } = req.query;
    const pix = await buildPixData({ amount, txid: String(txid), description: description ? String(description) : undefined });
    res.json({ pix });
  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    res.status(500).json({ message: 'Não foi possível gerar o QR Code PIX.' });
  }
});

// Adicionar código de rastreamento ao pedido (apenas admin)
app.patch('/api/orders/:orderId/tracking', authenticateToken, (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }

    const { orderId } = req.params;
    const { trackingCode } = req.body;

    if (!trackingCode || typeof trackingCode !== 'string') {
      return res.status(400).json({ success: false, message: 'Código de rastreamento inválido.' });
    }

    const db = readDatabase();
    const order = db.orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    order.trackingCode = trackingCode.trim().toUpperCase();
    order.trackingAddedAt = new Date().toISOString();
    
    // Atualizar status para "enviado" quando adiciona código de rastreamento
    if (order.status === 'paid' || order.status === 'pending_payment') {
      order.status = 'shipped';
      order.updatedAt = new Date().toISOString();
      if (!order.statusHistory) {
        order.statusHistory = [];
      }
      order.statusHistory.push({
        status: 'shipped',
        timestamp: new Date().toISOString(),
        description: `Pedido enviado. Código de rastreamento: ${order.trackingCode}`
      });
    }
    
    if (LOCK_INVENTORY_STATUSES.has(order.status)) {
      lockInventoryForOrder(order);
    }

    writeDatabase(db);

    const latestEntry = Array.isArray(order.statusHistory) && order.statusHistory.length
      ? order.statusHistory[order.statusHistory.length - 1]
      : null;
    notifyOrderStatusByEmail(order, latestEntry?.status || order.status, latestEntry?.description || '');

    res.json({ success: true, order });
  } catch (error) {
    console.error('Erro ao adicionar código de rastreamento:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar pedido.' });
  }
});

// Atualizar status do pedido (apenas admin)
app.patch('/api/orders/:orderId/status', authenticateToken, (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acesso negado.' });
    }

    const { orderId } = req.params;
    const { status, description } = req.body;

    const validStatuses = ['pending_payment', 'paid', 'shipped', 'in_transit', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status inválido. Use: pending_payment, paid, shipped, in_transit, delivered ou cancelled' 
      });
    }

    const db = readDatabase();
    const order = db.orders.find(o => o.id === orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    
    order.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      description: description || `Status alterado para ${status}`
    });
    
    if (status === 'cancelled') {
      unlockInventoryForOrder(order);
    } else if (LOCK_INVENTORY_STATUSES.has(status)) {
      lockInventoryForOrder(order);
    }

    writeDatabase(db);

    const latestEntry = Array.isArray(order.statusHistory) && order.statusHistory.length
      ? order.statusHistory[order.statusHistory.length - 1]
      : null;
    notifyOrderStatusByEmail(order, latestEntry?.status || status, latestEntry?.description || description || '');

    res.json({ success: true, order });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar pedido.' });
  }
});

function getCachedTracking(trackingCode) {
  if (TRACKING_CACHE_TTL_SECONDS <= 0) {
    return null;
  }

  const entry = trackingCache.get(trackingCode);
  if (!entry) {
    return null;
  }

  const isExpired = Date.now() - entry.timestamp > TRACKING_CACHE_TTL_SECONDS * 1000;
  if (isExpired) {
    trackingCache.delete(trackingCode);
    return null;
  }

  return entry.data;
}

function setCachedTracking(trackingCode, data) {
  if (TRACKING_CACHE_TTL_SECONDS <= 0) {
    return;
  }

  if (!data) {
    trackingCache.delete(trackingCode);
    return;
  }

  trackingCache.set(trackingCode, {
    data,
    timestamp: Date.now()
  });
}

function toTimestamp(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeTrackingEvent(event) {
  if (!event || typeof event !== 'object') {
    return null;
  }

  const status = String(event.status || '').trim() || 'Atualização';
  const description = String(event.description || '').trim();
  const location = event.location ? String(event.location).trim() : null;
  let normalizedDate = null;

  if (event.date) {
    const parsed = new Date(event.date);
    if (!Number.isNaN(parsed.getTime())) {
      normalizedDate = parsed.toISOString();
    } else if (typeof event.date === 'string') {
      normalizedDate = event.date;
    }
  }

  return {
    date: normalizedDate,
    status,
    description: description && description !== status ? description : '',
    location: location || null
  };
}

function normalizeTrackingResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const normalizedCode = String(result.code || '').trim().toUpperCase();
  const events = Array.isArray(result.events)
    ? result.events.map(normalizeTrackingEvent).filter(Boolean)
    : [];

  events.sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

  return {
    code: normalizedCode || null,
    service: String(result.service || '').trim() || 'Correios',
    provider: result.provider || TRACKING_PROVIDER,
    events
  };
}

function buildLocationFromUnidade(unidade) {
  if (!unidade || typeof unidade !== 'object') {
    return null;
  }

  const parts = [];

  if (unidade.nome) {
    parts.push(unidade.nome);
  }

  const endereco = unidade.endereco || {};
  const bairro = endereco.bairro;
  const cidade = endereco.cidade || endereco.localidade;
  const uf = endereco.uf || endereco.siglaUF;

  if (bairro) {
    parts.push(bairro);
  }

  if (cidade) {
    parts.push(cidade);
  }

  if (uf) {
    parts.push(uf);
  }

  const filtered = parts.map((part) => String(part).trim()).filter(Boolean);
  return filtered.length ? filtered.join(' - ') : null;
}

function mapCorreiosEvents(objeto) {
  const eventos = Array.isArray(objeto?.eventos) ? objeto.eventos : [];

  return eventos.map((evento) => {
    const unidade = evento.unidadeDestino || evento.unidadeOrigem || evento.unidade;
    const location = buildLocationFromUnidade(unidade);
    const description = evento.detalhe || evento.complemento || evento.observacao || '';
    const status = evento.descricao || evento.resumo || evento.situacao || 'Atualização';

    return {
      date: evento.dtHrCriado || evento.dataHora || null,
      location,
      status,
      description: description && description !== status ? description : ''
    };
  });
}

async function fetchTrackingFromCorreios(trackingCode) {
  const searchParams = new URLSearchParams();
  searchParams.set('resultado', CORREIOS_TRACKING_RESULT);
  searchParams.set('lingua', '101');

  const url = `${CORREIOS_TRACKING_BASE_URL.replace(/\/$/, '')}/${trackingCode}?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': TRACKING_USER_AGENT
    }
  });

  if (response.status === 404) {
    const error = new Error('Código não encontrado nos Correios.');
    error.statusCode = 404;
    throw error;
  }

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    const error = new Error(`Correios retornou status ${response.status}`);
    error.statusCode = response.status;
    error.details = payload;
    throw error;
  }

  const payload = await response.json();
  const objetos = Array.isArray(payload?.objetos) ? payload.objetos : [];

  if (!objetos.length) {
    const error = new Error('Nenhuma informação de rastreio encontrada nos Correios.');
    error.statusCode = 404;
    throw error;
  }

  const objeto = objetos[0];

  if (objeto.erro) {
    const error = new Error(objeto.mensagem || 'Código não encontrado nos Correios.');
    error.statusCode = 404;
    throw error;
  }

  const events = mapCorreiosEvents(objeto);

  return {
    code: String(objeto.codObjeto || trackingCode).toUpperCase(),
    service: objeto.tipoPostal?.descricao || objeto.modalidade || objeto.categoria || 'Correios',
    provider: 'correios',
    events
  };
}

function buildIsoFromBrazilianDate(dateStr, timeStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }

  const [day, month, year] = dateStr.split('/').map((chunk) => Number.parseInt(chunk, 10));

  if (!day || !month || !year) {
    return null;
  }

  const [hour = 0, minute = 0] = String(timeStr || '')
    .split(':')
    .map((chunk) => Number.parseInt(chunk, 10));

  const date = new Date(Date.UTC(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function mapLinketrackEvent(evento) {
  if (!evento || typeof evento !== 'object') {
    return null;
  }

  const locationParts = [evento.local, evento.cidade, evento.uf]
    .map((part) => (part ? String(part).trim() : ''))
    .filter(Boolean);

  const status = evento.status || evento.descricao || evento.situacao || 'Atualização';
  const description = evento.subStatus || evento.complemento || evento.observacao || '';
  const date = evento.dataHora || buildIsoFromBrazilianDate(evento.data, evento.hora);

  return {
    date: date || null,
    location: locationParts.length ? locationParts.join(' - ') : null,
    status,
    description: description && description !== status ? description : ''
  };
}

async function fetchTrackingFromLinketrack(trackingCode) {
  if (!LINKETRACK_USER || !LINKETRACK_TOKEN) {
    const error = new Error('TRACKING_PROVIDER=linketrack exige LINKETRACK_USER e LINKETRACK_TOKEN configurados.');
    error.statusCode = 500;
    error.needsConfiguration = true;
    throw error;
  }

  const searchParams = new URLSearchParams();
  searchParams.set('user', LINKETRACK_USER);
  searchParams.set('token', LINKETRACK_TOKEN);
  searchParams.set('codigo', trackingCode);

  const url = `https://api.linketrack.com/track/json?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': TRACKING_USER_AGENT
    }
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => '');
    const error = new Error(`Linketrack retornou status ${response.status}`);
    error.statusCode = response.status;
    error.details = payload;
    throw error;
  }

  const payload = await response.json();

  if (payload.erro) {
    const error = new Error(payload.mensagem || payload.error || 'Código não encontrado nos Correios.');
    error.statusCode = Number.parseInt(payload.codigo, 10) === 404 ? 404 : 502;
    throw error;
  }

  const events = Array.isArray(payload.eventos)
    ? payload.eventos.map(mapLinketrackEvent).filter(Boolean)
    : [];

  return {
    code: String(payload.codigo || trackingCode).toUpperCase(),
    service: payload.servico || payload.tipo || 'Correios',
    provider: 'linketrack',
    events
  };
}

function buildMockTracking(trackingCode) {
  return {
    code: trackingCode,
    service: 'Correios (aguardando atualização)',
    provider: 'mock',
    events: [
      {
        date: new Date().toISOString(),
        location: null,
        status: 'Aguardando movimentação oficial dos Correios',
        description: 'Ainda não recebemos eventos para este código. Quando o pacote for registrado, você verá as atualizações aqui.'
      }
    ]
  };
}

async function fetchTrackingFromProvider(trackingCode) {
  switch (TRACKING_PROVIDER) {
    case 'mock':
      return buildMockTracking(trackingCode);
    case 'linketrack':
      return fetchTrackingFromLinketrack(trackingCode);
    case 'correios':
    default:
      return fetchTrackingFromCorreios(trackingCode);
  }
}

async function resolveTracking(trackingCode) {
  const normalizedCode = String(trackingCode || '').trim().toUpperCase();

  if (!normalizedCode) {
    const error = new Error('Código de rastreamento inválido.');
    error.statusCode = 400;
    throw error;
  }

  const cached = getCachedTracking(normalizedCode);
  if (cached) {
    return cached;
  }

  try {
    const rawResult = await fetchTrackingFromProvider(normalizedCode);
    const normalized = normalizeTrackingResult(rawResult);

    if (!normalized) {
      const error = new Error('Resposta inválida do provedor de rastreamento.');
      error.statusCode = 502;
      throw error;
    }

    if (!normalized.code) {
      normalized.code = normalizedCode;
    }

    setCachedTracking(normalizedCode, normalized);
    return normalized;
  } catch (error) {
    if (TRACKING_FALLBACK_TO_MOCK && TRACKING_PROVIDER !== 'mock') {
      console.warn('Tracking provider falhou. Utilizando resposta mock.', error);
      const fallback = normalizeTrackingResult(buildMockTracking(normalizedCode));
      setCachedTracking(normalizedCode, fallback);
      return fallback;
    }

    throw error;
  }
}

// Consultar rastreamento dos Correios
app.get('/api/tracking/:trackingCode', async (req, res) => {
  const requestedCode = String(req.params.trackingCode || '').trim().toUpperCase();

  if (!requestedCode || !/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(requestedCode)) {
    return res.status(400).json({
      success: false,
      message: 'Código de rastreamento inválido. Use o formato: AA123456789BR'
    });
  }

  try {
    const tracking = await resolveTracking(requestedCode);

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma movimentação encontrada para este código. Tente novamente mais tarde.'
      });
    }

    res.json({ success: true, tracking });
  } catch (error) {
    const statusCandidate = Number.parseInt(error.statusCode || error.status, 10);
    const status = Number.isInteger(statusCandidate) && statusCandidate >= 400 && statusCandidate <= 599
      ? statusCandidate
      : 502;

    console.error('Erro ao consultar rastreamento:', {
      message: error.message,
      status,
      details: error.details || null
    });

    const message = status === 404
      ? 'Não encontramos atualizações para o código informado. Verifique se o rastreio já foi disponibilizado pelos Correios.'
      : 'Não foi possível consultar o rastreamento no momento. Tente novamente em alguns minutos.';

    res.status(status).json({ success: false, message });
  }
});

// Webhook do Mercado Pago para notificações de pagamento
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const body = req.body || {};
    const query = req.query || {};
    const topic = String(body.type || body.topic || query.topic || query.type || '').toLowerCase();
    const action = String(body.action || query.action || '').toLowerCase();
    const paymentIdRaw = body?.data?.id ?? body?.id ?? query?.id ?? query?.['data.id'];
    const paymentId = paymentIdRaw ? String(paymentIdRaw) : null;

    console.log('📩 Webhook do Mercado Pago recebido:', {
      topic,
      action,
      paymentId,
      body,
      query
    });

    const isPaymentNotification =
      topic === 'payment' ||
      action.startsWith('payment') ||
      String(query?.topic || '').toLowerCase() === 'payment';

    if (!isPaymentNotification || !paymentId) {
      console.log('ℹ️ Notificação ignorada - não é de pagamento ou sem paymentId.');
      return res.status(200).json({ success: true, ignored: true });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      console.error('❌ MP_ACCESS_TOKEN não configurado');
      return res.status(200).json({ success: false, message: 'Token não configurado' });
    }

    let payment;
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao consultar pagamento: ${response.status} - ${errorText}`);
        return res.status(200).json({ success: false, message: 'Erro ao consultar pagamento' });
      }

      payment = await response.json();
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
      return res.status(200).json({ success: false, message: 'Erro ao processar pagamento' });
    }

    console.log('💳 Detalhes do pagamento:', {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount
    });

    const orderId = payment.external_reference ? String(payment.external_reference) : null;

    if (!orderId) {
      console.error('❌ Não foi possível determinar o pedido a partir do external_reference.');
      return res.status(200).json({ success: false, message: 'Pedido não encontrado' });
    }

    const db = readDatabase();
    const order = db.orders.find((o) => String(o.id) === orderId);

    if (!order) {
      console.error(`❌ Pedido ${orderId} não encontrado`);
      return res.status(200).json({ success: false, message: 'Pedido não encontrado' });
    }

    const now = new Date().toISOString();
    let updated = false;

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    const pushHistory = (status, description) => {
      order.statusHistory.push({
        status,
        timestamp: now,
        description
      });
    };

    if (payment.status === 'approved') {
      if (order.status !== 'paid') {
        order.status = 'paid';
        order.updatedAt = now;
        order.paidAt = now;
        order.paymentId = payment.id;
        pushHistory('paid', `Pagamento confirmado pelo Mercado Pago (ID: ${payment.id})`);
        updated = true;
        console.log(`🎉 Pedido ${orderId} atualizado para 'paid'`);
      } else {
        console.log(`⚠️ Pedido ${orderId} já estava com status 'paid'.`);
      }
    } else if (['cancelled', 'rejected', 'charged_back'].includes(payment.status)) {
      if (order.status !== 'cancelled') {
        order.status = 'cancelled';
        order.updatedAt = now;
        pushHistory('cancelled', `Pagamento ${payment.status} pelo Mercado Pago (ID: ${payment.id})`);
        updated = true;
        console.log(`⚠️ Pedido ${orderId} marcado como cancelado (${payment.status}).`);
      }
    } else if (['pending', 'in_process', 'in_mediation'].includes(payment.status)) {
      if (order.status !== 'pending_payment') {
        order.status = 'pending_payment';
        order.updatedAt = now;
        pushHistory('pending_payment', `Pagamento em processamento (${payment.status}).`);
        updated = true;
        console.log(`ℹ️ Pedido ${orderId} atualizado para 'pending_payment' (${payment.status}).`);
      }
    } else {
      console.log(`ℹ️ Status ${payment.status} recebido, nenhuma alteração aplicada.`);
    }

    if (updated) {
      if (order.status === 'cancelled') {
        unlockInventoryForOrder(order);
      } else if (LOCK_INVENTORY_STATUSES.has(order.status)) {
        lockInventoryForOrder(order);
      }

      writeDatabase(db);

      const latestEntry = Array.isArray(order.statusHistory) && order.statusHistory.length
        ? order.statusHistory[order.statusHistory.length - 1]
        : null;
      notifyOrderStatusByEmail(order, latestEntry?.status || order.status, latestEntry?.description || '');
    }

    // Sempre retornar 200 para o Mercado Pago não reenviar
    res.status(200).json({ success: true, updated });
  } catch (error) {
    console.error('❌ Erro no webhook do Mercado Pago:', error);
    res.status(200).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado na porta ${PORT}`);
});
