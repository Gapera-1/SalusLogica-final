# Email Verification - Quick Reference

## 🚀 Quick Start

### For Developers

1. **Environment Setup** (already configured in `.env`):
   ```env
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp-relay.brevo.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=a146c6001@smtp-brevo.com
   EMAIL_HOST_PASSWORD=mSFYvahUGf0dg3JM
   DEFAULT_FROM_EMAIL=SalusLogica <fmanishimwe38@gmail.com>
   ```

2. **Database Migrations** (already applied):
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. **Test the System**:
   ```bash
   python test_email_verification.py
   ```

---

## 📋 API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register/` | No | Register + auto-send verification |
| GET | `/api/auth/verify-email/<token>/` | No | Verify email with token |
| POST | `/api/auth/resend-verification/` | Yes | Resend verification email |

---

## 💡 Common Use Cases

### 1. Register New User (Auto-sends email)
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "password2": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "patient"
  }'
```

**Response:**
```json
{
  "message": "Registration successful! Please check your email to verify your account.",
  "token": "abc123...",
  "user": { ... }
}
```

### 2. Verify Email (User clicks link in email)
```
GET http://localhost:8000/api/auth/verify-email/a1b2c3d4-e5f6-7890-abcd-ef1234567890/
```

**Response:**
```json
{
  "message": "Email verified successfully! You can now log in and access all features.",
  "user": { "email_verified": true, ... }
}
```

### 3. Resend Verification Email
```bash
curl -X POST http://localhost:8000/api/auth/resend-verification/ \
  -H "Authorization: Token YOUR_AUTH_TOKEN"
```

**Response:**
```json
{
  "message": "Verification email sent successfully. Please check your inbox."
}
```

---

## 🔧 Testing Checklist

- [ ] Start Django server: `python manage.py runserver`
- [ ] Run test suite: `python test_email_verification.py`
- [ ] Register test user via API
- [ ] Check email inbox (or Django console for console backend)
- [ ] Click verification link
- [ ] Verify user.email_verified is True in database
- [ ] Test resend functionality
- [ ] Test rate limiting (try resending within 1 minute)
- [ ] Test expired token (modify expires_at in database)

---

## 🛠️ Troubleshooting

### Email Not Received?

1. **Check console** (if using console backend):
   ```env
   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
   ```

2. **Check spam folder**

3. **Test SMTP connection**:
   ```python
   python manage.py shell
   >>> from django.core.mail import send_mail
   >>> send_mail('Test', 'Test body', 'from@example.com', ['to@example.com'])
   ```

4. **Check Brevo dashboard** for delivery status

### Rate Limit Error?

Wait 1 minute between resend requests (configurable in User model).

### Token Expired?

Request a new verification email (tokens expire after 24 hours).

---

## 📊 Database Models

### User Model Fields
```python
email_verified = BooleanField(default=False)
email_verification_sent_at = DateTimeField(null=True)
```

### EmailVerification Model
```python
user = ForeignKey(User)
token = UUIDField(unique=True)  # Auto-generated
expires_at = DateTimeField()    # 24 hours from creation
verified_at = DateTimeField(null=True)
```

---

## 🔐 Security Features

✅ **UUID tokens** - Cryptographically secure, impossible to guess  
✅ **24-hour expiration** - Tokens auto-expire  
✅ **Rate limiting** - 1-minute cooldown between resends  
✅ **Token cleanup** - Old tokens deleted when new ones created  
✅ **HTTPS recommended** - Use HTTPS in production for link security  

---

## 📱 Frontend Integration Examples

### React Hook
```javascript
const useEmailVerification = () => {
  const resendVerification = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/auth/resend-verification/', {
      method: 'POST',
      headers: { 'Authorization': `Token ${token}` }
    });
    return response.json();
  };
  
  return { resendVerification };
};
```

### React Native
```javascript
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resendVerification = async () => {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch('API_URL/api/auth/resend-verification/', {
    method: 'POST',
    headers: { 'Authorization': `Token ${token}` }
  });
  const data = await response.json();
  Alert.alert('Success', data.message);
};
```

---

## 📧 Email Template Variables

Templates located in: `backend/templates/emails/`

### Available Variables
- `{{ user.first_name }}` - User's first name
- `{{ user.username }}` - Username
- `{{ verification_url }}` - Full verification link
- `{{ current_year }}` - Current year for copyright

---

## 🚀 Production Deployment

### Before Going Live

1. **Update environment variables**:
   ```env
   DEBUG=False
   DEFAULT_FROM_EMAIL=SalusLogica <noreply@yourdomain.com>
   ```

2. **Configure verification URL** in `views.py`:
   ```python
   verification_url = f'https://yourdomain.com/verify-email/{token}/'
   ```

3. **Set up DNS records** (SPF, DKIM) for better deliverability

4. **Monitor Brevo quota** and delivery rates

5. **Consider async email sending** with Celery:
   ```python
   @shared_task
   def send_verification_email_task(user_id):
       # Send email in background
   ```

---

## 📚 Related Documentation

- Full Guide: [EMAIL_VERIFICATION_GUIDE.md](EMAIL_VERIFICATION_GUIDE.md)
- API Documentation: See Postman collection or OpenAPI spec
- Brevo Documentation: https://developers.brevo.com/

---

**Need Help?** 
- Run tests: `python test_email_verification.py`
- Check logs: `backend/logs/django.log`
- Read full guide: `EMAIL_VERIFICATION_GUIDE.md`
