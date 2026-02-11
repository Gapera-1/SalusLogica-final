from celery import shared_task
from django.contrib.auth import get_user_model
from .models import DrugInteraction, Contraindication, DrugDatabase, InteractionCheck

User = get_user_model()


@shared_task
def check_drug_interactions(user_id, medicine_ids):
    """Check for drug interactions between specified medicines"""
    try:
        user = User.objects.get(id=user_id)
        
        # Get medicines
        from apps.medicines.models import Medicine
        medicines = Medicine.objects.filter(id__in=medicine_ids, user=user)
        
        if medicines.count() < 2:
            return {'interactions': [], 'message': 'Need at least 2 medicines to check interactions'}
        
        interactions_found = []
        
        # Check pairwise interactions
        for i, med1 in enumerate(medicines):
            for med2 in medicines[i+1:]:
                interactions = DrugInteraction.objects.filter(
                    models.Q(medicine1__icontains=med1.name, medicine2__icontains=med2.name) |
                    models.Q(medicine1__icontains=med2.name, medicine2__icontains=med1.name)
                ).order_by('-severity')
                
                for interaction in interactions:
                    interactions_found.append({
                        'medicine1': med1.name,
                        'medicine2': med2.name,
                        'severity': interaction.severity,
                        'description': interaction.description,
                        'recommendation': interaction.recommendation,
                        'interaction_type': interaction.interaction_type,
                    })
        
        # Save interaction check record
        check_record = InteractionCheck.objects.create(
            user=user,
            medicines=list(medicines.values_list('name', flat=True)),
            interactions_found=interactions_found
        )
        
        return {
            'check_id': check_record.id,
            'interactions': interactions_found,
            'total_interactions': len(interactions_found)
        }
        
    except User.DoesNotExist:
        return {'error': 'User not found'}
    except Exception as e:
        return {'error': str(e)}


@shared_task
def initialize_drug_database():
    """Initialize the drug database with common medications"""
    # This would typically be populated from a reliable drug database source
    # For demo purposes, we'll add some common medications
    
    common_drugs = [
        {
            'generic_name': 'Aspirin',
            'brand_names': ['Ecotrin', 'Bayer Aspirin', 'Bufferin'],
            'drug_class': 'NSAID',
            'atc_code': 'N02BA01',
            'description': 'Nonsteroidal anti-inflammatory drug used for pain relief, fever reduction, and anti-inflammatory purposes.',
            'food_interactions': ['Alcohol increases risk of stomach bleeding'],
            'alcohol_interaction': True,
        },
        {
            'generic_name': 'Ibuprofen',
            'brand_names': ['Advil', 'Motrin', 'Nuprin'],
            'drug_class': 'NSAID',
            'atc_code': 'M01AE01',
            'description': 'Nonsteroidal anti-inflammatory drug used for pain relief, fever reduction, and anti-inflammatory purposes.',
            'food_interactions': ['Take with food to reduce stomach upset'],
            'alcohol_interaction': True,
        },
        {
            'generic_name': 'Acetaminophen',
            'brand_names': ['Tylenol', 'Panadol', 'Actamin'],
            'drug_class': 'Analgesic',
            'atc_code': 'N02BE01',
            'description': 'Pain reliever and fever reducer.',
            'food_interactions': ['Alcohol increases risk of liver damage'],
            'alcohol_interaction': True,
        },
        {
            'generic_name': 'Lisinopril',
            'brand_names': ['Zestril', 'Prinivil'],
            'drug_class': 'ACE Inhibitor',
            'atc_code': 'C09AA03',
            'description': 'Angiotensin-converting enzyme inhibitor used to treat high blood pressure and heart failure.',
            'food_interactions': ['Potassium supplements may increase potassium levels'],
            'alcohol_interaction': False,
        },
        {
            'generic_name': 'Metformin',
            'brand_names': ['Glucophage', 'Fortamet', 'Riomet'],
            'drug_class': 'Biguanide',
            'atc_code': 'A10BA02',
            'description': 'Oral diabetes medication that helps control blood sugar levels.',
            'food_interactions': ['Take with meals to reduce gastrointestinal side effects'],
            'alcohol_interaction': True,  'description': 'Angiotensin-converting enzyme inhibitor used to treat high blood pressure and heart failure.',
            'food_interactions': ['Potassium supplements may increase potassium levels'],
            'alcohol_interaction': False,
        },
        {
            'generic_name': 'Metformin',
            'brand_names': ['Glucophage', 'Fortamet', 'Riomet'],
            'drug_class': 'Biguanide',
            'atc_code': 'A10BA02',
            'description': 'Oral diabetes medication that helps control blood sugar levels.',
            'food_interactions': ['Take with meals to reduce gastrointestinal side effects'],
            'alcohol_interaction': True,
        },
    ]
    
    created_count = 0
    for drug_data in common_drugs:
        drug, created = DrugDatabase.objects.get_or_create(
            generic_name=drug_data['generic_name'],
            defaults=drug_data
        )
        if created:
            created_count += 1
    
    return f"Initialized {created_count} drugs in database"


