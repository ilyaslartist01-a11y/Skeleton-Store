import type { CurrencyCode, DeliveryRatesMap } from '../types.ts';

export interface AlgeriaWilaya {
  code: string;
  nameAr: string;
  zone: 'center' | 'north' | 'highlands_near_south' | 'far_south';
}

export const ALGERIA_WILAYAS: AlgeriaWilaya[] = [
  { code: '01', nameAr: 'أدرار', zone: 'far_south' },
  { code: '02', nameAr: 'الشلف', zone: 'north' },
  { code: '03', nameAr: 'الأغواط', zone: 'highlands_near_south' },
  { code: '04', nameAr: 'أم البواقي', zone: 'north' },
  { code: '05', nameAr: 'باتنة', zone: 'north' },
  { code: '06', nameAr: 'بجاية', zone: 'north' },
  { code: '07', nameAr: 'بسكرة', zone: 'highlands_near_south' },
  { code: '08', nameAr: 'بشار', zone: 'highlands_near_south' },
  { code: '09', nameAr: 'البليدة', zone: 'center' },
  { code: '10', nameAr: 'البويرة', zone: 'center' },
  { code: '11', nameAr: 'تمنراست', zone: 'far_south' },
  { code: '12', nameAr: 'تبسة', zone: 'north' },
  { code: '13', nameAr: 'تلمسان', zone: 'north' },
  { code: '14', nameAr: 'تيارت', zone: 'north' },
  { code: '15', nameAr: 'تيزي وزو', zone: 'center' },
  { code: '16', nameAr: 'الجزائر', zone: 'center' },
  { code: '17', nameAr: 'الجلفة', zone: 'highlands_near_south' },
  { code: '18', nameAr: 'جيجل', zone: 'north' },
  { code: '19', nameAr: 'سطيف', zone: 'north' },
  { code: '20', nameAr: 'سعيدة', zone: 'north' },
  { code: '21', nameAr: 'سكيكدة', zone: 'north' },
  { code: '22', nameAr: 'سيدي بلعباس', zone: 'north' },
  { code: '23', nameAr: 'عنابة', zone: 'north' },
  { code: '24', nameAr: 'قالمة', zone: 'north' },
  { code: '25', nameAr: 'قسنطينة', zone: 'north' },
  { code: '26', nameAr: 'المدية', zone: 'center' },
  { code: '27', nameAr: 'مستغانم', zone: 'north' },
  { code: '28', nameAr: 'المسيلة', zone: 'highlands_near_south' },
  { code: '29', nameAr: 'معسكر', zone: 'north' },
  { code: '30', nameAr: 'ورقلة', zone: 'highlands_near_south' },
  { code: '31', nameAr: 'وهران', zone: 'north' },
  { code: '32', nameAr: 'البيض', zone: 'highlands_near_south' },
  { code: '33', nameAr: 'إليزي', zone: 'far_south' },
  { code: '34', nameAr: 'برج بوعريريج', zone: 'north' },
  { code: '35', nameAr: 'بومرداس', zone: 'center' },
  { code: '36', nameAr: 'الطارف', zone: 'north' },
  { code: '37', nameAr: 'تندوف', zone: 'far_south' },
  { code: '38', nameAr: 'تيسمسيلت', zone: 'north' },
  { code: '39', nameAr: 'الوادي', zone: 'highlands_near_south' },
  { code: '40', nameAr: 'خنشلة', zone: 'north' },
  { code: '41', nameAr: 'سوق أهراس', zone: 'north' },
  { code: '42', nameAr: 'تيبازة', zone: 'center' },
  { code: '43', nameAr: 'ميلة', zone: 'north' },
  { code: '44', nameAr: 'عين الدفلى', zone: 'center' },
  { code: '45', nameAr: 'النعامة', zone: 'highlands_near_south' },
  { code: '46', nameAr: 'عين تموشنت', zone: 'north' },
  { code: '47', nameAr: 'غرداية', zone: 'highlands_near_south' },
  { code: '48', nameAr: 'غليزان', zone: 'north' },
  { code: '49', nameAr: 'تيميمون', zone: 'far_south' },
  { code: '50', nameAr: 'برج باجي مختار', zone: 'far_south' },
  { code: '51', nameAr: 'أولاد جلال', zone: 'highlands_near_south' },
  { code: '52', nameAr: 'بني عباس', zone: 'far_south' },
  { code: '53', nameAr: 'إن صالح', zone: 'far_south' },
  { code: '54', nameAr: 'إن قزام', zone: 'far_south' },
  { code: '55', nameAr: 'تقرت', zone: 'highlands_near_south' },
  { code: '56', nameAr: 'جانت', zone: 'far_south' },
  { code: '57', nameAr: 'المغير', zone: 'highlands_near_south' },
  { code: '58', nameAr: 'المنيعة', zone: 'far_south' },
  { code: '59', nameAr: 'أفلو', zone: 'highlands_near_south' },
  { code: '60', nameAr: 'بريكة', zone: 'highlands_near_south' },
  { code: '61', nameAr: 'القنطرة', zone: 'highlands_near_south' },
  { code: '62', nameAr: 'بئر العاتر', zone: 'highlands_near_south' },
  { code: '63', nameAr: 'العريشة', zone: 'highlands_near_south' },
  { code: '64', nameAr: 'قصر الشلالة', zone: 'highlands_near_south' },
  { code: '65', nameAr: 'عين وسارة', zone: 'highlands_near_south' },
  { code: '66', nameAr: 'مسعد', zone: 'highlands_near_south' },
  { code: '67', nameAr: 'قصر البخاري', zone: 'center' },
  { code: '68', nameAr: 'بوسعادة', zone: 'highlands_near_south' },
  { code: '69', nameAr: 'الأبيض سيدي الشيخ', zone: 'highlands_near_south' },
];

export function findWilayaByCode(code: string): AlgeriaWilaya | undefined {
  return ALGERIA_WILAYAS.find((w) => w.code === code);
}

export function buildDefaultDeliveryRates(currency: CurrencyCode = 'DZD'): DeliveryRatesMap {
  const rates: DeliveryRatesMap = {};
  const isDzd = currency === 'DZD';

  for (const w of ALGERIA_WILAYAS) {
    if (w.zone === 'center') {
      rates[w.code] = isDzd
        ? { postOfficePrice: 400, homePrice: 600 }
        : { postOfficePrice: 4, homePrice: 6 };
    } else if (w.zone === 'highlands_near_south') {
      rates[w.code] = isDzd
        ? { postOfficePrice: 600, homePrice: 900 }
        : { postOfficePrice: 6, homePrice: 9 };
    } else if (w.zone === 'far_south') {
      rates[w.code] = isDzd
        ? { postOfficePrice: 800, homePrice: 1200 }
        : { postOfficePrice: 8, homePrice: 12 };
    } else {
      rates[w.code] = isDzd
        ? { postOfficePrice: 500, homePrice: 750 }
        : { postOfficePrice: 5, homePrice: 7.5 };
    }
  }

  return rates;
}
