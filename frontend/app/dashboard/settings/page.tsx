'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faEnvelope, faLock, faUser, faShieldAlt, faCheckCircle, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { getApiUrl } from "@/app/utils/api";
import ProtectedRoute from '../../components/ProtectedRoute';

export default function SettingsPageProtected() {
  return (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  );
}

function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userInfo, setUserInfo] = useState<{username: string, first_name: string, last_name: string, email?: string, department?: string} | null>(null);
  
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  const [emailData, setEmailData] = useState({
    new_email: "",
    password: ""
  });

  const router = useRouter();

  useEffect(() => {
    // فقط با fetch و credentials: 'include' وضعیت لاگین را چک کن
    const fetchUser = async () => {
      const res = await fetch(getApiUrl('user-info/'), { credentials: 'include' });
      if (res.ok) {
        const userData = await res.json();
        setUserInfo(userData);
      } else {
        // اگر کاربر لاگین نیست، ریدایرکت به لاگین
        router.push("/login");
      }
    };
    fetchUser();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    // پاک کردن پیام‌های خطا و موفقیت هنگام تغییر
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }));
    // پاک کردن پیام‌های خطا و موفقیت هنگام تغییر
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(getApiUrl("settings/change-password/"), {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(passwords)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || "کلمه عبور با موفقیت تغییر یافت");
        setPasswords({
          current_password: "",
          new_password: "",
          confirm_password: ""
        });
      } else {
        setError(data.error || "خطا در تغییر کلمه عبور");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(getApiUrl("settings/change-email/"), {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || "ایمیل با موفقیت تغییر یافت");
        setEmailData({
          new_email: "",
          password: ""
        });
        // به‌روزرسانی اطلاعات کاربر
        if (userInfo) {
          setUserInfo({
            ...userInfo,
            email: emailData.new_email
          });
        }
      } else {
        setError(data.error || "خطا در تغییر ایمیل");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-4 lg:p-8">
      <div className="w-full max-w-none space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faCog} className="text-white text-xl" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#003363] to-[#D39E46] bg-clip-text text-transparent">تنظیمات</h1>
              <p className="text-gray-600 text-sm font-medium">مدیریت حساب کاربری و امنیت</p>
            </div>
            {userInfo && (
              <div className="flex items-center gap-3 bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl px-4 py-2">
                <div className="w-8 h-8 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faUser} className="text-white text-sm" />
                </div>
                <div className="text-sm">
                  <div className="font-bold text-blue-900">{userInfo.department || userInfo.username}</div>
                  <div className="text-blue-600">@{userInfo.username}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* بخش تغییر ایمیل */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faEnvelope} className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">تغییر ایمیل</h2>
                <p className="text-gray-600 text-sm">به‌روزرسانی آدرس ایمیل حساب کاربری</p>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faEnvelope} className="w-3 h-3 text-blue-600" />
                </div>
                <div className="text-sm">
                  <div className="font-bold text-blue-900">ایمیل فعلی:</div>
                  <div className="text-blue-700">{userInfo?.email || "تنظیم نشده"}</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-bold">
                  ایمیل جدید <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="new_email"
                  value={emailData.new_email}
                  onChange={handleEmailInputChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-900 placeholder-gray-500"
                  placeholder="ایمیل جدید خود را وارد کنید"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-bold">
                  کلمه عبور برای تأیید <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={emailData.password}
                  onChange={handleEmailInputChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-900 placeholder-gray-500"
                  placeholder="کلمه عبور فعلی برای تأیید هویت"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    در حال تغییر...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
                    تغییر ایمیل
                  </>
                )}
              </button>
            </form>
          </div>

          {/* بخش تغییر کلمه عبور */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-[#003363] to-[#D39E46] rounded-xl flex items-center justify-center">
                <FontAwesomeIcon icon={faLock} className="text-white text-lg" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">تغییر کلمه عبور</h2>
                <p className="text-gray-600 text-sm">به‌روزرسانی کلمه عبور برای امنیت بیشتر</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-bold">
                  کلمه عبور فعلی <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="current_password"
                  value={passwords.current_password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-900 placeholder-gray-500"
                  placeholder="کلمه عبور فعلی خود را وارد کنید"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-bold">
                  کلمه عبور جدید <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={passwords.new_password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-900 placeholder-gray-500"
                  placeholder="کلمه عبور جدید (حداقل ۸ کاراکتر)"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-bold">
                  تکرار کلمه عبور جدید <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwords.confirm_password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#003363] focus:ring-2 focus:ring-[#003363]/20 bg-white/50 backdrop-blur-sm transition-all duration-200 text-right text-gray-900 placeholder-gray-500"
                  placeholder="کلمه عبور جدید را مجدداً وارد کنید"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#003363] to-[#D39E46] hover:from-[#D39E46] hover:to-[#003363] text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    در حال تغییر...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faLock} className="text-sm" />
                    تغییر کلمه عبور
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faShieldAlt} className="w-3 h-3 text-blue-600" />
                </div>
                <h3 className="font-bold text-blue-900">نکات امنیتی:</h3>
              </div>
              <ul className="text-sm text-blue-700 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  کلمه عبور باید حداقل ۸ کاراکتر باشد
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  از ترکیب حروف، اعداد و علائم استفاده کنید
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  کلمه عبور خود را با دیگران به اشتراک نگذارید
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  به طور منظم کلمه عبور خود را تغییر دهید
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50/80 border border-red-200 text-red-800 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50/80 border border-green-200 text-green-800 px-6 py-4 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-medium">{success}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}