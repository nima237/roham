# 🎯 راهنمای مدیریت Position در RH TSE

## 📋 مقدمه

سیستم Position در RH TSE به شما امکان تعیین سمت کاربران را می‌دهد. این سمت‌ها بر روی دسترسی‌ها و قابلیت‌های کاربران تأثیر می‌گذارند.

## 🔧 Position های موجود

| کد | نام فارسی | توضیحات |
|----|-----------|---------|
| **deputy** | معاون | معاون مدیرعامل |
| **manager** | مدیر | مدیر واحد/اداره |
| **head** | رئیس اداره | رئیس اداره |
| **employee** | کارمند | کارمند عادی |
| **secretary** | دبیر | دبیر جلسات |
| **auditor** | ناظر | ناظر مصوبات |
| **ceo** | مدیرعامل | مدیرعامل شرکت |
| **board** | هیئت مدیره | عضو هیئت مدیره |
| **secretariat_expert** | کارشناس دبیرخانه | کارشناس دبیرخانه |

## 🚀 روش‌های مدیریت Position

### 1️⃣ از طریق Django Admin

1. به آدرس `/admin/` بروید
2. وارد بخش **Users** شوید
3. کاربر مورد نظر را انتخاب کنید
4. در بخش **پروفایل کاربری**، position را تنظیم کنید

### 2️⃣ از طریق اسکریپت مدیریت

```powershell
# اجرای اسکریپت مدیریت position
python manage_positions.py
```

#### گزینه‌های موجود:
- **نمایش تمام کاربران**: نمایش لیست تمام کاربران و position هایشان
- **تنظیم position**: تنظیم position برای کاربر خاص
- **تنظیم سرپرست**: تعیین سرپرست برای کاربر
- **تنظیم دسته‌ای**: تنظیم position برای چندین کاربر

### 3️⃣ از طریق کد Python

```python
from django.contrib.auth.models import User
from apps.core.models import UserProfile

# تنظیم position برای کاربر
user = User.objects.get(username='username')
profile, created = UserProfile.objects.get_or_create(
    user=user,
    defaults={'position': 'manager', 'department': 'واحد IT'}
)

# به‌روزرسانی position موجود
profile.position = 'ceo'
profile.department = 'مدیریت'
profile.save()
```

## 👥 تنظیم Position برای کاربران LDAP

### نکات مهم:
- **Position از LDAP نمی‌آید** - باید دستی تنظیم شود
- **Department ممکن است از LDAP بیاید** (اگر در LDAP موجود باشد)
- **Position پیش‌فرض**: `employee` برای کاربران LDAP

### مراحل:
1. کاربر از طریق LDAP لاگین می‌کند
2. پروفایل با position پیش‌فرض `employee` ایجاد می‌شود
3. شما position مناسب را تنظیم می‌کنید

## 🔐 تأثیر Position بر دسترسی‌ها

### در کد:
```python
def check_permissions(user):
    if hasattr(user, 'profile'):
        position = user.profile.position
        
        if position == 'ceo':
            # دسترسی‌های مدیرعامل
            return ['view_all', 'edit_all', 'approve_all']
        elif position == 'secretary':
            # دسترسی‌های دبیر
            return ['view_all', 'edit_resolutions', 'manage_meetings']
        elif position == 'manager':
            # دسترسی‌های مدیر
            return ['view_department', 'edit_department']
        else:
            # دسترسی‌های کارمند
            return ['view_assigned']
    
    return []
```

## 📊 مثال‌های کاربردی

### تنظیم Position برای کاربران جدید:
```python
# کاربران جدید از LDAP
new_users = ['user1', 'user2', 'user3']

for username in new_users:
    user = User.objects.get(username=username)
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={'position': 'employee', 'department': 'واحد جدید'}
    )
```

### فیلتر کردن کاربران بر اساس Position:
```python
# تمام مدیران
managers = User.objects.filter(profile__position='manager')

# تمام دبیران
secretaries = User.objects.filter(profile__position__in=['secretary', 'secretariat_expert'])

# کاربران یک واحد
department_users = User.objects.filter(profile__department='دبیرخانه')
```

## 🛠️ عیب‌یابی

### مشکل: Position تنظیم نمی‌شود
**راه‌حل:**
1. بررسی کنید که `UserProfile` ایجاد شده باشد
2. از Django Admin استفاده کنید
3. اسکریپت `manage_positions.py` را اجرا کنید

### مشکل: Position در کد نمایش داده نمی‌شود
**راه‌حل:**
```python
# بررسی وجود profile
if hasattr(user, 'profile'):
    position = user.profile.position
else:
    # ایجاد profile اگر وجود ندارد
    profile = UserProfile.objects.create(user=user, position='employee')
    position = profile.position
```

## 📝 نکات مهم

1. **Position جدا از LDAP است** - باید دستی مدیریت شود
2. **Department ممکن است از LDAP بیاید** - بستگی به تنظیمات LDAP دارد
3. **Position پیش‌فرض**: `employee` برای کاربران جدید
4. **تأثیر بر دسترسی‌ها**: Position بر روی قابلیت‌های کاربر تأثیر می‌گذارد
5. **مدیریت از Admin**: می‌توانید از Django Admin استفاده کنید

## 🎯 خلاصه

- ✅ Position از LDAP نمی‌آید
- ✅ باید دستی تنظیم شود
- ✅ تأثیر بر دسترسی‌ها دارد
- ✅ از Admin یا اسکریپت قابل مدیریت است
- ✅ Position پیش‌فرض: `employee`

## 🏗️ ساختار فعلی پروژه

### فایل‌های اصلی:
- **`docker-compose.yml`** - محیط توسعه
- **`docker-compose.prod.yml`** - محیط تولید
- **`nginx/nginx.conf`** - تنظیمات nginx با HTTPS
- **`certs/`** - گواهینامه‌های SSL برای پایگاه داده
- **`nginx/ssl/`** - گواهینامه‌های SSL برای وب سرور

### گواهینامه‌های SSL:
- **وب سرور**: `nginx/ssl/server.crt` و `nginx/ssl/server.key`
- **پایگاه داده**: `certs/server.crt`، `certs/server.key`، `certs/ca.crt`

### اسکریپت‌های مفید:
- **`build.ps1`** - ساخت در Windows
- **`build.sh`** - ساخت در Linux
- **`deploy.sh`** - استقرار در تولید
- **`start_docker.ps1`** - راه‌اندازی سریع Docker

## 🔐 امنیت و HTTPS

### تنظیمات امنیتی:
- **HTTPS فعال**: تمام ترافیک HTTP به HTTPS هدایت می‌شود
- **گواهینامه‌های خودامضا**: برای توسعه و تست
- **HSTS**: محافظت در برابر حملات downgrade
- **امنیت پایگاه داده**: اتصالات رمزگذاری شده SQL Server

### نکات امنیتی:
- گواهینامه‌های خودامضا فقط برای توسعه مناسب هستند
- در تولید از گواهینامه‌های معتبر استفاده کنید
- رمزهای عبور پیش‌فرض را تغییر دهید
- تنظیمات CORS را بررسی کنید
