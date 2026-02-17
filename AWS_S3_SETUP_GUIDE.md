# AWS S3 Setup Guide for Avatar Storage

This guide explains how to configure AWS S3 for production media storage in SalusLogica, including avatar uploads.

## Overview

The application is configured to use local file storage in development and AWS S3 in production. The switch is controlled by the `USE_S3` environment variable.

## Prerequisites

- AWS Account
- AWS CLI installed (optional, but recommended)
- Basic familiarity with AWS S3 and IAM

## Step 1: Create an S3 Bucket

### Using AWS Console

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **S3** service
3. Click **Create bucket**
4. Configure bucket:
   - **Bucket name**: `saluslogica-media` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Block Public Access**: Uncheck "Block all public access"
     - ⚠️ Check the acknowledgment box (avatars need to be publicly readable)
   - Leave other settings as default
5. Click **Create bucket**

### Using AWS CLI

```bash
# Create bucket
aws s3 mb s3://saluslogica-media --region us-east-1

# Configure public access
aws s3api put-public-access-block \
    --bucket saluslogica-media \
    --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

## Step 2: Configure CORS

CORS configuration is required to allow your web/mobile apps to upload files directly.

### Using AWS Console

1. Select your bucket
2. Go to **Permissions** tab
3. Scroll to **Cross-origin resource sharing (CORS)**
4. Click **Edit**
5. Add the following JSON:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://your-production-domain.com"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

6. Update `AllowedOrigins` with your actual production domains
7. Click **Save changes**

### Using AWS CLI

Create a file `cors.json`:

```json
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "AllowedOrigins": [
                "http://localhost:5173",
                "http://localhost:3000",
                "https://your-production-domain.com"
            ],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
```

Apply CORS configuration:

```bash
aws s3api put-bucket-cors --bucket saluslogica-media --cors-configuration file://cors.json
```

## Step 3: Create IAM User with S3 Access

### Using AWS Console

1. Navigate to **IAM** service
2. Click **Users** → **Add users**
3. User name: `saluslogica-s3-user`
4. Select **Access key - Programmatic access**
5. Click **Next: Permissions**
6. Choose **Attach existing policies directly**
7. Click **Create policy** (opens new tab)

#### Create Custom Policy

In the new tab:

1. Choose **JSON** tab
2. Add this policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::saluslogica-media",
                "arn:aws:s3:::saluslogica-media/*"
            ]
        }
    ]
}
```

3. Replace `saluslogica-media` with your bucket name
4. Click **Next: Tags** → **Next: Review**
5. Name: `SalusLogicaS3Policy`
6. Click **Create policy**

Return to user creation tab:

7. Refresh the policy list
8. Search for `SalusLogicaS3Policy` and select it
9. Click **Next: Tags** → **Next: Review** → **Create user**
10. **⚠️ IMPORTANT**: Copy the **Access key ID** and **Secret access key**
    - Store these securely - you won't see the secret again!

### Using AWS CLI

Create policy file `s3-policy.json`:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::saluslogica-media",
                "arn:aws:s3:::saluslogica-media/*"
            ]
        }
    ]
}
```

Create IAM user and policy:

```bash
# Create IAM user
aws iam create-user --user-name saluslogica-s3-user

# Create policy
aws iam create-policy \
    --policy-name SalusLogicaS3Policy \
    --policy-document file://s3-policy.json

# Attach policy to user (replace ACCOUNT_ID with your AWS account ID)
aws iam attach-user-policy \
    --user-name saluslogica-s3-user \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/SalusLogicaS3Policy

# Create access key
aws iam create-access-key --user-name saluslogica-s3-user
```

## Step 4: Configure Environment Variables

### Development (.env file)

For local development, keep S3 disabled:

```env
USE_S3=False
```

### Production (.env file)

For production servers, enable S3 and add credentials:

```env
USE_S3=True
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_STORAGE_BUCKET_NAME=saluslogica-media
AWS_S3_REGION_NAME=us-east-1
```

**🔒 Security Notes:**
- Never commit `.env` to version control
- Use environment variables in production platforms (Heroku, AWS, etc.)
- Rotate access keys regularly
- Use IAM roles instead of access keys when deploying to AWS EC2/ECS

### Platform-Specific Configuration

#### Heroku

```bash
heroku config:set USE_S3=True
heroku config:set AWS_ACCESS_KEY_ID=your-access-key
heroku config:set AWS_SECRET_ACCESS_KEY=your-secret-key
heroku config:set AWS_STORAGE_BUCKET_NAME=saluslogica-media
heroku config:set AWS_S3_REGION_NAME=us-east-1
```

#### AWS Elastic Beanstalk

Add to `.ebextensions/environment.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    USE_S3: "True"
    AWS_ACCESS_KEY_ID: "your-access-key"
    AWS_SECRET_ACCESS_KEY: "your-secret-key"
    AWS_STORAGE_BUCKET_NAME: "saluslogica-media"
    AWS_S3_REGION_NAME: "us-east-1"
