#!/usr/bin/env python
"""Simulate the exact API call to reproduce the 500 error"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIClient
from users.models import User

# Create API client
client = APIClient()

# Get or create a user
user = User.objects.first()
if not user:
    print("No users found, creating test user...")
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )

# Authenticate
client.force_authenticate(user=user)

# Make the exact request
print("Making GET request to /api/defects/?page=1&page_size=25")
try:
    response = client.get('/api/defects/?page=1&page_size=25')
    print(f"\nResponse status: {response.status_code}")
    
    if response.status_code == 500:
        print("\n=== 500 ERROR DETAILS ===")
        print(f"Content length: {len(response.content)} bytes")
        print(f"Content type: {response.get('Content-Type', 'N/A')}")
        
        # Try to parse error details
        try:
            import json
            error_data = json.loads(response.content)
            print("\nJSON Error:")
            print(json.dumps(error_data, indent=2))
        except:
            print("\nRaw Content (first 2000 chars):")
            print(response.content.decode('utf-8', errors='replace')[:2000])
    else:
        print(f"Response data: {response.data}")
        
except Exception as e:
    import traceback
    print(f"\n✗ Request failed!")
    print(f"Error: {type(e).__name__}: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
