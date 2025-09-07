from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from core.models import UserProfile

class Command(BaseCommand):
    help = 'Create a secretariat expert user with secretary-like access'

    def handle(self, *args, **options):
        username = 'exdabir'
        password = 'nima1234'
        first_name = 'کارشناس'
        last_name = 'دبیرخانه'
        email = 'exdabir@example.com'
        position = 'secretariat_expert'
        department = 'دبیرخانه'

        # ساخت یا گرفتن یوزر
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'is_active': True
            }
        )
        if created:
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created new user: {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'User already exists: {username}'))

        # ساخت یا آپدیت پروفایل
        profile, profile_created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'position': position,
                'department': department
            }
        )
        if not profile_created:
            profile.position = position
            profile.department = department
            profile.save()
            self.stdout.write(self.style.SUCCESS(f'Updated profile for: {username}'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Created profile for: {username}'))

        # اضافه کردن به گروه دبیر (secretary) اگر وجود دارد
        try:
            secretary_group = Group.objects.get(name__iexact='secretary')
            user.groups.add(secretary_group)
            self.stdout.write(self.style.SUCCESS(f'Added {username} to secretary group'))
        except Group.DoesNotExist:
            self.stdout.write(self.style.WARNING('secretary group does not exist!'))

        self.stdout.write(f'Username: {username}')
        self.stdout.write(f'Password: {password}')
        self.stdout.write(f'Position: {position}')
        self.stdout.write(f'Department: {department}') 