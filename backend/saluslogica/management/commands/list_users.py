"""
Management command to list all users in the system
"""

from django.core.management.base import BaseCommand
from apps.authentication.models import User
from saluslogica.models import PharmacyAdmin


class Command(BaseCommand):
    help = 'List all users in the system with their details'
    
    def handle(self, *args, **options):
        self.stdout.write('=== ALL USERS IN SYSTEM ===\n')
        
        users = User.objects.all().order_by('-date_joined')
        
        if not users.exists():
            self.stdout.write('No users found in the system.')
            return
        
        for i, user in enumerate(users, 1):
            self.stdout.write(f'{i}. User Details:')
            self.stdout.write(f'   ID: {user.id}')
            self.stdout.write(f'   Username: {user.username}')
            self.stdout.write(f'   Email: {user.email}')
            self.stdout.write(f'   User Type: {user.user_type}')
            self.stdout.write(f'   First Name: {user.first_name or "N/A"}')
            self.stdout.write(f'   Last Name: {user.last_name or "N/A"}')
            self.stdout.write(f'   Phone: {user.phone or "N/A"}')
            self.stdout.write(f'   Active: {user.is_active}')
            self.stdout.write(f'   Staff: {user.is_staff}')
            self.stdout.write(f'   Superuser: {user.is_superuser}')
            self.stdout.write(f'   Date Joined: {user.date_joined.strftime("%Y-%m-%d %H:%M:%S")}')
            
            # Check if user has pharmacy admin profile
            try:
                pharmacy_admin = PharmacyAdmin.objects.get(user=user)
                self.stdout.write(f'   Pharmacy Admin: YES')
                self.stdout.write(f'   Pharmacy ID: {pharmacy_admin.pharmacy_id}')
                self.stdout.write(f'   Facility: {pharmacy_admin.facility_name}')
                self.stdout.write(f'   Facility Type: {pharmacy_admin.facility_type}')
                self.stdout.write(f'   Location: {pharmacy_admin.district}, {pharmacy_admin.province}, {pharmacy_admin.country}')
            except PharmacyAdmin.DoesNotExist:
                self.stdout.write(f'   Pharmacy Admin: NO')
            
            self.stdout.write('   ' + '-'*50)
        
        # Summary statistics
        self.stdout.write(f'\n=== SUMMARY STATISTICS ===')
        self.stdout.write(f'Total Users: {users.count()}')
        
        # Count by user type
        user_types = User.objects.values('user_type').order_by('user_type')
        for user_type in user_types:
            count = User.objects.filter(user_type=user_type['user_type']).count()
            self.stdout.write(f'{user_type["user_type"].title()}: {count}')
        
        # Pharmacy admin count
        pharmacy_admin_count = PharmacyAdmin.objects.count()
        self.stdout.write(f'Pharmacy Admin Profiles: {pharmacy_admin_count}')
        
        # Active vs inactive
        active_count = User.objects.filter(is_active=True).count()
        inactive_count = User.objects.filter(is_active=False).count()
        self.stdout.write(f'Active Users: {active_count}')
        self.stdout.write(f'Inactive Users: {inactive_count}')
