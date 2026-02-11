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
]
