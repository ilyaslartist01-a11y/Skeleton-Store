import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  Eye,
  EyeOff,
  Layers,
  Palette,
  Plus,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DEFAULT_STUDIO_COLORS,
  DEFAULT_STUDIO_GARMENTS,
  GARMENT_CATEGORY_LABELS,
  GARMENT_SILHOUETTE_LABELS,
} from '../data/catalog.ts';
import {
  CURRENCY_LABELS,
  getContrastTextColor,
  getRadiusClass,
  PRODUCT_SIZES,
  type CartItem,
  type CustomLayer,
  type GarmentCategory,
  type GarmentSilhouette,
  type ProductSize,
  type SiteDesignConfig,
  type StudioColorOption,
  type StudioGarmentOption,
} from '../types.ts';
import { CustomGarmentSvg, renderCustomGarmentPreview } from './CustomGarmentSvg.tsx';

interface CustomStudioModalProps {
  open: boolean;
  onClose: () => void;
  design: SiteDesignConfig;
  isOwnerAuthenticated: boolean;
  ownerToken: string;
  onDesignUpdated: (design: SiteDesignConfig) => void;
  onAddToCart: (item: CartItem) => void;
}

const ORDERED_CATEGORIES: GarmentCategory[] = ['tshirts', 'hoodies', 'pants', 'joggers'];

