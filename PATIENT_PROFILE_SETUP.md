# Patient Profile & Contraindication System - Setup Guide

## What Was Implemented

✅ **Patient Profile Management**
- Database model: `PatientProfile` with age, is_pregnant, is_lactating fields
- API endpoints for creating/updating patient profiles
- Automatic population categorization (infant, child, adult, elderly, pregnant, lactating)

✅ **Contraindication Database**
- `Drug` model for maintaining drug database
- `Contraindication` model linking drugs to population-specific contraindications
- Admin interface for managing contraindications

✅ **Automated Safety Checks**
- Medicine creation automatically checks patient profile against contraindication database
- Returns safety warnings in API response
- Manual safety check endpoint for existing medicines

✅ **Fixed Bugs**
- Corrected field name mismatches in views_safety.py
- Aligned code to use actual PatientProfile model instead of non-existent population_type field
- Fixed queries to use correct model fields (population vs population_groups)

## Setup Instructions

### 1. Run Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 2. Populate Sample Contraindication Data

Run in Django shell or create a management command:

```bash
python manage.py shell < populate_contraindications.py
```

Or manually through Django admin at `/admin/medicines/contraindication/`

### 3. Create Superuser (if needed)

```bash
python manage.py createsuperuser
```

### 4. Test the API

#### Create a patient profile
```bash
curl -X POST http://localhost:8000/api/medicines/patient-profile/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "age": 30,
    "is_pregnant": true,
    "is_lactating": false
  }'
```

#### Add a medicine (will check contraindications automatically)
```bash
curl -X POST http://localhost:8000/api/medicines/medicines/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Warfarin",
    "dosage": "5mg",
    "frequency": "once_daily",
    "times": ["09:00"],
    "duration": 30,
    "start_date": "2026-02-14",
    "end_date": "2026-03-16"
  }'
```

Expected response will include `safety_warnings` array if any contraindications are found.

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/medicines/patient-profile/me/` | GET | Get current user's profile |
| `/api/medicines/patient-profile/update_me/` | POST/PATCH | Update current user's profile |
| `/api/medicines/patient-profile/` | POST | Create initial profile |
| `/api/medicines/medicines/` | POST | Add medicine (auto safety check) |
| `/api/medicines/safety-check/safety_check/` | POST | Manual safety check |
| `/api/medicines/safety-check/contraindications/` | GET | List contraindications for user |
| `/api/medicines/safety-check/food_advice/` | GET | Get food interaction advice |

## How It Works

1. **Patient Profile Storage**: When user registers or updates profile, age, pregnancy status, and lactation status are saved.

2. **Medicine Addition**: When adding a medicine:
   - System fetches user's PatientProfile
   - Determines population category (infant_toddler, child, adult, elderly, pregnant, lactating)
   - Searches Drug database for matching drug
   - Queries Contraindication table for relevant contraindications
   - Returns medicine data WITH safety_warnings array

3. **Warnings Display**: Frontend should:
   - Check if `safety_warnings` exists in response
   - Display warnings to user (especially critical/absolute ones)
   - Allow user to confirm or cancel medicine addition

4. **Manual Checks**: Users can manually check safety of existing medicines via safety_check endpoint.

## Frontend Integration Points

### Medicine Form Component
```javascript
const addMedicine = async (medicineData) => {
  const response = await api.post('/medicines/medicines/', medicineData);
  const data = response.data;
  
  if (data.safety_warnings && data.safety_warnings.length > 0) {
    // Show modal with warnings
    const criticalWarnings = data.safety_warnings.filter(w => 
      w.severity === 'absolute' || w.severity === 'critical'
    );
    
    if (criticalWarnings.length > 0) {
      // Show critical warning modal - require confirmation
      const confirmed = await showCriticalWarningModal(criticalWarnings);
      if (!confirmed) {
        // Delete the created medicine
        await api.delete(`/medicines/medicines/${data.id}/`);
        return null;
      }
    } else {
      // Show info toast about warnings
      showWarningToast(data.safety_warnings);
    }
  }
  
  return data;
};
```

### Patient Profile Form Component
```javascript
const updateProfile = async (profileData) => {
  const response = await api.post('/medicines/patient-profile/update_me/', {
    age: profileData.age,
    is_pregnant: profileData.isPregnant,
    is_lactating: profileData.isLactating
  });
  return response.data;
};
```

## Database Schema

### PatientProfile
- `user`: OneToOne -> User
- `age`: Integer (0-150)
- `is_pregnant`: Boolean
- `is_lactating`: Boolean

### Drug
- `name`: String
- `generic_name`: String
- `atc_code`: String (optional)
- `is_registered_in_rwanda`: Boolean
- `is_essential_in_rwanda`: Boolean

### Contraindication
- `drug`: ForeignKey -> Drug
- `population`: Choice (infant_toddler, child, adult, elderly, pregnant, lactating)
- `condition`: String
- `severity`: Choice (absolute, relative)
- `description`: Text
- `source`: String

## Testing Checklist

- [ ] Create patient profile via API
- [ ] Update patient profile
- [ ] Add medicine for pregnant woman (should get pregnancy warnings)
- [ ] Add aspirin for child under 12 (should get Reye's syndrome warning)
- [ ] Add medicine without patient profile (should get "no profile" warning)
- [ ] Check contraindications endpoint
- [ ] View contraindications in Django admin
- [ ] Add custom contraindication via admin

## Next Steps

1. **Populate More Contraindications**: Add more drugs and contraindications via Django admin or data import
2. **Frontend UI**: Create patient profile form and warning modals
3. **Enhanced Validation**: Consider blocking critical contraindications instead of just warning
4. **Audit Trail**: Log when users override contraindication warnings
5. **Localization**: Translate warning messages to Kinyarwanda, French

## Notes

- System currently warns but allows medicine to be added even with contraindications
- Consider adding a "confirmed_override" flag if you want to track when users acknowledge warnings
- Contraindication data should be reviewed and approved by medical professionals
- Integration with Rwanda FDA drug database would improve coverage
