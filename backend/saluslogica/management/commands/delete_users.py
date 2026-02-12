"""
Management command to delete specific users
"""

from django.core.management.base import BaseCommand
from apps.authentication.models import User


class Command(BaseCommand):
    help = 'Delete specific users by email addresses'
    
    def handle(self, *args, **options):
        emails_to_delete = [
            'manfrancois2003@gmail.com',
            'fmanishimwe38@gmail.com'
        ]
        
        self.stdout.write('Searching for users to delete...')
        
        for email in emails_to_delete:
            try:
                users = User.objects.filter(email=email)
                count = users.count()
                
                if count > 0:
                    self.stdout.write(f'Found {count} user(s) with email: {email}')
                    users.delete()
                    self.stdout.write(self.style.SUCCESS(f'Deleted {count} user(s) with email: {email}'))
                else:
                    self.stdout.write(f'No users found with email: {email}')
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error deleting user {email}: {str(e)}'))
        
        # Verify deletion
        remaining = User.objects.filter(email__in=emails_to_delete).count()
        if remaining == 0:
            self.stdout.write(self.style.SUCCESS('All specified users have been successfully deleted!'))
        else:
            self.stdout.write(self.style.WARNING(f'{remaining} users still remain'))
