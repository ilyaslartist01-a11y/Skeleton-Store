import type {
  GarmentCategory,
  GarmentSilhouette,
  ProductRecord,
  SiteDesignConfig,
  StudioColorOption,
  StudioGarmentOption,
} from '../types.ts';

export const HERO_APPAREL_IMAGE = '/assets/aistudio/IMG_20261114_220710_aa9d7c03.png';

export const PRESET_PRODUCT_IMAGES = [
  { label: 'معطف صوف فاحم', url: '/assets/products/coat-obsidian.svg' },
  { label: 'قميص حريري عاجي', url: '/assets/products/shirt-ivory.svg' },
  { label: 'طقم كشمير وبنطلون', url: '/assets/products/knit-set.svg' },
] as const;

export const DEFAULT_STUDIO_COLORS: StudioColorOption[] = [
  { id: 'obsidian', name: 'أسود فاحم', hex: '#141518' },
  { id: 'ivory', name: 'عاجي ناصع', hex: '#EFECE6' },
  { id: 'smoke', name: 'رمادي دخاني', hex: '#3E424B' },
  { id: 'sand', name: 'بيج رملي', hex: '#C8B89D' },
  { id: 'espresso', name: 'بني إسبريسو', hex: '#3B2B23' },
  { id: 'navy', name: 'كحلي ليلي', hex: '#17223B' },
  { id: 'burgundy', name: 'عنابي ملكي', hex: '#5A1E28' },
  { id: 'forest', name: 'أخضر غامق', hex: '#18362B' },
];

export const GARMENT_CATEGORY_LABELS: Record<GarmentCategory, string> = {
  tshirts: 'تيشيرتات',
  hoodies: 'هوديات',
  pants: 'سراويل',
  joggers: 'جوغرات',
};

export const GARMENT_SILHOUETTE_LABELS: Record<GarmentSilhouette, { category: GarmentCategory; label: string }> = {
  'tshirt-classic': { category: 'tshirts', label: 'تيشيرت كلاسيك' },
  'tshirt-oversize': { category: 'tshirts', label: 'تيشيرت أوفرسايز' },
  'tshirt-boxy': { category: 'tshirts', label: 'تيشيرت بوكسي' },
  'tshirt-longsleeve': { category: 'tshirts', label: 'تيشيرت أكمام طويلة' },
  'hoodie-classic': { category: 'hoodies', label: 'هودي كلاسيك' },
  'hoodie-oversize': { category: 'hoodies', label: 'هودي أوفرسايز' },
  'hoodie-zip': { category: 'hoodies', label: 'هودي بسحاب' },
  'hoodie-boxy': { category: 'hoodies', label: 'هودي بوكسي' },
  'pants-cargo': { category: 'pants', label: 'سروال كارغو' },
  'pants-baggy': { category: 'pants', label: 'سروال باغي' },
  'pants-straight': { category: 'pants', label: 'سروال مستقيم' },
  'jogger-classic': { category: 'joggers', label: 'جوغر كلاسيك' },
  'jogger-oversize': { category: 'joggers', label: 'جوغر أوفرسايز' },
  'jogger-cargo': { category: 'joggers', label: 'جوغر كارغو' },
};

