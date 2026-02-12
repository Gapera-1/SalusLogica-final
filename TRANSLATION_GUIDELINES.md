# SalusLogica Translation Engine Guidelines

## Critical Constraint: Fixed Drug Names

**RULE: Medication scientific names MUST NEVER be wrapped in translation tags.**

### Correct Usage

```jsx
// ✅ CORRECT: Scientific name passed as parameter
const { tMedicine } = useLanguage();
const drugDisplay = tMedicine('medicines.medicineAboutDrug', 'Ibuprofen', 'ibuprofen');
// Result: "Medication information for ibuprofen" (EN) or "Umuti munsi wa ibuprofen" (RW)

// ✅ CORRECT: Using t() with %(drug)s placeholder
const { t } = useLanguage();
const message = t('medicines.medicineAboutDrug', { drug: 'ibuprofen' });
```

### Incorrect Usage

```jsx
// ❌ WRONG: Wrapping scientific name in translation
t(`medicine.name_${scientificName}`); 

// ❌ WRONG: Translating the scientific name
t('medicines.ibuprofen'); // Scientific names are NOT translatable

// ❌ WRONG: Using old format {variable} instead of %(variable)s
`Welcome back, {name}!` // Should be: "Welcome back, %(patient)s!"
```

## Placeholder Format Specification

All dynamic content must use **Python-style string formatting** with `%(variable)s`:

### Required Placeholders

| Placeholder | Usage | Example |
|------------|-------|---------|
| `%(drug)s` | Medicine/drug names | "Medication information for %(drug)s" |
| `%(patient)s` | Patient names | "Welcome back, %(patient)s!" |
| `%(date)s` | Dates | "Last taken on %(date)s" |
| `%(provider)s` | Health providers | "Prescribed by %(provider)s" |

### Translation File Structure

```json
{
  "medicines": {
    "medicineAboutDrug": "Medication information for %(drug)s",
    "safetyReportFor": "Safety Report for %(drug)s"
  },
  "dashboard": {
    "welcomeBack": "Welcome back, %(patient)s!"
  }
}
```

## Kinyarwanda Ministry of Health (MOH) Terminology

### Mandatory Term Replacements

| Old Term | MOH Formal Term | Usage |
|----------|-----------------|-------|
| Iyiyoni | **Umuti** | Medication/Medicine |
| Umuganga | **Umutanga-serivisi z'ubuzima** | Health Provider in formal contexts |
| Prescription | **Umusanire** | Medical order/direction |
| Dosage | **Ubwigize** | Dose/Dosage |

### Profile Fields Translation (RW)

```
First Name → Izina ziza
Weight → Ubwigize (kg)
Allergies → Icyo gitaka
Age Category → Ikigero cy'imyaka
Gender → Ubwigize
Health Provider → Umutanga-serivisi z'ubuzima
```

## Implementation in React Components

### Using tMedicine Hook

```jsx
import { useLanguage } from '../i18n';

function MedicineCard({ medicine }) {
  const { tMedicine, t } = useLanguage();
  
  // Display medicine with scientific name preserved
  return (
    <div>
      <h3>{medicine.name}</h3>
      <p>{tMedicine('medicines.medicineAboutDrug', medicine.name, medicine.scientific_name)}</p>
      <p>{t('medicines.dosage')}: {medicine.dosage}</p>
    </div>
  );
}
```

### Using t() with Parameters

```jsx
import { useLanguage } from '../i18n';

function Dashboard({ userName }) {
  const { t } = useLanguage();
  
  return (
    <h1>{t('dashboard.welcomeBack', { patient: userName })}</h1>
  );
}
```

## Backend (Django) Integration

### API Response Guidelines

Medicine objects returned from the API must include:

```json
{
  "id": 1,
  "name": "Aspirin",
  "scientific_name": "acetylsalicylic acid",
  "dosage": "500mg",
  "frequency": "twice_daily"
}
```

### Translation Views

Use the `%(variable)s` format in Django translations:

```python
# ✅ CORRECT
from django.utils.translation import gettext_lazy as _

message = _('Safety check for %(drug)s') % {'drug': medicine.scientific_name}

# ❌ WRONG
message = _('Safety check for {0}').format(medicine.scientific_name)
```

## Validation Checklist

- [ ] Scientific names are NEVER wrapped in `t()` or translation functions
- [ ] All placeholders use `%(variable)s` format (NOT `{variable}`)
- [ ] Kinyarwanda uses formal MOH terminology (Umuti, not Iyiyoni)
- [ ] Profile fields are translated for all supported languages
- [ ] Navigation labels include proper terminology replacements
- [ ] Drug interactions use medicine parameters, not translated names
- [ ] Date/patient names use proper placeholders

## Testing Translation Integrity

```bash
# Check for old format {variable}
grep -r "{[a-z]*}" src/i18n/

# Verify placeholders are used correctly
grep -r "%(drug)s" src/i18n/

# Ensure scientific_name is never in t() calls
grep -r "t('.*scientific" src/ || echo "✓ No scientific names wrapped in t()"
```

## Troubleshooting

### Placeholder Not Replacing
- Ensure you're using `t(key, params)` format, not just `t(key)`
- Check placeholder name matches parameter key exactly
- Verify `%(variable)s` format is correct

### Kinyarwanda Terms Missing
- Check TRANSLATION_GUIDELINES.md for MOH standard terms
- Use `getMOHTerminology()` function for consistency
- Report missing terms to translation team

### Drug Name Appearing Untranslated
- This is CORRECT - scientific names should never translate
- Use `tMedicine()` helper for proper handling
- Refer to "Correct Usage" section above

---

Last Updated: February 12, 2026
Standards: Rwanda Ministry of Health Formal Terminology
Compliance Level: STRICT
