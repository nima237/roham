import uuid
import hashlib
import base64
from django.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

class Meeting(models.Model):
    number = models.IntegerField(unique=True, db_index=True)
    held_at = models.DateField()
    description = models.TextField(blank=True, null=True)
    attendees = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="meetings_attended", verbose_name="حاضرین جلسه")
    other_invitees = models.CharField(max_length=255, blank=True, null=True, verbose_name="سایر مدعوین")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"جلسه شماره {self.number} ({self.held_at})"

# پیوست‌های جلسه
class MeetingAttachment(models.Model):
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='meeting_attachments/')
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"پیوست جلسه {self.meeting.number} - {self.original_name or self.file.name}"

class Resolution(models.Model):
    STATUS_CHOICES = [
        ("pending_secretary_approval", "در انتظار تایید دبیر"),
        ("cancelled", "منتفی"),
        ("notified", "در حال ابلاغ"),
        ("in_progress", "در حال اجرا"),
        ("completed", "تکمیل شده"),
        ("returned_to_secretary", "برگشت به دبیر"),
        ("pending_ceo_approval", "در انتظار تایید مدیرعامل"),
    ]
    TYPE_CHOICES = [
        ("operational", "عملیاتی"),
        ("informational", "اطلاع‌رسانی"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    public_id = models.CharField(max_length=32, unique=True, blank=True, verbose_name="شناسه عمومی")
    meeting = models.ForeignKey(Meeting, on_delete=models.CASCADE, related_name="resolutions", verbose_name="شماره جلسه")
    clause = models.CharField(max_length=10, verbose_name="بند")
    subclause = models.CharField(max_length=10, verbose_name="زیربند")
    description = models.TextField(verbose_name="شرح مصوبه")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="نوع مصوبه")
    executor_unit = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="executed_resolutions", verbose_name="واحد مجری")
    coworkers = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="coworked_resolutions", verbose_name="همکاران")
    inform_units = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="informed_resolutions", verbose_name="واحدهای اطلاع‌رسانی")
    progress = models.IntegerField(default=0, verbose_name="درصد پیشرفت")
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="notified", verbose_name="وضعیت مصوبه")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_resolutions", verbose_name="ایجادکننده")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deadline = models.DateField(null=True, blank=True, verbose_name="مهلت انجام")
    can_edit = models.BooleanField(default=False, verbose_name="قابل ویرایش توسط دبیر")
    
    # اعضای فعال در تعاملات مصوبه (برای چت گروهی)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="participated_resolutions", verbose_name="شرکت‌کنندگان")

    def save(self, *args, **kwargs):
        if not self.public_id:
            # ابتدا شیء را ذخیره کنیم تا id تولید شود
            super().save(*args, **kwargs)
            # حالا که id وجود دارد، public_id را تولید کنیم
            hash_input = f"{self.id}{timezone.now().isoformat()}{settings.SECRET_KEY[:10]}"
            hash_bytes = hashlib.sha256(hash_input.encode()).digest()
            self.public_id = base64.urlsafe_b64encode(hash_bytes[:16]).decode('ascii')
            # دوباره ذخیره کنیم تا public_id هم ذخیره شود
            super().save(update_fields=['public_id'])
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"مصوبه {self.clause}-{self.subclause} ({self.meeting})"
    
    def get_all_participants(self):
        """دریافت تمام افراد مرتبط با مصوبه"""
        participants = set()
        
        # اضافه کردن ایجادکننده
        if self.created_by:
            participants.add(self.created_by)
        
        # اضافه کردن مجری
        if self.executor_unit:
            participants.add(self.executor_unit)
        
        # اضافه کردن همکاران
        participants.update(self.coworkers.all())
        
        # اضافه کردن واحدهای اطلاع‌رسانی
        participants.update(self.inform_units.all())
        
        # اضافه کردن شرکت‌کنندگان اضافی
        participants.update(self.participants.all())
        
        return list(participants)
    
    @classmethod
    def get_by_public_id(cls, public_id):
        """دریافت مصوبه بر اساس public_id"""
        try:
            return cls.objects.get(public_id=public_id)
        except cls.DoesNotExist:
            return None

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('info', 'اطلاع‌رسانی'),
        ('success', 'موفقیت'),
        ('warning', 'هشدار'),
        ('error', 'خطا'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'کم'),
        ('normal', 'عادی'),
        ('high', 'زیاد'),
        ('urgent', 'فوری'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resolution = models.ForeignKey(Resolution, on_delete=models.CASCADE, related_name="notifications", null=True, blank=True)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info', verbose_name="نوع نوتیفیکیشن")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal', verbose_name="اولویت")
    action_url = models.URLField(blank=True, null=True, verbose_name="لینک عملیات")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="اطلاعات اضافی")

    class Meta:
        ordering = ['-sent_at']
        verbose_name = "نوتیفیکیشن"
        verbose_name_plural = "نوتیفیکیشن‌ها"

    def __str__(self):
        return f"Notification to {self.recipient} for {self.resolution}"
    
    def mark_as_read(self):
        """علامت‌گذاری به عنوان خوانده شده"""
        self.read = True
        self.save(update_fields=['read'])
    
    def get_action_url(self):
        """دریافت لینک عملیات"""
        if self.action_url:
            return self.action_url
        elif self.resolution:
            return f"/dashboard/resolutions/{self.resolution.id}"
        return None

