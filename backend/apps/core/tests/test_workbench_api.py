#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tse_resolutions.settings')
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
import json

print("=== Testing Workbench API Endpoint ===")

# Get admin user
admin_user = User.objects.get(username='admin')
refresh = RefreshToken.for_user(admin_user)
access_token = str(refresh.access_token)

# Create client and make request
client = Client()
response = client.get(
    '/api/resolutions/workbench/',
    HTTP_AUTHORIZATION=f'Bearer {access_token}'
)

print(f"Status code: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"Number of resolutions returned: {len(data)}")
    
    if data:
        # Check first few resolutions
        for i, resolution in enumerate(data[:3]):
            print(f"\nResolution {i+1}:")
            print(f"  ID: {resolution.get('id')}")
            print(f"  Meeting: {resolution.get('meeting')}")
            print(f"  Description: {resolution.get('description', '')[:50]}...")
            print(f"  Executor unit: {resolution.get('executor_unit')}")
            print(f"  Executor name: {resolution.get('executor_name')}")
            print(f"  Type: {resolution.get('type')}")
            print(f"  Status: {resolution.get('status')}")
    else:
        print("No resolutions returned")
else:
    print(f"Error: {response.content}") 