#!/usr/bin/env python
"""
Simple health check endpoint creator for Django.
Run this script once to create the health check view if it doesn't exist.
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

# Create health check view in core app
HEALTH_VIEW_CODE = '''
"""Health check endpoint for Docker health checks and monitoring."""
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    """
    Simple health check endpoint.
    Returns 200 OK if database is accessible.
    """
    try:
        # Check database connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        return JsonResponse({
            "status": "healthy",
            "database": "connected"
        })
    except Exception as e:
        return JsonResponse({
            "status": "unhealthy",
            "error": str(e)
        }, status=500)
'''

URLS_ADDITION = '''
# Health check endpoint (for Docker healthcheck)
from core.views import health_check
urlpatterns += [
    path('api/health/', health_check, name='health_check'),
]
'''

def main():
    # Create views.py if it doesn't have health_check
    views_file = Path(__file__).parent / 'core' / 'views.py'
    
    if views_file.exists():
        content = views_file.read_text()
        if 'health_check' not in content:
            print(f"Adding health_check to {views_file}")
            with open(views_file, 'a') as f:
                f.write('\n\n' + HEALTH_VIEW_CODE)
    else:
        print(f"Creating {views_file} with health_check")
        views_file.write_text(HEALTH_VIEW_CODE)
    
    print("✓ Health check endpoint ready")
    print("  Add to urls.py: path('api/health/', health_check, name='health_check')")

if __name__ == '__main__':
    main()
