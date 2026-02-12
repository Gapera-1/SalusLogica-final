# Pharmacy Admin System - Testing Guide

## Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:5173`
- Fresh database or test database

---

## Testing Workflow

### Step 1: Pharmacy Admin Signup

**Frontend URL**: `http://localhost:5173/signup`

1. Click on the role selector and choose **"Pharmacy Admin"**
2. Fill in the form with:
   - **Username**: `pharmacy_test`
   - **Email**: `pharmacy@test.com`
   - **Password**: `TestPassword123`
   - **Country**: Rwanda
   - **Province**: Kigali
   - **District**: Gasabo
   - **Facility Name**: Test Pharmacy
   - **Facility Type**: Pharmacy
   - **Phone Number**: +250712345678
   - **Address**: KG671, Kigali
   - **License Number**: TEST-2024-001
   - **License Expiry**: 2026-12-31
   - Leave pharmacy_admin_id empty (for new signup)

3. Click **Sign Up**
4. **Expected Result**: 
   - Success message showing pharmacy ID (e.g., "12045PH02")
   - Redirect to login page after 3 seconds
   - Backend creates:
     - User with `user_type='pharmacy_admin'`
     - PharmacyAdmin profile with generated ID

**Backend Verification**:
```bash
# Check created user
python manage.py shell
>>> from django.contrib.auth.models import User
>>> u = User.objects.get(username='pharmacy_test')
>>> u.user_type
'pharmacy_admin'
>>> from saluslogica.models import PharmacyAdmin
>>> pa = PharmacyAdmin.objects.get(user=u)
>>> pa.pharmacy_id
'12045PH02'
```

---

### Step 2: Pharmacy Admin Login

**Frontend URL**: `http://localhost:5173/login`

1. Enter **Username**: `pharmacy_test`
2. Enter **Password**: `TestPassword123`
3. Click **Login**
4. **Expected Result**:
   - Redirected to dashboard
   - In localStorage, user object has `user_type: 'pharmacy_admin'`
   - Navigation shows "🏪 Pharmacy Admin" link

**Verify in Browser DevTools**:
```javascript
// In browser console
localStorage.getItem('user')
// Should return:
// {"id": X, "username": "pharmacy_test", "user_type": "pharmacy_admin", ...}
```

---

### Step 3: View Pharmacy Admin Dashboard

**Frontend URL**: `http://localhost:5173/pharmacy-admin/dashboard`

1. Automatically redirects here after login (or click "🏪 Pharmacy Admin" in nav)
2. **Expected Displays**:
   - Pharmacy ID: `12045PH02`
   - Facility Name: `Test Pharmacy`
   - Facility Type: `Pharmacy`
   - Location: `Gasabo, Kigali, Rwanda`
   - Stats cards showing:
     - Total Patients: 0 (initially)
     - Active Patients: 0 (initially)
     - Adverse Reactions: 0 (initially)
   - Quick action buttons

**API Calls Made**:
- `GET /api/pharmacy-admin/profile/` → Returns PharmacyAdmin data
- `GET /api/pharmacy-admin/adverse-reactions/` → Returns adverse reactions

---

### Step 4: Patient Association (Link Patient to Pharmacy)

#### Option A: Patient Signs Up with Pharmacy ID

**Frontend URL**: `http://localhost:5173/signup`

1. Choose role **"Patient"** (not pharmacy admin)
2. Fill in basic info:
   - **Username**: `patient_test`
   - **Email**: `patient@test.com`
   - **Password**: `TestPassword123`
   - **Confirm Password**: `TestPassword123`
3. In the optional section, enter:
   - **Pharmacy Admin ID**: `12045PH02` (from step 1)
4. Click **Sign Up**
5. **Expected Result**:
   - User created as patient
   - PatientPharmacyAssociation created linking patient to pharmacy
   - Patient now appears in pharmacy admin's patient list

**Backend Verification**:
```bash
python manage.py shell
>>> from saluslogica.models import PatientPharmacyAssociation
>>> assoc = PatientPharmacyAssociation.objects.filter(
...     pharmacy_admin__pharmacy_id='12045PH02'
... ).first()
>>> assoc.patient.username
'patient_test'
>>> assoc.is_active
True
```

#### Option B: Manual Patient Linking via API

```bash
curl -X POST http://localhost:8000/api/pharmacy-admin/link-patient/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pharmacy_id": "12045PH02",
    "patient_username": "patient_test"
  }'
```

---

### Step 5: View Patients List

**Frontend URL**: `http://localhost:5173/pharmacy-admin/patients`

1. After Step 4 is complete, visit this page
2. **Expected Displays**:
   - Patient table with columns:
     - Username: `patient_test`
     - Email: `patient@test.com`
     - Status: `Active`
     - Joined Date: (signup date)
     - Actions: "View" and "Medicines" buttons
   - Search box to filter by username/email
   - Status filter (All/Active/Inactive)
   - Count showing "Showing 1 of 1 patients"

**Filter Testing**:
1. Try **Search**: Type "patient_test" → Shows matching patient
2. Try **Search**: Type "xyz" → Shows "No patients found"
3. Try **Filter**: Select "Inactive" → Shows no patients (if all active)

**API Call Made**:
- `GET /api/pharmacy-admin/patients/` → Returns list of associated patients
- With filter param: `?is_active=true` or `?is_active=false`

---

### Step 6: Test Multiple Patients

**Create 3-5 More Patients**:

