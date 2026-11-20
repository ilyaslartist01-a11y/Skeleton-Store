import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Home,
  Minus,
  MoreVertical,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { ALGERIA_WILAYAS, findWilayaByCode } from '../data/algeriaWilayas.ts';
import {
  formatMoney,
  getContrastTextColor,
  getRadiusClass,
  type CartItem,
  type CurrencyCode,
  type DeliveryMethod,
  type DeliveryRatesMap,
  type OwnerTab,
  type ProductRecord,
  type ProductSize,
  type SiteDesignConfig,
  type StoreOrderRecord,
  type VipRequestRecord,
} from '../types.ts';
import { readHeroImageFile } from '../utils/imageUpload.ts';

interface StorefrontProps {
  design: SiteDesignConfig;
  products: ProductRecord[];
  deliveryRates: DeliveryRatesMap;
  cart: CartItem[];
  vipSession: VipRequestRecord | null;
  recentOrders: StoreOrderRecord[];
  isOwnerAuthenticated: boolean;
  ownerToken: string;
  onAddToCart: (item: CartItem) => void;
  onUpdateCartQuantity: (id: string, delta: number) => void;
  onRemoveCartItem: (id: string) => void;
  onOrderCreated: (order: StoreOrderRecord, updatedProducts: ProductRecord[]) => void;
  onDesignUpdated: (design: SiteDesignConfig) => void;
  onDeliveryRatesUpdated: (rates: DeliveryRatesMap) => void;
  onOpenCustomStudio: () => void;
  onOpenVipModal: () => void;
  onOpenContactModal: () => void;
  onOpenPrivacyModal: () => void;
  onOpenOwnerPortal: (tab?: OwnerTab) => void;
  onOpenOwnerAddProduct: () => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  design,
  products,
  deliveryRates,
  cart,
  vipSession,
  recentOrders,
  isOwnerAuthenticated,
  ownerToken,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onOrderCreated,
  onDesignUpdated,
  onDeliveryRatesUpdated,
  onOpenCustomStudio,
  onOpenVipModal,
  onOpenContactModal,
  onOpenPrivacyModal,
  onOpenOwnerPortal,
  onOpenOwnerAddProduct,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedSizes, setSelectedSizes] = useState<Record<string, ProductSize>>({});
  const [detailProduct, setDetailProduct] = useState<ProductRecord | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  // Checkout state
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilayaCode, setWilayaCode] = useState('16');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('post_office');
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Owner quick delivery rate editor in cart
  const [editingCartDelivery, setEditingCartDelivery] = useState(false);
  const [editPostPrice, setEditPostPrice] = useState('');
  const [editHomePrice, setEditHomePrice] = useState('');
  const [savingCartDelivery, setSavingCartDelivery] = useState(false);

  useEffect(() => {
    setHeroImgError(false);
  }, [design.heroImage]);

  useEffect(() => {
    if (vipSession?.fullName && !customerName) {
      setCustomerName(vipSession.fullName);
    }
  }, [vipSession?.fullName, customerName]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['الكل', ...unique];
  }, [products]);

  useEffect(() => {
    if (selectedCategory !== 'الكل' && !categories.includes(selectedCategory)) {
      setSelectedCategory('الكل');
    }
  }, [categories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'الكل') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const totalCartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const activeOrderCurrency: CurrencyCode =
    cart[0]?.currency || design.defaultCurrency;

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  const vipDiscountPercent =
    vipSession?.status === 'approved' ? vipSession.discountPercent : 0;
  const discountAmount =
    Math.round(((subtotal * vipDiscountPercent) / 100) * 100) / 100;

  const currentWilayaRate = deliveryRates[wilayaCode] || {
    postOfficePrice: 500,
    homePrice: 750,
  };
  const deliveryFee =
    cart.length === 0
      ? 0
      : deliveryMethod === 'post_office'
        ? currentWilayaRate.postOfficePrice
        : currentWilayaRate.homePrice;
  const finalTotal = Math.max(0, Math.round((subtotal - discountAmount + deliveryFee) * 100) / 100);

  const radiusClass = getRadiusClass(design.radiusStyle);
  const accentText = getContrastTextColor(design.accentColor);

  const gridColsClass =
    design.gridColumns === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : design.gridColumns === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const getProductSelectedSize = (product: ProductRecord): ProductSize => {
    const chosen = selectedSizes[product.id];
    if (chosen && product.sizes.includes(chosen)) return chosen;
    return product.sizes[0] || 'M';
  };

  const handleAddCatalogProduct = (product: ProductRecord) => {
    if (product.stock <= 0) return;
    const size = getProductSelectedSize(product);
    onAddToCart({
      id: `${product.id}-${size}`,
      kind: 'catalog',
      productId: product.id,
      name: product.name,
      subtitle: product.subtitle,
      image: product.image,
      size,
      quantity: 1,
      unitPrice: product.price,
      currency: product.currency,
      maxStock: product.stock,
    });
    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId((curr) => (curr === product.id ? null : curr)), 1200);
  };

  const handleOwnerHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !ownerToken) return;
    setUploadingHero(true);
    try {
      const heroImage = await readHeroImageFile(file);
      const res = await fetch('/api/owner/hero-image', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({ heroImage }),
      });
      const data = await res.json();
      if (res.ok && data.design) {
        onDesignUpdated(data.design);
      }
    } finally {
      setUploadingHero(false);
    }
  };

  const openQuickRateEditor = () => {
    setEditPostPrice(String(currentWilayaRate.postOfficePrice));
    setEditHomePrice(String(currentWilayaRate.homePrice));
    setEditingCartDelivery(true);
  };

  const saveQuickWilayaRate = async () => {
    if (!ownerToken) return;
    setSavingCartDelivery(true);
    try {
      const nextRates: DeliveryRatesMap = {
        ...deliveryRates,
        [wilayaCode]: {
          postOfficePrice: Math.max(0, Number(editPostPrice) || 0),
          homePrice: Math.max(0, Number(editHomePrice) || 0),
        },
      };
      const res = await fetch('/api/owner/delivery-rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({ deliveryRates: nextRates }),
      });
      const data = await res.json();
      if (res.ok && data.deliveryRates) {
        onDeliveryRatesUpdated(data.deliveryRates);
        setEditingCartDelivery(false);
      }
    } finally {
      setSavingCartDelivery(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');
    setSubmittingOrder(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (vipSession?.sessionToken) {
        headers['x-vip-token'] = vipSession.sessionToken;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName,
          phone,
          wilayaCode,
          commune,
          deliveryMethod,
          address,
          notes,
          items: cart.map((item) => ({
            productId: item.productId,
            kind: item.kind,
            size: item.size,
            quantity: item.quantity,
            customSpec: item.customSpec,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر إرسال الطلبية.');
      }
      onOrderCreated(data.order, data.products);
      setCartOpen(false);
      setNotes('');
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'حدث خطأ أثناء إتمام الطلب.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{ backgroundColor: design.bgColor, color: design.textColor }}
    >
      {/* Sticky Header - Strict 3 Zones */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: `${design.bgColor}EE`,
          borderColor: design.borderColor,
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Brand Wordmark */}
          <a href="#top" className="shrink-0 whitespace-nowrap">
            <span className="minecraft-wordmark text-sm sm:text-base">{design.brandName}</span>
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <a
              href="#collection"
              className="whitespace-nowrap shrink-0 transition-opacity hover:opacity-80"
              style={{ color: design.textColor }}
            >
              تشكيلة الملابس
            </a>
            <a
              href="#craft"
              className="whitespace-nowrap shrink-0 transition-opacity hover:opacity-80"
              style={{ color: design.textColor }}
            >
              الأقمشة والتفصيل
            </a>
            <button
              type="button"
              onClick={onOpenPrivacyModal}
              className="whitespace-nowrap shrink-0 transition-opacity hover:opacity-80"
              style={{ color: design.mutedColor }}
            >
              سياسة الخصوصية
            </button>
          </nav>

          {/* Zone 3: Bag CTA + Menu */}
          <div className="relative flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="mc-btn flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0"
              style={{ backgroundColor: design.accentColor, color: accentText }}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="tabular-nums">الحقيبة ({totalCartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="mc-btn-sm p-2"
              style={{ backgroundColor: design.surfaceColor, color: design.textColor }}
              aria-label="القائمة"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className={`absolute left-0 top-12 z-40 w-60 border p-2 shadow-2xl ${radiusClass}`}
                  style={{
                    backgroundColor: design.surfaceColor,
                    borderColor: design.borderColor,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenVipModal();
                    }}
                    className="block w-full px-3 py-2.5 text-right text-sm transition-colors hover:bg-white/5"
                    style={{
                      color:
                        vipSession?.status === 'approved'
                          ? design.accentColor
                          : design.textColor,
                    }}
                  >
                    {vipSession?.status === 'approved'
                      ? 'عضوية المقربين مفعلة'
                      : 'كوبون الزوار المقربين'}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenContactModal();
                    }}
                    className="block w-full px-3 py-2.5 text-right text-sm transition-colors hover:bg-white/5"
                  >
                    التواصل معي
                  </button>

                  <div
                    className="my-1 border-t md:hidden"
                    style={{ borderColor: design.borderColor }}
                  />

                  <a
                    href="#collection"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block w-full px-3 py-2.5 text-right text-sm transition-colors hover:bg-white/5 md:hidden"
                  >
                    تشكيلة الملابس
                  </a>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenPrivacyModal();
                    }}
                    className="block w-full px-3 py-2.5 text-right text-sm transition-colors hover:bg-white/5 md:hidden"
                  >
                    سياسة الخصوصية
                  </button>

                  {isOwnerAuthenticated && (
                    <>
                      <div
                        className="my-1.5 border-t"
                        style={{ borderColor: design.borderColor }}
                      />
                      <div
                        className="px-3 py-1 text-[11px] font-semibold"
                        style={{ color: design.accentColor }}
                      >
                        أدوات المالك السريعة
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenOwnerAddProduct();
                        }}
                        className="block w-full px-3 py-2 text-right text-xs hover:bg-white/5"
                      >
                        إضافة ملابس
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenOwnerPortal('design');
                        }}
                        className="block w-full px-3 py-2 text-right text-xs hover:bg-white/5"
                      >
                        الديزاين
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenOwnerPortal('delivery');
                        }}
                        className="block w-full px-3 py-2 text-right text-xs hover:bg-white/5"
                      >
                        أسعار التوصيل (69)
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenOwnerPortal('orders');
                        }}
                        className="block w-full px-3 py-2 text-right text-xs font-semibold hover:bg-white/5"
                        style={{ color: design.accentColor }}
                      >
                        الإدارة
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Right 5 Columns: Editorial Text & CTAs */}
          <div className="lg:col-span-5 space-y-5">
            <div className="text-xs sm:text-sm font-medium" style={{ color: design.accentColor }}>
              {design.heroEyebrow}
              {vipSession?.status === 'approved' && (
                <span style={{ color: design.textColor }}>
                  {' '}
                  · عضو مقرب ({vipSession.fullName})
                </span>
              )}
            </div>

            <h1
              className="font-display text-3xl sm:text-5xl font-bold leading-[1.2]"
              style={{ textWrap: 'balance' }}
            >
              {design.heroTitle}
            </h1>

            <p className="max-w-xl text-sm sm:text-base leading-relaxed" style={{ color: design.mutedColor }}>
              {design.heroSubtitle}
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:max-w-sm">
              <a
                href="#collection"
                className="mc-btn flex items-center justify-center px-6 py-3.5 text-sm font-bold"
                style={{ backgroundColor: design.accentColor, color: accentText }}
              >
                تصفح تشكيلة الملابس
              </a>

              <button
                type="button"
                onClick={onOpenCustomStudio}
                className="mc-btn flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold"
                style={{
                  backgroundColor: design.surfaceColor,
                  color: design.textColor,
                }}
              >
                <Sparkles className="h-4 w-4" style={{ color: design.accentColor }} />
                <span>صمّم تيشيرتك أو الهودي الخاص بك</span>
              </button>
            </div>
          </div>

          {/* Left 7 Columns: Hero Image Frame */}
          <div className="lg:col-span-7">
            <div
              className={`relative overflow-hidden border ${radiusClass}`}
              style={{
                backgroundColor: design.surfaceColor,
                borderColor: design.borderColor,
              }}
            >
              {!heroImgError && design.heroImage ? (
                <img
                  src={design.heroImage}
                  alt={design.brandName}
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="aspect-[4/3] w-full object-cover object-[50%_54%] lg:h-[560px]"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center p-8 text-center lg:h-[560px]">
                  <span className="minecraft-wordmark text-xl sm:text-2xl">
                    {design.brandName}
                  </span>
                </div>
              )}

              {isOwnerAuthenticated && (
                <label
                  className="mc-btn-sm absolute bottom-3 left-3 inline-flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: design.surfaceColor,
                    color: design.textColor,
                  }}
                >
                  <Camera className="h-3.5 w-3.5" style={{ color: design.accentColor }} />
                  <span>{uploadingHero ? 'جاري الرفع...' : 'تغيير الصورة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleOwnerHeroUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Seasonal Collection Section */}
      <section
        id="collection"
        className="mx-auto max-w-7xl border-t px-4 sm:px-6 py-12 sm:py-16"
        style={{ borderColor: design.borderColor }}
      >
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl sm:text-4xl font-bold">المجموعة الموسمية</h2>
            <p className="mt-1.5 text-sm" style={{ color: design.mutedColor }}>
              قطع مختارة بأقمشة أصلية ومقاسات موثقة بالسنتيمتر.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="mc-btn-sm px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0"
                  style={{
                    backgroundColor: active ? design.accentColor : design.surfaceColor,
                    color: active ? accentText : design.textColor,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div
            className={`border p-10 text-center text-sm ${radiusClass}`}
            style={{
              backgroundColor: design.surfaceColor,
              borderColor: design.borderColor,
              color: design.mutedColor,
            }}
          >
            لا توجد قطع متاحة ضمن هذه الفئة حالياً.
          </div>
        ) : (
          <div className={`grid gap-6 ${gridColsClass}`}>
            {filteredProducts.map((product) => {
              const chosenSize = getProductSelectedSize(product);
              const outOfStock = product.stock <= 0;
              const isJustAdded = justAddedId === product.id;

              return (
                <article
                  key={product.id}
                  className={`flex flex-col border transition-transform duration-150 hover:-translate-y-0.5 ${radiusClass}`}
                  style={{
                    backgroundColor: design.surfaceColor,
                    borderColor: design.borderColor,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setDetailProduct(product)}
                    className="block w-full overflow-hidden border-b text-right"
                    style={{ borderColor: design.borderColor }}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="aspect-[4/5] w-full object-cover"
                    />
                  </button>

                  <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                    <div className="space-y-2">
                      <div
                        className="flex flex-wrap items-center gap-1.5 text-xs"
                        style={{ color: design.mutedColor }}
                      >
                        <span>{product.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{product.edition}</span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold">{product.name}</h3>

                      <p
                        className="line-clamp-2 text-xs sm:text-sm leading-relaxed"
                        style={{ color: design.mutedColor }}
                      >
                        {product.description || product.subtitle}
                      </p>

                      <div
                        className="pt-1 font-mono text-xs tabular-nums"
                        style={{ color: design.mutedColor }}
                      >
                        الطول: {product.lengthCm} سم · العرض: {product.widthCm} سم · المتوفر:{' '}
                        {product.stock}
                      </div>
                    </div>

                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {product.sizes.map((size) => {
                          const active = chosenSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() =>
                                setSelectedSizes((prev) => ({ ...prev, [product.id]: size }))
                              }
                              className="mc-btn-sm px-2.5 py-1 font-mono text-xs font-semibold"
                              style={{
                                backgroundColor: active ? design.accentColor : design.bgColor,
                                color: active ? accentText : design.textColor,
                              }}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>

                      <div
                        className="flex items-center justify-between gap-3 border-t pt-3"
                        style={{ borderColor: design.borderColor }}
                      >
                        <div className="font-mono text-base font-bold tabular-nums">
                          {formatMoney(product.price, product.currency)}
                        </div>

                        <button
                          type="button"
                          disabled={outOfStock}
                          onClick={() => handleAddCatalogProduct(product)}
                          className="mc-btn px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0"
                          style={{
                            backgroundColor: outOfStock ? design.bgColor : design.accentColor,
                            color: outOfStock ? design.mutedColor : accentText,
                          }}
                        >
                          {outOfStock
                            ? 'نفدت الكمية'
                            : isJustAdded
                              ? 'تمت الإضافة ✓'
                              : 'أضف إلى الحقيبة'}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Craftsmanship & Benefits Section */}
      <section
        id="craft"
        className="mx-auto max-w-7xl border-t px-4 sm:px-6 py-12 sm:py-16"
        style={{ borderColor: design.borderColor }}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div
            className={`border p-6 ${radiusClass}`}
            style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
          >
            <h3 className="mb-2 text-base font-bold" style={{ color: design.accentColor }}>
              01. أقمشة بجودة عالية
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
              نختار قماش عالي الجودة يعزز ثقتكم بمنتوجاتنا.
            </p>
          </div>

          <div
            className={`border p-6 ${radiusClass}`}
            style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
          >
            <h3 className="mb-2 text-base font-bold" style={{ color: design.accentColor }}>
              02. مقاسات دقيقة ومفصلة
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
              تأتي كل قطعة ببيانات واضحة للطول والعرض والمقاسات المتاحة لتسهيل اختيار القياس الدقيق.
            </p>
          </div>

          <div
            className={`border p-6 ${radiusClass}`}
            style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
          >
            <h3 className="mb-2 text-base font-bold" style={{ color: design.accentColor }}>
              03. امتيازات الزوار المقربين
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
              يمكن لحاملي كوبونات الزوار المقربين تسجيل أسمائهم للاستفادة من الخصومات الخاصة عند الشراء.
            </p>
          </div>
        </div>
      </section>

      {/* Recent Session Orders */}
      {recentOrders.length > 0 && (
        <section
          className="mx-auto max-w-7xl border-t px-4 sm:px-6 py-10"
          style={{ borderColor: design.borderColor }}
        >
          <h2 className="mb-4 text-lg font-bold">طلبيات الجلسة الحالية</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className={`border p-4 space-y-2 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold" style={{ color: design.accentColor }}>
                    #{order.id}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: design.accentColor }}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>تم الاستلام</span>
                  </span>
                </div>
                <div className="text-xs" style={{ color: design.mutedColor }}>
                  القطع: {order.items.map((i) => `${i.name} (${i.size} × ${i.quantity})`).join('، ')}
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span style={{ color: design.mutedColor }}>
                    {order.wilayaCode} — {order.wilayaName} ·{' '}
                    {order.deliveryMethod === 'post_office' ? 'المكتب البريدي' : 'التوصيل للمنزل'}
                  </span>
                  <span className="font-mono font-bold tabular-nums">
                    {formatMoney(order.total, order.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clean Visitor Footer (No Admin Links) */}
      <footer
        className="border-t px-4 sm:px-6 py-8"
        style={{ borderColor: design.borderColor }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2" style={{ color: design.mutedColor }}>
            <span>© 2026</span>
            <span className="minecraft-wordmark-sm text-xs">{design.brandName}</span>
            <span>· متجر الأزياء</span>
          </div>
          <button
            type="button"
            onClick={onOpenPrivacyModal}
            className="underline transition-opacity hover:opacity-80"
            style={{ color: design.mutedColor }}
          >
            سياسة الخصوصية
          </button>
        </div>
      </footer>

      {/* Product Detail Modal */}
      {detailProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setDetailProduct(null)}
        >
          <div
            className={`w-full max-w-3xl overflow-hidden border shadow-2xl ${radiusClass}`}
            style={{
              backgroundColor: design.surfaceColor,
              color: design.textColor,
              borderColor: design.borderColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="border-b md:border-b-0 md:border-l" style={{ borderColor: design.borderColor }}>
                <img
                  src={detailProduct.image}
                  alt={detailProduct.name}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/5] h-full w-full object-cover"
                />
              </div>

              <div className="flex flex-col justify-between p-6 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs" style={{ color: design.mutedColor }}>
                        {detailProduct.category} · {detailProduct.edition}
                      </div>
                      <h3 className="mt-1 text-xl font-bold">{detailProduct.name}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailProduct(null)}
                      className="mc-btn-sm p-2"
                      style={{ backgroundColor: design.bgColor, color: design.textColor }}
                      aria-label="إغلاق"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
                    {detailProduct.description}
                  </p>

                  <div
                    className={`space-y-2 border p-3.5 text-xs ${radiusClass}`}
                    style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                  >
                    <div>
                      <span style={{ color: design.mutedColor }}>القماش: </span>
                      <span>{detailProduct.fabric}</span>
                    </div>
                    <div>
                      <span style={{ color: design.mutedColor }}>القصّة: </span>
                      <span>{detailProduct.fit}</span>
                    </div>
                    <div className="font-mono tabular-nums">
                      <span style={{ color: design.mutedColor }}>الأبعاد: </span>
                      <span>
                        الطول {detailProduct.lengthCm} سم × العرض {detailProduct.widthCm} سم
                      </span>
                    </div>
                    <div className="font-mono tabular-nums">
                      <span style={{ color: design.mutedColor }}>المخزون المتاح: </span>
                      <span>{detailProduct.stock} قطعة</span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold" style={{ color: design.mutedColor }}>
                      اختر المقاس:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailProduct.sizes.map((size) => {
                        const active = getProductSelectedSize(detailProduct) === size;
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() =>
                              setSelectedSizes((prev) => ({
                                ...prev,
                                [detailProduct.id]: size,
                              }))
                            }
                            className="mc-btn-sm px-3.5 py-1.5 font-mono text-xs font-bold"
                            style={{
                              backgroundColor: active ? design.accentColor : design.bgColor,
                              color: active ? accentText : design.textColor,
                            }}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between border-t pt-4"
                  style={{ borderColor: design.borderColor }}
                >
                  <div className="font-mono text-lg font-bold tabular-nums">
                    {formatMoney(detailProduct.price, detailProduct.currency)}
                  </div>
                  <button
                    type="button"
                    disabled={detailProduct.stock <= 0}
                    onClick={() => {
                      handleAddCatalogProduct(detailProduct);
                      setDetailProduct(null);
                      setCartOpen(true);
                    }}
                    className="mc-btn px-5 py-2.5 text-sm font-bold"
                    style={{
                      backgroundColor:
                        detailProduct.stock <= 0 ? design.bgColor : design.accentColor,
                      color: detailProduct.stock <= 0 ? design.mutedColor : accentText,
                    }}
                  >
                    {detailProduct.stock <= 0 ? 'نفدت الكمية' : 'أضف إلى الحقيبة'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Cart & Checkout Drawer */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs"
          onClick={() => setCartOpen(false)}
        >
          <aside
            className="flex h-full w-full max-w-lg flex-col border-r shadow-2xl"
            style={{
              backgroundColor: design.surfaceColor,
              color: design.textColor,
              borderColor: design.borderColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: design.borderColor }}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5" style={{ color: design.accentColor }} />
                <h2 className="text-base font-bold">حقيبة المشتريات ({totalCartCount})</h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="mc-btn-sm p-2"
                style={{ backgroundColor: design.bgColor, color: design.textColor }}
                aria-label="إغلاق الحقيبة"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {cart.length === 0 ? (
                <div
                  className={`border p-8 text-center text-sm ${radiusClass}`}
                  style={{
                    backgroundColor: design.bgColor,
                    borderColor: design.borderColor,
                    color: design.mutedColor,
                  }}
                >
                  حقيبتك فارغة حالياً. أضف قطعاً من التشكيلة أو صمّم قطعة خاصة بك.
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className={`flex gap-3 border p-3 ${radiusClass}`}
                        style={{
                          backgroundColor: design.bgColor,
                          borderColor: design.borderColor,
                        }}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="h-20 w-16 shrink-0 border object-cover"
                          style={{ borderColor: design.borderColor }}
                        />
                        <div className="flex flex-1 flex-col justify-between min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold">{item.name}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: design.mutedColor }}>
                                <span>المقاس: {item.size}</span>
                                {item.customSpec && (
                                  <>
                                    <span className="inline-flex items-center gap-1">
                                      <span
                                        className="inline-block h-2.5 w-2.5 border border-white/30"
                                        style={{ backgroundColor: item.customSpec.colorHex }}
                                      />
                                      <span>{item.customSpec.colorName}</span>
                                    </span>
                                    <span>
                                      (أمام: {item.customSpec.frontLayerCount} / خلف:{' '}
                                      {item.customSpec.backLayerCount}
                                      {item.customSpec.withHood === false ? ' · بدون قبعة' : ''}
                                      {item.customSpec.withAnkleCuffs === false
                                        ? ' · بدون مطاط قدمين'
                                        : item.customSpec.withAnkleCuffs === true
                                          ? ' · بمطاط قدمين'
                                          : ''}
                                      )
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveCartItem(item.id)}
                              className="text-red-400 hover:text-red-300"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onUpdateCartQuantity(item.id, -1)}
                                className="mc-btn-sm p-1"
                                style={{
                                  backgroundColor: design.surfaceColor,
                                  color: design.textColor,
                                }}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-7 text-center font-mono text-xs font-bold tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={item.quantity >= Math.min(20, item.maxStock)}
                                onClick={() => onUpdateCartQuantity(item.id, 1)}
                                className="mc-btn-sm p-1"
                                style={{
                                  backgroundColor: design.surfaceColor,
                                  color: design.textColor,
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="font-mono text-sm font-bold tabular-nums">
                              {formatMoney(item.unitPrice * item.quantity, item.currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Checkout Form */}
                  <form onSubmit={handleCheckoutSubmit} className="space-y-4 border-t pt-4" style={{ borderColor: design.borderColor }}>
                    <h3 className="text-sm font-bold">بيانات الشحن وإتمام الطلب</h3>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                          الاسم الكامل *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="الاسم واللقب"
                          className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                          style={{
                            backgroundColor: design.bgColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                          رقم الهاتف للتواصل *
                        </label>
                        <input
                          type="tel"
                          required
                          dir="ltr"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0550 00 00 00"
                          className={`w-full border px-3 py-2 font-mono text-sm outline-none ${radiusClass}`}
                          style={{
                            backgroundColor: design.bgColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                        الولاية (69 ولاية جزائرية) *
                      </label>
                      <select
                        value={wilayaCode}
                        onChange={(e) => setWilayaCode(e.target.value)}
                        className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                        style={{
                          backgroundColor: design.bgColor,
                          color: design.textColor,
                          borderColor: design.borderColor,
                        }}
                      >
                        {ALGERIA_WILAYAS.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.code} — {w.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs" style={{ color: design.mutedColor }}>
                          طريقة التوصيل *
                        </span>
                        {isOwnerAuthenticated && (
                          <button
                            type="button"
                            onClick={openQuickRateEditor}
                            className="text-[11px] underline"
                            style={{ color: design.accentColor }}
                          >
                            تغيير سعر التوصيل
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('post_office')}
                          className="mc-btn p-3 text-right"
                          style={{
                            backgroundColor:
                              deliveryMethod === 'post_office' ? design.accentColor : design.bgColor,
                            color:
                              deliveryMethod === 'post_office' ? accentText : design.textColor,
                          }}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            <Package className="h-3.5 w-3.5" />
                            <span>المكتب البريدي</span>
                          </div>
                          <div className="mt-1 font-mono text-xs tabular-nums">
                            {formatMoney(currentWilayaRate.postOfficePrice, activeOrderCurrency)}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeliveryMethod('home')}
                          className="mc-btn p-3 text-right"
                          style={{
                            backgroundColor:
                              deliveryMethod === 'home' ? design.accentColor : design.bgColor,
                            color: deliveryMethod === 'home' ? accentText : design.textColor,
                          }}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            <Home className="h-3.5 w-3.5" />
                            <span>التوصيل للمنزل</span>
                          </div>
                          <div className="mt-1 font-mono text-xs tabular-nums">
                            {formatMoney(currentWilayaRate.homePrice, activeOrderCurrency)}
                          </div>
                        </button>
                      </div>

                      {isOwnerAuthenticated && editingCartDelivery && (
                        <div
                          className={`mt-2.5 space-y-2 border p-3 ${radiusClass}`}
                          style={{
                            backgroundColor: design.bgColor,
                            borderColor: design.accentColor,
                          }}
                        >
                          <div className="text-xs font-semibold" style={{ color: design.accentColor }}>
                            تعديل تسعيرة {findWilayaByCode(wilayaCode)?.nameAr} ({wilayaCode})
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              min={0}
                              value={editPostPrice}
                              onChange={(e) => setEditPostPrice(e.target.value)}
                              placeholder="سعر المكتب"
                              className="border px-2 py-1.5 font-mono text-xs"
                              style={{
                                backgroundColor: design.surfaceColor,
                                color: design.textColor,
                                borderColor: design.borderColor,
                              }}
                            />
                            <input
                              type="number"
                              min={0}
                              value={editHomePrice}
                              onChange={(e) => setEditHomePrice(e.target.value)}
                              placeholder="سعر المنزل"
                              className="border px-2 py-1.5 font-mono text-xs"
                              style={{
                                backgroundColor: design.surfaceColor,
                                color: design.textColor,
                                borderColor: design.borderColor,
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCartDelivery(false)}
                              className="mc-btn-sm px-2.5 py-1 text-[11px]"
                              style={{
                                backgroundColor: design.surfaceColor,
                                color: design.textColor,
                              }}
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              disabled={savingCartDelivery}
                              onClick={saveQuickWilayaRate}
                              className="mc-btn-sm px-3 py-1 text-[11px] font-bold"
                              style={{ backgroundColor: design.accentColor, color: accentText }}
                            >
                              {savingCartDelivery ? 'جاري الحفظ...' : 'حفظ السعر'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                          البلدية / الدائرة (اختياري)
                        </label>
                        <input
                          type="text"
                          value={commune}
                          onChange={(e) => setCommune(e.target.value)}
                          placeholder="اسم البلدية"
                          className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                          style={{
                            backgroundColor: design.bgColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                          العنوان {deliveryMethod === 'home' ? '*' : '(اختياري)'}
                        </label>
                        <input
                          type="text"
                          required={deliveryMethod === 'home'}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder={
                            deliveryMethod === 'home'
                              ? 'الحي، الشارع، رقم البناية...'
                              : 'مكتب البريد القريب (أو يترك فارغاً)'
                          }
                          className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                          style={{
                            backgroundColor: design.bgColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                        ملاحظات التوصيل (اختياري)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="أوقات الاتصال المفضلة أو تفاصيل إضافية..."
                        className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                        style={{
                          backgroundColor: design.bgColor,
                          color: design.textColor,
                          borderColor: design.borderColor,
                        }}
                      />
                    </div>

                    {/* Account Summary */}
                    <div
                      className={`space-y-2 border p-4 text-sm ${radiusClass}`}
                      style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                    >
                      <div className="flex justify-between text-xs">
                        <span style={{ color: design.mutedColor }}>المجموع الفرعي</span>
                        <span className="font-mono tabular-nums">
                          {formatMoney(subtotal, activeOrderCurrency)}
                        </span>
                      </div>

                      {vipDiscountPercent > 0 && (
                        <div className="flex justify-between text-xs" style={{ color: design.accentColor }}>
                          <span>خصم كوبون المقربين ({vipDiscountPercent}%)</span>
                          <span className="font-mono tabular-nums">
                            -{formatMoney(discountAmount, activeOrderCurrency)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs">
                        <span style={{ color: design.mutedColor }}>رسوم التوصيل</span>
                        <span className="font-mono tabular-nums">
                          {formatMoney(deliveryFee, activeOrderCurrency)}
                        </span>
                      </div>

                      <div
                        className="flex justify-between border-t pt-2 text-base font-bold"
                        style={{ borderColor: design.borderColor }}
                      >
                        <span>الإجمالي النهائي</span>
                        <span className="font-mono tabular-nums" style={{ color: design.accentColor }}>
                          {formatMoney(finalTotal, activeOrderCurrency)}
                        </span>
                      </div>
                    </div>

                    {orderError && (
                      <div className="border border-red-500/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                        {orderError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingOrder}
                      className="mc-btn w-full py-3.5 text-sm font-bold"
                      style={{ backgroundColor: design.accentColor, color: accentText }}
                    >
                      {submittingOrder ? 'جاري تأكيد الطلبية...' : 'تأكيد وإرسال الطلبية'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
