import csv
import json
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User, Group
from apps.core.models import UserProfile
from django.db import transaction
import os

class Command(BaseCommand):
    help = 'Import users from CSV or JSON file'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--file', 
            type=str, 
            required=True, 
            help='Path to CSV or JSON file'
        )
        parser.add_argument(
            '--format',
            type=str,
            choices=['csv', 'json'],
            default='csv',
            help='File format (csv or json)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without making changes'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing users if they exist'
        )
    
    def handle(self, *args, **options):
        file_path = options['file']
        file_format = options['format']
        dry_run = options['dry_run']
        update_existing = options['update']
        
        if not os.path.exists(file_path):
            self.stdout.write(
                self.style.ERROR(f'File not found: {file_path}')
            )
            return
        
        if file_format == 'csv':
            self.import_from_csv(file_path, dry_run, update_existing)
        else:
            self.import_from_json(file_path, dry_run, update_existing)
    
    def import_from_csv(self, file_path, dry_run, update_existing):
        users_data = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    users_data.append(row)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error reading CSV file: {e}')
            )
            return
        
        self.process_users(users_data, dry_run, update_existing)
    
    def import_from_json(self, file_path, dry_run, update_existing):
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                users_data = json.load(file)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error reading JSON file: {e}')
            )
            return
        
        self.process_users(users_data, dry_run, update_existing)
    
    def process_users(self, users_data, dry_run, update_existing):
        created_count = 0
        updated_count = 0
        error_count = 0
        
        self.stdout.write(f'\n📊 Processing {len(users_data)} users...\n')
        
        for user_data in users_data:  
            try:
                username = user_data.get('username', '').strip()
                if not username:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  Skipping user with empty username')
                    )
                    continue
                
                # Check if user exists
                user_exists = User.objects.filter(username=username).exists()
                
                if user_exists and not update_existing:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  User {username} already exists (use --update to update)')
                    )
                    continue
                
                if dry_run:
                    action = 'UPDATE' if user_exists else 'CREATE'
                    self.stdout.write(f'🔍 {action}: {username}')
                    continue
                
                # Process user creation/update
                if user_exists:
                    if self.update_user(user_data, username):
                        updated_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'✅ Updated: {username}')
                        )
                    else:
                        error_count += 1
                else:
                    if self.create_user(user_data):
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'✅ Created: {username}')
                        )
                    else:
                        error_count += 1
                        
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'❌ Error processing user {username}: {e}')
                )
        
        # Summary
        self.stdout.write('\n' + '='*50)
        self.stdout.write(f'📈 SUMMARY:')
        self.stdout.write(f'  ✅ Created: {created_count} users')
        self.stdout.write(f'  🔄 Updated: {updated_count} users') 
        self.stdout.write(f'  ❌ Errors: {error_count} users')
        self.stdout.write('='*50 + '\n')
    
    @transaction.atomic
    def create_user(self, user_data):
        try:
            username = user_data.get('username', '').strip()
            first_name = user_data.get('first_name', '').strip()
            last_name = user_data.get('last_name', '').strip()
            email = user_data.get('email', '').strip()
            password = user_data.get('password', 'default123').strip()
            is_active = self.parse_bool(user_data.get('is_active', 'True'))
            is_staff = self.parse_bool(user_data.get('is_staff', 'False'))
            is_superuser = self.parse_bool(user_data.get('is_superuser', 'False'))
            
            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=is_active,
                is_staff=is_staff,
                is_superuser=is_superuser
            )
            
            # Create UserProfile
            position = user_data.get('position', 'employee').strip()
            department = user_data.get('department', '').strip()
            supervisor_username = user_data.get('supervisor_username', '').strip()
            
            supervisor = None
            if supervisor_username:
                try:
                    supervisor = User.objects.get(username=supervisor_username)
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  Supervisor {supervisor_username} not found for {username}')
                    )
            
            UserProfile.objects.create(
                user=user,
                position=position,
                department=department,
                supervisor=supervisor
            )
            
            # Add to groups
            groups = user_data.get('groups', '').strip()
            if groups:
                group_names = [g.strip() for g in groups.split(',')]
                for group_name in group_names:
                    try:
                        group, created = Group.objects.get_or_create(name=group_name)
                        user.groups.add(group)
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'⚠️  Error adding group {group_name} to {username}: {e}')
                        )
            
            return True
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error creating user {username}: {e}')
            )
            return False
    
    @transaction.atomic
    def update_user(self, user_data, username):
        try:
            user = User.objects.get(username=username)
            
            # Update user fields
            user.first_name = user_data.get('first_name', user.first_name).strip()
            user.last_name = user_data.get('last_name', user.last_name).strip()
            user.email = user_data.get('email', user.email).strip()
            user.is_active = self.parse_bool(user_data.get('is_active', user.is_active))
            user.is_staff = self.parse_bool(user_data.get('is_staff', user.is_staff))
            user.is_superuser = self.parse_bool(user_data.get('is_superuser', user.is_superuser))
            
            # Update password if provided
            password = user_data.get('password', '').strip()
            if password:
                user.set_password(password)
            
            user.save()
            
            # Update UserProfile
            profile, created = UserProfile.objects.get_or_create(user=user)
            position = user_data.get('position', profile.position).strip()
            department = user_data.get('department', profile.department).strip()
            supervisor_username = user_data.get('supervisor_username', '').strip()
            
            profile.position = position
            profile.department = department
            
            if supervisor_username:
                try:
                    supervisor = User.objects.get(username=supervisor_username)
                    profile.supervisor = supervisor
                except User.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'⚠️  Supervisor {supervisor_username} not found for {username}')
                    )
            
            profile.save()
            
            # Update groups
            groups = user_data.get('groups', '').strip()
            if groups:
                user.groups.clear()  # Clear existing groups
                group_names = [g.strip() for g in groups.split(',')]
                for group_name in group_names:
                    try:
                        group, created = Group.objects.get_or_create(name=group_name)
                        user.groups.add(group)
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'⚠️  Error adding group {group_name} to {username}: {e}')
                        )
            
            return True
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error updating user {username}: {e}')
            )
            return False
    
    def parse_bool(self, value):
        """Convert string to boolean"""
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ['true', '1', 'yes', 'on']
        return bool(value) 