# 📋 راهنمای ایجاد کاربران گروهی - TSE Resolution Management System

## 🎯 نحوه استفاده از Management Command

### دستور اصلی:
```bash
python manage.py import_users_bulk --file FILENAME.csv
```

## 📄 فرمت فایل CSV

### ساختار ستون‌ها (Header):
```csv
username,first_name,last_name,email,password,is_active,is_staff,is_superuser,groups,position,department,supervisor_username
```

### توضیح ستون‌ها:

| ستون | توضیح | نمونه | اجباری |
|------|-------|-------|--------|
| `username` | نام کاربری (منحصربه‌فرد) | `surveillance` | ✅ |
| `first_name` | نام | `معاونت نظارت بر بازار` | ✅ |
| `last_name` | نام خانوادگی | `` (خالی) | ❌ |
| `email` | ایمیل | `surveillance@tse.ir` | ✅ |
| `password` | رمز عبور | `nima1234` | ✅ |
| `is_active` | فعال بودن | `TRUE` یا `FALSE` | ✅ |
| `is_staff` | دسترسی پنل ادمین | `TRUE` یا `FALSE` | ✅ |
| `is_superuser` | ابرکاربر | `TRUE` یا `FALSE` | ✅ |
| `groups` | گروه‌های کاربر | `Deputy,Manager` | ❌ |
| `position` | سمت | `deputy`, `manager`, `employee` | ✅ |
| `department` | بخش | `معاونت نظارت بر بازار` | ✅ |
| `supervisor_username` | نام کاربری سرپرست | `surveillance` | ❌ |

## 📋 مثال فایل CSV کامل:

```csv
username,first_name,last_name,email,password,is_active,is_staff,is_superuser,groups,position,department,supervisor_username
surveillance,"معاونت نظارت بر بازار","",surveillance@tse.ir,nima1234,TRUE,FALSE,FALSE,Deputy,deputy,"معاونت نظارت بر بازار",
operations,"معاونت عملیات بازار","",operations@tse.ir,nima1234,TRUE,FALSE,FALSE,Deputy,deputy,"معاونت عملیات بازار",
publishers,"معاونت پذیرش و ناشران","",publishers@tse.ir,nima1234,TRUE,FALSE,FALSE,Deputy,deputy,"معاونت پذیرش و ناشران",
surv_mng,"مدیر نظارت بر بازار","",surv_mng@tse.ir,nima1234,TRUE,FALSE,FALSE,Manager,manager,"معاونت نظارت بر بازار",surveillance
healt_mng,"دیده بان سلامت بازار","",healt_mng@tse.ir,nima1234,TRUE,FALSE,FALSE,Manager,manager,"معاونت نظارت بر بازار",surveillance
brok_mng,"مدیر کارگزاران","",brok_mng@tse.ir,nima1234,TRUE,FALSE,FALSE,Manager,manager,"معاونت نظارت بر بازار",surveillance
op_mng,"مدیر عملیات بازار سهام","",op_mng@tse.ir,nima1234,TRUE,FALSE,FALSE,Manager,manager,"معاونت عملیات بازار",operations
nop_mng,"مدیر عملیات ابزارهای نوین","",nop_mng@tse.ir,nima1234,TRUE,FALSE,FALSE,Manager,manager,"معاونت عملیات بازار",operations
stat_mng,"مدیر آمار و اطلاعات","",stat_mng@tse.ir,nima1234,TRUE,FALSE,FALSE,Manager,manager,"معاونت عملیات بازار",operations
adm_mng,"مدیر پذیرش","",adm_mng@tse.ir,nima1234,TRUE,FALSE,FALSE,Manager,manager,"معاونت پذیرش و ناشران",publishers
pub_mng,"مدیر ناشران","",pub_mng@tse.ir,nima1234,TRUE,FALSE,FALSE,Manager,manager,"معاونت پذیرش و ناشران",publishers
```

## 🚀 دستورات Management Command

### 1. ایجاد کاربران (حالت اجرا):
```bash
python manage.py import_users_bulk --file docs/user_import/users_sample.csv
```

### 2. تست بدون تغییر (Dry Run):
```bash
python manage.py import_users_bulk --file docs/user_import/users_sample.csv --dry-run
```

### 3. آپدیت کاربران موجود:
```bash
python manage.py import_users_bulk --file docs/user_import/users_sample.csv --update
```

