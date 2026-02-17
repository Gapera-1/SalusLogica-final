# Password Reset System - Complete Guide

## Overview

The password reset system allows users to securely reset their passwords through email verification. When users forget their password, they can request a reset link that expires after 1 hour for security.

## Features

✅ **Secure Token-Based Reset** - UUID tokens impossible to guess  
✅ **Email Delivery** - Reset links sent via Brevo SMTP  
✅ **1-Hour Expiration** - Short-lived tokens for maximum security  
✅ **One-Time Use** - Tokens can only be used once  
✅ **Rate Limiting** - 5-minute cooldown between requests  
✅ **Email Enumeration Protection** - Same response for valid/invalid emails  
✅ **Password Validation** - Minimum 8 characters required  
✅ **Confirmation Email** - Users notified after password change  
✅ **Session Invalidation** - All auth tokens deleted after reset  
✅ **IP Tracking** - Security audit trail  

---

## Setup & Configuration

### Environment Variables

Already configured in `backend/.env`:

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

### Database Models

#### User Model Extensions
```python
class User(AbstractUser):
    password_reset_sent_at = models.DateTimeField(null=True, blank=True)
    
    def can_request_password_reset(self):
        """Check if user can request another password reset (5 minute cooldown)"""
        if not self.password_reset_sent_at:
            return True
        return timezone.now() - self.password_reset_sent_at > timedelta(minutes=5)
```

#### PasswordReset Model
```python
class PasswordReset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # 1 hour from creation
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    def is_valid(self):
        """Check if token is still valid (not expired and not used)"""
        return not self.used_at and timezone.now() < self.expires_at
    
    def mark_as_used(self):
        """Mark token as used"""
        self.used_at = timezone.now()
        self.save()
```

---

## API Endpoints

### 1. Forgot Password (Request Reset)

**POST** `/api/auth/forgot-password/`

**Request:**
```json
{
    "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
    "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Important:** Always returns 200 OK (even if email doesn't exist) to prevent email enumeration attacks.

**Rate Limiting:**
- API throttle: 3 requests per hour per email/IP
- User-level: 5 minutes between requests for same user

**What Happens:**
1. Validates email format
2. Looks up user by email (silently fails if not found)
3. Checks rate limiting (5-minute cooldown)
4. Deletes old unused tokens for user
5. Creates new UUID token (expires in 1 hour)
6. Sends password reset email
7. Records `password_reset_sent_at` timestamp

---

### 2. Validate Reset Token (Optional)

**GET** `/api/auth/validate-reset-token/<token>/`

**Example:**
```
GET /api/auth/validate-reset-token/a1b2c3d4-e5f6-7890-abcd-ef1234567890/
```

**Response (200 OK) - Valid Token:**
```json
{
    "valid": true,
    "email": "user@example.com",
    "expires_at": "2026-02-16T15:30:00Z"
}
```

**Response (400 Bad Request) - Expired:**
```json
{
    "valid": false,
    "error": "This password reset link has expired."
}
```

**Response (400 Bad Request) - Already Used:**
```json
{
    "valid": false,
    "error": "This password reset link has already been used."
}
```

**Response (404 Not Found) - Invalid:**
```json
{
    "valid": false,
    "error": "Invalid password reset link."
}
```

**Use Case:** Frontend can call this before showing reset form to ensure token is valid.

---

### 3. Reset Password

**POST** `/api/auth/reset-password/<token>/`

**Request:**
```json
{
    "new_password": "MyNewSecurePassword123!",
    "confirm_password": "MyNewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
    "message": "Password reset successful! Please log in with your new password.",
    "user": {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "email_verified": true
    }
}
```

**Error Response (400 Bad Request) - Passwords Don't Match:**
```json
{
    "error": "Passwords do not match."
}
```

**Error Response (400 Bad Request) - Password Too Short:**
```json
{
    "error": "Password must be at least 8 characters long."
}
```

**Error Response (400 Bad Request) - Token Expired:**
```json
{
    "error": "This password reset link has expired. Please request a new one."
}
```

**Error Response (400 Bad Request) - Token Already Used:**
```json
{
    "error": "This password reset link has already been used. Please request a new one if needed."
}
```

**Error Response (404 Not Found) - Invalid Token:**
```json
{
    "error": "Invalid or expired password reset link."
}
```

**What Happens:**
1. Validates token exists and is valid
2. Validates passwords match
3. Validates password length (min 8 characters)
4. Updates user password (hashed)
5. Marks token as used
6. Deletes all user auth tokens (forces re-login)
7. Sends confirmation email
8. Returns success message

---

## Email Templates

### 1. Password Reset Request Email

**Template:** `templates/emails/reset_password.html` (HTML) + `reset_password.txt` (plain text)

**Content:**
- 🔐 Lock icon header
- Personalized greeting
- Clear explanation of request
- Large "Reset My Password" button
- Alternative copy-paste link
- **1-hour expiration warning**
- Security notice for unwanted requests
- Request details (time, IP address)
- Security tips

**Variables:**
- `{{ user.first_name }}` or `{{ user.username }}`
- `{{ reset_url }}` - Full password reset link
- `{{ current_time }}` - When request was made
- `{{ current_year }}` - For copyright
- `{{ ip_address }}` - Requester's IP

### 2. Password Changed Confirmation Email

**Template:** `templates/emails/password_changed.html` + `password_changed.txt`

**Content:**
- ✅ Success checkmark header
- Confirmation of password change
- Warning if user didn't make change
- Change details (time, IP)
- Support contact info

**Purpose:** Security notification to alert user if unauthorized change occurred.

---

## Security Features

### 🔐 Token Security

| Feature | Implementation | Purpose |
|---------|----------------|---------|
| **UUID Tokens** | `uuid.uuid4()` | Cryptographically secure, 128-bit random |
| **Short Expiration** | 1 hour | Minimize attack window |
| **One-Time Use** | `used_at` timestamp | Prevent replay attacks |
| **Automatic Cleanup** | Delete old tokens on new request | Prevent token accumulation |

### 🚦 Rate Limiting

| Level | Limit | Purpose |
|-------|-------|---------|
| **API Throttle** | 3 requests/hour per email or IP | Prevent abuse |
| **User Cooldown** | 5 minutes between requests | Prevent spam |

### 🛡️ Additional Security

- **Email Enumeration Protection** - Always return 200 OK
- **IP Address Logging** - Audit trail for security monitoring
- **Session Invalidation** - Delete all auth tokens after reset
- **Password Validation** - Minimum length enforcement
- **Confirmation Email** - Alert user of password changes

---

## User Flow

### Complete Password Reset Flow

```
User forgets password
         ↓
