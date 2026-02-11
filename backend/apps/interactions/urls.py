from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'interactions', views.DrugInteractionViewSet, basename='drug-interaction')
router.register(r'checks', views.InteractionCheckViewSet, basename='interaction-check')
router.register(r'contraindications', views.ContraindicationViewSet, basename='contraindication')
router.register(r'database', views.DrugDatabaseViewSet, basename='drug-database')

urlpatterns = [
    path('check/', views.InteractionCheckViewSet.as_view({'post': 'check'}), name='check-interactions'),
    path('history/', views.InteractionCheckViewSet.as_view({'get': 'history'}), name='interaction-history'),
    path('details/<int:pk>/', views.InteractionCheckViewSet.as_view({'get': 'details'}), name='interaction-details'),
    path('add-allergy/', views.ContraindicationViewSet.as_view({'post': 'add_allergy'}), name='add-allergy'),
    path('delete-allergy/', views.ContraindicationViewSet.as_view({'delete': 'delete_allergy'}), name='delete-allergy'),
    path('initialize/', views.DrugDatabaseViewSet.as_view({'post': 'initialize_database'}), name='initialize-database'),
    path('search/', views.DrugDatabaseViewSet.as_view({'get': 'search'}), name='search-drugs'),
    path('', include(router.urls)),
]
