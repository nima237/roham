from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import UserProfile

class Command(BaseCommand):
    help = 'Create UserProfile instances for existing users and set up sample hierarchy'

    def handle(self, *args, **options):
        # ایجاد UserProfile برای کاربران بدون پروفایل
        users_without_profile = User.objects.filter(profile__isnull=True)
        
        for user in users_without_profile:
            UserProfile.objects.create(
                user=user,
                position='employee',  # پیش‌فرض
                department='عمومی'
            )
            self.stdout.write(f"Created profile for {user.username}")
        
        # تنظیم سلسله مراتب نمونه
        try:
            # پیدا کردن کاربران بر اساس username
            dabir = User.objects.get(username='dabir')
            ceo = User.objects.get(username='CEO')
            development = User.objects.get(username='Development')
            financial = User.objects.get(username='Financial')
            accounting = User.objects.get(username='Accounting')
            
            # تنظیم سمت‌ها
            dabir.profile.position = 'secretary'
            dabir.profile.department = 'دبیرخانه'
            dabir.profile.save()
            
            ceo.profile.position = 'deputy'
            ceo.profile.department = 'مدیریت عامل'
            ceo.profile.save()
            
            # معاونت توسعه زیر نظر مدیرعامل
            development.profile.position = 'deputy'
            development.profile.department = 'توسعه و راهبرد'
            development.profile.supervisor = ceo
            development.profile.save()
            
            # مدیر مالی زیر نظر مدیرعامل
            financial.profile.position = 'manager'
            financial.profile.department = 'مالی'
            financial.profile.supervisor = ceo
            financial.profile.save()
            
            # رئیس اداره حسابداری زیر نظر مدیر مالی
            accounting.profile.position = 'head'
            accounting.profile.department = 'حسابداری'
            accounting.profile.supervisor = financial
            accounting.profile.save()
            
            # سایر کاربران زیر نظر معاونت توسعه
            other_users = User.objects.exclude(
                username__in=['dabir', 'CEO', 'Development', 'Financial', 'Accounting']
            )
            
            for user in other_users:
                if user.profile.position == 'employee':
                    user.profile.supervisor = development
                    user.profile.department = 'عملیات'
                    user.profile.save()
            
            self.stdout.write(
                self.style.SUCCESS('Successfully set up organizational hierarchy')
            )
            
        except User.DoesNotExist as e:
            self.stdout.write(
                self.style.WARNING(f'Some users not found: {e}')
            )
        
        # نمایش سلسله مراتب
        self.stdout.write('\n=== سلسله مراتب سازمانی ===')
        top_level = User.objects.filter(profile__supervisor__isnull=True)
        
        def print_hierarchy(user, level=0):
            indent = "  " * level
            position = user.profile.get_position_display()
            name = user.get_full_name() or user.username
            dept = user.profile.department
            self.stdout.write(f"{indent}{name} - {position} ({dept})")
            
            subordinates = User.objects.filter(profile__supervisor=user)
            for sub in subordinates:
                print_hierarchy(sub, level + 1)
        
        for user in top_level:
            print_hierarchy(user) 