"""
Management command to test pharmacy admin setup
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from saluslogica.models import PharmacyAdmin
from saluslogica.utils.pharmacy_id_generator import PharmacyAdminIDGenerator


class Command(BaseCommand):
    help = 'Test pharmacy admin setup and ID generation'
    
    def handle(self, *args, **options):
        self.stdout.write('Testing Pharmacy Admin Setup...')
        
        # Test ID generator
        generator = PharmacyAdminIDGenerator()
        
        try:
            # Generate a test ID
            pharmacy_id = generator.generate_id(
                country='RW',
                province='Kigali',
                district='Nyarugenge',
                facility_type='pharmacy'
            )
            
            self.stdout.write(self.style.SUCCESS(f'✓ Generated pharmacy ID: {pharmacy_id}'))
            
            # Test parsing
            parsed = generator.parse_id(pharmacy_id)
            self.stdout.write(self.style.SUCCESS(f'✓ Parsed ID: {parsed}'))
            
            # Test validation
            is_valid = generator.validate_id(pharmacy_id)
            self.stdout.write(self.style.SUCCESS(f'✓ ID validation: {is_valid}'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ ID generator error: {e}'))
        
        # Test model creation
        try:
            # Check if we can create a pharmacy admin
            user_count = User.objects.count()
            pharmacy_admin_count = PharmacyAdmin.objects.count()
            
            self.stdout.write(self.style.SUCCESS(f'✓ Users in database: {user_count}'))
            self.stdout.write(self.style.SUCCESS(f'✓ Pharmacy admins in database: {pharmacy_admin_count}'))
            
            # Test creating a pharmacy admin
            user = User.objects.create_user(
                username='test_pharmacy_admin',
                email='test@example.com',
                password='testpass123'
            )
            
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
            
            self.stdout.write(self.style.SUCCESS(f'✓ Created pharmacy admin with ID: {pharmacy_admin.pharmacy_id}'))
            
            # Clean up
            pharmacy_admin.delete()
            user.delete()
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Model creation error: {e}'))
        
        self.stdout.write(self.style.SUCCESS('Pharmacy admin setup test completed!'))
