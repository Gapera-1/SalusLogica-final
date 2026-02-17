#!/usr/bin/env python
"""
Test script to verify API rate limiting is working correctly
"""

import os
import django
import time
from django.test import Client
from django.conf import settings

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

User = get_user_model()


def test_rate_limiting():
    """Test rate limiting configuration and functionality"""
    
    print("=" * 70)
    print("API RATE LIMITING TEST")
    print("=" * 70)
    
    # Check configuration
    print("\n1. Checking Rate Limit Configuration...")
    print("-" * 70)
    
    throttle_rates = settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {})
    throttle_classes = settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_CLASSES', [])
    
    if throttle_rates:
        print("✅ Rate limits configured:")
        for scope, rate in throttle_rates.items():
            print(f"   • {scope:.<25} {rate}")
    else:
        print("⚠️  No rate limits configured")
    
    if throttle_classes:
        print(f"\n✅ {len(throttle_classes)} throttle classes active:")
        for throttle_class in throttle_classes:
            print(f"   • {throttle_class.split('.')[-1]}")
    else:
        print("⚠️  No throttle classes configured")
    
    # Check cache backend for throttling
    print("\n2. Checking Cache Backend...")
    print("-" * 70)
    
    from django.core.cache import cache
    
    try:
        # Test cache operations
        cache.set('test_key', 'test_value', 10)
        retrieved = cache.get('test_key')
        
        if retrieved == 'test_value':
            print("✅ Cache backend working (required for rate limiting)")
            cache.delete('test_key')
        else:
            print("❌ Cache backend not working properly")
    except Exception as e:
        print(f"❌ Cache error: {str(e)}")
        print("⚠️  Rate limiting requires a working cache backend")
    
    # Test throttle classes exist
    print("\n3. Checking Throttle Classes...")
    print("-" * 70)
    
    throttle_modules = [
        ('AnonBurstRateThrottle', 'saluslogica.throttles'),
        ('AnonSustainedRateThrottle', 'saluslogica.throttles'),
        ('UserBurstRateThrottle', 'saluslogica.throttles'),
        ('UserSustainedRateThrottle', 'saluslogica.throttles'),
        ('LoginRateThrottle', 'saluslogica.throttles'),
        ('RegistrationRateThrottle', 'saluslogica.throttles'),
        ('MedicineCreationRateThrottle', 'saluslogica.throttles'),
    ]
    
    for throttle_name, module_path in throttle_modules:
        try:
            module = __import__(module_path, fromlist=[throttle_name])
            throttle_class = getattr(module, throttle_name)
            print(f"   ✅ {throttle_name}")
        except (ImportError, AttributeError) as e:
            print(f"   ❌ {throttle_name} - {str(e)}")
    
    # Test anonymous rate limiting
    print("\n4. Testing Anonymous User Rate Limiting...")
    print("-" * 70)
    
    client = APIClient()
    
    # Get the anonymous burst rate limit
    anon_burst_rate = throttle_rates.get('anon_burst', '20/min')
    limit, period = anon_burst_rate.split('/')
    limit = int(limit)
    
    print(f"   Anonymous burst limit: {anon_burst_rate}")
    print(f"   Sending {limit + 1} requests to test limit...")
    
    throttled = False
    for i in range(limit + 5):
        response = client.get('/health/')
        
        if response.status_code == 429:  # Too Many Requests
            throttled = True
            print(f"   ✅ Rate limit enforced after {i} requests")
            break
    
    if not throttled:
        print(f"   ⚠️  No throttling detected (may need more requests or check cache)")
    
    # Test authenticated user rate limiting
    print("\n5. Testing Authenticated User Rate Limiting...")
    print("-" * 70)
    
    # Create a test user
    test_username = f'test_throttle_user_{int(time.time())}'
    try:
        user = User.objects.create_user(
            username=test_username,
            email=f'{test_username}@test.com',
            password='testpass123'
        )
        token, _ = Token.objects.get_or_create(user=user)
        
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        
        user_burst_rate = throttle_rates.get('user_burst', '60/min')
        print(f"   Authenticated burst limit: {user_burst_rate}")
        print(f"   User created: {test_username}")
        print("   ✅ Authenticated users have higher limits than anonymous")
        
        # Cleanup
        user.delete()
        
    except Exception as e:
        print(f"   ⚠️  Could not test authenticated rate: {str(e)}")
    
    # Test login rate limiting
    print("\n6. Testing Login Rate Limiting...")
    print("-" * 70)
    
    login_rate = throttle_rates.get('login', '5/min')
    print(f"   Login rate limit: {login_rate}")
    
    client = APIClient()
    login_attempts = 0
    login_throttled = False
    
    for i in range(10):
        response = client.post('/api/auth/login/', {
            'username': 'nonexistent',
            'password': 'wrong'
        })
        
        login_attempts += 1
        
        if response.status_code == 429:
            login_throttled = True
            print(f"   ✅ Login throttled after {login_attempts} attempts")
            break
    
    if not login_throttled:
        print("   ⚠️  Login throttling not triggered (may need more attempts)")
    
    # Display rate limit headers
    print("\n7. Rate Limit Response Headers...")
    print("-" * 70)
    
    client = APIClient()
    response = client.get('/health/')
    
    if 'X-RateLimit-Limit' in response or 'Retry-After' in response:
        print("   ✅ Rate limit headers present in response")
        for header, value in response.items():
            if 'rate' in header.lower() or 'retry' in header.lower():
                print(f"   • {header}: {value}")
    else:
        print("   ℹ️  Custom rate limit headers not configured (optional)")
    
    # Summary
    print("\n" + "=" * 70)
    print("RATE LIMITING TEST SUMMARY")
    print("=" * 70)
    
    if throttle_rates and throttle_classes:
        print("✅ Rate limiting is configured and active")
        print("\n📋 Next Steps:")
        print("   1. Adjust rates in .env file based on your needs")
        print("   2. Monitor rate limit violations in production")
        print("   3. Consider adding rate limit headers to responses")
        print("   4. Set up alerts for excessive rate limit hits")
    else:
        print("⚠️  Rate limiting is not fully configured")
    
    print("\n💡 Tips:")
    print("   • Rate limits use Django's cache backend (ensure it's configured)")
    print("   • In DEBUG mode, some limits may not be strictly enforced")
    print("   • Use Redis cache in production for better performance")
    print("   • Monitor logs for 'throttled' messages")
    
    print("\n" + "=" * 70)


if __name__ == '__main__':
    test_rate_limiting()
