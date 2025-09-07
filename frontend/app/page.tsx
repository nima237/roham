'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from './utils/api';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // فقط با کوکی و endpoint /user-info/ وضعیت لاگین را چک کن
        const response = await fetch(getApiUrl('user-info/'), {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          // اگر کاربر لاگین است، به داشبورد برو
          router.push('/dashboard');
        } else {
          // اگر لاگین نیست، به صفحه لاگین برو
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // نمایش loading در حین بررسی وضعیت
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003363] mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium text-lg">در حال بررسی وضعیت ورود...</p>
          <p className="text-gray-500 text-sm mt-2">لطفاً صبر کنید</p>
        </div>
      </div>
    );
  }

  // این بخش معمولاً نمایش داده نمی‌شود چون redirect انجام می‌شود
  return null;
}