class Referral(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resolution = models.ForeignKey(Resolution, on_delete=models.CASCADE, related_name="referrals")
    referred_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referrals")
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Referral to {self.referred_to} for {self.resolution}"

class FollowUp(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("done", "Done"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resolution = models.ForeignKey(Resolution, on_delete=models.CASCADE, related_name="followups")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="followups")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    due_date = models.DateField(null=True, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"FollowUp for {self.resolution} assigned to {self.assigned_to}"

class UserProfile(models.Model):
    POSITION_CHOICES = [
        ("deputy", "معاون"),
        ("manager", "مدیر"),
        ("head", "رئیس اداره"),
        ("employee", "کارمند"),
        ("secretary", "دبیر"),
        ("auditor", "ناظر"),
        ("ceo", "مدیرعامل"),
        ("board", "هیئت مدیره"),
        ("secretariat_expert", "کارشناس دبیرخانه"),
    ]
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile", verbose_name="کاربر")
    supervisor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="subordinates", verbose_name="سرپرست")
    position = models.CharField(max_length=20, choices=POSITION_CHOICES, default="employee", verbose_name="سمت")
    department = models.CharField(max_length=100, blank=True, verbose_name="واحد/اداره")
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_position_display()}"
    
    def get_hierarchy_path(self):
        """دریافت مسیر سلسله مراتب از بالا تا پایین"""
        path = [self]
        current = self.supervisor
        while current and hasattr(current, 'profile'):
            path.insert(0, current.profile)
            current = current.profile.supervisor
        return path
    
    def get_all_subordinates(self):
        """دریافت تمام زیردستان (مستقیم و غیرمستقیم)"""
        subordinates = []
        direct_subordinates = get_user_model().objects.filter(profile__supervisor=self.user)
        for subordinate in direct_subordinates:
            subordinates.append(subordinate)
            if hasattr(subordinate, 'profile'):
                subordinates.extend(subordinate.profile.get_all_subordinates())
        return subordinates

class ResolutionComment(models.Model):
    COMMENT_TYPES = [
        ('message', 'پیام'),
        ('action', 'اکشن'),
        ('progress_update', 'بروزرسانی پیشرفت'),
        ('return', 'برگشت'),
        ('referral', 'ارجاع'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resolution = models.ForeignKey(Resolution, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    comment_type = models.CharField(max_length=20, choices=COMMENT_TYPES, default='message')
    created_at = models.DateTimeField(auto_now_add=True)
    action_data = models.JSONField(blank=True, null=True)
    related_action = models.ForeignKey('ResolutionAction', on_delete=models.SET_NULL, blank=True, null=True)
    mentions = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='mentioned_in_comments')
    # فیلد reply برای پاسخ به کامنت‌ها
    reply_to = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='replies')
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.resolution.clause}-{self.resolution.subclause}"

class ResolutionCommentAttachment(models.Model):
    """فایل‌های پیوست شده به کامنت‌های مصوبه"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    comment = models.ForeignKey(ResolutionComment, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='comment_attachments/%Y/%m/', verbose_name='فایل پیوست')
    original_name = models.CharField(max_length=255, verbose_name='نام اصلی فایل')
    file_size = models.PositiveIntegerField(verbose_name='اندازه فایل (بایت)')
    file_type = models.CharField(max_length=100, verbose_name='نوع فایل')
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name='زمان آپلود')
    
    class Meta:
        verbose_name = 'فایل پیوست کامنت'
        verbose_name_plural = 'فایل‌های پیوست کامنت‌ها'
        ordering = ['uploaded_at']
    
    def __str__(self):
        return f"{self.original_name} - {self.comment.id}"
    
    def get_file_url(self):
        """دریافت URL فایل"""
        if self.file:
            return self.file.url
        return None

class ResolutionAction(models.Model):
    ACTION_TYPES = [
        ("created", "ثبت مصوبه"),
        ("secretary_approved", "تایید دبیر"),
        ("ceo_approved", "تایید مدیرعامل"),
        ("executor_accepted", "قبول واحد مجری"),
        ("return_to_secretary", "برگشت به دبیر"),
        ("return", "برگشت"),
        ("edit", "ویرایش"),
        ("referral", "ارجاع"),
        ("progress_update", "به‌روزرسانی پیشرفت"),
        ("add_participants", "افزودن به گروه"),
        ("remove_participant", "حذف از گروه"),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resolution = models.ForeignKey(Resolution, on_delete=models.CASCADE, related_name="actions", verbose_name="مصوبه")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resolution_actions", verbose_name="انجام‌دهنده")
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES, verbose_name="نوع اکشن")
    description = models.TextField(verbose_name="توضیحات")
    created_at = models.DateTimeField(auto_now_add=True)
    
    # داده‌های مخصوص هر اکشن
    action_data = models.JSONField(null=True, blank=True, verbose_name="داده‌های اکشن")
    
    # کامنت مرتبط (اختیاری)
    related_comment = models.OneToOneField(ResolutionComment, on_delete=models.CASCADE, null=True, blank=True, related_name="action_reference")
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_action_type_display()} - {self.actor.get_full_name() or self.actor.username}"

class ResolutionView(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resolution_views")
    resolution = models.ForeignKey(Resolution, on_delete=models.CASCADE, related_name="views")
    first_viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'resolution')
