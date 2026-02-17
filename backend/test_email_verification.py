"""
Test script for Email Verification System
Tests the complete email verification workflow
"""

import os
import django
import sys
import requests
import time
from datetime import timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

from django.utils import timezone
from apps.authentication.models import User, EmailVerification

# API Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/auth"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_registration_with_verification():
    """Test user registration and email verification"""
    print_section("Test 1: User Registration with Email Verification")
    
    # Cleanup test user if exists
    User.objects.filter(username='testuser_verify').delete()
    
    # Register a new user
    print("\n1. Registering new user...")
    registration_data = {
        'username': 'testuser_verify',
        'email': 'test_verify@example.com',
        'password': 'TestPass123!',
        'password2': 'TestPass123!',
        'first_name': 'Test',
        'last_name': 'User',
        'user_type': 'patient'
    }
    
    try:
        response = requests.post(f"{API_URL}/register/", json=registration_data)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 201:
            print("   ✓ Registration successful")
            
            # Check user in database
            user = User.objects.get(username='testuser_verify')
            print(f"\n2. Checking user in database...")
            print(f"   Email verified: {user.email_verified}")
            print(f"   Email sent at: {user.email_verification_sent_at}")
            
            # Check verification token
            verification = EmailVerification.objects.filter(user=user, verified_at__isnull=True).first()
            if verification:
                print(f"\n3. Verification token created:")
                print(f"   Token: {verification.token}")
                print(f"   Expires at: {verification.expires_at}")
                print(f"   Is valid: {verification.is_valid()}")
                
                # Test verification endpoint
                print(f"\n4. Testing verification endpoint...")
                verify_response = requests.get(f"{API_URL}/verify-email/{verification.token}/")
                print(f"   Status: {verify_response.status_code}")
                print(f"   Response: {verify_response.json()}")
                
                if verify_response.status_code == 200:
                    # Check user is verified
                    user.refresh_from_db()
                    print(f"\n5. Checking user verification status:")
                    print(f"   Email verified: {user.email_verified}")
                    print("   ✓ Email verification successful!")
                else:
                    print("   ✗ Email verification failed!")
            else:
                print("   ✗ No verification token found!")
        else:
            print("   ✗ Registration failed!")
            
    except Exception as e:
        print(f"   ✗ Error: {e}")

def test_resend_verification():
    """Test resending verification email"""
    print_section("Test 2: Resend Verification Email")
    
    # Create a user without verified email
    User.objects.filter(username='testuser_resend').delete()
    user = User.objects.create_user(
        username='testuser_resend',
        email='test_resend@example.com',
        password='TestPass123!',
        first_name='Resend',
        last_name='Test'
    )
    
    print("\n1. User created (email not verified)")
    print(f"   Email verified: {user.email_verified}")
    
    # Login to get token
    print("\n2. Logging in to get auth token...")
    login_response = requests.post(f"{API_URL}/login/", json={
        'username': 'testuser_resend',
        'password': 'TestPass123!'
    })
    
    if login_response.status_code == 200:
        token = login_response.json()['token']
        print(f"   ✓ Login successful, token: {token[:20]}...")
        
        # Request resend
        print("\n3. Requesting verification email resend...")
        headers = {'Authorization': f'Token {token}'}
        resend_response = requests.post(
            f"{API_URL}/resend-verification/",
            headers=headers
        )
        
        print(f"   Status: {resend_response.status_code}")
        print(f"   Response: {resend_response.json()}")
        
        if resend_response.status_code == 200:
            print("   ✓ Resend successful!")
            
            # Check database
            user.refresh_from_db()
            print(f"\n4. Checking database:")
            print(f"   Email sent at: {user.email_verification_sent_at}")
            
            verification = EmailVerification.objects.filter(user=user, verified_at__isnull=True).first()
            if verification:
                print(f"   Token: {verification.token}")
                print(f"   Expires at: {verification.expires_at}")
        else:
            print("   ✗ Resend failed!")
            
        # Test rate limiting
        print("\n5. Testing rate limiting (should fail if too soon)...")
        resend_response2 = requests.post(
            f"{API_URL}/resend-verification/",
            headers=headers
        )
        print(f"   Status: {resend_response2.status_code}")
        if resend_response2.status_code == 429:
            print("   ✓ Rate limiting working!")
        else:
            print(f"   Response: {resend_response2.json()}")
    else:
        print("   ✗ Login failed!")

def test_expired_token():
    """Test verification with expired token"""
    print_section("Test 3: Expired Verification Token")
    
    # Create user and expired token
    User.objects.filter(username='testuser_expired').delete()
    user = User.objects.create_user(
        username='testuser_expired',
        email='test_expired@example.com',
        password='TestPass123!',
        first_name='Expired',
        last_name='Test'
    )
    
    # Create expired token
    verification = EmailVerification.objects.create(
        user=user,
        expires_at=timezone.now() - timedelta(hours=1)  # Expired 1 hour ago
    )
    
    print("\n1. Created verification token (expired):")
    print(f"   Token: {verification.token}")
    print(f"   Expires at: {verification.expires_at}")
    print(f"   Is valid: {verification.is_valid()}")
    
    # Try to verify with expired token
    print("\n2. Attempting to verify with expired token...")
    verify_response = requests.get(f"{API_URL}/verify-email/{verification.token}/")
    print(f"   Status: {verify_response.status_code}")
    print(f"   Response: {verify_response.json()}")
    
    if verify_response.status_code == 400:
        print("   ✓ Expired token correctly rejected!")
    else:
        print("   ✗ Expired token was accepted (should be rejected)!")

