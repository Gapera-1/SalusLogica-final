#!/usr/bin/env python
"""Test script for Rwanda FDA -> OpenFDA safety lookup."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

from apps.medicines.safety_lookup import (
    get_generic_name_from_rwanda,
    check_contraindications_rwanda_first,
    get_food_advice_rwanda_first,
    check_medicine_safety_comprehensive,
    fetch_openfda_safety_info
)

print("=" * 70)
print("Testing Rwanda FDA -> OpenFDA Safety Lookup")
print("=" * 70)

# Test 1: Get generic name from Rwanda FDA
print("\n1. Testing get_generic_name_from_rwanda:")
brand_names = ['SANMOL', 'Paracetamol', 'ASPIRIN']
for brand in brand_names:
    generic = get_generic_name_from_rwanda(brand)
    status = "✓" if generic else "✗"
    print(f"   {status} {brand} -> {generic or 'Not found'}")

# Test 2: Fetch OpenFDA safety info directly
print("\n2. Testing fetch_openfda_safety_info for 'Paracetamol':")
safety_info = fetch_openfda_safety_info('Paracetamol')
if safety_info:
    print(f"   ✓ Found OpenFDA data")
    print(f"   - Brand names: {safety_info.get('brand_names', [])[:3]}")
    print(f"   - Contraindications: {len(safety_info.get('contraindications', []))}")
    print(f"   - Warnings: {len(safety_info.get('warnings', []))}")
    print(f"   - Food interactions: {len(safety_info.get('food_interactions', []))}")
else:
    print(f"   ✗ No OpenFDA data found")

# Test 3: Check contraindications
print("\n3. Testing check_contraindications_rwanda_first for 'SANMOL':")
results = check_contraindications_rwanda_first('SANMOL', population_type='pregnant')
print(f"   Medicine: {results['medicine_name']}")
print(f"   Rwanda FDA Match: {results['rwanda_fda_match']}")
print(f"   Generic Name: {results.get('generic_name')}")
print(f"   OpenFDA Match: {results['openfda_match']}")
print(f"   Contraindications: {len(results['contraindications'])}")
print(f"   Warnings: {len(results['warnings'])}")
if results.get('pregnancy_info'):
    print(f"   Pregnancy Info: {results['pregnancy_info'][:100]}...")

# Test 4: Get food advice
print("\n4. Testing get_food_advice_rwanda_first for 'Ibuprofen':")
results = get_food_advice_rwanda_first('Ibuprofen')
print(f"   Medicine: {results['medicine_name']}")
print(f"   Rwanda FDA Match: {results['rwanda_fda_match']}")
print(f"   Generic Name: {results.get('generic_name')}")
print(f"   OpenFDA Match: {results['openfda_match']}")
print(f"   Food Interactions: {len(results['food_interactions'])}")
print(f"   Source: {results['source']}")

# Test 5: Comprehensive safety check
print("\n5. Testing check_medicine_safety_comprehensive for 'Paracetamol':")
results = check_medicine_safety_comprehensive('Paracetamol', population_type='pregnant')
print(f"   Medicine: {results['medicine_name']}")
print(f"   Generic Name: {results.get('generic_name')}")
print(f"   Rwanda FDA Match: {results['rwanda_fda_match']}")
print(f"   OpenFDA Match: {results['openfda_match']}")
print(f"   Safety Status: {results['safety_status']}")
print(f"   Contraindications: {len(results['contraindications'])}")
print(f"   Warnings: {len(results['warnings'])}")
print(f"   Food Interactions: {len(results['food_advice'].get('food_interactions', []))}")
print(f"   Alerts: {len(results['alerts'])}")

print("\n" + "=" * 70)
print("Rwanda FDA -> OpenFDA Strategy Summary:")
print("1. Search Rwanda FDA by brand name")
print("2. Extract generic name")
print("3. Use generic name to search OpenFDA")
print("4. Return OpenFDA results with Rwanda FDA metadata")
print("=" * 70)
