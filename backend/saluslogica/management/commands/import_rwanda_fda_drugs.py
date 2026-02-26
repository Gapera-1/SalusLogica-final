"""
Management command to import Rwanda FDA drug data from cleaned-data.csv
"""
import csv
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.medicines.models import RwandaFDADrug


class Command(BaseCommand):
    help = 'Import Rwanda FDA drug data from cleaned-data.csv'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv-path',
            type=str,
            default='/app/data/cleaned-data.csv',
            help='Path to the CSV file (default: /app/data/cleaned-data.csv)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=500,
            help='Number of records to process in each batch (default: 500)'
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear existing data before importing'
        )

    def handle(self, *args, **options):
        csv_path = options['csv_path']
        batch_size = options['batch_size']
        clear_existing = options['clear_existing']

        self.stdout.write(self.style.NOTICE(f'Importing Rwanda FDA drugs from {csv_path}...'))

        # Check if file exists
        if not os.path.exists(csv_path):
            # Try alternative paths
            alternative_paths = [
                '/app/data/cleaned-data.csv',
                '/app/backend/data/cleaned-data.csv',
                './data/cleaned-data.csv',
                './backend/data/cleaned-data.csv',
            ]
            for alt_path in alternative_paths:
                if os.path.exists(alt_path):
                    csv_path = alt_path
                    break
            else:
                self.stdout.write(self.style.ERROR(f'CSV file not found at {csv_path}'))
                return

        # Clear existing data if requested
        if clear_existing:
            self.stdout.write(self.style.WARNING('Clearing existing Rwanda FDA drug data...'))
            RwandaFDADrug.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing data cleared.'))

        # Count existing records
        existing_count = RwandaFDADrug.objects.count()
        self.stdout.write(self.style.NOTICE(f'Existing records: {existing_count}'))

        # Import data
        imported_count = 0
        skipped_count = 0
        error_count = 0
        seen_reg_numbers = set()  # Track seen registration numbers in CSV

        try:
            with open(csv_path, 'r', encoding='utf-8') as csvfile:
                reader = csv.reader(csvfile)
                
                # Skip header row
                header = next(reader, None)
                if header:
                    self.stdout.write(self.style.NOTICE(f'CSV columns: {header}'))

                # Process in batches
                batch = []
                
                for row in reader:
                    try:
                        if len(row) < 9:
                            self.stdout.write(self.style.WARNING(f'Skipping row with insufficient columns: {row}'))
                            skipped_count += 1
                            continue

                        # Extract fields from CSV
                        registration_number = row[0].strip()
                        brand_name = row[1].strip()
                        generic_name = row[2].strip()
                        strength = row[3].strip()
                        dosage_form = row[4].strip()
                        manufacturer = row[5].strip()
                        country = row[6].strip()
                        distributor = row[7].strip()
                        local_agent = row[8].strip()

                        # Skip if registration number is empty
                        if not registration_number:
                            skipped_count += 1
                            continue

                        # Skip duplicates - check using a set for faster lookup
                        if registration_number in seen_reg_numbers:
                            skipped_count += 1
                            continue
                        seen_reg_numbers.add(registration_number)

                        # Create drug object
                        drug = RwandaFDADrug(
                            registration_number=registration_number,
                            brand_name=brand_name or 'Unknown',
                            generic_name=generic_name or 'Unknown',
                            strength=strength or '',
                            dosage_form=dosage_form or '',
                            manufacturer=manufacturer or '',
                            country=country or '',
                            distributor=distributor or '',
                            local_agent=local_agent or '',
                            is_active=True
                        )
                        batch.append(drug)

                        # Bulk create when batch is full
                        if len(batch) >= batch_size:
                            with transaction.atomic():
                                RwandaFDADrug.objects.bulk_create(batch)
                            imported_count += len(batch)
                            self.stdout.write(self.style.NOTICE(f'Imported {imported_count} records...'))
                            batch = []

                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'Error processing row: {e}'))
                        error_count += 1

                # Create remaining records
                if batch:
                    with transaction.atomic():
                        RwandaFDADrug.objects.bulk_create(batch)
                    imported_count += len(batch)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error reading CSV file: {e}'))
            return

        # Summary
        final_count = RwandaFDADrug.objects.count()
        self.stdout.write(self.style.SUCCESS('\n' + '='*50))
        self.stdout.write(self.style.SUCCESS('Import Summary:'))
        self.stdout.write(self.style.SUCCESS(f'  Records imported: {imported_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Records skipped: {skipped_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Errors: {error_count}'))
        self.stdout.write(self.style.SUCCESS(f'  Total records in database: {final_count}'))
        self.stdout.write(self.style.SUCCESS('='*50))
