from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Update user first and last names'
    
    def handle(self, *args, **options):
        # نمونه داده‌ها برای آپدیت نام کاربران
        user_data = {
            'CEO': {'first_name': 'علی', 'last_name': 'احمدی'},
            'Executive': {'first_name': 'مریم', 'last_name': 'محمدی'},
            'Manager': {'first_name': 'حسن', 'last_name': 'کریمی'},
            'dablir': {'first_name': 'فاطمه', 'last_name': 'رضایی'},
            'admin': {'first_name': 'مدیر', 'last_name': 'سیستم'},
            'secretary': {'first_name': 'منشی', 'last_name': 'اداری'},
        }
        
        updated_count = 0
        
        for username, name_data in user_data.items():
            try:
                user = User.objects.get(username=username)
                user.first_name = name_data['first_name']
                user.last_name = name_data['last_name']
                user.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully updated user "{username}" -> {name_data["first_name"]} {name_data["last_name"]}'
                    )
                )
                updated_count += 1
                
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'User "{username}" not found')
                )
        
        # آپدیت کاربرانی که نام ندارند
        users_without_names = User.objects.filter(
            first_name__isnull=True
        ).union(
            User.objects.filter(first_name='')
        )
        
        for user in users_without_names:
            if user.username not in user_data:
                # نام‌های پیش‌فرض بر اساس username
                if 'admin' in user.username.lower():
                    user.first_name = 'مدیر'
                    user.last_name = 'سیستم'
                elif 'manager' in user.username.lower():
                    user.first_name = 'مدیر'
                    user.last_name = 'بخش'
                elif 'executive' in user.username.lower():
                    user.first_name = 'معاون'
                    user.last_name = 'اجرایی'
                else:
                    # نام پیش‌فرض
                    user.first_name = 'کاربر'
                    user.last_name = user.username.title()
                
                user.save()
                updated_count += 1
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Updated user "{user.username}" with default names -> {user.first_name} {user.last_name}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Total users updated: {updated_count}')
        ) 