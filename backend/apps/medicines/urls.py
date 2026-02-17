from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import views_safety

router = DefaultRouter()
# Main medicines CRUD - keep at root for backward compatibility
router.register(r'', views.MedicineViewSet, basename='medicine')

# Additional endpoints
urlpatterns = [
    path('', include(router.urls)),
    path('patient-profile/', include([
        path('me/', views.PatientProfileViewSet.as_view({'get': 'me'}), name='patient-profile-me'),
        path('update_me/', views.PatientProfileViewSet.as_view({'post': 'update_me', 'put': 'update_me', 'patch': 'update_me'}), name='patient-profile-update'),
        path('', views.PatientProfileViewSet.as_view({'get': 'list', 'post': 'create'}), name='patient-profile-list'),
    ])),
    path('allergies/', include([
        path('', views.UserAllergyViewSet.as_view({'get': 'list', 'post': 'create'}), name='allergy-list'),
        path('<int:pk>/', views.UserAllergyViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='allergy-detail'),
    ])),
    path('safety-check/', include([
        path('safety_check/', views_safety.SafetyCheckViewSet.as_view({'post': 'safety_check'}), name='safety-check'),
        path('contraindications/', views_safety.SafetyCheckViewSet.as_view({'get': 'contraindications'}), name='contraindications'),
        path('food_advice/', views_safety.SafetyCheckViewSet.as_view({'get': 'food_advice'}), name='food-advice'),
    ])),
]
