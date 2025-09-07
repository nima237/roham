from django.contrib.auth.models import User
from apps.core.models import UserProfile

user = User.objects.get(username='ex_dabir')
profile = UserProfile.objects.get(user=user)
print(f'User: {user.username}')
print(f'  is_active: {user.is_active}')
print(f'  is_staff: {user.is_staff}')
print(f'  is_superuser: {user.is_superuser}')
print(f'  groups: {[g.name for g in user.groups.all()]}')
print(f'  position: {profile.position}')
print(f'  department: {profile.department}') 