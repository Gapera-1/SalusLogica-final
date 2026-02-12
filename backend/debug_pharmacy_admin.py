"""
Debug script for pharmacy admin setup
"""

import os
import sys
import django

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

def test_pharmacy_admin_setup():
    """Test pharmacy admin setup"""
    print("🔍 Testing Pharmacy Admin Setup...")
    
    try:
        # Test 1: Import modules
        print("\n1. Testing imports...")
        from saluslogica.utils.pharmacy_id_generator import PharmacyAdminIDGenerator
        from saluslogica.models import PharmacyAdmin
        from saluslogica.views import PharmacyAdminSignupView
        print("✅ All imports successful")
        
        # Test 2: ID Generator
        print("\n2. Testing ID Generator...")
        generator = PharmacyAdminIDGenerator()
        
        test_id = generator.generate_id(
            country='RW',
            province='Kigali',
            district='Nyarugenge',
            facility_type='pharmacy'
        )
        print(f"✅ Generated ID: {test_id}")
        
        parsed = generator.parse_id(test_id)
        print(f"✅ Parsed ID: {parsed}")
        
        is_valid = generator.validate_id(test_id)
        print(f"✅ ID validation: {is_valid}")
        
        # Test 3: Database connection
        print("\n3. Testing database connection...")
        from django.contrib.auth.models import User
        user_count = User.objects.count()
        pharmacy_admin_count = PharmacyAdmin.objects.count()
        print(f"✅ Database connection OK")
        print(f"   Users: {user_count}")
        print(f"   Pharmacy admins: {pharmacy_admin_count}")
        
        # Test 4: Model creation
        print("\n4. Testing model creation...")
        test_user = User.objects.create_user(
            username='debug_test_user',
            email='debug@test.com',
            password='testpass123'
        )
        
        test_pharmacy_admin = PharmacyAdmin.objects.create(
            user=test_user,
            country='RW',
            province='Kigali',
            district='Nyarugenge',
            facility_name='Debug Test Pharmacy',
            facility_type='pharmacy',
            phone_number='+250788123456',
            address='Debug Test Address'
        )
        
        print(f"✅ Created pharmacy admin: {test_pharmacy_admin.pharmacy_id}")
        
        # Clean up
        test_pharmacy_admin.delete()
        test_user.delete()
        print("✅ Cleaned up test data")
        
        print("\n🎉 All tests passed! Pharmacy admin setup is working correctly.")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_pharmacy_admin_setup()
    sys.exit(0 if success else 1)