export const DEFAULT_STUDIO_GARMENTS: StudioGarmentOption[] = [
  // T-Shirts
  {
    id: 'custom-tshirt',
    category: 'tshirts',
    silhouette: 'tshirt-classic',
    label: 'تيشيرت كلاسيك',
    fabricNote: 'قطن ممشط 240 جم · قصة عادية متزنة',
    available: true,
    prices: { USD: 45, EUR: 42, DZD: 3800 },
  },
  {
    id: 'tshirt-oversize',
    category: 'tshirts',
    silhouette: 'tshirt-oversize',
    label: 'تيشيرت أوفرسايز',
    fabricNote: 'قطن ثقيل 300 جم · أكتاف منسدلة وقصة واسعة',
    available: true,
    prices: { USD: 52, EUR: 48, DZD: 4500 },
  },
  {
    id: 'tshirt-boxy',
    category: 'tshirts',
    silhouette: 'tshirt-boxy',
    label: 'تيشيرت بوكسي (Boxy)',
    fabricNote: 'قطن سميك 290 جم · قصة عريضة بطول متوسط',
    available: true,
    prices: { USD: 50, EUR: 46, DZD: 4300 },
  },
  {
    id: 'tshirt-longsleeve',
    category: 'tshirts',
    silhouette: 'tshirt-longsleeve',
    label: 'تيشيرت أكمام طويلة',
    fabricNote: 'قطن ثقيل 260 جم · أكمام كاملة بأساور',
    available: true,
    prices: { USD: 56, EUR: 52, DZD: 4800 },
  },
  // Hoodies
  {
    id: 'custom-hoodie',
    category: 'hoodies',
    silhouette: 'hoodie-classic',
    label: 'هودي كلاسيك',
    fabricNote: 'صوف قطني 460 جم · بقبعة مبطنة وجيب أمامي',
    available: true,
    prices: { USD: 75, EUR: 70, DZD: 6800 },
  },
  {
    id: 'hoodie-oversize',
    category: 'hoodies',
    silhouette: 'hoodie-oversize',
    label: 'هودي أوفرسايز',
    fabricNote: 'فليس ثقيل 520 جم · أكتاف منسدلة وقصة فضفاضة',
    available: true,
    prices: { USD: 84, EUR: 78, DZD: 7600 },
  },
  {
    id: 'hoodie-zip',
    category: 'hoodies',
    silhouette: 'hoodie-zip',
    label: 'هودي بسحاب (Zip-Up)',
    fabricNote: 'قطن فليس 480 جم · سحاب كامل وجيوب جانبية',
    available: true,
    prices: { USD: 82, EUR: 76, DZD: 7400 },
  },
  {
    id: 'hoodie-boxy',
    category: 'hoodies',
    silhouette: 'hoodie-boxy',
    label: 'هودي بوكسي (Boxy)',
    fabricNote: 'فليس سميك 500 جم · قصة قصيرة عريضة',
    available: true,
    prices: { USD: 80, EUR: 74, DZD: 7200 },
  },
  // Pants
  {
    id: 'pants-cargo',
    category: 'pants',
    silhouette: 'pants-cargo',
    label: 'سروال كارغو (Cargo)',
    fabricNote: 'قماش تويل متين · جيوب جانبية بارزة',
    available: true,
    prices: { USD: 72, EUR: 67, DZD: 6400 },
  },
  {
    id: 'pants-baggy',
    category: 'pants',
    silhouette: 'pants-baggy',
    label: 'سروال باغي (Baggy)',
    fabricNote: 'قطن ثقيل · أرجل واسعة بانسيابية ستريت وير',
    available: true,
    prices: { USD: 68, EUR: 63, DZD: 5900 },
  },
  {
    id: 'pants-straight',
    category: 'pants',
    silhouette: 'pants-straight',
    label: 'سروال مستقيم (Straight)',
    fabricNote: 'قطن ممزوج · قصة مستقيمة متزنة',
    available: true,
    prices: { USD: 65, EUR: 60, DZD: 5600 },
  },
  // Joggers
  {
    id: 'jogger-classic',
    category: 'joggers',
    silhouette: 'jogger-classic',
    label: 'جوغر كلاسيك',
    fabricNote: 'فليس قطني 380 جم · خصر مطاطي وأساور سفلية',
    available: true,
    prices: { USD: 58, EUR: 54, DZD: 4900 },
  },
  {
    id: 'jogger-oversize',
    category: 'joggers',
    silhouette: 'jogger-oversize',
    label: 'جوغر أوفرسايز',
    fabricNote: 'فليس ثقيل 440 جم · قصة واسعة مريحة',
    available: true,
    prices: { USD: 64, EUR: 59, DZD: 5400 },
  },
  {
    id: 'jogger-cargo',
    category: 'joggers',
    silhouette: 'jogger-cargo',
    label: 'جوغر كارغو',
    fabricNote: 'قطن مرن 400 جم · جيوب جانبية وأساور كاحل',
    available: true,
    prices: { USD: 66, EUR: 61, DZD: 5700 },
  },
];

