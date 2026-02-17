# Email Verification System - Documentation

## Overview

The email verification system ensures users provide valid email addresses during registration. Users receive a verification email with a unique token link that expires after 24 hours.

## Features

✅ **Automatic Email Sending** - Verification email sent automatically on registration  
✅ **Secure UUID Tokens** - Unique, impossible-to-guess verification links  
✅ **24-Hour Expiration** - Tokens automatically expire for security  
✅ **Resend Capability** - Users can request new verification emails  
✅ **Rate Limiting** - 1-minute cooldown between resend requests  
✅ **Beautiful HTML Emails** - Professional branded email templates  
✅ **Brevo SMTP** - Reliable email delivery service  

---

## Setup & Configuration

### 1. Environment Variables

Configure email settings in `backend/.env`:

```env
# Email configuration (Brevo SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=a146c6001@smtp-brevo.com
EMAIL_HOST_PASSWORD=mSFYvahUGf0dg3JM
DEFAULT_FROM_EMAIL=SalusLogica <fmanishimwe38@gmail.com>
```

For development/testing without sending real emails:
```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### 2. Database Models

#### User Model Extensions
```python
class User(AbstractUser):
    email_verified = models.BooleanField(default=False)
    email_verification_sent_at = models.DateTimeField(null=True, blank=True)
    
    def can_resend_verification_email(self):
        """Check if user can request another verification email"""
        if not self.email_verification_sent_at:
            return True
        return timezone.now() - self.email_verification_sent_at > timedelta(minutes=1)
```

#### EmailVerification Model
```python
class EmailVerification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    
    def is_valid(self):
        """Check if token is still valid"""
        return (
            self.verified_at is None and 
            timezone.now() < self.expires_at
        )
    
    def mark_as_verified(self):
        """Mark token as used and verify user email"""
        self.verified_at = timezone.now()
        self.save()
        self.user.email_verified = True
        self.user.save(update_fields=['email_verified'])
```

---

## API Endpoints

### 1. Registration (Auto-sends verification email)

**POST** `/api/auth/register/`

**Request:**
```json
{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "password2": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "patient"
}
```

**Response (201 Created):**
```json
{
    "user": {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "email_verified": false,
        "first_name": "John",
        "last_name": "Doe"
    },
    "token": "abc123def456...",
    "message": "Registration successful! Please check your email to verify your account."
}
```

**What Happens:**
1. User account created with `email_verified=false`
2. UUID verification token generated (expires in 24 hours)
3. Verification email sent to user's email address
4. User receives auth token to access the app
5. `email_verification_sent_at` timestamp recorded

---

### 2. Verify Email

**GET** `/api/auth/verify-email/<token>/`

**Example:**
```
GET /api/auth/verify-email/a1b2c3d4-e5f6-7890-abcd-ef1234567890/
```

**Response (200 OK):**
```json
{
    "message": "Email verified successfully! You can now log in and access all features.",
    "user": {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "email_verified": true
    }
}
```

**Error Response (400 Bad Request) - Expired:**
```json
{
    "error": "This verification link has expired. Please request a new one."
}
```

**Error Response (404 Not Found) - Invalid:**
```json
{
    "error": "Invalid verification link."
}
```

**Error Response (200 OK) - Already Verified:**
```json
{
    "message": "Email already verified. You can log in now."
}
```

---

### 3. Resend Verification Email

**POST** `/api/auth/resend-verification/`

**Headers:**
```
Authorization: Token abc123def456...
```

**Response (200 OK):**
```json
{
    "message": "Verification email sent successfully. Please check your inbox."
}
```

**Error Response (429 Too Many Requests) - Rate Limited:**
```json
{
    "error": "Please wait at least 1 minute before requesting another verification email."
}
```

**Error Response (200 OK) - Already Verified:**
```json
{
    "message": "Your email is already verified."
}
```

**Error Response (500 Internal Server Error) - Email Failed:**
```json
{
    "error": "Failed to send verification email: SMTP connection failed"
}
```

---

## Email Templates

### HTML Template (`templates/emails/verify_email.html`)

Professional-looking email with:
- **SalusLogica branding** with gradient header
- **Large verification button** for easy clicking
- **Alternative copy-paste link** for accessibility
- **Security notice** about 24-hour expiration
- **Feature list** showing what users get after verification
- **Responsive design** for mobile and desktop
- **Footer** with support contact and copyright

### Text Template (`templates/emails/verify_email.txt`)

Plain text version for email clients that don't support HTML.

---

## Testing

### Run Test Suite

```bash
cd backend
python test_email_verification.py
```

**Note:** Make sure Django server is running on `http://localhost:8000`

### Test Coverage

The test suite includes:

1. **Registration with Verification** - Complete registration flow
2. **Resend Verification** - Request new verification email
3. **Expired Token** - Verify expired tokens are rejected
4. **Invalid Token** - Verify invalid tokens are rejected
5. **Already Verified** - Handle already-verified users
6. **Database Models** - Test model methods directly

### Manual Testing

