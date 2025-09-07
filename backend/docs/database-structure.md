# 📋 مستندات ساختار دیتابیس سیستم مدیریت مصوبات TSE

## 📊 نمای کلی سیستم

سیستم مدیریت مصوبات TSE یک سیستم جامع برای مدیریت جلسات، مصوبات و پیگیری اجرای آن‌ها است. این سیستم شامل 8 مدل اصلی است که روابط پیچیده‌ای با یکدیگر دارند.

### 🎯 هدف سیستم:
- مدیریت جلسات هیئت مدیره
- ثبت و پیگیری مصوبات
- مدیریت سلسله مراتب سازمانی
- سیستم چت و تعاملات
- مدیریت اعلان‌ها و نوتیفیکیشن‌ها

---

## 🗂️ مدل‌های سیستم

### 1. 🏢 **Meeting** (جلسات)

**هدف**: مدیریت اطلاعات جلسات هیئت مدیره

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `number` | IntegerField | شماره یکتای جلسه |
| `held_at` | DateField | تاریخ برگزاری جلسه |
| `description` | TextField | توضیحات جلسه |
| `minutes_url` | URLField | لینک صورتجلسه آنلاین |
| `minutes_file` | FileField | فایل صورتجلسه امضا شده |
| `attendees` | ManyToManyField → User | حاضرین جلسه |
| `other_invitees` | CharField | سایر مدعوین (غیر کاربران سیستم) |
| `created_at` | DateTimeField | تاریخ ایجاد |
| `updated_at` | DateTimeField | تاریخ آخرین بروزرسانی |

#### ویژگی‌ها:
- شماره جلسه **یکتا** است
- امکان آپلود فایل صورتجلسه
- مدیریت حاضرین از کاربران سیستم

---

### 2. 📋 **Resolution** (مصوبات)

**هدف**: مدل اصلی سیستم برای مدیریت مصوبات

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `id` | UUIDField | شناسه یکتای UUID |
| `meeting` | ForeignKey → Meeting | جلسه مربوطه |
| `clause` | CharField | شماره بند |
| `subclause` | CharField | شماره زیربند |
| `description` | TextField | شرح کامل مصوبه |
| `type` | CharField | نوع مصوبه (عملیاتی/اطلاع‌رسانی) |
| `executor_unit` | ForeignKey → User | واحد مجری اصلی |
| `coworkers` | ManyToManyField → User | همکاران در اجرا |
| `inform_units` | ManyToManyField → User | واحدهای اطلاع‌رسانی |
| `participants` | ManyToManyField → User | شرکت‌کنندگان در چت گروهی |
| `progress` | IntegerField | درصد پیشرفت (0-100) |
| `status` | CharField | وضعیت مصوبه |
| `deadline` | DateField | مهلت انجام |
| `can_edit` | BooleanField | قابل ویرایش توسط دبیر |
| `created_by` | ForeignKey → User | ایجادکننده |
| `created_at` | DateTimeField | تاریخ ایجاد |
| `updated_at` | DateTimeField | تاریخ بروزرسانی |

#### انواع وضعیت (STATUS_CHOICES):
- `cancelled`: منتفی
- `notified`: در حال ابلاغ
- `in_progress`: در حال اجرا
- `completed`: تکمیل شده
- `returned_to_secretary`: برگشت به دبیر

#### انواع مصوبه (TYPE_CHOICES):
- `operational`: عملیاتی
- `informational`: اطلاع‌رسانی

#### متدهای مهم:
```python
def get_all_participants(self):
    """دریافت تمام افراد مرتبط با مصوبه برای چت گروهی"""
```

---

### 3. 👤 **UserProfile** (پروفایل کاربران)

**هدف**: گسترش اطلاعات کاربران Django و مدیریت سلسله مراتب

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `user` | OneToOneField → User | کاربر Django |
| `supervisor` | ForeignKey → User | سرپرست مستقیم |
| `position` | CharField | سمت سازمانی |
| `department` | CharField | واحد/اداره |

#### انواع سمت (POSITION_CHOICES):
- `deputy`: معاون
- `manager`: مدیر
- `head`: رئیس اداره
- `employee`: کارمند
- `secretary`: دبیر
- `auditor`: ناظر

#### متدهای مهم:
```python
def get_hierarchy_path(self):
    """دریافت مسیر سلسله مراتب از بالا تا پایین"""

def get_all_subordinates(self):
    """دریافت تمام زیردستان (مستقیم و غیرمستقیم)"""
```

