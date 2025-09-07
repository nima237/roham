import csv
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import UserProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Import users from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to CSV file')

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                username = row.get('username', '').strip()
                first_name = row.get('first_name', '').strip()
                last_name = row.get('last_name', '').strip()
                email = row.get('email', '').strip()
                position = row.get('position', 'employee').strip()
                department = row.get('department', '').strip()
                
                if not username:
                    continue
                
                # Create user if doesn't exist
                user, created = User.objects.get_or_create(
                    username=username,
                    defaults={
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': email,
                        'password': 'changeme123'  # Default password
                    }
                )
                
                if created:
                    self.stdout.write(f'Created user: {username}')
                else:
                    self.stdout.write(f'User already exists: {username}')
                
                # Create or update profile
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
                
                if profile_created:
                    self.stdout.write(f'Created profile for: {username}')
                else:
                    self.stdout.write(f'Updated profile for: {username}')
        
        self.stdout.write(self.style.SUCCESS('User import completed!')) 