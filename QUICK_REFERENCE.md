# Translation Quick Reference - SalusLogica

## 🚀 Quick Start

### Using Translations in React

```jsx
import { useLanguage } from '../i18n';

function Component() {
  const { t, tMedicine } = useLanguage();
  
  // Simple translation
  const label = t('common.save');
  
  // Translation with parameters
  const greeting = t('dashboard.welcomeBack', { patient: 'John' });
  
  // Medicine translation (keeps scientific name untranslated)
  const info = tMedicine('medicines.medicineAboutDrug', 'Ibuprofen', 'ibuprofen');
  
  return (
    <div>
      <h1>{greeting}</h1>
      <p>{info}</p>
      <button>{label}</button>
    </div>
  );
}
```

---

## 📋 Placeholder Quick Reference

| Placeholder | Example Translation | Example Output |
|------------|---------------------|-----------------|
| `%(drug)s` | "Safety report for %(drug)s" | "Safety report for Ibuprofen" |
| `%(patient)s` | "Welcome back, %(patient)s!" | "Welcome back, John!" |
| `%(date)s` | "Taken on %(date)s" | "Taken on 02/12/2026" |
| `%(provider)s` | "Doctor: %(provider)s" | "Doctor: Dr. Smith" |

---

## 🌍 Language Settings

### Force Language Change
```jsx
const { setLanguage } = useLanguage();
setLanguage('rw');  // Switch to Kinyarwanda
```

### Available Languages
- `en` - English
- `rw` - Kinyarwanda (MOH standard)
- `fr` - French

---

## ❌ What NOT To Do

### ❌ WRONG: Translating scientific names
```jsx
// ❌ NEVER do this
t(`medicine.${scientificName}`);
t('medicines.ibuprofen');
```

### ❌ WRONG: Using old {variable} format
```jsx
// ❌ OLD FORMAT
`Welcome back, {username}!`

// ✅ NEW FORMAT
t('dashboard.welcomeBack', { patient: username })
```

### ❌ WRONG: Wrapping parameters
```jsx
// ❌ WRONG
t('label') + ' ' + medicineName

// ✅ CORRECT
t('medicines.medicineAboutDrug', { drug: medicineName })
```

---

## ✅ Correct Patterns

### Pattern 1: Simple Translation
```jsx
const { t } = useLanguage();
const label = t('common.save');  // "Save" in current language
```

### Pattern 2: Translation with Parameter
```jsx
const { t } = useLanguage();
const message = t('dashboard.welcomeBack', { patient: 'Alex' });
// EN: "Welcome back, Alex!"
// RW: "Karibu Alex!"
```

### Pattern 3: Medicine Translation
```jsx
const { tMedicine } = useLanguage();
const medicine = { 
  name: 'Aspirin', 
  scientific_name: 'acetylsalicylic acid' 
};
const label = tMedicine(
  'medicines.medicineAboutDrug', 
  medicine.name,
  medicine.scientific_name
);
// EN: "Medication information for acetylsalicylic acid"
// RW: "Umuti munsi wa acetylsalicylic acid"
```

---

## 🇷🇼 Kinyarwanda MOH Terms

### Essential Terms to Know

| English | Kinyarwanda (MOH) |
|---------|-------------------|
| Medication | **Umuti** |
| Doctor | **Umutanga-serivisi z'ubuzima** |
| Patient | Umurwaye |
| Dosage | Ubwigize |
| Dosage | Doze |
| Prescription | Umusanire |
| Pharmacy | Inzira |
| Health Provider | **Umutanga-serivisi z'ubuzima** |

---

## 📝 Translation JSON Structure

### File Location
```
medicine-reminder/src/i18n/
├── en.json          (English)
├── fr.json          (French)
├── rw.json          (Kinyarwanda - MOH standard)
├── LanguageContext.jsx
├── useLanguage.js
└── index.js
```

### Adding a New Translation Key
1. Open the appropriate JSON file
2. Add key with placeholder format:
```json
{
  "medicines": {
    "newKey": "Medication information for %(drug)s"
  }
}
```

3. Add same key to other language files for consistency
4. Use in component:
```jsx
const message = tMedicine('medicines.newKey', name, scientific);
```

---

## 🔧 Helper Functions

### `getMOHTerminology(term)`
Get official MOH terminology for a term.

```jsx
import { getMOHTerminology } from '../services/i18n';

const formalTerm = getMOHTerminology('doctor');
// Returns: "Umutanga-serivisi z'ubuzima"
```

### `validateTranslationFormat(key, text)`
Validate that translation uses correct `%(variable)s` format.

```jsx
import { validateTranslationFormat } from '../services/i18n';

const isValid = validateTranslationFormat('medicines.title', 'Medication for %(drug)s');
// Returns: true if format is correct, false if uses old {drug} format
```

---

## 🎯 Common Scenarios

### Scenario 1: Display Medicine List
```jsx
const { tMedicine } = useLanguage();

{medicines.map(med => (
  <div key={med.id}>
    <h3>{med.name}</h3>
    <p>{tMedicine('medicines.medicineAboutDrug', med.name, med.scientific_name)}</p>
    <p>{med.dosage}</p>
  </div>
))}
```

### Scenario 2: Safety Check Report
```jsx
const { t } = useLanguage();
const reportTitle = t('safetyCheck.safetyReportFor', { drug: medicine.scientific_name });
```

### Scenario 3: Personalized Dashboard
```jsx
const { t } = useLanguage();
const userName = user?.username;
<h1>{t('dashboard.welcomeBack', { patient: userName })}</h1>
```

---

## ⚠️ Common Mistakes & Fixes

| Mistake | Fix |
|---------|-----|
| `t('label') + value` | Use `t('label', { variable: value })` |
| `t('medicines.' + scientific)` | Use `tMedicine('key', name, scientific)` |
| `{username}` in strings | Use `%(patient)s` in translation files |
| Translation for scientific names | Never translate - pass as parameter |

---

## 🧪 Testing Translations

### Test Language Switch
1. Open browser DevTools (F12)
2. Go to Console
3. Run: `localStorage.setItem('preferredLanguage', 'rw')`
4. Refresh page
5. Verify Kinyarwanda appears

### Verify Placeholders Work
1. Check Dashboard greeting shows your username
2. Check medicine pages show drug names (not translated)
3. Check date appears in correct format

### Validate Translation Keys
```bash
# Check all translation keys exist
grep -r "%(drug)s" src/i18n/

# Verify no old format used
grep -r "{[a-z]}" src/i18n/ || echo "✓ No old format found"
```

---

## 📞 Support

- **Guidelines**: See `TRANSLATION_GUIDELINES.md`
- **Implementation**: See `TRANSLATION_IMPLEMENTATION.md`
- **Files**: Check `medicine-reminder/src/i18n/` folder

---

**Last Updated**: February 12, 2026  
**Standard**: Rwanda MOH Health Terminology  
**Status**: Active & Tested
