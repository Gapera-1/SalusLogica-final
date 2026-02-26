#!/usr/bin/env python
"""Test script for the updated medicine search functionality."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

from apps.medicines.barcode_lookup import lookup_by_name, search_rwanda_registry

print("=" * 60)
print("Testing Rwanda FDA First Search Strategy")
print("=" * 60)

# Test 1: Search for a drug that exists in Rwanda FDA
print("\n1. Testing search for 'Paracetamol':")
results = lookup_by_name('Paracetamol')
print(f"   Found {len(results)} results")
for r in results[:2]:
    print(f"   - Name: {r.get('name', 'N/A')}")
    print(f"     Generic: {r.get('scientific_name', 'N/A')}")
    if r.get('rwanda_fda_match'):
        print(f"     [Source: Rwanda FDA -> OpenFDA]")
        print(f"     Rwanda Brand: {r.get('rwanda_brand_name', 'N/A')}")
    elif r.get('openfda_direct_match'):
        print(f"     [Source: OpenFDA Direct]")
    else:
        print(f"     [Source: Rwanda FDA Only]")

# Test 2: Search for a drug that may not be in Rwanda FDA
print("\n2. Testing search for 'Aspirin':")
results = lookup_by_name('Aspirin')
print(f"   Found {len(results)} results")
for r in results[:2]:
    print(f"   - Name: {r.get('name', 'N/A')}")
    print(f"     Generic: {r.get('scientific_name', 'N/A')}")
    if r.get('rwanda_fda_match'):
        print(f"     [Source: Rwanda FDA -> OpenFDA]")
    elif r.get('openfda_direct_match'):
        print(f"     [Source: OpenFDA Direct]")

# Test 3: Direct Rwanda FDA search
print("\n3. Testing direct Rwanda FDA search for 'SANMOL':")
rwanda_result = search_rwanda_registry('SANMOL')
if rwanda_result:
    print(f"   Found in Rwanda FDA:")
    print(f"   - Brand: {rwanda_result.get('brand_name', 'N/A')}")
    print(f"   - Generic: {rwanda_result.get('generic_name', 'N/A')}")
    print(f"   - Registration: {rwanda_result.get('registration_number', 'N/A')}")
else:
    print("   Not found in Rwanda FDA")

print("\n" + "=" * 60)
print("Search Strategy Summary:")
print("1. First searches Rwanda FDA by brand name")
print("2. Extracts generic name from Rwanda FDA")
print("3. Uses generic name to search OpenFDA")
print("4. If OpenFDA has no data, returns Rwanda FDA data")
print("5. If not in Rwanda FDA, searches OpenFDA directly")
print("=" * 60)
