from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.NotificationViewSet, basename='notification')
router.register(r'settings', views.NotificationSettingsViewSet, basename='notification-settings')
router.register(r'templates', views.NotificationTemplateViewSet, basename='notification-template')

urlpatterns = [
    # FCM device management (before router to avoid conflicts)
    path('devices/', views.list_fcm_devices, name='fcm-device-list'),
    path('devices/register/', views.register_fcm_device, name='fcm-device-register'),
    path('devices/unregister/', views.unregister_fcm_device, name='fcm-device-unregister'),
    path('test-push/', views.send_test_push, name='test-push'),

    # Router-generated URLs
    path('', include(router.urls)),
]