---

### 4. 💬 **ResolutionComment** (کامنت‌های مصوبه)

**هدف**: سیستم چت و تعاملات مصوبات

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `id` | UUIDField | شناسه یکتا |
| `resolution` | ForeignKey → Resolution | مصوبه مربوطه |
| `author` | ForeignKey → User | نویسنده کامنت |
| `content` | TextField | محتوای کامنت |
| `comment_type` | CharField | نوع کامنت |
| `created_at` | DateTimeField | زمان ایجاد |
| `action_data` | JSONField | داده‌های اضافی |
| `related_action` | ForeignKey → ResolutionAction | اکشن مرتبط |
| `mentions` | ManyToManyField → User | کاربران mention شده |
| `reply_to` | ForeignKey → self | پاسخ به کامنت |

#### انواع کامنت (COMMENT_TYPES):
- `message`: پیام معمولی
- `action`: اکشن سیستمی
- `progress_update`: بروزرسانی پیشرفت
- `return`: برگشت
- `referral`: ارجاع

---

### 5. 📎 **ResolutionCommentAttachment** (فایل‌های پیوست)

**هدف**: مدیریت فایل‌های پیوست شده به کامنت‌ها

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `id` | UUIDField | شناسه یکتا |
| `comment` | ForeignKey → ResolutionComment | کامنت مربوطه |
| `file` | FileField | فایل پیوست |
| `original_name` | CharField | نام اصلی فایل |
| `file_size` | PositiveIntegerField | اندازه فایل (بایت) |
| `file_type` | CharField | نوع فایل (MIME type) |
| `uploaded_at` | DateTimeField | زمان آپلود |

#### متدهای مهم:
```python
def get_file_url(self):
    """دریافت URL فایل"""
```

---

### 6. ⚡ **ResolutionAction** (عملیات مصوبه)

**هدف**: ثبت تمام اکشن‌ها و عملیات انجام شده روی مصوبات

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `id` | UUIDField | شناسه یکتا |
| `resolution` | ForeignKey → Resolution | مصوبه مربوطه |
| `actor` | ForeignKey → User | انجام‌دهنده اکشن |
| `action_type` | CharField | نوع اکشن |
| `description` | TextField | توضیحات |
| `created_at` | DateTimeField | زمان انجام |
| `action_data` | JSONField | داده‌های مخصوص اکشن |
| `related_comment` | OneToOneField → ResolutionComment | کامنت مرتبط |

#### انواع اکشن (ACTION_TYPES):
- `return_to_secretary`: برگشت به دبیر
- `return`: برگشت
- `accept`: قبول
- `edit`: ویرایش
- `referral`: ارجاع
- `progress_update`: به‌روزرسانی پیشرفت
- `status_change`: تغییر وضعیت
- `add_participant`: اضافه کردن شرکت‌کننده

---

### 7. 🔔 **Notification** (اعلان‌ها)

**هدف**: سیستم اعلان‌رسانی به کاربران

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `id` | UUIDField | شناسه یکتا |
| `resolution` | ForeignKey → Resolution | مصوبه مربوطه |
| `recipient` | ForeignKey → User | گیرنده اعلان |
| `message` | TextField | متن پیام |
| `sent_at` | DateTimeField | زمان ارسال |
| `read` | BooleanField | خوانده شده یا نه |

---

### 8. 📋 **Referral** (ارجاعات)

**هدف**: مدیریت ارجاعات رسمی مصوبات

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `id` | UUIDField | شناسه یکتا |
| `resolution` | ForeignKey → Resolution | مصوبه مربوطه |
| `referred_to` | ForeignKey → User | ارجاع شده به |
| `note` | TextField | توضیحات ارجاع |
| `created_at` | DateTimeField | زمان ارجاع |

---

### 9. 📝 **FollowUp** (پیگیری‌ها)

**هدف**: مدیریت وظایف پیگیری

#### فیلدها:
| فیلد | نوع | توضیحات |
|------|-----|---------|
| `id` | UUIDField | شناسه یکتا |
| `resolution` | ForeignKey → Resolution | مصوبه مربوطه |
| `assigned_to` | ForeignKey → User | مسئول پیگیری |
| `status` | CharField | وضعیت پیگیری |
| `due_date` | DateField | مهلت انجام |
| `note` | TextField | توضیحات |
| `created_at` | DateTimeField | تاریخ ایجاد |
| `updated_at` | DateTimeField | تاریخ بروزرسانی |

