from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import views_safety

router = DefaultRouter()
router.register(r'', views.MedicineViewSet, basename='medicine')
router.register(r'safety-check', views_safety.SafetyCheckViewSet, basename='safety-check')

urlpatterns = [
    path('', include(router.urls)),
]