Opens login page
         ↓
Clicks "Forgot Password?"
         ↓
Enters email address
         ↓
Submits forgot password form
         ↓
[BACKEND] Validates email
         ↓
[BACKEND] Creates reset token (expires 1 hour)
         ↓
[BACKEND] Sends reset email
         ↓
User receives email
         ↓
User clicks "Reset My Password" button
         ↓
User redirected to reset form
         ↓
[FRONTEND] Validates token (optional)
         ↓
User enters new password (2x)
         ↓
[BACKEND] Validates token & password
         ↓
[BACKEND] Updates password
         ↓
[BACKEND] Marks token as used
         ↓
[BACKEND] Deletes all auth tokens
         ↓
[BACKEND] Sends confirmation email
         ↓
User redirected to login
         ↓
User logs in with new password
         ✅
```

---

## Testing

### Run Test Suite

```bash
cd backend
python test_password_reset.py
```

**Prerequisites:** Django server running on `http://localhost:8000`

### Test Coverage

The test suite includes 10 comprehensive tests:

1. **Request Password Reset** - Complete flow from request to email
2. **Validate Reset Token** - Check token validity before reset
3. **Reset Password** - Change password with valid token
4. **Validation Errors** - Test password matching, length validation
5. **Expired Token** - Verify expired tokens are rejected
6. **Used Token** - Prevent token reuse
7. **Invalid Token** - Handle completely fake tokens
8. **Non-existent Email** - Email enumeration protection
9. **Rate Limiting** - Ensure cooldown works
10. **Database Models** - Direct model testing

### Manual Testing

#### 1. Request Password Reset
```bash
curl -X POST http://localhost:8000/api/auth/forgot-password/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

#### 2. Check Email
- **Console backend:** Check Django server output
- **SMTP backend:** Check email inbox

#### 3. Validate Token (Optional)
```bash
curl http://localhost:8000/api/auth/validate-reset-token/<TOKEN>/
```

#### 4. Reset Password
```bash
curl -X POST http://localhost:8000/api/auth/reset-password/<TOKEN>/ \
  -H "Content-Type: application/json" \
  -d '{
    "new_password": "NewPassword123!",
    "confirm_password": "NewPassword123!"
  }'
```

#### 5. Login with New Password
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "username",
    "password": "NewPassword123!"
  }'
```

---

## Frontend Integration

### React (Web)

