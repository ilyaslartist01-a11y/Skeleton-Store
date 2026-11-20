import React, { useState } from 'react';
import { CheckCircle2, Clock, Crown, ShieldAlert, X } from 'lucide-react';
import {
  getContrastTextColor,
  getRadiusClass,
  type SiteDesignConfig,
  type VipRequestRecord,
} from '../types.ts';

export const VIP_TOKEN_STORAGE_KEY = 'skeleton_store_vip_token';

interface VipJoinModalProps {
  open: boolean;
  onClose: () => void;
  design: SiteDesignConfig;
  vipSession: VipRequestRecord | null;
  onVipSessionUpdated: (req: VipRequestRecord | null) => void;
  onOpenPrivacy: () => void;
}

export const VipJoinModal: React.FC<VipJoinModalProps> = ({
  open,
  onClose,
  design,
  vipSession,
  onVipSessionUpdated,
  onOpenPrivacy,
}) => {
  const [fullName, setFullName] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [note, setNote] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const radiusClass = getRadiusClass(design.radiusStyle);
  const accentText = getContrastTextColor(design.accentColor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/vip-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          couponCode,
          note,
          acceptedPolicy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر تسجيل طلب الكوبون.');
      }
      const req = data.request as VipRequestRecord;
      localStorage.setItem(VIP_TOKEN_STORAGE_KEY, req.sessionToken);
      onVipSessionUpdated(req);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSession = () => {
    localStorage.removeItem(VIP_TOKEN_STORAGE_KEY);
    onVipSessionUpdated(null);
    setCouponCode('');
    setError('');
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
            <Crown className="h-5 w-5" style={{ color: design.accentColor }} />
            <h2 className="text-lg font-bold">كوبون الزوار المقربين (VIP)</h2>
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

        {vipSession ? (
          <div className="space-y-4">
            {vipSession.status === 'pending' && (
              <div
                className={`border p-5 ${radiusClass}`}
                style={{ backgroundColor: design.bgColor, borderColor: design.borderColor }}
              >
                <div className="mb-2 flex items-center gap-2 text-amber-300">
                  <Clock className="h-5 w-5" />
                  <span className="font-bold">طلبك قيد المراجعة المباشرة</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
                  مرحباً <strong style={{ color: design.textColor }}>{vipSession.fullName}</strong>، تم إرسال
                  الكوبون <span className="font-mono">{vipSession.couponCode}</span> إلى مالك المتجر. سيتم
                  تحديث هذه الصفحة تلقائياً فور الموافقة على عضويتك.
                </p>
              </div>
            )}

            {vipSession.status === 'approved' && (
              <div
                className={`border p-5 ${radiusClass}`}
                style={{ backgroundColor: design.bgColor, borderColor: design.accentColor }}
              >
                <div className="mb-2 flex items-center gap-2" style={{ color: design.accentColor }}>
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-bold">عضوية الزوار المقربين مفعّلة</span>
                </div>
                <p className="mb-3 text-sm leading-relaxed" style={{ color: design.mutedColor }}>
                  أهلاً بك <strong style={{ color: design.textColor }}>{vipSession.fullName}</strong>. تم قبول
                  الكوبون <span className="font-mono">{vipSession.couponCode}</span> وتفعيل خصم حصري بنسبة{' '}
                  <strong style={{ color: design.accentColor }} className="font-mono">
                    {vipSession.discountPercent}%
                  </strong>{' '}
                  يُطبق تلقائياً في حقيبة المشتريات.
                </p>
              </div>
            )}

            {(vipSession.status === 'denied' || vipSession.status === 'revoked') && (
              <div
                className={`border border-red-500/50 bg-red-950/30 p-5 ${radiusClass}`}
              >
                <div className="mb-2 flex items-center gap-2 text-red-300">
                  <ShieldAlert className="h-5 w-5" />
                  <span className="font-bold">
                    {vipSession.status === 'revoked' ? 'تم إلغاء العضوية' : 'تم رفض الطلب'}
                  </span>
                </div>
                <p className="text-sm text-red-200/90">
                  لم يتم تفعيل الكوبون <span className="font-mono">{vipSession.couponCode}</span> لهذه الجلسة.
                  يمكنك المحاولة مجدداً برمز كوبون آخر صالح.
                </p>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetSession}
                className="mc-btn-sm px-4 py-2 text-xs font-medium"
                style={{ backgroundColor: design.bgColor, color: design.textColor }}
              >
                المحاولة بكوبون آخر
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mc-btn px-5 py-2 text-sm font-semibold"
                style={{ backgroundColor: design.accentColor, color: accentText }}
              >
                متابعة التسوق
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
              أدخل اسمك ورمز الكوبون الخاص بالزوار المقربين لتفعيل خصمك الشخصي فور موافقة المالك.
            </p>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: design.mutedColor }}>
                الاسم الكامل
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم واللقب"
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
                رمز الكوبون
              </label>
              <input
                type="text"
                required
                dir="ltr"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="مثال: SKELETON20"
                className={`w-full border px-3.5 py-2.5 font-mono text-sm uppercase outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: design.mutedColor }}>
                ملاحظة للمالك (اختياري)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="رسالة قصيرة للتعريف..."
                className={`w-full border px-3.5 py-2.5 text-sm outline-none ${radiusClass}`}
                style={{
                  backgroundColor: design.bgColor,
                  color: design.textColor,
                  borderColor: design.borderColor,
                }}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-xs">
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={(e) => setAcceptedPolicy(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-lime-500"
              />
              <span style={{ color: design.mutedColor }}>
                أوافق على{' '}
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="underline"
                  style={{ color: design.accentColor }}
                >
                  سياسة الخصوصية وشروط الوصول
                </button>{' '}
                الخاصة بالمتجر.
              </span>
            </label>

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
                className="mc-btn px-5 py-2.5 text-sm font-semibold"
                style={{ backgroundColor: design.accentColor, color: accentText }}
              >
                {submitting ? 'جاري التحقق...' : 'تقديم طلب الانضمام'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