### 4. استفاده از فایل JSON:
```bash
python manage.py import_users_bulk --file docs/user_import/users.json --format json
```

## 📝 مثال خروجی موفق:

```
📊 Processing 11 users...

✅ Created: surveillance (معاونت نظارت بر بازار)
✅ Created: operations (معاونت عملیات بازار)
✅ Created: publishers (معاونت پذیرش و ناشران)
✅ Created: surv_mng (مدیر نظارت بر بازار)
✅ Created: healt_mng (دیده بان سلامت بازار)
✅ Created: brok_mng (مدیر کارگزاران)
✅ Created: op_mng (مدیر عملیات بازار سهام)
✅ Created: nop_mng (مدیر عملیات ابزارهای نوین)
✅ Created: stat_mng (مدیر آمار و اطلاعات)
✅ Created: adm_mng (مدیر پذیرش)
✅ Created: pub_mng (مدیر ناشران)

==================================================
📈 SUMMARY:
  ✅ Created: 11 users
  🔄 Updated: 0 users
  ❌ Errors: 0 users
==================================================
```

## ⚠️ نکات مهم:

### 1. **فرمت متن فارسی:**
- متن‌های فارسی را داخل `"..."` قرار دهید
- مثال: `"معاونت نظارت بر بازار"`

### 2. **ستون‌های خالی:**
- برای ستون‌های خالی از `""` استفاده کنید
- مثال: `last_name` خالی: `""`

### 3. **مقادیر Boolean:**
- `TRUE` یا `FALSE` (با حروف بزرگ)
- مثال: `is_active,TRUE`

### 4. **ترتیب ایجاد:**
- ابتدا کاربران بدون سرپرست ایجاد می‌شوند
- سپس کاربران با سرپرست
- مثال: ابتدا `surveillance` سپس `surv_mng`

### 5. **گروه‌های مجاز:**
- `Deputy` (معاون)
- `Manager` (مدیر)
- `Secretary` (دبیر)
- یا ترکیب: `Deputy,Manager`

### 6. **سمت‌های مجاز:**
- `deputy` (معاون)
- `manager` (مدیر)
- `head` (رئیس)
- `employee` (کارمند)
- `secretary` (دبیر)
- `auditor` (ناظر)

## 🛠️ عیب‌یابی

### خطای "Skipping user with empty username":
```bash
⚠️  Skipping user with empty username
```
**حل:** فرمت CSV شما مشکل دارد. از فایل نمونه در همین فولدر استفاده کنید.

### خطای "Supervisor not found":
```bash
⚠️  Supervisor surveillance not found for user surv_mng
```
**حل:** ابتدا کاربر سرپرست را ایجاد کنید، سپس زیردست.

### خطای "User already exists":
```bash
⚠️  User surveillance already exists (use --update to update)
```
**حل:** از پارامتر `--update` استفاده کنید یا کاربر را حذف کنید.

## 🎯 مثال‌های کاربردی:

### ایجاد کاربر تکی:
```csv
username,first_name,last_name,email,password,is_active,is_staff,is_superuser,groups,position,department,supervisor_username
john_doe,"John","Doe",john@tse.ir,password123,TRUE,FALSE,FALSE,Employee,employee,"IT Department",
```

### ایجاد مدیر با چند زیردست:
```csv
username,first_name,last_name,email,password,is_active,is_staff,is_superuser,groups,position,department,supervisor_username
it_manager,"مدیر IT","",it@tse.ir,pass123,TRUE,TRUE,FALSE,Manager,manager,"بخش IT",
dev1,"توسعه‌دهنده 1","",dev1@tse.ir,pass123,TRUE,FALSE,FALSE,Employee,employee,"بخش IT",it_manager
dev2,"توسعه‌دهنده 2","",dev2@tse.ir,pass123,TRUE,FALSE,FALSE,Employee,employee,"بخش IT",it_manager
```

## 📞 پشتیبانی:
- در صورت مشکل، ابتدا با `--dry-run` تست کنید
- خروجی خطاها را بررسی کنید
- فرمت CSV را با فایل `users_sample.csv` در همین فولدر مقایسه کنید

## 📂 محتویات فولدر:
- `USER_IMPORT_GUIDE.md` - این راهنما
- `users_sample.csv` - فایل نمونه آماده استفاده
- `README.md` - معرفی کوتاه فولدر

---
**نکته:** این فولدر شامل تمام مستندات مربوط به ایجاد کاربران گروهی است. 