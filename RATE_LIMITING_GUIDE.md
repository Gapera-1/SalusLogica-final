# API Rate Limiting - Implementation Guide

## 📋 Overview

API rate limiting has been implemented to prevent abuse, ensure fair usage, and protect the SalusLogica backend from being overwhelmed by excessive requests. This security feature automatically throttles requests based on user type, endpoint sensitivity, and time windows.

---

## ✅ What Was Implemented

### **Tiered Rate Limiting System**

Different rate limits for different user types and actions:

| User Type | Burst Rate | Sustained Rate | Description |
|-----------|------------|----------------|-------------|
| **Anonymous** | 20/min | 100/hour | Unauthenticated users |
| **Authenticated** | 60/min | 1000/hour | Logged-in users |
| **Pharmacy Admin** | - | 2000/hour | Higher limits for admins |

### **Endpoint-Specific Throttling**

Critical endpoints have stricter limits:

| Endpoint Type | Rate Limit | Reason |
|---------------|------------|--------|
| **Login** | 5/min | Prevent brute force attacks |
| **Registration** | 3/hour | Prevent spam accounts |
| **Password Reset** | 3/hour | Prevent abuse |
| **Medicine Creation** | 30/hour | Prevent spam entries |
| **File Upload** | 20/hour | Prevent resource abuse |
| **Notifications** | 100/hour | Prevent notification spam |

---

## 🏗️ Implementation Details

### **Files Created/Modified**

```
backend/
├── saluslogica/
│   ├── throttles.py           ✨ New - Custom throttle classes
│   └── settings.py            ✏️ Modified - Added rate limiting config
├── apps/
│   ├── authentication/
│   │   └── views.py           ✏️ Modified - Added login/registration throttles
│   └── medicines/
│       └── views.py           ✏️ Modified - Added medicine creation throttle
├── .env                       ✏️ Modified - Added rate limit variables
├── .env.example               ✏️ Modified - Added rate limit variables
└── test_rate_limiting.py      ✨ New - Test script
```

### **Custom Throttle Classes**

**File:** `saluslogica/throttles.py`

1. **AnonBurstRateThrottle** - Short-term limit for anonymous users (20/min)
2. **AnonSustainedRateThrottle** - Long-term limit for anonymous users (100/hour)
3. **UserBurstRateThrottle** - Short-term limit for authenticated users (60/min)
4. **UserSustainedRateThrottle** - Long-term limit for authenticated users (1000/hour)
5. **PharmacyAdminRateThrottle** - Higher limits for pharmacy admins (2000/hour)
6. **LoginRateThrottle** - Strict login attempt limiting (5/min)
7. **PasswordResetRateThrottle** - Password reset limiting (3/hour)
8. **RegistrationRateThrottle** - New user registration limiting (3/hour)
9. **MedicineCreationRateThrottle** - Medicine entry limiting (30/hour)
10. **NotificationRateThrottle** - Notification sending limiting (100/hour)
11. **UploadRateThrottle** - File upload limiting (20/hour)

---

## ⚙️ Configuration

### **Environment Variables (.env)**

All rate limits are configurable via environment variables:

```bash
# API Rate Limiting (format: number/period)
# Period can be: second, minute, hour, day

# Anonymous users (not logged in)
ANON_BURST_RATE=20/min         # Short burst of requests
ANON_SUSTAINED_RATE=100/hour   # Sustained over an hour

# Authenticated users (logged in)
USER_BURST_RATE=60/min         # Higher burst allowance
USER_SUSTAINED_RATE=1000/hour  # Higher sustained allowance

# Pharmacy administrators
PHARMACY_ADMIN_RATE=2000/hour  # Even higher for admins

# Security-sensitive endpoints
LOGIN_RATE=5/min               # Login attempts (brute force protection)
PASSWORD_RESET_RATE=3/hour     # Password reset requests
REGISTRATION_RATE=3/hour       # New user registrations per IP

# Resource-intensive operations
MEDICINE_CREATION_RATE=30/hour # New medicine entries
NOTIFICATION_RATE=100/hour     # Notification sending
UPLOAD_RATE=20/hour            # File uploads
```

### **Settings Configuration**

**File:** `saluslogica/settings.py`

```python
REST_FRAMEWORK = {
    # ... other settings ...
    'DEFAULT_THROTTLE_CLASSES': [
        'saluslogica.throttles.AnonBurstRateThrottle',
        'saluslogica.throttles.AnonSustainedRateThrottle',
        'saluslogica.throttles.UserBurstRateThrottle',
        'saluslogica.throttles.UserSustainedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon_burst': config('ANON_BURST_RATE', default='20/min'),
        'anon_sustained': config('ANON_SUSTAINED_RATE', default='100/hour'),
        # ... all other rates ...
    },
}
```

