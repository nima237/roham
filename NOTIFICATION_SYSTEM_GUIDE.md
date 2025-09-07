# 🔔 راهنمای سیستم نوتیفیکیشن یکپارچه

## 📋 خلاصه

سیستم نوتیفیکیشن یکپارچه شامل قابلیت‌های زیر است:

### ✅ **ویژگی‌های پیاده‌سازی شده:**

1. **نوتیفیکیشن لحظه‌ای (Real-time)**
   - WebSocket برای ارسال فوری
   - Toast notifications در UI
   - Badge counter برای نوتیفیکیشن‌های نخوانده

2. **انواع نوتیفیکیشن**
   - Info (اطلاع‌رسانی)
   - Success (موفقیت)
   - Warning (هشدار)
   - Error (خطا)

3. **سطوح اولویت**
   - Low (کم)
   - Normal (عادی)
   - High (زیاد)
   - Urgent (فوری)

4. **کانال‌های ارسال**
   - WebSocket (لحظه‌ای)
   - Email (ایمیل)
   - Browser Notifications (مرورگر)

## 🏗️ **معماری سیستم**

```
Frontend Components:
├── NotificationSystem.tsx (کامپوننت اصلی)
├── NotificationBadge.tsx (شمارنده نوتیفیکیشن‌ها)
├── ToastContainer.tsx (نوتیفیکیشن‌های لحظه‌ای)
└── NotificationSettings.tsx (تنظیمات)

Backend Services:
├── NotificationService (سرویس اصلی)
├── WebSocketService (ارسال لحظه‌ای)
└── EmailService (ارسال ایمیل)

Database:
└── Notification Model (جدول نوتیفیکیشن‌ها)
```

## 🚀 **نحوه استفاده**

### **1. در Frontend:**

```typescript
// استفاده از کامپوننت‌ها
import { NotificationBadge, ToastContainer } from './components/NotificationSystem';

// در Layout
<NotificationBadge />
<ToastContainer />
```

### **2. در Backend:**

```python
from apps.core.services.notification_service import NotificationService

# ایجاد نوتیفیکیشن
NotificationService.create_notification(
    recipient=user,
    message="پیام نوتیفیکیشن",
    resolution=resolution,
    notification_type='info',
    priority='normal'
)

# نوتیفیکیشن‌های خاص
NotificationService.notify_resolution_created(resolution)
NotificationService.notify_chat_message(resolution, author, message)
NotificationService.notify_progress_update(resolution, user, progress, description)
```

## 📱 **کامپوننت‌های Frontend**

### **NotificationBadge**
- نمایش تعداد نوتیفیکیشن‌های نخوانده
- Modal برای نمایش لیست کامل
- قابلیت علامت‌گذاری به عنوان خوانده شده

### **ToastContainer**
- نمایش نوتیفیکیشن‌های لحظه‌ای
- انیمیشن ورود و خروج
- انواع مختلف (success, error, warning, info)

### **NotificationSettings**
- تنظیم کانال‌های نوتیفیکیشن
- تنظیم انواع نوتیفیکیشن
- مدیریت ترجیحات کاربر

## 🔧 **API Endpoints**

### **نوتیفیکیشن‌ها:**
- `GET /api/notifications/user/` - لیست نوتیفیکیشن‌های کاربر
- `POST /api/notifications/{id}/read/` - علامت‌گذاری به عنوان خوانده شده
- `GET /api/notifications/unread-count/` - تعداد نوتیفیکیشن‌های نخوانده
- `GET /api/notifications/settings/` - تنظیمات نوتیفیکیشن
- `PUT /api/notifications/settings/` - به‌روزرسانی تنظیمات

## 🎯 **سناریوهای نوتیفیکیشن**

### **1. ایجاد مصوبه جدید:**
- دبیر مصوبه ایجاد می‌کند
- نوتیفیکیشن به مدیرعامل ارسال می‌شود
- نوتیفیکیشن به مجری (اگر تعیین شده باشد)
- نوتیفیکیشن به همکاران و واحدهای اطلاع‌رسانی

### **2. تایید مصوبه:**
- مدیرعامل مصوبه را تایید می‌کند
- نوتیفیکیشن به مجری ارسال می‌شود
- نوتیفیکیشن به همکاران ارسال می‌شود
- نوتیفیکیشن به دبیر ارسال می‌شود

### **3. برگشت مصوبه:**
- مجری مصوبه را برگشت می‌دهد
- نوتیفیکیشن به مدیرعامل ارسال می‌شود
- نوتیفیکیشن به دبیر ارسال می‌شود

### **4. پیام‌های چت:**
- کاربر پیام جدید ارسال می‌کند
- نوتیفیکیشن به شرکت‌کنندگان چت ارسال می‌شود
- Mention کردن کاربران اولویت بالاتر دارد

