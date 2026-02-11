from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.AlarmViewSet, basename='alarm')

urlpatterns = [
    path('', include(router.urls)),
    # Additional endpoints for frontend compatibility
    path('active/', views.AlarmViewSet.as_view({'get': 'active'}), name='active'),
    path('details/', views.AlarmViewSet.as_view({'get': 'get_details'}), name='get-details'),
    path('taken/', views.AlarmViewSet.as_view({'post': 'mark_group_taken'}), name='mark-group-taken'),
    path('dismiss/', views.AlarmViewSet.as_view({'post': 'dismiss'}), name='dismiss'),
    path('snooze/', views.AlarmViewSet.as_view({'post': 'snooze'}), name='snooze'),
    path('check-reminders/', views.AlarmViewSet.as_view({'get': 'check_reminders'}), name='check-reminders'),
]
