export type CurrencyCode = 'USD' | 'EUR' | 'DZD';

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  DZD: 'دج',
};

export type RadiusStyle = 'sharp' | 'balanced' | 'rounded';

export type ProductSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export const PRODUCT_SIZES: ProductSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const PRODUCT_CATEGORIES = [
  'المعاطف',
  'القمصان',
  'التريكو والبنطلونات',
  'البدلات',
  'الإكسسوارات',
] as const;

export type GarmentCategory = 'tshirts' | 'hoodies' | 'pants' | 'joggers';

export type GarmentSilhouette =
  | 'tshirt-classic'
  | 'tshirt-oversize'
  | 'tshirt-boxy'
  | 'tshirt-longsleeve'
  | 'hoodie-classic'
  | 'hoodie-oversize'
  | 'hoodie-zip'
  | 'hoodie-boxy'
  | 'pants-cargo'
  | 'pants-baggy'
  | 'pants-straight'
  | 'jogger-classic'
  | 'jogger-oversize'
  | 'jogger-cargo';

export interface StudioGarmentOption {
  id: string;
  category: GarmentCategory;
  silhouette: GarmentSilhouette;
  label: string;
  fabricNote: string;
  available: boolean;
  prices: Record<CurrencyCode, number>;
}

export interface StudioColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface SiteDesignConfig {
  brandName: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  borderColor: string;
  radiusStyle: RadiusStyle;
  gridColumns: 2 | 3 | 4;
  defaultCurrency: CurrencyCode;
  contactEmail: string;
  contactPhone: string;
  contactInstagram: string;
  studioColors: StudioColorOption[];
  studioGarments: StudioGarmentOption[];
}

export interface ProductRecord {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  edition: string;
  price: number;
  currency: CurrencyCode;
  lengthCm: number;
  widthCm: number;
  stock: number;
  sizes: ProductSize[];
  fabric: string;
  fit: string;
  image: string;
  description: string;
  createdAt: string;
}

export type CustomGarmentType = string;

export interface CustomLayer {
  id: string;
  side: 'front' | 'back';
  name: string;
  src: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface CustomDesignSpec {
  garmentType: CustomGarmentType;
  garmentLabel?: string;
  silhouette?: GarmentSilhouette;
  withHood?: boolean;
  withAnkleCuffs?: boolean;
  colorId: string;
  colorName: string;
  colorHex: string;
  frontLayerCount: number;
  backLayerCount: number;
  previewImage?: string;
}

export interface CartItem {
  id: string;
  kind: 'catalog' | 'custom';
  productId: string;
  name: string;
  subtitle?: string;
  image: string;
  size: ProductSize;
  quantity: number;
  unitPrice: number;
  currency: CurrencyCode;
  maxStock: number;
  customSpec?: CustomDesignSpec;
}

export type DeliveryMethod = 'post_office' | 'home';

export interface DeliveryRateEntry {
  postOfficePrice: number;
  homePrice: number;
}

export type DeliveryRatesMap = Record<string, DeliveryRateEntry>;

export type VipStatus = 'pending' | 'approved' | 'denied' | 'revoked';

export interface VipCouponRecord {
  code: string;
  description: string;
  discountPercent: number;
  active: boolean;
  createdAt: string;
}

export interface VipRequestRecord {
  id: string;
  sessionToken: string;
  fullName: string;
  couponCode: string;
  note?: string;
  acceptedPolicy: boolean;
  status: VipStatus;
  discountPercent: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export interface OrderItemRecord {
  productId: string;
  name: string;
  kind: 'catalog' | 'custom';
  size: ProductSize;
  quantity: number;
  unitPrice: number;
  currency: CurrencyCode;
  customSpec?: CustomDesignSpec;
}

export interface StoreOrderRecord {
  id: string;
  customerName: string;
  phone: string;
  wilayaCode: string;
  wilayaName: string;
  commune?: string;
  deliveryMethod: DeliveryMethod;
  address: string;
  notes?: string;
  items: OrderItemRecord[];
  currency: CurrencyCode;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  vipSessionToken?: string;
  vipCouponCode?: string;
  status: OrderStatus;
  gmailSentAt?: string;
  gmailSentTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactMessageRecord {
  id: string;
  senderName: string;
  contactInfo: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type OwnerTab =
  | 'products'
  | 'design'
  | 'delivery'
  | 'vip'
  | 'orders'
  | 'gmail'
  | 'messages'
  | 'security';

export interface OwnerOverviewPayload {
  design: SiteDesignConfig;
  products: ProductRecord[];
  deliveryRates: DeliveryRatesMap;
  vipCoupons: VipCouponRecord[];
  vipRequests: VipRequestRecord[];
  orders: StoreOrderRecord[];
  contactMessages: ContactMessageRecord[];
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_LABELS[currency] || currency;
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-US')
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === 'DZD' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}

export function getRadiusClass(radiusStyle: RadiusStyle): string {
  if (radiusStyle === 'balanced') return 'rounded-xl';
  if (radiusStyle === 'rounded') return 'rounded-2xl';
  return 'rounded-none';
}

export function getContrastTextColor(hexColor: string): string {
  const clean = hexColor.replace('#', '');
  if (clean.length !== 6) return '#0D0E10';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#0D0E10' : '#F2ECE0';
}