---

## 🎯 How It Works

### **Multi-Layer Protection**

Rate limiting uses multiple layers to provide comprehensive protection:

1. **Burst Protection:** Prevents rapid-fire requests (per minute)
2. **Sustained Protection:** Prevents high-volume abuse (per hour)
3. **Endpoint-Specific:** Critical endpoints have stricter limits
4. **User-Tiered:** Authenticated users get higher limits than anonymous

### **Identification Methods**

Throttling identifies users by:

- **Authenticated Users:** User account (allows tracking across IPs)
- **Anonymous Users:** IP address
- **Special Cases:** 
  - Login throttling by IP (even if authenticated)
  - Password reset by email + IP
  - Registration by IP

### **Response When Throttled**

When a user exceeds the rate limit, they receive:

**HTTP Status:** `429 Too Many Requests`

**Response Body:**
```json
{
  "success": false,
  "error": {
    "message": "Request was throttled. Expected available in 60 seconds.",
    "type": "Throttled",
    "status_code": 429,
    "suggestions": [
      "Wait a moment before trying again",
      "You may have exceeded the rate limit"
    ]
  }
}
```

**Headers:**
```
Retry-After: 60
```

---

## 🧪 Testing

### **Run Test Script**

```bash
cd backend
python test_rate_limiting.py
```

**Expected Output:**
```
✅ Rate limits configured
✅ Cache backend working
✅ All throttle classes loaded
✅ Login throttled after 6 attempts
✅ Rate limiting is configured and active
```

### **Manual Testing**

**1. Test Anonymous Rate Limiting:**
```bash
# Make rapid requests
for i in {1..25}; do
  curl http://localhost:8000/health/
done

# Expected: First 20 succeed, rest get 429
```

**2. Test Login Rate Limiting:**
```bash
# Try multiple failed logins
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Expected: After 5 attempts, get 429 error
```

**3. Test Authenticated User Limits:**
```bash
# Login and get token
TOKEN="your-auth-token"

# Make rapid authenticated requests
for i in {1..70}; do
  curl http://localhost:8000/api/medicines/ \
    -H "Authorization: Token $TOKEN"
done

# Expected: First 60 succeed, rest get 429
```

---

## 📊 Monitoring

### **View Rate Limit Violations**

Rate limit violations are logged automatically:

**Log Location:** `backend/logs/django.log`

**Example Entries:**
```
WARNING API Exception: Throttled - Request was throttled. Expected available in 60 seconds. [View: LoginView]
WARNING Too Many Requests: /api/auth/login/
```

### **Check Current Rate Limit Status**

Add this to any view:

```python
from saluslogica.throttles import get_rate_limit_info

def my_view(request):
    rate_info = get_rate_limit_info(request)
    print(f"User rate limit: {rate_info}")
```

---

## 🔧 Customization

### **Adjust Rate Limits**

Edit `.env` file:

```bash
# More strict
USER_BURST_RATE=30/min
LOGIN_RATE=3/min

# More lenient
USER_BURST_RATE=120/min
LOGIN_RATE=10/min

# Per day instead of per hour
USER_SUSTAINED_RATE=5000/day
```

### **Add Custom Throttle to Specific View**

```python
from saluslogica.throttles import CustomThrottle

class MyView(APIView):
    throttle_classes = [CustomThrottle]
    
    def get(self, request):
        # Your view logic
        pass
```

### **Disable Throttling for Specific View**

```python
class MyView(APIView):
    throttle_classes = []  # No throttling
    
    def get(self, request):
        # Your view logic
        pass
```

### **Create Custom Throttle Rate**

**1. Add to throttles.py:**
```python
class CustomOperationThrottle(UserRateThrottle):
    scope = 'custom_operation'
```

**2. Add to settings.py:**
```python
'DEFAULT_THROTTLE_RATES': {
    # ... existing rates ...
    'custom_operation': config('CUSTOM_OPERATION_RATE', default='50/hour'),
}
```

**3. Add to .env:**
```bash
CUSTOM_OPERATION_RATE=50/hour
```

---

## 🚀 Production Recommendations

### **Cache Backend**

Rate limiting requires a cache backend. For production:

**Recommended:** Redis (fast, scales well)

**settings.py:**
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

**Install:**
```bash
pip install django-redis
```

### **Recommended Production Rates**

Based on typical usage patterns:

```bash
# Conservative (high security)
ANON_BURST_RATE=10/min
USER_BURST_RATE=30/min
LOGIN_RATE=3/min

# Moderate (balanced)
ANON_BURST_RATE=20/min
USER_BURST_RATE=60/min
LOGIN_RATE=5/min

# Permissive (high traffic)
ANON_BURST_RATE=50/min
USER_BURST_RATE=120/min
LOGIN_RATE=10/min
```

