import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Crown,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Send,
  Shield,
  Shirt,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ALGERIA_WILAYAS, buildDefaultDeliveryRates } from '../data/algeriaWilayas.ts';
import {
  DEFAULT_STUDIO_GARMENTS,
  GARMENT_CATEGORY_LABELS,
  GARMENT_SILHOUETTE_LABELS,
  HERO_APPAREL_IMAGE,
} from '../data/catalog.ts';
import {
  CURRENCY_LABELS,
  formatMoney,
  getContrastTextColor,
  getRadiusClass,
  type ContactMessageRecord,
  type CurrencyCode,
  type DeliveryRatesMap,
  type GarmentCategory,
  type GarmentSilhouette,
  type OrderStatus,
  type OwnerOverviewPayload,
  type OwnerTab,
  type ProductRecord,
  type RadiusStyle,
  type SiteDesignConfig,
  type StoreOrderRecord,
  type StudioColorOption,
  type StudioGarmentOption,
  type VipCouponRecord,
  type VipRequestRecord,
  type VipStatus,
} from '../types.ts';
import {
  connectGmailAccount,
  disconnectGmailAccount,
  getCachedGmailAccessToken,
  initGmailAuth,
  sendOrdersViaGmail,
  type GmailAccountInfo,
} from '../utils/gmailAuth.ts';
import { readHeroImageFile } from '../utils/imageUpload.ts';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';

export const OWNER_TOKEN_STORAGE_KEY = 'skeleton_store_owner_token';

interface DesignPreset {
  id: string;
  label: string;
  bgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  borderColor: string;
  radiusStyle: RadiusStyle;
}

const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: 'mc-forest',
    label: 'ماين كرافت — عشب وغابة وعظم',
    bgColor: '#141812',
    surfaceColor: '#1E241A',
    textColor: '#F2ECE0',
    mutedColor: '#B0B5A6',
    accentColor: '#6BB83B',
    borderColor: '#34402C',
    radiusStyle: 'sharp',
  },
  {
    id: 'mc-wood',
    label: 'ماين كرافت — طاولة الصنع والخشب',
    bgColor: '#1A1510',
    surfaceColor: '#251E17',
    textColor: '#F3EDE0',
    mutedColor: '#B9AF9E',
    accentColor: '#D49A45',
    borderColor: '#423629',
    radiusStyle: 'sharp',
  },
  {
    id: 'mc-diamond',
    label: 'ماين كرافت — كهف الألماس والأوبسيديان',
    bgColor: '#10161B',
    surfaceColor: '#182128',
    textColor: '#ECF4F6',
    mutedColor: '#98ACB4',
    accentColor: '#43D4C8',
    borderColor: '#2B3A45',
    radiusStyle: 'sharp',
  },
  {
    id: 'obsidian-gold',
    label: 'أوبسيديان داكن وذهبي',
    bgColor: '#0D0E10',
    surfaceColor: '#15171A',
    textColor: '#F2EFE9',
    mutedColor: '#A6A29A',
    accentColor: '#C6A87D',
    borderColor: '#22252A',
    radiusStyle: 'balanced',
  },
  {
    id: 'ivory-classic',
    label: 'أبيض عاجي وكلاسيكي',
    bgColor: '#F8F6F1',
    surfaceColor: '#FFFFFF',
    textColor: '#18181B',
    mutedColor: '#636059',
    accentColor: '#5B9A32',
    borderColor: '#E5E0D5',
    radiusStyle: 'balanced',
  },
];

interface OwnerPortalProps {
  ownerConfigured: boolean;
  ownerToken: string;
  activeTab: OwnerTab;
  design: SiteDesignConfig;
  products: ProductRecord[];
  deliveryRates: DeliveryRatesMap;
  onTabChange: (tab: OwnerTab) => void;
  onAuthenticated: (token: string, configured?: boolean) => void;
  onLogout: () => void;
  onExitToStore: () => void;
  onOpenAddProduct: (editing?: ProductRecord | null) => void;
  onSyncFromServer: (payload: {
    design?: SiteDesignConfig;
    products?: ProductRecord[];
    deliveryRates?: DeliveryRatesMap;
  }) => void;
}