@shared_task
def add_common_interactions():
    """Add common drug interactions to the database"""
    from django.db import models
    
    common_interactions = [
        {
            'medicine1': 'Aspirin',
            'medicine2': 'Ibuprofen',
            'interaction_type': 'drug_drug',
            'severity': 'high',
            'description': 'Taking aspirin and ibuprofen together increases the risk of gastrointestinal bleeding and stomach ulcers.',
            'recommendation': 'Avoid taking these medications together. If both are necessary, take them at different times and with food.',
            'sources': 'FDA Drug Interactions Guide',
        },
        {
            'medicine1': 'Lisinopril',
            'medicine2': 'Potassium',
            'interaction_type': 'drug_drug',
            'severity': 'medium',
            'description': 'ACE inhibitors like lisinopril can cause potassium retention. Taking potassium supplements can lead to hyperkalemia.',
            'recommendation': 'Avoid potassium supplements while taking lisinopril unless specifically prescribed by your doctor.',
            'sources': 'Clinical Pharmacology',
        },
        {
            'medicine1': 'Metformin',
            'medicine2': 'Alcohol',
            'interaction_type': 'drug_alcohol',
            'severity': 'medium',
            'description': 'Alcohol can increase the risk of lactic acidosis when combined with metformin.',
            'recommendation': 'Limit alcohol consumption while taking metformin. Avoid excessive alcohol intake.',
            'sources': 'Diabetes Care Guidelines',
        },
    ]
    
    created_count = 0
    for interaction_data in common_interactions:
        interaction, created = DrugInteraction.objects.get_or_create(
            medicine1=interaction_data['medicine1'],
            medicine2=interaction_data['medicine2'],
            defaults=interaction_data
        )
        if created:
            created_count += 1
    
    return f"Added {created_count} common drug interactions"


@shared_task
def add_common_contraindications():
    """Add common contraindications to the database"""
    common_contraindications = [
        {
            'medicine': 'Aspirin',
            'condition': 'Peptic Ulcer Disease',
            'severity': 'high',
            'description': 'Aspirin can worsen peptic ulcers and cause gastrointestinal bleeding.',
            'recommendation': 'Avoid aspirin if you have active peptic ulcer disease. Use alternative pain relievers.',
            'sources': 'Gastroenterology Guidelines',
        },
        {
            'medicine': 'Lisinopril',
            'condition': 'Pregnancy',
            'severity': 'critical',
            'description': 'ACE inhibitors can cause birth defects and fetal death when used during pregnancy, especially in the second and third trimesters.',
            'recommendation': 'Do not use lisinopril during pregnancy. Use alternative blood pressure medications.',
            'sources': 'FDA Pregnancy Categories',
        },
        {
            'medicine': 'Metformin',
            'condition': 'Kidney Disease',
            'severity': 'high',
            'description': 'Metformin can accumulate in patients with severe kidney disease, increasing the risk of lactic acidosis.',
            'recommendation': 'Avoid metformin in severe kidney disease (eGFR < 30 mL/min/1.73m²). Use alternative diabetes medications.',
            'sources': 'American Diabetes Association Guidelines',
        },
    ]
    
    created_count = 0
    for contra_data in common_contraindications:
        contraindication, created = Contraindication.objects.get_or_create(
            medicine=contra_data['medicine'],
            condition=contra_data['condition'],
            defaults=contra_data
        )
        if created:
            created_count += 1
    
    return f"Added {created_count} common contraindications"
