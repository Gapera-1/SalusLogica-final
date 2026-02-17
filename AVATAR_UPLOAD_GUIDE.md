# Profile Picture/Avatar Upload Guide

## Overview

The SalusLogica platform now supports user profile pictures (avatars), allowing users to personalize their accounts with images.

## Features

✅ **Upload Profile Pictures**: Users can upload images in JPEG, PNG, GIF, or WebP format  
✅ **File Validation**: Automatic validation of file size (5MB limit) and file type  
✅ **Automatic Cleanup**: Old avatars are automatically deleted when uploading new ones  
✅ **Delete Avatar**: Users can remove their profile pictures  
✅ **Secure Storage**: Images stored in `/media/avatars/` directory  
✅ **URL Generation**: Automatic generation of absolute URLs for avatar access  
✅ **Authorization**: All endpoints require authentication  

## API Endpoints

### 1. Upload Avatar

**Endpoint**: `POST /api/auth/avatar/upload/`  
**Authentication**: Required (Token)  
**Content-Type**: `multipart/form-data`  
**Parameters**:
- `avatar` (file, required): Image file (JPEG, PNG, GIF, or WebP)

**Request Example**:
```bash
curl -X POST http://localhost:8000/api/auth/avatar/upload/ \
  -H "Authorization: Token your_auth_token" \
  -F "avatar=@/path/to/image.jpg"
```

**Success Response** (200 OK):
```json
{
  "message": "Avatar uploaded successfully!",
  "avatar_url": "http://localhost:8000/media/avatars/image.jpg",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "avatar_url": "http://localhost:8000/media/avatars/image.jpg",
    ...
  }
}
```

**Error Responses**:

**400 Bad Request** (File too large):
```json
{
  "avatar": ["Avatar file size cannot exceed 5MB."]
}
```

**400 Bad Request** (Invalid file type):
```json
{
  "avatar": ["Only JPEG, PNG, GIF, and WebP images are allowed."]
}
```

**401 Unauthorized** (No authentication):
```json
{
  "detail": "Authentication credentials were not provided."
}
```

---

### 2. Get Avatar

**Endpoint**: `GET /api/auth/avatar/`  
**Authentication**: Required (Token)  

**Request Example**:
```bash
curl -X GET http://localhost:8000/api/auth/avatar/ \
  -H "Authorization: Token your_auth_token"
```

**Success Response (with avatar)** (200 OK):
```json
{
  "avatar_url": "http://localhost:8000/media/avatars/image.jpg",
  "has_avatar": true
}
```

**Success Response (no avatar)** (200 OK):
```json
{
  "avatar_url": null,
  "has_avatar": false,
  "message": "No avatar set."
}
```

---

### 3. Delete Avatar

**Endpoint**: `DELETE /api/auth/avatar/delete/`  
**Authentication**: Required (Token)  

**Request Example**:
```bash
curl -X DELETE http://localhost:8000/api/auth/avatar/delete/ \
  -H "Authorization: Token your_auth_token"
```

**Success Response** (200 OK):
```json
{
  "message": "Avatar deleted successfully!",
  "user": {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "avatar_url": null,
    ...
  }
}
```

**Error Response (no avatar exists)** (404 Not Found):
```json
{
  "error": "No avatar to delete."
}
```

---

## Frontend Integration (React)

### Upload Avatar Component

```jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const AvatarUpload = () => {
  const { user, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/auth/avatar/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUser(response.data.user);
      alert('Avatar uploaded successfully!');
    } catch (err) {
      setError(err.response?.data?.avatar?.[0] || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user.avatar_url) return;

    if (!confirm('Are you sure you want to delete your avatar?')) return;

    try {
      const response = await api.delete('/auth/avatar/delete/');
      setUser(response.data.user);
      alert('Avatar deleted successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete avatar');
    }
  };

  return (
    <div className="avatar-upload">
      {user.avatar_url ? (
        <div className="avatar-preview">
          <img src={user.avatar_url} alt="User avatar" className="avatar" />
          <button 
            onClick={handleDeleteAvatar} 
            className="btn btn-danger"
          >
            Delete Avatar
          </button>
        </div>
      ) : (
        <div className="no-avatar">
          <div className="avatar-placeholder">
            {user.username?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      )}

      <input
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        disabled={uploading}
        className="file-input"
      />

      {uploading && <p>Uploading...</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default AvatarUpload;
```

### Display Avatar in Components

```jsx
const UserAvatar = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-24 h-24 text-2xl'
  };

  if (user.avatar_url) {
    return (
      <img 
        src={user.avatar_url} 
        alt={user.username}
        className={`rounded-full object-cover ${sizeClasses[size]}`}
      />
    );
  }

  // Fallback to initials
  return (
    <div 
      className={`rounded-full bg-blue-500 text-white flex items-center justify-center ${sizeClasses[size]}`}
    >
      {user.username?.[0]?.toUpperCase() || 'U'}
    </div>
  );
};
```

---

## Mobile Integration (React Native)

### Avatar Upload with Image Picker

