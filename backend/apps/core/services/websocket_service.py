from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
import json
import time


def send_websocket_notification(user, message, resolution=None, notification_type='info'):
    """
    ارسال نوتیفیکیشن از طریق WebSocket به کاربر خاص
    
    Args:
        user: کاربر دریافت‌کننده
        message: پیام نوتیفیکیشن
        resolution: مصوبه مرتبط (اختیاری)
        notification_type: نوع نوتیفیکیشن
    """
    try:
        channel_layer = get_channel_layer()
        
        # ایجاد notification_id یکتا
        notification_id = f"{user.id}_{int(time.time())}"
        
        # ایجاد پیام WebSocket
        notification_data = {
            'type': 'notification_message',
            'message': message,
            'notification_id': notification_id,
            'notification_type': notification_type
        }
        
        # اضافه کردن اطلاعات مصوبه اگر موجود باشد
        if resolution:
            notification_data['resolution'] = {
                'id': str(resolution.id),
                'clause': resolution.clause,
                'subclause': resolution.subclause,
                'meeting': {
                    'number': resolution.meeting.number
                }
            }
        
        # ارسال به گروه کاربر
        group_name = f"notifications_{user.id}"
        print(f"Sending WebSocket notification to group {group_name}: {notification_data}")
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            notification_data
        )
        
        print(f"WebSocket notification sent to user {user.username}: {message}")
        
    except Exception as e:
        print(f"Error sending WebSocket notification: {e}")
        import traceback
        traceback.print_exc()


def send_notification_to_group(group_name, message, notification_type='info'):
    """
    ارسال نوتیفیکیشن به گروه خاص
    
    Args:
        group_name: نام گروه
        message: پیام نوتیفیکیشن
        notification_type: نوع نوتیفیکیشن
    """
    try:
        channel_layer = get_channel_layer()
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'notification_message',
                'message': message,
                'notification_id': f"group_{int(time.time())}",
                'notification_type': notification_type
            }
        )
        
        print(f"WebSocket notification sent to group {group_name}: {message}")
        
    except Exception as e:
        print(f"Error sending WebSocket notification to group: {e}")


def send_notification_to_all_users(message, notification_type='info'):
    """
    ارسال نوتیفیکیشن به همه کاربران متصل
    
    Args:
        message: پیام نوتیفیکیشن
        notification_type: نوع نوتیفیکیشن
    """
    try:
        channel_layer = get_channel_layer()
        
        async_to_sync(channel_layer.group_send)(
            "all_users",
            {
                'type': 'notification_message',
                'message': message,
                'notification_id': f"broadcast_{int(time.time())}",
                'notification_type': notification_type
            }
        )
        
        print(f"Broadcast WebSocket notification sent: {message}")
        
    except Exception as e:
        print(f"Error sending broadcast WebSocket notification: {e}") 