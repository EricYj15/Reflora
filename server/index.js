const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const QRCode = require('qrcode');
const mercadopago = require('mercadopago');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

if (process.env.MP_ACCESS_TOKEN) {
  mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
}

const dbDir = path.join(__dirname, 'db');
const dbFile = path.join(dbDir, 'orders.json');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ orders: [] }, null, 2));
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

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/orders', (_req, res) => {
  const db = readDatabase();
  res.json({ orders: db.orders });
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, address, items, total } = req.body;

    if (!customer?.name || !customer?.email || !address?.street || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Dados insuficientes. Verifique se o formulário foi preenchido corretamente.'
      });
    }

    const orderId = createOrderId();

    const order = {
      id: orderId,
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
