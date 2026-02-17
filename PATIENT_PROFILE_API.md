# Patient Profile & Safety API Documentation

## Overview
The system now automatically checks drug contraindications against patient profiles when medicines are added. Safety warnings are returned in the API response.

## API Endpoints

### 1. Patient Profile Management

#### Get/Create Patient Profile
```http
GET /api/medicines/patient-profile/me/
```

Creates a profile with default age if one doesn't exist, or returns existing profile.

**Response:**
```json
{
  "id": 1,
  "user": 5,
  "username": "john_doe",
  "age": 25,
  "is_pregnant": false,
  "is_lactating": false,
  "population_category": "adult",
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:00:00Z"
}
```

#### Update Patient Profile
```http
POST /api/medicines/patient-profile/update_me/
PATCH /api/medicines/patient-profile/update_me/
```

**Request Body:**
```json
{
  "age": 28,
  "is_pregnant": false,
  "is_lactating": false
}
```

**Response:**
```json
{
  "id": 1,
  "user": 5,
  "username": "john_doe",
  "age": 28,
  "is_pregnant": false,
  "is_lactating": false,
  "population_category": "adult",
  "created_at": "2026-02-14T10:00:00Z",
  "updated_at": "2026-02-14T10:15:00Z"
}
```

#### Create Initial Profile
```http
POST /api/medicines/patient-profile/
```

**Request Body:**
```json
{
  "age": 25,
  "is_pregnant": false,
  "is_lactating": false
}
```

---

### 2. Medicine Creation with Safety Checks

#### Add Medicine (with automatic contraindication check)
```http
POST /api/medicines/medicines/
```

**Request Body:**
```json
{
  "name": "Warfarin",
  "scientific_name": "Warfarin Sodium",
  "dosage": "5mg",
  "frequency": "once_daily",
  "times": ["09:00"],
  "duration": 30,
  "start_date": "2026-02-14",
  "end_date": "2026-03-16",
  "dose_mg": 5,
  "weight_kg": 70
}
```

**Success Response (with warnings):**
```json
{
  "id": 10,
  "name": "Warfarin",
  "scientific_name": "Warfarin Sodium",
  "dosage": "5mg",
  "frequency": "once_daily",
  "times": ["09:00"],
  "duration": 30,
  "start_date": "2026-02-14",
  "end_date": "2026-03-16",
  "dose_mg": "5.00",
  "weight_kg": "70.00",
  "is_active": true,
  "completed": false,
  "safety_warnings": [
    {
      "type": "pregnancy_risk",
      "severity": "absolute",
      "population": "Pregnant",
      "condition": "Pregnancy",
      "message": "Warfarin may be contraindicated during pregnancy.",
      "source": "Common pregnancy contraindications"
    }
  ]
}
```

**Warning when no patient profile:**
```json
{
  "id": 10,
  "name": "Aspirin",
  "dosage": "100mg",
  "... other fields ...",
  "safety_warnings": [
    {
      "type": "no_profile",
      "severity": "warning",
      "message": "No patient profile found. Safety checks cannot be performed.",
      "recommendation": "Please complete your patient profile for safety checks."
    }
  ]
}
```

---

### 3. Manual Safety Check

#### Check Safety of Existing Medicine
```http
POST /api/medicines/safety-check/safety_check/
```

**Request Body:**
```json
{
  "medicine_id": 10
}
```

**Response:**
```json
{
  "medicine": {
    "id": 10,
    "name": "Warfarin",
    "dosage": "5mg",
    "dose_mg": "5.00"
  },
  "patient_profile": {
    "age": 32,
    "is_pregnant": true,
    "is_lactating": false,
    "population_category": "pregnant"
  },
  "safety_alerts": [
    {
      "type": "pregnancy_contraindication",
      "severity": "critical",
      "population": "Pregnant",
      "message": "Warfarin is contraindicated for pregnancy",
      "recommendation": "Consult with obstetrician immediately"
    }
  ],
  "overall_safety": false,
  "total_alerts": 1
}
```

