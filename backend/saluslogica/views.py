"""
Pharmacy Admin Views and Custom Error Handlers
"""

from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, F
from django.shortcuts import render

User = get_user_model()


# ============================================================
# Custom Error Handlers
# ============================================================

def handler404(request, exception=None):
    """Custom 404 error handler"""
    return render(request, '404.html', status=404)


def handler500(request):
    """Custom 500 error handler"""
    return render(request, '500.html', status=500)


def handler403(request, exception=None):
    """Custom 403 error handler"""
    return render(request, '403.html', status=403)


# ============================================================
# Pharmacy Admin Views
# ============================================================

from .models import PharmacyAdmin, PatientPharmacyAssociation, AdverseReaction
from .serializers import (
    PharmacyAdminSignupSerializer, PharmacyAdminSerializer,
    PatientPharmacyAssociationSerializer, AdverseReactionSerializer,
    AdverseReactionCreateSerializer, PharmacyAdminPatientSerializer
)


class PharmacyAdminSignupView(generics.CreateAPIView):
    """View for pharmacy admin signup"""
    
    serializer_class = PharmacyAdminSignupSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            logger.error(f"Serializer validation errors: {serializer.errors}")
            
            # Extract non_field_errors and field errors
            non_field_errors = serializer.errors.get('non_field_errors', [])
            field_errors = {k: v for k, v in serializer.errors.items() if k != 'non_field_errors'}
            
            return Response(
                {
                    'success': False, 
                    'errors': field_errors,
                    'non_field_errors': non_field_errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pharmacy_admin = serializer.save()
            
            # Return success response with pharmacy ID
            response_data = {
                'success': True,
                'message': 'Pharmacy admin account created successfully',
                'pharmacy_id': pharmacy_admin.pharmacy_id,
                'user': {
                    'id': pharmacy_admin.user.id,
                    'username': pharmacy_admin.user.username,
                    'email': pharmacy_admin.user.email,
                }
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating pharmacy admin: {str(e)}", exc_info=True)
            return Response(
                {'success': False, 'error': str(e), 'errors': {'non_field_errors': [str(e)]}},
                status=status.HTTP_400_BAD_REQUEST
            )


class PharmacyAdminProfileView(generics.RetrieveUpdateAPIView):
    """View for pharmacy admin profile management"""
    
    serializer_class = PharmacyAdminSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Get the pharmacy admin profile for the current user"""
        try:
            return PharmacyAdmin.objects.get(user=self.request.user)
        except PharmacyAdmin.DoesNotExist:
            return Response(
                {'error': 'Pharmacy admin profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def validate_pharmacy_id(request, pharmacy_id):
    """Validate pharmacy admin ID format"""
    
    from .utils.pharmacy_id_generator import PharmacyAdminIDGenerator
    
    generator = PharmacyAdminIDGenerator()
    
    try:
        # Parse the ID to get components
        parsed = generator.parse_id(pharmacy_id)
        
        # Check if pharmacy admin exists
        pharmacy_admin_exists = PharmacyAdmin.objects.filter(
            pharmacy_id=pharmacy_id
        ).exists()
        
        response_data = {
            'valid': True,
            'parsed': parsed,
            'exists': pharmacy_admin_exists
        }
        
        return Response(response_data)
        
    except (ValueError, KeyError) as e:
        return Response({
            'valid': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def link_patient_to_pharmacy(request):
    """Link a patient to a pharmacy admin"""
    
    pharmacy_id = request.data.get('pharmacy_id')
    patient_username = request.data.get('patient_username')
    consent_given = request.data.get('consent_given', False)
    notes = request.data.get('notes', '')
    
    if not pharmacy_id or not patient_username:
        return Response(
            {'error': 'Pharmacy ID and patient username are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Get pharmacy admin
        pharmacy_admin = PharmacyAdmin.objects.get(pharmacy_id=pharmacy_id)
        
        # Get patient
        patient = User.objects.get(username=patient_username)
        
        # Check if association already exists
        association, created = PatientPharmacyAssociation.objects.get_or_create(
            patient=patient,
            pharmacy_admin=pharmacy_admin,
            defaults={
                'consent_given': consent_given,
                'notes': notes
            }
        )
        
        if not created:
            return Response({
                'error': 'Patient is already linked to this pharmacy admin'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = PatientPharmacyAssociationSerializer(association)
        
        return Response({
            'success': True,
            'message': 'Patient linked to pharmacy admin successfully',
            'association': serializer.data
        })
        
    except PharmacyAdmin.DoesNotExist:
        return Response(
            {'error': 'Pharmacy admin not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except User.DoesNotExist:
        return Response(
            {'error': 'Patient not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


class PharmacyAdminPatientsView(generics.ListAPIView):
    """View for pharmacy admin to see their patients"""
    
    serializer_class = PharmacyAdminPatientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active']
    
    def get_queryset(self):
        """Get patients associated with the pharmacy admin"""
        try:
            pharmacy_admin = PharmacyAdmin.objects.get(user=self.request.user)
            return User.objects.filter(
                pharmacy_associations__pharmacy_admin=pharmacy_admin,
                pharmacy_associations__is_active=True
            ).distinct()
        except PharmacyAdmin.DoesNotExist:
            return User.objects.none()


class AdverseReactionListCreateView(generics.ListCreateAPIView):
    """View for listing and creating adverse reactions"""
    
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['severity', 'reaction_type', 'is_resolved']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdverseReactionCreateSerializer
        return AdverseReactionSerializer
    
    def get_queryset(self):
        """Get adverse reactions based on user role"""
        user = self.request.user
        
        try:
            pharmacy_admin = PharmacyAdmin.objects.get(user=user)
            # Pharmacy admin can see reactions from their patients
            return AdverseReaction.objects.filter(
                patient__pharmacy_associations__pharmacy_admin=pharmacy_admin
            ).distinct()
        except PharmacyAdmin.DoesNotExist:
            # Regular user can only see their own reactions
            return AdverseReaction.objects.filter(patient=user)
    
    def perform_create(self, serializer):
        """Create adverse reaction with appropriate pharmacy admin"""
        user = self.request.user
        
        # First check if the user IS a pharmacy admin
        try:
            pharmacy_admin = PharmacyAdmin.objects.get(user=user)
            serializer.save(patient=user, pharmacy_admin=pharmacy_admin)
            return
        except PharmacyAdmin.DoesNotExist:
            pass
        
        # For regular patients, find their associated pharmacy admin
        assoc = PatientPharmacyAssociation.objects.filter(
            patient=user, is_active=True
        ).first()
        if assoc:
            serializer.save(patient=user, pharmacy_admin=assoc.pharmacy_admin)
        else:
            serializer.save(patient=user)


class AdverseReactionDetailView(generics.RetrieveUpdateAPIView):
    """View for adverse reaction details"""
    
    serializer_class = AdverseReactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get adverse reactions based on user role"""
        user = self.request.user
        
        try:
            pharmacy_admin = PharmacyAdmin.objects.get(user=user)
            return AdverseReaction.objects.filter(
                patient__pharmacy_associations__pharmacy_admin=pharmacy_admin
            ).distinct()
        except PharmacyAdmin.DoesNotExist:
            return AdverseReaction.objects.filter(patient=user)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pharmacy_admin_patient_detail(request, patient_id):
    """Get detailed info for a specific patient managed by this pharmacy admin"""
    try:
        pharmacy_admin = PharmacyAdmin.objects.get(user=request.user)
    except PharmacyAdmin.DoesNotExist:
        return Response({'error': 'Not a pharmacy admin'}, status=status.HTTP_403_FORBIDDEN)

    # Verify this patient belongs to this pharmacy admin
    assoc = PatientPharmacyAssociation.objects.filter(
        pharmacy_admin=pharmacy_admin, patient_id=patient_id
    ).first()
    if not assoc:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

    patient = assoc.patient
    # Get side effects for this patient
    reactions = AdverseReaction.objects.filter(patient=patient)

    return Response({
        'id': patient.id,
        'username': patient.username,
        'email': patient.email,
        'first_name': patient.first_name,
        'last_name': patient.last_name,
        'date_joined': patient.date_joined,
        'is_active': patient.is_active,
        'assigned_date': assoc.assigned_date,
        'is_active_association': assoc.is_active,
        'consent_given': assoc.consent_given,
        'side_effects_count': reactions.count(),
        'unresolved_side_effects': reactions.filter(is_resolved=False).count(),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pharmacy_admin_patient_medicines(request, patient_id):
    """Get medicines for a specific patient managed by this pharmacy admin"""
    from apps.medicines.models import Medicine

    try:
        pharmacy_admin = PharmacyAdmin.objects.get(user=request.user)
    except PharmacyAdmin.DoesNotExist:
        return Response({'error': 'Not a pharmacy admin'}, status=status.HTTP_403_FORBIDDEN)

    # Verify this patient belongs to this pharmacy admin
    assoc = PatientPharmacyAssociation.objects.filter(
        pharmacy_admin=pharmacy_admin, patient_id=patient_id
    ).first()
    if not assoc:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

    medicines = Medicine.objects.filter(user_id=patient_id).order_by('-is_active', 'name')
    data = []
    for med in medicines:
        data.append({
            'id': med.id,
            'name': med.name,
            'scientific_name': med.scientific_name or '',
            'dosage': med.dosage,
            'frequency': med.get_frequency_display(),
            'times': med.times,
            'start_date': med.start_date,
            'end_date': med.end_date,
            'is_active': med.is_active,
            'prescribed_for': med.prescribed_for or '',
            'prescribing_doctor': med.prescribing_doctor or '',
            'instructions': med.instructions or '',
        })

    return Response({
        'patient_id': patient_id,
        'patient_username': assoc.patient.username,
        'medicines': data,
        'total': len(data),
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pharmacy_admin_dashboard(request):
    """Get pharmacy admin dashboard data"""
    
    try:
        pharmacy_admin = PharmacyAdmin.objects.get(user=request.user)
        
        # Get patient statistics
        total_patients = pharmacy_admin.patient_count
        active_patients = pharmacy_admin.active_patient_count
        
        # Get adverse reaction statistics
        adverse_reactions = AdverseReaction.objects.filter(
            patient__pharmacy_associations__pharmacy_admin=pharmacy_admin
        ).distinct()
        
        total_reactions = adverse_reactions.count()
        severe_reactions = adverse_reactions.filter(severity='severe').count()
        unresolved_reactions = adverse_reactions.filter(is_resolved=False).count()
        
        # Get recent reactions
        recent_reactions = adverse_reactions.order_by('-reported_date')[:5]
        recent_serializer = AdverseReactionSerializer(recent_reactions, many=True)
        
        # Get recent patients
        recent_associations = PatientPharmacyAssociation.objects.filter(
            pharmacy_admin=pharmacy_admin
        ).order_by('-assigned_date')[:5]
        recent_patients = []
        for assoc in recent_associations:
            recent_patients.append({
                'username': assoc.patient.username,
                'email': assoc.patient.email,
                'assigned_date': assoc.assigned_date,
                'consent_given': assoc.consent_given
            })
        
        dashboard_data = {
            'pharmacy_info': PharmacyAdminSerializer(pharmacy_admin).data,
            'statistics': {
                'total_patients': total_patients,
                'active_patients': active_patients,
                'total_reactions': total_reactions,
                'severe_reactions': severe_reactions,
                'unresolved_reactions': unresolved_reactions,
            },
            'recent_reactions': recent_serializer.data,
            'recent_patients': recent_patients
        }
        
        return Response(dashboard_data)
        
    except PharmacyAdmin.DoesNotExist:
        return Response(
            {'error': 'Pharmacy admin profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_location_options(request):
    """Get available location options for pharmacy admin signup"""
    
    try:
        from .utils.pharmacy_id_generator import PharmacyAdminIDGenerator
        
        generator = PharmacyAdminIDGenerator()
        
        return Response({
            'success': True,
            'countries': generator.get_available_countries(),
            'provinces': generator.get_available_provinces(),
            'districts': {
                'Kigali': generator.get_available_districts('Kigali'),
                'Northern': generator.get_available_districts('Northern'),
                'Southern': generator.get_available_districts('Southern'),
                'Eastern': generator.get_available_districts('Eastern'),
                'Western': generator.get_available_districts('Western'),
            },
            'facility_types': [
                {'value': 'pharmacy', 'label': 'Pharmacy'},
                {'value': 'hospital', 'label': 'Hospital'}
            ]
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def test_pharmacy_setup(request):
    """Test endpoint to verify pharmacy admin setup"""
    
    try:
        from .utils.pharmacy_id_generator import PharmacyAdminIDGenerator
        
        generator = PharmacyAdminIDGenerator()
        
        # Test ID generation
        test_id = generator.generate_id(
            country='RW',
            province='Kigali',
            district='Nyarugenge',
            facility_type='pharmacy'
        )
        
        # Test parsing
        parsed = generator.parse_id(test_id)
        
        # Test validation
        is_valid = generator.validate_id(test_id)
        
        # Get database stats
        from .models import PharmacyAdmin
        pharmacy_admin_count = PharmacyAdmin.objects.count()
        
        return Response({
            'success': True,
            'message': 'Pharmacy admin setup is working correctly',
            'test_id': test_id,
            'parsed_id': parsed,
            'is_valid': is_valid,
            'pharmacy_admin_count': pharmacy_admin_count,
            'location_options': {
                'countries': generator.get_available_countries(),
                'provinces': generator.get_available_provinces(),
                'districts': {
                    'Kigali': generator.get_available_districts('Kigali'),
                    'Northern': generator.get_available_districts('Northern'),
                    'Southern': generator.get_available_districts('Southern'),
                    'Eastern': generator.get_available_districts('Eastern'),
                    'Western': generator.get_available_districts('Western'),
                }
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def drug_info_lookup(request):
    """
    Look up comprehensive drug information for pharmacy admins.
    
    Combines data from:
    - Rwanda FDA registry (manufacturer, strength, form, country, registration)
    - OpenFDA (contraindications, warnings, interactions, dosage info)
    
    Query Parameters:
        q (str): Drug name to search for (brand or generic)
    
    Returns comprehensive drug information including Rwanda registration details.
    """
    query = request.query_params.get('q', '').strip()
    
    if not query:
        return Response({
            'error': 'Query parameter "q" is required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if user is pharmacy admin
    try:
        pharmacy_admin = PharmacyAdmin.objects.get(user=request.user)
    except PharmacyAdmin.DoesNotExist:
        return Response({
            'error': 'Only pharmacy admins can access this endpoint.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    from apps.medicines.barcode_lookup import (
        search_rwanda_registry,
        search_rwanda_registry_by_generic,
        lookup_by_name
    )
    
    result = {
        'query': query,
        'rwanda_registry': None,
        'openfda': None,
        'combined': {}
    }
    
    # Search Rwanda FDA registry
    rwanda_drug = search_rwanda_registry(query)
    if not rwanda_drug:
        # Try generic name search
        generic_matches = search_rwanda_registry_by_generic(query)
        if generic_matches:
            rwanda_drug = generic_matches[0]
    
    if rwanda_drug:
        result['rwanda_registry'] = {
            'found': True,
            'registration_number': rwanda_drug.get('registration_number', ''),
            'brand_name': rwanda_drug.get('brand_name', ''),
            'generic_name': rwanda_drug.get('generic_name', ''),
            'strength': rwanda_drug.get('strength', ''),
            'form': rwanda_drug.get('form', ''),
            'manufacturer': rwanda_drug.get('manufacturer', ''),
            'country_of_origin': rwanda_drug.get('country', ''),
            'is_registered_in_rwanda': True
        }
        
        # Use generic name from Rwanda registry to search OpenFDA
        generic_name = rwanda_drug.get('generic_name', '')
        if generic_name:
            openfda_results = lookup_by_name(generic_name)
            if openfda_results:
                openfda_data = openfda_results[0]
                result['openfda'] = {
                    'found': True,
                    'name': openfda_data.get('name', ''),
                    'scientific_name': openfda_data.get('scientific_name', ''),
                    'dosage': openfda_data.get('dosage', ''),
                    'instructions': openfda_data.get('instructions', ''),
                    'warnings': openfda_data.get('notes', ''),
                    'route': openfda_data.get('route', ''),
                    'manufacturer': openfda_data.get('manufacturer', ''),
                    'ndc': openfda_data.get('ndc', '')
                }
    else:
        # No Rwanda registry match, try OpenFDA directly
        openfda_results = lookup_by_name(query)
        if openfda_results:
            openfda_data = openfda_results[0]
            result['openfda'] = {
                'found': True,
                'name': openfda_data.get('name', ''),
                'scientific_name': openfda_data.get('scientific_name', ''),
                'dosage': openfda_data.get('dosage', ''),
                'instructions': openfda_data.get('instructions', ''),
                'warnings': openfda_data.get('notes', ''),
                'route': openfda_data.get('route', ''),
                'manufacturer': openfda_data.get('manufacturer', ''),
                'ndc': openfda_data.get('ndc', '')
            }
        
        result['rwanda_registry'] = {
            'found': False,
            'message': 'Drug not found in Rwanda FDA registry'
        }
    
    # Combine data for easy access
    rwanda = result['rwanda_registry'] or {}
    openfda = result['openfda'] or {}
    
    result['combined'] = {
        'brand_name': rwanda.get('brand_name') or openfda.get('name') or query,
        'generic_name': rwanda.get('generic_name') or openfda.get('scientific_name') or '',
        'strength': rwanda.get('strength') or openfda.get('dosage') or '',
        'form': rwanda.get('form') or '',
        'manufacturer': rwanda.get('manufacturer') or openfda.get('manufacturer') or '',
        'country_of_origin': rwanda.get('country_of_origin') or '',
        'registration_number': rwanda.get('registration_number') or '',
        'is_registered_in_rwanda': rwanda.get('is_registered_in_rwanda', False),
        'route': openfda.get('route') or '',
        'instructions': openfda.get('instructions') or '',
        'warnings': openfda.get('warnings') or '',
        'ndc': openfda.get('ndc') or ''
    }
    
    return Response(result)


# ============================================================
# Pharmacy Admin Reports
# ============================================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def pharmacy_admin_reports(request):
    """
    Comprehensive reports data for pharmacy admin.
    Returns aggregated statistics on patients, adverse reactions,
    medications, and trends over time.
    """
    from apps.medicines.models import Medicine
    from collections import defaultdict
    from datetime import timedelta
    from django.utils import timezone

    try:
        pharmacy_admin = PharmacyAdmin.objects.get(user=request.user)
    except PharmacyAdmin.DoesNotExist:
        return Response({'error': 'Not a pharmacy admin'}, status=status.HTTP_403_FORBIDDEN)

    now = timezone.now()

    # ── patient associations ──
    associations = PatientPharmacyAssociation.objects.filter(pharmacy_admin=pharmacy_admin)
    patient_ids = list(associations.values_list('patient_id', flat=True))
    active_assocs = associations.filter(is_active=True)
    inactive_assocs = associations.filter(is_active=False)
    consent_count = associations.filter(consent_given=True).count()

    # ── adverse reactions queryset (only from linked patients) ──
    reactions = AdverseReaction.objects.filter(
        patient__pharmacy_associations__pharmacy_admin=pharmacy_admin
    ).distinct()

    total_reactions = reactions.count()
    resolved_reactions = reactions.filter(is_resolved=True).count()
    unresolved_reactions = reactions.filter(is_resolved=False).count()
    follow_up_needed = reactions.filter(requires_follow_up=True, is_resolved=False).count()

    # severity breakdown
    severity_counts = dict(
        reactions.values_list('severity')
        .annotate(cnt=Count('id'))
        .values_list('severity', 'cnt')
    )

    # reaction type breakdown
    reaction_type_counts = dict(
        reactions.values_list('reaction_type')
        .annotate(cnt=Count('id'))
        .values_list('reaction_type', 'cnt')
    )

    # outcome breakdown
    outcome_counts = dict(
        reactions.values_list('outcome')
        .annotate(cnt=Count('id'))
        .values_list('outcome', 'cnt')
    )

    # top medications by adverse-reaction count
    top_medications_rx = list(
        reactions.values('medication_name')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # monthly trend (last 12 months)
    monthly_reactions = []
    for i in range(11, -1, -1):
        start = (now - timedelta(days=30 * (i + 1))).replace(hour=0, minute=0, second=0, microsecond=0)
        end = (now - timedelta(days=30 * i)).replace(hour=0, minute=0, second=0, microsecond=0)
        month_label = end.strftime('%b %Y')
        cnt = reactions.filter(reported_date__gte=start, reported_date__lt=end).count()
        monthly_reactions.append({'month': month_label, 'count': cnt})

    # recent reactions (last 10)
    recent_reactions = []
    for rx in reactions.order_by('-reported_date')[:10]:
        full_name = f"{rx.patient.first_name} {rx.patient.last_name}".strip() or rx.patient.username
        recent_reactions.append({
            'id': rx.id,
            'patient_name': full_name,
            'medication_name': rx.medication_name,
            'severity': rx.severity,
            'reaction_type': rx.reaction_type,
            'outcome': rx.outcome,
            'is_resolved': rx.is_resolved,
            'reported_date': rx.reported_date,
            'symptoms': rx.symptoms[:120] if rx.symptoms else '',
        })

    # ── patients with most side effects ──
    patients_top_rx = list(
        reactions.values('patient__id', 'patient__username', 'patient__first_name', 'patient__last_name')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    patients_top_rx_list = []
    for p in patients_top_rx:
        full_name = f"{p['patient__first_name'] or ''} {p['patient__last_name'] or ''}".strip()
        patients_top_rx_list.append({
            'id': p['patient__id'],
            'username': p['patient__username'],
            'full_name': full_name or p['patient__username'],
            'reaction_count': p['count'],
        })

    # ── medication stats across all patients ──
    all_medicines = Medicine.objects.filter(user_id__in=patient_ids)
    total_medicines = all_medicines.count()
    active_medicines = all_medicines.filter(is_active=True).count()
    inactive_medicines = all_medicines.filter(is_active=False).count()

    # most common medications prescribed to patients
    top_medications_prescribed = list(
        all_medicines.values('name')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # patients by medicine count
    patients_by_med_count = list(
        all_medicines.values('user__id', 'user__username', 'user__first_name', 'user__last_name')
        .annotate(med_count=Count('id'))
        .order_by('-med_count')[:10]
    )
    patients_med_list = []
    for p in patients_by_med_count:
        full_name = f"{p['user__first_name'] or ''} {p['user__last_name'] or ''}".strip()
        patients_med_list.append({
            'id': p['user__id'],
            'username': p['user__username'],
            'full_name': full_name or p['user__username'],
            'medicine_count': p['med_count'],
        })

    # ── build response ──
    return Response({
        'patients': {
            'total': len(patient_ids),
            'active': active_assocs.count(),
            'inactive': inactive_assocs.count(),
            'with_consent': consent_count,
            'top_by_reactions': patients_top_rx_list,
            'top_by_medicines': patients_med_list,
        },
        'adverse_reactions': {
            'total': total_reactions,
            'resolved': resolved_reactions,
            'unresolved': unresolved_reactions,
            'follow_up_needed': follow_up_needed,
            'by_severity': {
                'mild': severity_counts.get('mild', 0),
                'moderate': severity_counts.get('moderate', 0),
                'severe': severity_counts.get('severe', 0),
                'life_threatening': severity_counts.get('life_threatening', 0),
            },
            'by_type': {
                'allergic': reaction_type_counts.get('allergic', 0),
                'side_effect': reaction_type_counts.get('side_effect', 0),
                'adverse_event': reaction_type_counts.get('adverse_event', 0),
                'medication_error': reaction_type_counts.get('medication_error', 0),
                'other': reaction_type_counts.get('other', 0),
            },
            'by_outcome': outcome_counts,
            'top_medications': top_medications_rx,
            'monthly_trend': monthly_reactions,
            'recent': recent_reactions,
        },
        'medications': {
            'total': total_medicines,
            'active': active_medicines,
            'inactive': inactive_medicines,
            'top_prescribed': top_medications_prescribed,
        },
        'generated_at': now.isoformat(),
    })