// تابع تبدیل اعداد انگلیسی به فارسی
export const toPersianNumbers = (num: string | number | undefined | null): string => {
  if (num === undefined || num === null) {
    return '۰';
  }
  
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let str = num.toString();
  for (let i = 0; i < englishDigits.length; i++) {
    str = str.replace(new RegExp(englishDigits[i], 'g'), persianDigits[i]);
  }
  return str;
};

// تابع فرمت کردن اندازه فایل
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '۰ بایت';
  
  const k = 1024;
  const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${toPersianNumbers(size)} ${sizes[i]}`;
}; 