# 📁 Scripts Directory

این فولدر شامل اسکریپت‌های کمکی و ابزارهای مدیریتی سیستم TSE Resolution Management است.

## 📄 فایل‌های موجود:

### `check_data.py`
**وضعیت:** ✅ مفید ولی غیرضروری  
**کاربرد:** راه‌اندازی اولیه و بررسی پایگاه داده

**ویژگی‌ها:**
- بررسی تعداد کاربران، جلسات و مصوبات
- ایجاد کاربر admin با رمز `admin123`
- ایجاد کاربر تست با رمز `test123`
- ایجاد داده‌های نمونه برای تست

**استفاده:**
```bash
cd /path/to/your/django/project
python scripts/check_data.py
```

**⚠️ نکته امنیتی:**
- فقط در محیط development استفاده کنید
- روی production اجرا نکنید
- رمزهای پیش‌فرض را تغییر دهید

### `check_latest.py`
**وضعیت:** ✅ مفید برای debugging ولی غیرضروری  
**کاربرد:** تست سریالایزرها و بررسی مصوبات

**ویژگی‌ها:**
- نمایش آخرین مصوبات ایجاد شده
- تست ResolutionSerializer
- بررسی فیلدهای executor_unit و executor_name
- debugging روابط بین models

**استفاده:**
```bash
cd /path/to/your/django/project
python scripts/check_latest.py
```

**🎯 هدف:**
- تست API endpoints
- debugging مشکلات serialization
- بررسی داده‌های Resolution

### `check_resolution_data.py`
**وضعیت:** ✅ مفید برای debugging تفصیلی ولی غیرضروری  
**کاربرد:** بررسی جزئیات کامل سریالایز شدن مصوبات

**ویژگی‌ها:**
- نمایش آخرین مصوبه با جزئیات فارسی
- خروجی JSON کامل و مرتب
- بررسی وجود فیلد executor_name
- نمایش تمام فیلدهای سریالایز شده

**استفاده:**
```bash
cd /path/to/your/django/project
python scripts/check_resolution_data.py
```

**🎯 مزیت:**
- خروجی فارسی و واضح
- نمایش JSON با فرمت زیبا
- بررسی دقیق تمام فیلدها

## 🎯 کی استفاده کنید:

✅ **موارد مناسب:**
- بعد از migrate کردن database
- راه‌اندازی اولیه سیستم
- ایجاد داده‌های تست
- بازیابی دسترسی admin

❌ **موارد نامناسب:**
- محیط production
- سیستم‌های حساس
- وقتی داده‌های واقعی وجود دارد

## 📂 زیرفولدرها:

### `tests/`
شامل مجموعه کاملی از اسکریپت‌های تست و debugging:
- `simple_test.py` - تست ساده serializer
- `test_api.py` - تست کامل API endpoints
- `test_server.py` - چک کردن اتصال سرور
- `test_urls.py` - تست URL patterns
- `test_workbench_api.py` - تست endpoint workbench
- `test_workbench_simple.py` - تست مستقیم view

**استفاده:**
```bash
python scripts/tests/test_server.py
python scripts/tests/test_api.py
```

---
**نکته:** این فولدر برای نگهداری اسکریپت‌های کمکی ایجاد شده و حذف آن‌ها تأثیری بر عملکرد اصلی سیستم ندارد. 