#### وضعیت‌های پیگیری:
- `pending`: در انتظار
- `in_progress`: در حال انجام
- `done`: انجام شده

---

## 🔗 روابط بین مدل‌ها

### روابط اصلی:

```
Meeting (1) ←→ (N) Resolution
```
هر جلسه می‌تواند چندین مصوبه داشته باشد.

```
User (1) ←→ (1) UserProfile
```
رابطه یک‌به‌یک بین کاربر Django و پروفایل.

```
User (1) ←→ (N) UserProfile [supervisor]
```
هر کاربر می‌تواند سرپرست چندین نفر باشد.

```
Resolution (1) ←→ (N) ResolutionComment
Resolution (1) ←→ (N) ResolutionAction  
Resolution (1) ←→ (N) Notification
```
هر مصوبه دارای چندین کامنت، اکشن و اعلان.

```
ResolutionComment (1) ←→ (N) ResolutionCommentAttachment
```
هر کامنت می‌تواند چندین فایل پیوست داشته باشد.

### روابط Many-to-Many:

```
Resolution ←→ User [executor_unit] (1:N)
Resolution ←→ User [coworkers] (M:N)
Resolution ←→ User [inform_units] (M:N)  
Resolution ←→ User [participants] (M:N)
Meeting ←→ User [attendees] (M:N)
ResolutionComment ←→ User [mentions] (M:N)
```

---

## 🔄 چرخه حیات مصوبه

### 1. **مرحله ایجاد** (`notified`)
- دبیر مصوبه را ایجاد می‌کند
- واحد مجری تعیین می‌شود
- اعلان به واحد مجری ارسال می‌شود

### 2. **مرحله بررسی**
- واحد مجری می‌تواند قبول کند → `in_progress`
- یا برگشت دهد → `returned_to_secretary`

### 3. **مرحله گفتگو** (`returned_to_secretary`)
- چت بین دبیر و واحد مجری
- امکان ویرایش توسط دبیر
- انتهای گفتگو با قبول یا لغو

### 4. **مرحله اجرا** (`in_progress`)
- بروزرسانی پیشرفت
- چت گروهی بین اعضای تیم
- ارجاع به افراد جدید

### 5. **مرحله پایان**
- `completed`: تکمیل شده
- `cancelled`: لغو شده

---

## 🛡️ سطوح دسترسی

### **دبیر** (Secretary):
- ایجاد و ویرایش مصوبات
- مشاهده همه مصوبات
- چت در مرحله `notified` و `returned_to_secretary`

### **واحد مجری** (Executor):
- قبول/برگشت مصوبه
- بروزرسانی پیشرفت
- مدیریت تیم اجرا

### **همکاران** (Coworkers):
- مشاهده و چت در مصوبات مربوطه
- بروزرسانی پیشرفت

### **ناظر** (Auditor):
- مشاهده همه مصوبات و آمار
- عدم دخالت در فرآیند

### **معاون/مدیر** (Deputy/Manager):
- اضافه کردن اعضا به تیم
- مدیریت زیردستان

---

## 📊 نکات فنی مهم

### استفاده از UUID:
تمام مدل‌های اصلی از UUID به‌جای ID عددی استفاده می‌کنند برای امنیت بیشتر.

### JSONField Usage:
فیلدهای `action_data` برای ذخیره داده‌های انعطاف‌پذیر استفاده می‌شوند.

### Soft Delete:
مدل‌ها از soft delete استفاده نمی‌کنند، بلکه وضعیت `cancelled` دارند.

### Indexing:
فیلدهای `meeting.number` و سایر فیلدهای پرتکرار دارای index هستند.

### File Management:
فایل‌ها در مسیر ساختارمند ذخیره می‌شوند:
- `meeting_minutes/`: صورتجلسات
- `comment_attachments/%Y/%m/`: فایل‌های پیوست

---

## 🎯 بهینه‌سازی‌ها

### Query Optimization:
- استفاده از `select_related` برای ForeignKey ها
- استفاده از `prefetch_related` برای ManyToMany ها

### Cache Strategy:
- Cache کردن hierarchical data
- Cache کردن آمار dashboard

### Performance Considerations:
- Pagination برای لیست‌های بزرگ
- Lazy loading برای فیلدهای سنگین

---

*آخرین بروزرسانی: دی 1403*
*نسخه: 1.0* 