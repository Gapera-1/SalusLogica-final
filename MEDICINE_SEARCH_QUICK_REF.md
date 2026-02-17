# Medicine Search Quick Reference

## Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/medicines/search_by_name/` | ✅ | Search medicines (recommended) |
| GET | `/api/medicines/?search=<query>` | ✅ | Standard DRF search |

## Quick Examples

### Search by Name (cURL)
```bash
curl -X GET "http://localhost:8000/api/medicines/search_by_name/?q=aspirin" \
  -H "Authorization: Token YOUR_TOKEN"
```

### Search Active Only (cURL)
```bash
curl -X GET "http://localhost:8000/api/medicines/search_by_name/?q=paracetamol&active_only=true" \
  -H "Authorization: Token YOUR_TOKEN"
```

### Standard Search (cURL)
```bash
curl -X GET "http://localhost:8000/api/medicines/?search=ibuprofen" \
  -H "Authorization: Token YOUR_TOKEN"
```

## JavaScript/Fetch

### Basic Search
```javascript
const response = await fetch(
  `/api/medicines/search_by_name/?q=${encodeURIComponent(query)}`,
  {
    headers: { 'Authorization': `Token ${token}` }
  }
);
const data = await response.json();
console.log(`Found ${data.count} medicines`);
```

### Search with Filter
```javascript
const params = new URLSearchParams({
  q: 'aspirin',
  active_only: 'true'
});

const response = await fetch(`/api/medicines/search_by_name/?${params}`, {
  headers: { 'Authorization': `Token ${token}` }
});
```

## React Hook

```jsx
import { useState } from 'react';
import api from '../services/api';

const useMedicineSearch = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = async (query, activeOnly = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = { q: query };
      if (activeOnly) params.active_only = 'true';
      
      const response = await api.get('/medicines/search_by_name/', { params });
      setResults(response.data.results);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, error, search };
};

export default useMedicineSearch;
```

## React Native

```javascript
import api from '../services/api';

const searchMedicines = async (query, activeOnly = false) => {
  try {
    const params = { q: query };
    if (activeOnly) params.active_only = 'true';
    
    const response = await api.get('/medicines/search_by_name/', { params });
    return response.data.results;
  } catch (error) {
    Alert.alert('Error', error.response?.data?.error || 'Search failed');
    return [];
  }
};

// Usage
const results = await searchMedicines('aspirin');
const activeResults = await searchMedicines('paracetamol', true);
```

## Response Format

### Dedicated Endpoint
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
      "is_active": true,
      "stock_count": 30
    }
  ]
}
```

### Standard Endpoint
```json
[
  {
    "id": 1,
    "name": "Aspirin",
    "scientific_name": "Acetylsalicylic Acid",
    ...
  }
]
```

## Search Features

| Feature | Supported | Example |
|---------|-----------|---------|
| Name search | ✅ | `?q=aspirin` |
| Scientific name | ✅ | `?q=Acetylsalicylic` |
| Case-insensitive | ✅ | `?q=ASPIRIN` works |
| Partial match | ✅ | `?q=vit` finds "Vitamin C" |
| Active filter | ✅ | `?active_only=true` |

## Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Search query parameter 'q' is required" | Missing `q` parameter |
| 401 | "Authentication credentials were not provided" | Missing/invalid token |
| 200 | `{ count: 0, results: [] }` | No matches found |

## Search Behavior

- **Scope**: Only user's own medicines
- **Auto-excludes**: Medicines with zero stock
- **Matching**: Case-insensitive, partial match
- **Fields**: Searches `name` and `scientific_name`

## Common Queries

```bash
# Find all with "pain" in the name
?q=pain

# Find Vitamin supplements
?q=vitamin

# Find only active medicines
?q=aspirin&active_only=true

# Search by scientific name
?q=acetaminophen

# Partial search
?q=para  # Finds "Paracetamol"
```

## Testing

Run comprehensive tests:
```bash
cd backend
python test_medicine_search.py
```

Expected output:
```
✓ Standard DRF search: Working
✓ Scientific name search: Working
✓ Case-insensitive search: Working
✓ Dedicated search endpoint: Working
✓ Active-only filter: Working
✓ Query validation: Working
✓ Empty results handling: Working
✓ Partial name search: Working
✓ Authentication: Working
✓ Multi-term search: Working
```

## Implementation Details

**Modified Files**:
- `backend/apps/medicines/views.py` - Added `search_by_name` action, enhanced search_fields
- `backend/test_medicine_search.py` - Comprehensive test suite

**Search Fields**:
```python
search_fields = ['name', 'scientific_name', 'prescribed_for', 'prescribing_doctor']
```

**Search Action**:
```python
@action(detail=False, methods=['get'])
def search_by_name(self, request):
    search_query = request.query_params.get('q', '').strip()
    # ... implementation ...
```

## Full Documentation

See [MEDICINE_SEARCH_GUIDE.md](MEDICINE_SEARCH_GUIDE.md) for complete documentation with:
- Complete API reference
- Frontend integration examples
- Mobile integration examples
- Performance optimization
- Security considerations
- Troubleshooting guide
