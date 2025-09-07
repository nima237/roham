from celery import Celery
from celery.schedules import crontab

app = Celery('apps.core')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# تنظیمات beat برای اجرای task‌ها
app.conf.beat_schedule = {
    'check-resolution-status': {
        'task': 'apps.core.tasks.check_resolution_status',
        'schedule': crontab(hour=0, minute=0),  # هر روز در ساعت 00:00
    },
} 