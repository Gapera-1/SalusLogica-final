# Medicine Search Functionality Guide

## Overview

The SalusLogica platform provides comprehensive search functionality for medicines, allowing users to quickly find medicines by name or scientific name using case-insensitive search.

## Features

✅ **Search by Name**: Find medicines by their common name  
✅ **Search by Scientific Name**: Find medicines by their scientific/generic name  
✅ **Case-Insensitive**: Works with any case (ASPIRIN, aspirin, AsPiRiN)  
✅ **Partial Matching**: Search for partial names (e.g., "vit" finds "Vitamin C")  
✅ **Active-Only Filtering**: Option to search only active medicines  
✅ **Secure**: All endpoints require authentication  
✅ **Two Search Methods**: Standard DRF search + dedicated endpoint  

## API Endpoints

### Method 1: Dedicated Search Endpoint (Recommended)

**Endpoint**: `GET /api/medicines/search_by_name/`  
**Authentication**: Required (Token)  
**Query Parameters**:
- `q` (string, required): Search query
- `active_only` (boolean, optional): Filter only active medicines (default: false)

**Request Example**:
```bash
curl -X GET "http://localhost:8000/api/medicines/search_by_name/?q=aspirin" \
  -H "Authorization: Token your_auth_token"
```

**Success Response** (200 OK):
```json
{
  "query": "aspirin",
  "count": 1,
  "results": [
    {
      "id": 1,
      "name": "Aspirin",
      "scientific_name": "Acetylsalicylic Acid",
      "dosage": "100mg",
      "frequency": "once_daily",
      "times": ["08:00"],
      "duration": 30,
      "start_date": "2026-02-16",
      "end_date": "2026-03-18",
      "is_active": true,
      "stock_count": 30,
      "prescribed_for": "Pain relief",
      "prescribing_doctor": "Dr. Smith",
      "instructions": "Take with food",
      "created_at": "2026-02-16T12:00:00Z",
      "updated_at": "2026-02-16T12:00:00Z"
    }
  ]
}
```

**Error Response (400)** - Missing query:
```json
{
  "error": "Search query parameter \"q\" is required"
}
```

**Error Response (401)** - Unauthorized:
```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

### Method 2: Standard DRF Search

**Endpoint**: `GET /api/medicines/?search=<query>`  
**Authentication**: Required (Token)  
**Query Parameters**:
- `search` (string): Search query

**Request Example**:
```bash
curl -X GET "http://localhost:8000/api/medicines/?search=ibuprofen" \
  -H "Authorization: Token your_auth_token"
```

**Success Response** (200 OK):
```json
[
  {
    "id": 3,
    "name": "Ibuprofen",
    "scientific_name": "Ibuprofen",
    "dosage": "400mg",
    "frequency": "twice_daily",
    ...
  }
]
```

**Searchable Fields**:
- `name` - Medicine common name
- `scientific_name` - Scientific/generic name
- `prescribed_for` - Condition being treated
- `prescribing_doctor` - Doctor who prescribed

---

## Search Examples

### 1. Search by Common Name

```bash
# Find all medicines with "paracetamol" in the name
GET /api/medicines/search_by_name/?q=paracetamol
```

**Result**: Finds "Paracetamol" medicine

---

### 2. Search by Scientific Name

```bash
# Find medicines with "Acetaminophen" (scientific name of Paracetamol)
GET /api/medicines/search_by_name/?q=Acetaminophen
```

**Result**: Finds "Paracetamol" (Acetaminophen)

---

### 3. Case-Insensitive Search

```bash
# All of these work the same:
GET /api/medicines/search_by_name/?q=ASPIRIN
GET /api/medicines/search_by_name/?q=aspirin
GET /api/medicines/search_by_name/?q=AsPiRiN
```

**Result**: All return "Aspirin" medicine

---

### 4. Partial Name Search

```bash
# Search for partial name
GET /api/medicines/search_by_name/?q=vit
```

**Result**: Finds "Vitamin C" (matches partial name)

---

### 5. Search Active Medicines Only

```bash
# Only search among active (not completed/inactive) medicines
GET /api/medicines/search_by_name/?q=amoxicillin&active_only=true
```

**Result**: Finds "Amoxicillin" only if it's active

---

### 6. Search with No Results

```bash
GET /api/medicines/search_by_name/?q=nonexistent
```

**Response**:
```json
{
  "query": "nonexistent",
  "count": 0,
  "results": []
}
```

---

## Frontend Integration (React)

### Search Component Example

```jsx
import React, { useState } from 'react';
import api from '../services/api';

const MedicineSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const params = { q: query };
      if (activeOnly) {
        params.active_only = 'true';
      }

      const response = await api.get('/medicines/search_by_name/', { params });
      setResults(response.data.results);
    } catch (error) {
      console.error('Search failed:', error);
      alert(error.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="medicine-search">
      <div className="search-input-group">
        <input
          type="text"
          placeholder="Search medicines by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="search-input"
        />
        <button 
          onClick={handleSearch} 
          disabled={loading}
          className="search-button"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="search-filters">
        <label>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active medicines only
        </label>
      </div>

      <div className="search-results">
        {results.length > 0 ? (
          <>
            <h3>{results.length} medicine(s) found</h3>
            {results.map((medicine) => (
              <div key={medicine.id} className="medicine-card">
                <h4>{medicine.name}</h4>
                {medicine.scientific_name && (
                  <p className="scientific-name">{medicine.scientific_name}</p>
                )}
                <p>Dosage: {medicine.dosage}</p>
                <p>Frequency: {medicine.frequency}</p>
                {medicine.prescribed_for && (
                  <p>Prescribed for: {medicine.prescribed_for}</p>
                )}
                <span className={`status ${medicine.is_active ? 'active' : 'inactive'}`}>
                  {medicine.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </>
        ) : query && !loading ? (
          <p>No medicines found for "{query}"</p>
        ) : null}
      </div>
    </div>
  );
};

export default MedicineSearch;
```

### Search with Autocomplete (Debounced)

```jsx
import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import api from '../services/api';

const MedicineSearchAutocomplete = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced search function
  const searchMedicines = debounce(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/medicines/search_by_name/', {
        params: { q: searchQuery }
      });
      setSuggestions(response.data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, 300); // 300ms delay

  useEffect(() => {
    searchMedicines(query);
  }, [query]);

  const handleSelect = (medicine) => {
    // Handle medicine selection
    console.log('Selected:', medicine);
    setQuery(medicine.name);
    setSuggestions([]);
  };

  return (
    <div className="autocomplete-search">
      <input
        type="text"
        placeholder="Start typing medicine name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="autocomplete-input"
      />
      
      {loading && <div className="loading-indicator">Searching...</div>}

      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((medicine) => (
            <li
              key={medicine.id}
              onClick={() => handleSelect(medicine)}
              className="suggestion-item"
            >
              <strong>{medicine.name}</strong>
              {medicine.scientific_name && (
                <span className="scientific-name"> ({medicine.scientific_name})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MedicineSearchAutocomplete;
```

---

## Mobile Integration (React Native)

### React Native Search Component

```jsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import api from '../services/api';

const MedicineSearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const params = { q: query };
      if (activeOnly) {
        params.active_only = 'true';
      }

      const response = await api.get('/medicines/search_by_name/', { params });
      setResults(response.data.results);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', error.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const renderMedicine = ({ item }) => (
    <View style={styles.medicineCard}>
      <Text style={styles.medicineName}>{item.name}</Text>
      {item.scientific_name && (
        <Text style={styles.scientificName}>{item.scientific_name}</Text>
      )}
      <Text style={styles.dosage}>Dosage: {item.dosage}</Text>
      <Text style={styles.frequency}>Frequency: {item.frequency}</Text>
      <View style={styles.statusBadge}>
        <Text style={item.is_active ? styles.activeText : styles.inactiveText}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>
            {loading ? 'Searching...' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.filterRow}
        onPress={() => setActiveOnly(!activeOnly)}
      >
        <View style={styles.checkbox}>
          {activeOnly && <View style={styles.checkboxChecked} />}
        </View>
        <Text>Active medicines only</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={results}
          renderItem={renderMedicine}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            query ? (
              <Text style={styles.emptyText}>No medicines found for "{query}"</Text>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007bff',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    backgroundColor: '#007bff',
  },
  medicineCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  dosage: {
    fontSize: 14,
    marginBottom: 4,
  },
  frequency: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  activeText: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  inactiveText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#666',
  },
});

export default MedicineSearchScreen;
```

---

## Search Behavior

### Search Scope
- Searches only the authenticated user's medicines
- Cannot search other users' medicines
- Automatically excludes medicines with zero stock
- Can optionally filter by active status

### Search Algorithm
- Uses case-insensitive partial matching
- Searches in both `name` and `scientific_name` fields
- Uses SQL `ILIKE` (case-insensitive LIKE) operator
- Matches anywhere in the field (prefix, infix, suffix)

### Examples of Search Matching

| Query | Medicine Name | Scientific Name | Match? |
|-------|--------------|-----------------|--------|
| "aspirin" | "Aspirin" | "Acetylsalicylic Acid" | ✅ Yes (name) |
| "ASPIRIN" | "Aspirin" | "Acetylsalicylic Acid" | ✅ Yes (name, case-insensitive) |
| "acetyl" | "Aspirin" | "Acetylsalicylic Acid" | ✅ Yes (scientific name) |
| "para" | "Paracetamol" | "Acetaminophen" | ✅ Yes (name prefix) |
| "mol" | "Paracetamol" | "Acetaminophen" | ✅ Yes (name suffix) |
| "vit" | "Vitamin C" | "Ascorbic Acid" | ✅ Yes (name prefix) |
| "ascorbic" | "Vitamin C" | "Ascorbic Acid" | ✅ Yes (scientific name) |
| "xyz" | "Aspirin" | "Acetylsalicylic Acid" | ❌ No match |

---

## Performance Considerations

### Database Indexing
For large medicine databases, consider adding database indexes:

```python
# In migrations or models
class Migration:
    operations = [
        migrations.RunSQL(
            "CREATE INDEX idx_medicine_name ON medicines_medicine (name);",
            reverse_sql="DROP INDEX idx_medicine_name;"
        ),
        migrations.RunSQL(
            "CREATE INDEX idx_medicine_scientific_name ON medicines_medicine (scientific_name);",
            reverse_sql="DROP INDEX idx_medicine_scientific_name;"
        ),
    ]
```

### Pagination
For users with many medicines, consider adding pagination:

```python
# In views.py
from rest_framework.pagination import PageNumberPagination

class MedicinePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class MedicineViewSet(viewsets.ModelViewSet):
    pagination_class = MedicinePagination
    # ...
```

### Caching
For frequently searched terms, consider caching:

```python
from django.core.cache import cache

def search_medicines(query, user):
    cache_key = f'medicine_search_{user.id}_{query}'
    results = cache.get(cache_key)
    
    if results is None:
        results = Medicine.objects.filter(...)
        cache.set(cache_key, results, timeout=300)  # 5 minutes
    
    return results
```

---

## Testing

A comprehensive test suite is available at `backend/test_medicine_search.py`.

### Run Tests
```bash
cd backend
python test_medicine_search.py
```

### Test Coverage
- ✅ Standard DRF search endpoint
- ✅ Search by scientific name
- ✅ Case-insensitive search
- ✅ Dedicated search_by_name endpoint
- ✅ Active-only filtering
- ✅ Query parameter validation
- ✅ Empty results handling
- ✅ Partial name search
- ✅ Authentication requirements
- ✅ Multi-term search

---

## Security Considerations

1. **Authentication Required**: All search endpoints require valid tokens
2. **User Isolation**: Users can only search their own medicines
3. **Input Validation**: Query parameters are validated
4. **SQL Injection Protection**: Django ORM provides automatic protection
5. **Rate Limiting**: Consider adding rate limiting for search endpoints

### Add Rate Limiting (Optional)

```python
# In saluslogica/throttles.py
from rest_framework.throttling import UserRateThrottle

class MedicineSearchRateThrottle(UserRateThrottle):
    rate = '100/minute'

# In views.py
class MedicineViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['get'])
    def search_by_name(self, request):
        throttle_classes = [MedicineSearchRateThrottle]
        # ...
```

---

## Troubleshooting

### No Results Found
- Verify search query is spelled correctly
- Try searching with fewer characters (partial match)
- Check if medicines exist in the database
- Ensure medicines have non-zero stock
- Try searching by scientific name instead

### "Search query parameter 'q' is required"
- Include the `q` parameter in your request
- Example: `/api/medicines/search_by_name/?q=aspirin`

### 401 Unauthorized
- Ensure you're including the authentication token
- Example: `Authorization: Token your_auth_token`

### Search Returns All Medicines
- Use the dedicated endpoint `/api/medicines/search_by_name/`
- Ensure the `q` parameter is properly URL-encoded

---

## Related Documentation

- Medicine Management API
- Medicine Reminders & Notifications
- Medicine Stock Management
- Patient Safety Checks

---

## API Summary

### Quick Reference

| Endpoint | Method | Auth | Parameters | Purpose |
|----------|--------|------|------------|---------|
| `/api/medicines/search_by_name/` | GET | ✅ | `q`, `active_only` | Dedicated search (recommended) |
| `/api/medicines/` | GET | ✅ | `search` | Standard DRF search |

### Response Format

**Dedicated Endpoint**:
```json
{
  "query": "search term",
  "count": 5,
  "results": [...]
}
```

**Standard Endpoint**:
```json
[
  { "id": 1, "name": "...", ... },
  { "id": 2, "name": "...", ... }
]
```

---

## Next Steps

1. ✅ Backend search implementation complete
2. ⏳ Add frontend search component to medicine list page
3. ⏳ Add mobile search screen
4. ⏳ Consider adding autocomplete/typeahead
5. ⏳ Add search analytics/tracking
6. ⏳ Implement advanced filters (by frequency, date range, etc.)

---

## Support

For issues or questions, refer to:
- Test suite: `backend/test_medicine_search.py`
- Views implementation: `backend/apps/medicines/views.py`
- URL routing: `backend/apps/medicines/urls.py`
