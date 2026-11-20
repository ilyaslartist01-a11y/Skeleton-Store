import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { CURRENCY_LABELS, formatMoney, type StoreOrderRecord } from '../types.ts';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface GmailAccountInfo {
  email: string;
  displayName: string;
  photoURL?: string;
}

export function initGmailAuth(
  onSignedIn?: (account: GmailAccountInfo, hasToken: boolean) => void,
  onSignedOut?: () => void
): () => void {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      onSignedIn?.(
        {
          email: user.email || '',
          displayName: user.displayName || user.email || 'حساب Google',
          photoURL: user.photoURL || undefined,
        },
        Boolean(cachedAccessToken)
      );
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      onSignedOut?.();
    }
  });
}

export async function connectGmailAccount(): Promise<{
  account: GmailAccountInfo;
  accessToken: string;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم الحصول على رمز صلاحية إرسال Gmail من Google.');
    }
    cachedAccessToken = credential.accessToken;
    return {
      account: {
        email: result.user.email || '',
        displayName: result.user.displayName || result.user.email || 'حساب Google',
        photoURL: result.user.photoURL || undefined,
      },
      accessToken: cachedAccessToken,
    };
  } finally {
    isSigningIn = false;
  }
}

export async function disconnectGmailAccount(): Promise<void> {
  cachedAccessToken = null;
  await auth.signOut();
}

export function getCachedGmailAccessToken(): string | null {
  return cachedAccessToken;
}

function toBase64UrlUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeMimeHeaderUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOrdersEmailHtml(orders: StoreOrderRecord[], brandName: string): string {
  const orderBlocks = orders
    .map((order) => {
      const deliveryLabel =
        order.deliveryMethod === 'post_office' ? 'المكتب البريدي' : 'التوصيل للمنزل';
      const itemsRows = order.items
        .map((item) => {
          const hoodText =
            item.customSpec?.withHood === false ? ' · بدون قبعة' : '';
          const cuffText =
            item.customSpec?.withAnkleCuffs === false
              ? ' · بدون مطاط قدمين'
              : item.customSpec?.withAnkleCuffs === true
                ? ' · بمطاط قدمين'
                : '';
          const customNote = item.customSpec
            ? ` (تصميم مخصص · اللون: ${escapeHtml(item.customSpec.colorName)} · أمام: ${item.customSpec.frontLayerCount} / خلف: ${item.customSpec.backLayerCount}${hoodText}${cuffText})`
            : '';
          return `
            <tr>
              <td style="padding:8px 10px;border-bottom:1px solid #34402C;">${escapeHtml(item.name)}${customNote}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #34402C;text-align:center;">${escapeHtml(item.size)}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #34402C;text-align:center;">${item.quantity}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #34402C;text-align:left;font-family:monospace;">${escapeHtml(formatMoney(item.unitPrice * item.quantity, item.currency))}</td>
            </tr>
          `;
        })
        .join('');

      return `
        <div style="margin-bottom:24px;border:1px solid #34402C;background:#1E241A;padding:18px;color:#F2ECE0;">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #34402C;padding-bottom:10px;margin-bottom:12px;">
            <strong style="font-size:16px;color:#6BB83B;">طلب رقم #${escapeHtml(order.id)}</strong>
            <span style="font-size:12px;color:#B0B5A6;">${new Date(order.createdAt).toLocaleString('ar-DZ')}</span>
          </div>
          <p style="margin:4px 0;"><strong>العميل:</strong> ${escapeHtml(order.customerName)}</p>
          <p style="margin:4px 0;"><strong>الهاتف:</strong> ${escapeHtml(order.phone)}</p>
          <p style="margin:4px 0;"><strong>الولاية:</strong> ${escapeHtml(order.wilayaCode)} — ${escapeHtml(order.wilayaName)} ${order.commune ? `(${escapeHtml(order.commune)})` : ''}</p>
          <p style="margin:4px 0;"><strong>طريقة التوصيل:</strong> ${deliveryLabel} — ${escapeHtml(order.address)}</p>
          ${order.notes ? `<p style="margin:4px 0;"><strong>ملاحظات:</strong> ${escapeHtml(order.notes)}</p>` : ''}
          <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:13px;">
            <thead>
              <tr style="background:#141812;color:#B0B5A6;">
                <th style="padding:8px 10px;text-align:right;">القطعة</th>
                <th style="padding:8px 10px;text-align:center;">المقاس</th>
                <th style="padding:8px 10px;text-align:center;">الكمية</th>
                <th style="padding:8px 10px;text-align:left;">المبلغ</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid #34402C;font-size:14px;">
            <div>المجموع الفرعي: <strong>${escapeHtml(formatMoney(order.subtotal, order.currency))}</strong></div>
            ${
              order.discountAmount > 0
                ? `<div style="color:#6BB83B;">خصم كوبون المقربين (${order.discountPercent}%): -${escapeHtml(formatMoney(order.discountAmount, order.currency))}</div>`
                : ''
            }
            <div>رسوم التوصيل: <strong>${escapeHtml(formatMoney(order.deliveryFee, order.currency))}</strong></div>
            <div style="font-size:16px;margin-top:6px;color:#6BB83B;">الإجمالي النهائي: <strong>${escapeHtml(formatMoney(order.total, order.currency))}</strong> (${CURRENCY_LABELS[order.currency]})</div>
          </div>
        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:24px;background:#141812;color:#F2ECE0;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;">
    <div style="max-width:680px;margin:0 auto;">
      <h2 style="color:#6BB83B;margin-top:0;">${escapeHtml(brandName)} — إشعار طلبيات المتجر</h2>
      <p style="color:#B0B5A6;">عدد الطلبيات المرفقة: ${orders.length}</p>
      ${orderBlocks}
    </div>
  </body>
</html>`;
}

export async function sendOrdersViaGmail(params: {
  recipientEmail: string;
  orders: StoreOrderRecord[];
  brandName: string;
}): Promise<void> {
  const token = cachedAccessToken;
  if (!token) {
    throw new Error('يرجى ربط حساب Google أولاً عبر زر Sign in with Google.');
  }
  const to = params.recipientEmail.trim();
  if (!to) {
    throw new Error('يرجى إدخال البريد الإلكتروني المستلم.');
  }

  const subject =
    params.orders.length === 1
      ? `${params.brandName} — طلبية جديدة #${params.orders[0].id}`
      : `${params.brandName} — ملخص ${params.orders.length} طلبيات جديدة`;

  const htmlBody = buildOrdersEmailHtml(params.orders, params.brandName);
  const rawMime = [
    `To: ${to}`,
    `Subject: ${encodeMimeHeaderUtf8(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(
      Array.from(new TextEncoder().encode(htmlBody), (byte) =>
        String.fromCharCode(byte)
      ).join('')
    ),
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: toBase64UrlUtf8(rawMime),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      cachedAccessToken = null;
      throw new Error('انتهت صلاحية جلسة Google أو تنقصها صلاحية Gmail. يرجى إعادة ربط الحساب.');
    }
    throw new Error(`فشل إرسال Gmail (${res.status}): ${errText || 'خطأ غير معروف'}`);
  }
}
