import React, { useState } from 'react';
import { CheckCircle2, Mail, MessageSquare, Phone, Send, X } from 'lucide-react';
import { getContrastTextColor, getRadiusClass, type SiteDesignConfig } from '../types.ts';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  design: SiteDesignConfig;
}

export const ContactModal: React.FC<ContactModalProps> = ({ open, onClose, design }) => {
  const [senderName, setSenderName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sentId, setSentId] = useState<string | null>(null);

  if (!open) return null;

  const radiusClass = getRadiusClass(design.radiusStyle);
  const accentText = getContrastTextColor(design.accentColor);
  const hasDirectChannels = Boolean(
    design.contactEmail || design.contactPhone || design.contactInstagram
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName, contactInfo, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر إرسال الرسالة.');
      }
      setSentId(data.message?.id || 'MSG-SENT');
      setSenderName('');
      setContactInfo('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الإرسال.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
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
        <div
          className="mb-5 flex items-center justify-between border-b pb-4"
          style={{ borderColor: design.borderColor }}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5" style={{ color: design.accentColor }} />
            <div>
              <h2 className="text-lg font-bold">التواصل معي</h2>
              <span className="minecraft-wordmark-sm text-[11px]">{design.brandName}</span>
            </div>
          </div>
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

        {hasDirectChannels && (
          <div
            className={`mb-5 space-y-2 border p-4 text-sm ${radiusClass}`}
            style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
          >
            <div className="text-xs font-semibold" style={{ color: design.accentColor }}>
              قنوات التواصل المباشرة
            </div>
            {design.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" style={{ color: design.mutedColor }} />
                <span className="font-mono text-xs" dir="ltr">
                  {design.contactEmail}
                </span>
              </div>
            )}
            {design.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" style={{ color: design.mutedColor }} />
                <span className="font-mono text-xs" dir="ltr">
                  {design.contactPhone}
                </span>
              </div>
            )}
            {design.contactInstagram && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: design.mutedColor }}>
                  إنستغرام:
                </span>
                <span className="font-mono text-xs" dir="ltr">
                  {design.contactInstagram}
                </span>
              </div>
            )}
          </div>
        )}

        {sentId ? (
          <div
            className={`border p-5 text-center ${radiusClass}`}
            style={{ backgroundColor: design.bgColor, borderColor: design.accentColor }}
          >
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10" style={{ color: design.accentColor }} />
            <h3 className="mb-1 text-base font-bold">تم استلام رسالتك بنجاح</h3>
            <p className="mb-3 text-sm" style={{ color: design.mutedColor }}>
              سيراجع المالك رسالتك ويرد عليك عبر وسيلة التواصل المرفقة.
            </p>
            <div className="mb-4 font-mono text-xs" style={{ color: design.accentColor }}>
              رقم المرجع: {sentId}
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setSentId(null)}
                className="mc-btn-sm px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: design.surfaceColor, color: design.textColor }}
              >
                إرسال رسالة أخرى
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mc-btn px-5 py-2 text-xs font-semibold"
                style={{ backgroundColor: design.accentColor, color: accentText }}
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: design.mutedColor }}>
                الاسم الكامل
              </label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="مثال: أمين بن علي"
                className={`w-full border px-3.5 py-2.5 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: design.mutedColor }}>
                وسيلة التواصل (هاتف / واتساب / بريد إلكتروني)
              </label>
              <input
                type="text"
                required
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="0550 00 00 00 أو example@email.com"
                className={`w-full border px-3.5 py-2.5 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: design.mutedColor }}>
                نص الرسالة
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب استفسارك حول المقاسات، التعديلات الخاصة، أو الطلبيات..."
                className={`w-full border px-3.5 py-2.5 text-sm outline-none ${radiusClass}`}
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

            <div className="flex justify-end gap-3 pt-1">
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
                disabled={submitting}
                className="mc-btn flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
                style={{ backgroundColor: design.accentColor, color: accentText }}
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'جاري الإرسال...' : 'إرسال الرسالة'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
