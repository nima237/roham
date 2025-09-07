#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tse_resolutions.settings')
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
django.setup()

from core.models import Resolution, User
from core.serializers import ResolutionSerializer
from rest_framework.test import APIRequestFactory
from django.contrib.auth.models import AnonymousUser

print("=== Testing Workbench API ===")

# Get a resolution with executor_unit
resolutions = Resolution.objects.filter(executor_unit__isnull=False)
print(f"Resolutions with executor: {resolutions.count()}")

if resolutions.exists():
    resolution_with_executor = resolutions.first()
    print(f"\nResolution with executor:")
    print(f"ID: {resolution_with_executor.id}")
    print(f"Description: {resolution_with_executor.description[:50]}...")
    print(f"Executor unit: {resolution_with_executor.executor_unit}")
    print(f"Executor name: {resolution_with_executor.executor_unit.get_full_name() if resolution_with_executor.executor_unit else 'None'}")
    
    # Test serializer
    factory = APIRequestFactory()
    request = factory.get('/')
    request.user = AnonymousUser()
    
    serializer = ResolutionSerializer(resolution_with_executor, context={'request': request})
    data = serializer.data
    
    print(f"\nSerialized executor_name: {data.get('executor_name')}")
    print(f"Serialized executor_unit: {data.get('executor_unit')}")
    
    # Check meeting structure
    print(f"\nMeeting structure: {data.get('meeting')}")
    
else:
    print("No resolutions with executor found")
    
# Test all resolutions like workbench does
print(f"\n=== Testing All Resolutions (like workbench) ===")
all_resolutions = Resolution.objects.all()[:5]
for i, res in enumerate(all_resolutions):
    serializer = ResolutionSerializer(res, context={'request': factory.get('/')})
    data = serializer.data
    print(f"{i+1}. ID: {res.id}, executor_name: {data.get('executor_name')}, executor_unit: {res.executor_unit}") 