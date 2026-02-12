"""
Management command to check and clean up orphaned pharmacy admin records
"""

from django.core.management.base import BaseCommand
from saluslogica.models import PharmacyAdmin
from apps.authentication.models import User


class Command(BaseCommand):
    help = 'Check and clean up orphaned pharmacy admin records'
    
    def handle(self, *args, **options):
        self.stdout.write('Checking for orphaned pharmacy admin records...')
        
        # Find pharmacy admin records without corresponding users
        orphaned_pharmacy_admins = PharmacyAdmin.objects.filter(
            user__isnull=True
        )
        
        orphaned_count = orphaned_pharmacy_admins.count()
        
        if orphaned_count > 0:
            self.stdout.write(f'Found {orphaned_count} orphaned pharmacy admin records')
            
            # Show details of orphaned records
            for pharmacy_admin in orphaned_pharmacy_admins:
                self.stdout.write(f'  - ID: {pharmacy_admin.pharmacy_id}, Facility: {pharmacy_admin.facility_name}')
            
            # Ask for confirmation before deletion
            response = input('Delete these orphaned records? (y/n): ')
            if response.lower() == 'y':
                orphaned_pharmacy_admins.delete()
                self.stdout.write(self.style.SUCCESS(f'Deleted {orphaned_count} orphaned pharmacy admin records'))
            else:
                self.stdout.write('Skipping deletion')
        else:
            self.stdout.write(self.style.SUCCESS('No orphaned pharmacy admin records found'))
        
        # Show total counts
        total_users = User.objects.count()
        total_pharmacy_admins = PharmacyAdmin.objects.count()
        
        self.stdout.write(f'\nCurrent database state:')
        self.stdout.write(f'  Total users: {total_users}')
        self.stdout.write(f'  Total pharmacy admins: {total_pharmacy_admins}')
        
        # Show pharmacy admin details
        self.stdout.write(f'\nPharmacy admin accounts:')
        for pharmacy_admin in PharmacyAdmin.objects.all():
            self.stdout.write(f'  - {pharmacy_admin.pharmacy_id}: {pharmacy_admin.facility_name} ({pharmacy_admin.user.email if pharmacy_admin.user else "No user"})')
