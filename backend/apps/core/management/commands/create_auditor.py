from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import UserProfile

class Command(BaseCommand):
    help = 'Create an auditor user for testing'

    def handle(self, *args, **options):
        # Create auditor user
        auditor_user, created = User.objects.get_or_create(
            username='auditor',
            defaults={
                'first_name': 'ناظر',
                'last_name': 'تست',
                'email': 'auditor@example.com',
                'is_active': True
            }
        )
        
        if created:
            auditor_user.set_password('auditor123')
            auditor_user.save()
            self.stdout.write(
                self.style.SUCCESS(f'Created new auditor user: {auditor_user.username}')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Auditor user already exists: {auditor_user.username}')
            )
        
        # Create or update profile
        profile, profile_created = UserProfile.objects.get_or_create(
            user=auditor_user,
            defaults={
                'position': 'auditor',
                'department': 'نظارت و کنترل'
            }
        )
        
        if profile_created:
            self.stdout.write(
                self.style.SUCCESS(f'Created new auditor profile for: {auditor_user.username}')
            )
        else:
            # Update existing profile to auditor
            profile.position = 'auditor'
            profile.department = 'نظارت و کنترل'
            profile.save()
            self.stdout.write(
                self.style.SUCCESS(f'Updated profile to auditor for: {auditor_user.username}')
            )
        
        self.stdout.write('\nAuditor user details:')
        self.stdout.write(f'  Username: {auditor_user.username}')
        self.stdout.write(f'  Name: {auditor_user.first_name} {auditor_user.last_name}')
        self.stdout.write(f'  Position: {profile.get_position_display()}')
        self.stdout.write(f'  Department: {profile.department}')
        self.stdout.write(f'  Password: auditor123') 