```jsx
import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const AvatarUpload = () => {
  const { user, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant camera roll permissions');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const response = await api.post('/auth/avatar/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(response.data.user);
      Alert.alert('Success', 'Avatar uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.avatar?.[0] || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async () => {
    Alert.alert(
      'Delete Avatar',
      'Are you sure you want to delete your avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete('/auth/avatar/delete/');
              setUser(response.data.user);
              Alert.alert('Success', 'Avatar deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete avatar');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {user.avatar_url ? (
        <Image 
          source={{ uri: user.avatar_url }} 
          style={styles.avatar} 
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.initial}>
            {user.username?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
      )}

      <TouchableOpacity onPress={pickImage} disabled={uploading}>
        <Text style={styles.uploadButton}>
          {uploading ? 'Uploading...' : 'Change Avatar'}
        </Text>
      </TouchableOpacity>

      {user.avatar_url && (
        <TouchableOpacity onPress={deleteAvatar}>
          <Text style={styles.deleteButton}>Delete Avatar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = {
  container: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  uploadButton: {
    marginTop: 10,
    color: '#3b82f6',
    fontSize: 16,
  },
  deleteButton: {
    marginTop: 10,
    color: '#ef4444',
    fontSize: 16,
  },
};

export default AvatarUpload;
```

---

## File Validation Rules

### Size Limit
- **Maximum**: 5MB
- Files exceeding this limit will be rejected with a 400 error

### Allowed File Types
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)

### Content Type Validation
The backend validates the `content_type` of the uploaded file to ensure it matches one of:
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

---

## Storage Configuration

### Media Files Location
- **Development**: `backend/media/avatars/`
- **Production**: Configure `MEDIA_ROOT` in settings

### File Naming
Files are uploaded with their original names. If a user uploads a new avatar:
1. The old avatar file is automatically deleted
2. The new avatar file is saved
3. The database is updated with the new file path

### URL Format
Avatar URLs follow this pattern:
```
http://your-domain.com/media/avatars/filename.ext
```

---

## Testing

A comprehensive test suite is available at `backend/test_avatar_upload.py`.

### Run Tests
```bash
cd backend
python test_avatar_upload.py
```

### Test Coverage
- ✅ Upload valid avatar
- ✅ Retrieve avatar URL
- ✅ Replace existing avatar (with automatic cleanup)
- ✅ Delete avatar
- ✅ File size validation (reject >5MB)
- ✅ File type validation (only JPEG/PNG/GIF/WebP)
- ✅ Authorization checks
- ✅ Edge cases (no avatar, no profile)
- ✅ User serializer includes `avatar_url`

---

## Security Considerations

1. **Authentication Required**: All endpoints require valid authentication tokens
2. **File Validation**: Strict validation of file size and type
3. **Automatic Cleanup**: Old files are deleted to prevent storage bloat
4. **Profile Isolation**: Users can only manage their own avatars
5. **Content Type Validation**: Prevents upload of non-image files

---

## Database Schema

### UserProfile Model
```python
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(
        upload_to='avatars/', 
        blank=True, 
        null=True
    )
    # ... other fields
```

The `avatar` field:
- Stores the file path relative to `MEDIA_ROOT`
- Can be `None` if user hasn't uploaded an avatar
- Automatically handles file storage via Django's `ImageField`

---

## Troubleshooting

### "Upload a valid image" Error
- Ensure the file is a valid image format
- Check that the file size is under 5MB
- Verify the `Content-Type` header is correct

### "Authentication credentials were not provided"
- Ensure you're sending the `Authorization: Token <token>` header
- Verify the token is valid and not expired

### "No avatar to delete" (404)
- This occurs when trying to delete an avatar that doesn't exist
- Check if the user has an avatar before attempting deletion

### Avatar Not Displaying
- Verify `MEDIA_URL` and `MEDIA_ROOT` are configured in settings
- In development, ensure `django.contrib.staticfiles` is serving media files
- In production, configure your web server (Nginx/Apache) to serve media files

---

## Production Deployment

### Configure Media File Serving

**Nginx Configuration**:
```nginx
location /media/ {
    alias /path/to/your/media/;
}
```

**Django Settings** (production):
```python
# For production with cloud storage (e.g., AWS S3)
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = 'your-bucket-name'
AWS_S3_REGION_NAME = 'us-east-1'
```

### Backup Considerations
- Regularly backup the `media/avatars/` directory
- Consider cloud storage (AWS S3, Google Cloud Storage) for production
- Implement CDN for better performance

---

## API Response Reference

### UserSerializer (with avatar)
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "user_type": "patient",
  "avatar_url": "http://localhost:8000/media/avatars/profile.jpg"
}
```

### UserSerializer (without avatar)
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "user_type": "patient",
  "avatar_url": null
}
```

---

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ Update frontend profile page to use avatar upload
3. ⏳ Update mobile app profile screen
4. ⏳ Add avatar display to all user-facing components
5. ⏳ Consider adding image cropping/resizing on the client side
6. ⏳ Configure production media storage (S3, etc.)

---

## Support

For issues or questions, refer to:
- Test suite: `backend/test_avatar_upload.py`
- Views implementation: `backend/apps/authentication/views.py`
- Serializers: `backend/apps/authentication/serializers.py`
- URL routing: `backend/apps/authentication/urls.py`
