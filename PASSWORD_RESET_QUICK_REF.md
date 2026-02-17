# Password Reset - Quick Reference

## 🚀 Quick Start

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/forgot-password/` | No | Request reset email |
| GET | `/api/auth/validate-reset-token/<token>/` | No | Validate token |
| POST | `/api/auth/reset-password/<token>/` | No | Reset password |

---

## 💡 Common Use Cases

### 1. Request Password Reset
```bash
curl -X POST http://localhost:8000/api/auth/forgot-password/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### 2. Validate Token (Optional - for frontend)
```bash
curl http://localhost:8000/api/auth/validate-reset-token/TOKEN_HERE/
```

**Response:**
```json
{
  "valid": true,
  "email": "user@example.com",
  "expires_at": "2026-02-16T15:30:00Z"
}
```

### 3. Reset Password
```bash
curl -X POST http://localhost:8000/api/auth/reset-password/TOKEN_HERE/ \
  -H "Content-Type: application/json" \
  -d '{
    "new_password": "NewSecurePassword123!",
    "confirm_password": "NewSecurePassword123!"
  }'
```

**Response:**
```json
{
  "message": "Password reset successful! Please log in with your new password.",
  "user": { ... }
}
```

---

## 🔧 Testing Checklist

- [ ] Start Django server: `python manage.py runserver`
- [ ] Run test suite: `python test_password_reset.py`
- [ ] Request password reset via API
- [ ] Check email inbox (or Django console)
- [ ] Validate token (optional)
- [ ] Reset password with token
- [ ] Verify old tokens are invalidated
- [ ] Login with new password
- [ ] Check confirmation email received
- [ ] Test expired token (modify `expires_at`)
- [ ] Test used token (try reset twice)
- [ ] Test rate limiting (multiple requests)

---

## 🔐 Security Features

✅ **UUID tokens** - Cryptographically secure  
✅ **1-hour expiration** - Short-lived for security  
✅ **One-time use** - Cannot reuse tokens  
✅ **Rate limiting** - 5-minute cooldown  
✅ **Email enumeration protection** - Same response for all emails  
✅ **IP tracking** - Security audit trail  
✅ **Session invalidation** - All auth tokens deleted  
✅ **Confirmation email** - User notified of change  

---

## 📊 Database Models

### User Model Fields
```python
password_reset_sent_at = DateTimeField(null=True)  # When last reset requested

def can_request_password_reset(self):
    # 5-minute cooldown
    return not self.password_reset_sent_at or \
           timezone.now() - self.password_reset_sent_at > timedelta(minutes=5)
```

### PasswordReset Model
```python
user = ForeignKey(User)
token = UUIDField(unique=True)        # Auto-generated
expires_at = DateTimeField()          # 1 hour from creation
used_at = DateTimeField(null=True)    # When token was used
ip_address = GenericIPAddressField()  # Requester's IP
```

---

## 📧 Email Templates

Located in: `backend/templates/emails/`

### Reset Request Email
- **File:** `reset_password.html` + `reset_password.txt`
- **Subject:** "Reset Your Password - SalusLogica"
- **Variables:** `user`, `reset_url`, `current_time`, `ip_address`, `current_year`

### Password Changed Email
- **File:** `password_changed.html` + `password_changed.txt`
- **Subject:** "Your Password Has Been Changed - SalusLogica"
- **Variables:** `user`, `current_time`, `ip_address`, `current_year`

---

## 🛠️ Troubleshooting

### Email not received?
1. Check spam folder
2. Verify email address is correct
3. Check Brevo quota in dashboard
4. Test with console backend:
   ```env
   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
   ```

### Token expired?
- Tokens expire in 1 hour
- Request new password reset

### Rate limit error?
- Wait 5 minutes between requests
- User-level cooldown prevents spam

### Password validation failed?
- Ensure passwords match
- Minimum 8 characters required
- Both `new_password` and `confirm_password` required

### Token already used?
- Each token can only be used once
- Request new password reset

---

## 📱 Frontend Integration

