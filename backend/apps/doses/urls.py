from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'history', views.DoseLogViewSet, basename='dose-log')
router.register(r'reports', views.DoseHistoryViewSet, basename='dose-history')

urlpatterns = [
    path('', include(router.urls)),
    # Additional endpoints for frontend compatibility
    path('check-missed/', views.DoseLogViewSet.as_view({'post': 'check_missed'}), name='check-missed'),
    path('pending/', views.DoseLogViewSet.as_view({'get': 'pending'}), name='pending'),
    path('today/', views.DoseLogViewSet.as_view({'get': 'today'}), name='today'),
    path('overdue/', views.DoseLogViewSet.as_view({'get': 'overdue'}), name='overdue'),
]
