"""
Pharmacy Admin URLs
"""

from django.urls import path
from . import views

urlpatterns = [
    # Test endpoint
    path('test/', views.test_pharmacy_setup, name='test_pharmacy_setup'),
    
    # Pharmacy Admin Authentication
    path('signup/', views.PharmacyAdminSignupView.as_view(), name='pharmacy_admin_signup'),
    path('profile/', views.PharmacyAdminProfileView.as_view(), name='pharmacy_admin_profile'),
    
    # Pharmacy ID Validation
    path('validate-id/<str:pharmacy_id>/', views.validate_pharmacy_id, name='validate_pharmacy_id'),
    
    # Patient Management
    path('link-patient/', views.link_patient_to_pharmacy, name='link_patient_to_pharmacy'),
    path('patients/', views.PharmacyAdminPatientsView.as_view(), name='pharmacy_admin_patients'),
    
    # Adverse Reactions
    path('adverse-reactions/', views.AdverseReactionListCreateView.as_view(), name='adverse_reactions'),
    path('adverse-reactions/<int:pk>/', views.AdverseReactionDetailView.as_view(), name='adverse_reaction_detail'),
    
    # Dashboard
    path('dashboard/', views.pharmacy_admin_dashboard, name='pharmacy_admin_dashboard'),
    
    # Location Options
    path('location-options/', views.get_location_options, name='get_location_options'),
]
