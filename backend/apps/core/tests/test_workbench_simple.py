#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tse_resolutions.settings')
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
django.setup()

from core.views import UserWorkbenchListView
from core.models import Resolution, User
from core.serializers import ResolutionSerializer
from rest_framework.test import APIRequestFactory
import json

print("=== Testing Workbench Response ===")

# Get Development user
development_user = User.objects.get(username='Development')

# Test the view directly
view = UserWorkbenchListView()
factory = APIRequestFactory()
request = factory.get('/api/resolutions/workbench/')
request.user = development_user
view.request = request

# Get queryset
queryset = view.get_queryset()
print(f"Number of resolutions for Development: {queryset.count()}")

# Test serializer
serializer = ResolutionSerializer(queryset, many=True, context={'request': request})
data = serializer.data

print(f"Number of resolutions serialized: {len(data)}")

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

print(f"\n=== Summary ===")
print(f"Total resolutions: {len(data)}")
with_executor = [r for r in data if r.get('executor_name')]
print(f"Resolutions with executor_name: {len(with_executor)}")
print(f"Example with executor: {with_executor[0].get('executor_name') if with_executor else 'None'}") 