### **5. به‌روزرسانی پیشرفت:**
- مجری پیشرفت را به‌روزرسانی می‌کند
- نوتیفیکیشن به مدیرعامل ارسال می‌شود
- نوتیفیکیشن به دبیر ارسال می‌شود

## ⚙️ **تنظیمات**

### **کانال‌های نوتیفیکیشن:**
- **ایمیل**: ارسال از طریق SMTP
- **مرورگر**: نوتیفیکیشن‌های مرورگر
- **موبایل**: برای PWA (آینده)

### **انواع نوتیفیکیشن:**
- **به‌روزرسانی مصوبات**: تغییرات در مصوبات
- **پیام‌های چت**: پیام‌های جدید
- **تغییر وضعیت**: تغییر وضعیت مصوبات
- **یادآوری مهلت**: نزدیک شدن مهلت‌ها

## 🔄 **WebSocket Integration**

### **اتصال:**
```typescript
// در useWebSocket hook
const ws = new WebSocket(`ws://localhost:8000/ws/notifications/?token=${token}`);
```

### **دریافت نوتیفیکیشن:**
```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'notification') {
    // نمایش Toast
    // به‌روزرسانی Badge
  }
};
```

## 📊 **مدل داده**

### **Notification Model:**
```python
class Notification(models.Model):
    id = UUIDField(primary_key=True)
    recipient = ForeignKey(User)
    message = TextField()
    resolution = ForeignKey(Resolution, null=True)
    sent_at = DateTimeField(auto_now_add=True)
    read = BooleanField(default=False)
    notification_type = CharField(choices=NOTIFICATION_TYPES)
    priority = CharField(choices=PRIORITY_CHOICES)
    action_url = URLField(null=True)
    metadata = JSONField(default=dict)
```

## 🛠️ **نصب و راه‌اندازی**

### **1. Backend:**
```bash
# نصب dependencies
pip install channels channels-redis

# اجرای migrations
python manage.py makemigrations
python manage.py migrate

# راه‌اندازی Redis
docker-compose up redis -d
```

### **2. Frontend:**
```bash
# نصب dependencies
npm install

# اجرای development server
npm run dev
```

## 🎨 **Customization**

### **تغییر استایل Toast:**
```typescript
// در NotificationSystem.tsx
const getStyles = () => {
  const base = "fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg";
  switch (type) {
    case 'success': return `${base} bg-green-500 text-white`;
    case 'error': return `${base} bg-red-500 text-white`;
    // ...
  }
};
```

### **اضافه کردن نوع نوتیفیکیشن جدید:**
```python
# در models.py
NOTIFICATION_TYPES = [
    ('info', 'اطلاع‌رسانی'),
    ('success', 'موفقیت'),
    ('warning', 'هشدار'),
    ('error', 'خطا'),
    ('custom', 'سفارشی'),  # اضافه کردن نوع جدید
]
```

## 🔍 **Troubleshooting**

### **مشکلات رایج:**

1. **WebSocket اتصال نمی‌شود:**
   - بررسی Redis connection
   - بررسی token authentication
   - بررسی nginx configuration

2. **نوتیفیکیشن‌ها نمایش داده نمی‌شوند:**
   - بررسی WebSocket connection
   - بررسی notification permissions
   - بررسی console errors

3. **ایمیل ارسال نمی‌شود:**
   - بررسی SMTP settings
   - بررسی email configuration
   - بررسی user email address

## 📈 **Performance Optimization**

### **بهینه‌سازی‌های اعمال شده:**

1. **Database Indexing:**
   - Index روی recipient و sent_at
   - Index روی read status

2. **Caching:**
   - Redis برای WebSocket
   - Cache برای unread count

3. **Batch Processing:**
   - ارسال گروهی نوتیفیکیشن‌ها
   - Cleanup خودکار نوتیفیکیشن‌های قدیمی

## 🔮 **آینده**

### **قابلیت‌های پیشنهادی:**

1. **Push Notifications:**
   - Service Worker برای PWA
   - Push API integration

2. **Advanced Filtering:**
   - فیلتر بر اساس نوع
   - فیلتر بر اساس تاریخ
   - جستجو در نوتیفیکیشن‌ها

3. **Analytics:**
   - آمار نوتیفیکیشن‌ها
   - گزارش بازخورد
   - تحلیل رفتار کاربران

4. **Templates:**
   - قالب‌های نوتیفیکیشن
   - شخصی‌سازی پیام‌ها
   - متغیرهای دینامیک

---

## 📞 **پشتیبانی**

برای سوالات و مشکلات:
- بررسی logs در backend
- بررسی console در frontend
- بررسی WebSocket connection
- بررسی database queries 