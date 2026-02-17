# Avatar Upload Quick Reference

## Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/avatar/upload/` | ✅ | Upload/replace avatar |
| GET | `/api/auth/avatar/` | ✅ | Get avatar URL |
| DELETE | `/api/auth/avatar/delete/` | ✅ | Delete avatar |

## File Requirements

- **Max Size**: 5MB
- **Formats**: JPEG, PNG, GIF, WebP
- **Upload Method**: `multipart/form-data`
- **Field Name**: `avatar`

## Quick Integration

### Upload (cURL)
```bash
curl -X POST http://localhost:8000/api/auth/avatar/upload/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "avatar=@image.jpg"
```

### Upload (JavaScript/Fetch)
```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

fetch('/api/auth/avatar/upload/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${token}`
  },
  body: formData
})
.then(res => res.json())
.then(data => console.log(data.avatar_url));
```

### Upload (React Native)
```javascript
const formData = new FormData();
formData.append('avatar', {
  uri: imageUri,
  type: 'image/jpeg',
  name: 'avatar.jpg'
});

api.post('/auth/avatar/upload/', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

### Delete (cURL)
```bash
curl -X DELETE http://localhost:8000/api/auth/avatar/delete/ \
  -H "Authorization: Token YOUR_TOKEN"
```

### Get (cURL)
```bash
curl -X GET http://localhost:8000/api/auth/avatar/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## Responses

### Upload Success (200)
```json
{
  "message": "Avatar uploaded successfully!",
  "avatar_url": "http://localhost:8000/media/avatars/image.jpg",
  "user": { ... }
}
```

### Get With Avatar (200)
```json
{
  "avatar_url": "http://localhost:8000/media/avatars/image.jpg",
  "has_avatar": true
}
```

### Get Without Avatar (200)
```json
{
  "avatar_url": null,
  "has_avatar": false,
  "message": "No avatar set."
}
```

### File Too Large (400)
```json
{
  "avatar": ["Avatar file size cannot exceed 5MB."]
}
```

### Invalid File Type (400)
```json
{
  "avatar": ["Only JPEG, PNG, GIF, and WebP images are allowed."]
}
```

### No Avatar to Delete (404)
```json
{
  "error": "No avatar to delete."
}
```

### Unauthorized (401)
```json
{
  "detail": "Authentication credentials were not provided."
}
```

## User Serializer

The `UserSerializer` now includes `avatar_url`:

```json
{
  "id": 1,
  "username": "john",
  "email": "john@example.com",
  "avatar_url": "http://localhost:8000/media/avatars/image.jpg"  // or null
}
```

## Testing

Run the test suite:
```bash
cd backend
python test_avatar_upload.py
```

## Storage

- **Location**: `backend/media/avatars/`
- **Auto-cleanup**: Old avatars deleted on new upload
- **Format**: Original filename preserved

## Validation

### Backend (Django)
```python
# In AvatarUploadSerializer
def validate_avatar(self, value):
    # Max 5MB
    if value.size > 5 * 1024 * 1024:
        raise ValidationError("Avatar file size cannot exceed 5MB.")
    
    # Only images
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if value.content_type not in allowed_types:
        raise ValidationError("Only JPEG, PNG, GIF, and WebP images are allowed.")
    
    return value
```

### Frontend (React)
```javascript
const validateAvatar = (file) => {
  if (file.size > 5 * 1024 * 1024) {
    return 'File size must be less than 5MB';
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return 'Only JPEG, PNG, GIF, and WebP images are allowed';
  }
  
  return null;
};
```

## Display Component (React)

```jsx
const UserAvatar = ({ user, size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24'
  };

  return user.avatar_url ? (
    <img 
      src={user.avatar_url} 
      alt={user.username}
      className={`rounded-full ${sizes[size]}`}
    />
  ) : (
    <div className={`rounded-full bg-blue-500 text-white flex items-center justify-center ${sizes[size]}`}>
      {user.username?.[0]?.toUpperCase() || 'U'}
    </div>
  );
};
```

## Common Issues

| Issue | Solution |
|-------|----------|
| "Upload a valid image" | Check file format and size |
| Missing `avatar_url` | User hasn't uploaded avatar (will be `null`) |
| 401 Unauthorized | Include `Authorization: Token <token>` header |
| 404 on delete | User has no avatar to delete |
| Old avatar not deleted | Backend handles this automatically |

## Files Modified

- `backend/apps/authentication/models.py` - UserProfile has `avatar` field
- `backend/apps/authentication/serializers.py` - Added `AvatarUploadSerializer`, updated `UserSerializer`
- `backend/apps/authentication/views.py` - Added `upload_avatar`, `delete_avatar`, `get_avatar`
- `backend/apps/authentication/urls.py` - Added avatar routes
- `backend/test_avatar_upload.py` - Comprehensive test suite

## Production Setup

### Nginx (Serve Media Files)
```nginx
location /media/ {
    alias /path/to/backend/media/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### AWS S3 (Cloud Storage)
```python
# settings.py
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = 'your-bucket'
AWS_S3_REGION_NAME = 'us-east-1'
```

## Full Documentation

See [AVATAR_UPLOAD_GUIDE.md](AVATAR_UPLOAD_GUIDE.md) for complete documentation.
