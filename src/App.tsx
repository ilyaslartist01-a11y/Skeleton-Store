import { useCallback, useEffect, useState } from 'react';
import { AddProductModal } from './components/AddProductModal.tsx';
import { ContactModal } from './components/ContactModal.tsx';
import { CustomStudioModal } from './components/CustomStudioModal.tsx';
import { OWNER_TOKEN_STORAGE_KEY, OwnerPortal } from './components/OwnerPortal.tsx';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal.tsx';
import { Storefront } from './components/Storefront.tsx';
import { VIP_TOKEN_STORAGE_KEY, VipJoinModal } from './components/VipJoinModal.tsx';
import { buildDefaultDeliveryRates } from './data/algeriaWilayas.ts';
import { DEFAULT_SITE_DESIGN, STORE_PRODUCTS } from './data/catalog.ts';
import type {
  CartItem,
  DeliveryRatesMap,
  OwnerTab,
  ProductRecord,
  SiteDesignConfig,
  StoreOrderRecord,
  VipRequestRecord,
} from './types.ts';
import { playMinecraftClickSound } from './utils/minecraftSound.ts';

function isHiddenAdminUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return (
    pathname === '/admin' ||
    pathname === '/owner' ||
    hash === '#admin' ||
    hash === '#owner'
  );
}

