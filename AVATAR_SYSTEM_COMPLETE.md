# Avatar Upload System - Complete Implementation Guide

## Overview

Complete avatar upload functionality has been implemented for both web and mobile applications, with support for local development storage and AWS S3 production storage.

## Features Implemented

### Web Application (React)
- ✅ Avatar upload component with drag-and-drop support
- ✅ Image preview before upload
- ✅ Remove avatar functionality
- ✅ Multiple size variants (sm, md, lg, xl)
- ✅ 5MB file size limit
- ✅ Accessibility (ARIA labels, keyboard navigation)
- ✅ Avatar display in navigation bar
- ✅ Automatic localStorage sync

### Mobile Application (React Native)
- ✅ Native image picker integration
- ✅ Photo library selection
- ✅ Image preview in profile header
- ✅ Remove avatar with confirmation dialog
- ✅ Upload progress feedback
- ✅ Optimized image quality (0.8) and size (1000x1000)
- ✅ Material Design UI (react-native-paper)

### Backend (Django)
- ✅ Upload endpoint: `/auth/upload-avatar/`
- ✅ Remove endpoint: `/auth/remove-avatar/`
- ✅ Local storage for development
- ✅ AWS S3 storage for production
- ✅ Automatic file cleanup on avatar change

## File Structure

```
SalusLogica-final/
├── backend/
│   ├── requirements.txt              # Updated with boto3 and django-storages
│   ├── .env.example                   # Updated with AWS S3 variables
│   └── saluslogica/
│       └── settings.py                # S3 configuration added
│
├── medicine-reminder/                 # Web App
│   └── src/
│       ├── components/
│       │   ├── AvatarUpload.jsx      # ✨ NEW - Avatar upload component
│       │   └── Navigation.jsx         # ✅ Updated - Shows user avatar
│       ├── pages/
│       │   └── Profile.jsx            # ✅ Updated - Avatar upload integration
│       └── services/
│           └── api.js                 # ✅ Updated - Upload/remove methods
│
├── Mobile/                            # Mobile App
│   └── src/
│       ├── screens/
│       │   └── ProfileScreen.js       # ✅ Updated - Image picker integration
│       └── services/
│           └── api.js                 # ✅ Updated - Upload/remove methods
│
└── AWS_S3_SETUP_GUIDE.md             # ✨ NEW - Complete S3 setup guide
```

## Quick Start

### Development Setup (Local Storage)

1. **Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   python manage.py runserver
   ```

2. **Web App**
   ```bash
   cd medicine-reminder
   npm install
   npm run dev
   ```

3. **Mobile App**
   ```bash
   cd Mobile
   npm install
   npx react-native run-android  # or run-ios
   ```

Avatar files will be stored in `backend/media/avatars/`

### Production Setup (AWS S3)

1. **Install Dependencies**
   ```bash
   cd backend
   pip install boto3 django-storages
   ```

2. **Configure AWS S3**
   - Follow [AWS_S3_SETUP_GUIDE.md](AWS_S3_SETUP_GUIDE.md)
   - Create S3 bucket
   - Configure CORS
   - Create IAM user with S3 access

3. **Set Environment Variables**
   ```env
   USE_S3=True
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_STORAGE_BUCKET_NAME=saluslogica-media
   AWS_S3_REGION_NAME=us-east-1
   ```

4. **Deploy**
   - Files automatically upload to S3
   - Public URLs generated automatically
   - No code changes needed!

## API Endpoints

### Upload Avatar
```
POST /auth/upload-avatar/
Content-Type: multipart/form-data
Authorization: Token <user-token>

Body:
  avatar: <image-file>

Response:
{
  "avatar": "https://bucket.s3.amazonaws.com/avatars/user123_uuid.jpg",
  "message": "Avatar uploaded successfully"
}
```

### Remove Avatar
```
DELETE /auth/remove-avatar/
Authorization: Token <user-token>

