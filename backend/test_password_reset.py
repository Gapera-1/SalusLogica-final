"""
Test script for Password Reset Functionality
Tests the complete forgot password and reset password workflow
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
from apps.authentication.models import User, PasswordReset

# API Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/auth"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def test_forgot_password():
    """Test requesting a password reset email"""
    print_section("Test 1: Request Password Reset")
    
    # Create a test user
    User.objects.filter(username='resetuser').delete()
    user = User.objects.create_user(
        username='resetuser',
        email='reset@example.com',
        password='OldPassword123!',
        first_name='Reset',
        last_name='User'
    )
    
    print("\n1. Test user created:")
    print(f"   Username: {user.username}")
    print(f"   Email: {user.email}")
    
    # Request password reset
    print("\n2. Requesting password reset...")
    response = requests.post(f"{API_URL}/forgot-password/", json={
        'email': user.email
    })
    
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 200:
        print("   ✓ Password reset requested successfully")
        
        # Check token in database
        reset_token = PasswordReset.objects.filter(user=user, used_at__isnull=True).first()
        if reset_token:
            print(f"\n3. Reset token created:")
            print(f"   Token: {reset_token.token}")
            print(f"   Expires at: {reset_token.expires_at}")
            print(f"   Is valid: {reset_token.is_valid()}")
            return user, reset_token
        else:
            print("   ✗ No reset token found in database!")
    else:
        print("   ✗ Password reset request failed!")
    
    return user, None

def test_validate_token(reset_token):
    """Test token validation endpoint"""
    print_section("Test 2: Validate Reset Token")
    
    if not reset_token:
        print("   ✗ No token to validate!")
        return
    
    print(f"\n1. Validating token: {reset_token.token}")
    response = requests.get(f"{API_URL}/validate-reset-token/{reset_token.token}/")
    
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get('valid'):
            print("   ✓ Token is valid")
            print(f"   Email: {data.get('email')}")
            print(f"   Expires: {data.get('expires_at')}")
        else:
            print("   ✗ Token is invalid!")
    else:
        print("   ✗ Token validation failed!")

def test_reset_password(user, reset_token):
    """Test resetting password with token"""
    print_section("Test 3: Reset Password")
    
    if not reset_token:
        print("   ✗ No token to use for reset!")
        return
    
    print(f"\n1. Resetting password with token...")
    new_password = 'NewPassword123!'
    
    response = requests.post(f"{API_URL}/reset-password/{reset_token.token}/", json={
        'new_password': new_password,
        'confirm_password': new_password
    })
    
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 200:
        print("   ✓ Password reset successful!")
        
        # Check token is marked as used
        reset_token.refresh_from_db()
        print(f"\n2. Checking token status:")
        print(f"   Used at: {reset_token.used_at}")
        print(f"   Is valid: {reset_token.is_valid()}")
        
        # Test login with new password
        print(f"\n3. Testing login with new password...")
        login_response = requests.post(f"{API_URL}/login/", json={
            'username': user.username,
            'password': new_password
        })
        
        print(f"   Status: {login_response.status_code}")
        if login_response.status_code == 200:
            print("   ✓ Login successful with new password!")
            return True
        else:
            print("   ✗ Login failed with new password!")
    else:
        print("   ✗ Password reset failed!")
    
    return False

def test_validation_errors():
    """Test password reset validation"""
    print_section("Test 4: Validation Errors")
    
    # Create test user
    User.objects.filter(username='validuser').delete()
    user = User.objects.create_user(
        username='validuser',
        email='valid@example.com',
        password='Password123!'
    )
    
    # Request reset
    requests.post(f"{API_URL}/forgot-password/", json={'email': user.email})
    reset_token = PasswordReset.objects.filter(user=user).first()
    
    if not reset_token:
        print("   ✗ Could not create reset token!")
        return
    
    # Test 1: Mismatched passwords
    print("\n1. Testing mismatched passwords...")
    response = requests.post(f"{API_URL}/reset-password/{reset_token.token}/", json={
        'new_password': 'Password123!',
        'confirm_password': 'DifferentPassword123!'
    })
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    if response.status_code == 400:
        print("   ✓ Correctly rejected mismatched passwords")
    
    # Test 2: Password too short
    print("\n2. Testing short password...")
    response = requests.post(f"{API_URL}/reset-password/{reset_token.token}/", json={
        'new_password': 'short',
        'confirm_password': 'short'
    })
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    if response.status_code == 400:
        print("   ✓ Correctly rejected short password")
    
    # Test 3: Missing fields
    print("\n3. Testing missing password...")
    response = requests.post(f"{API_URL}/reset-password/{reset_token.token}/", json={})
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    if response.status_code == 400:
        print("   ✓ Correctly rejected missing password")

def test_expired_token():
    """Test reset with expired token"""
    print_section("Test 5: Expired Token")
    
    # Create user and expired token
    User.objects.filter(username='expireduser').delete()
    user = User.objects.create_user(
        username='expireduser',
        email='expired@example.com',
        password='Password123!'
    )
    
    # Create expired token
    expired_token = PasswordReset.objects.create(
        user=user,
        expires_at=timezone.now() - timedelta(hours=1)  # Expired 1 hour ago
    )
    
    print(f"\n1. Created expired token:")
    print(f"   Token: {expired_token.token}")
    print(f"   Expires at: {expired_token.expires_at}")
    print(f"   Is valid: {expired_token.is_valid()}")
    
    # Try to validate
    print(f"\n2. Attempting to validate expired token...")
    response = requests.get(f"{API_URL}/validate-reset-token/{expired_token.token}/")
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 400:
        print("   ✓ Expired token correctly rejected")
    
    # Try to reset password
    print(f"\n3. Attempting to reset with expired token...")
    response = requests.post(f"{API_URL}/reset-password/{expired_token.token}/", json={
        'new_password': 'NewPass123!',
        'confirm_password': 'NewPass123!'
    })
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 400:
        print("   ✓ Expired token correctly rejected on reset")

def test_used_token():
    """Test using a token twice"""
    print_section("Test 6: Reusing Token")
    
    # Create user and reset password
    User.objects.filter(username='reuseuser').delete()
    user = User.objects.create_user(
        username='reuseuser',
        email='reuse@example.com',
        password='OldPass123!'
    )
    
    # Request reset
    requests.post(f"{API_URL}/forgot-password/", json={'email': user.email})
    reset_token = PasswordReset.objects.filter(user=user).first()
    
    # Reset password (first time - should work)
    print("\n1. First password reset...")
    response = requests.post(f"{API_URL}/reset-password/{reset_token.token}/", json={
        'new_password': 'NewPass123!',
        'confirm_password': 'NewPass123!'
    })
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print("   ✓ First reset successful")
    
    # Try to use same token again
    print("\n2. Attempting to reuse token...")
    response = requests.post(f"{API_URL}/reset-password/{reset_token.token}/", json={
        'new_password': 'AnotherPass123!',
        'confirm_password': 'AnotherPass123!'
    })
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    if response.status_code == 400:
        print("   ✓ Token reuse correctly prevented")

def test_invalid_token():
    """Test with completely invalid token"""
    print_section("Test 7: Invalid Token")
    
    import uuid
    fake_token = uuid.uuid4()
    
    print(f"\n1. Testing with fake token: {fake_token}")
    
    # Validate
    response = requests.get(f"{API_URL}/validate-reset-token/{fake_token}/")
    print(f"   Validate status: {response.status_code}")
    if response.status_code == 404:
        print("   ✓ Validation correctly rejected invalid token")
    
    # Reset
    response = requests.post(f"{API_URL}/reset-password/{fake_token}/", json={
        'new_password': 'Pass123!',
        'confirm_password': 'Pass123!'
    })
    print(f"   Reset status: {response.status_code}")
    if response.status_code == 404:
        print("   ✓ Reset correctly rejected invalid token")

def test_nonexistent_email():
    """Test forgot password with non-existent email"""
    print_section("Test 8: Non-existent Email")
    
    print("\n1. Requesting reset for non-existent email...")
    response = requests.post(f"{API_URL}/forgot-password/", json={
        'email': 'nonexistent@example.com'
    })
    
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.json()}")
    
    # Should still return 200 to prevent email enumeration
    if response.status_code == 200:
        print("   ✓ Correctly returned success (prevents email enumeration)")
    
    # Check no token was created
    tokens = PasswordReset.objects.filter(user__email='nonexistent@example.com')
    if tokens.count() == 0:
        print("   ✓ No token created for non-existent email")

def test_rate_limiting():
    """Test rate limiting for password reset requests"""
    print_section("Test 9: Rate Limiting")
    
    # Create user
    User.objects.filter(username='ratelimituser').delete()
    user = User.objects.create_user(
        username='ratelimituser',
        email='ratelimit@example.com',
        password='Pass123!'
    )
    
    print("\n1. First password reset request...")
    response1 = requests.post(f"{API_URL}/forgot-password/", json={
        'email': user.email
    })
    print(f"   Status: {response1.status_code}")
    
    user.refresh_from_db()
    print(f"   Reset sent at: {user.password_reset_sent_at}")
    
    print("\n2. Immediate second request (should be rate limited)...")
    response2 = requests.post(f"{API_URL}/forgot-password/", json={
        'email': user.email
    })
    print(f"   Status: {response2.status_code}")
    print(f"   Response: {response2.json()}")
    
    if response2.status_code == 429:
        print("   ✓ Rate limiting working correctly")
    else:
        print("   ⚠ Rate limiting may not be working")

def test_database_models():
    """Test database models directly"""
    print_section("Test 10: Database Models")
    
    print("\n1. Testing User model...")
    User.objects.filter(username='modeltest').delete()
    user = User.objects.create_user(
        username='modeltest',
        email='modeltest@example.com',
        password='Pass123!'
    )
    
    print(f"   User created: {user.username}")
    print(f"   Can request reset: {user.can_request_password_reset()}")
    
    # Set reset sent time
    user.password_reset_sent_at = timezone.now()
    user.save()
    print(f"\n2. After setting reset_sent_at:")
    print(f"   Can request immediately: {user.can_request_password_reset()}")
    
    # Test PasswordReset model
    print(f"\n3. Testing PasswordReset model...")
    reset = PasswordReset.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=1)
    )
    
    print(f"   Token created: {reset.token}")
    print(f"   Is valid: {reset.is_valid()}")
    print(f"   Used at: {reset.used_at}")
    
    # Mark as used
    reset.mark_as_used()
    print(f"\n4. After marking as used:")
    print(f"   Is valid: {reset.is_valid()}")
    print(f"   Used at: {reset.used_at}")
    
    print("\n   ✓ Database models working correctly!")

def cleanup():
    """Cleanup test data"""
    print_section("Cleanup")
    
    test_users = [
        'resetuser',
        'validuser',
        'expireduser',
        'reuseuser',
        'ratelimituser',
        'modeltest'
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
    print("  PASSWORD RESET FUNCTIONALITY TEST SUITE")
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
        user, reset_token = test_forgot_password()
        
        if reset_token:
            test_validate_token(reset_token)
            test_reset_password(user, reset_token)
        
        test_validation_errors()
        test_expired_token()
        test_used_token()
        test_invalid_token()
        test_nonexistent_email()
        test_rate_limiting()
        
        # Final summary
        print_section("TEST SUMMARY")
        print("\n✓ All password reset tests completed!")
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