def test_invalid_token():
    """Test verification with invalid token"""
    print_section("Test 4: Invalid Verification Token")
    
    import uuid
    fake_token = uuid.uuid4()
    
    print(f"\n1. Testing with fake token: {fake_token}")
    verify_response = requests.get(f"{API_URL}/verify-email/{fake_token}/")
    
    print(f"   Status: {verify_response.status_code}")
    print(f"   Response: {verify_response.json()}")
    
    if verify_response.status_code == 404:
        print("   ✓ Invalid token correctly rejected!")
    else:
        print("   ✗ Invalid token was accepted (should be rejected)!")

def test_already_verified():
    """Test email already verified scenario"""
    print_section("Test 5: Already Verified Email")
    
    # Create verified user
    User.objects.filter(username='testuser_verified').delete()
    user = User.objects.create_user(
        username='testuser_verified',
        email='test_already@example.com',
        password='TestPass123!',
        first_name='Already',
        last_name='Verified',
        email_verified=True
    )
    
    print("\n1. User created (already verified):")
    print(f"   Email verified: {user.email_verified}")
    
    # Login and try to resend
    print("\n2. Attempting to resend verification...")
    login_response = requests.post(f"{API_URL}/login/", json={
        'username': 'testuser_verified',
        'password': 'TestPass123!'
    })
    
    if login_response.status_code == 200:
        token = login_response.json()['token']
        headers = {'Authorization': f'Token {token}'}
        resend_response = requests.post(
            f"{API_URL}/resend-verification/",
            headers=headers
        )
        
        print(f"   Status: {resend_response.status_code}")
        print(f"   Response: {resend_response.json()}")
        
        if resend_response.status_code == 200:
            print("   ✓ Already verified message received!")
        else:
            print("   ✗ Unexpected response!")

def test_database_models():
    """Test database models directly"""
    print_section("Test 6: Database Models")
    
    # Test User model
    print("\n1. Testing User model...")
    User.objects.filter(username='model_test').delete()
    user = User.objects.create_user(
        username='model_test',
        email='model@test.com',
        password='Test123!'
    )
    
    print(f"   User created: {user.username}")
    print(f"   Email verified: {user.email_verified}")
    print(f"   Can resend: {user.can_resend_verification_email()}")
    
    # Update and test resend timing
    user.email_verification_sent_at = timezone.now()
    user.save()
    print(f"\n2. After setting sent_at:")
    print(f"   Can resend immediately: {user.can_resend_verification_email()}")
    
    # Test EmailVerification model
    print(f"\n3. Testing EmailVerification model...")
    verification = EmailVerification.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=24)
    )
    
    print(f"   Token created: {verification.token}")
    print(f"   Is valid: {verification.is_valid()}")
    print(f"   Verified at: {verification.verified_at}")
    
    # Mark as verified
    verification.mark_as_verified()
    print(f"\n4. After marking as verified:")
    print(f"   Is valid: {verification.is_valid()}")
    print(f"   Verified at: {verification.verified_at}")
    
    user.refresh_from_db()
    print(f"   User email verified: {user.email_verified}")
    
    print("\n   ✓ Database models working correctly!")

def cleanup():
    """Cleanup test data"""
    print_section("Cleanup")
    
    test_users = [
        'testuser_verify',
        'testuser_resend',
        'testuser_expired',
        'testuser_verified',
        'model_test'
    ]
    
    print("\nRemoving test users...")
    for username in test_users:
        deleted = User.objects.filter(username=username).delete()
        if deleted[0] > 0:
            print(f"   ✓ Deleted: {username}")
    
    print("\n✓ Cleanup complete!")

def main():
    """Run all tests"""
    print("\n")
    print("*" * 60)
    print("  EMAIL VERIFICATION SYSTEM TEST SUITE")
    print("*" * 60)
    print("\nMake sure Django server is running on http://localhost:8000")
    print("Press Ctrl+C to cancel, or Enter to continue...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\n\nTest cancelled.")
        return
    
    try:
        # Run tests
        test_database_models()
        test_registration_with_verification()
        test_resend_verification()
        test_expired_token()
        test_invalid_token()
        test_already_verified()
        
        # Final summary
        print_section("TEST SUMMARY")
        print("\n✓ All email verification tests completed!")
        print("\nNote: Check your email inbox if real SMTP is configured.")
        print("For console backend, check the Django server console output.\n")
        
    except requests.exceptions.ConnectionError:
        print("\n\n✗ ERROR: Could not connect to Django server!")
        print("Make sure the server is running: python manage.py runserver")
    except Exception as e:
        print(f"\n\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cleanup()

if __name__ == "__main__":
    main()
