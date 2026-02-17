#!/usr/bin/env python
"""
Test script to verify custom error pages work correctly
"""

import os
import django
from django.test import Client
from django.conf import settings

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

def test_error_pages():
    """Test custom error pages"""
    client = Client()
    
    print("=" * 60)
    print("Testing Custom Error Pages")
    print("=" * 60)
    
    # Test 404 - Page Not Found
    print("\n1. Testing 404 Error Page...")
    response = client.get('/nonexistent-page/')
    print(f"   Status Code: {response.status_code}")
    if response.status_code == 404:
        print("   ✅ 404 handler working")
        if b'Page Not Found' in response.content or b'404' in response.content:
            print("   ✅ Custom 404 template rendered")
        else:
            print("   ⚠️  Using default Django 404 page (DEBUG mode)")
    
    # Test templates exist
    print("\n2. Checking template files...")
    templates_dir = settings.BASE_DIR / 'templates'
    
    error_pages = {
        '404.html': '404 Page Not Found',
        '500.html': '500 Internal Server Error',
        '403.html': '403 Forbidden'
    }
    
    for template, description in error_pages.items():
        template_path = templates_dir / template
        if template_path.exists():
            print(f"   ✅ {description} template exists")
            # Check file size
            size = template_path.stat().st_size
            print(f"      Size: {size:,} bytes")
        else:
            print(f"   ❌ {description} template missing")
    
    # Test TEMPLATES configuration
    print("\n3. Checking TEMPLATES configuration...")
    if templates_dir in settings.TEMPLATES[0]['DIRS']:
        print("   ✅ Templates directory configured in settings")
    else:
        print("   ⚠️  Templates directory not in DIRS")
    
    # Test error handlers configuration
    print("\n4. Checking error handlers...")
    from saluslogica import urls
    
    handlers = {
        'handler404': '404 - Page Not Found',
        'handler500': '500 - Internal Server Error',
        'handler403': '403 - Forbidden'
    }
    
    for handler, description in handlers.items():
        if hasattr(urls, handler):
            handler_path = getattr(urls, handler)
            print(f"   ✅ {description} handler configured: {handler_path}")
        else:
            print(f"   ❌ {description} handler not configured")
    
    # Check DEBUG mode
    print("\n5. Current configuration...")
    print(f"   DEBUG mode: {settings.DEBUG}")
    if settings.DEBUG:
        print("   ⚠️  Custom error pages only fully work when DEBUG=False")
        print("      To test in production mode, set DEBUG=False in .env")
    else:
        print("   ✅ Production mode - custom error pages active")
    
    print("\n" + "=" * 60)
    print("Error Pages Test Complete!")
    print("=" * 60)
    
    print("\n📝 Usage Notes:")
    print("   - Error pages are in: backend/templates/")
    print("   - To see them in action, set DEBUG=False in .env")
    print("   - In DEBUG mode, Django shows detailed error pages")
    print("   - In production, users see the custom error pages")
    
    print("\n🔍 To manually test:")
    print("   1. Set DEBUG=False in your .env file")
    print("   2. Run: python manage.py runserver")
    print("   3. Visit: http://localhost:8000/nonexistent-page/")
    print("   4. You should see the custom 404 page")

if __name__ == '__main__':
    test_error_pages()
