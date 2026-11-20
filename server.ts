import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { ALGERIA_WILAYAS, buildDefaultDeliveryRates, findWilayaByCode } from './src/data/algeriaWilayas.ts';
import {
  CUSTOM_GARMENT_PRICING,
  DEFAULT_SITE_DESIGN,
  DEFAULT_STUDIO_GARMENTS,
  GARMENT_SILHOUETTE_LABELS,
  STORE_PRODUCTS,
} from './src/data/catalog.ts';
import type {
  ContactMessageRecord,
  CurrencyCode,
  CustomDesignSpec,
  DeliveryMethod,
  DeliveryRatesMap,
  GarmentCategory,
  GarmentSilhouette,
  OrderItemRecord,
  OrderStatus,
  OwnerOverviewPayload,
  ProductRecord,
  ProductSize,
  SiteDesignConfig,
  StoreOrderRecord,
  StudioColorOption,
  StudioGarmentOption,
  VipCouponRecord,
  VipRequestRecord,
  VipStatus,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'store-state.json');
const OWNER_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_IMAGE_DATA_URL_LENGTH = 5_000_000;
const MAX_CUSTOM_PREVIEW_LENGTH = 160_000;

interface OwnerTokenEntry {
  token: string;
  createdAt: number;
}

interface PersistedState {
  config: {
    ownerConfigured: boolean;
    ownerPasswordHash: string;
    updatedAt: string;
  };
  design: SiteDesignConfig;
  products: ProductRecord[];
  deliveryRates: DeliveryRatesMap;
  vipCoupons: VipCouponRecord[];
  vipRequests: VipRequestRecord[];
  orders: StoreOrderRecord[];
  contactMessages: ContactMessageRecord[];
  ownerTokens: OwnerTokenEntry[];
}

function createInitialState(): PersistedState {
  return {
    config: {
      ownerConfigured: false,
      ownerPasswordHash: '',
      updatedAt: new Date().toISOString(),
    },
    design: structuredClone(DEFAULT_SITE_DESIGN),
    products: structuredClone(STORE_PRODUCTS),
    deliveryRates: buildDefaultDeliveryRates('DZD'),
    vipCoupons: [
      {
        code: 'SKELETON20',
        description: 'كوبون ترحيبي للزوار المقربين — خصم 20%',
        discountPercent: 20,
        active: true,
        createdAt: new Date().toISOString(),
      },
    ],
    vipRequests: [],
    orders: [],
    contactMessages: [],
    ownerTokens: [],
  };
}

function ensureAllWilayaRates(existing?: DeliveryRatesMap): DeliveryRatesMap {
  const defaults = buildDefaultDeliveryRates('DZD');
  const merged: DeliveryRatesMap = {};
  for (const w of ALGERIA_WILAYAS) {
    const entry = existing?.[w.code];
    if (
      entry &&
      typeof entry.postOfficePrice === 'number' &&
      Number.isFinite(entry.postOfficePrice) &&
      entry.postOfficePrice >= 0 &&
      typeof entry.homePrice === 'number' &&
      Number.isFinite(entry.homePrice) &&
      entry.homePrice >= 0
    ) {
      merged[w.code] = {
        postOfficePrice: entry.postOfficePrice,
        homePrice: entry.homePrice,
      };
    } else {
      merged[w.code] = defaults[w.code];
    }
  }
  return merged;
}

function loadState(): PersistedState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STATE_FILE)) {
      const fresh = createInitialState();
      fs.writeFileSync(STATE_FILE, JSON.stringify(fresh, null, 2), 'utf8');
      return fresh;
    }
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const fresh = createInitialState();

    const state: PersistedState = {
      config: {
        ownerConfigured: Boolean(parsed.config?.ownerConfigured && parsed.config?.ownerPasswordHash),
        ownerPasswordHash: String(parsed.config?.ownerPasswordHash || ''),
        updatedAt: String(parsed.config?.updatedAt || fresh.config.updatedAt),
      },
      design: {
        ...fresh.design,
        ...(parsed.design || {}),
        studioColors:
          Array.isArray(parsed.design?.studioColors) && parsed.design.studioColors.length > 0
            ? parsed.design.studioColors
            : fresh.design.studioColors,
        studioGarments: Array.isArray(parsed.design?.studioGarments)
          ? sanitizeStudioGarments(parsed.design.studioGarments)
          : fresh.design.studioGarments,
      },
      products: Array.isArray(parsed.products) ? parsed.products : fresh.products,
      deliveryRates: ensureAllWilayaRates(parsed.deliveryRates),
      vipCoupons: Array.isArray(parsed.vipCoupons) ? parsed.vipCoupons : fresh.vipCoupons,
      vipRequests: Array.isArray(parsed.vipRequests) ? parsed.vipRequests.slice(0, 250) : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      contactMessages: Array.isArray(parsed.contactMessages)
        ? parsed.contactMessages.slice(0, 250)
        : [],
      ownerTokens: Array.isArray(parsed.ownerTokens)
        ? parsed.ownerTokens.filter((t) => Date.now() - t.createdAt < OWNER_TOKEN_TTL_MS)
        : [],
    };
    return state;
  } catch (err) {
    console.error('Failed to load store-state.json, initializing fresh state:', err);
    return createInitialState();
  }
}