export const OwnerPortal: React.FC<OwnerPortalProps> = ({
  ownerConfigured,
  ownerToken,
  activeTab,
  design,
  products,
  deliveryRates,
  onTabChange,
  onAuthenticated,
  onLogout,
  onExitToStore,
  onOpenAddProduct,
  onSyncFromServer,
}) => {
  // Login / setup form state
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Live overview state
  const [wsConnected, setWsConnected] = useState(false);
  const [vipCoupons, setVipCoupons] = useState<VipCouponRecord[]>([]);
  const [vipRequests, setVipRequests] = useState<VipRequestRecord[]>([]);
  const [orders, setOrders] = useState<StoreOrderRecord[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessageRecord[]>([]);
  const [statusBanner, setStatusBanner] = useState('');

  // Design draft
  const [designDraft, setDesignDraft] = useState<SiteDesignConfig>(design);
  const [savingDesign, setSavingDesign] = useState(false);
  const [newStudioColorHex, setNewStudioColorHex] = useState('#4B6B38');
  const [newStudioColorName, setNewStudioColorName] = useState('');
  const [garmentCategoryFilter, setGarmentCategoryFilter] = useState<GarmentCategory | 'all'>('all');
  const [newGarmentCat, setNewGarmentCat] = useState<GarmentCategory>('tshirts');
  const [newGarmentSil, setNewGarmentSil] = useState<GarmentSilhouette>('tshirt-oversize');
  const [newGarmentName, setNewGarmentName] = useState('');
  const [newGarmentNote, setNewGarmentNote] = useState('');
  const [newGarmentPrice, setNewGarmentPrice] = useState('50');
  const [savingStudioGarments, setSavingStudioGarments] = useState(false);

  // Delivery draft
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryRatesMap>(deliveryRates);
  const [deliverySearch, setDeliverySearch] = useState('');
  const [bulkPostPrice, setBulkPostPrice] = useState('500');
  const [bulkHomePrice, setBulkHomePrice] = useState('750');
  const [savingDelivery, setSavingDelivery] = useState(false);

  // VIP management state
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('20');
  const [vipSearch, setVipSearch] = useState('');
  const [vipFilter, setVipFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Gmail integration state
  const [gmailAccount, setGmailAccount] = useState<GmailAccountInfo | null>(null);
  const [gmailHasToken, setGmailHasToken] = useState(Boolean(getCachedGmailAccessToken()));
  const [recipientEmail, setRecipientEmail] = useState('');
  const [pendingGmailOrders, setPendingGmailOrders] = useState<StoreOrderRecord[] | null>(null);
  const [sendingGmail, setSendingGmail] = useState(false);
  const [gmailError, setGmailError] = useState('');

  // Security password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwChangeMsg, setPwChangeMsg] = useState('');
  const [pwChangeErr, setPwChangeErr] = useState('');

  const showBanner = (text: string) => {
    setStatusBanner(text);
    setTimeout(() => setStatusBanner((curr) => (curr === text ? '' : curr)), 3000);
  };

  useEffect(() => {
    setDesignDraft(design);
  }, [design]);

  useEffect(() => {
    setDeliveryDraft(deliveryRates);
  }, [deliveryRates]);

  useEffect(() => {
    return initGmailAuth(
      (account, hasToken) => {
        setGmailAccount(account);
        setGmailHasToken(hasToken);
        setRecipientEmail((prev) => prev || account.email);
      },
      () => {
        setGmailAccount(null);
        setGmailHasToken(false);
      }
    );
  }, []);

  // Load owner overview + WebSocket when authenticated
  useEffect(() => {
    if (!ownerToken) return;
    let closed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const loadOverview = async () => {
      try {
        const res = await fetch('/api/owner/overview', {
          headers: { 'x-owner-token': ownerToken },
        });
        if (res.status === 401) {
          onLogout();
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as OwnerOverviewPayload;
        if (closed) return;
        setVipCoupons(data.vipCoupons);
        setVipRequests(data.vipRequests);
        setOrders(data.orders);
        setContactMessages(data.contactMessages);
        onSyncFromServer({
          design: data.design,
          products: data.products,
          deliveryRates: data.deliveryRates,
        });
      } catch {
        // ignore transient error
      }
    };

    const connectWs = () => {
      if (closed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws?role=owner&token=${encodeURIComponent(
        ownerToken
      )}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (!closed) setWsConnected(true);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as { event: string; data: unknown };
          if (msg.event === 'owner:init') {
            const payload = msg.data as OwnerOverviewPayload;
            setVipCoupons(payload.vipCoupons);
            setVipRequests(payload.vipRequests);
            setOrders(payload.orders);
            setContactMessages(payload.contactMessages);
            onSyncFromServer({
              design: payload.design,
              products: payload.products,
              deliveryRates: payload.deliveryRates,
            });
          } else if (msg.event === 'owner:new_vip_request') {
            const incoming = msg.data as VipRequestRecord;
            setVipRequests((prev) =>
              prev.some((r) => r.id === incoming.id) ? prev : [incoming, ...prev]
            );
          } else if (msg.event === 'owner:vip_updated') {
            const updated = msg.data as VipRequestRecord;
            setVipRequests((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
          } else if (msg.event === 'owner:new_order') {
            const incoming = msg.data as StoreOrderRecord;
            setOrders((prev) =>
              prev.some((o) => o.id === incoming.id) ? prev : [incoming, ...prev]
            );
          } else if (msg.event === 'owner:order_updated') {
            const updated = msg.data as StoreOrderRecord;
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          } else if (msg.event === 'owner:products_updated') {
            onSyncFromServer({ products: msg.data as ProductRecord[] });
          } else if (msg.event === 'owner:design_updated') {
            onSyncFromServer({ design: msg.data as SiteDesignConfig });
          } else if (msg.event === 'owner:delivery_updated') {
            onSyncFromServer({ deliveryRates: msg.data as DeliveryRatesMap });
          } else if (msg.event === 'owner:new_message') {
            const incoming = msg.data as ContactMessageRecord;
            setContactMessages((prev) =>
              prev.some((m) => m.id === incoming.id) ? prev : [incoming, ...prev]
            );
          }
        } catch {
          // ignore malformed WS frames
        }
      };

      ws.onclose = () => {
        if (!closed) {
          setWsConnected(false);
          reconnectTimer = window.setTimeout(connectWs, 2500);
        }
      };
    };

    loadOverview();
    connectWs();

    return () => {
      closed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [ownerToken]);

  const radiusClass = getRadiusClass(design.radiusStyle);
  const accentText = getContrastTextColor(design.accentColor);

  const filteredWilayas = useMemo(() => {
    const q = deliverySearch.trim();
    if (!q) return ALGERIA_WILAYAS;
    return ALGERIA_WILAYAS.filter(
      (w) => w.code.includes(q) || w.nameAr.includes(q)
    );
  }, [deliverySearch]);

  const filteredVipRequests = useMemo(() => {
    const q = vipSearch.trim().toLowerCase();
    return vipRequests.filter((r) => {
      if (vipFilter === 'pending' && r.status !== 'pending') return false;
      if (vipFilter === 'approved' && r.status !== 'approved') return false;
      if (vipFilter === 'rejected' && r.status !== 'denied' && r.status !== 'revoked')
        return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) || r.couponCode.toLowerCase().includes(q)
      );
    });
  }, [vipRequests, vipSearch, vipFilter]);

  const unsentOrders = useMemo(
    () => orders.filter((o) => !o.gmailSentAt),
    [orders]
  );

  // ===================================================================
  // Auth Screen (Setup or Login)
  // ===================================================================
  if (!ownerToken) {
    const handleAuthSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError('');
      if (!ownerConfigured && passwordInput !== confirmPasswordInput) {
        setAuthError('كلمتا المرور غير متطابقتين.');
        return;
      }
      setAuthLoading(true);
      try {
        const endpoint = ownerConfigured ? '/api/owner/login' : '/api/owner/setup';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: passwordInput }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'تعذر تسجيل الدخول.');
        }
        sessionStorage.setItem(OWNER_TOKEN_STORAGE_KEY, data.ownerToken);
        setPasswordInput('');
        setConfirmPasswordInput('');
        onAuthenticated(data.ownerToken, true);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{ backgroundColor: design.bgColor, color: design.textColor }}
      >
        <div
          className={`w-full max-w-md border p-6 sm:p-8 shadow-2xl ${radiusClass}`}
          style={{
            backgroundColor: design.surfaceColor,
            borderColor: design.borderColor,
          }}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className="minecraft-wordmark text-sm">{design.brandName}</span>
              <h1 className="mt-2 text-lg font-bold">
                {ownerConfigured ? 'دخول بوابة المالك المخفية' : 'إعداد كلمة مرور المالك لأول مرة'}
              </h1>
            </div>
            <Shield className="h-6 w-6" style={{ color: design.accentColor }} />
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: design.mutedColor }}>
                {ownerConfigured ? 'كلمة مرور المالك' : 'تعيين كلمة مرور المالك (4 أحرف فأكثر)'}
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`w-full border px-3.5 py-2.5 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            {!ownerConfigured && (
              <div>
                <label className="mb-1.5 block text-xs" style={{ color: design.mutedColor }}>
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className={`w-full border px-3.5 py-2.5 text-sm outline-none ${radiusClass}`}
                  style={{
                    backgroundColor: design.bgColor,
                    color: design.textColor,
                    borderColor: design.borderColor,
                  }}
                />
              </div>
            )}

            {authError && (
              <div className="border border-red-500/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="mc-btn w-full py-3 text-sm font-bold"
              style={{ backgroundColor: design.accentColor, color: accentText }}
            >
              {authLoading
                ? 'جاري التحقق...'
                : ownerConfigured
                  ? 'دخول لوحة الإدارة'
                  : 'حفظ كلمة المرور والدخول'}
            </button>

            <button
              type="button"
              onClick={onExitToStore}
              className="mc-btn-sm w-full py-2.5 text-xs"
              style={{ backgroundColor: design.bgColor, color: design.mutedColor }}
            >
              العودة إلى واجهة المتجر
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ===================================================================
  // Authenticated Owner Portal Actions
  // ===================================================================
  const handleDeleteProduct = async (productId: string) => {
    const res = await fetch(`/api/owner/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      headers: { 'x-owner-token': ownerToken },
    });
    const data = await res.json();
    if (res.ok && data.products) {
      onSyncFromServer({ products: data.products });
      showBanner('تم حذف القطعة من المتجر.');
    }
  };

  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDesign(true);
    try {
      const res = await fetch('/api/owner/design', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify(designDraft),
      });
      const data = await res.json();
      if (res.ok && data.design) {
        onSyncFromServer({ design: data.design });
        showBanner('تم حفظ ونشر الديزاين على المتجر لحظياً.');
      }
    } finally {
      setSavingDesign(false);
    }
  };

  const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await readHeroImageFile(file);
    setDesignDraft((prev) => ({ ...prev, heroImage: dataUrl }));
  };

  const handleAddStudioColorDraft = () => {
    const name = newStudioColorName.trim();
    if (!name) return;
    const nextColor: StudioColorOption = {
      id: `color-${Date.now().toString(36)}`,
      name,
      hex: newStudioColorHex,
    };
    setDesignDraft((prev) => ({
      ...prev,
      studioColors: [...prev.studioColors, nextColor],
    }));
    setNewStudioColorName('');
  };

  const handleDeleteStudioColorDraft = (id: string) => {
    if (designDraft.studioColors.length <= 1) return;
    setDesignDraft((prev) => ({
      ...prev,
      studioColors: prev.studioColors.filter((c) => c.id !== id),
    }));
  };

  const persistStudioGarments = async (nextGarments: StudioGarmentOption[], msg: string) => {
    setSavingStudioGarments(true);
    try {
      setDesignDraft((prev) => ({ ...prev, studioGarments: nextGarments }));
      const res = await fetch('/api/owner/studio-garments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({ studioGarments: nextGarments }),
      });
      const data = await res.json();
      if (res.ok && data.design) {
        onSyncFromServer({ design: data.design });
        showBanner(msg);
      }
    } finally {
      setSavingStudioGarments(false);
    }
  };

  const handleToggleStudioGarment = async (id: string) => {
    const current = designDraft.studioGarments || [];
    const target = current.find((g) => g.id === id);
    if (!target) return;
    const next = current.map((g) => (g.id === id ? { ...g, available: !g.available } : g));
    await persistStudioGarments(
      next,
      target.available
        ? `تم إخفاء "${target.label}" من الاستوديو لعدم توفره.`
        : `تم تفعيل "${target.label}" في الاستوديو.`
    );
  };

  const handleRemoveStudioGarment = async (id: string) => {
    const current = designDraft.studioGarments || [];
    const next = current.filter((g) => g.id !== id);
    await persistStudioGarments(next, 'تمت إزالة نوع القطعة من الاستوديو.');
  };

  const handleRestoreStudioGarments = async () => {
    const current = designDraft.studioGarments || [];
    const map = new Map(current.map((g) => [g.id, g]));
    const merged: StudioGarmentOption[] = DEFAULT_STUDIO_GARMENTS.map((def) =>
      map.has(def.id) ? { ...map.get(def.id)!, available: true } : def
    );
    for (const item of current) {
      if (!DEFAULT_STUDIO_GARMENTS.some((d) => d.id === item.id)) {
        merged.push(item);
      }
    }
    await persistStudioGarments(merged, 'تمت استعادة جميع أنواع القطع الافتراضية.');
  };

  const handleAddStudioGarment = async () => {
    const label = newGarmentName.trim();
    if (!label) return;
    const cur = designDraft.defaultCurrency;
    const base = Math.max(1, Number(newGarmentPrice) || 50);
    const prices =
      cur === 'DZD'
        ? { DZD: base, USD: Math.max(10, Math.round(base / 88)), EUR: Math.max(10, Math.round(base / 95)) }
        : cur === 'EUR'
          ? { EUR: base, USD: Math.round(base * 1.08), DZD: Math.round(base * 95) }
          : { USD: base, EUR: Math.round(base * 0.92), DZD: Math.round(base * 88) };

    const nextItem: StudioGarmentOption = {
      id: `custom-${newGarmentCat}-${Date.now().toString(36)}`,
      category: newGarmentCat,
      silhouette: newGarmentSil,
      label,
      fabricNote: newGarmentNote.trim() || 'قطن فاخر مختار بعناية',
      available: true,
      prices,
    };
    const next = [...(designDraft.studioGarments || []), nextItem];
    setNewGarmentName('');
    setNewGarmentNote('');
    await persistStudioGarments(next, `تمت إضافة "${nextItem.label}" إلى استوديو التصميم.`);
  };

  const applyBulkDelivery = () => {
    const post = Math.max(0, Number(bulkPostPrice) || 0);
    const home = Math.max(0, Number(bulkHomePrice) || 0);
    const updated: DeliveryRatesMap = {};
    for (const w of ALGERIA_WILAYAS) {
      updated[w.code] = { postOfficePrice: post, homePrice: home };
    }
    setDeliveryDraft(updated);
  };

  const handleSaveDeliveryRates = async () => {
    setSavingDelivery(true);
    try {
      const res = await fetch('/api/owner/delivery-rates', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({ deliveryRates: deliveryDraft }),
      });
      const data = await res.json();
      if (res.ok && data.deliveryRates) {
        onSyncFromServer({ deliveryRates: data.deliveryRates });
        showBanner('تم حفظ أسعار التوصيل للولايات الـ 69.');
      }
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/owner/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({
        code: newCouponCode,
        description: newCouponDesc,
        discountPercent: Number(newCouponDiscount),
      }),
    });
    const data = await res.json();
    if (res.ok && data.vipCoupons) {
      setVipCoupons(data.vipCoupons);
      setNewCouponCode('');
      setNewCouponDesc('');
      showBanner('تم إنشاء الكوبون بنجاح.');
    }
  };

  const handleToggleCoupon = async (code: string) => {
    const res = await fetch(`/api/owner/coupons/${encodeURIComponent(code)}/toggle`, {
      method: 'PATCH',
      headers: { 'x-owner-token': ownerToken },
    });
    const data = await res.json();
    if (res.ok && data.vipCoupons) {
      setVipCoupons(data.vipCoupons);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    const res = await fetch(`/api/owner/coupons/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      headers: { 'x-owner-token': ownerToken },
    });
    const data = await res.json();
    if (res.ok && data.vipCoupons) {
      setVipCoupons(data.vipCoupons);
    }
  };

  const handleVipDecision = async (id: string, status: VipStatus) => {
    const res = await fetch(`/api/owner/vip-requests/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok && data.request) {
      setVipRequests((prev) => prev.map((r) => (r.id === id ? data.request : r)));
    }
  };

  const handleOrderStatus = async (id: string, status: OrderStatus) => {
    const res = await fetch(`/api/owner/orders/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok && data.order) {
      setOrders((prev) => prev.map((o) => (o.id === id ? data.order : o)));
    }
  };

  const handleConnectGmail = async () => {
    setGmailError('');
    try {
      const result = await connectGmailAccount();
      setGmailAccount(result.account);
      setGmailHasToken(true);
      setRecipientEmail((prev) => prev || result.account.email);
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'تعذر ربط حساب Google.');
    }
  };

  const handleDisconnectGmail = async () => {
    await disconnectGmailAccount();
    setGmailAccount(null);
    setGmailHasToken(false);
  };

  const requestGmailSend = (targetOrders: StoreOrderRecord[]) => {
    if (targetOrders.length === 0) return;
    if (!gmailHasToken) {
      onTabChange('gmail');
      setGmailError('يرجى ربط حساب Google عبر زر Sign in with Google قبل الإرسال.');
      return;
    }
    setGmailError('');
    setPendingGmailOrders(targetOrders);
  };

  const confirmAndSendGmail = async () => {
    if (!pendingGmailOrders || pendingGmailOrders.length === 0) return;
    setSendingGmail(true);
    setGmailError('');
    try {
      const targetEmail = recipientEmail.trim() || gmailAccount?.email || '';
      await sendOrdersViaGmail({
        recipientEmail: targetEmail,
        orders: pendingGmailOrders,
        brandName: design.brandName,
      });

      const res = await fetch('/api/owner/orders/mark-gmail-sent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify({
          orderIds: pendingGmailOrders.map((o) => o.id),
          recipientEmail: targetEmail,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.updatedOrders)) {
        const map = new Map<string, StoreOrderRecord>(
          data.updatedOrders.map((o: StoreOrderRecord) => [o.id, o])
        );
        setOrders((prev) => prev.map((o) => map.get(o.id) || o));
      }
      showBanner(`تم إرسال ${pendingGmailOrders.length} طلبية إلى Gmail بنجاح.`);
      setPendingGmailOrders(null);
    } catch (err) {
      setGmailError(err instanceof Error ? err.message : 'فشل إرسال البريد.');
    } finally {
      setSendingGmail(false);
    }
  };

  const handleMarkMessageRead = async (id: string) => {
    const res = await fetch(`/api/owner/messages/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      headers: { 'x-owner-token': ownerToken },
    });
    const data = await res.json();
    if (res.ok && data.message) {
      setContactMessages((prev) => prev.map((m) => (m.id === id ? data.message : m)));
    }
  };

  const handleDeleteMessage = async (id: string) => {
    const res = await fetch(`/api/owner/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-owner-token': ownerToken },
    });
    const data = await res.json();
    if (res.ok && data.contactMessages) {
      setContactMessages(data.contactMessages);
    }
  };

  const handleChangeOwnerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwChangeErr('');
    setPwChangeMsg('');
    const res = await fetch('/api/owner/admin-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPwChangeErr(data.error || 'تعذر تغيير كلمة المرور.');
      return;
    }
    setCurrentPw('');
    setNewPw('');
    setPwChangeMsg('تم تحديث كلمة مرور المالك بنجاح.');
  };

  const tabs: Array<{ id: OwnerTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'products', label: 'الملابس والمخزون', icon: <Shirt className="h-4 w-4" />, badge: products.length },
    { id: 'design', label: 'تعديل ديزاين الموقع', icon: <Palette className="h-4 w-4" /> },
    { id: 'delivery', label: 'أسعار التوصيل (69)', icon: <MapPin className="h-4 w-4" /> },
    {
      id: 'vip',
      label: 'الزوار المقربون والكوبونات',
      icon: <Crown className="h-4 w-4" />,
      badge: vipRequests.filter((r) => r.status === 'pending').length || undefined,
    },
    {
      id: 'orders',
      label: 'طلبيات الملابس',
      icon: <Package className="h-4 w-4" />,
      badge: orders.filter((o) => o.status === 'pending').length || undefined,
    },
    { id: 'gmail', label: 'ربط Gmail للطلبيات', icon: <Mail className="h-4 w-4" /> },
    {
      id: 'messages',
      label: 'رسائل التواصل',
      icon: <MessageSquare className="h-4 w-4" />,
      badge: contactMessages.filter((m) => !m.read).length || undefined,
    },
    { id: 'security', label: 'أمان المالك', icon: <KeyRound className="h-4 w-4" /> },
  ];

  const orderStatusLabel: Record<OrderStatus, string> = {
    pending: 'قيد المراجعة',
    approved: 'تمت الموافقة',
    completed: 'مكتملة',
    rejected: 'مرفوضة',
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: design.bgColor, color: design.textColor }}
    >
      {/* Top Bar */}
      <header
        className="sticky top-0 z-30 border-b px-4 sm:px-6 py-3.5"
        style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="minecraft-wordmark text-xs sm:text-sm">{design.brandName}</span>
            <span
              className="border px-2 py-0.5 text-[11px] font-semibold"
              style={{ borderColor: design.accentColor, color: design.accentColor }}
            >
              إدارة المالك المخفية
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: design.mutedColor }}>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  wsConnected ? 'bg-lime-400' : 'bg-amber-400'
                }`}
              />
              <span>{wsConnected ? 'بث مباشر متصل' : 'مزامنة نشطة'}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAddProduct(null)}
              className="mc-btn-sm flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: design.accentColor, color: accentText }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة ملابس</span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('design')}
              className="mc-btn-sm flex items-center gap-1.5 px-3 py-1.5 text-xs"
              style={{ backgroundColor: design.bgColor, color: design.textColor }}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>تعديل الديزاين</span>
            </button>
            <button
              type="button"
              onClick={onExitToStore}
              className="mc-btn-sm flex items-center gap-1.5 px-3 py-1.5 text-xs"
              style={{ backgroundColor: design.bgColor, color: design.textColor }}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>معاينة المتجر</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="mc-btn-sm flex items-center gap-1.5 bg-red-950 px-3 py-1.5 text-xs text-red-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {statusBanner && (
        <div
          className="border-b px-6 py-2.5 text-center text-xs font-bold"
          style={{
            backgroundColor: design.accentColor,
            color: accentText,
            borderColor: design.borderColor,
          }}
        >
          {statusBanner}
        </div>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:px-6 py-6 lg:grid-cols-12">
        {/* 8 Sidebar Tabs */}
        <aside className="lg:col-span-3 space-y-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className="mc-btn-sm flex w-full items-center justify-between px-3.5 py-2.5 text-right text-xs sm:text-sm font-semibold"
                style={{
                  backgroundColor: active ? design.accentColor : design.surfaceColor,
                  color: active ? accentText : design.textColor,
                }}
              >
                <span className="flex items-center gap-2.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className="px-1.5 py-0.5 font-mono text-[11px] tabular-nums"
                    style={{
                      backgroundColor: active ? 'rgba(0,0,0,0.22)' : design.bgColor,
                      color: active ? accentText : design.accentColor,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Main Tab Content */}
        <main className="lg:col-span-9">
          {/* 1. Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">الملابس والمخزون ({products.length})</h2>
                <button
                  type="button"
                  onClick={() => onOpenAddProduct(null)}
                  className="mc-btn flex items-center gap-2 px-4 py-2 text-xs font-bold"
                  style={{ backgroundColor: design.accentColor, color: accentText }}
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة قطعة جديدة</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`flex gap-4 border p-4 ${radiusClass}`}
                    style={{
                      backgroundColor: design.surfaceColor,
                      borderColor: design.borderColor,
                    }}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="h-28 w-24 shrink-0 border object-cover"
                      style={{ borderColor: design.borderColor }}
                    />
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="text-xs" style={{ color: design.mutedColor }}>
                          {product.category} · {product.edition}
                        </div>
                        <h3 className="truncate text-sm font-bold">{product.name}</h3>
                        <div className="mt-1 font-mono text-xs tabular-nums" style={{ color: design.accentColor }}>
                          {formatMoney(product.price, product.currency)}
                        </div>
                        <div className="mt-1 font-mono text-[11px] tabular-nums" style={{ color: design.mutedColor }}>
                          {product.lengthCm}×{product.widthCm} سم · المخزون: {product.stock} · المقاسات:{' '}
                          {product.sizes.join(', ')}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenAddProduct(product)}
                          className="mc-btn-sm flex items-center gap-1 px-3 py-1 text-xs"
                          style={{ backgroundColor: design.bgColor, color: design.textColor }}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="mc-btn-sm flex items-center gap-1 bg-red-950 px-3 py-1 text-xs text-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Design Tab */}
          {activeTab === 'design' && (
            <form onSubmit={handleSaveDesign} className="space-y-6">
              <div
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h2 className="text-base font-bold">قوالب الألوان الجاهزة (بضغطة واحدة)</h2>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {DESIGN_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setDesignDraft((prev) => ({
                          ...prev,
                          bgColor: preset.bgColor,
                          surfaceColor: preset.surfaceColor,
                          textColor: preset.textColor,
                          mutedColor: preset.mutedColor,
                          accentColor: preset.accentColor,
                          borderColor: preset.borderColor,
                          radiusStyle: preset.radiusStyle,
                        }))
                      }
                      className="mc-btn-sm flex items-center justify-between gap-2 p-3 text-right text-xs font-semibold"
                      style={{ backgroundColor: preset.bgColor, color: preset.textColor }}
                    >
                      <span>{preset.label}</span>
                      <span className="flex gap-1">
                        <span
                          className="h-3.5 w-3.5 border border-black/40"
                          style={{ backgroundColor: preset.surfaceColor }}
                        />
                        <span
                          className="h-3.5 w-3.5 border border-black/40"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h3 className="text-sm font-bold">النصوص الرئيسية وهوية المتجر</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      اسم المتجر (Wordmark)
                    </label>
                    <input
                      type="text"
                      value={designDraft.brandName}
                      onChange={(e) =>
                        setDesignDraft((prev) => ({ ...prev, brandName: e.target.value }))
                      }
                      className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      النص العلوي الصغير (Eyebrow)
                    </label>
                    <input
                      type="text"
                      value={designDraft.heroEyebrow}
                      onChange={(e) =>
                        setDesignDraft((prev) => ({ ...prev, heroEyebrow: e.target.value }))
                      }
                      className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
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
                    العنوان الرئيسي (Hero Title)
                  </label>
                  <input
                    type="text"
                    value={designDraft.heroTitle}
                    onChange={(e) =>
                      setDesignDraft((prev) => ({ ...prev, heroTitle: e.target.value }))
                    }
                    className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                    الوصف الترحيبي (Hero Subtitle)
                  </label>
                  <textarea
                    rows={2}
                    value={designDraft.heroSubtitle}
                    onChange={(e) =>
                      setDesignDraft((prev) => ({ ...prev, heroSubtitle: e.target.value }))
                    }
                    className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                </div>
              </div>

              {/* Hero Image Management */}
              <div
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h3 className="text-sm font-bold">الصورة الرئيسية الأولى (Hero Image)</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    className="mc-btn-sm inline-flex cursor-pointer items-center gap-2 px-3.5 py-2 text-xs font-semibold"
                    style={{ backgroundColor: design.bgColor, color: design.textColor }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>رفع صورة من الجهاز</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleHeroFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDesignDraft((prev) => ({ ...prev, heroImage: HERO_APPAREL_IMAGE }))
                    }
                    className="mc-btn-sm flex items-center gap-1.5 px-3.5 py-2 text-xs"
                    style={{ backgroundColor: design.bgColor, color: design.textColor }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>استعادة الصورة الافتراضية</span>
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    dir="ltr"
                    value={designDraft.heroImage.startsWith('data:') ? '' : designDraft.heroImage}
                    onChange={(e) =>
                      setDesignDraft((prev) => ({ ...prev, heroImage: e.target.value }))
                    }
                    placeholder={
                      designDraft.heroImage.startsWith('data:')
                        ? 'تم رفع صورة من الجهاز (الصق رابطاً جديداً لاستبدالها)'
                        : '/assets/aistudio/... أو https://...'
                    }
                    className={`flex-1 border px-3 py-2 font-mono text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  {designDraft.heroImage && (
                    <img
                      src={designDraft.heroImage}
                      alt="معاينة الصورة الرئيسية"
                      referrerPolicy="no-referrer"
                      className="h-20 w-28 border object-cover"
                      style={{ borderColor: design.borderColor }}
                    />
                  )}
                </div>
              </div>

              {/* 6 Colors + Layout + Currency */}
              <div
                className={`border p-5 space-y-5 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h3 className="text-sm font-bold">الألوان وتخطيط الشبكة</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    { key: 'bgColor', label: 'لون الخلفية' },
                    { key: 'surfaceColor', label: 'لون البطاقات' },
                    { key: 'textColor', label: 'لون النص الأساسي' },
                    { key: 'mutedColor', label: 'لون النص الثانوي' },
                    { key: 'accentColor', label: 'اللون المميز' },
                    { key: 'borderColor', label: 'لون الحدود' },
                  ].map((item) => {
                    const key = item.key as keyof SiteDesignConfig;
                    const value = String(designDraft[key]);
                    return (
                      <label
                        key={item.key}
                        className="flex items-center justify-between border p-2.5 text-xs"
                        style={{
                          backgroundColor: design.bgColor,
                          borderColor: design.borderColor,
                        }}
                      >
                        <span>{item.label}</span>
                        <input
                          type="color"
                          value={value}
                          onChange={(e) =>
                            setDesignDraft((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="h-7 w-10 cursor-pointer border bg-transparent"
                          style={{ borderColor: design.borderColor }}
                        />
                      </label>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      أعمدة عرض المنتجات
                    </label>
                    <select
                      value={designDraft.gridColumns}
                      onChange={(e) =>
                        setDesignDraft((prev) => ({
                          ...prev,
                          gridColumns: Number(e.target.value) as 2 | 3 | 4,
                        }))
                      }
                      className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    >
                      <option value={2}>عمودان (2)</option>
                      <option value={3}>3 أعمدة (افتراضي)</option>
                      <option value={4}>4 أعمدة</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      استدارة الحواف
                    </label>
                    <select
                      value={designDraft.radiusStyle}
                      onChange={(e) =>
                        setDesignDraft((prev) => ({
                          ...prev,
                          radiusStyle: e.target.value as RadiusStyle,
                        }))
                      }
                      className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    >
                      <option value="sharp">حواف حادة (ماين كرافت)</option>
                      <option value="balanced">متوازنة</option>
                      <option value="rounded">دائرية ناعمة</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      العملة الافتراضية
                    </label>
                    <select
                      value={designDraft.defaultCurrency}
                      onChange={(e) =>
                        setDesignDraft((prev) => ({
                          ...prev,
                          defaultCurrency: e.target.value as CurrencyCode,
                        }))
                      }
                      className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    >
                      {(['USD', 'EUR', 'DZD'] as CurrencyCode[]).map((c) => (
                        <option key={c} value={c}>
                          {c} ({CURRENCY_LABELS[c]})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h3 className="text-sm font-bold">بيانات التواصل الظاهرة في نافذة التواصل</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      dir="ltr"
                      value={designDraft.contactEmail}
                      onChange={(e) =>
                        setDesignDraft((prev) => ({ ...prev, contactEmail: e.target.value }))
                      }
                      placeholder="contact@skeleton.dz"
                      className={`w-full border px-3 py-2 font-mono text-xs ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      الهاتف / واتساب
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={designDraft.contactPhone}
                      onChange={(e) =>
                        setDesignDraft((prev) => ({ ...prev, contactPhone: e.target.value }))
                      }
                      placeholder="+213 550 00 00 00"
                      className={`w-full border px-3 py-2 font-mono text-xs ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      حساب إنستغرام
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={designDraft.contactInstagram}
                      onChange={(e) =>
                        setDesignDraft((prev) => ({
                          ...prev,
                          contactInstagram: e.target.value,
                        }))
                      }
                      placeholder="@skeleton.store"
                      className={`w-full border px-3 py-2 font-mono text-xs ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Studio Colors */}
              <div
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h3 className="text-sm font-bold">ألوان استوديو التصميم المخصص</h3>
                <div className="flex flex-wrap gap-2">
                  {designDraft.studioColors.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center gap-2 border px-3 py-1.5 text-xs"
                      style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                    >
                      <span
                        className="h-3.5 w-3.5 border border-black/40"
                        style={{ backgroundColor: col.hex }}
                      />
                      <span>{col.name}</span>
                      {designDraft.studioColors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStudioColorDraft(col.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={newStudioColorHex}
                    onChange={(e) => setNewStudioColorHex(e.target.value)}
                    className="h-9 w-11 cursor-pointer border bg-transparent"
                    style={{ borderColor: design.borderColor }}
                  />
                  <input
                    type="text"
                    value={newStudioColorName}
                    onChange={(e) => setNewStudioColorName(e.target.value)}
                    placeholder="اسم اللون الجديد"
                    className={`flex-1 min-w-[160px] border px-3 py-2 text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddStudioColorDraft}
                    className="mc-btn-sm flex items-center gap-1 px-3.5 py-2 text-xs font-semibold"
                    style={{ backgroundColor: design.bgColor, color: design.accentColor }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>إضافة لون</span>
                  </button>
                </div>
              </div>

              {/* Studio Garments Availability & Types */}
              <div
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold">
                      أنواع قطع استوديو التصميم (تيشيرتات · هوديات · سراويل · جوغرات)
                    </h3>
                    <p className="text-xs" style={{ color: design.mutedColor }}>
                      أخفِ القطع غير المتوفرة أو احذفها نهائياً أو أضف أنواعاً جديدة؛ التغيير ينعكس لحظياً للزبائن.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingStudioGarments}
                    onClick={handleRestoreStudioGarments}
                    className="mc-btn-sm flex items-center gap-1 px-3 py-1.5 text-xs"
                    style={{ backgroundColor: design.bgColor, color: design.textColor }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>استعادة الافتراضي</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGarmentCategoryFilter('all')}
                    className="border px-3 py-1 text-xs"
                    style={{
                      backgroundColor: garmentCategoryFilter === 'all' ? design.bgColor : 'transparent',
                      borderColor:
                        garmentCategoryFilter === 'all' ? design.accentColor : design.borderColor,
                    }}
                  >
                    الكل ({(designDraft.studioGarments || []).length})
                  </button>
                  {(['tshirts', 'hoodies', 'pants', 'joggers'] as GarmentCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGarmentCategoryFilter(cat)}
                      className="border px-3 py-1 text-xs"
                      style={{
                        backgroundColor:
                          garmentCategoryFilter === cat ? design.bgColor : 'transparent',
                        borderColor:
                          garmentCategoryFilter === cat ? design.accentColor : design.borderColor,
                      }}
                    >
                      {GARMENT_CATEGORY_LABELS[cat]} (
                      {(designDraft.studioGarments || []).filter((g) => g.category === cat).length})
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {(designDraft.studioGarments || [])
                    .filter(
                      (g) => garmentCategoryFilter === 'all' || g.category === garmentCategoryFilter
                    )
                    .map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between gap-2 border p-3 text-xs"
                        style={{
                          backgroundColor: design.bgColor,
                          borderColor: design.borderColor,
                          opacity: g.available ? 1 : 0.65,
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold">{g.label}</div>
                          <div className="truncate text-[11px]" style={{ color: design.mutedColor }}>
                            {GARMENT_CATEGORY_LABELS[g.category]} · {g.fabricNote}
                          </div>
                          <div className="mt-1 font-mono text-[11px]" style={{ color: design.accentColor }}>
                            {formatMoney(
                              g.prices[designDraft.defaultCurrency],
                              designDraft.defaultCurrency
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            disabled={savingStudioGarments}
                            onClick={() => handleToggleStudioGarment(g.id)}
                            className="mc-btn-sm flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold"
                            style={{
                              backgroundColor: g.available ? design.accentColor : '#5A1E28',
                              color: g.available ? accentText : '#FDECEC',
                            }}
                          >
                            {g.available ? (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                <span>متوفر</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3.5 w-3.5" />
                                <span>غير متوفر</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={savingStudioGarments}
                            onClick={() => handleRemoveStudioGarment(g.id)}
                            className="mc-btn-sm bg-red-900/80 p-1.5 text-red-100"
                            title="حذف نهائي"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                <div
                  className="grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-6"
                  style={{ borderColor: design.borderColor }}
                >
                  <select
                    value={newGarmentCat}
                    onChange={(e) => {
                      const cat = e.target.value as GarmentCategory;
                      setNewGarmentCat(cat);
                      const first = (
                        Object.keys(GARMENT_SILHOUETTE_LABELS) as GarmentSilhouette[]
                      ).find((s) => GARMENT_SILHOUETTE_LABELS[s].category === cat);
                      if (first) setNewGarmentSil(first);
                    }}
                    className={`border px-2.5 py-2 text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  >
                    {(['tshirts', 'hoodies', 'pants', 'joggers'] as GarmentCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {GARMENT_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newGarmentSil}
                    onChange={(e) => setNewGarmentSil(e.target.value as GarmentSilhouette)}
                    className={`border px-2.5 py-2 text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  >
                    {(Object.keys(GARMENT_SILHOUETTE_LABELS) as GarmentSilhouette[])
                      .filter((s) => GARMENT_SILHOUETTE_LABELS[s].category === newGarmentCat)
                      .map((sil) => (
                        <option key={sil} value={sil}>
                          {GARMENT_SILHOUETTE_LABELS[sil].label}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    value={newGarmentName}
                    onChange={(e) => setNewGarmentName(e.target.value)}
                    placeholder="اسم النوع الجديد"
                    className={`border px-3 py-2 text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  <input
                    type="text"
                    value={newGarmentNote}
                    onChange={(e) => setNewGarmentNote(e.target.value)}
                    placeholder="وصف القماش/القصة"
                    className={`border px-3 py-2 text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    value={newGarmentPrice}
                    onChange={(e) => setNewGarmentPrice(e.target.value)}
                    placeholder={`السعر (${CURRENCY_LABELS[designDraft.defaultCurrency]})`}
                    className={`border px-3 py-2 text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  <button
                    type="button"
                    disabled={savingStudioGarments || !newGarmentName.trim()}
                    onClick={handleAddStudioGarment}
                    className="mc-btn-sm flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: design.accentColor, color: accentText }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>إضافة نوع</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingDesign}
                  className="mc-btn px-6 py-3 text-sm font-bold"
                  style={{ backgroundColor: design.accentColor, color: accentText }}
                >
                  {savingDesign ? 'جاري النشر...' : 'حفظ ونشر الديزاين على المتجر'}
                </button>
              </div>
            </form>
          )}

          {/* 3. 69 Wilayas Delivery Tab */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <div
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold">أسعار التوصيل للولايات الـ 69</h2>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryDraft(buildDefaultDeliveryRates('DZD'))}
                      className="mc-btn-sm px-3 py-1.5 text-xs"
                      style={{ backgroundColor: design.bgColor, color: design.textColor }}
                    >
                      تعريفة افتراضية (دج)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryDraft(buildDefaultDeliveryRates('USD'))}
                      className="mc-btn-sm px-3 py-1.5 text-xs"
                      style={{ backgroundColor: design.bgColor, color: design.textColor }}
                    >
                      تعريفة افتراضية ($ / €)
                    </button>
                  </div>
                </div>

                {/* Bulk bar */}
                <div
                  className="grid grid-cols-1 gap-3 border p-3 sm:grid-cols-4"
                  style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                >
                  <input
                    type="number"
                    min={0}
                    value={bulkPostPrice}
                    onChange={(e) => setBulkPostPrice(e.target.value)}
                    placeholder="سعر المكتب البريدي"
                    className="border px-3 py-2 font-mono text-xs"
                    style={{
                      backgroundColor: design.surfaceColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    value={bulkHomePrice}
                    onChange={(e) => setBulkHomePrice(e.target.value)}
                    placeholder="سعر التوصيل للمنزل"
                    className="border px-3 py-2 font-mono text-xs"
                    style={{
                      backgroundColor: design.surfaceColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  <button
                    type="button"
                    onClick={applyBulkDelivery}
                    className="mc-btn-sm px-3 py-2 text-xs font-semibold sm:col-span-2"
                    style={{ backgroundColor: design.surfaceColor, color: design.accentColor }}
                  >
                    تطبيق السعر الموحد على جميع الولايات الـ 69
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search
                      className="absolute right-3 top-2.5 h-4 w-4"
                      style={{ color: design.mutedColor }}
                    />
                    <input
                      type="text"
                      value={deliverySearch}
                      onChange={(e) => setDeliverySearch(e.target.value)}
                      placeholder="ابحث برقم الولاية أو اسمها..."
                      className={`w-full border py-2 pr-9 pl-3 text-xs outline-none ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingDelivery}
                    onClick={handleSaveDeliveryRates}
                    className="mc-btn px-5 py-2 text-xs font-bold"
                    style={{ backgroundColor: design.accentColor, color: accentText }}
                  >
                    {savingDelivery ? 'جاري الحفظ...' : 'حفظ أسعار التوصيل'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {filteredWilayas.map((w) => {
                  const rate = deliveryDraft[w.code] || { postOfficePrice: 500, homePrice: 750 };
                  return (
                    <div
                      key={w.code}
                      className={`flex items-center justify-between gap-3 border p-3 ${radiusClass}`}
                      style={{
                        backgroundColor: design.surfaceColor,
                        borderColor: design.borderColor,
                      }}
                    >
                      <div className="text-xs font-bold">
                        <span className="font-mono" style={{ color: design.accentColor }}>
                          {w.code}
                        </span>{' '}
                        — {w.nameAr}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px]" style={{ color: design.mutedColor }}>
                          مكتب
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={rate.postOfficePrice}
                            onChange={(e) =>
                              setDeliveryDraft((prev) => ({
                                ...prev,
                                [w.code]: {
                                  ...rate,
                                  postOfficePrice: Math.max(0, Number(e.target.value) || 0),
                                },
                              }))
                            }
                            className="mr-1 w-20 border px-2 py-1 font-mono text-xs tabular-nums"
                            style={{
                              backgroundColor: design.bgColor,
                              color: design.textColor,
                              borderColor: design.borderColor,
                            }}
                          />
                        </label>
                        <label className="text-[11px]" style={{ color: design.mutedColor }}>
                          منزل
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={rate.homePrice}
                            onChange={(e) =>
                              setDeliveryDraft((prev) => ({
                                ...prev,
                                [w.code]: {
                                  ...rate,
                                  homePrice: Math.max(0, Number(e.target.value) || 0),
                                },
                              }))
                            }
                            className="mr-1 w-20 border px-2 py-1 font-mono text-xs tabular-nums"
                            style={{
                              backgroundColor: design.bgColor,
                              color: design.textColor,
                              borderColor: design.borderColor,
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. VIP Coupons & Requests Tab */}
          {activeTab === 'vip' && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateCoupon}
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h2 className="text-base font-bold">إنشاء كوبون زوار مقربين جديد</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="CODE20"
                    className={`border px-3 py-2 font-mono text-xs uppercase ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  <input
                    type="text"
                    value={newCouponDesc}
                    onChange={(e) => setNewCouponDesc(e.target.value)}
                    placeholder="وصف الكوبون"
                    className={`border px-3 py-2 text-xs sm:col-span-2 ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={80}
                    required
                    value={newCouponDiscount}
                    onChange={(e) => setNewCouponDiscount(e.target.value)}
                    placeholder="الخصم %"
                    className={`border px-3 py-2 font-mono text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      color: design.textColor,
                      borderColor: design.borderColor,
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="mc-btn px-5 py-2 text-xs font-bold"
                  style={{ backgroundColor: design.accentColor, color: accentText }}
                >
                  إنشاء الكوبون
                </button>

                <div className="space-y-2 border-t pt-4" style={{ borderColor: design.borderColor }}>
                  {vipCoupons.map((c) => (
                    <div
                      key={c.code}
                      className="flex flex-wrap items-center justify-between gap-3 border p-3 text-xs"
                      style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                    >
                      <div>
                        <span className="font-mono font-bold" style={{ color: design.accentColor }}>
                          {c.code}
                        </span>{' '}
                        · خصم {c.discountPercent}% ·{' '}
                        <span style={{ color: design.mutedColor }}>{c.description}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleCoupon(c.code)}
                          className="mc-btn-sm px-3 py-1 text-[11px]"
                          style={{
                            backgroundColor: c.active ? design.accentColor : design.surfaceColor,
                            color: c.active ? accentText : design.textColor,
                          }}
                        >
                          {c.active ? 'مفعّل' : 'متوقف'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCoupon(c.code)}
                          className="mc-btn-sm bg-red-950 px-3 py-1 text-[11px] text-red-200"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </form>

              <div
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-bold">طلبات الزوار المقربين ({vipRequests.length})</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'الكل' },
                        { id: 'pending', label: 'قيد المراجعة' },
                        { id: 'approved', label: 'المقبولون' },
                        { id: 'rejected', label: 'المرفوضة' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setVipFilter(f.id)}
                        className="mc-btn-sm px-3 py-1 text-xs"
                        style={{
                          backgroundColor:
                            vipFilter === f.id ? design.accentColor : design.bgColor,
                          color: vipFilter === f.id ? accentText : design.textColor,
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={vipSearch}
                  onChange={(e) => setVipSearch(e.target.value)}
                  placeholder="بحث بالاسم أو رمز الكوبون..."
                  className={`w-full border px-3 py-2 text-xs ${radiusClass}`}
                  style={{
                    backgroundColor: design.bgColor,
                    color: design.textColor,
                    borderColor: design.borderColor,
                  }}
                />

                {filteredVipRequests.length === 0 ? (
                  <div className="py-6 text-center text-xs" style={{ color: design.mutedColor }}>
                    لا توجد طلبات مطابقة حالياً.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredVipRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex flex-wrap items-center justify-between gap-3 border p-3.5 text-xs"
                        style={{
                          backgroundColor: design.bgColor,
                          borderColor: design.borderColor,
                        }}
                      >
                        <div className="space-y-1">
                          <div className="font-bold">
                            {req.fullName}{' '}
                            <span className="font-mono" style={{ color: design.accentColor }}>
                              ({req.couponCode} · {req.discountPercent}%)
                            </span>
                          </div>
                          {req.note && (
                            <div style={{ color: design.mutedColor }}>ملاحظة: {req.note}</div>
                          )}
                          <div style={{ color: design.mutedColor }}>
                            الحالة:{' '}
                            {req.status === 'approved'
                              ? 'مقبول'
                              : req.status === 'pending'
                                ? 'قيد المراجعة'
                                : req.status === 'revoked'
                                  ? 'ملغى'
                                  : 'مرفوض'}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {req.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleVipDecision(req.id, 'approved')}
                              className="mc-btn-sm px-3 py-1.5 text-xs font-bold"
                              style={{ backgroundColor: design.accentColor, color: accentText }}
                            >
                              قبول في القائمة
                            </button>
                          )}
                          {req.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleVipDecision(req.id, 'revoked')}
                              className="mc-btn-sm bg-amber-900 px-3 py-1.5 text-xs text-amber-100"
                            >
                              إلغاء العضوية
                            </button>
                          )}
                          {req.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleVipDecision(req.id, 'denied')}
                              className="mc-btn-sm bg-red-950 px-3 py-1.5 text-xs text-red-200"
                            >
                              رفض
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">طلبيات الملابس ({orders.length})</h2>
                {unsentOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => requestGmailSend(unsentOrders)}
                    className="mc-btn flex items-center gap-2 px-4 py-2 text-xs font-bold"
                    style={{ backgroundColor: design.accentColor, color: accentText }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>إرسال الطلبيات الجديدة إلى Gmail ({unsentOrders.length})</span>
                  </button>
                )}
              </div>

              {orders.length === 0 ? (
                <div
                  className={`border p-8 text-center text-sm ${radiusClass}`}
                  style={{
                    backgroundColor: design.surfaceColor,
                    borderColor: design.borderColor,
                    color: design.mutedColor,
                  }}
                >
                  لا توجد طلبيات مسجلة بعد.
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className={`border p-5 space-y-4 ${radiusClass}`}
                      style={{
                        backgroundColor: design.surfaceColor,
                        borderColor: design.borderColor,
                      }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3" style={{ borderColor: design.borderColor }}>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold" style={{ color: design.accentColor }}>
                              #{order.id}
                            </span>
                            <span
                              className="border px-2 py-0.5 text-[11px]"
                              style={{ borderColor: design.borderColor }}
                            >
                              {orderStatusLabel[order.status]}
                            </span>
                            {order.gmailSentAt && (
                              <span
                                className="flex items-center gap-1 border px-2 py-0.5 text-[11px]"
                                style={{
                                  borderColor: design.accentColor,
                                  color: design.accentColor,
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>تم الإرسال إلى Gmail</span>
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs" style={{ color: design.mutedColor }}>
                            العميل: <strong style={{ color: design.textColor }}>{order.customerName}</strong> ·
                            الهاتف: <span className="font-mono">{order.phone}</span>
                          </div>
                          <div className="mt-0.5 text-xs" style={{ color: design.mutedColor }}>
                            الولاية: {order.wilayaCode} — {order.wilayaName}
                            {order.commune ? ` · البلدية: ${order.commune}` : ''} ·{' '}
                            {order.deliveryMethod === 'post_office'
                              ? 'المكتب البريدي'
                              : 'التوصيل للمنزل'}
                            {' · '}العنوان: {order.address}
                          </div>
                          {order.notes && (
                            <div className="mt-0.5 text-xs" style={{ color: design.mutedColor }}>
                              ملاحظات: {order.notes}
                            </div>
                          )}
                        </div>

                        <div className="text-left font-mono">
                          <div className="text-base font-bold tabular-nums" style={{ color: design.accentColor }}>
                            {formatMoney(order.total, order.currency)}
                          </div>
                          <div className="text-[11px] tabular-nums" style={{ color: design.mutedColor }}>
                            توصيل: {formatMoney(order.deliveryFee, order.currency)}
                            {order.discountAmount > 0
                              ? ` · خصم: -${formatMoney(order.discountAmount, order.currency)}`
                              : ''}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={`${order.id}-${idx}`}
                            className="flex items-center justify-between gap-3 border p-2.5 text-xs"
                            style={{
                              backgroundColor: design.bgColor,
                              borderColor: design.borderColor,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {item.customSpec?.previewImage && (
                                <img
                                  src={item.customSpec.previewImage}
                                  alt={item.name}
                                  className="h-14 w-12 border object-cover"
                                  style={{ borderColor: design.borderColor }}
                                />
                              )}
                              <div>
                                <div className="font-bold">{item.name}</div>
                                <div style={{ color: design.mutedColor }}>
                                  المقاس: {item.size} · الكمية: {item.quantity}
                                  {item.customSpec && (
                                    <span>
                                      {' '}
                                      · اللون: {item.customSpec.colorName} (أمام:{' '}
                                      {item.customSpec.frontLayerCount} / خلف:{' '}
                                      {item.customSpec.backLayerCount}
                                      {item.customSpec.withHood === false ? ' · بدون قبعة' : ''}
                                      {item.customSpec.withAnkleCuffs === false
                                        ? ' · بدون مطاط قدمين'
                                        : item.customSpec.withAnkleCuffs === true
                                          ? ' · بمطاط قدمين'
                                          : ''}
                                      )
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="font-mono font-bold tabular-nums">
                              {formatMoney(item.unitPrice * item.quantity, item.currency)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleOrderStatus(order.id, 'approved')}
                            className="mc-btn-sm px-3 py-1.5 text-xs font-semibold"
                            style={{ backgroundColor: design.accentColor, color: accentText }}
                          >
                            الموافقة على الطلبية
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOrderStatus(order.id, 'completed')}
                            className="mc-btn-sm px-3 py-1.5 text-xs"
                            style={{ backgroundColor: design.bgColor, color: design.textColor }}
                          >
                            تحديد كمكتملة
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOrderStatus(order.id, 'rejected')}
                            className="mc-btn-sm bg-red-950 px-3 py-1.5 text-xs text-red-200"
                          >
                            رفض
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => requestGmailSend([order])}
                          className="mc-btn-sm flex items-center gap-1.5 px-3 py-1.5 text-xs"
                          style={{ backgroundColor: design.bgColor, color: design.accentColor }}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>إرسال إلى Gmail</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. Gmail Tab */}
          {activeTab === 'gmail' && (
            <div
              className={`border p-6 space-y-5 ${radiusClass}`}
              style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
            >
              <div>
                <h2 className="text-lg font-bold">ربط Gmail لإرسال إشعارات الطلبيات</h2>
                <p className="mt-1 text-xs sm:text-sm" style={{ color: design.mutedColor }}>
                  اربط حساب Google الخاص بك لإرسال ملخصات الطلبيات الجديدة مباشرة عبر Gmail API.
                </p>
              </div>

              {gmailAccount && gmailHasToken ? (
                <div
                  className="flex flex-wrap items-center justify-between gap-4 border p-4"
                  style={{ backgroundColor: design.bgColor, borderColor: design.accentColor }}
                >
                  <div>
                    <div className="text-xs font-bold" style={{ color: design.accentColor }}>
                      الحساب المتصل وجاهز للإرسال
                    </div>
                    <div className="mt-1 text-sm font-semibold">{gmailAccount.displayName}</div>
                    <div className="font-mono text-xs" dir="ltr" style={{ color: design.mutedColor }}>
                      {gmailAccount.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectGmail}
                    className="mc-btn-sm bg-red-950 px-4 py-2 text-xs text-red-200"
                  >
                    فصل الحساب
                  </button>
                </div>
              ) : (
                <div
                  className="space-y-3 border p-4"
                  style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                >
                  <div className="text-xs" style={{ color: design.mutedColor }}>
                    {gmailAccount
                      ? `الحساب (${gmailAccount.email}) مسجل، يرجى إعادة المصادقة لتنشيط صلاحية إرسال Gmail في الذاكرة.`
                      : 'لم يتم ربط حساب Google بعد.'}
                  </div>
                  <GoogleSignInButton onClick={handleConnectGmail} />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: design.mutedColor }}>
                  البريد الإلكتروني المستلم لإشعارات الطلبيات
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="orders@example.com"
                  className={`w-full max-w-md border px-3.5 py-2.5 font-mono text-xs outline-none ${radiusClass}`}
                  style={{
                    backgroundColor: design.bgColor,
                    color: design.textColor,
                    borderColor: design.borderColor,
                  }}
                />
              </div>

              {gmailError && (
                <div className="border border-red-500/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                  {gmailError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={unsentOrders.length === 0}
                  onClick={() => requestGmailSend(unsentOrders)}
                  className="mc-btn flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
                  style={{ backgroundColor: design.accentColor, color: accentText }}
                >
                  <Send className="h-4 w-4" />
                  <span>
                    إرسال الطلبيات الجديدة إلى Gmail ({unsentOrders.length})
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 7. Contact Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">رسائل التواصل ({contactMessages.length})</h2>
              {contactMessages.length === 0 ? (
                <div
                  className={`border p-8 text-center text-sm ${radiusClass}`}
                  style={{
                    backgroundColor: design.surfaceColor,
                    borderColor: design.borderColor,
                    color: design.mutedColor,
                  }}
                >
                  لا توجد رسائل واردة حالياً.
                </div>
              ) : (
                <div className="space-y-3">
                  {contactMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`border p-4 space-y-2 ${radiusClass}`}
                      style={{
                        backgroundColor: design.surfaceColor,
                        borderColor: msg.read ? design.borderColor : design.accentColor,
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{msg.senderName}</span>
                          <span
                            className="border px-2 py-0.5 text-[11px]"
                            style={{
                              borderColor: msg.read ? design.borderColor : design.accentColor,
                              color: msg.read ? design.mutedColor : design.accentColor,
                            }}
                          >
                            {msg.read ? 'تمت القراءة' : 'جديدة'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px]" style={{ color: design.mutedColor }}>
                          {msg.id} · {new Date(msg.createdAt).toLocaleString('ar-DZ')}
                        </span>
                      </div>
                      <div className="font-mono text-xs" style={{ color: design.accentColor }}>
                        وسيلة التواصل: {msg.contactInfo}
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: design.textColor }}>
                        {msg.message}
                      </p>
                      <div className="flex gap-2 pt-1">
                        {!msg.read && (
                          <button
                            type="button"
                            onClick={() => handleMarkMessageRead(msg.id)}
                            className="mc-btn-sm flex items-center gap-1 px-3 py-1 text-xs"
                            style={{ backgroundColor: design.bgColor, color: design.accentColor }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>تحديد كمقروءة</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="mc-btn-sm flex items-center gap-1 bg-red-950 px-3 py-1 text-xs text-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 8. Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              <div
                className={`border p-5 space-y-2 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h2 className="text-base font-bold">روابط الوصول المخفية</h2>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: design.mutedColor }}>
                  لوحة التحكم مخفية تماماً عن الزوار العاديين. يمكنك فتحها مباشرة عبر المسارات:{' '}
                  <span className="font-mono" dir="ltr" style={{ color: design.accentColor }}>
                    /admin
                  </span>{' '}
                  أو{' '}
                  <span className="font-mono" dir="ltr" style={{ color: design.accentColor }}>
                    /#admin
                  </span>{' '}
                  أو{' '}
                  <span className="font-mono" dir="ltr" style={{ color: design.accentColor }}>
                    /owner
                  </span>{' '}
                  أو عبر اختصار لوحة المفاتيح{' '}
                  <span className="font-mono" dir="ltr" style={{ color: design.accentColor }}>
                    Ctrl + Shift + O
                  </span>
                  .
                </p>
              </div>

              <form
                onSubmit={handleChangeOwnerPassword}
                className={`border p-5 space-y-4 ${radiusClass}`}
                style={{ backgroundColor: design.surfaceColor, borderColor: design.borderColor }}
              >
                <h3 className="text-base font-bold">تغيير كلمة مرور المالك</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      كلمة المرور الحالية
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs" style={{ color: design.mutedColor }}>
                      كلمة المرور الجديدة (4 أحرف على الأقل)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className={`w-full border px-3 py-2 text-sm ${radiusClass}`}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor,
                        borderColor: design.borderColor,
                      }}
                    />
                  </div>
                </div>

                {pwChangeErr && (
                  <div className="border border-red-500/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                    {pwChangeErr}
                  </div>
                )}
                {pwChangeMsg && (
                  <div
                    className="border px-3 py-2 text-xs"
                    style={{ borderColor: design.accentColor, color: design.accentColor }}
                  >
                    {pwChangeMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="mc-btn px-5 py-2.5 text-xs font-bold"
                  style={{ backgroundColor: design.accentColor, color: accentText }}
                >
                  تحديث كلمة المرور
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Explicit Gmail Send Confirmation Modal */}
      {pendingGmailOrders && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => !sendingGmail && setPendingGmailOrders(null)}
        >
          <div
            className={`w-full max-w-lg border p-6 shadow-2xl ${radiusClass}`}
            style={{
              backgroundColor: design.surfaceColor,
              color: design.textColor,
              borderColor: design.borderColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b pb-3" style={{ borderColor: design.borderColor }}>
              <h3 className="text-base font-bold">تأكيد الإرسال عبر Gmail</h3>
              <button
                type="button"
                disabled={sendingGmail}
                onClick={() => setPendingGmailOrders(null)}
                className="mc-btn-sm p-1.5"
                style={{ backgroundColor: design.bgColor, color: design.textColor }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <p style={{ color: design.mutedColor }}>
                سيتم إرسال <strong style={{ color: design.textColor }}>{pendingGmailOrders.length}</strong>{' '}
                طلبية إلى البريد:{' '}
                <span className="font-mono" dir="ltr" style={{ color: design.accentColor }}>
                  {recipientEmail.trim() || gmailAccount?.email}
                </span>
              </p>

              <div
                className="max-h-44 overflow-y-auto border p-3 space-y-1.5 font-mono text-xs"
                style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
              >
                {pendingGmailOrders.map((o) => (
                  <div key={o.id} className="flex justify-between">
                    <span>
                      #{o.id} — {o.customerName}
                    </span>
                    <span className="tabular-nums" style={{ color: design.accentColor }}>
                      {formatMoney(o.total, o.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {gmailError && (
                <div className="border border-red-500/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                  {gmailError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={sendingGmail}
                  onClick={() => setPendingGmailOrders(null)}
                  className="mc-btn-sm px-4 py-2 text-xs"
                  style={{ backgroundColor: design.bgColor, color: design.textColor }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={sendingGmail}
                  onClick={confirmAndSendGmail}
                  className="mc-btn px-5 py-2 text-xs font-bold"
                  style={{ backgroundColor: design.accentColor, color: accentText }}
                >
                  {sendingGmail ? 'جاري الإرسال...' : 'تأكيد الإرسال إلى Gmail'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