```javascript
// 1. Forgot Password Form
const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const response = await fetch('/api/auth/forgot-password/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    setMessage(data.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Reset Password</button>
      {message && <p>{message}</p>}
    </form>
  );
};

// 2. Reset Password Form (with token from URL)
const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Validate token on mount
    fetch(`/api/auth/validate-reset-token/${token}/`)
      .then(res => res.json())
      .then(data => setTokenValid(data.valid));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const response = await fetch(`/api/auth/reset-password/${token}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_password: password,
        confirm_password: confirmPassword
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(data.message);
      navigate('/login');
    } else {
      alert(data.error);
    }
  };

  if (!tokenValid) {
    return <div>Invalid or expired reset link.</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        minLength={8}
        required
      />
      <input 
        type="password" 
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        minLength={8}
        required
      />
      <button type="submit">Reset Password</button>
    </form>
  );
};
```

### React Native (Mobile)

```javascript
import { Alert } from 'react-native';

// Forgot Password
const forgotPassword = async (email) => {
  try {
    const response = await fetch('API_URL/api/auth/forgot-password/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    Alert.alert('Success', data.message);
  } catch (error) {
    Alert.alert('Error', 'Failed to send reset email');
  }
};

// Reset Password
const resetPassword = async (token, newPassword, confirmPassword) => {
  try {
    const response = await fetch(`API_URL/api/auth/reset-password/${token}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      Alert.alert('Success', data.message, [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } else {
      Alert.alert('Error', data.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to reset password');
  }
};
```

---

## Troubleshooting

### Email Not Received

**Possible Causes:**
- Email in spam folder
- Incorrect email address
- Brevo quota exceeded
- SMTP connection failed

**Solutions:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check Brevo dashboard for quota
4. Test with console backend: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`
5. Check Django logs for email errors

### Token Expired

**Cause:** Token older than 1 hour

**Solution:** Request new password reset (tokens expire quickly for security)

### Rate Limit Error

**Cause:** Too many requests in short time

**Solutions:**
- Wait 5 minutes before retrying
- Check if user is spamming reset requests
- For development, reduce cooldown in model

### Password Validation Failed

**Common Issues:**
- Passwords don't match
- Password too short (< 8 characters)
- Missing new_password or confirm_password fields

**Solution:** Ensure frontend validates before submission

### Token Already Used

**Cause:** Trying to use same token twice

**Solution:** Request new password reset

---

## Production Checklist

Before deploying to production:

- [ ] Set strong email credentials in production `.env`
- [ ] Configure production domain in reset URLs
- [ ] Set up SPF/DKIM DNS records
- [ ] Monitor Brevo quota and delivery rates
- [ ] Set up email delivery failure alerts
- [ ] Configure rate limiting based on traffic patterns
- [ ] Add logging for failed reset attempts
- [ ] Set up monitoring for suspicious activity
- [ ] Test email delivery to major providers
- [ ] Create admin dashboard for reset token management
- [ ] Set up automatic cleanup of expired tokens (Celery task)
- [ ] Add analytics for password reset success rates
- [ ] Consider adding CAPTCHA for forgot password form
- [ ] Document incident response for compromised accounts

---

## Best Practices

### Security

1. **Use HTTPS in production** - Protect tokens in transit
2. **Monitor reset patterns** - Detect abuse attempts
3. **Log security events** - Audit trail for investigations
4. **Educate users** - Warn about phishing attempts
5. **Implement CAPTCHA** - Prevent automated abuse

### User Experience

1. **Clear instructions** - Guide users through process
2. **Helpful error messages** - Explain what went wrong
3. **Progress indicators** - Show where they are in flow
4. **Mobile-friendly emails** - Responsive design
5. **Quick support** - Easy way to get help

### Operational

1. **Monitor email delivery** - Track success rates
2. **Set up alerts** - Notify on failures
3. **Regular cleanup** - Remove old tokens
4. **Backup email provider** - Fallback option
5. **Test regularly** - Ensure system works

---

## Advanced Features (Future Enhancements)

### Potential Improvements

1. **Two-Factor Authentication**
   - SMS verification before reset
   - Authenticator app confirmation

2. **Security Questions**
   - Additional verification step
   - Alternative to email-only reset

3. **Account Recovery**
   - Multiple recovery methods
   - Backup email addresses

4. **Breach Detection**
   - Check if new password is compromised
   - Integration with Have I Been Pwned API

5. **Password Strength Meter**
   - Real-time feedback on password strength
   - Suggested improvements

6. **Password History**
   - Prevent reusing recent passwords
   - Track password changes

---

## API Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/forgot-password/` | POST | No | Request password reset email |
| `/api/auth/validate-reset-token/<token>/` | GET | No | Check if token is valid |
| `/api/auth/reset-password/<token>/` | POST | No | Reset password with token |

---

## Support

For issues or questions:

1. Check Django logs: `backend/logs/django.log`
2. Run test suite: `python test_password_reset.py`
3. Check email delivery in Brevo dashboard
4. Review error messages in API responses
5. Contact support: support@saluslogica.com

---

**Last Updated:** February 2026  
**Version:** 1.0  
**Author:** SalusLogica Development Team
