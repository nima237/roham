# 📂 User Import Documentation

این فولدر شامل تمام مستندات و فایل‌های مربوط به ایجاد کاربران گروهی در سیستم TSE Resolution Management است.

## 📄 محتویات فولدر:

### 1. `USER_IMPORT_GUIDE.md`
راهنمای کامل استفاده از دستور `import_users_bulk` شامل:
- نحوه استفاده از Management Command
- فرمت دقیق فایل CSV
- مثال‌های عملی
- عیب‌یابی و حل مشکلات رایج

### 2. `users_sample.csv`
فایل نمونه CSV آماده استفاده با:
- فرمت صحیح ستون‌ها
- نمونه کاربران TSE (11 کاربر)
- روابط سرپرست-زیردست
- مدیریت متن‌های فارسی

## 🚀 شروع سریع:

```bash
# رفتن به فولدر پروژه Django
cd /path/to/your/django/project

# ایجاد کاربران نمونه
python manage.py import_users_bulk --file docs/user_import/users_sample.csv

# تست بدون تغییر
python manage.py import_users_bulk --file docs/user_import/users_sample.csv --dry-run
```

## 📋 ساختار سازمانی نمونه:

```
TSE Resolution Management System
├── معاونت‌ها (Deputies)
│   ├── معاونت نظارت بر بازار (surveillance)
│   ├── معاونت عملیات بازار (operations)
│   └── معاونت پذیرش و ناشران (publishers)
│
└── مدیران (Managers)
    ├── زیر نظر معاونت نظارت:
    │   ├── مدیر نظارت بر بازار (surv_mng)
    │   ├── دیده بان سلامت بازار (healt_mng)
    │   └── مدیر کارگزاران (brok_mng)
    │
    ├── زیر نظر معاونت عملیات:
    │   ├── مدیر عملیات بازار سهام (op_mng)
    │   ├── مدیر عملیات ابزارهای نوین (nop_mng)
    │   └── مدیر آمار و اطلاعات (stat_mng)
    │
    └── زیر نظر معاونت پذیرش:
        ├── مدیر پذیرش (adm_mng)
        └── مدیر ناشران (pub_mng)
```

## 📞 راهنمایی:
برای مطالعه راهنمای تفصیلی، فایل `USER_IMPORT_GUIDE.md` را مطالعه کنید.

---
**ایجاد شده برای:** TSE Resolution Management System  
**تاریخ:** 2024  
**نسخه:** 1.0 