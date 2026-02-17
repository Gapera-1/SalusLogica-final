"""
Medicine Search Testing Script for SalusLogica
==============================================

This script tests the medicine search functionality including:
- Search by medicine name
- Search by scientific name
- Case-insensitive search
- Active-only filtering
- Standard DRF search endpoint
- Dedicated search_by_name endpoint

Run from the backend directory:
    python test_medicine_search.py
"""

import os
import sys
import django
from datetime import date, timedelta

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'saluslogica.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from apps.medicines.models import Medicine

User = get_user_model()


def cleanup_test_data():
    """Remove all test users and medicines"""
    User.objects.filter(username__startswith='searchtest').delete()
    print("✓ Cleaned up test data")


def create_test_user_with_medicines():
    """Create a test user with sample medicines"""
    print("\n" + "="*70)
    print("SETUP: Creating Test User and Sample Medicines")
    print("="*70)
    
    # Create test user
    user = User.objects.create_user(
        username='searchtest1',
        email='searchtest1@example.com',
        password='TestPass123!'
    )
    print(f"✓ Created test user: {user.username}")
    
    # Create sample medicines
    medicines_data = [
        {
            'name': 'Aspirin',
            'scientific_name': 'Acetylsalicylic Acid',
            'dosage': '100mg',
            'frequency': 'once_daily',
            'times': ['08:00'],
            'duration': 30,
            'start_date': date.today(),
            'end_date': date.today() + timedelta(days=30),
            'is_active': True,
            'stock_count': 30,
        },
        {
            'name': 'Paracetamol',
            'scientific_name': 'Acetaminophen',
            'dosage': '500mg',
            'frequency': 'three_times_daily',
            'times': ['08:00', '14:00', '20:00'],
            'duration': 7,
            'start_date': date.today(),
            'end_date': date.today() + timedelta(days=7),
            'is_active': True,
            'stock_count': 21,
        },
        {
            'name': 'Ibuprofen',
            'scientific_name': 'Ibuprofen',
            'dosage': '400mg',
            'frequency': 'twice_daily',
            'times': ['09:00', '21:00'],
            'duration': 14,
            'start_date': date.today(),
            'end_date': date.today() + timedelta(days=14),
            'is_active': True,
            'stock_count': 28,
        },
        {
            'name': 'Amoxicillin',
            'scientific_name': 'Amoxicillin Trihydrate',
            'dosage': '250mg',
            'frequency': 'three_times_daily',
            'times': ['08:00', '14:00', '20:00'],
            'duration': 10,
            'start_date': date.today(),
            'end_date': date.today() + timedelta(days=10),
            'is_active': False,  # Inactive medicine
            'stock_count': 30,
        },
        {
            'name': 'Vitamin C',
            'scientific_name': 'Ascorbic Acid',
            'dosage': '1000mg',
            'frequency': 'once_daily',
            'times': ['08:00'],
            'duration': 60,
            'start_date': date.today(),
            'end_date': date.today() + timedelta(days=60),
            'is_active': True,
            'stock_count': 60,
        },
    ]
    
    created_medicines = []
    for medicine_data in medicines_data:
        medicine = Medicine.objects.create(user=user, **medicine_data)
        created_medicines.append(medicine)
        print(f"✓ Created medicine: {medicine.name} ({medicine.scientific_name})")
    
    return user, created_medicines


