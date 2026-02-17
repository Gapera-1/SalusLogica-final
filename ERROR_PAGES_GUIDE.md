# Custom Error Pages - Implementation Guide

## 📋 Overview

Custom error pages have been implemented for SalusLogica to provide users with helpful, branded error messages instead of default Django error pages. This improves user experience and maintains brand consistency even when errors occur.

---

## ✅ What Was Implemented

### **1. HTML Error Pages (Web Interface)**

Three beautiful custom error pages with helpful messaging:

| Error Code | Template | Description |
|------------|----------|-------------|
| **404** | `templates/404.html` | Page Not Found |
| **500** | `templates/500.html` | Internal Server Error |
| **403** | `templates/403.html` | Access Forbidden |

**Features:**
- 🎨 Modern, responsive design
- 💊 Healthcare-themed with relevant icons
- 📱 Mobile-friendly layouts
- 💡 Helpful suggestions for users
- 🔗 Action buttons (Go Home, Go Back, Login)
- 🌈 Gradient backgrounds matching error severity

### **2. API Error Responses (REST API)**

Custom exception handler for consistent JSON error responses:

**File:** `saluslogica/exception_handlers.py`

**Features:**
- 📦 Consistent error response format
- 💬 User-friendly error messages
- 🔍 Helpful suggestions for each error type
- 📊 Detailed field validation errors
- 🪵 Automatic error logging

---

## 🎯 Error Page Examples

### 404 - Page Not Found
**When it appears:** User visits a URL that doesn't exist

**What users see:**
- Large "404" with gradient purple background
- "Page Not Found" title
- Friendly message about the missing page
- Suggestions list:
  - Check URL for typos
  - Go back to previous page
  - Return to home page
  - Contact support
- Action buttons: "Go to Home" | "Go Back"

### 500 - Internal Server Error
**When it appears:** Server encounters an unexpected error

**What users see:**
- Large "500" with gradient red/pink background
- "Internal Server Error" title
- Reassurance that data is safe
- Explanation that it's not user's fault
- Suggestions list:
  - Wait and try again
  - Refresh the page
  - Contact support
  - Check status page
- Action buttons: "Go to Home" | "Refresh Page"

### 403 - Access Forbidden
**When it appears:** User tries to access restricted content

**What users see:**
- Large "403" with gradient orange/yellow background
- "Access Forbidden" title
- Explanation about permissions
- Suggestions list:
  - Verify you're logged in
  - Check account permissions
  - Contact administrator
  - Try pharmacy admin login
- Action buttons: "Go to Home" | "Login"

---

## 🔧 Configuration Details

### Files Modified/Created

```
backend/
├── templates/
│   ├── 404.html          ✨ New - Custom 404 page
│   ├── 500.html          ✨ New - Custom 500 page
│   └── 403.html          ✨ New - Custom 403 page
├── saluslogica/
│   ├── views.py          ✏️ Modified - Added error handlers
│   ├── urls.py           ✏️ Modified - Configured handlers
│   ├── settings.py       ✏️ Modified - Added templates dir
│   └── exception_handlers.py  ✨ New - API error handling
└── test_error_pages.py   ✨ New - Test script
```

### Settings Changes

**`settings.py`:**
```python
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],  # Added global templates directory
        # ...
    },
]

REST_FRAMEWORK = {
    # ...
    'EXCEPTION_HANDLER': 'saluslogica.exception_handlers.custom_exception_handler',
}
```

**`urls.py`:**
```python
# Custom error handlers
handler404 = 'saluslogica.views.handler404'
handler500 = 'saluslogica.views.handler500'
handler403 = 'saluslogica.views.handler403'
```

---

## 🧪 Testing

### Automatic Testing

Run the test script:
```bash
cd backend
python test_error_pages.py
```

**Expected output:**
```
✅ 404 handler working
✅ Custom 404 template rendered
✅ 404 Page Not Found template exists
✅ 500 Internal Server Error template exists
✅ 403 Forbidden template exists
✅ Templates directory configured in settings
✅ All error handlers configured
```

### Manual Testing (Production Mode)

**1. Test 404 Error:**
```bash
# Temporarily set DEBUG=False in .env
DEBUG=False

# Start server
python manage.py runserver

# Visit in browser:
http://localhost:8000/nonexistent-page/
```

**2. Test 403 Error:**
```python
# Create a test view in any views.py
from django.core.exceptions import PermissionDenied

def test_403(request):
    raise PermissionDenied("Testing 403 error page")

# Add to urls.py:
path('test-403/', test_403),

# Visit: http://localhost:8000/test-403/
```

**3. Test 500 Error:**
```python
# Create a test view
def test_500(request):
    raise Exception("Testing 500 error page")

# Add to urls.py:
path('test-500/', test_500),

# Visit: http://localhost:8000/test-500/
```

### Testing API Errors

```bash
# Test 404 API endpoint
curl http://localhost:8000/api/medicines/999999/

# Expected JSON response:
{
  "success": false,
  "error": {
    "message": "Not found.",
    "type": "NotFound",
    "status_code": 404,
    "suggestions": [
      "Verify the resource ID is correct",
      "Check the resource exists",
      "Review the API documentation"
    ]
  }
}
```

---

## 📱 API Error Response Format

All API errors now return a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "User-friendly error message",
    "type": "ErrorType",
    "status_code": 404,
    "suggestions": [
      "Helpful suggestion 1",
      "Helpful suggestion 2"
    ]
  }
}
```

### Validation Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation error. Please check your input.",
    "type": "ValidationError",
    "status_code": 400,
    "fields": {
      "email": ["This field is required."],
      "age": ["Ensure this value is greater than 0."]
    },
    "suggestions": [
      "Check your request data for errors",
      "Verify all required fields are provided"
    ]
  }
}
```