export default function App() {
  const [design, setDesign] = useState<SiteDesignConfig>(DEFAULT_SITE_DESIGN);
  const [products, setProducts] = useState<ProductRecord[]>(STORE_PRODUCTS);
  const [deliveryRates, setDeliveryRates] = useState<DeliveryRatesMap>(() =>
    buildDefaultDeliveryRates('DZD')
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [vipSession, setVipSession] = useState<VipRequestRecord | null>(null);
  const [recentOrders, setRecentOrders] = useState<StoreOrderRecord[]>([]);

  const [ownerConfigured, setOwnerConfigured] = useState<boolean>(true);
  const [ownerToken, setOwnerToken] = useState<string>(() =>
    typeof window !== 'undefined'
      ? sessionStorage.getItem(OWNER_TOKEN_STORAGE_KEY) || ''
      : ''
  );
  const [viewMode, setViewMode] = useState<'store' | 'owner'>(() =>
    isHiddenAdminUrl() ? 'owner' : 'store'
  );
  const [ownerTab, setOwnerTab] = useState<OwnerTab>('orders');

  // Modals
  const [customStudioOpen, setCustomStudioOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);

  // Sync URL navigation for hidden admin portal (/admin, /#admin, /owner, #owner)
  useEffect(() => {
    const syncFromUrl = () => {
      if (isHiddenAdminUrl()) {
        setViewMode('owner');
      }
    };
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener('hashchange', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener('hashchange', syncFromUrl);
    };
  }, []);

  // Global keyboard shortcut: Ctrl+Shift+O or Alt+Shift+O
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setViewMode((prev) => {
          const next = prev === 'store' ? 'owner' : 'store';
          if (next === 'owner') {
            window.history.replaceState(null, '', '/#admin');
          } else if (isHiddenAdminUrl()) {
            window.history.replaceState(null, '', '/');
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Global Minecraft click sound listener (capture phase)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        'button, a, [role="button"], [role="menuitem"], label.mc-btn, label.mc-btn-sm, input[type="checkbox"]'
      ) as HTMLElement | null;
      if (!interactive) return;
      if (
        (interactive as HTMLButtonElement | HTMLInputElement).disabled ||
        interactive.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }

      const isSoft =
        interactive.classList.contains('mc-btn-sm') ||
        interactive.getAttribute('role') === 'menuitem' ||
        interactive.matches('input[type="checkbox"]');
      playMinecraftClickSound(isSoft ? 'soft' : 'primary');
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, []);

  // Bootstrap store data & VIP session & owner status
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [bootRes, statusRes] = await Promise.all([
          fetch('/api/store/bootstrap'),
          fetch('/api/owner/status'),
        ]);
        if (bootRes.ok) {
          const boot = await bootRes.json();
          if (boot.design) setDesign(boot.design);
          if (Array.isArray(boot.products)) setProducts(boot.products);
          if (boot.deliveryRates) setDeliveryRates(boot.deliveryRates);
        }
        if (statusRes.ok) {
          const status = await statusRes.json();
          setOwnerConfigured(Boolean(status.ownerConfigured));
        }
      } catch {
        // ignore transient network errors
      }

      const savedVipToken = localStorage.getItem(VIP_TOKEN_STORAGE_KEY);
      if (savedVipToken) {
        try {
          const vipRes = await fetch('/api/vip/session', {
            headers: { 'x-vip-token': savedVipToken },
          });
          if (vipRes.ok) {
            const vipData = await vipRes.json();
            if (vipData.request) {
              setVipSession(vipData.request);
            }
          }
        } catch {
          // ignore
        }
      }
    };

    loadInitial();
  }, []);

  // Public WebSocket listener for live design, catalog, delivery & VIP status
  const vipTokenForWs = vipSession?.sessionToken || '';
  useEffect(() => {
    let closed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      if (closed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws?role=public&token=${encodeURIComponent(
        vipTokenForWs
      )}`;
      ws = new WebSocket(url);

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as { event: string; data: unknown };
          if (msg.event === 'store:design_updated') {
            setDesign(msg.data as SiteDesignConfig);
          } else if (msg.event === 'store:products_updated') {
            setProducts(msg.data as ProductRecord[]);
          } else if (msg.event === 'store:delivery_updated') {
            setDeliveryRates(msg.data as DeliveryRatesMap);
          } else if (msg.event === 'vip:status') {
            setVipSession(msg.data as VipRequestRecord);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [vipTokenForWs]);

  const handleAddToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      if (item.kind === 'catalog') {
        const existing = prev.find((c) => c.id === item.id);
        if (existing) {
          return prev.map((c) =>
            c.id === item.id
              ? { ...c, quantity: Math.min(Math.min(20, c.maxStock), c.quantity + item.quantity) }
              : c
          );
        }
      }
      return [...prev, item];
    });
  }, []);

  const handleUpdateCartQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            quantity: Math.min(Math.min(20, item.maxStock), nextQty),
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  }, []);

  const handleRemoveCartItem = useCallback((id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleOrderCreated = useCallback(
    (order: StoreOrderRecord, updatedProducts: ProductRecord[]) => {
      setCart([]);
      setProducts(updatedProducts);
      setRecentOrders((prev) => [order, ...prev]);
    },
    []
  );

  const handleOwnerLogout = useCallback(async () => {
    const token = ownerToken;
    sessionStorage.removeItem(OWNER_TOKEN_STORAGE_KEY);
    setOwnerToken('');
    setViewMode('store');
    if (isHiddenAdminUrl()) {
      window.history.replaceState(null, '', '/');
    }
    if (token) {
      fetch('/api/owner/logout', {
        method: 'POST',
        headers: { 'x-owner-token': token },
      }).catch(() => {});
    }
  }, [ownerToken]);

  const openOwnerPortal = useCallback((tab: OwnerTab = 'orders') => {
    setOwnerTab(tab);
    setViewMode('owner');
    window.history.replaceState(null, '', '/#admin');
  }, []);

  const exitToStore = useCallback(() => {
    setViewMode('store');
    if (isHiddenAdminUrl()) {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  const isOwnerAuthenticated = Boolean(ownerToken);

  return (
    <>
      {viewMode === 'owner' ? (
        <OwnerPortal
          ownerConfigured={ownerConfigured}
          ownerToken={ownerToken}
          activeTab={ownerTab}
          design={design}
          products={products}
          deliveryRates={deliveryRates}
          onTabChange={setOwnerTab}
          onAuthenticated={(token, configured) => {
            setOwnerToken(token);
            if (configured !== undefined) setOwnerConfigured(configured);
          }}
          onLogout={handleOwnerLogout}
          onExitToStore={exitToStore}
          onOpenAddProduct={(editing = null) => {
            setEditingProduct(editing);
            setAddProductModalOpen(true);
          }}
          onSyncFromServer={(payload) => {
            if (payload.design) setDesign(payload.design);
            if (payload.products) setProducts(payload.products);
            if (payload.deliveryRates) setDeliveryRates(payload.deliveryRates);
          }}
        />
      ) : (
        <Storefront
          design={design}
          products={products}
          deliveryRates={deliveryRates}
          cart={cart}
          vipSession={vipSession}
          recentOrders={recentOrders}
          isOwnerAuthenticated={isOwnerAuthenticated}
          ownerToken={ownerToken}
          onAddToCart={handleAddToCart}
          onUpdateCartQuantity={handleUpdateCartQuantity}
          onRemoveCartItem={handleRemoveCartItem}
          onOrderCreated={handleOrderCreated}
          onDesignUpdated={setDesign}
          onDeliveryRatesUpdated={setDeliveryRates}
          onOpenCustomStudio={() => setCustomStudioOpen(true)}
          onOpenVipModal={() => setVipModalOpen(true)}
          onOpenContactModal={() => setContactModalOpen(true)}
          onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
          onOpenOwnerPortal={openOwnerPortal}
          onOpenOwnerAddProduct={() => {
            setEditingProduct(null);
            setAddProductModalOpen(true);
          }}
        />
      )}

      {/* Global Shared Modals */}
      <CustomStudioModal
        open={customStudioOpen}
        onClose={() => setCustomStudioOpen(false)}
        design={design}
        isOwnerAuthenticated={isOwnerAuthenticated}
        ownerToken={ownerToken}
        onDesignUpdated={setDesign}
        onAddToCart={handleAddToCart}
      />

      <VipJoinModal
        open={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
        design={design}
        vipSession={vipSession}
        onVipSessionUpdated={setVipSession}
        onOpenPrivacy={() => {
          setVipModalOpen(false);
          setPrivacyModalOpen(true);
        }}
      />

      <ContactModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        design={design}
      />

      <PrivacyPolicyModal
        open={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        design={design}
      />

      {isOwnerAuthenticated && (
        <AddProductModal
          open={addProductModalOpen}
          onClose={() => {
            setAddProductModalOpen(false);
            setEditingProduct(null);
          }}
          design={design}
          ownerToken={ownerToken}
          editingProduct={editingProduct}
          onSaved={(updated) => setProducts(updated)}
        />
      )}
    </>
  );
}
