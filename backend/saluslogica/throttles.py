"""
Custom throttle classes for API rate limiting
Prevents abuse and ensures fair usage of the SalusLogica API
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle, SimpleRateThrottle
from django.core.cache import cache


class AnonBurstRateThrottle(AnonRateThrottle):
    """
    Throttle for anonymous users (burst rate - short term)
    Allows 20 requests per minute for unauthenticated users
    """
    scope = 'anon_burst'


class AnonSustainedRateThrottle(AnonRateThrottle):
    """
    Throttle for anonymous users (sustained rate - long term)
    Allows 100 requests per hour for unauthenticated users
    """
    scope = 'anon_sustained'


class UserBurstRateThrottle(UserRateThrottle):
    """
    Throttle for authenticated users (burst rate - short term)
    Allows 60 requests per minute for authenticated users
    """
    scope = 'user_burst'


class UserSustainedRateThrottle(UserRateThrottle):
    """
    Throttle for authenticated users (sustained rate - long term)
    Allows 1000 requests per hour for authenticated users
    """
    scope = 'user_sustained'


class PharmacyAdminRateThrottle(UserRateThrottle):
    """
    Higher rate limit for pharmacy administrators
    Allows 2000 requests per hour
    """
    scope = 'pharmacy_admin'
    
    def allow_request(self, request, view):
        # Check if user is pharmacy admin
        if request.user and request.user.is_authenticated:
            if hasattr(request.user, 'pharmacy_admin'):
                return super().allow_request(request, view)
        
        # Fall back to regular user throttle
        return True


class LoginRateThrottle(SimpleRateThrottle):
    """
    Stricter rate limiting for login attempts
    Prevents brute force attacks
    Allows 5 attempts per minute per IP
    """
    scope = 'login'
    
    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            # No throttling for already authenticated users
            return None
        
        # Throttle by IP address
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class PasswordResetRateThrottle(SimpleRateThrottle):
    """
    Rate limiting for password reset requests
    Prevents abuse of password reset functionality
    Allows 3 attempts per hour per email/IP
    """
    scope = 'password_reset'
    
    def get_cache_key(self, request, view):
        # Try to get email from request data
        email = request.data.get('email', None)
        
        if email:
            # Throttle by email address
            ident = email
        else:
            # Fall back to IP address
            ident = self.get_ident(request)
        
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident
        }


class RegistrationRateThrottle(SimpleRateThrottle):
    """
    Rate limiting for user registration
    Prevents spam registrations
    Allows 3 registrations per hour per IP
    """
    scope = 'registration'
    
    def get_cache_key(self, request, view):
        # Throttle by IP address
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request)
        }


class MedicineCreationRateThrottle(UserRateThrottle):
    """
    Rate limiting for medicine creation
    Prevents spam medicine entries
    Allows 30 medicines per hour per user
    """
    scope = 'medicine_creation'
    
    def allow_request(self, request, view):
        # Only apply to POST requests (creation)
        if request.method != 'POST':
            return True
        
        return super().allow_request(request, view)


class NotificationRateThrottle(UserRateThrottle):
    """
    Rate limiting for notification sending
    Prevents notification spam
    Allows 100 notifications per hour per user
    """
    scope = 'notification'


class UploadRateThrottle(UserRateThrottle):
    """
    Rate limiting for file uploads
    Prevents abuse of file upload functionality
    Allows 20 uploads per hour per user
    """
    scope = 'upload'
    
    def allow_request(self, request, view):
        # Only apply to requests with files
        if not request.FILES:
            return True
        
        return super().allow_request(request, view)


# Helper function to get rate limit info
def get_rate_limit_info(request):
    """
    Get current rate limit status for a request
    Useful for debugging and showing users their limits
    """
    from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
    
    if request.user and request.user.is_authenticated:
        throttle = UserSustainedRateThrottle()
    else:
        throttle = AnonSustainedRateThrottle()
    
    # Get current usage
    history = throttle.get_cache_key(request, None)
    
    return {
        'authenticated': request.user.is_authenticated,
        'scope': throttle.scope,
        'rate': throttle.rate,
        'history': cache.get(history, []) if history else []
    }