const VALID_GARMENT_CATEGORIES: GarmentCategory[] = ['tshirts', 'hoodies', 'pants', 'joggers'];

function sanitizeStudioGarments(raw: unknown): StudioGarmentOption[] {
  if (!Array.isArray(raw)) return structuredClone(DEFAULT_STUDIO_GARMENTS);
  const valid: StudioGarmentOption[] = [];
  const seenIds = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<StudioGarmentOption>;
    const id = String(obj.id || '').trim().slice(0, 60);
    const label = String(obj.label || '').trim().slice(0, 80);
    if (!id || !label || seenIds.has(id)) continue;

    const rawSil = String(obj.silhouette || '') as GarmentSilhouette;
    const silhouette: GarmentSilhouette =
      rawSil in GARMENT_SILHOUETTE_LABELS ? rawSil : 'tshirt-classic';
    const rawCat = String(obj.category || '') as GarmentCategory;
    const category: GarmentCategory = VALID_GARMENT_CATEGORIES.includes(rawCat)
      ? rawCat
      : GARMENT_SILHOUETTE_LABELS[silhouette].category;

    const usd = Number(obj.prices?.USD);
    const eur = Number(obj.prices?.EUR);
    const dzd = Number(obj.prices?.DZD);

    seenIds.add(id);
    valid.push({
      id,
      category,
      silhouette,
      label,
      fabricNote: String(obj.fabricNote || '').trim().slice(0, 140) || 'قماش فاخر مختار بعناية',
      available: obj.available !== false,
      prices: {
        USD: Number.isFinite(usd) && usd > 0 ? usd : 50,
        EUR: Number.isFinite(eur) && eur > 0 ? eur : 46,
        DZD: Number.isFinite(dzd) && dzd > 0 ? dzd : 4500,
      },
    });
  }
  return valid;
}

let state: PersistedState = loadState();

function saveState(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const now = Date.now();
    state.ownerTokens = state.ownerTokens.filter((t) => now - t.createdAt < OWNER_TOKEN_TTL_MS);
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist store-state.json:', err);
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  const originalBuf = Buffer.from(originalHex, 'hex');
  if (derivedBuf.length !== originalBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, originalBuf);
}

function issueOwnerToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  state.ownerTokens.push({ token, createdAt: Date.now() });
  saveState();
  return token;
}

function isValidOwnerToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const now = Date.now();
  const valid = state.ownerTokens.some(
    (entry) => entry.token === token && now - entry.createdAt < OWNER_TOKEN_TTL_MS
  );
  return valid;
}

function isValidAssetOrImageUrl(url: string, maxLen = MAX_IMAGE_DATA_URL_LENGTH): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > maxLen) return false;
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  );
}

function isValidHexColor(hex: string): boolean {
  return typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex.trim());
}

function buildOwnerOverview(): OwnerOverviewPayload {
  return {
    design: state.design,
    products: state.products,
    deliveryRates: state.deliveryRates,
    vipCoupons: state.vipCoupons,
    vipRequests: state.vipRequests,
    orders: state.orders,
    contactMessages: state.contactMessages,
  };
}

// WebSocket tracking
interface PublicSocketMeta {
  ws: WebSocket;
  vipToken: string;
}

const publicSockets = new Set<PublicSocketMeta>();
const ownerSockets = new Set<WebSocket>();

function sendWsJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastPublic(event: string, data: unknown): void {
  for (const client of publicSockets) {
    sendWsJson(client.ws, { event, data });
  }
}

function broadcastVipStatusToToken(vipToken: string, request: VipRequestRecord): void {
  for (const client of publicSockets) {
    if (client.vipToken && client.vipToken === vipToken) {
      sendWsJson(client.ws, { event: 'vip:status', data: request });
    }
  }
}

function broadcastOwner(event: string, data: unknown): void {
  for (const ws of ownerSockets) {
    sendWsJson(ws, { event, data });
  }
}

function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const token = req.header('x-owner-token');
  if (!isValidOwnerToken(token)) {
    res.status(401).json({ error: 'جلسة المالك غير صالحة أو منتهية.' });
    return;
  }
  next();
}

const app = express();
app.use(express.json({ limit: '6mb' }));

// =====================================================================
// Public Store Endpoints
// =====================================================================
app.get('/api/store/bootstrap', (_req, res) => {
  res.json({
    design: state.design,
    products: state.products,
    deliveryRates: state.deliveryRates,
  });
});

app.get('/api/owner/status', (_req, res) => {
  res.json({
    ownerConfigured: state.config.ownerConfigured,
  });
});

