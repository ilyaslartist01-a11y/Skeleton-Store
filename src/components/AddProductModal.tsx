import React, { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { PRESET_PRODUCT_IMAGES } from '../data/catalog.ts';
import {
  CURRENCY_LABELS,
  getContrastTextColor,
  getRadiusClass,
  PRODUCT_CATEGORIES,
  PRODUCT_SIZES,
  type CurrencyCode,
  type ProductRecord,
  type ProductSize,
  type SiteDesignConfig,
} from '../types.ts';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  design: SiteDesignConfig;
  ownerToken: string;
  editingProduct?: ProductRecord | null;
  onSaved: (products: ProductRecord[]) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  open,
  onClose,
  design,
  ownerToken,
  editingProduct = null,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [edition, setEdition] = useState('إصدار خاص');
  const [price, setPrice] = useState('450');
  const [currency, setCurrency] = useState<CurrencyCode>(design.defaultCurrency);
  const [lengthCm, setLengthCm] = useState('76');
  const [widthCm, setWidthCm] = useState('54');
  const [stock, setStock] = useState('10');
  const [sizes, setSizes] = useState<ProductSize[]>(['S', 'M', 'L', 'XL']);
  const [fabric, setFabric] = useState('');
  const [fit, setFit] = useState('');
  const [image, setImage] = useState<string>(PRESET_PRODUCT_IMAGES[0].url);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editingProduct) {
      setName(editingProduct.name);
      setSubtitle(editingProduct.subtitle);
      setCategory(editingProduct.category);
      setEdition(editingProduct.edition);
      setPrice(String(editingProduct.price));
      setCurrency(editingProduct.currency);
      setLengthCm(String(editingProduct.lengthCm));
      setWidthCm(String(editingProduct.widthCm));
      setStock(String(editingProduct.stock));
      setSizes(editingProduct.sizes);
      setFabric(editingProduct.fabric);
      setFit(editingProduct.fit);
      setImage(editingProduct.image);
      setDescription(editingProduct.description);
    } else {
      setName('');
      setSubtitle('');
      setCategory(PRODUCT_CATEGORIES[0]);
      setEdition('إصدار خاص');
      setPrice('450');
      setCurrency(design.defaultCurrency);
      setLengthCm('76');
      setWidthCm('54');
      setStock('10');
      setSizes(['S', 'M', 'L', 'XL']);
      setFabric('');
      setFit('');
      setImage(PRESET_PRODUCT_IMAGES[0].url);
      setDescription('');
    }
    setError('');
  }, [open, editingProduct, design.defaultCurrency]);

  if (!open) return null;

  const radiusClass = getRadiusClass(design.radiusStyle);
  const accentText = getContrastTextColor(design.accentColor);

  const toggleSize = (s: ProductSize) => {
    setSizes((prev) => {
      if (prev.includes(s)) {
        return prev.length > 1 ? prev.filter((item) => item !== s) : prev;
      }
      return [...prev, s];
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size >= 3 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 3 ميغابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result || ''));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name,
        subtitle,
        category,
        edition,
        price: Number(price),
        currency,
        lengthCm: Number(lengthCm),
        widthCm: Number(widthCm),
        stock: Number(stock),
        sizes,
        fabric,
        fit,
        image,
        description,
      };
      const url = editingProduct
        ? `/api/owner/products/${encodeURIComponent(editingProduct.id)}`
        : '/api/owner/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-owner-token': ownerToken,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر حفظ القطعة.');
      }
      onSaved(data.products);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`my-6 w-full max-w-3xl border p-6 shadow-2xl ${radiusClass}`}
        style={{
          backgroundColor: design.surfaceColor,
          color: design.textColor,
          borderColor: design.borderColor,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mb-5 flex items-center justify-between border-b pb-4"
          style={{ borderColor: design.borderColor }}
        >
          <h2 className="text-lg font-bold">
            {editingProduct ? `تعديل القطعة: ${editingProduct.name}` : 'إضافة قطعة ملابس جديدة'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="mc-btn-sm p-2"
            style={{ backgroundColor: design.bgColor, color: design.textColor }}
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                اسم القطعة *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: سترة كتان داكنة"
                className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                الاسم الفرعي
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="مثال: كتان بلجيكي · إصدار 04"
                className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                الفئة
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                الإصدار
              </label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="إصدار محدود · 10 قطع"
                className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                السعر *
              </label>
              <input
                type="number"
                min={1}
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`w-full border px-3 py-2 font-mono text-sm outline-none tabular-nums ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                العملة
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
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

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                الطول (سم)
              </label>
              <input
                type="number"
                min={10}
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                className={`w-full border px-3 py-2 font-mono text-sm outline-none tabular-nums ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                العرض (سم)
              </label>
              <input
                type="number"
                min={10}
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                className={`w-full border px-3 py-2 font-mono text-sm outline-none tabular-nums ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                العدد المتوفر
              </label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className={`w-full border px-3 py-2 font-mono text-sm outline-none tabular-nums ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: design.mutedColor }}>
              المقاسات المتاحة
            </label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_SIZES.map((s) => {
                const active = sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className="mc-btn-sm px-3.5 py-1.5 font-mono text-xs font-semibold"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                القماش
              </label>
              <input
                type="text"
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                placeholder="مثال: صوف ميرينو 100%"
                className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
                القصّة
              </label>
              <input
                type="text"
                value={fit}
                onChange={(e) => setFit(e.target.value)}
                placeholder="مثال: قصة مريحة منظمة"
                className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>
          </div>

          <div
            className={`border p-4 ${radiusClass}`}
            style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
          >
            <label className="mb-2 block text-xs font-medium" style={{ color: design.mutedColor }}>
              صورة القطعة (اختر من الجاهزة، ارفع ملفاً أقل من 3MB، أو أدخل رابطاً)
            </label>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {PRESET_PRODUCT_IMAGES.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setImage(preset.url)}
                  className="mc-btn-sm px-3 py-1.5 text-xs"
                  style={{
                    backgroundColor: image === preset.url ? design.accentColor : design.surfaceColor,
                    color: image === preset.url ? accentText : design.textColor,
                  }}
                >
                  {preset.label}
                </button>
              ))}
              <label
                className="mc-btn-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: design.surfaceColor, color: design.textColor }}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>رفع صورة من الجهاز</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                dir="ltr"
                value={image.startsWith('data:') ? '' : image}
                onChange={(e) => setImage(e.target.value)}
                placeholder={
                  image.startsWith('data:')
                    ? 'تم رفع صورة من الجهاز (Base64)'
                    : 'https://... أو /assets/...'
                }
                className={`flex-1 border px-3 py-2 font-mono text-xs outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.surfaceColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
              {image && (
                <img
                  src={image}
                  alt="معاينة"
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 border object-cover"
                  style={{ borderColor: design.borderColor }}
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: design.mutedColor }}>
              الوصف التفصيلي
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف الخامة والتفاصيل..."
              className={`w-full border px-3 py-2 text-sm outline-none ${radiusClass}`}
              style={{
                backgroundColor: design.bgColor,
                color: design.textColor,
                borderColor: design.borderColor,
              }}
            />
          </div>

          {error && (
            <div className="border border-red-500/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="mc-btn-sm px-4 py-2 text-xs font-medium"
              style={{ backgroundColor: design.bgColor, color: design.textColor }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="mc-btn px-6 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: design.accentColor, color: accentText }}
            >
              {saving ? 'جاري الحفظ...' : editingProduct ? 'حفظ التعديلات' : 'إضافة القطعة للمتجر'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
