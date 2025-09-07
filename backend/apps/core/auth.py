from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class LDAPBackend(ModelBackend):
    """
    LDAP Authentication Backend with fallback to JSON file
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        
        # Try real LDAP first
        try:
            import ldap
            from ldap.filter import filter_format
            
            # LDAP Configuration
            ldap_server_uri = getattr(settings, 'LDAP_SERVER_URI', 'ldap://localhost:389')
            ldap_bind_dn = getattr(settings, 'LDAP_BIND_DN', 'cn=admin,dc=rh-tse,dc=local')
            ldap_bind_password = getattr(settings, 'LDAP_BIND_PASSWORD', 'admin123')
            ldap_user_base = getattr(settings, 'LDAP_USER_BASE', 'ou=people,dc=rh-tse,dc=local')
            ldap_group_base = getattr(settings, 'LDAP_GROUP_BASE', 'ou=groups,dc=rh-tse,dc=local')
            
            # Connect to LDAP server
            conn = ldap.initialize(ldap_server_uri)
            conn.set_option(ldap.OPT_REFERRALS, 0)
            conn.set_option(ldap.OPT_PROTOCOL_VERSION, 3)
            
            # Bind with admin credentials
            conn.simple_bind_s(ldap_bind_dn, ldap_bind_password)
            
            # Search for user
            search_filter = filter_format("(uid=%s)", [username])
            result = conn.search_s(
                ldap_user_base,
                ldap.SCOPE_SUBTREE,
                search_filter,
                ['cn', 'sn', 'givenName', 'mail', 'displayName', 'department', 'title', 'description']
            )
            
            if not result:
                logger.warning(f"User not found in LDAP: {username}")
                conn.unbind_s()
                return self._fallback_to_json(username, password)
            
            user_dn, user_attrs = result[0]
            
            # Try to bind with user credentials
            try:
                conn.simple_bind_s(user_dn, password)
                logger.info(f"LDAP authentication successful for user: {username}")
            except ldap.INVALID_CREDENTIALS:
                logger.warning(f"Invalid password for user: {username}")
                conn.unbind_s()
                return None
            
            # Get user groups
            groups = self._get_user_groups(conn, user_dn, ldap_group_base)
            
            # Get or create Django user
            UserModel = get_user_model()
            
            try:
                user = UserModel.objects.get(username=username)
                # Update user info from LDAP
                user.first_name = user_attrs.get('givenName', [b''])[0].decode('utf-8')
                user.last_name = user_attrs.get('sn', [b''])[0].decode('utf-8')
                user.email = user_attrs.get('mail', [b''])[0].decode('utf-8')
                user.save()
            except UserModel.DoesNotExist:
                # Create new user
                user = UserModel.objects.create_user(
                    username=username,
                    first_name=user_attrs.get('givenName', [b''])[0].decode('utf-8'),
                    last_name=user_attrs.get('sn', [b''])[0].decode('utf-8'),
                    email=user_attrs.get('mail', [b''])[0].decode('utf-8'),
                    is_staff=username == 'admin',  # Only admin is staff
                    is_superuser=username == 'admin'  # Only admin is superuser
                )
            
            # Add user to groups
            from django.contrib.auth.models import Group
            for group_name in groups:
                group, created = Group.objects.get_or_create(name=group_name)
                user.groups.add(group)
            
            # Create or update user profile (position will be set manually)
            from .models import UserProfile
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'position': 'employee',  # Default position - to be set manually
                    'department': user_attrs.get('department', [b''])[0].decode('utf-8') if user_attrs.get('department') else '',
                }
            )
            if not created:
                # Update existing profile (keep position as is, only update department)
                profile.department = user_attrs.get('department', [b''])[0].decode('utf-8') if user_attrs.get('department') else profile.department
                profile.save()
            
            conn.unbind_s()
            return user
                
        except ImportError:
            logger.warning("python-ldap not available, falling back to JSON file")
            return self._fallback_to_json(username, password)
        except Exception as e:
            logger.error(f"LDAP authentication error: {str(e)}, falling back to JSON")
            return self._fallback_to_json(username, password)
    
    def _fallback_to_json(self, username, password):
        """Fallback to JSON file authentication"""
        try:
            import json
            import os
            
            # Load users from JSON file
            json_file_path = os.path.join(settings.BASE_DIR, 'ldap_users.json')
            
            if not os.path.exists(json_file_path):
                logger.error(f"LDAP users file not found: {json_file_path}")
                return None
                
            with open(json_file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Find user in the JSON data
            user_data = None
            for user in data.get('users', []):
                if user.get('username') == username and user.get('password') == password:
                    user_data = user
                    break
            
            if not user_data:
                logger.warning(f"User not found or invalid password: {username}")
                return None
            
            # Authentication successful, get or create Django user
            UserModel = get_user_model()
            
            try:
                user = UserModel.objects.get(username=username)
                # Update user info
                user.first_name = user_data.get('first_name', '')
                user.last_name = user_data.get('last_name', '')
                user.email = user_data.get('email', '')
                user.is_staff = user_data.get('is_staff', False)
                user.is_superuser = user_data.get('is_superuser', False)
                user.save()
            except UserModel.DoesNotExist:
                # Create new user
                user = UserModel.objects.create_user(
                    username=username,
                    first_name=user_data.get('first_name', ''),
                    last_name=user_data.get('last_name', ''),
                    email=user_data.get('email', ''),
                    is_staff=user_data.get('is_staff', False),
                    is_superuser=user_data.get('is_superuser', False)
                )
            
            # Add user to groups
            from django.contrib.auth.models import Group
            for group_name in user_data.get('groups', []):
                group, created = Group.objects.get_or_create(name=group_name)
                user.groups.add(group)
            
            # Create or update user profile
            from .models import UserProfile
            profile, created = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'position': user_data.get('position', 'employee'),
                    'department': user_data.get('department', ''),
                }
            )
            if not created:
                # Update existing profile
                profile.position = user_data.get('position', profile.position)
                profile.department = user_data.get('department', profile.department)
                profile.save()
            
            logger.info(f"JSON authentication successful for user: {username}")
            return user
                
        except Exception as e:
            logger.error(f"JSON authentication error: {str(e)}")
            return None
    
    def _get_user_groups(self, conn, user_dn, ldap_group_base):
        """Get user groups from LDAP"""
        try:
            from ldap.filter import filter_format
            # Search for groups that contain this user
            search_filter = filter_format("(member=%s)", [user_dn])
            result = conn.search_s(
                ldap_group_base,
                ldap.SCOPE_SUBTREE,
                search_filter,
                ['cn']
            )
            
            groups = []
            for group_dn, group_attrs in result:
                cn = group_attrs.get('cn', [b''])[0].decode('utf-8')
                groups.append(cn)
            
            return groups
        except Exception as e:
            logger.error(f"Error getting user groups: {str(e)}")
            return []

class CaseInsensitiveModelBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)
        try:
            case_insensitive_username_field = f'{UserModel.USERNAME_FIELD}__iexact'
            user = UserModel._default_manager.get(**{case_insensitive_username_field: username})
        except UserModel.DoesNotExist:
            # Run the default password hasher once to reduce the timing
            # difference between an existing and a non-existing user
            UserModel().set_password(password)
        else:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user 