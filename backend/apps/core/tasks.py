from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Resolution, Notification
from .services.notification_service import NotificationService

@shared_task
def check_resolution_status():
    # پیدا کردن مصوبه‌هایی که 7 روز در وضعیت درحال ابلاغ هستند
    seven_days_ago = timezone.now() - timedelta(days=7)
    resolutions = Resolution.objects.filter(
        status='notified',
        created_at__lte=seven_days_ago
    )
    
    # تغییر وضعیت به درحال اجرا
    for resolution in resolutions:
        resolution.status = 'in_progress'
        resolution.save()
        
        # ارسال نوتیفیکیشن به مجری
        if resolution.executor_unit:
            NotificationService.create_notification(
                recipient=resolution.executor_unit,
                message='مصوبه به دلیل عدم پاسخگویی در مدت 7 روز، به صورت خودکار به وضعیت درحال اجرا تغییر کرد.',
                resolution=resolution
            )
        
        # ارسال نوتیفیکیشن به همکاران
        for coworker in resolution.coworkers.all():
            NotificationService.create_notification(
                recipient=coworker,
                message='مصوبه به دلیل عدم پاسخگویی مجری در مدت 7 روز، به صورت خودکار به وضعیت درحال اجرا تغییر کرد.',
                resolution=resolution
            )
        
        # ارسال نوتیفیکیشن به حسابرسان
        for auditor in resolution.auditors.all():
            NotificationService.create_notification(
                recipient=auditor,
                message='مصوبه به دلیل عدم پاسخگویی مجری در مدت 7 روز، به صورت خودکار به وضعیت درحال اجرا تغییر کرد.',
                resolution=resolution
            ) 