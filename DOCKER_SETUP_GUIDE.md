# راهنمای راه‌اندازی پروژه RH TSE با Docker

## 🐳 مراحل راه‌اندازی

### مرحله 1: راه‌اندازی کامل پروژه

```powershell
# در PowerShell
docker-compose up -d
```

**یا اگر docker-compose کار نمی‌کند:**
```powershell
docker compose up -d
```

### مرحله 2: بررسی وضعیت Container ها

```powershell
# بررسی container های در حال اجرا
docker ps

# بررسی همه container ها
docker ps -a
```

### مرحله 3: بررسی لاگ‌ها

```powershell
# لاگ‌های backend
docker-compose logs backend

# لاگ‌های LDAP
docker-compose logs ldap

# لاگ‌های همه سرویس‌ها
docker-compose logs
```

## 🔧 تنظیمات Docker

### فایل docker-compose.yml شامل:

- **backend**: Django application
- **frontend**: Next.js application  
- **db**: SQL Server database
- **redis**: Redis cache
- **ldap**: OpenLDAP server
- **phpldapadmin**: LDAP admin interface
- **nginx**: Reverse proxy

### پورت‌های در دسترس:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **LDAP**: localhost:389
- **phpLDAPadmin**: http://localhost:8080
- **Database**: localhost:1433

## 🧪 تست سیستم

### 1. تست Backend:

```powershell
# تست API
curl http://localhost:8000/api/

# تست admin
curl http://localhost:8000/admin/
```

### 2. تست Frontend:

1. برو به `http://localhost:3000`
2. صفحه لاگین باید نمایش داده شود

### 3. تست LDAP:

```powershell
# تست LDAP connection
docker exec rh_tse-ldap ldapsearch -x -H ldap://localhost:389 -D "cn=admin,dc=rh-tse,dc=local" -w admin123 -b "dc=rh-tse,dc=local" "(objectClass=*)" dn
```

### 4. تست phpLDAPadmin:

1. برو به `http://localhost:8080`
2. Login با:
   - **Server**: ldap
   - **Login DN**: cn=admin,dc=rh-tse,dc=local
   - **Password**: admin123

## 👥 کاربران قابل لاگین

| کاربر | رمز عبور | نقش | گروه |
|--------|-----------|------|------|
| **admin** | **admin123** | مدیر کل | secretary |
| **secretary1** | **secretary123** | منشی | secretary |
| **ceo1** | **ceo123** | مدیرعامل | ceo |
| **executor1** | **executor123** | مجری | executor |

## 🔍 عیب‌یابی

### مشکل 1: Container ها راه‌اندازی نمی‌شوند

```powershell
# پاک کردن container های قدیمی
docker-compose down

# پاک کردن volume ها
docker-compose down -v

# راه‌اندازی مجدد
docker-compose up -d
```

### مشکل 2: Database connection error

```powershell
# بررسی وضعیت database
docker-compose logs db

# راه‌اندازی مجدد database
docker-compose restart db
```

### مشکل 3: LDAP connection error

```powershell
# بررسی وضعیت LDAP
docker-compose logs ldap

# راه‌اندازی مجدد LDAP
docker-compose restart ldap
```

### مشکل 4: Frontend connection error

```powershell
# بررسی وضعیت frontend
docker-compose logs frontend

# راه‌اندازی مجدد frontend
docker-compose restart frontend
```

## 📊 وضعیت سیستم

### ✅ باید کار کند:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **LDAP**: localhost:389
- **phpLDAPadmin**: http://localhost:8080
- **Database**: localhost:1433

### 🔄 اختیاری:

- **LDAP واقعی**: اگر LDAP server راه‌اندازی شود
- **JSON Fallback**: اگر LDAP در دسترس نباشد

## 🎯 نتیجه

اگر همه container ها راه‌اندازی شوند، سیستم شما **کاملاً کار می‌کند**!

### مراحل تست:

1. **بررسی container ها**: `docker ps`
2. **تست Frontend**: http://localhost:3000
3. **تست Backend**: http://localhost:8000
4. **تست LDAP**: http://localhost:8080
5. **لاگین با کاربران بالا**

---

**نکته**: اگر مشکلی داشتید، لاگ‌های container ها را بررسی کنید.
