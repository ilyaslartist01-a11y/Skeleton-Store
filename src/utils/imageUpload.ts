const LARGE_IMAGE_BYTES = 900 * 1024;
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.88;

export async function readHeroImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة صالح.');
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('حجم الصورة كبير جداً (الحد الأقصى 12 ميغابايت).');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
    reader.readAsDataURL(file);
  });

  if (file.size < LARGE_IMAGE_BYTES) {
    return rawDataUrl;
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('تعذر معالجة الصورة.'));
    image.src = rawDataUrl;
  });

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const targetWidth = Math.max(1, Math.round(img.width * scale));
  const targetHeight = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawDataUrl;

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  const compressed = canvas.toDataURL('image/webp', WEBP_QUALITY);
  return compressed.startsWith('data:image/webp') ? compressed : rawDataUrl;
}
