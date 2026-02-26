#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

from apps.medicines.safety_lookup import check_medicine_for_condition

print("Testing Acnotin (isotretinoin) for pregnancy...")
print("=" * 60)

result = check_medicine_for_condition('Acnotin', 'pregnancy', 'pregnant')

print(f"Medicine: {result['medicine_name']}")
print(f"Generic: {result['generic_name']}")
print(f"Rwanda FDA Match: {result['rwanda_fda_match']}")
print(f"OpenFDA Match: {result['openfda_match']}")
print(f"Is Safe: {result['is_safe']}")
print(f"Status: {result['safety_status']}")
print(f"Recommendation: {result['recommendation'][:150]}...")
print(f"\nReasons ({len(result['reasons'])}):")
for r in result['reasons']:
    print(f"  - {r.get('type')}: {r.get('description', '')[:100]}...")

print(f"\nAlternatives: {result['alternatives']}")
