# 🚀 راهنمای سریع ساختار دیتابیس

## 📋 مدل‌های اصلی

| مدل | هدف | فیلدهای کلیدی |
|-----|------|----------------|
| **Meeting** | جلسات | `number`, `held_at`, `description` |
| **Resolution** | مصوبات | `clause`, `subclause`, `status`, `executor_unit` |
| **UserProfile** | پروفایل کاربران | `position`, `supervisor`, `department` |
| **ResolutionComment** | چت و تعاملات | `content`, `comment_type`, `mentions` |
| **ResolutionAction** | عملیات مصوبه | `action_type`, `actor`, `description` |
| **Notification** | اعلان‌ها | `recipient`, `message`, `read` |

## 🔄 وضعیت‌های مصوبه

```
notified → returned_to_secretary ⟷ notified → in_progress → completed
                ↓
            cancelled
```

## 👥 نقش‌های کاربری

- **Secretary** (دبیر): ایجاد و ویرایش مصوبات
- **Executor** (مجری): قبول/برگشت و اجرای مصوبه  
- **Auditor** (ناظر): مشاهده و نظارت
- **Deputy/Manager** (معاون/مدیر): مدیریت تیم

## 🔗 روابط مهم

```python
# مصوبه → کاربران
Resolution.executor_unit     # مجری اصلی (1:1)
Resolution.coworkers        # همکاران (M:N)
Resolution.inform_units     # واحدهای اطلاع‌رسانی (M:N)
Resolution.participants     # شرکت‌کنندگان چت (M:N)

# سلسله مراتب
UserProfile.supervisor      # سرپرست (1:1)
```

## 📊 فیلدهای مهم

### Resolution:
- `status`: وضعیت مصوبه
- `progress`: درصد پیشرفت (0-100)
- `deadline`: مهلت انجام
- `type`: operational یا informational

### ResolutionComment:
- `comment_type`: message, action, progress_update
- `reply_to`: پاسخ به کامنت دیگر
- `mentions`: کاربران mention شده

### UserProfile:
- `position`: secretary, deputy, manager, auditor, employee
- `supervisor`: سرپرست در سلسله مراتب

---

*برای مطالعه کامل: [database-structure.md](./database-structure.md)* 