Response:
{
  "message": "Avatar removed successfully"
}
```

## Usage Examples

### Web - AvatarUpload Component

```jsx
import AvatarUpload from '../components/AvatarUpload';

function Profile() {
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar);

  const handleAvatarUpload = (newAvatarUrl) => {
    return new Promise((resolve, reject) => {
      setAvatarUrl(newAvatarUrl);
      // Update user in localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        user.avatar = newAvatarUrl;
        localStorage.setItem('user', JSON.stringify(user));
      }
      resolve();
    });
  };

  return (
    <AvatarUpload
      currentAvatar={avatarUrl}
      onUpload={handleAvatarUpload}
      size="xl"
      editable={true}
    />
  );
}
```

### Web - Display Avatar in Navigation

```jsx
// Automatically done in Navigation.jsx
{user?.avatar ? (
  <img
    src={user.avatar}
    alt={user.name}
    className="w-8 h-8 rounded-full object-cover"
  />
) : (
  <UserCircle size={32} />
)}
```

### Mobile - Image Picker

```jsx
import { launchImageLibrary } from 'react-native-image-picker';

const handleSelectAvatar = async () => {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 1000,
    maxHeight: 1000,
  });

  if (result.assets?.[0]) {
    const formData = new FormData();
    formData.append('avatar', {
      uri: result.assets[0].uri,
      type: result.assets[0].type || 'image/jpeg',
      name: result.assets[0].fileName || 'avatar.jpg',
    });

    try {
      const response = await userAPI.uploadAvatar(formData);
      setAvatarUri(response.avatar);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }
};
```

## Configuration Options

### AvatarUpload Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentAvatar` | string | null | Current avatar URL |
| `onUpload` | function | required | Callback when avatar uploaded/removed |
| `size` | string | 'md' | Size variant: 'sm', 'md', 'lg', 'xl' |
| `editable` | boolean | true | Enable upload/remove controls |
| `className` | string | '' | Additional CSS classes |

### Size Variants

- **sm**: 64px × 64px
- **md**: 96px × 96px (default)
- **lg**: 128px × 128px
- **xl**: 160px × 160px

### File Validation

- **Allowed types**: JPG, PNG, GIF, WebP
- **Max size**: 5MB
- **Recommended**: Square images, at least 400×400px

## Storage Configuration

### Local Storage (Development)

**Django settings.py:**
```python
USE_S3 = False
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

**Files stored in:**
```
backend/media/avatars/user123_uuid.jpg
```

### AWS S3 (Production)

**Django settings.py:**
```python
USE_S3 = True
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = 'saluslogica-media'
MEDIA_URL = f'https://{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com/'
```

**Files stored in:**
```
https://saluslogica-media.s3.amazonaws.com/avatars/user123_uuid.jpg
```

## Testing

### Web Application

1. Navigate to Profile page
2. Click on avatar circle
3. Select an image file
4. Preview should appear immediately
5. Image uploads automatically
6. Check navigation bar - avatar should appear
7. Click "Remove Avatar" button
8. Avatar resets to default icon

### Mobile Application

1. Open Profile screen
2. Tap camera icon on avatar
3. Select photo from library
4. Image uploads with loading indicator
5. Avatar updates in header
6. Long-press avatar to see remove option
7. Confirm removal
8. Avatar resets to initials

### Backend Testing

```bash
cd backend
python manage.py shell
```

```python
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.authentication.models import User

# Test file upload
user = User.objects.get(id=1)
with open('test_avatar.jpg', 'rb') as f:
    user.avatar = SimpleUploadedFile('avatar.jpg', f.read())
    user.save()
    print(user.avatar.url)  # Should show S3 URL or local URL
