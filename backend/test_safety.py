#!/usr/bin/env python
"""Test script for Rwanda FDA-first safety lookup."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

from apps.medicines.safety_lookup import (
    get_generic_name_from_rwanda,
    check_contraindications_rwanda_first,
    get_food_advice_rwanda_first,
    check_medicine_safety_comprehensive
)

print("=" * 70)
print("Testing Rwanda FDA-First Safety Lookup")
print("=" * 70)

# Test 1: Get generic name from Rwanda FDA
print("\n1. Testing get_generic_name_from_rwanda:")
brand_names = ['SANMOL', 'Paracetamol', 'ASPIRIN', 'UnknownDrug123']
for brand in brand_names:
    generic = get_generic_name_from_rwanda(brand)
    status = "✓" if generic else "✗"
    print(f"   {status} {brand} -> {generic or 'Not found'}")

# Test 2: Check contraindications
print("\n2. Testing check_contraindications_rwanda_first:")
results = check_contraindications_rwanda_first('SANMOL', population_type='PREGNANT')
print(f"   Medicine: {results['medicine_name']}")
print(f"   Rwanda FDA Match: {results['rwanda_fda_match']}")
print(f"   Generic Name: {results['generic_name']}")
print(f"   Database Match: {results['database_match']}")
print(f"   Contraindications Found: {len(results['contraindications'])}")

# Test 3: Get food advice
print("\n3. Testing get_food_advice_rwanda_first:")
results = get_food_advice_rwanda_first('Ibuprofen')
print(f"   Medicine: {results['medicine_name']}")
print(f"   Rwanda FDA Match: {results['rwanda_fda_match']}")
print(f"   Generic Name: {results['generic_name']}")
print(f"   Database Match: {results['database_match']}")
print(f"   Foods to Avoid: {results['foods_to_avoid']}")
print(f"   Foods Advised: {results['foods_advised']}")
print(f"   General Advice: {results['general_advice'][:80]}...")

# Test 4: Comprehensive safety check
print("\n4. Testing check_medicine_safety_comprehensive:")
results = check_medicine_safety_comprehensive('Paracetamol', population_type='PREGNANT')
print(f"   Medicine: {results['medicine_name']}")
print(f"   Generic Name: {results['generic_name']}")
print(f"   Rwanda FDA Match: {results['rwanda_fda_match']}")
print(f"   Safety Status: {results['safety_status']}")
print(f"   Contraindications: {len(results['contraindications'])}")
print(f"   Food Interactions: {len(results['food_advice'].get('food_interactions', []))}")

print("\n" + "=" * 70)
print("Rwanda FDA-First Strategy Summary:")
print("1. Search Rwanda FDA by brand name")
print("2. Extract generic name")
print("3. Use generic name to search local DrugDatabase")
print("4. Return contraindications and food advice")
print("=" * 70)