1. **Register a new user:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/register/ \
   -H "Content-Type: application/json" \
   -d '{
     "username": "testuser",
     "email": "test@example.com",
     "password": "TestPass123!",
     "password2": "TestPass123!",
     "first_name": "Test",
     "last_name": "User",
     "user_type": "patient"
   }'
   ```

2. **Check your email** (or Django console if using console backend)

3. **Click verification link** or visit:
   ```
   http://localhost:8000/api/auth/verify-email/<token>/
   ```

4. **Resend verification** (if needed):
   ```bash
   curl -X POST http://localhost:8000/api/auth/resend-verification/ \
   -H "Authorization: Token YOUR_AUTH_TOKEN"
   ```

---

## Security Features

### 🔒 UUID Tokens
- Uses UUID4 for cryptographically secure random tokens
- Impossible to guess or brute-force
- 128-bit unique identifiers

### ⏰ Time Expiration
- Tokens automatically expire after 24 hours
- Database validation ensures expired tokens are rejected
- Prevents old tokens from being used

### 🚦 Rate Limiting
- 1-minute cooldown between resend requests
- Prevents email spam and abuse
- Tracked per user in database

### 🔐 Authentication Required for Resend
- Only authenticated users can resend verification
- Prevents sending emails to arbitrary addresses

### 🗑️ Automatic Cleanup
- Old unverified tokens deleted when new ones are created
- Prevents database clutter
- One active token per user

---

## Integration with Frontend

### React (Web)

```javascript
// Registration
const register = async (userData) => {
  const response = await fetch('http://localhost:8000/api/auth/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Show success message
    alert(data.message); // "Please check your email..."
    
    // Store token (user can use app, but encourage verification)
    localStorage.setItem('token', data.token);
  }
};

// Resend verification
const resendVerification = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:8000/api/auth/resend-verification/', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`
    }
  });
  
  const data = await response.json();
  alert(data.message);
};
```

### React Native (Mobile)

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const register = async (userData) => {
  try {
    const response = await fetch('http://localhost:8000/api/auth/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store token
      await AsyncStorage.setItem('token', data.token);
      
      // Navigate to verification reminder screen
      Alert.alert(
        'Registration Successful',
        data.message,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
  }
};
```

---

## User Experience Flow

### 1. Registration
```
User fills registration form
↓
Submits form
↓
Backend creates user (email_verified=false)
↓
Backend sends verification email
↓
User receives "Check your email" message
↓
User can access app with limited/full features
```

### 2. Verification
```
User opens email inbox
↓
Finds "Verify Your Email" email from SalusLogica
↓
Clicks "Verify Email Address" button
↓
Redirected to verification endpoint
↓
Backend validates token
↓
User email_verified set to true
↓
Success message displayed
```

### 3. Resend (if needed)
```
User didn't receive email / email expired
↓
Clicks "Resend Verification" in app
↓
Backend checks rate limit (1 minute)
↓
Creates new token, deletes old ones
↓
Sends new verification email
↓
User receives fresh email with new link
```

---

## Troubleshooting

### Email Not Sending

**Check SMTP Configuration:**
```bash
# Test email configuration
python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail(
...     'Test',
...     'Test message',
...     'from@example.com',
...     ['to@example.com']
... )
```

**Common Issues:**
- Incorrect `EMAIL_HOST_USER` or `EMAIL_HOST_PASSWORD`
- Firewall blocking port 587
- Brevo account suspended or quota exceeded
- `DEFAULT_FROM_EMAIL` not matching verified sender in Brevo

**Solution:**
1. Verify credentials in `.env` file
2. Check Brevo dashboard for quota and status
3. Test with console backend first: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`

### Email Going to Spam

**Solutions:**
- Add SPF and DKIM records in your domain DNS (if using custom domain)
- Use Brevo's verified sender email
- Avoid spam trigger words in subject/content
- Warm up new email accounts by sending gradually increasing volumes

### Token Expired Message

**This is expected behavior** for tokens older than 24 hours.

**User Actions:**
1. Click "Resend Verification" button in app
2. Check email inbox for new verification link
3. Click new link within 24 hours

**Prevention:**
- Add reminder notification at 12 hours, 20 hours
- Send welcome email with prominent verification CTA

### Rate Limit Error

**Cause:** User trying to resend within 1 minute of last request

**Solution:** Wait 1 minute before trying again

**For Development:** Reduce cooldown in model:
```python
return timezone.now() - self.email_verification_sent_at > timedelta(seconds=10)
```

---

## Production Checklist

Before deploying to production:

- [ ] Set strong `EMAIL_HOST_PASSWORD` in production `.env`
- [ ] Configure production domain in `DEFAULT_FROM_EMAIL`
- [ ] Update verification URL to use production domain
- [ ] Set up SPF/DKIM DNS records for custom domain
- [ ] Test email delivery to major providers (Gmail, Outlook, Yahoo)
- [ ] Monitor Brevo quota and delivery rates
- [ ] Set up email delivery failure alerts
- [ ] Consider adding email queue with Celery for async sending
- [ ] Add analytics tracking for verification completion rates
- [ ] Create admin dashboard to view verification stats
- [ ] Set up automatic cleanup of expired tokens (Celery task)

---

## Future Enhancements

### Potential Improvements

1. **Email Queue with Celery**
   - Send emails asynchronously to improve response time
   - Retry failed deliveries automatically
   
2. **Verification Reminders**
   - Send reminder emails at 12 hours if not verified
   - Final reminder at 23 hours before expiration
   
3. **Admin Dashboard**
   - View verification statistics
   - See unverified users
   - Manually verify users if needed
   
4. **Email Preferences**
   - Let users choose email frequency
   - Opt-out of non-critical emails
   
5. **Multi-Factor Authentication**
   - SMS verification as alternative
   - Authenticator app support
   
6. **Email Change Verification**
   - Verify new email when user changes it
   - Send notification to old email

---

## Support

For issues or questions about email verification:

1. Check Django logs: `backend/logs/django.log`
2. Check email backend output (console or SMTP logs)
3. Run test suite: `python test_email_verification.py`
4. Check Brevo dashboard for delivery status
5. Contact support: support@saluslogica.com

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Author:** SalusLogica Development Team