```

## Troubleshooting

### Web: Upload button not working
- Check browser console for errors
- Verify API endpoint is accessible
- Check authentication token

### Mobile: Image picker not showing
- Install `react-native-image-picker`
- Add permissions to AndroidManifest.xml / Info.plist
- Rebuild native app

### Images not displaying
- Check CORS configuration (S3)
- Verify public read access (S3)
- Check image URL in Network tab
- Verify MEDIA_URL setting

### Upload fails with 413 error
- File too large (>5MB)
- Check nginx/server upload limits
- Reduce image quality before upload

### S3 Access Denied
- Verify AWS credentials in `.env`
- Check IAM permissions
- Verify bucket policy allows public read
- Check bucket region matches setting

## Performance Optimization

### Web
- ✅ Image preview uses `FileReader` (no server request)
- ✅ Lazy loading for avatar images
- ✅ CSS `object-fit: cover` for proper cropping

### Mobile
- ✅ Image compression (quality: 0.8)
- ✅ Max dimensions (1000×1000)
- ✅ FormData for efficient upload
- ✅ Async upload with loading states

### Backend
- ✅ UUID filenames prevent conflicts
- ✅ Auto-cleanup of old avatars
- ✅ S3 caching (max-age: 1 day)
- ✅ CloudFront CDN compatible

## Security Considerations

### File Validation
- File type checking (MIME type)
- File size limits (5MB)
- File extension whitelist
- Virus scanning recommended for production

### Storage Security
- IAM least-privilege access
- S3 bucket encryption enabled
- CloudFront signed URLs (optional)
- Regular access key rotation

### Privacy
- Avatars are publicly accessible
- No EXIF data removal (consider adding)
- User can remove avatar anytime
- Old avatars auto-deleted on new upload

## Dependencies

### Backend
```
boto3==1.34.18
django-storages==1.14.2
Pillow==10.0.1
python-decouple==3.8
```

### Web (medicine-reminder)
```
react==19.0.0
@tanstack/react-query==5.62.11
lucide-react (for icons)
```

### Mobile
```
react-native-image-picker (latest)
react-native-paper (for UI)
```

## Environment Variables

### Development (.env)
```env
DEBUG=True
USE_S3=False
```

### Production (.env)
```env
DEBUG=False
USE_S3=True
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJal...
AWS_STORAGE_BUCKET_NAME=saluslogica-media
AWS_S3_REGION_NAME=us-east-1
```

## Migration Path

### Migrating from Local to S3

1. **Set up S3** (follow AWS_S3_SETUP_GUIDE.md)
2. **Upload existing avatars to S3:**
   ```python
   python manage.py shell
   
   from apps.authentication.models import User
   for user in User.objects.exclude(avatar=''):
       if user.avatar:
           user.save()  # Triggers re-save to S3
   ```
3. **Enable S3** in production `.env`
4. **Test avatar uploads**
5. **Clean up old local files**

## Support & Documentation

- **AWS S3 Setup**: See [AWS_S3_SETUP_GUIDE.md](AWS_S3_SETUP_GUIDE.md)
- **django-storages**: https://django-storages.readthedocs.io/
- **react-native-image-picker**: https://github.com/react-native-image-picker/react-native-image-picker
- **Backend API**: Check `backend/apps/authentication/views.py`

## Changelog

### Version 1.0 (Current)
- ✅ Web avatar upload component
- ✅ Mobile image picker integration
- ✅ AWS S3 production storage
- ✅ Local development storage
- ✅ Avatar display in navigation
- ✅ Remove avatar functionality
- ✅ Automatic cleanup
- ✅ 5MB file size limit
- ✅ ARIA accessibility
- ✅ Material Design (mobile)

### Future Enhancements
- 🔄 Image cropping tool
- 🔄 Multiple image formats support
- 🔄 Real-time upload progress bar
- 🔄 Avatar gallery/templates
- 🔄 EXIF data removal
- 🔄 CDN integration (CloudFront)
- 🔄 Image optimization (WebP conversion)
- 🔄 Virus scanning integration

## License

Part of SalusLogica - Medicine Reminder Application
