import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { getContrastTextColor, getRadiusClass, type SiteDesignConfig } from '../types.ts';

interface PrivacyPolicyModalProps {
  open: boolean;
  onClose: () => void;
  design: SiteDesignConfig;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  open,
  onClose,
  design,
}) => {
  if (!open) return null;

  const radiusClass = getRadiusClass(design.radiusStyle);
  const accentText = getContrastTextColor(design.accentColor);

  const clauses = [
    {
      title: '1. طبيعة المتجر الخاص وحصرية الوصول',
      body: `يعمل متجر ${design.brandName} بنظام العرض المباشر للإصدارات المختارة والتصاميم الشخصية، مع حصر امتيازات الكوبونات والخصومات الخاصة بالزوار المقربين المعتمدين.`,
    },
    {
      title: '2. البيانات المجموعة عند الطلب والتواصل',
      body: 'تُجمع فقط البيانات الضرورية لإتمام الطلبية وتوصيلها (الاسم الكامل، رقم الهاتف، الولاية، البلدية، والعنوان أو مكتب البريد)، إضافة إلى الاسم ورمز الكوبون في طلبات العضوية الخاصة.',
    },
    {
      title: '3. سرية المعلومات والتعمية',
      body: 'لا تتم مشاركة معلومات الزبائن أو طلباتهم مع أي طرف ثالث غير مرتبط بعملية التجهيز والشحن، وتُحفظ جلسات التحقق وإعدادات الإدارة بتعمية آمنة على الخادم.',
    },
    {
      title: '4. مراجعة المالك وتعديل البيانات',
      body: 'يخضع تفعيل كوبونات الزوار المقربين ومراجعة الطلبيات لموافقة مالك المتجر مباشرة، ويمكنكم التواصل عبر نافذة "التواصل معي" في أي وقت لتعديل أو إلغاء أي طلب قيد المراجعة.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl border p-6 shadow-2xl ${radiusClass}`}
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
            <ShieldCheck className="h-5 w-5" style={{ color: design.accentColor }} />
            <h2 className="text-lg font-bold">سياسة الخصوصية وشروط الوصول</h2>
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

        <div className="space-y-4">
          {clauses.map((clause) => (
            <div
              key={clause.title}
              className={`border p-4 ${radiusClass}`}
              style={{
                backgroundColor: design.bgColor,
                borderColor: design.borderColor,
              }}
            >
              <h3 className="mb-1.5 text-sm font-semibold" style={{ color: design.accentColor }}>
                {clause.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: design.mutedColor }}>
                {clause.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mc-btn px-6 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: design.accentColor, color: accentText }}
          >
            فهمت وأوافق
          </button>
        </div>
      </div>
    </div>
  );
};