app.post('/api/vip-requests', (req, res) => {
  const fullName = String(req.body?.fullName || '').trim();
  const couponCode = String(req.body?.couponCode || '').trim().toUpperCase();
  const note = String(req.body?.note || '').trim().slice(0, 300);
  const acceptedPolicy = Boolean(req.body?.acceptedPolicy);

  if (!fullName || fullName.length < 2) {
    res.status(400).json({ error: 'يرجى إدخال الاسم الكامل.' });
    return;
  }
  if (!couponCode) {
    res.status(400).json({ error: 'يرجى إدخال رمز الكوبون.' });
    return;
  }
  if (!acceptedPolicy) {
    res.status(400).json({ error: 'يجب الموافقة على سياسة الخصوصية للمتابعة.' });
    return;
  }

  const matchedCoupon = state.vipCoupons.find(
    (c) => c.code.toUpperCase() === couponCode && c.active
  );
  if (!matchedCoupon) {
    res.status(400).json({ error: 'رمز الكوبون غير صالح أو غير مفعّل حالياً.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const vipReq: VipRequestRecord = {
    id: `VIP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    sessionToken: crypto.randomBytes(24).toString('hex'),
    fullName: fullName.slice(0, 100),
    couponCode: matchedCoupon.code,
    note: note || undefined,
    acceptedPolicy: true,
    status: 'pending',
    discountPercent: matchedCoupon.discountPercent,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  state.vipRequests.unshift(vipReq);
  if (state.vipRequests.length > 250) {
    state.vipRequests = state.vipRequests.slice(0, 250);
  }
  saveState();
  broadcastOwner('owner:new_vip_request', vipReq);

  res.status(201).json({ request: vipReq });
});

app.get('/api/vip/session', (req, res) => {
  const vipToken = String(req.header('x-vip-token') || '').trim();
  if (!vipToken) {
    res.json({ request: null });
    return;
  }
  const found = state.vipRequests.find((r) => r.sessionToken === vipToken) || null;
  res.json({ request: found });
});

app.post('/api/orders', (req, res) => {
  const customerName = String(req.body?.customerName || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const wilayaCode = String(req.body?.wilayaCode || '').trim().padStart(2, '0');
  const commune = String(req.body?.commune || '').trim().slice(0, 100);
  const deliveryMethod = req.body?.deliveryMethod as DeliveryMethod;
  const rawAddress = String(req.body?.address || '').trim();
  const notes = String(req.body?.notes || '').trim().slice(0, 400);
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!customerName || customerName.length < 2) {
    res.status(400).json({ error: 'يرجى إدخال الاسم الكامل.' });
    return;
  }
  if (!phone || phone.length < 6) {
    res.status(400).json({ error: 'يرجى إدخال رقم هاتف صحيح للتواصل.' });
    return;
  }
  const wilaya = findWilayaByCode(wilayaCode);
  if (!wilaya) {
    res.status(400).json({ error: 'الولاية المختارة غير صالحة.' });
    return;
  }
  if (deliveryMethod !== 'post_office' && deliveryMethod !== 'home') {
    res.status(400).json({ error: 'يرجى اختيار طريقة توصيل صالحة.' });
    return;
  }
  if (deliveryMethod === 'home' && !rawAddress) {
    res.status(400).json({ error: 'العنوان مطلوب عند اختيار التوصيل للمنزل.' });
    return;
  }
  if (rawItems.length === 0) {
    res.status(400).json({ error: 'سلة المشتريات فارغة.' });
    return;
  }

  const finalAddress =
    rawAddress || `مكتب بريد ولاية ${wilaya.nameAr} (${wilaya.code})`;

  const verifiedItems: OrderItemRecord[] = [];
  const stockDeductions: Array<{ product: ProductRecord; qty: number }> = [];
  let subtotal = 0;
  let orderCurrency: CurrencyCode | null = null;

  for (const item of rawItems) {
    const qty = Number(item?.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      res.status(400).json({ error: 'كمية كل قطعة يجب أن تكون بين 1 و 20.' });
      return;
    }
    const size = String(item?.size || 'M') as ProductSize;
    const validSizes: ProductSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    if (!validSizes.includes(size)) {
      res.status(400).json({ error: 'أحد المقاسات المختارة غير صالح.' });
      return;
    }

    if (item?.kind === 'custom') {
      const spec = item?.customSpec as CustomDesignSpec | undefined;
      const garmentType = String(spec?.garmentType || '').trim();
      const configuredGarment = state.design.studioGarments.find((g) => g.id === garmentType);
      const fallbackGarment = CUSTOM_GARMENT_PRICING[garmentType];

      if (!spec || !garmentType || (!configuredGarment && !fallbackGarment)) {
        res.status(400).json({ error: 'نوع القطعة المخصصة غير صالح.' });
        return;
      }
      if (configuredGarment && !configuredGarment.available) {
        res.status(400).json({ error: `القطعة "${configuredGarment.label}" غير متوفرة حالياً في الاستوديو.` });
        return;
      }
      if (spec.previewImage) {
        if (
          typeof spec.previewImage !== 'string' ||
          !spec.previewImage.startsWith('data:image/') ||
          spec.previewImage.length > MAX_CUSTOM_PREVIEW_LENGTH
        ) {
          res.status(400).json({ error: 'صورة معاينة التصميم المخصص غير صالحة أو تتجاوز الحد المسموح.' });
          return;
        }
      }
      const currency = state.design.defaultCurrency;
      if (!orderCurrency) orderCurrency = currency;
      const pricing = configuredGarment || fallbackGarment;
      const unitPrice = pricing.prices[currency];
      subtotal += unitPrice * qty;

      verifiedItems.push({
        productId: garmentType,
        name: `${pricing.label} (تصميم مخصص)`,
        kind: 'custom',
        size,
        quantity: qty,
        unitPrice,
        currency,
        customSpec: {
          garmentType,
          garmentLabel: pricing.label,
          silhouette: configuredGarment?.silhouette || spec.silhouette,
          ...(typeof spec.withHood === 'boolean' ? { withHood: spec.withHood } : {}),
          ...(typeof spec.withAnkleCuffs === 'boolean'
            ? { withAnkleCuffs: spec.withAnkleCuffs }
            : {}),
          colorId: String(spec.colorId || 'custom'),
          colorName: String(spec.colorName || 'لون مختار').slice(0, 60),
          colorHex: isValidHexColor(spec.colorHex) ? spec.colorHex : '#141518',
          frontLayerCount: Math.max(0, Math.min(20, Number(spec.frontLayerCount || 0))),
          backLayerCount: Math.max(0, Math.min(20, Number(spec.backLayerCount || 0))),
          previewImage: spec.previewImage,
        },
      });
    } else {
      const productId = String(item?.productId || '');
      const product = state.products.find((p) => p.id === productId);
      if (!product) {
        res.status(400).json({ error: 'أحد المنتجات في الحقيبة لم يعد متوفراً.' });
        return;
      }
      if (product.stock < qty) {
        res.status(400).json({ error: `الكمية المطلوبة من "${product.name}" تتجاوز المخزون المتاح (${product.stock}).` });
        return;
      }
      if (!orderCurrency) orderCurrency = product.currency;
      subtotal += product.price * qty;
      stockDeductions.push({ product, qty });

      verifiedItems.push({
        productId: product.id,
        name: product.name,
        kind: 'catalog',
        size,
        quantity: qty,
        unitPrice: product.price,
        currency: product.currency,
      });
    }
  }

  for (const deduction of stockDeductions) {
    deduction.product.stock = Math.max(0, deduction.product.stock - deduction.qty);
  }

  const finalCurrency: CurrencyCode = orderCurrency || state.design.defaultCurrency;
  const rate = state.deliveryRates[wilaya.code] || { postOfficePrice: 500, homePrice: 750 };
  const deliveryFee = deliveryMethod === 'post_office' ? rate.postOfficePrice : rate.homePrice;

  const vipToken = String(req.header('x-vip-token') || '').trim();
  const approvedVip = vipToken
    ? state.vipRequests.find((r) => r.sessionToken === vipToken && r.status === 'approved')
    : undefined;

  const discountPercent = approvedVip ? Math.max(0, Math.min(80, approvedVip.discountPercent)) : 0;
  const discountAmount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discountAmount + deliveryFee) * 100) / 100);

  const nowIso = new Date().toISOString();
  const order: StoreOrderRecord = {
    id: `ORD-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    customerName: customerName.slice(0, 120),
    phone: phone.slice(0, 40),
    wilayaCode: wilaya.code,
    wilayaName: wilaya.nameAr,
    commune: commune || undefined,
    deliveryMethod,
    address: finalAddress.slice(0, 300),
    notes: notes || undefined,
    items: verifiedItems,
    currency: finalCurrency,
    subtotal,
    discountPercent,
    discountAmount,
    deliveryFee,
    total,
    vipSessionToken: approvedVip?.sessionToken,
    vipCouponCode: approvedVip?.couponCode,
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  state.orders.unshift(order);
  saveState();

  broadcastPublic('store:products_updated', state.products);
  broadcastOwner('owner:products_updated', state.products);
  broadcastOwner('owner:new_order', order);

  res.status(201).json({ order, products: state.products });
});

app.post('/api/contact', (req, res) => {
  const senderName = String(req.body?.senderName || '').trim();
  const contactInfo = String(req.body?.contactInfo || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!senderName || senderName.length < 2) {
    res.status(400).json({ error: 'يرجى إدخال الاسم.' });
    return;
  }
  if (!contactInfo || contactInfo.length < 4) {
    res.status(400).json({ error: 'يرجى إدخال وسيلة تواصل (هاتف أو بريد أو حساب).' });
    return;
  }
  if (!message || message.length < 4) {
    res.status(400).json({ error: 'يرجى كتابة نص الرسالة.' });
    return;
  }

  const record: ContactMessageRecord = {
    id: `MSG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    senderName: senderName.slice(0, 100),
    contactInfo: contactInfo.slice(0, 140),
    message: message.slice(0, 1500),
    read: false,
    createdAt: new Date().toISOString(),
  };

  state.contactMessages.unshift(record);
  if (state.contactMessages.length > 250) {
    state.contactMessages = state.contactMessages.slice(0, 250);
  }
  saveState();
  broadcastOwner('owner:new_message', record);

  res.status(201).json({ message: record });
});

// =====================================================================
// Owner Auth Endpoints
// =====================================================================
app.post('/api/owner/setup', (req, res) => {
  if (state.config.ownerConfigured) {
    res.status(409).json({ error: 'تم إعداد كلمة مرور المالك مسبقاً.' });
    return;
  }
  const password = String(req.body?.password || '');
  if (password.length < 4) {
    res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' });
    return;
  }

  state.config.ownerPasswordHash = hashPassword(password);
  state.config.ownerConfigured = true;
  state.config.updatedAt = new Date().toISOString();
  const ownerToken = issueOwnerToken();

  res.status(201).json({ ownerToken, ownerConfigured: true });
});

app.post('/api/owner/login', (req, res) => {
  if (!state.config.ownerConfigured) {
    res.status(400).json({ error: 'لم يتم إعداد كلمة مرور المالك بعد.' });
    return;
  }
  const password = String(req.body?.password || '');
  if (!verifyPassword(password, state.config.ownerPasswordHash)) {
    res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
    return;
  }
  const ownerToken = issueOwnerToken();
  res.json({ ownerToken });
});

app.post('/api/owner/logout', (req, res) => {
  const token = req.header('x-owner-token');
  if (token) {
    state.ownerTokens = state.ownerTokens.filter((entry) => entry.token !== token);
    saveState();
  }
  res.json({ ok: true });
});

// =====================================================================
// Protected Owner Endpoints
// =====================================================================
app.get('/api/owner/overview', requireOwner, (_req, res) => {
  res.json(buildOwnerOverview());
});

app.put('/api/owner/admin-password', requireOwner, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!verifyPassword(currentPassword, state.config.ownerPasswordHash)) {
    res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
    return;
  }
  if (newPassword.length < 4) {
    res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل.' });
    return;
  }
  state.config.ownerPasswordHash = hashPassword(newPassword);
  state.config.updatedAt = new Date().toISOString();
  saveState();
  res.json({ ok: true });
});

app.post('/api/owner/products', requireOwner, (req, res) => {
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const category = String(body.category || 'المعاطف').trim();
  const price = Number(body.price);
  const lengthCm = Number(body.lengthCm || 74);
  const widthCm = Number(body.widthCm || 54);
  const stock = Number(body.stock ?? 5);
  const image = String(body.image || '/assets/products/coat-obsidian.svg').trim();

  if (!name) {
    res.status(400).json({ error: 'اسم القطعة مطلوب.' });
    return;
  }
  if (!Number.isFinite(price) || price <= 0) {
    res.status(400).json({ error: 'يرجى إدخال سعر صالح أكبر من 0.' });
    return;
  }
  if (!isValidAssetOrImageUrl(image)) {
    res.status(400).json({ error: 'صورة المنتج غير صالحة.' });
    return;
  }

  const currency: CurrencyCode =
    body.currency === 'EUR' || body.currency === 'DZD' ? body.currency : 'USD';
  const sizes: ProductSize[] =
    Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : ['S', 'M', 'L', 'XL'];

  const product: ProductRecord = {
    id: `prod-${crypto.randomBytes(4).toString('hex')}`,
    name: name.slice(0, 120),
    subtitle: String(body.subtitle || '').trim().slice(0, 140),
    category: category.slice(0, 60),
    edition: String(body.edition || 'إصدار خاص').trim().slice(0, 80),
    price,
    currency,
    lengthCm: Number.isFinite(lengthCm) && lengthCm > 0 ? lengthCm : 74,
    widthCm: Number.isFinite(widthCm) && widthCm > 0 ? widthCm : 54,
    stock: Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0,
    sizes,
    fabric: String(body.fabric || 'قماش فاخر مختار بعناية').trim().slice(0, 140),
    fit: String(body.fit || 'قصة متزنة ومريحة').trim().slice(0, 120),
    image,
    description: String(body.description || '').trim().slice(0, 600),
    createdAt: new Date().toISOString(),
  };

  state.products.unshift(product);
  saveState();
  broadcastPublic('store:products_updated', state.products);
  broadcastOwner('owner:products_updated', state.products);

  res.status(201).json({ product, products: state.products });
});

app.put('/api/owner/products/:id', requireOwner, (req, res) => {
  const id = String(req.params.id || '');
  const idx = state.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'القطعة غير موجودة.' });
    return;
  }
  const existing = state.products[idx];
  const body = req.body || {};

  const image = body.image !== undefined ? String(body.image).trim() : existing.image;
  if (!isValidAssetOrImageUrl(image)) {
    res.status(400).json({ error: 'صورة المنتج غير صالحة.' });
    return;
  }

  const price = body.price !== undefined ? Number(body.price) : existing.price;
  if (!Number.isFinite(price) || price <= 0) {
    res.status(400).json({ error: 'السعر غير صالح.' });
    return;
  }

  const updated: ProductRecord = {
    ...existing,
    name: body.name !== undefined ? String(body.name).trim().slice(0, 120) : existing.name,
    subtitle: body.subtitle !== undefined ? String(body.subtitle).trim().slice(0, 140) : existing.subtitle,
    category: body.category !== undefined ? String(body.category).trim().slice(0, 60) : existing.category,
    edition: body.edition !== undefined ? String(body.edition).trim().slice(0, 80) : existing.edition,
    price,
    currency:
      body.currency === 'USD' || body.currency === 'EUR' || body.currency === 'DZD'
        ? body.currency
        : existing.currency,
    lengthCm: body.lengthCm !== undefined ? Math.max(10, Number(body.lengthCm)) : existing.lengthCm,
    widthCm: body.widthCm !== undefined ? Math.max(10, Number(body.widthCm)) : existing.widthCm,
    stock: body.stock !== undefined ? Math.max(0, Math.floor(Number(body.stock))) : existing.stock,
    sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : existing.sizes,
    fabric: body.fabric !== undefined ? String(body.fabric).trim().slice(0, 140) : existing.fabric,
    fit: body.fit !== undefined ? String(body.fit).trim().slice(0, 120) : existing.fit,
    image,
    description:
      body.description !== undefined ? String(body.description).trim().slice(0, 600) : existing.description,
  };

  state.products[idx] = updated;
  saveState();
  broadcastPublic('store:products_updated', state.products);
  broadcastOwner('owner:products_updated', state.products);

  res.json({ product: updated, products: state.products });
});

app.delete('/api/owner/products/:id', requireOwner, (req, res) => {
  const id = String(req.params.id || '');
  const next = state.products.filter((p) => p.id !== id);
  if (next.length === state.products.length) {
    res.status(404).json({ error: 'القطعة غير موجودة.' });
    return;
  }
  state.products = next;
  saveState();
  broadcastPublic('store:products_updated', state.products);
  broadcastOwner('owner:products_updated', state.products);

  res.json({ products: state.products });
});

app.put('/api/owner/design', requireOwner, (req, res) => {
  const incoming = (req.body || {}) as Partial<SiteDesignConfig>;

  if (incoming.heroImage !== undefined && !isValidAssetOrImageUrl(incoming.heroImage)) {
    res.status(400).json({ error: 'رابط أو بيانات الصورة الرئيسية غير صالحة.' });
    return;
  }

  const nextColors = Array.isArray(incoming.studioColors)
    ? incoming.studioColors.filter(
        (c): c is StudioColorOption =>
          Boolean(c && c.id && c.name && isValidHexColor(c.hex))
      )
    : state.design.studioColors;

  const nextGarments = Array.isArray(incoming.studioGarments)
    ? sanitizeStudioGarments(incoming.studioGarments)
    : state.design.studioGarments;

  const gridCols =
    incoming.gridColumns === 2 || incoming.gridColumns === 3 || incoming.gridColumns === 4
      ? incoming.gridColumns
      : state.design.gridColumns;

  const radiusStyle =
    incoming.radiusStyle === 'sharp' ||
    incoming.radiusStyle === 'balanced' ||
    incoming.radiusStyle === 'rounded'
      ? incoming.radiusStyle
      : state.design.radiusStyle;

  const defaultCurrency: CurrencyCode =
    incoming.defaultCurrency === 'USD' ||
    incoming.defaultCurrency === 'EUR' ||
    incoming.defaultCurrency === 'DZD'
      ? incoming.defaultCurrency
      : state.design.defaultCurrency;

  state.design = {
    ...state.design,
    brandName:
      incoming.brandName !== undefined
        ? String(incoming.brandName).trim().slice(0, 60) || state.design.brandName
        : state.design.brandName,
    heroEyebrow:
      incoming.heroEyebrow !== undefined
        ? String(incoming.heroEyebrow).trim().slice(0, 120)
        : state.design.heroEyebrow,
    heroTitle:
      incoming.heroTitle !== undefined
        ? String(incoming.heroTitle).trim().slice(0, 140)
        : state.design.heroTitle,
    heroSubtitle:
      incoming.heroSubtitle !== undefined
        ? String(incoming.heroSubtitle).trim().slice(0, 260)
        : state.design.heroSubtitle,
    heroImage:
      incoming.heroImage !== undefined ? incoming.heroImage.trim() : state.design.heroImage,
    bgColor: isValidHexColor(incoming.bgColor || '') ? incoming.bgColor! : state.design.bgColor,
    surfaceColor: isValidHexColor(incoming.surfaceColor || '')
      ? incoming.surfaceColor!
      : state.design.surfaceColor,
    textColor: isValidHexColor(incoming.textColor || '')
      ? incoming.textColor!
      : state.design.textColor,
    mutedColor: isValidHexColor(incoming.mutedColor || '')
      ? incoming.mutedColor!
      : state.design.mutedColor,
    accentColor: isValidHexColor(incoming.accentColor || '')
      ? incoming.accentColor!
      : state.design.accentColor,
    borderColor: isValidHexColor(incoming.borderColor || '')
      ? incoming.borderColor!
      : state.design.borderColor,
    radiusStyle,
    gridColumns: gridCols,
    defaultCurrency,
    contactEmail:
      incoming.contactEmail !== undefined
        ? String(incoming.contactEmail).trim().slice(0, 140)
        : state.design.contactEmail,
    contactPhone:
      incoming.contactPhone !== undefined
        ? String(incoming.contactPhone).trim().slice(0, 60)
        : state.design.contactPhone,
    contactInstagram:
      incoming.contactInstagram !== undefined
        ? String(incoming.contactInstagram).trim().slice(0, 100)
        : state.design.contactInstagram,
    studioColors: nextColors.length > 0 ? nextColors : state.design.studioColors,
    studioGarments: nextGarments,
  };

  saveState();
  broadcastPublic('store:design_updated', state.design);
  broadcastOwner('owner:design_updated', state.design);

  res.json({ design: state.design });
});

app.put('/api/owner/hero-image', requireOwner, (req, res) => {
  const heroImage = String(req.body?.heroImage || '').trim();
  if (!isValidAssetOrImageUrl(heroImage)) {
    res.status(400).json({ error: 'صورة الواجهة الرئيسية غير صالحة أو تتجاوز 5 ملايين حرف.' });
    return;
  }
  state.design = { ...state.design, heroImage };
  saveState();
  broadcastPublic('store:design_updated', state.design);
  broadcastOwner('owner:design_updated', state.design);

  res.json({ design: state.design });
});

app.put('/api/owner/studio-colors', requireOwner, (req, res) => {
  const rawColors = Array.isArray(req.body?.studioColors) ? req.body.studioColors : [];
  const validColors: StudioColorOption[] = rawColors
    .filter(
      (c: unknown): c is StudioColorOption =>
        Boolean(
          c &&
            typeof c === 'object' &&
            'id' in c &&
            'name' in c &&
            'hex' in c &&
            isValidHexColor(String((c as StudioColorOption).hex))
        )
    )
    .map((c: StudioColorOption) => ({
      id: String(c.id).trim().slice(0, 40),
      name: String(c.name).trim().slice(0, 60),
      hex: String(c.hex).trim(),
    }));

  if (validColors.length === 0) {
    res.status(400).json({ error: 'يجب الإبقاء على لون واحد على الأقل في الاستوديو.' });
    return;
  }

  state.design = { ...state.design, studioColors: validColors };
  saveState();
  broadcastPublic('store:design_updated', state.design);
  broadcastOwner('owner:design_updated', state.design);

  res.json({ design: state.design });
});

app.put('/api/owner/studio-garments', requireOwner, (req, res) => {
  if (!Array.isArray(req.body?.studioGarments)) {
    res.status(400).json({ error: 'قائمة قطع الاستوديو غير صالحة.' });
    return;
  }
  const validGarments = sanitizeStudioGarments(req.body.studioGarments);
  state.design = { ...state.design, studioGarments: validGarments };
  saveState();
  broadcastPublic('store:design_updated', state.design);
  broadcastOwner('owner:design_updated', state.design);

  res.json({ design: state.design });
});

app.put('/api/owner/delivery-rates', requireOwner, (req, res) => {
  const incomingRates = (req.body?.deliveryRates || req.body || {}) as DeliveryRatesMap;
  const merged = { ...state.deliveryRates };

  for (const w of ALGERIA_WILAYAS) {
    const entry = incomingRates[w.code];
    if (entry && typeof entry === 'object') {
      const postOfficePrice = Number(entry.postOfficePrice);
      const homePrice = Number(entry.homePrice);
      if (
        Number.isFinite(postOfficePrice) &&
        postOfficePrice >= 0 &&
        Number.isFinite(homePrice) &&
        homePrice >= 0
      ) {
        merged[w.code] = { postOfficePrice, homePrice };
      }
    }
  }

  state.deliveryRates = merged;
  saveState();
  broadcastPublic('store:delivery_updated', state.deliveryRates);
  broadcastOwner('owner:delivery_updated', state.deliveryRates);

  res.json({ deliveryRates: state.deliveryRates });
});

app.post('/api/owner/coupons', requireOwner, (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase().replace(/\s+/g, '');
  const description = String(req.body?.description || '').trim().slice(0, 140);
  const discountPercent = Number(req.body?.discountPercent);

  if (!code || code.length < 2) {
    res.status(400).json({ error: 'يرجى إدخال رمز كوبون صالح.' });
    return;
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 80) {
    res.status(400).json({ error: 'نسبة الخصم يجب أن تكون بين 0% و 80%.' });
    return;
  }
  if (state.vipCoupons.some((c) => c.code === code)) {
    res.status(409).json({ error: 'رمز الكوبون موجود مسبقاً.' });
    return;
  }

  const coupon: VipCouponRecord = {
    code,
    description: description || `خصم خاص ${discountPercent}%`,
    discountPercent: Math.round(discountPercent),
    active: true,
    createdAt: new Date().toISOString(),
  };

  state.vipCoupons.unshift(coupon);
  saveState();
  res.status(201).json({ coupon, vipCoupons: state.vipCoupons });
});

app.patch('/api/owner/coupons/:code/toggle', requireOwner, (req, res) => {
  const code = decodeURIComponent(String(req.params.code || '')).toUpperCase();
  const coupon = state.vipCoupons.find((c) => c.code === code);
  if (!coupon) {
    res.status(404).json({ error: 'الكوبون غير موجود.' });
    return;
  }
  coupon.active = !coupon.active;
  saveState();
  res.json({ coupon, vipCoupons: state.vipCoupons });
});

app.delete('/api/owner/coupons/:code', requireOwner, (req, res) => {
  const code = decodeURIComponent(String(req.params.code || '')).toUpperCase();
  state.vipCoupons = state.vipCoupons.filter((c) => c.code !== code);
  saveState();
  res.json({ vipCoupons: state.vipCoupons });
});

app.post('/api/owner/vip-requests/:id/decision', requireOwner, (req, res) => {
  const id = String(req.params.id || '');
  const status = req.body?.status as VipStatus;
  if (status !== 'approved' && status !== 'denied' && status !== 'revoked') {
    res.status(400).json({ error: 'حالة القرار غير صالحة.' });
    return;
  }
  const found = state.vipRequests.find((r) => r.id === id);
  if (!found) {
    res.status(404).json({ error: 'طلب العضوية غير موجود.' });
    return;
  }
  found.status = status;
  found.updatedAt = new Date().toISOString();
  saveState();

  broadcastVipStatusToToken(found.sessionToken, found);
  broadcastOwner('owner:vip_updated', found);

  res.json({ request: found });
});

app.post('/api/owner/orders/:id/status', requireOwner, (req, res) => {
  const id = String(req.params.id || '');
  const status = req.body?.status as OrderStatus;
  if (
    status !== 'pending' &&
    status !== 'approved' &&
    status !== 'completed' &&
    status !== 'rejected'
  ) {
    res.status(400).json({ error: 'حالة الطلبية غير صالحة.' });
    return;
  }
  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'الطلبية غير موجودة.' });
    return;
  }
  order.status = status;
  order.updatedAt = new Date().toISOString();
  saveState();

  broadcastOwner('owner:order_updated', order);
  res.json({ order });
});

app.post('/api/owner/orders/mark-gmail-sent', requireOwner, (req, res) => {
  const orderIds = Array.isArray(req.body?.orderIds) ? req.body.orderIds.map(String) : [];
  const recipientEmail = String(req.body?.recipientEmail || '').trim();
  const sentAt = new Date().toISOString();

  const updatedOrders: StoreOrderRecord[] = [];
  for (const order of state.orders) {
    if (orderIds.includes(order.id)) {
      order.gmailSentAt = sentAt;
      if (recipientEmail) order.gmailSentTo = recipientEmail;
      order.updatedAt = sentAt;
      updatedOrders.push(order);
      broadcastOwner('owner:order_updated', order);
    }
  }
  saveState();

  res.json({ updatedOrders });
});

app.patch('/api/owner/messages/:id/read', requireOwner, (req, res) => {
  const id = String(req.params.id || '');
  const msg = state.contactMessages.find((m) => m.id === id);
  if (!msg) {
    res.status(404).json({ error: 'الرسالة غير موجودة.' });
    return;
  }
  msg.read = true;
  saveState();
  res.json({ message: msg });
});

app.delete('/api/owner/messages/:id', requireOwner, (req, res) => {
  const id = String(req.params.id || '');
  state.contactMessages = state.contactMessages.filter((m) => m.id !== id);
  saveState();
  res.json({ contactMessages: state.contactMessages });
});

// =====================================================================
// HTTP Server + WebSocket Upgrade + Vite/Static Serving
// =====================================================================
async function startServer(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const host = request.headers.host || 'localhost';
      const parsedUrl = new URL(request.url || '/', `http://${host}`);
      if (parsedUrl.pathname !== '/ws') {
        socket.destroy();
        return;
      }

      const role = parsedUrl.searchParams.get('role') || 'public';
      const token = parsedUrl.searchParams.get('token') || '';

      if (role === 'owner') {
        if (!isValidOwnerToken(token)) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          ownerSockets.add(ws);
          sendWsJson(ws, { event: 'owner:init', data: buildOwnerOverview() });
          ws.on('close', () => {
            ownerSockets.delete(ws);
          });
          ws.on('error', () => {
            ownerSockets.delete(ws);
          });
        });
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        const meta: PublicSocketMeta = { ws, vipToken: token };
        publicSockets.add(meta);
        if (token) {
          const existingVip = state.vipRequests.find((r) => r.sessionToken === token);
          if (existingVip) {
            sendWsJson(ws, { event: 'vip:status', data: existingVip });
          }
        }
        ws.on('close', () => {
          publicSockets.delete(meta);
        });
        ws.on('error', () => {
          publicSockets.delete(meta);
        });
      });
    } catch {
      socket.destroy();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Skeleton Store server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