Repeat Step 4 with different credentials:
- `patient2` with email `patient2@test.com` (with pharmacy ID)
- `patient3` with email `patient3@test.com` (with pharmacy ID)
- `patient4` with email `patient4@test.com` (without pharmacy ID - won't appear)

**Expected Result**:
- Pharmacy admin dashboard stats update:
  - Total Patients: 3
  - Active Patients: 3
- Patient list shows all 3 patients

---

## API Testing (Using Postman/Curl)

### 1. Get Pharmacy Admin Profile

```bash
TOKEN="your_pharmacy_admin_token"
curl -X GET http://localhost:8000/api/pharmacy-admin/profile/ \
  -H "Authorization: Token $TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "id": 1,
  "pharmacy_id": "12045PH02",
  "username": "pharmacy_test",
  "email": "pharmacy@test.com",
  "facility_name": "Test Pharmacy",
  "facility_type": "pharmacy",
  "country": "Rwanda",
  "province": "Kigali",
  "district": "Gasabo",
  "phone_number": "+250712345678",
  "address": "KG671, Kigali",
  "license_number": "TEST-2024-001",
  "license_expiry": "2026-12-31",
  "is_active": true,
  "is_verified": false,
  "patient_count": 3,
  "active_patient_count": 3,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### 2. Get Patients List

```bash
TOKEN="your_pharmacy_admin_token"
curl -X GET http://localhost:8000/api/pharmacy-admin/patients/ \
  -H "Authorization: Token $TOKEN"
```

**Expected Response** (200 OK):
```json
[
  {
    "id": 5,
    "username": "patient_test",
    "email": "patient@test.com",
    "first_name": "",
    "last_name": "",
    "is_active_association": true,
    "assigned_date": "2024-01-15T10:35:00Z",
    "consent_given": false
  },
  /* ... more patients ... */
]
```

### 3. Get Adverse Reactions

```bash
TOKEN="your_pharmacy_admin_token"
curl -X GET http://localhost:8000/api/pharmacy-admin/adverse-reactions/ \
  -H "Authorization: Token $TOKEN"
```

**Expected Response** (200 OK):
```json
[]  # Empty initially, or list of reactions if patients reported any
```

### 4. Validate Pharmacy ID

```bash
curl -X GET http://localhost:8000/api/pharmacy-admin/validate-id/12045PH02/
```

**Expected Response** (200 OK):
```json
{
  "valid": true,
  "parsed": {
    "country_code": "12",
    "province_code": "04",
    "district_code": "5",
    "type": "PH",
    "sequence": "02"
  },
  "exists": true
}
```

---

## Common Issues & Troubleshooting

### Issue 1: "Pharmacy admin profile not found" Error

**Cause**: User logged in doesn't have a PharmacyAdmin record
**Solution**: 
- Ensure you signed up as pharmacy_admin role
- Check backend: `PharmacyAdmin.objects.filter(user__username='username')`
- Regenerate credentials

### Issue 2: No Patients Appearing in List

**Cause**: Patients not associated with pharmacy admin
**Solution**:
- Sign up patients WITH the pharmacy admin ID
- Or manually link patients via `/api/pharmacy-admin/link-patient/`
- Verify in backend: `PatientPharmacyAssociation.objects.all()`

### Issue 3: Navigation Shows No Pharmacy Admin Link

**Cause**: `user_type` not in localStorage or not set to 'pharmacy_admin'
**Solution**:
- Logout and login again
- Check localStorage has `user_type: 'pharmacy_admin'`
- Verify backend returned user_type in login response

### Issue 4: CORS Error on API Calls

**Cause**: Backend CORS not configured
**Solution**:
- Ensure `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check Django CORS headers middleware is installed
- Verify token included in requests

### Issue 5: 401 Unauthorized on API Calls

**Cause**: Invalid or missing token
**Solution**:
- Login again to get fresh token
- Verify token format: `Token abc123xyz`
- Check token in localStorage: `localStorage.getItem('access_token')`

---

## Checklist for Full System Test ✓

- [ ] Pharmacy admin signs up successfully
- [ ] Pharmacy ID generated correctly (11 characters, format: XXXXXPhXX)
- [ ] User created with `user_type='pharmacy_admin'`
- [ ] Login works and user_type returned
- [ ] Navigation shows pharmacy admin link
- [ ] Dashboard page loads and displays pharmacy info
- [ ] Stats cards show correct counts
- [ ] Can create multiple patients with pharmacy ID
- [ ] Patient list shows all associated patients
- [ ] Search filters work correctly
- [ ] Status filter (active/inactive) works
- [ ] API endpoints return correct data structure
- [ ] Unauthorized users can't access pharmacy endpoints
- [ ] Frontend build succeeds (92 modules)
- [ ] No JavaScript errors in browser console

---

## Performance Notes

**Frontend Build Size**: 463.68 kB (125.53 kB gzipped)
**Modules**: 92 transformed modules
**Build Time**: 3.76 seconds

---

## Success Criteria ✓

Your pharmacy admin system is working correctly when:

1. ✅ Pharmacy admin can sign up with all required fields
2. ✅ Unique pharmacy ID is auto-generated and stored
3. ✅ User type is correctly set to 'pharmacy_admin'
4. ✅ Login returns user with correct user_type
5. ✅ Dashboard displays pharmacy details and stats
6. ✅ Patients associated via pharmacy ID appear in list
7. ✅ Frontend pages load without errors
8. ✅ API endpoints return proper responses
9. ✅ Search and filter work on patient list
10. ✅ Navigation shows pharmacy admin option

