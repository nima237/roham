from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import json
import logging
from ..models import Notification, Resolution, UserProfile
from .websocket_service import send_websocket_notification

logger = logging.getLogger(__name__)

# ابزار کمکی برای افزودن لینک مصوبه به پیام

def add_resolution_link(message, resolution):
    if resolution and hasattr(resolution, 'public_id'):
        link = f"/dashboard/resolutions/{resolution.public_id}"
        return f"{message} \nمشاهده مصوبه: {link}"
    return message

class NotificationService:
    """سرویس مدیریت نوتیفیکیشن‌ها"""
    
    @staticmethod
    def create_notification(recipient, message, resolution=None, notification_type='info', priority='normal'):
        """
        ایجاد نوتیفیکیشن جدید
        
        Args:
            recipient: کاربر دریافت‌کننده
            message: پیام نوتیفیکیشن
            resolution: مصوبه مرتبط (اختیاری)
            notification_type: نوع نوتیفیکیشن (info, success, warning, error)
            priority: اولویت (low, normal, high, urgent)
        """
        try:
            notification = Notification.objects.create(
                recipient=recipient,
                message=message,
                resolution=resolution,
                notification_type=notification_type,
                priority=priority
            )
            
            # ارسال نوتیفیکیشن لحظه‌ای
            NotificationService.send_realtime_notification(notification)
            
            # ارسال ایمیل (اگر فعال باشد)
            if NotificationService.should_send_email(recipient, notification_type):
                NotificationService.send_email_notification(notification)
            
            # ارسال نوتیفیکیشن مرورگر (اگر فعال باشد)
            if NotificationService.should_send_browser_notification(recipient, notification_type):
                NotificationService.send_browser_notification(notification)
            
            logger.info(f"Notification created: {notification.id} for user {recipient.username}")
            return notification
            
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            return None
    
    @staticmethod
    def send_realtime_notification(notification):
        """ارسال نوتیفیکیشن لحظه‌ای از طریق WebSocket"""
        try:
            send_websocket_notification(
                notification.recipient,
                notification.message,
                notification.resolution,
                notification.notification_type
            )
        except Exception as e:
            logger.error(f"Error sending realtime notification: {e}")
    
    @staticmethod
    def send_email_notification(notification):
        """ارسال نوتیفیکیشن از طریق ایمیل"""
        try:
            subject = f"نوتیفیکیشن جدید - {notification.notification_type.title()}"
            
            # ایجاد محتوای ایمیل
            email_content = f"""
            <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif;">
                <h2 style="color: #003363;">نوتیفیکیشن جدید</h2>
                <p style="color: #333; line-height: 1.6;">{notification.message}</p>
                
                {f'<p style="color: #666; font-size: 14px;">مصوبه: جلسه {notification.resolution.meeting.number} بند {notification.resolution.clause}-{notification.resolution.subclause}</p>' if notification.resolution else ''}
                
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                    این ایمیل در تاریخ {notification.sent_at.strftime('%Y/%m/%d %H:%M')} ارسال شده است.
                </p>
            </div>
            """
            
            send_mail(
                subject=subject,
                message=notification.message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient.email],
                html_message=email_content,
                fail_silently=False
            )
            
            logger.info(f"Email notification sent to {notification.recipient.email}")
            
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
    
    @staticmethod
    def send_browser_notification(notification):
        """ارسال نوتیفیکیشن مرورگر"""
        try:
            # این بخش برای PWA و Service Worker پیاده‌سازی می‌شود
            # فعلاً فقط لاگ می‌کنیم
            logger.info(f"Browser notification would be sent for: {notification.recipient.username}")
            
        except Exception as e:
            logger.error(f"Error sending browser notification: {e}")
    
    @staticmethod
    def should_send_email(user, notification_type):
        """بررسی اینکه آیا باید ایمیل ارسال شود یا نه"""
        try:
            # بررسی تنظیمات کاربر
            profile = getattr(user, 'profile', None)
            if profile and hasattr(profile, 'email_notifications'):
                return profile.email_notifications
            
            # تنظیمات پیش‌فرض
            return True
            
        except Exception as e:
            logger.error(f"Error checking email settings: {e}")
            return True
    
    @staticmethod
    def should_send_browser_notification(user, notification_type):
        """بررسی اینکه آیا باید نوتیفیکیشن مرورگر ارسال شود یا نه"""
        try:
            # بررسی تنظیمات کاربر
            profile = getattr(user, 'profile', None)
            if profile and hasattr(profile, 'browser_notifications'):
                return profile.browser_notifications
            
            # تنظیمات پیش‌فرض
            return True
            
        except Exception as e:
            logger.error(f"Error checking browser notification settings: {e}")
            return True
    
    @staticmethod
    def notify_resolution_created(resolution):
        """نوتیفیکیشن ایجاد مصوبه جدید"""
        try:
            # نوتیفیکیشن برای مدیرعامل
            if resolution.status == 'pending_ceo_approval':
                ceos = User.objects.filter(profile__position='ceo')
                for ceo in ceos:
                    message = add_resolution_link(
                        f"مصوبه جدید جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} برای تایید ارسال شده است.",
                        resolution
                    )
                    NotificationService.create_notification(
                        recipient=ceo,
                        message=message,
                        resolution=resolution,
                        notification_type='info',
                        priority='high'
                    )
            
            # نوتیفیکیشن برای مجری (اگر تعیین شده باشد)
            if resolution.executor_unit:
                message = add_resolution_link(
                    f"مصوبه جدید جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} به شما واگذار شده است.",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=resolution.executor_unit,
                    message=message,
                    resolution=resolution,
                    notification_type='info',
                    priority='high'
                )
            
            # نوتیفیکیشن برای همکاران
            for coworker in resolution.coworkers.all():
                message = add_resolution_link(
                    f"شما به عنوان همکار در مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} تعیین شده‌اید.",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=coworker,
                    message=message,
                    resolution=resolution,
                    notification_type='info',
                    priority='normal'
                )
            
            # نوتیفیکیشن برای واحدهای اطلاع‌رسانی
            for inform_unit in resolution.inform_units.all():
                message = add_resolution_link(
                    f"مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} برای اطلاع شما ارسال شده است.",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=inform_unit,
                    message=message,
                    resolution=resolution,
                    notification_type='info',
                    priority='low'
                )
                
        except Exception as e:
            logger.error(f"Error notifying resolution creation: {e}")
    
    @staticmethod
    def notify_resolution_approved(resolution, approved_by):
        """نوتیفیکیشن تایید مصوبه"""
        try:
            # نوتیفیکیشن برای مجری
            if resolution.executor_unit:
                message = add_resolution_link(
                    f"مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} توسط {approved_by.get_full_name()} تایید شد.",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=resolution.executor_unit,
                    message=message,
                    resolution=resolution,
                    notification_type='success',
                    priority='high'
                )
            
            # نوتیفیکیشن برای همکاران
            for coworker in resolution.coworkers.all():
                message = add_resolution_link(
                    f"مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} تایید شد و آماده اجرا است.",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=coworker,
                    message=message,
                    resolution=resolution,
                    notification_type='success',
                    priority='normal'
                )
            
            # نوتیفیکیشن برای دبیر
            if resolution.created_by:
                message = add_resolution_link(
                    f"مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} توسط {approved_by.get_full_name()} تایید شد.",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=resolution.created_by,
                    message=message,
                    resolution=resolution,
                    notification_type='success',
                    priority='normal'
                )
                
        except Exception as e:
            logger.error(f"Error notifying resolution approval: {e}")
    
    @staticmethod
    def notify_resolution_returned(resolution, returned_by, reason):
        """نوتیفیکیشن برگشت مصوبه"""
        try:
            # نوتیفیکیشن برای مدیرعامل
            ceos = User.objects.filter(profile__position='ceo')
            for ceo in ceos:
                message = add_resolution_link(
                    f"مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} توسط {returned_by.get_full_name()} برگشت داده شد. دلیل: {reason}",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=ceo,
                    message=message,
                    resolution=resolution,
                    notification_type='warning',
                    priority='high'
                )
            
            # نوتیفیکیشن برای دبیر
            if resolution.created_by:
                message = add_resolution_link(
                    f"مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} برگشت داده شد. دلیل: {reason}",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=resolution.created_by,
                    message=message,
                    resolution=resolution,
                    notification_type='warning',
                    priority='normal'
                )
                
        except Exception as e:
            logger.error(f"Error notifying resolution return: {e}")
    
    @staticmethod
    def notify_chat_message(resolution, author, message, mentioned_users=None):
        """نوتیفیکیشن پیام جدید در چت"""
        try:
            # نوتیفیکیشن برای شرکت‌کنندگان چت
            participants = resolution.participants.all()
            
            for participant in participants:
                if participant != author:  # برای خود نویسنده نوتیفیکیشن ارسال نکن
                    # بررسی mentions
                    is_mentioned = mentioned_users and participant in mentioned_users
                    
                    if is_mentioned:
                        message_text = add_resolution_link(
                            f"{author.get_full_name()} شما را در پیام جدیدی mention کرده است: {message[:100]}...",
                            resolution
                        )
                        notification_type = 'warning'
                        priority = 'high'
                    else:
                        message_text = add_resolution_link(
                            f"پیام جدید از {author.get_full_name()} در مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause}",
                            resolution
                        )
                        notification_type = 'info'
                        priority = 'normal'
                    
                    NotificationService.create_notification(
                        recipient=participant,
                        message=message_text,
                        resolution=resolution,
                        notification_type=notification_type,
                        priority=priority
                    )
                    
        except Exception as e:
            logger.error(f"Error notifying chat message: {e}")
    
    @staticmethod
    def notify_progress_update(resolution, updated_by, progress, description):
        """نوتیفیکیشن به‌روزرسانی پیشرفت"""
        try:
            # نوتیفیکیشن برای مدیرعامل
            ceos = User.objects.filter(profile__position='ceo')
            for ceo in ceos:
                message = add_resolution_link(
                    f"پیشرفت مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} به {progress}% به‌روزرسانی شد.",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=ceo,
                    message=message,
                    resolution=resolution,
                    notification_type='info',
                    priority='normal'
                )
            
            # نوتیفیکیشن برای دبیر
            if resolution.created_by:
                message = add_resolution_link(
                    f"پیشرفت مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} به {progress}% به‌روزرسانی شد.",
                    resolution
                )
                NotificationService.create_notification(
                    recipient=resolution.created_by,
                    message=message,
                    resolution=resolution,
                    notification_type='info',
                    priority='normal'
                )
                
        except Exception as e:
            logger.error(f"Error notifying progress update: {e}")
    
    @staticmethod
    def notify_deadline_reminder(resolution):
        """نوتیفیکیشن یادآوری مهلت"""
        try:
            if not resolution.deadline:
                return
            
            # بررسی اینکه آیا مهلت نزدیک است (3 روز قبل)
            days_until_deadline = (resolution.deadline - timezone.now().date()).days
            
            if days_until_deadline <= 3 and days_until_deadline > 0:
                message = add_resolution_link(
                    f"مهلت مصوبه جلسه {resolution.meeting.number} بند {resolution.clause}-{resolution.subclause} در {days_until_deadline} روز آینده به پایان می‌رسد.",
                    resolution
                )
                
                # نوتیفیکیشن برای مجری
                if resolution.executor_unit:
                    NotificationService.create_notification(
                        recipient=resolution.executor_unit,
                        message=message,
                        resolution=resolution,
                        notification_type='warning',
                        priority='high'
                    )
                
                # نوتیفیکیشن برای همکاران
                for coworker in resolution.coworkers.all():
                    NotificationService.create_notification(
                        recipient=coworker,
                        message=message,
                        resolution=resolution,
                        notification_type='warning',
                        priority='normal'
                    )
                    
        except Exception as e:
            logger.error(f"Error notifying deadline reminder: {e}")
    
    @staticmethod
    def cleanup_old_notifications(days=30):
        """پاکسازی نوتیفیکیشن‌های قدیمی"""
        try:
            cutoff_date = timezone.now() - timedelta(days=days)
            old_notifications = Notification.objects.filter(
                sent_at__lt=cutoff_date,
                read=True
            )
            count = old_notifications.count()
            old_notifications.delete()
            
            logger.info(f"Cleaned up {count} old notifications")
            return count
            
        except Exception as e:
            logger.error(f"Error cleaning up old notifications: {e}")
            return 0 