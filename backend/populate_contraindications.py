"""
Sample script to populate contraindication data for testing.
Run this from Django shell: python manage.py shell < populate_contraindications.py
"""

from apps.medicines.models import Drug, Contraindication

# Create sample drugs
drugs_data = [
    {
        'name': 'Warfarin',
        'generic_name': 'Warfarin Sodium',
        'atc_code': 'B01AA03',
        'is_registered_in_rwanda': True,
        'is_essential_in_rwanda': False
    },
    {
        'name': 'Methotrexate',
        'generic_name': 'Methotrexate',
        'atc_code': 'L01BA01',
        'is_registered_in_rwanda': True,
        'is_essential_in_rwanda': False
    },
    {
        'name': 'Aspirin',
        'generic_name': 'Acetylsalicylic Acid',
        'atc_code': 'N02BA01',
        'is_registered_in_rwanda': True,
        'is_essential_in_rwanda': True
    },
    {
        'name': 'Ibuprofen',
        'generic_name': 'Ibuprofen',
        'atc_code': 'M01AE01',
        'is_registered_in_rwanda': True,
        'is_essential_in_rwanda': True
    },
    {
        'name': 'Paracetamol',
        'generic_name': 'Paracetamol',
        'atc_code': 'N02BE01',
        'is_registered_in_rwanda': True,
        'is_essential_in_rwanda': True
    }
]

print("Creating drugs...")
for drug_data in drugs_data:
    drug, created = Drug.objects.get_or_create(
        name=drug_data['name'],
        defaults=drug_data
    )
    if created:
        print(f"  Created: {drug.name}")
    else:
        print(f"  Already exists: {drug.name}")

# Create contraindications
contraindications_data = [
    # Warfarin contraindications
    {
        'drug_name': 'Warfarin',
        'population': 'pregnant',
        'condition': 'Pregnancy',
        'severity': 'absolute',
        'description': 'Warfarin crosses the placental barrier and can cause fetal warfarin syndrome, including nasal hypoplasia and bone abnormalities. Use only in life-threatening situations.',
        'source': 'WHO Essential Medicines Guidelines'
    },
    {
        'drug_name': 'Warfarin',
        'population': 'lactating',
        'condition': 'Breastfeeding',
        'severity': 'relative',
        'description': 'Small amounts of warfarin are excreted in breast milk. Monitor infant for bleeding.',
        'source': 'WHO Guidelines'
    },
    {
        'drug_name': 'Warfarin',
        'population': 'elderly',
        'condition': 'Advanced Age',
        'severity': 'relative',
        'description': 'Elderly patients are more sensitive to anticoagulant effects. Requires more frequent monitoring and potentially lower doses.',
        'source': 'Geriatric Dosing Guidelines'
    },
    
    # Methotrexate contraindications
    {
        'drug_name': 'Methotrexate',
        'population': 'pregnant',
        'condition': 'Pregnancy',
        'severity': 'absolute',
        'description': 'Methotrexate is highly teratogenic and causes severe birth defects, fetal death. Absolutely contraindicated in pregnancy.',
        'source': 'Rwanda FDA'
    },
    {
        'drug_name': 'Methotrexate',
        'population': 'lactating',
        'condition': 'Breastfeeding',
        'severity': 'absolute',
        'description': 'Methotrexate is excreted in breast milk and can cause serious adverse reactions in nursing infants.',
        'source': 'Rwanda FDA'
    },
    
    # Aspirin contraindications
    {
        'drug_name': 'Aspirin',
        'population': 'infant_toddler',
        'condition': "Reye's Syndrome Risk",
        'severity': 'absolute',
        'description': "Aspirin use in children under 12 years old is associated with Reye's syndrome, a rare but serious condition affecting the liver and brain.",
        'source': 'WHO Pediatric Guidelines'
    },
    {
        'drug_name': 'Aspirin',
        'population': 'child',
        'condition': "Reye's Syndrome Risk",
        'severity': 'absolute',
        'description': "Aspirin should not be given to children under 12 years except under specialist supervision.",
        'source': 'WHO Pediatric Guidelines'
    },
    {
        'drug_name': 'Aspirin',
        'population': 'pregnant',
        'condition': 'Third Trimester Pregnancy',
        'severity': 'relative',
        'description': 'High-dose aspirin in late pregnancy may cause premature closure of fetal ductus arteriosus and bleeding complications.',
        'source': 'WHO Pregnancy Guidelines'
    },
    
    # Ibuprofen contraindications
    {
        'drug_name': 'Ibuprofen',
        'population': 'pregnant',
        'condition': 'Third Trimester Pregnancy',
        'severity': 'absolute',
        'description': 'NSAIDs like ibuprofen can cause premature closure of the ductus arteriosus and oligohydramnios in the third trimester.',
        'source': 'WHO Pregnancy Guidelines'
    },
    {
        'drug_name': 'Ibuprofen',
        'population': 'infant_toddler',
        'condition': 'Infants under 6 months',
        'severity': 'absolute',
        'description': 'Ibuprofen is not recommended for infants under 6 months of age. Use paracetamol instead.',
        'source': 'Rwanda Pediatric Formulary'
    },
]

print("\nCreating contraindications...")
for contra_data in contraindications_data:
    try:
        drug = Drug.objects.get(name=contra_data['drug_name'])
        contraindication, created = Contraindication.objects.get_or_create(
            drug=drug,
            population=contra_data['population'],
            condition=contra_data['condition'],
            defaults={
                'severity': contra_data['severity'],
                'description': contra_data['description'],
                'source': contra_data['source']
            }
        )
        if created:
            print(f"  Created: {drug.name} - {contra_data['population']} - {contra_data['condition']}")
        else:
            print(f"  Already exists: {drug.name} - {contra_data['population']}")
    except Drug.DoesNotExist:
        print(f"  ERROR: Drug '{contra_data['drug_name']}' not found")

print("\n✓ Data population complete!")
print(f"  Total drugs: {Drug.objects.count()}")
print(f"  Total contraindications: {Contraindication.objects.count()}")