export const CustomStudioModal: React.FC<CustomStudioModalProps> = ({
  open,
  onClose,
  design,
  isOwnerAuthenticated,
  ownerToken,
  onDesignUpdated,
  onAddToCart,
}) => {
  const studioColors =
    design.studioColors && design.studioColors.length > 0
      ? design.studioColors
      : DEFAULT_STUDIO_COLORS;

  const studioGarments = Array.isArray(design.studioGarments)
    ? design.studioGarments
    : DEFAULT_STUDIO_GARMENTS;

  const availableGarments = studioGarments.filter((g) => g.available);

  const [activeCategory, setActiveCategory] = useState<GarmentCategory>('tshirts');
  const [selectedGarmentId, setSelectedGarmentId] = useState<string>(
    availableGarments[0]?.id || 'custom-tshirt'
  );
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [selectedColorId, setSelectedColorId] = useState<string>(studioColors[0].id);
  const [selectedSize, setSelectedSize] = useState<ProductSize>('L');
  const [layers, setLayers] = useState<CustomLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [withHood, setWithHood] = useState<boolean>(true);
  const [withAnkleCuffs, setWithAnkleCuffs] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Owner inline studio color editor
  const [showColorEditor, setShowColorEditor] = useState(false);
  const [newColorHex, setNewColorHex] = useState('#4B6B38');
  const [colorSaveMsg, setColorSaveMsg] = useState('');

  // Owner inline garment types availability/removal editor
  const [showGarmentEditor, setShowGarmentEditor] = useState(false);
  const [editorCategoryFilter, setEditorCategoryFilter] = useState<GarmentCategory | 'all'>('all');
  const [newGarmentCategory, setNewGarmentCategory] = useState<GarmentCategory>('tshirts');
  const [newGarmentSilhouette, setNewGarmentSilhouette] =
    useState<GarmentSilhouette>('tshirt-oversize');
  const [newGarmentLabel, setNewGarmentLabel] = useState('');
  const [newGarmentFabric, setNewGarmentFabric] = useState('');
  const [newGarmentPrice, setNewGarmentPrice] = useState('50');
  const [garmentSaveMsg, setGarmentSaveMsg] = useState('');
  const [savingGarments, setSavingGarments] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    layerId: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    if (!studioColors.some((c) => c.id === selectedColorId)) {
      setSelectedColorId(studioColors[0].id);
    }
  }, [studioColors, selectedColorId]);

  useEffect(() => {
    if (availableGarments.length === 0) return;
    const current = availableGarments.find((g) => g.id === selectedGarmentId);
    if (!current) {
      const first = availableGarments[0];
      setSelectedGarmentId(first.id);
      setActiveCategory(first.category);
    } else if (current.category !== activeCategory) {
      // Keep activeCategory synced if user only had one category left
      const hasInActive = availableGarments.some((g) => g.category === activeCategory);
      if (!hasInActive) {
        setActiveCategory(current.category);
      }
    }
  }, [availableGarments, selectedGarmentId, activeCategory]);

  if (!open) return null;

  const radiusClass = getRadiusClass(design.radiusStyle);
  const accentText = getContrastTextColor(design.accentColor);
  const selectedColor =
    studioColors.find((c) => c.id === selectedColorId) || studioColors[0];

  const availableCategories = ORDERED_CATEGORIES.filter((cat) =>
    availableGarments.some((g) => g.category === cat)
  );
  const currentCategoryGarments = availableGarments.filter(
    (g) => g.category === activeCategory
  );
  const selectedGarment =
    availableGarments.find((g) => g.id === selectedGarmentId) ||
    currentCategoryGarments[0] ||
    availableGarments[0] ||
    null;

  const sideLayers = layers.filter((l) => l.side === side);
  const activeLayer = layers.find((l) => l.id === selectedLayerId) || null;

  const handleSelectCategory = (cat: GarmentCategory) => {
    setActiveCategory(cat);
    const firstInCat = availableGarments.find((g) => g.category === cat);
    if (firstInCat) {
      setSelectedGarmentId(firstInCat.id);
    }
  };

  const updateLayer = (id: string, patch: Partial<CustomLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const isBottom =
      selectedGarment?.category === 'pants' || selectedGarment?.category === 'joggers';
    const isHoodieBack = selectedGarment?.category === 'hoodies' && side === 'back';

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const src = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsDataURL(file);
      });
      if (!src) continue;

      const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newLayer: CustomLayer = {
        id,
        side,
        name: file.name.replace(/\.[^.]+$/, '') || 'تصميم',
        src,
        x: isBottom ? 36 : 50,
        y: isBottom ? 34 : isHoodieBack ? (withHood ? 56 : 43) : side === 'front' ? 43 : 42,
        scale: isBottom ? 18 : 30,
        rotation: 0,
        opacity: 1,
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(id);
    }
  };

  const handleRemoveLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>, layer: CustomLayer) => {
    e.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;

    setSelectedLayerId(layer.id);
    dragStateRef.current = {
      layerId: layer.id,
      pointerId: e.pointerId,
      offsetX: px - layer.x,
      offsetY: py - layer.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const stage = stageRef.current;
    if (!drag || !stage || drag.pointerId !== e.pointerId) return;
    const rect = stage.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100 - drag.offsetX;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100 - drag.offsetY;
    const clampedX = Math.max(12, Math.min(88, rawX));
    const clampedY = Math.max(14, Math.min(86, rawY));
    updateLayer(drag.layerId, { x: clampedX, y: clampedY });
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === e.pointerId) {
      dragStateRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const saveStudioColorsToServer = async (nextColors: StudioColorOption[]) => {
    if (!ownerToken) return;
    const res = await fetch('/api/owner/studio-colors', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-owner-token': ownerToken,
      },
      body: JSON.stringify({ studioColors: nextColors }),
    });
    const data = await res.json();
    if (res.ok && data.design) {
      onDesignUpdated(data.design);
      setColorSaveMsg('تم حفظ ألوان الاستوديو');
      setTimeout(() => setColorSaveMsg(''), 2500);
    }
  };

  const handleAddOwnerColor = async () => {
    const nextColor: StudioColorOption = {
      id: `color-${Date.now().toString(36)}`,
      name: newColorHex,
      hex: newColorHex,
    };
    const nextColors = [...studioColors, nextColor];
    setSelectedColorId(nextColor.id);
    await saveStudioColorsToServer(nextColors);
  };

  const handleDeleteOwnerColor = async (id: string) => {
    if (studioColors.length <= 1) return;
    const nextColors = studioColors.filter((c) => c.id !== id);
    await saveStudioColorsToServer(nextColors);
  };

  const saveStudioGarmentsToServer = async (
    nextGarments: StudioGarmentOption[],
    msg = 'تم تحديث قطع الاستوديو'
  ) => {
    if (!ownerToken) return;
    setSavingGarments(true);
    try {
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
        onDesignUpdated(data.design);
        setGarmentSaveMsg(msg);
        setTimeout(() => setGarmentSaveMsg(''), 2500);
      }
    } finally {
      setSavingGarments(false);
    }
  };

  const handleToggleGarmentAvailability = async (id: string) => {
    const target = studioGarments.find((g) => g.id === id);
    if (!target) return;
    const next = studioGarments.map((g) =>
      g.id === id ? { ...g, available: !g.available } : g
    );
    await saveStudioGarmentsToServer(
      next,
      target.available
        ? `تم إخفاء "${target.label}" لعدم توفره`
        : `تم تفعيل "${target.label}" في الاستوديو`
    );
  };

  const handleDeleteStudioGarment = async (id: string) => {
    const next = studioGarments.filter((g) => g.id !== id);
    await saveStudioGarmentsToServer(next, 'تمت إزالة النوع من الاستوديو');
  };

  const handleRestoreDefaultGarments = async () => {
    const existingMap = new Map(studioGarments.map((g) => [g.id, g]));
    const merged: StudioGarmentOption[] = DEFAULT_STUDIO_GARMENTS.map((def) =>
      existingMap.has(def.id) ? { ...existingMap.get(def.id)!, available: true } : def
    );
    for (const custom of studioGarments) {
      if (!DEFAULT_STUDIO_GARMENTS.some((d) => d.id === custom.id)) {
        merged.push(custom);
      }
    }
    await saveStudioGarmentsToServer(merged, 'تمت استعادة جميع الأنواع الافتراضية');
  };

  const handleAddOwnerGarment = async () => {
    const label = newGarmentLabel.trim();
    if (!label) return;
    const basePrice = Math.max(1, Number(newGarmentPrice) || 50);
    const prices =
      design.defaultCurrency === 'DZD'
        ? {
            DZD: basePrice,
            USD: Math.max(10, Math.round(basePrice / 88)),
            EUR: Math.max(10, Math.round(basePrice / 95)),
          }
        : design.defaultCurrency === 'EUR'
          ? {
              EUR: basePrice,
              USD: Math.round(basePrice * 1.08),
              DZD: Math.round(basePrice * 95),
            }
          : {
              USD: basePrice,
              EUR: Math.round(basePrice * 0.92),
              DZD: Math.round(basePrice * 88),
            };

    const newItem: StudioGarmentOption = {
      id: `custom-${newGarmentCategory}-${Date.now().toString(36)}`,
      category: newGarmentCategory,
      silhouette: newGarmentSilhouette,
      label,
      fabricNote: newGarmentFabric.trim() || 'قطن فاخر مختار بعناية',
      available: true,
      prices,
    };

    const next = [...studioGarments, newItem];
    setNewGarmentLabel('');
    setNewGarmentFabric('');
    setActiveCategory(newItem.category);
    setSelectedGarmentId(newItem.id);
    await saveStudioGarmentsToServer(next, `تمت إضافة "${newItem.label}"`);
  };

  const handleConfirmAddToCart = async () => {
    if (!selectedGarment) return;
    setSubmitting(true);
    try {
      const isHoodie = selectedGarment.category === 'hoodies';
      const isJogger = selectedGarment.category === 'joggers';
      const previewImage = await renderCustomGarmentPreview({
        garmentType: selectedGarment.id,
        silhouette: selectedGarment.silhouette,
        studioGarments,
        colorHex: selectedColor.hex,
        layers,
        preferredSide: side,
        withHood: isHoodie ? withHood : true,
        withAnkleCuffs: isJogger ? withAnkleCuffs : true,
      });

      const unitPrice = selectedGarment.prices[design.defaultCurrency];
      const frontCount = layers.filter((l) => l.side === 'front').length;
      const backCount = layers.filter((l) => l.side === 'back').length;
      const extraTag = isHoodie
        ? withHood
          ? ' · مع قبعة'
          : ' · بدون قبعة'
        : isJogger
          ? withAnkleCuffs
            ? ' · بمطاط عند القدمين'
            : ' · بدون مطاط عند القدمين'
          : '';

      onAddToCart({
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        kind: 'custom',
        productId: selectedGarment.id,
        name: `${selectedGarment.label} — تصميم شخصي`,
        subtitle: `${selectedColor.name} · مقاس ${selectedSize}${extraTag}`,
        image: previewImage,
        size: selectedSize,
        quantity: 1,
        unitPrice,
        currency: design.defaultCurrency,
        maxStock: 20,
        customSpec: {
          garmentType: selectedGarment.id,
          garmentLabel: selectedGarment.label,
          silhouette: selectedGarment.silhouette,
          ...(isHoodie ? { withHood } : {}),
          ...(isJogger ? { withAnkleCuffs } : {}),
          colorId: selectedColor.id,
          colorName: selectedColor.name,
          colorHex: selectedColor.hex,
          frontLayerCount: frontCount,
          backLayerCount: backCount,
          previewImage,
        },
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const categorySilhouettes = (
    Object.keys(GARMENT_SILHOUETTE_LABELS) as GarmentSilhouette[]
  ).filter((s) => GARMENT_SILHOUETTE_LABELS[s].category === newGarmentCategory);

  const editorGarments =
    editorCategoryFilter === 'all'
      ? studioGarments
      : studioGarments.filter((g) => g.category === editorCategoryFilter);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 px-3 pt-10 pb-10 sm:px-5 sm:pt-14 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-6xl border p-5 sm:p-6 shadow-2xl ${radiusClass}`}
        style={{
          backgroundColor: design.surfaceColor,
          color: design.textColor,
          borderColor: design.borderColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b pb-3.5"
          style={{ borderColor: design.borderColor }}
        >
          <div>
            <h2 className="text-lg sm:text-xl font-bold">استوديو التصميم الشخصي</h2>
            <p className="text-xs sm:text-sm" style={{ color: design.mutedColor }}>
              صمّم تيشيرتك أو الهودي أو السروال أو الجوغر الخاص بك وأضف شعاراتك وصورك على الجهتين مع معاينة فورية.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mc-btn-sm p-2"
            style={{ backgroundColor: design.bgColor, color: design.textColor }}
            aria-label="إغلاق الاستوديو"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-3 sm:pt-4 lg:grid-cols-12">
          {/* Interactive Stage Column */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Interactive Canvas Stage */}
            <div
              ref={stageRef}
              onClick={() => setSelectedLayerId(null)}
              className={`relative mx-auto aspect-[500/580] w-full max-w-[360px] sm:max-w-[390px] select-none overflow-hidden border touch-none ${radiusClass}`}
              style={{
                backgroundColor: design.bgColor,
                borderColor: design.borderColor,
              }}
            >
              {selectedGarment ? (
                <CustomGarmentSvg
                  garmentType={selectedGarment.id}
                  silhouette={selectedGarment.silhouette}
                  studioGarments={studioGarments}
                  side={side}
                  colorHex={selectedColor.hex}
                  showPrintGuide={true}
                  withHood={selectedGarment.category === 'hoodies' ? withHood : true}
                  withAnkleCuffs={selectedGarment.category === 'joggers' ? withAnkleCuffs : true}
                  className="pointer-events-none h-full w-full"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center p-6 text-center text-sm"
                  style={{ color: design.mutedColor }}
                >
                  لا توجد قطع متاحة حالياً للتصميم في الاستوديو.
                </div>
              )}

              {sideLayers.map((layer) => {
                const isSelected = layer.id === selectedLayerId;
                return (
                  <div
                    key={layer.id}
                    onPointerDown={(e) => handleStagePointerDown(e, layer)}
                    onPointerMove={handleStagePointerMove}
                    onPointerUp={handleStagePointerUp}
                    onPointerCancel={handleStagePointerUp}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      width: `${layer.scale}%`,
                      opacity: layer.opacity,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                    }}
                    className={`absolute cursor-grab active:cursor-grabbing ${
                      isSelected ? 'ring-2 ring-lime-400 ring-offset-2 ring-offset-black/40' : ''
                    }`}
                  >
                    <img
                      src={layer.src}
                      alt={layer.name}
                      draggable={false}
                      className="pointer-events-none block h-auto w-full select-none object-contain"
                    />
                  </div>
                );
              })}
            </div>

            {/* Side & Upload Bar placed directly below stage for effortless reach */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSide('front');
                    setSelectedLayerId(null);
                  }}
                  className="mc-btn-sm px-4 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: side === 'front' ? design.accentColor : design.bgColor,
                    color: side === 'front' ? accentText : design.textColor,
                  }}
                >
                  الواجهة الأمامية ({layers.filter((l) => l.side === 'front').length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSide('back');
                    setSelectedLayerId(null);
                  }}
                  className="mc-btn-sm px-4 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: side === 'back' ? design.accentColor : design.bgColor,
                    color: side === 'back' ? accentText : design.textColor,
                  }}
                >
                  الواجهة الخلفية ({layers.filter((l) => l.side === 'back').length})
                </button>
              </div>

              <label
                className="mc-btn inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: design.accentColor, color: accentText }}
              >
                <Upload className="h-4 w-4" />
                <span>إضافة صور / شعارات</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadFiles}
                  className="hidden"
                />
              </label>
            </div>

            {/* Contextual Garment Customization Toggles (Hood on Hoodies / Ankle Cuffs on Joggers) */}
            {selectedGarment &&
              (selectedGarment.category === 'hoodies' ||
                selectedGarment.category === 'joggers') && (
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 border px-3.5 py-2.5 text-xs ${radiusClass}`}
                  style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                >
                  {selectedGarment.category === 'hoodies' && (
                    <>
                      <span style={{ color: design.mutedColor }}>
                        خيار القبعة (يمكنك إزالتها لوضع التصميم في أي مكان بحرية):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWithHood(true)}
                          className="mc-btn-sm px-3 py-1.5 text-xs font-semibold"
                          style={{
                            backgroundColor: withHood ? design.accentColor : design.surfaceColor,
                            color: withHood ? accentText : design.textColor,
                          }}
                        >
                          مع قبعة
                        </button>
                        <button
                          type="button"
                          onClick={() => setWithHood(false)}
                          className="mc-btn-sm px-3 py-1.5 text-xs font-semibold"
                          style={{
                            backgroundColor: !withHood ? design.accentColor : design.surfaceColor,
                            color: !withHood ? accentText : design.textColor,
                          }}
                        >
                          إزالة القبعة
                        </button>
                      </div>
                    </>
                  )}

                  {selectedGarment.category === 'joggers' && (
                    <>
                      <span style={{ color: design.mutedColor }}>
                        مطاط القدمين في الأسفل حسب الطلب:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWithAnkleCuffs(true)}
                          className="mc-btn-sm px-3 py-1.5 text-xs font-semibold"
                          style={{
                            backgroundColor: withAnkleCuffs
                              ? design.accentColor
                              : design.surfaceColor,
                            color: withAnkleCuffs ? accentText : design.textColor,
                          }}
                        >
                          بمطاط عند القدمين
                        </button>
                        <button
                          type="button"
                          onClick={() => setWithAnkleCuffs(false)}
                          className="mc-btn-sm px-3 py-1.5 text-xs font-semibold"
                          style={{
                            backgroundColor: !withAnkleCuffs
                              ? design.accentColor
                              : design.surfaceColor,
                            color: !withAnkleCuffs ? accentText : design.textColor,
                          }}
                        >
                          إزالة المطاط (مفتوح)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            {/* Active Layer Editing Toolbar */}
            {activeLayer ? (
              <div
                className={`border p-4 space-y-3 ${radiusClass}`}
                style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold">
                    تعديل الطبقة: <span style={{ color: design.accentColor }}>{activeLayer.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateLayer(activeLayer.id, { x: 50 })}
                      className="mc-btn-sm flex items-center gap-1 px-2.5 py-1.5 text-[11px]"
                      style={{ backgroundColor: design.surfaceColor, color: design.textColor }}
                    >
                      <AlignCenter className="h-3.5 w-3.5" />
                      <span>توسيط</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveLayer(activeLayer.id)}
                      className="mc-btn-sm flex items-center gap-1 bg-red-900 px-2.5 py-1.5 text-[11px] text-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block text-xs">
                    <div className="mb-1 flex justify-between">
                      <span style={{ color: design.mutedColor }}>الحجم</span>
                      <span className="font-mono tabular-nums">{Math.round(activeLayer.scale)}%</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={65}
                      value={activeLayer.scale}
                      onChange={(e) =>
                        updateLayer(activeLayer.id, { scale: Number(e.target.value) })
                      }
                      className="w-full accent-lime-500"
                    />
                  </label>

                  <label className="block text-xs">
                    <div className="mb-1 flex justify-between">
                      <span style={{ color: design.mutedColor }}>التدوير</span>
                      <span className="font-mono tabular-nums">{activeLayer.rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={activeLayer.rotation}
                      onChange={(e) =>
                        updateLayer(activeLayer.id, { rotation: Number(e.target.value) })
                      }
                      className="w-full accent-lime-500"
                    />
                  </label>

                  <label className="block text-xs">
                    <div className="mb-1 flex justify-between">
                      <span style={{ color: design.mutedColor }}>الشفافية</span>
                      <span className="font-mono tabular-nums">
                        {Math.round(activeLayer.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={Math.round(activeLayer.opacity * 100)}
                      onChange={(e) =>
                        updateLayer(activeLayer.id, { opacity: Number(e.target.value) / 100 })
                      }
                      className="w-full accent-lime-500"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div
                className={`border p-3 text-center text-xs ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  borderColor: design.borderColor,
                  color: design.mutedColor,
                }}
              >
                {sideLayers.length > 0
                  ? 'انقر على أي صورة فوق القطعة لسحبها وتعديل حجمها أو تدويرها.'
                  : 'أضف صورة أو شعاراً ثم اسحبه بحرية فوق القطعة.'}
              </div>
            )}
          </div>

          {/* Configuration Column */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-5 pt-1">
            <div className="space-y-5">
              {/* 1. Garment Category & Subtype Selection */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold" style={{ color: design.mutedColor }}>
                    1. اختر نوع القطعة
                  </span>
                  {isOwnerAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setShowGarmentEditor((v) => !v)}
                      className="mc-btn-sm flex items-center gap-1 px-2.5 py-1 text-[11px]"
                      style={{ backgroundColor: design.bgColor, color: design.accentColor }}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>إدارة التوفر والأنواع</span>
                    </button>
                  )}
                </div>

                {/* Category Tabs */}
                {availableCategories.length > 0 ? (
                  <>
                    <div className="mb-3 grid grid-cols-4 gap-1.5">
                      {availableCategories.map((cat) => {
                        const active = activeCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleSelectCategory(cat)}
                            className="mc-btn-sm px-2 py-2 text-center text-xs font-bold"
                            style={{
                              backgroundColor: active ? design.accentColor : design.bgColor,
                              color: active ? accentText : design.textColor,
                            }}
                          >
                            {GARMENT_CATEGORY_LABELS[cat]}
                          </button>
                        );
                      })}
                    </div>

                    {/* Subtype Options for Active Category */}
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {currentCategoryGarments.map((item) => {
                        const active = selectedGarment?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedGarmentId(item.id)}
                            className="mc-btn p-3 text-right"
                            style={{
                              backgroundColor: active ? design.accentColor : design.bgColor,
                              color: active ? accentText : design.textColor,
                            }}
                          >
                            <div className="text-xs sm:text-sm font-bold">{item.label}</div>
                            <div className="mt-1 text-[11px] opacity-85 line-clamp-2">
                              {item.fabricNote}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div
                    className={`border p-4 text-center text-xs ${radiusClass}`}
                    style={{
                      backgroundColor: design.bgColor,
                      borderColor: design.borderColor,
                      color: design.mutedColor,
                    }}
                  >
                    جميع أنواع القطع غير متوفرة حالياً في الاستوديو.
                  </div>
                )}

                {/* Owner Inline Garment Availability & Removal Manager */}
                {isOwnerAuthenticated && showGarmentEditor && (
                  <div
                    className={`mt-3 space-y-3 border p-3 ${radiusClass}`}
                    style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold" style={{ color: design.accentColor }}>
                        إدارة توفر القطع في الاستوديو (للمالك)
                      </span>
                      <button
                        type="button"
                        disabled={savingGarments}
                        onClick={handleRestoreDefaultGarments}
                        className="mc-btn-sm flex items-center gap-1 px-2 py-1 text-[11px]"
                        style={{ backgroundColor: design.surfaceColor, color: design.textColor }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>استعادة الافتراضي</span>
                      </button>
                    </div>

                    {/* Filter tabs inside editor */}
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setEditorCategoryFilter('all')}
                        className="border px-2 py-1 text-[11px]"
                        style={{
                          borderColor:
                            editorCategoryFilter === 'all'
                              ? design.accentColor
                              : design.borderColor,
                          backgroundColor:
                            editorCategoryFilter === 'all'
                              ? design.surfaceColor
                              : 'transparent',
                        }}
                      >
                        الكل ({studioGarments.length})
                      </button>
                      {ORDERED_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setEditorCategoryFilter(cat)}
                          className="border px-2 py-1 text-[11px]"
                          style={{
                            borderColor:
                              editorCategoryFilter === cat
                                ? design.accentColor
                                : design.borderColor,
                            backgroundColor:
                              editorCategoryFilter === cat
                                ? design.surfaceColor
                                : 'transparent',
                          }}
                        >
                          {GARMENT_CATEGORY_LABELS[cat]} (
                          {studioGarments.filter((g) => g.category === cat).length})
                        </button>
                      ))}
                    </div>

                    {/* List of garment options with toggle availability + delete */}
                    <div className="max-h-56 space-y-1.5 overflow-y-auto pl-1">
                      {editorGarments.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between gap-2 border px-2.5 py-2 text-xs"
                          style={{
                            borderColor: design.borderColor,
                            backgroundColor: design.surfaceColor,
                            opacity: g.available ? 1 : 0.65,
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{g.label}</div>
                            <div
                              className="truncate text-[10px]"
                              style={{ color: design.mutedColor }}
                            >
                              {GARMENT_CATEGORY_LABELS[g.category]} · {g.fabricNote}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              disabled={savingGarments}
                              onClick={() => handleToggleGarmentAvailability(g.id)}
                              className="mc-btn-sm flex items-center gap-1 px-2 py-1 text-[10px] font-semibold"
                              style={{
                                backgroundColor: g.available ? design.accentColor : '#5A1E28',
                                color: g.available ? accentText : '#FDECEC',
                              }}
                              title={
                                g.available
                                  ? 'متوفر — انقر لإزالته لعدم التوفر'
                                  : 'غير متوفر — انقر لإظهاره'
                              }
                            >
                              {g.available ? (
                                <>
                                  <Eye className="h-3 w-3" />
                                  <span>متوفر</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-3 w-3" />
                                  <span>مُزال</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={savingGarments}
                              onClick={() => handleDeleteStudioGarment(g.id)}
                              className="p-1 text-red-400 hover:text-red-300"
                              aria-label="حذف نهائي"
                              title="حذف نهائي"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add New Custom Garment Type */}
                    <div
                      className="space-y-2 border-t pt-2.5"
                      style={{ borderColor: design.borderColor }}
                    >
                      <div className="text-[11px] font-semibold" style={{ color: design.mutedColor }}>
                        إضافة نوع قطعة جديد
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newGarmentCategory}
                          onChange={(e) => {
                            const cat = e.target.value as GarmentCategory;
                            setNewGarmentCategory(cat);
                            const firstSil = (
                              Object.keys(GARMENT_SILHOUETTE_LABELS) as GarmentSilhouette[]
                            ).find((s) => GARMENT_SILHOUETTE_LABELS[s].category === cat);
                            if (firstSil) setNewGarmentSilhouette(firstSil);
                          }}
                          className="border px-2 py-1.5 text-xs"
                          style={{
                            backgroundColor: design.surfaceColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        >
                          {ORDERED_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {GARMENT_CATEGORY_LABELS[cat]}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newGarmentSilhouette}
                          onChange={(e) =>
                            setNewGarmentSilhouette(e.target.value as GarmentSilhouette)
                          }
                          className="border px-2 py-1.5 text-xs"
                          style={{
                            backgroundColor: design.surfaceColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        >
                          {categorySilhouettes.map((sil) => (
                            <option key={sil} value={sil}>
                              قالب: {GARMENT_SILHOUETTE_LABELS[sil].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={newGarmentLabel}
                          onChange={(e) => setNewGarmentLabel(e.target.value)}
                          placeholder="اسم النوع (مثلاً: تيشيرت فينتاج)"
                          className="col-span-2 border px-2.5 py-1.5 text-xs"
                          style={{
                            backgroundColor: design.surfaceColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        />
                        <input
                          type="number"
                          min={1}
                          value={newGarmentPrice}
                          onChange={(e) => setNewGarmentPrice(e.target.value)}
                          placeholder={`السعر (${CURRENCY_LABELS[design.defaultCurrency]})`}
                          className="border px-2 py-1.5 text-xs"
                          style={{
                            backgroundColor: design.surfaceColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newGarmentFabric}
                          onChange={(e) => setNewGarmentFabric(e.target.value)}
                          placeholder="وصف القماش أو القصة (اختياري)"
                          className="flex-1 border px-2.5 py-1.5 text-xs"
                          style={{
                            backgroundColor: design.surfaceColor,
                            color: design.textColor,
                            borderColor: design.borderColor,
                          }}
                        />
                        <button
                          type="button"
                          disabled={savingGarments || !newGarmentLabel.trim()}
                          onClick={handleAddOwnerGarment}
                          className="mc-btn-sm flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                          style={{ backgroundColor: design.accentColor, color: accentText }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>إضافة</span>
                        </button>
                      </div>
                    </div>

                    {garmentSaveMsg && (
                      <div className="text-[11px]" style={{ color: design.accentColor }}>
                        {garmentSaveMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Studio Colors (Swatches only, no color names) */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: design.mutedColor }}>
                    2. اختر اللون
                  </span>
                  {isOwnerAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setShowColorEditor((v) => !v)}
                      className="mc-btn-sm flex items-center gap-1 px-2.5 py-1 text-[11px]"
                      style={{ backgroundColor: design.bgColor, color: design.accentColor }}
                    >
                      <Palette className="h-3.5 w-3.5" />
                      <span>تحكم بالألوان</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {studioColors.map((col) => {
                    const active = col.id === selectedColor.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setSelectedColorId(col.id)}
                        aria-label={col.name}
                        className="mc-btn-sm h-10 w-10 p-0"
                        style={{
                          backgroundColor: col.hex,
                          outline: active ? `2px solid ${design.accentColor}` : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    );
                  })}
                </div>

                {isOwnerAuthenticated && showColorEditor && (
                  <div
                    className={`mt-3 space-y-3 border p-3 ${radiusClass}`}
                    style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                  >
                    <div className="text-xs font-semibold" style={{ color: design.accentColor }}>
                      إدارة ألوان الاستوديو (للمالك)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {studioColors.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-1.5 border p-1"
                          style={{ borderColor: design.borderColor }}
                        >
                          <span
                            className="h-5 w-5 border border-black/40"
                            style={{ backgroundColor: c.hex }}
                          />
                          {studioColors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOwnerColor(c.id)}
                              className="px-1 text-xs text-red-400 hover:text-red-300"
                              aria-label="حذف اللون"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="h-9 w-12 cursor-pointer border bg-transparent p-0.5"
                        style={{ borderColor: design.borderColor }}
                      />
                      <button
                        type="button"
                        onClick={handleAddOwnerColor}
                        className="mc-btn-sm flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                        style={{ backgroundColor: design.accentColor, color: accentText }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>إضافة لون</span>
                      </button>
                    </div>
                    {colorSaveMsg && (
                      <div className="text-[11px]" style={{ color: design.accentColor }}>
                        {colorSaveMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Size Selection */}
              <div>
                <div className="mb-2 text-xs font-semibold" style={{ color: design.mutedColor }}>
                  3. المقاس
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_SIZES.map((s) => {
                    const active = selectedSize === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className="mc-btn-sm px-4 py-2 font-mono text-xs font-bold"
                        style={{
                          backgroundColor: active ? design.accentColor : design.bgColor,
                          color: active ? accentText : design.textColor,
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Layers List on Current Side */}
              {sideLayers.length > 0 && (
                <div
                  className={`border p-3 ${radiusClass}`}
                  style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
                >
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
                    <Layers className="h-3.5 w-3.5" style={{ color: design.accentColor }} />
                    <span>طبقات {side === 'front' ? 'الواجهة الأمامية' : 'الواجهة الخلفية'}</span>
                  </div>
                  <div className="space-y-1.5">
                    {sideLayers.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLayerId(l.id)}
                        className="flex cursor-pointer items-center justify-between border px-2.5 py-1.5 text-xs"
                        style={{
                          borderColor:
                            selectedLayerId === l.id ? design.accentColor : design.borderColor,
                          backgroundColor: design.surfaceColor,
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img src={l.src} alt="" className="h-6 w-6 object-contain" />
                          <span className="truncate">{l.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLayer(l.id);
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4" style={{ borderColor: design.borderColor }}>
              <button
                type="button"
                disabled={submitting || !selectedGarment}
                onClick={handleConfirmAddToCart}
                className="mc-btn flex w-full items-center justify-center gap-2 py-3.5 text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: design.accentColor, color: accentText }}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>
                  {submitting ? 'جاري تجهيز المعاينة...' : 'أضف التصميم إلى الحقيبة'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
