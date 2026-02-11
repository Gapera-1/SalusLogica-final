from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'stats', views.DashboardStatsViewSet, basename='dashboard-stats')
router.register(r'adherence', views.AdherenceReportViewSet, basename='adherence-report')
router.register(r'usage', views.MedicineUsageStatsViewSet, basename='medicine-usage')
router.register(r'exports', views.ExportRequestViewSet, basename='export-request')

urlpatterns = [
    path('dashboard/', views.DashboardStatsViewSet.as_view({'get': 'dashboard'}), name='dashboard'),
    path('patient-adherence/', views.AdherenceReportViewSet.as_view({'get': 'patient_adherence'}), name='patient-adherence'),
    path('medicine-usage/', views.MedicineUsageStatsViewSet.as_view({'get': 'medicine_usage'}), name='medicine-usage'),
    path('export-center/', views.ExportRequestViewSet.as_view({'get': 'export_center'}), name='export-center'),
    path('create-export/', views.ExportRequestViewSet.as_view({'post': 'create_export'}), name='create-export'),
    path('', include(router.urls)),
]
