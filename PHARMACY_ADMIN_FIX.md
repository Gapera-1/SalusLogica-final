"""
Quick fix for pharmacy admin signup
"""

# Instructions to fix the "Failed to create account" error:

## 1. Backend Setup Issues Fixed:
- ✅ Added saluslogica app to INSTALLED_APPS
- ✅ Fixed import paths in models.py
- ✅ Created proper Django app structure
- ✅ Added admin configuration
- ✅ Created test endpoints

## 2. Run these commands in the backend directory:

```bash
# Navigate to backend directory
cd C:\Users\user\OneDrive\Desktop\SalusLogica-final\backend

# Run migrations
python manage.py makemigrations saluslogica
python manage.py migrate

# Create superuser (if needed)
python manage.py createsuperuser

# Test the setup
python manage.py runserver
```

## 3. Test the API endpoints:

Open these URLs in your browser:
- http://127.0.0.1:8000/api/pharmacy-admin/test/ - Test setup
- http://127.0.0.1:8000/api/pharmacy-admin/location-options/ - Get location options

## 4. If still failing, run the debug script:

```bash
python debug_pharmacy_admin.py
```

## 5. Common Issues and Solutions:

### Issue: "ModuleNotFoundError: No module named 'saluslogica'"
**Solution**: Make sure you're running from the backend directory and the app is in INSTALLED_APPS

### Issue: "ImportError: cannot import name 'PharmacyAdminIDGenerator'"
**Solution**: Check that the utils/__init__.py file exists and the import path is correct

### Issue: "Database error: no such table"
**Solution**: Run migrations: `python manage.py migrate`

### Issue: "CORS error" in frontend
**Solution**: Make sure the backend is running and CORS is configured

## 6. Quick Test:

Try creating a pharmacy admin with these values:
- Username: testpharmacy
- Email: test@pharmacy.com
- Password: TestPass123!
- Role: Pharmacy Admin
- Country: RW
- Province: Kigali
- District: Nyarugenge
- Facility Name: Test Pharmacy
- Facility Type: Pharmacy

The system should generate an ID like: 2500101PH01

## 7. Backend URLs to verify:

- ✅ POST /api/pharmacy-admin/signup/
- ✅ GET /api/pharmacy-admin/test/
- ✅ GET /api/pharmacy-admin/location-options/
- ✅ POST /api/pharmacy-admin/validate-id/{pharmacy_id}/

## 8. Frontend Debugging:

Check browser console for these errors:
- Network errors (404, 500)
- CORS errors
- JavaScript errors

The most common issue is that the backend isn't running or the API endpoints aren't accessible.

## 9. Mobile App:

Make sure the mobile app is pointing to:
- http://127.0.0.1:8000/api/pharmacy-admin/signup/

NOT:
- localhost:8000 (might cause issues on some devices)

## 10. Final Check:

1. Backend is running: `python manage.py runserver`
2. Database is migrated: `python manage.py migrate`
3. Test endpoint works: http://127.0.0.1:8000/api/pharmacy-admin/test/
4. Frontend can reach the backend

If all these work, the signup should function properly.
