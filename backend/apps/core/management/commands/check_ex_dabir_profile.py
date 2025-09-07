from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.core.models import UserProfile

class Command(BaseCommand):
    help = 'Check ex_dabir user profile and permissions'

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username='ex_dabir')
            profile = UserProfile.objects.get(user=user)
            self.stdout.write(self.style.SUCCESS(f'User: {user.username}'))
            self.stdout.write(f'  is_active: {user.is_active}')
            self.stdout.write(f'  is_staff: {user.is_staff}')
            self.stdout.write(f'  is_superuser: {user.is_superuser}')
            self.stdout.write(f'  groups: {[g.name for g in user.groups.all()]}')
            self.stdout.write(f'  position: {profile.position}')
            self.stdout.write(f'  department: {profile.department}')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('User ex_dabir does not exist'))
        except UserProfile.DoesNotExist:
            self.stdout.write(self.style.ERROR('UserProfile for ex_dabir does not exist')) 