```

#### Docker/Kubernetes

Add to docker-compose.yml or Kubernetes ConfigMap/Secret.

## Step 5: Install Required Packages

Backend dependencies are already configured in `requirements.txt`:

```bash
pip install boto3==1.34.18 django-storages==1.14.2
```

Or install all requirements:

```bash
cd backend
pip install -r requirements.txt
```

## Step 6: Test the Configuration

### Verify Settings

```bash
cd backend
python manage.py shell
```

In Django shell:

```python
from django.conf import settings

# Check if S3 is enabled
print(f"USE_S3: {settings.USE_S3}")

if settings.USE_S3:
    print(f"Bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
    print(f"Region: {settings.AWS_S3_REGION_NAME}")
    print(f"Media URL: {settings.MEDIA_URL}")
```

### Test Upload

1. Start the Django server:
   ```bash
   python manage.py runserver
   ```

2. Log in to the web app (http://localhost:5173)
3. Navigate to Profile page
4. Upload an avatar image
5. Check your S3 bucket - the file should appear there

### Verify Public Access

Copy the avatar URL from your browser's Network tab or database, and open it in a new browser tab. You should see the image without authentication.

## Step 7: Monitor and Optimize

### CloudWatch Metrics

Monitor S3 usage in AWS CloudWatch:
- Request metrics
- Data transfer
- Error rates

### Cost Optimization

1. **Lifecycle Policies**: Auto-delete old avatars
   ```json
   {
       "Rules": [
           {
               "Id": "DeleteOldAvatars",
               "Status": "Enabled",
               "Prefix": "avatars/",
               "Expiration": {
                   "Days": 365
               }
           }
       ]
   }
   ```

2. **S3 Intelligent-Tiering**: Auto-move infrequent files to cheaper storage
3. **CloudFront CDN**: Add CloudFront for faster delivery and reduced costs

## Troubleshooting

### Error: "Access Denied"

**Cause**: Incorrect IAM permissions or bucket policy

**Solution**:
1. Verify IAM user has correct policy
2. Check bucket permissions allow public read
3. Verify access keys are correct in `.env`

### Error: "CORS Error"

**Cause**: CORS not configured or origins don't match

**Solution**:
1. Verify CORS configuration in S3 bucket
2. Add your frontend domain to `AllowedOrigins`
3. Clear browser cache

### Images Upload but Don't Display

**Cause**: Bucket ACL not set to public-read

**Solution**:
1. Check `AWS_DEFAULT_ACL = 'public-read'` in settings.py
2. Verify "Block all public access" is disabled
3. Manually set uploaded object to public in S3 console

### Error: "SignatureDoesNotMatch"

**Cause**: Incorrect AWS credentials or region mismatch

**Solution**:
1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
2. Check `AWS_S3_REGION_NAME` matches bucket region
3. Ensure no extra spaces in environment variables

## Security Best Practices

1. **Use IAM Roles**: When deploying to AWS EC2/ECS, use IAM roles instead of access keys
2. **Least Privilege**: Only grant necessary S3 permissions
3. **Key Rotation**: Rotate AWS access keys every 90 days
4. **Encryption**: Enable S3 bucket encryption (AES-256 or KMS)
5. **Versioning**: Enable S3 versioning to prevent accidental deletions
6. **Logging**: Enable S3 access logging for audit trails
7. **MFA Delete**: Require MFA for object deletion in production

## Additional Configuration

### CloudFront CDN (Optional)

For better performance and lower costs:

1. Create CloudFront distribution
2. Origin: Your S3 bucket
3. Update settings.py:
   ```python
   AWS_S3_CUSTOM_DOMAIN = 'd1234567890.cloudfront.net'
   ```

### Custom Domain (Optional)

Use your own domain for media files:

1. Configure CloudFront with custom domain
2. Add CNAME record in DNS
3. Update `AWS_S3_CUSTOM_DOMAIN` in settings.py

## Backup Strategy

1. Enable **S3 Versioning** for data recovery
2. Set up **S3 Cross-Region Replication** for disaster recovery
3. Use **AWS Backup** for automated snapshots
4. Keep IAM credentials in secure password manager

## Support

For AWS-specific issues:
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [django-storages Documentation](https://django-storages.readthedocs.io/)
- [boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)

For application issues:
- Check backend logs: `backend/logs/django.log`
- Review Django admin panel
- Check browser console for frontend errors