### **Monitor and Adjust**

1. **Start conservative** - Begin with stricter limits
2. **Monitor logs** - Track throttling frequency
3. **Analyze patterns** - Identify legitimate high-usage users
4. **Adjust gradually** - Increase limits if needed
5. **Alert on spikes** - Set up monitoring for abuse

---

## 🔒 Security Benefits

### **Prevents**

✅ **Brute Force Attacks**
- Login throttling makes password guessing impractical
- 5 attempts/min = 300 attempts/hour max

✅ **DDoS Attacks**
- Request flooding automatically blocked
- Anonymous users limited to 100 req/hour

✅ **Resource Exhaustion**
- File upload limits prevent storage abuse
- Medicine creation limits prevent database bloat

✅ **Spam Accounts**
- Registration throttling prevents bot signups
- 3 registrations/hour per IP

✅ **API Abuse**
- Fair usage enforced across all users
- Prevents single user monopolizing resources

### **Legitimate Use Cases Protected**

- Medical emergencies can still access system
- Pharmacy admins get higher limits
- Authenticated users have better access
- Burst limits allow normal usage patterns

---

## 📱 Frontend Integration

### **Handle 429 Responses**

**React/JavaScript:**
```javascript
// In your API service
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = error.response.data?.error?.message || 
                     'Too many requests. Please try again later.';
      
      toast.error(message);
      console.log(`Retry after ${retryAfter} seconds`);
      
      // Optionally implement automatic retry
      // setTimeout(() => retry(error.config), retryAfter * 1000);
    }
    return Promise.reject(error);
  }
);
```

**Display to User:**
```javascript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'];
  
  showNotification({
    type: 'warning',
    title: 'Rate Limit Exceeded',
    message: `Please wait ${retryAfter} seconds before trying again.`,
    duration: retryAfter * 1000
  });
}
```

---

## 🛠️ Troubleshooting

### **Rate Limiting Not Working**

**Check:**
1. ✅ Cache backend configured and working
2. ✅ Throttle classes in `DEFAULT_THROTTLE_CLASSES`
3. ✅ Rates defined in `DEFAULT_THROTTLE_RATES`
4. ✅ Redis/cache service running

**Test cache:**
```python
from django.core.cache import cache
cache.set('test', 'value', 10)
print(cache.get('test'))  # Should print 'value'
```

### **Too Strict/Too Lenient**

**Adjust in `.env`:**
```bash
# If too strict (legitimate users blocked)
USER_BURST_RATE=120/min

# If too lenient (seeing abuse)
USER_BURST_RATE=30/min
```

### **Specific Users Need Higher Limits**

**Option 1:** Make them pharmacy admin (automatic 2x limit)

**Option 2:** Create custom throttle:
```python
class VIPUserThrottle(UserRateThrottle):
    def allow_request(self, request, view):
        if request.user.is_vip:
            return True  # No throttling
        return super().allow_request(request, view)
```

---

## 📈 Analytics

### **Track Rate Limit Usage**

Add middleware to track throttle events:

```python
# middleware.py
class ThrottleStatsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        if response.status_code == 429:
            # Log throttle event
            logger.info(f"Throttled: {request.user} - {request.path}")
            
            # Optionally send to analytics
            # analytics.track('rate_limit_exceeded', {
            #     'user': request.user.id,
            #     'path': request.path,
            # })
        
        return response
```

---

## ✅ Summary

### **What You Get**

✅ **Security:** Protection against brute force and DDoS
✅ **Fairness:** Equal access for all users
✅ **Scalability:** Server resources protected
✅ **Flexibility:** Configurable per environment
✅ **Monitoring:** Automatic logging of violations
✅ **User-Friendly:** Clear error messages

### **Configuration Files**

| File | Purpose |
|------|---------|
| `throttles.py` | Custom throttle class definitions |
| `settings.py` | Rate limit configuration |
| `.env` | Environment-specific rate values |
| `views.py` | Per-endpoint throttle application |

### **Verification**

Run: `python test_rate_limiting.py`

Expected: All checks pass ✅

---

## 🎓 Best Practices

1. **Start Conservative:** Begin with stricter limits, relax if needed
2. **Monitor Logs:** Regularly check for throttling patterns
3. **Use Redis:** In production for better performance
4. **Differentiate Users:** Authenticated users should have higher limits
5. **Protect Critical Endpoints:** Login, registration, password reset
6. **Document Limits:** Make rate limits clear in API documentation
7. **Provide Retry-After:** Always include retry information
8. **Test Regularly:** Verify limits work as expected
9. **Alert on Abuse:** Set up monitoring for unusual patterns
10. **Be Responsive:** Adjust limits based on real-world usage

---

**Status:** ✅ API rate limiting fully implemented and tested!
