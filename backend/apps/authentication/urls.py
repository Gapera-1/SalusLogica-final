from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('user/', views.current_user_view, name='current-user'),
    path('token/', obtain_auth_token, name='api-token-auth'),
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    
    # Email verification
    path('verify-email/<uuid:token>/', views.verify_email, name='verify-email'),
    path('resend-verification/', views.resend_verification_email, name='resend-verification'),
    
    # Password reset
    path('forgot-password/', views.forgot_password, name='forgot-password'),
    path('reset-password/<uuid:token>/', views.reset_password, name='reset-password'),
    path('validate-reset-token/<uuid:token>/', views.validate_reset_token, name='validate-reset-token'),
    
    # Avatar/Profile Picture
    path('avatar/upload/', views.upload_avatar, name='upload-avatar'),
    path('avatar/delete/', views.delete_avatar, name='delete-avatar'),
    path('avatar/', views.get_avatar, name='get-avatar'),
    
    # Account management
    path('delete-account/', views.delete_account, name='delete-account'),
]
