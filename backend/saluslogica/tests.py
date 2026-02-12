"""
Tests for Pharmacy Admin functionality
"""

from django.test import TestCase
from django.contrib.auth.models import User
from .utils.pharmacy_id_generator import PharmacyAdminIDGenerator
from .models import PharmacyAdmin


class PharmacyAdminIDGeneratorTest(TestCase):
    """Test cases for Pharmacy Admin ID Generator"""
    
    def setUp(self):
        self.generator = PharmacyAdminIDGenerator()
    
    def test_generate_valid_id(self):
        """Test generating a valid pharmacy admin ID"""
        pharmacy_id = self.generator.generate_id(
            country='RW',
            province='Kigali',
            district='Nyarugenge',
            facility_type='pharmacy'
        )
        
        # Check format: 11 characters total
        self.assertEqual(len(pharmacy_id), 11)
        
        # Check if it follows the pattern: 00x0y0zph/hp0n
        self.assertTrue(pharmacy_id.startswith('250'))  # Rwanda code
        self.assertTrue(pharmacy_id.endswith('PH'))    # Pharmacy type
        
        # Test parsing
        parsed = self.generator.parse_id(pharmacy_id)
        self.assertEqual(parsed['country'], 'RW')
        self.assertEqual(parsed['province'], 'Kigali')
        self.assertEqual(parsed['district'], 'Nyarugenge')
        self.assertEqual(parsed['facility_type'], 'pharmacy')
    
    def test_validate_id(self):
        """Test ID validation"""
        # Valid ID
        valid_id = '2500101PH01'
        self.assertTrue(self.generator.validate_id(valid_id))
        
        # Invalid IDs
        self.assertFalse(self.generator.validate_id('123'))  # Too short
        self.assertFalse(self.generator.validate_id('INVALID'))  # Invalid format
    
    def test_unique_ids(self):
        """Test that generated IDs are unique"""
        ids = set()
        for _ in range(10):
            pharmacy_id = self.generator.generate_id(
                country='RW',
                province='Kigali',
                district='Nyarugenge',
                facility_type='pharmacy'
            )
            self.assertNotIn(pharmacy_id, ids)
            ids.add(pharmacy_id)


class PharmacyAdminModelTest(TestCase):
    """Test cases for Pharmacy Admin model"""
    
    def test_create_pharmacy_admin(self):
        """Test creating a pharmacy admin"""
        # Create user
        user = User.objects.create_user(
            username='testpharmacy',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create pharmacy admin
        pharmacy_admin = PharmacyAdmin.objects.create(
            user=user,
            country='RW',
            province='Kigali',
            district='Nyarugenge',
            facility_name='Test Pharmacy',
            facility_type='pharmacy',
            phone_number='+250788123456',
            address='Test Address'
        )
        
        # Check that pharmacy ID was generated
        self.assertIsNotNone(pharmacy_admin.pharmacy_id)
        self.assertEqual(len(pharmacy_admin.pharmacy_id), 11)
        
        # Check facility name
        self.assertEqual(pharmacy_admin.facility_name, 'Test Pharmacy')
        self.assertEqual(pharmacy_admin.facility_type, 'pharmacy')