**Error when no profile:**
```json
{
  "error": "No patient profile found",
  "message": "Please complete your patient profile for safety checks",
  "medicine": {
    "id": 10,
    "name": "Warfarin",
    "dosage": "5mg"
  }
}
```

---

### 4. Get Contraindications for Patient

#### List All Contraindications for Your Population
```http
GET /api/medicines/safety-check/contraindications/
```

**Response:**
```json
{
  "patient_profile": {
    "age": 32,
    "is_pregnant": true,
    "is_lactating": false,
    "population_category": "pregnant"
  },
  "contraindications": [
    {
      "drug": "Warfarin",
      "generic_name": "Warfarin Sodium",
      "condition": "Pregnancy",
      "severity": "absolute",
      "description": "Warfarin crosses the placental barrier and can cause fetal warfarin syndrome",
      "source": "WHO Essential Medicines Guidelines"
    },
    {
      "drug": "Methotrexate",
      "generic_name": "Methotrexate",
      "condition": "Pregnancy",
      "severity": "absolute",
      "description": "Teratogenic - causes severe birth defects",
      "source": "Rwanda FDA"
    }
  ],
  "total_contraindications": 2
}
```

---

## Population Categories

The system automatically classifies patients into one of these categories based on age and status:

| Category | Criteria |
|----------|----------|
| `infant_toddler` | Age 0-5 years |
| `child` | Age 6-11 years |
| `adult` | Age 12-64 years |
| `elderly` | Age 65+ years |
| `pregnant` | is_pregnant = true (takes priority) |
| `lactating` | is_lactating = true (takes priority) |

---

## Safety Warning Types

1. **contraindication** - Drug is contraindicated for patient's population
2. **pregnancy_risk** - Drug may be unsafe during pregnancy
3. **elderly_dosage** - High dose detected for elderly patient
4. **pediatric_dosing** - Weight-based dosing required for children
5. **dosage_safety** - Dose outside 10% safety margin
6. **food_interaction** - Foods to avoid with this medicine
7. **no_profile** - Patient profile doesn't exist

---

## Severity Levels

- **absolute** - Completely contraindicated, must not be used
- **relative** - Use with caution, benefits must outweigh risks
- **critical** - Immediate medical consultation required
- **moderate** - Important warning, discuss with healthcare provider
- **warning** - Informational, be aware

---

## Integration Example (Frontend)

```javascript
// 1. Create/Update patient profile on registration or profile page
async function savePatientProfile(profileData) {
  const response = await fetch('/api/medicines/patient-profile/update_me/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
  });
  return response.json();
}

// 2. Add medicine and check for warnings
async function addMedicine(medicineData) {
  const response = await fetch('/api/medicines/medicines/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(medicineData)
  });
  const data = await response.json();
  
  // Check for safety warnings
  if (data.safety_warnings && data.safety_warnings.length > 0) {
    // Show disclaimer to user
    showWarningDialog(data.safety_warnings);
  }
  
  return data;
}

// 3. Show warning dialog
function showWarningDialog(warnings) {
  const criticalWarnings = warnings.filter(w => 
    w.severity === 'absolute' || w.severity === 'critical'
  );
  
  if (criticalWarnings.length > 0) {
    // Show urgent warning modal
    alert('CRITICAL: ' + criticalWarnings.map(w => w.message).join('\n'));
  } else {
    // Show informational warnings
    console.warn('Safety warnings:', warnings);
  }
}
```

---

## Notes

- Patient profiles are mandatory for safety checks to work
- Medicine creation will still succeed even with warnings (informational only)
- For critical contraindications, consider adding frontend validation to require user confirmation
- The system checks both database contraindications and common drug safety rules
- Contraindications are based on Rwanda FDA and WHO guidelines