export const DEFAULT_SITE_DESIGN: SiteDesignConfig = {
  brandName: 'Skeleton Store',
  heroEyebrow: 'دار الأزياء الخاصة · تشكيلة حصرية',
  heroTitle: 'ملابس مفصلة بعناية وإصدارات محدودة',
  heroSubtitle: 'مجموعة أزياء مختارة بعناية وبتصميمك الشخصي حسب طلبك وذوقك.',
  heroImage: HERO_APPAREL_IMAGE,
  bgColor: '#141812',
  surfaceColor: '#1E241A',
  textColor: '#F2ECE0',
  mutedColor: '#B0B5A6',
  accentColor: '#6BB83B',
  borderColor: '#34402C',
  radiusStyle: 'sharp',
  gridColumns: 3,
  defaultCurrency: 'USD',
  contactEmail: '',
  contactPhone: '',
  contactInstagram: '',
  studioColors: DEFAULT_STUDIO_COLORS,
  studioGarments: DEFAULT_STUDIO_GARMENTS,
};

export const STORE_PRODUCTS: ProductRecord[] = [
  {
    id: 'prod-obsidian-coat',
    name: 'معطف صوف فاحم',
    subtitle: 'صوف إيطالي مزدوج الوجه · إصدار 01',
    category: 'المعاطف',
    edition: 'إصدار محدود · 12 قطعة',
    price: 1850,
    currency: 'USD',
    lengthCm: 118,
    widthCm: 58,
    stock: 12,
    sizes: ['S', 'M', 'L', 'XL'],
    fabric: 'صوف ميرينو بكر 100% ببطانة حريرية ناعمة',
    fit: 'قصة معمارية منظمة بأكتاف متوازنة',
    image: '/assets/products/coat-obsidian.svg',
    description:
      'معطف طويل مفصل بدقة عالية من الصوف الفاحم، يتميز بياقة منحوتة وأزرار قرن طبيعي وجيوب مخفية تمنح حضوراً هادئاً وفخامة متزنة.',
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'prod-ivory-shirt',
    name: 'قميص حريري عاجي',
    subtitle: 'حرير التوت الطبيعي · إصدار 02',
    category: 'القمصان',
    edition: 'إصدار خاص · 18 قطعة',
    price: 690,
    currency: 'USD',
    lengthCm: 76,
    widthCm: 54,
    stock: 18,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    fabric: 'حرير توت 24 موم فائق النعومة',
    fit: 'قصة مريحة بانسيابية متدرجة',
    image: '/assets/products/shirt-ivory.svg',
    description:
      'قميص عاجي منسوج من الحرير الطبيعي الخالص بأزرار صدفية مخفية وياقة متقنة، مناسب للإطلالات الرسمية والأمسيات الخاصة.',
    createdAt: '2026-11-02T10:00:00.000Z',
  },
  {
    id: 'prod-cashmere-set',
    name: 'طقم كنزة كشمير وسروال',
    subtitle: 'كشمير خالص ومخمل صوفي · إصدار 03',
    category: 'التريكو والبنطلونات',
    edition: 'مجموعة الخريف · 9 قطع',
    price: 1240,
    currency: 'USD',
    lengthCm: 72,
    widthCm: 56,
    stock: 9,
    sizes: ['S', 'M', 'L', 'XL'],
    fabric: 'كشمير منغولي ممزوج بصوف ناعم',
    fit: 'قصة متناسقة مريحة للارتداء اليومي الراقي',
    image: '/assets/products/knit-set.svg',
    description:
      'طقم متكامل يجمع بين كنزة محبوكة بغرزة دقيقة وسروال بقصة مستقيمة متزنة، يمنح دفئاً فاخراً وملمساً ناعماً يدوم طويلاً.',
    createdAt: '2026-11-03T10:00:00.000Z',
  },
];

export function resolveGarmentSilhouette(
  garmentType: string,
  studioGarments?: StudioGarmentOption[]
): GarmentSilhouette {
  const fromStudio = studioGarments?.find((g) => g.id === garmentType);
  if (fromStudio) return fromStudio.silhouette;
  const fromDefault = DEFAULT_STUDIO_GARMENTS.find((g) => g.id === garmentType);
  if (fromDefault) return fromDefault.silhouette;
  if (garmentType in GARMENT_SILHOUETTE_LABELS) {
    return garmentType as GarmentSilhouette;
  }
  return 'tshirt-classic';
}

export const CUSTOM_GARMENT_PRICING: Record<
  string,
  { label: string; fabricNote: string; prices: { USD: number; EUR: number; DZD: number } }
> = Object.fromEntries(
  DEFAULT_STUDIO_GARMENTS.map((g) => [
    g.id,
    { label: g.label, fabricNote: g.fabricNote, prices: g.prices },
  ])
);
