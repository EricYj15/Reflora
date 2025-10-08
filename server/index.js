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
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.SERVER_PORT || process.env.PORT || 4000);
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
const uploadsDir = path.join(__dirname, 'uploads');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = process.env.JWT_EXPIRATION || '7d';
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || 0);
const RESET_TOKEN_EXPIRATION_MINUTES = Number(process.env.RESET_TOKEN_EXPIRATION_MINUTES || 15);
const RESET_MAX_ATTEMPTS = Number(process.env.RESET_MAX_ATTEMPTS || 5);
const RESET_REQUEST_COOLDOWN_MINUTES = Number(process.env.RESET_REQUEST_COOLDOWN_MINUTES || 2);
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

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

function writeDatabase(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
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

function writeProducts(data) {
  fs.writeFileSync(productsFile, JSON.stringify(data, null, 2));
}

const SIZE_KEYS = ['PP', 'P', 'M', 'G'];

let mailTransporter = null;

function isEmailTransportConfigured() {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM);
}

function getMailTransporter() {
  if (!isEmailTransportConfigured()) {
    return null;
  }

  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }

  return mailTransporter;
}

async function sendPasswordResetEmail(recipient, code) {
  if (!recipient || !code) {
    return false;
  }

  if (!isEmailTransportConfigured()) {
    console.info(`[Reset Password] Código ${code} para ${recipient} (SMTP não configurado).`);
    return false;
  }

  try {
    const transporter = getMailTransporter();
    if (!transporter) {
      return false;
    }

    await transporter.sendMail({
      from: SMTP_FROM,
      to: recipient,
      subject: 'Reflora - Código de redefinição de senha',
      text: `Olá!\n\nRecebemos um pedido para redefinir a senha da sua conta Reflora. Utilize o código abaixo dentro de ${RESET_TOKEN_EXPIRATION_MINUTES} minutos:\n\n${code}\n\nSe você não solicitou a alteração, ignore esta mensagem.\n\nEquipe Reflora`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e1e1e;">
          <p>Olá!</p>
          <p>Recebemos um pedido para redefinir a senha da sua conta Reflora.</p>
          <p>Utilize o código abaixo dentro de <strong>${RESET_TOKEN_EXPIRATION_MINUTES} minutos</strong>:</p>
          <p style="font-size: 1.75rem; letter-spacing: 0.35rem; font-weight: 600; color: #7b0f12;">${code}</p>
          <p>Se você não solicitou a alteração, ignore esta mensagem.</p>
          <p style="margin-top: 24px;">Com carinho,<br />Equipe Reflora</p>
        </div>
      `
    });

    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail de redefinição de senha:', error);
    return false;
  }
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

function isResetRequestExpired(resetRequest = null) {
  if (!resetRequest?.expiresAt) {
    return true;
  }
  const expires = Date.parse(resetRequest.expiresAt);
  return Number.isNaN(expires) || Date.now() > expires;
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

  const { passwordHash, googleId, resetRequest, ...rest } = user;
  return {
    ...rest,
    role: user.role || 'customer'
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
    return res.status(401).json({ success: false, message: 'Token ausente.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.userRole = payload.role || 'customer';
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
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
  const stock = Number.isFinite(stockValue) && stockValue >= 0 ? stockValue : 0;

  const normalizedSizes = SIZE_KEYS.reduce((acc, size) => {
    const value = product.sizes?.[size];
    acc[size] = typeof value === 'boolean' ? value : Boolean(value ?? true);
    return acc;
  }, {});

  if (!Object.values(normalizedSizes).some(Boolean)) {
    SIZE_KEYS.forEach((size) => {
      normalizedSizes[size] = true;
    });
  }

  return {
    ...product,
    stock,
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

  const purchaseLink = String(payload.purchaseLink ?? existing.purchaseLink ?? '').trim();
  if (!purchaseLink) {
    throw new Error('Informe o link de compra da peça.');
  }

  const priceValueInput = payload.priceValue ?? payload.price ?? existing.priceValue ?? existing.price;
  const priceValue = parsePriceValue(priceValueInput);
  if (priceValue === null || priceValue <= 0) {
    throw new Error('Informe um valor de preço válido.');
  }

  const stockInput = payload.stock ?? existing.stock ?? 0;
  const stockValue = Number(stockInput);
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
      acc[size] = true;
    }
    return acc;
  }, {});

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

  return {
    name,
    description,
    purchaseLink,
    priceValue: Number(priceValue.toFixed(2)),
    price: formatPriceDisplay(priceValue),
    images,
    stock: Number(Math.round(stockValue)),
    sizes
  };
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

    const preference = {
      items: order.items.map((item) => ({
        title: item.name,
        quantity: Number(item.quantity) || 1,
        currency_id: 'BRL',
        unit_price: Number(item.priceValue) || 0
      })),
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
      try {
        await validateRecaptchaToken(req.body?.captchaToken, extractClientIp(req));
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
    const existing = db.users.find((user) => user.email === normalizedEmail);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Este e-mail já está cadastrado. Faça login ou utilize outro e-mail.'
      });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const role = isAdminEmail(normalizedEmail) ? 'admin' : 'customer';
      const user = {
        id: randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        provider: 'local',
        role,
        createdAt: new Date().toISOString()
      };

      db.users.push(user);
      writeUsers(db);

      const token = createTokenForUser(user);

      res.status(201).json({
        success: true,
        user: sanitizePublicUser(user),
        token
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
      try {
        await validateRecaptchaToken(req.body?.captchaToken, extractClientIp(req));
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
      try {
        await validateRecaptchaToken(req.body?.captchaToken, extractClientIp(req));
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
        createdAt: new Date().toISOString()
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
      writeUsers(db);
    } else {
      const role = ensureRole(user);
      if (role !== user.role) {
        user.role = role;
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
  const db = readUsers();
  const user = db.users.find((u) => u.id === req.userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  const role = ensureRole(user);
  if (role !== user.role) {
    user.role = role;
    writeUsers(db);
  }

  res.json({ success: true, user: sanitizePublicUser(user) });
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

app.post('/api/orders', attachUserIfPresent, async (req, res) => {
  try {
    const { customer, address, items, total, shipping } = req.body;

    if (!customer?.name || !customer?.email || !address?.street || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados insuficientes. Verifique se o formulário foi preenchido corretamente.'
      });
    }

    const orderId = createOrderId();

    const order = {
      id: orderId,
      userId: req.userId || null,
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
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
      total: Number(total) || 0,
      createdAt: new Date().toISOString()
    };

    const db = readDatabase();
    db.orders.unshift(order);
    writeDatabase(db);

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

app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado na porta ${PORT}`);
});