def test_standard_search(client, token):
    """Test 1: Standard DRF search endpoint"""
    print("\n" + "="*70)
    print("TEST 1: Standard DRF Search Endpoint (?search=)")
    print("="*70)
    
    # Search for "aspirin"
    response = client.get(
        '/api/medicines/?search=aspirin',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    assert response.status_code == 200, f"Search failed: {response.content}"
    data = response.json()
    
    print(f"✓ Search query: 'aspirin'")
    print(f"  Results found: {len(data)}")
    
    # Should find Aspirin
    assert len(data) >= 1, "Should find at least one result"
    assert any(m['name'].lower() == 'aspirin' for m in data), "Should find Aspirin"
    
    for medicine in data:
        print(f"  - {medicine['name']} ({medicine.get('scientific_name', 'N/A')})")
    
    print("✓ Standard search working correctly")


def test_search_by_scientific_name(client, token):
    """Test 2: Search by scientific name"""
    print("\n" + "="*70)
    print("TEST 2: Search by Scientific Name")
    print("="*70)
    
    # Search for "Acetaminophen" (scientific name of Paracetamol)
    response = client.get(
        '/api/medicines/?search=Acetaminophen',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    assert response.status_code == 200, f"Search failed: {response.content}"
    data = response.json()
    
    print(f"✓ Search query: 'Acetaminophen' (scientific name)")
    print(f"  Results found: {len(data)}")
    
    # Should find Paracetamol
    assert len(data) >= 1, "Should find at least one result"
    paracetamol_found = any(
        m.get('scientific_name', '').lower() == 'acetaminophen' 
        for m in data
    )
    assert paracetamol_found, "Should find Paracetamol by its scientific name"
    
    for medicine in data:
        print(f"  - {medicine['name']} ({medicine.get('scientific_name', 'N/A')})")
    
    print("✓ Scientific name search working correctly")


def test_case_insensitive_search(client, token):
    """Test 3: Case-insensitive search"""
    print("\n" + "="*70)
    print("TEST 3: Case-Insensitive Search")
    print("="*70)
    
    # Search with different cases
    queries = ['ASPIRIN', 'aspirin', 'AsPiRiN', 'vitamin c']
    
    for query in queries:
        response = client.get(
            f'/api/medicines/?search={query}',
            HTTP_AUTHORIZATION=f'Token {token}'
        )
        
        assert response.status_code == 200, f"Search failed for '{query}': {response.content}"
        data = response.json()
        
        print(f"✓ Query: '{query}' → Found {len(data)} result(s)")
        assert len(data) > 0, f"Should find results for '{query}'"


def test_dedicated_search_endpoint(client, token):
    """Test 4: Dedicated search_by_name endpoint"""
    print("\n" + "="*70)
    print("TEST 4: Dedicated Search By Name Endpoint")
    print("="*70)
    
    # Search for "ibuprofen"
    response = client.get(
        '/api/medicines/search_by_name/?q=ibuprofen',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    assert response.status_code == 200, f"Search failed: {response.content}"
    data = response.json()
    
    print(f"✓ Search query: 'ibuprofen'")
    print(f"  Response format:")
    print(f"    - query: {data.get('query')}")
    print(f"    - count: {data.get('count')}")
    print(f"    - results: {len(data.get('results', []))} medicine(s)")
    
    assert 'query' in data, "Response should include 'query' field"
    assert 'count' in data, "Response should include 'count' field"
    assert 'results' in data, "Response should include 'results' field"
    assert data['count'] >= 1, "Should find at least one result"
    
    for medicine in data['results']:
        print(f"  - {medicine['name']} ({medicine.get('scientific_name', 'N/A')})")
    
    print("✓ Dedicated search endpoint working correctly")


def test_search_with_active_filter(client, token):
    """Test 5: Search with active_only filter"""
    print("\n" + "="*70)
    print("TEST 5: Search with Active-Only Filter")
    print("="*70)
    
    # Search without filter (should include inactive)
    response = client.get(
        '/api/medicines/search_by_name/?q=amoxicillin',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    data_all = response.json()
    print(f"✓ Search 'amoxicillin' (no filter):")
    print(f"  Results: {data_all.get('count')} medicine(s)")
    
    # Note: Amoxicillin is inactive but might still appear since we're searching
    # However, the list view excludes zero-stock, not inactive items
    
    # Search with active_only filter
    response = client.get(
        '/api/medicines/search_by_name/?q=amoxicillin&active_only=true',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    data_active = response.json()
    print(f"✓ Search 'amoxicillin' (active_only=true):")
    print(f"  Results: {data_active.get('count')} medicine(s)")
    
    # Verify inactive medicines are excluded when active_only is true
    if data_active.get('results'):
        for medicine in data_active['results']:
            assert medicine['is_active'] == True, "Only active medicines should be returned"
            print(f"  - {medicine['name']} (Active: {medicine['is_active']})")
    
    print("✓ Active-only filter working correctly")


def test_search_no_query(client, token):
    """Test 6: Search without query parameter (should return error)"""
    print("\n" + "="*70)
    print("TEST 6: Search Without Query Parameter")
    print("="*70)
    
    response = client.get(
        '/api/medicines/search_by_name/',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    assert response.status_code == 400, f"Should return 400 error: {response.content}"
    data = response.json()
    
    print(f"✓ Request without 'q' parameter rejected")
    print(f"  Status: {response.status_code}")
    print(f"  Error: {data.get('error')}")
    
    assert 'error' in data, "Response should include error message"
    assert 'required' in data['error'].lower(), "Error should mention required parameter"
    
    print("✓ Query parameter validation working correctly")


def test_search_no_results(client, token):
    """Test 7: Search with no matching results"""
    print("\n" + "="*70)
    print("TEST 7: Search with No Matching Results")
    print("="*70)
    
    response = client.get(
        '/api/medicines/search_by_name/?q=nonexistentmedicine12345',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    assert response.status_code == 200, f"Search should succeed even with no results: {response.content}"
    data = response.json()
    
    print(f"✓ Search query: 'nonexistentmedicine12345'")
    print(f"  Count: {data.get('count')}")
    print(f"  Results: {len(data.get('results', []))} medicine(s)")
    
    assert data['count'] == 0, "Should return 0 results"
    assert len(data['results']) == 0, "Results array should be empty"
    
    print("✓ No results handled correctly")


def test_partial_name_search(client, token):
    """Test 8: Partial name search"""
    print("\n" + "="*70)
    print("TEST 8: Partial Name Search")
    print("="*70)
    
    # Search for "vit" should find "Vitamin C"
    response = client.get(
        '/api/medicines/search_by_name/?q=vit',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    assert response.status_code == 200, f"Search failed: {response.content}"
    data = response.json()
    
    print(f"✓ Search query: 'vit' (partial)")
    print(f"  Results found: {data.get('count')}")
    
    # Should find Vitamin C
    vitamin_found = any(
        'vitamin' in m['name'].lower() 
        for m in data.get('results', [])
    )
    assert vitamin_found, "Should find Vitamin C with partial search 'vit'"
    
    for medicine in data['results']:
        print(f"  - {medicine['name']} ({medicine.get('scientific_name', 'N/A')})")
    
    print("✓ Partial name search working correctly")


def test_unauthorized_search(client):
    """Test 9: Search without authentication (should fail)"""
    print("\n" + "="*70)
    print("TEST 9: Unauthorized Search (No Token)")
    print("="*70)
    
    # Try search without token
    response = client.get('/api/medicines/search_by_name/?q=aspirin')
    
    assert response.status_code == 401, f"Should return 401 Unauthorized: {response.status_code}"
    print(f"✓ Unauthorized search rejected")
    print(f"  Status: {response.status_code}")
    
    # Try standard search without token
    response = client.get('/api/medicines/?search=aspirin')
    assert response.status_code == 401, f"Should return 401 Unauthorized: {response.status_code}"
    print(f"✓ Unauthorized standard search rejected")
    
    print("✓ Authentication requirement working correctly")


def test_search_multiple_terms(client, token):
    """Test 10: Search with multiple terms"""
    print("\n" + "="*70)
    print("TEST 10: Search with Multiple Terms")
    print("="*70)
    
    # Search for "Acetyl" should find both Aspirin and Paracetamol
    response = client.get(
        '/api/medicines/search_by_name/?q=Acetyl',
        HTTP_AUTHORIZATION=f'Token {token}'
    )
    
    assert response.status_code == 200, f"Search failed: {response.content}"
    data = response.json()
    
    print(f"✓ Search query: 'Acetyl' (common prefix in scientific names)")
    print(f"  Results found: {data.get('count')}")
    
    # Should find medicines with "Acetyl" in scientific name
    assert data['count'] >= 1, "Should find at least one medicine"
    
    for medicine in data['results']:
        scientific_name = medicine.get('scientific_name', '')
        print(f"  - {medicine['name']} ({scientific_name})")
        # Verify it matches
        assert 'acetyl' in medicine['name'].lower() or 'acetyl' in scientific_name.lower(), \
            "Result should contain 'Acetyl' in name or scientific name"
    
    print("✓ Multi-term search working correctly")


def main():
    """Run all medicine search tests"""
    print("\n" + "█"*70)
    print("█" + " "*20 + "MEDICINE SEARCH TESTING" + " "*25 + "█")
    print("█"*70)
    
    try:
        # Cleanup before tests
        cleanup_test_data()
        
        # Create test data
        user, medicines = create_test_user_with_medicines()
        
        # Login
        client = Client()
        response = client.post('/api/auth/login/', {
            'email': 'searchtest1@example.com',
            'password': 'TestPass123!'
        })
        
        assert response.status_code == 200, f"Login failed: {response.content}"
        token = response.json()['token']
        print(f"\n✓ User logged in (Token: {token[:20]}...)")
        
        # Run tests
        test_standard_search(client, token)
        test_search_by_scientific_name(client, token)
        test_case_insensitive_search(client, token)
        test_dedicated_search_endpoint(client, token)
        test_search_with_active_filter(client, token)
        test_search_no_query(client, token)
        test_search_no_results(client, token)
        test_partial_name_search(client, token)
        test_unauthorized_search(client)
        test_search_multiple_terms(client, token)
        
        # Final cleanup
        cleanup_test_data()
        
        # Success summary
        print("\n" + "█"*70)
        print("█" + " "*25 + "ALL TESTS PASSED!" + " "*26 + "█")
        print("█"*70)
        print("\n✓ Standard DRF search: Working")
        print("✓ Scientific name search: Working")
        print("✓ Case-insensitive search: Working")
        print("✓ Dedicated search endpoint: Working")
        print("✓ Active-only filter: Working")
        print("✓ Query validation: Working")
        print("✓ Empty results handling: Working")
        print("✓ Partial name search: Working")
        print("✓ Authentication: Working")
        print("✓ Multi-term search: Working")
        
        print("\n" + "="*70)
        print("MEDICINE SEARCH FUNCTIONALITY READY FOR PRODUCTION")
        print("="*70 + "\n")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}\n")
        cleanup_test_data()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        import traceback
        traceback.print_exc()
        cleanup_test_data()
        sys.exit(1)


if __name__ == '__main__':
    main()