---

## 🎨 Customization

### Modifying Error Page Styles

Edit the `<style>` section in each template:

```html
<!-- In templates/404.html -->
<style>
    body {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        /* Change colors here */
    }
    
    .error-code {
        font-size: 120px; /* Adjust size */
        /* Change gradient colors */
    }
</style>
```

### Adding Your Logo

```html
<!-- Add before the error-code div -->
<div class="logo">
    <img src="/static/images/logo.png" alt="SalusLogica">
</div>
```

### Changing Messages

Edit the text in the template files:

```html
<p class="error-message">
    Your custom message here
</p>
```

### Adding Custom Suggestions

```html
<div class="suggestions">
    <h3>Here's what you can try:</h3>
    <ul>
        <li>Your custom suggestion 1</li>
        <li>Your custom suggestion 2</li>
    </ul>
</div>
```

---

## 🔒 Production Considerations

### Environment Variables

**Development (DEBUG=True):**
- Django shows detailed error pages with tracebacks
- Custom error pages work but may show debug info
- Useful for debugging

**Production (DEBUG=False):**
- Custom error pages fully active
- No sensitive information exposed
- User-friendly error messages

### Security

✅ **Implemented:**
- No stack traces visible to users
- Generic error messages (no system details)
- Consistent branding maintains trust
- Helpful without revealing system internals

⚠️ **Best Practices:**
- Always set `DEBUG=False` in production
- Configure proper logging (errors logged to file)
- Monitor error rates
- Set up error tracking (Sentry, etc.)

---

## 📊 Error Logging

All errors are automatically logged:

**Location:** `backend/logs/django.log`

**Format:**
```
WARNING 2026-02-16 15:31:15 log Not Found: /nonexistent-page/
WARNING 2026-02-16 15:32:20 exception_handlers API Exception: NotFound - Not found. [View: MedicineViewSet]
```

**Configure logging level in `.env`:**
```bash
LOG_LEVEL=WARNING  # or INFO, ERROR, CRITICAL
```

---

## 🌐 Frontend Integration

### Web App (React)

Handle errors in your axios interceptors:

```javascript
// In your API service
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const { error: errorData } = error.response.data;
      
      // Show user-friendly error
      toast.error(errorData.message);
      
      // Show suggestions
      if (errorData.suggestions) {
        errorData.suggestions.forEach(suggestion => {
          console.log('💡', suggestion);
        });
      }
    }
    return Promise.reject(error);
  }
);
```

### Mobile App (React Native)

```javascript
// In your API service
const handleError = (error) => {
  if (error.response?.data?.error) {
    const { message, suggestions } = error.response.data.error;
    
    Alert.alert(
      'Error',
      message,
      suggestions?.map(s => ({ text: s, style: 'default' }))
    );
  }
};
```

---

## 🔍 Common Error Scenarios

| Scenario | Error Type | User Sees |
|----------|------------|-----------|
| Invalid URL | 404 | Custom 404 page with navigation help |
| Deleted resource | 404 | JSON with "Resource not found" |
| Not logged in | 401 | JSON with "Authentication required" |
| No permission | 403 | Custom 403 page or JSON |
| Server crash | 500 | Custom 500 page with reassurance |
| Validation failed | 400 | JSON with field-specific errors |
| Rate limited | 429 | JSON with "Try again later" |

---

## 📚 Helper Functions

Use these in your views for consistent API responses:

```python
from saluslogica.exception_handlers import (
    api_404_response,
    api_403_response,
    api_500_response
)

# In your view
def my_view(request, pk):
    try:
        obj = MyModel.objects.get(pk=pk)
    except MyModel.DoesNotExist:
        return api_404_response("Medicine not found")
    
    if not request.user.has_perm('view_medicine'):
        return api_403_response("You cannot view this medicine")
    
    # ... process request
```

---

## ✨ Benefits

1. **Better UX:** Users get helpful guidance instead of confusing errors
2. **Brand Consistency:** Error pages match your app's design
3. **Reduced Support:** Clear suggestions reduce support requests
4. **Professional:** Shows attention to detail
5. **Security:** Hides technical details from users
6. **API Consistency:** All API errors follow same format
7. **Developer Friendly:** Easy to customize and extend

---

## 🚀 Next Steps

### Recommended Enhancements

1. **Error Tracking:**
   ```bash
   pip install sentry-sdk
   # Configure in settings.py for production error monitoring
   ```

2. **Custom 400 Page:**
   - Add template for bad request errors
   - Similar to existing error pages

3. **Localization:**
   - Translate error pages to Kinyarwanda
   - Use Django i18n framework

4. **Analytics:**
   - Track error occurrences
   - Monitor 404s to find broken links
   - Measure error rates

5. **Contact Form:**
   - Add error reporting form on error pages
   - Let users report issues directly

---

## 📞 Support

If you need to customize error pages further or have questions:

1. Templates are in: `backend/templates/`
2. View handlers in: `backend/saluslogica/views.py`
3. API handlers in: `backend/saluslogica/exception_handlers.py`
4. Configuration in: `backend/saluslogica/settings.py` and `urls.py`

---

## ✅ Verification Checklist

- [x] Custom 404 page created
- [x] Custom 500 page created
- [x] Custom 403 page created
- [x] Error handlers configured in urls.py
- [x] Templates directory added to settings.py
- [x] API exception handler implemented
- [x] REST Framework configured to use custom handler
- [x] Test script created and passed
- [x] All templates responsive and mobile-friendly
- [x] Helpful suggestions provided for each error type
- [x] Action buttons work correctly
- [x] Error logging configured
- [x] Documentation created

**Status:** ✅ All custom error pages fully implemented and tested!
