# Medicine Search & Analytics - Quick Reference

## 🚀 Quick Start

### Using Autocomplete Search (Web)

```jsx
import MedicineSearchAutocomplete from '../components/MedicineSearchAutocomplete';

<MedicineSearchAutocomplete
  onSelect={(medicine) => navigate(`/medicine/${medicine.id}`)}
  placeholder="Search medicines..."
  activeOnly={false}
/>
```

### Using Search API (Web & Mobile)

```javascript
import { medicineAPI } from '../services/api';

// Basic search
const results = await medicineAPI.search("aspirin", false);

// Active medicines only
const active = await medicineAPI.search("aspirin", true);
```

### Tracking Analytics

```javascript
import analytics from '../services/analytics';

// Track search
analytics.trackSearch("aspirin", 5, false);

// Track selection
analytics.trackSearchResultClick("aspirin", medicine, 0);

// Track view
analytics.trackMedicineView(medicine, "search");

// Track filter
analytics.trackFilterUsage("medicine_list", "low-stock");
```

---

## 📊 Analytics Methods

| Method | When to Use |
|--------|-------------|
| `trackSearch(query, count, activeOnly)` | After search API call |
| `trackAutocomplete(query, count, selected)` | On autocomplete interaction |
| `trackSearchResultClick(query, medicine, pos)` | When user clicks result |
| `trackMedicineView(medicine, source)` | When viewing medicine details |
| `trackFilterUsage(type, value)` | When filter is applied |
| `trackEmptySearchResults(query)` | When search returns no results |
| `trackFeatureUsage(feature, metadata)` | For any feature usage |

---

## 🔌 API Endpoints

### Search Medicines
```
GET /api/medicines/search_by_name/?q=aspirin&active_only=true
```

**Response:**
```json
{
  "count": 2,
  "results": [...],
  "query": "aspirin",
  "active_only": true
}
```

---

## 📱 Component Props

### MedicineSearchAutocomplete

| Prop | Type | Default | Required |
|------|------|---------|----------|
| `onSelect` | function | - | ✅ |
| `placeholder` | string | "Search medicines..." | ❌ |
| `activeOnly` | boolean | false | ❌ |
| `minSearchLength` | number | 2 | ❌ |
| `className` | string | "" | ❌ |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↓` | Next suggestion |
| `↑` | Previous suggestion |
| `Enter` | Select highlighted |
| `Escape` | Close dropdown |

---

## 📁 File Locations

### Frontend (React)
- Analytics: `medicine-reminder/src/services/analytics.js`
- Autocomplete: `medicine-reminder/src/components/MedicineSearchAutocomplete.jsx`
- API: `medicine-reminder/src/services/api.js`

### Mobile (React Native)
- Analytics: `Mobile/src/services/analytics.js`
- Screen: `Mobile/src/screens/MedicinesScreen.js`
- API: `Mobile/src/services/api.js`

### Backend (Django)
- Views: `backend/apps/medicines/views.py`
- Tests: `backend/test_medicine_search.py`

---

## 🧪 Testing Commands

```bash
# Backend tests
cd backend
python manage.py test apps.medicines.tests

# Or standalone
python test_medicine_search.py

# Frontend (in browser console)
analytics.getSearchAnalytics()
analytics.getStoredEvents()
analytics.clearQueue()
```

---

## 🎯 Common Tasks

### View Analytics Summary
```javascript
const stats = await analytics.getSearchAnalytics();
console.log(`Searches: ${stats.total_searches}`);
console.log(`Avg Results: ${stats.average_results}`);
console.log(`Empty Rate: ${stats.empty_results_rate}%`);
```

### Clear Analytics Data
```javascript
// Web
analytics.clearQueue();

// Mobile
await analytics.clearQueue();
```

### Disable Analytics
```javascript
analytics.setEnabled(false);
```

### Custom Search with Everything
```javascript
import { medicineAPI } from '../services/api';
import analytics from '../services/analytics';

async function smartSearch(query) {
  // Search
  const response = await medicineAPI.search(query, false);
  const results = response.data.results;
  
  // Track
  analytics.trackSearch(query, results.length, false);
  
  if (results.length === 0) {
    analytics.trackEmptySearchResults(query);
  }
  
  return results;
}

function handleClick(medicine, index) {
  analytics.trackSearchResultClick(query, medicine, index);
  analytics.trackMedicineView(medicine, 'search');
  // Navigate...
}
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Autocomplete not showing | Check query length ≥ 2 |
| Slow search | Check debounce (300ms) |
| No analytics tracking | Verify `setEnabled(true)` |
| Mobile search not working | Check auth token & API URL |
| Keyboard nav broken | Check focus on input |

---

## ✅ Checklist for Integration

- [ ] Import analytics service
- [ ] Import autocomplete component (web)
- [ ] Add `onSelect` handler
- [ ] Track search events
- [ ] Track result clicks
- [ ] Track medicine views
- [ ] Track filter usage
- [ ] Test keyboard navigation
- [ ] Test on mobile
- [ ] Verify analytics in console
- [ ] Test offline behavior (mobile)

---

## 📚 Documentation

- Full Guide: `MEDICINE_SEARCH_GUIDE.md`
- Analytics Guide: `SEARCH_ANALYTICS_AUTOCOMPLETE.md`
- Implementation: `MEDICINE_SEARCH_IMPLEMENTATION.md`

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Updated:** December 2024