### React Hook
```javascript
const usePasswordReset = () => {
  const forgotPassword = async (email) => {
    const response = await fetch('/api/auth/forgot-password/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return response.json();
  };

  const resetPassword = async (token, newPassword, confirmPassword) => {
    const response = await fetch(`/api/auth/reset-password/${token}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
    return response.json();
  };

  return { forgotPassword, resetPassword };
};
```

### React Native
```javascript
import { Alert } from 'react-native';

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
```

---

## ⚡ Quick Facts

| Feature | Value |
|---------|-------|
| **Token Expiration** | 1 hour |
| **User Cooldown** | 5 minutes |
| **API Rate Limit** | 3 requests/hour per email/IP |
| **Min Password Length** | 8 characters |
| **Token Type** | UUID4 |
| **One-time Use** | Yes |
| **Email Provider** | Brevo SMTP |

---

## 🎯 User Flow

```
1. User clicks "Forgot Password?"
   ↓
2. Enters email address
   ↓
3. Receives reset email (1-hour expiration)
   ↓
4. Clicks "Reset Password" button
   ↓
5. Enters new password (2x)
   ↓
6. Password updated, sessions invalidated
   ↓
7. Receives confirmation email
   ↓
8. Logs in with new password ✅
```

---

## 🧪 Test Commands

```bash
# Run full test suite
python test_password_reset.py

# Manual testing
# 1. Request reset
curl -X POST http://localhost:8000/api/auth/forgot-password/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Check email for token

# 3. Validate token (optional)
curl http://localhost:8000/api/auth/validate-reset-token/<TOKEN>/

# 4. Reset password
curl -X POST http://localhost:8000/api/auth/reset-password/<TOKEN>/ \
  -H "Content-Type: application/json" \
  -d '{"new_password":"NewPass123!","confirm_password":"NewPass123!"}'

# 5. Login with new password
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"NewPass123!"}'
```

---

## 📝 Files Modified/Created

### Modified
- `apps/authentication/models.py` - Added PasswordReset model
- `apps/authentication/views.py` - Added reset views
- `apps/authentication/urls.py` - Added reset endpoints

### Created
- `apps/authentication/migrations/0007_*.py` - Database migration
- `templates/emails/reset_password.html` - HTML email
- `templates/emails/reset_password.txt` - Text email
- `templates/emails/password_changed.html` - Confirmation HTML
- `templates/emails/password_changed.txt` - Confirmation text
- `test_password_reset.py` - Test suite
- `PASSWORD_RESET_GUIDE.md` - Full documentation
- `PASSWORD_RESET_QUICK_REF.md` - This file

---

## 🚀 Production Deployment

### Before Going Live

1. **Environment Variables**:
   ```env
   DEBUG=False
   EMAIL_HOST=smtp-relay.brevo.com
   EMAIL_HOST_USER=your-brevo-login
   EMAIL_HOST_PASSWORD=your-brevo-password
   DEFAULT_FROM_EMAIL=Your App <noreply@yourdomain.com>
   ```

2. **Configure Reset URLs** (in production):
   ```python
   reset_url = f'https://yourdomain.com/reset-password/{token}/'
   ```

3. **Set up DNS** (SPF, DKIM) for better deliverability

4. **Monitor rate limits** and adjust as needed

5. **Add CAPTCHA** to forgot password form (recommended)

---

## 📚 Related Documentation

- Full Guide: [PASSWORD_RESET_GUIDE.md](PASSWORD_RESET_GUIDE.md)
- Email Verification: [EMAIL_VERIFICATION_GUIDE.md](EMAIL_VERIFICATION_GUIDE.md)
- API Documentation: See Postman collection

---

## 🆘 Getting Help

- Run tests: `python test_password_reset.py`
- Check logs: `backend/logs/django.log`
- Read full guide: [PASSWORD_RESET_GUIDE.md](PASSWORD_RESET_GUIDE.md)
- Contact: support@saluslogica.com

---

**Status:** ✅ Production Ready  
**Last Updated:** February 2026
