from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import os
from .models import User, UserProfile, EmailVerification, PasswordReset
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserSerializer, 
    UserProfileSerializer,
    AvatarUploadSerializer
)
from saluslogica.throttles import LoginRateThrottle, RegistrationRateThrottle, PasswordResetRateThrottle


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create email verification token and send verification email
        self.send_verification_email(user, request)
        
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Registration successful! We sent a verification email to your inbox. Please check your email to verify your account before logging in.'
        }, status=status.HTTP_201_CREATED)
    
    def send_verification_email(self, user, request):
        """Create verification token and send email"""
        # Delete any existing unverified tokens for this user
        EmailVerification.objects.filter(user=user, verified_at__isnull=True).delete()
        
        # Create new verification token
        verification = EmailVerification.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        # Build verification URL from server-configured FRONTEND_URL (never from client input)
        verification_url = f'{settings.FRONTEND_URL}/verify-email/{verification.token}'
        
        # Prepare email context
        context = {
            'user': user,
            'verification_url': verification_url,
            'current_year': timezone.now().year
        }
        
        # Render HTML and text versions
        html_message = render_to_string('emails/verify_email.html', context)
        plain_message = render_to_string('emails/verify_email.txt', context)
        
        # Send email
        try:
            send_mail(
                subject='Verify Your Email - SalusLogica',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            user.email_verification_sent_at = timezone.now()
            user.save(update_fields=['email_verification_sent_at'])
        except Exception as e:
            # Log error but don't fail registration
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
            logger.error(traceback.format_exc())
            print(f"⚠️  Failed to send verification email to {user.email}: {str(e)}")


class LoginView(generics.GenericAPIView):
    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'access': token.key,
            'token': token.key  # For backward compatibility
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except:
        pass
    logout(request)
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_email(request, token):
    """Verify user email with token"""
    try:
        verification = EmailVerification.objects.get(token=token)
        
        # Check if already verified first (before is_valid, since is_valid returns False for used tokens)
        if verification.verified_at is not None:
            return Response({
                'message': 'Email already verified. You can log in now.'
            }, status=status.HTTP_200_OK)
        
        if not verification.is_valid():
            return Response({
                'error': 'This verification link has expired. Please request a new email.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as verified
        verification.mark_as_verified()
        
        return Response({
            'message': 'Email verified successfully! You can now log in.',
            'user': UserSerializer(verification.user).data
        }, status=status.HTTP_200_OK)
        
    except EmailVerification.DoesNotExist:
        return Response({
            'error': 'Invalid verification link. Please request a new email.'
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification_email(request):
    """Resend verification email to user (works with email, no auth required)"""
    email = request.data.get('email')
    
    if not email:
        return Response({
            'error': 'Email address is required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal whether the email exists
        return Response({
            'message': 'If an account with that email exists, a verification email has been sent.'
        }, status=status.HTTP_200_OK)
    
    if user.email_verified:
        return Response({
            'message': 'Your email is already verified. You can log in.'
        }, status=status.HTTP_200_OK)
    
    if not user.can_resend_verification_email():
        return Response({
            'error': 'Please wait at least 1 minute before requesting another verification email.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Delete old tokens
    EmailVerification.objects.filter(user=user, verified_at__isnull=True).delete()
    
    # Create new verification token
    verification = EmailVerification.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=24)
    )
    
    # Build verification URL from server-configured FRONTEND_URL (never from client input)
    verification_url = f'{settings.FRONTEND_URL}/verify-email/{verification.token}'
    
    # Prepare email context
    context = {
        'user': user,
        'verification_url': verification_url,
        'current_year': timezone.now().year
    }
    
    # Render HTML and text versions
    html_message = render_to_string('emails/verify_email.html', context)
    plain_message = render_to_string('emails/verify_email.txt', context)
    
    # Send email
    try:
        send_mail(
            subject='Verify Your Email - SalusLogica',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        user.email_verification_sent_at = timezone.now()
        user.save(update_fields=['email_verification_sent_at'])
        
        return Response({
            'message': 'Verification email sent. Please check your inbox.'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        # Print to console for Render logs
        print(f"EMAIL ERROR: {str(e)}")
        print(f"EMAIL BACKEND: {settings.EMAIL_BACKEND}")
        print(f"EMAIL HOST: {settings.EMAIL_HOST}")
        print(f"FROM EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        # Return user-friendly error
        error_msg = str(e)
        if 'Connection timed out' in error_msg or 'Connection refused' in error_msg:
            return Response({
                'error': 'Email service is temporarily unavailable. Please try again later or contact support.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({
            'error': f'Failed to send verification email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def forgot_password(request):
    """
    Request a password reset email.
    Sends reset link to the user's email if account exists.
    """
    email = request.data.get('email')
    
    if not email:
        return Response({
            'error': 'Email address is required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Always return success message to prevent email enumeration attacks
    success_response = Response({
        'message': 'If an account with that email exists, a password reset link has been sent.'
    }, status=status.HTTP_200_OK)
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Don't reveal that user doesn't exist
        return success_response
    
    # Check rate limiting
    if not user.can_request_password_reset():
        return Response({
            'error': 'Please wait at least 5 minutes before requesting another password reset.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # Delete old unused tokens for this user
    PasswordReset.objects.filter(user=user, used_at__isnull=True).delete()
    
    # Create new password reset token
    reset_token = PasswordReset.objects.create(
        user=user,
        expires_at=timezone.now() + timedelta(hours=1),
        ip_address=get_client_ip(request)
    )
    
    # Build reset URL from server-configured FRONTEND_URL (never from client input)
    reset_url = f'{settings.FRONTEND_URL}/reset-password/{reset_token.token}'
    
    # Prepare email context
    context = {
        'user': user,
        'reset_url': reset_url,
        'current_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
        'current_year': timezone.now().year,
        'ip_address': get_client_ip(request)
    }
    
    # Render HTML and text versions
    html_message = render_to_string('emails/reset_password.html', context)
    plain_message = render_to_string('emails/reset_password.txt', context)
    
    # Send email
    try:
        send_mail(
            subject='Reset Your Password - SalusLogica',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        user.password_reset_sent_at = timezone.now()
        user.save(update_fields=['password_reset_sent_at'])
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
    
    return success_response


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request, token):
    """
    Reset password using the token from email.
    Requires new password in request body.
    """
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not new_password or not confirm_password:
        return Response({
            'error': 'Both new_password and confirm_password are required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if new_password != confirm_password:
        return Response({
            'error': 'Passwords do not match.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if len(new_password) < 8:
        return Response({
            'error': 'Password must be at least 8 characters long.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        reset_token = PasswordReset.objects.get(token=token)
    except PasswordReset.DoesNotExist:
        return Response({
            'error': 'Invalid or expired password reset link.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not reset_token.is_valid():
        return Response({
            'error': 'This password reset link has expired. Please request a new one.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if reset_token.used_at:
        return Response({
            'error': 'This password reset link has already been used. Please request a new one if needed.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Update user password
    user = reset_token.user
    user.set_password(new_password)
    user.save()
    
    # Mark token as used
    reset_token.mark_as_used()
    
    # Delete all other auth tokens to force re-login
    Token.objects.filter(user=user).delete()
    
    # Send confirmation email
    context = {
        'user': user,
        'current_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
        'current_year': timezone.now().year,
        'ip_address': get_client_ip(request)
    }
    
    html_message = render_to_string('emails/password_changed.html', context)
    plain_message = render_to_string('emails/password_changed.txt', context)
    
    try:
        send_mail(
            subject='Your Password Has Been Changed - SalusLogica',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send password changed confirmation email: {e}")
    
    return Response({
        'message': 'Password reset successful! Please log in with your new password.',
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_reset_token(request, token):
    """
    Validate a password reset token without using it.
    Useful for frontend to check if token is valid before showing reset form.
    """
    try:
        reset_token = PasswordReset.objects.get(token=token)
    except PasswordReset.DoesNotExist:
        return Response({
            'valid': False,
            'error': 'Invalid password reset link.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    if not reset_token.is_valid():
        return Response({
            'valid': False,
            'error': 'This password reset link has expired.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if reset_token.used_at:
        return Response({
            'valid': False,
            'error': 'This password reset link has already been used.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'valid': True,
        'email': reset_token.user.email,
        'expires_at': reset_token.expires_at
    }, status=status.HTTP_200_OK)


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """
    Upload or update user's profile picture.
    Accepts multipart/form-data with 'avatar' file field.
    """
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    # Delete old avatar if exists
    if profile.avatar:
        old_avatar_path = profile.avatar.path
        if os.path.exists(old_avatar_path):
            os.remove(old_avatar_path)
    
    serializer = AvatarUploadSerializer(
        profile, 
        data=request.data, 
        partial=True,
        context={'request': request}
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Avatar uploaded successfully!',
            'avatar_url': serializer.data['avatar_url'],
            'user': UserSerializer(request.user, context={'request': request}).data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_avatar(request):
    """
    Delete user's profile picture.
    """
    # Get or create profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if not profile.avatar:
        return Response({
            'error': 'No avatar to delete.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Delete file from filesystem
    avatar_path = profile.avatar.path
    if os.path.exists(avatar_path):
        os.remove(avatar_path)
    
    # Clear avatar field
    profile.avatar = None
    profile.save()
    
    return Response({
        'message': 'Avatar deleted successfully!',
        'user': UserSerializer(request.user, context={'request': request}).data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_avatar(request):
    """
    Get user's current avatar URL.
    """
    # Get or create profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if profile.avatar:
        avatar_url = request.build_absolute_uri(profile.avatar.url)
        return Response({
            'avatar_url': avatar_url,
            'has_avatar': True
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'avatar_url': None,
            'has_avatar': False,
            'message': 'No avatar set.'
        }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """
    Permanently delete the authenticated user's account.
    Requires password confirmation for security.
    """
    password = request.data.get('password')
    
    if not password:
        return Response({
            'error': 'Password is required to delete your account.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = request.user
    
    if not user.check_password(password):
        return Response({
            'error': 'Incorrect password. Account deletion cancelled.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Delete auth token
    try:
        user.auth_token.delete()
    except Exception:
        pass
    
    # Log out
    logout(request)
    
    # Delete user (cascades to profile, verifications, etc.)
    user.delete()
    
    return Response({
        'message': 'Your account has been permanently deleted.'
    }, status=status.HTTP_200_OK)

