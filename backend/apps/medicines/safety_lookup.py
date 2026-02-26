"""
Safety lookup utilities using Rwanda FDA-first strategy.

This module provides contraindication and food interaction lookups that:
1. First search Rwanda FDA by brand name
2. Extract generic name from Rwanda FDA
3. Use generic name to search OpenFDA for detailed safety info
4. Return OpenFDA results with Rwanda FDA metadata
"""

import logging
import requests
from typing import Optional
from django.db.models import Q

from .models import RwandaFDADrug
from .barcode_lookup import search_rwanda_registry, OPENFDA_BASE, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


def get_generic_name_from_rwanda(brand_name: str) -> Optional[str]:
    """
    Get generic name from Rwanda FDA by brand name.
    This is the first step in the Rwanda FDA-first strategy.
    """
    if not brand_name:
        return None
    
    # Try database first (faster)
    try:
        drug = RwandaFDADrug.objects.filter(brand_name__iexact=brand_name.strip()).first()
        if not drug:
            drug = RwandaFDADrug.objects.filter(brand_name__icontains=brand_name.strip()).first()
        
        if drug and drug.generic_name:
            logger.info(f'Rwanda FDA: "{brand_name}" -> generic "{drug.generic_name}"')
            return drug.generic_name.strip()
    except Exception as e:
        logger.warning(f'Database lookup failed: {e}')
    
    # Fallback to CSV
    rwanda_drug = search_rwanda_registry(brand_name)
    if rwanda_drug and rwanda_drug.get('generic_name'):
        return rwanda_drug['generic_name'].strip()
    
    return None


def _normalize_generic_name_for_openfda(generic_name: str) -> str:
    """
    Normalize generic name for OpenFDA search.
    Maps common international names to US FDA names.
    """
    if not generic_name:
        return generic_name
    
    name_lower = generic_name.lower()
    
    # Common name mappings
    mappings = {
        'paracetamol': 'acetaminophen',
        'paracetamol bp': 'acetaminophen',
        'paracetamol ip': 'acetaminophen',
    }
    
    for key, value in mappings.items():
        if key in name_lower:
            return value
    
    # Remove common suffixes like "BP", "IP", "USP"
    import re
    cleaned = re.sub(r'\s+(bp|ip|usp|ph\.?eur)\s*$', '', name_lower, flags=re.IGNORECASE)
    
    return cleaned.strip()


def fetch_openfda_safety_info(generic_name: str) -> dict:
    """
    Fetch safety information from OpenFDA using generic name.
    Returns contraindications, warnings, and food interactions from OpenFDA.
    """
    if not generic_name:
        return {}
    
    # Normalize the generic name for OpenFDA
    normalized_name = _normalize_generic_name_for_openfda(generic_name)
    logger.info(f'Normalized "{generic_name}" to "{normalized_name}" for OpenFDA')
    
    try:
        url = f'{OPENFDA_BASE}/label.json'
        params = {
            'search': f'openfda.generic_name:"{normalized_name}"',
            'limit': 1,
        }
        resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        
        if resp.status_code != 200:
            logger.warning(f'OpenFDA query failed for "{generic_name}": {resp.status_code}')
            return {}
        
        data = resp.json()
        results = data.get('results', [])
        
        if not results:
            return {}
        
        item = results[0]
        openfda = item.get('openfda', {})
        
        # Extract safety information
        safety_info = {
            'brand_names': openfda.get('brand_name', []),
            'generic_names': openfda.get('generic_name', []),
            'contraindications': item.get('contraindications', []),
            'warnings': item.get('warnings', []),
            'precautions': item.get('precautions', []),
            'adverse_reactions': item.get('adverse_reactions', []),
            'drug_interactions': item.get('drug_interactions', []),
            'food_interactions': item.get('food_interactions', []),
            'pregnancy': item.get('pregnancy', []),
            'nursing_mothers': item.get('nursing_mothers', []),
            'pediatric_use': item.get('pediatric_use', []),
            'geriatric_use': item.get('geriatric_use', []),
            'dosage_and_administration': item.get('dosage_and_administration', []),
            'source': 'openfda',
        }
        
        logger.info(f'Fetched OpenFDA safety info for "{generic_name}"')
        return safety_info
        
    except Exception as exc:
        logger.warning(f'OpenFDA safety fetch failed for "{generic_name}": {exc}')
        return {}


def check_contraindications_rwanda_first(
    medicine_name: str,
    population_type: Optional[str] = None,
    user_profile=None
) -> dict:
    """
    Check contraindications using Rwanda FDA-first strategy.
    
    Flow:
    1. Search Rwanda FDA by brand name to get generic name
    2. Use generic name to fetch contraindications from OpenFDA
    3. Return OpenFDA contraindications with Rwanda FDA metadata
    
    Args:
        medicine_name: Brand name of the medicine
        population_type: Population category (e.g., 'pregnant', 'elderly')
        user_profile: User profile for personalized checks
    
    Returns:
        dict with OpenFDA contraindications and Rwanda FDA metadata
    """
    results = {
        'medicine_name': medicine_name,
        'rwanda_fda_match': False,
        'generic_name': None,
        'openfda_match': False,
        'contraindications': [],
        'warnings': [],
        'population_type': population_type,
        'source': None,
    }
    
    # Step 1: Get generic name from Rwanda FDA
    generic_name = get_generic_name_from_rwanda(medicine_name)
    if generic_name:
        results['rwanda_fda_match'] = True
        results['generic_name'] = generic_name
        logger.info(f'Rwanda FDA: "{medicine_name}" -> generic "{generic_name}"')
    
    # Step 2: Fetch safety info from OpenFDA using generic name
    if generic_name:
        safety_info = fetch_openfda_safety_info(generic_name)
        
        if safety_info:
            results['openfda_match'] = True
            results['source'] = 'openfda'
            results['openfda_brand_names'] = safety_info.get('brand_names', [])
            
            # Extract contraindications from OpenFDA
            contras = safety_info.get('contraindications', [])
            if contras:
                for contra in contras:
                    if isinstance(contra, str):
                        results['contraindications'].append({
                            'description': contra[:500] if len(contra) > 500 else contra,
                            'source': 'openfda',
                            'type': 'contraindication',
                        })
            
            # Extract warnings from OpenFDA
            warnings = safety_info.get('warnings', [])
            if warnings:
                for warning in warnings:
                    if isinstance(warning, str):
                        results['warnings'].append({
                            'description': warning[:500] if len(warning) > 500 else warning,
                            'source': 'openfda',
                            'type': 'warning',
                        })
            
            # Population-specific info from OpenFDA
            if population_type:
                pop_lower = population_type.lower()
                if pop_lower in ['pregnant', 'pregnancy']:
                    preg_info = safety_info.get('pregnancy', [])
                    if preg_info:
                        results['pregnancy_info'] = preg_info[0][:1000] if isinstance(preg_info[0], str) else str(preg_info[0])
                elif pop_lower in ['lactating', 'nursing', 'breastfeeding']:
                    nursing_info = safety_info.get('nursing_mothers', [])
                    if nursing_info:
                        results['nursing_info'] = nursing_info[0][:1000] if isinstance(nursing_info[0], str) else str(nursing_info[0])
                elif pop_lower in ['pediatric', 'child', 'children']:
                    pediatric_info = safety_info.get('pediatric_use', [])
                    if pediatric_info:
                        results['pediatric_info'] = pediatric_info[0][:1000] if isinstance(pediatric_info[0], str) else str(pediatric_info[0])
                elif pop_lower in ['elderly', 'geriatric']:
                    geriatric_info = safety_info.get('geriatric_use', [])
                    if geriatric_info:
                        results['geriatric_info'] = geriatric_info[0][:1000] if isinstance(geriatric_info[0], str) else str(geriatric_info[0])
            
            logger.info(f'Found {len(results["contraindications"])} contraindications from OpenFDA for "{medicine_name}"')
        else:
            logger.info(f'No OpenFDA data for generic "{generic_name}"')
    
    return results


def get_food_advice_rwanda_first(medicine_name: str) -> dict:
    """
    Get food advice using Rwanda FDA-first strategy.
    
    Flow:
    1. Search Rwanda FDA by brand name to get generic name
    2. Use generic name to fetch food interactions from OpenFDA
    3. Return OpenFDA food advice with Rwanda FDA metadata
    
    Args:
        medicine_name: Brand name of the medicine
    
    Returns:
        dict with OpenFDA food interactions and Rwanda FDA metadata
    """
    results = {
        'medicine_name': medicine_name,
        'rwanda_fda_match': False,
        'generic_name': None,
        'openfda_match': False,
        'food_interactions': [],
        'foods_to_avoid': [],
        'foods_advised': [],
        'general_advice': '',
        'source': None,
    }
    
    # Step 1: Get generic name from Rwanda FDA
    generic_name = get_generic_name_from_rwanda(medicine_name)
    if generic_name:
        results['rwanda_fda_match'] = True
        results['generic_name'] = generic_name
        logger.info(f'Rwanda FDA: "{medicine_name}" -> generic "{generic_name}"')
    
    # Step 2: Fetch food info from OpenFDA using generic name
    if generic_name:
        safety_info = fetch_openfda_safety_info(generic_name)
        
        if safety_info:
            results['openfda_match'] = True
            results['source'] = 'openfda'
            results['openfda_brand_names'] = safety_info.get('brand_names', [])
            
            # Extract food interactions from OpenFDA
            food_interactions = safety_info.get('food_interactions', [])
            if food_interactions:
                for interaction in food_interactions:
                    if isinstance(interaction, str):
                        results['food_interactions'].append({
                            'description': interaction[:500] if len(interaction) > 500 else interaction,
                            'source': 'openfda',
                        })
            
            # Extract drug interactions (may include food)
            drug_interactions = safety_info.get('drug_interactions', [])
            if drug_interactions:
                results['drug_interactions'] = []
                for interaction in drug_interactions[:3]:  # Limit to first 3
                    if isinstance(interaction, str):
                        results['drug_interactions'].append({
                            'description': interaction[:500] if len(interaction) > 500 else interaction,
                            'source': 'openfda',
                        })
            
            # Parse general advice from dosage_and_administration
            dosage_admin = safety_info.get('dosage_and_administration', [])
            if dosage_admin:
                # Look for food-related instructions
                admin_text = dosage_admin[0] if isinstance(dosage_admin[0], str) else str(dosage_admin[0])
                results['general_advice'] = admin_text[:1000] if len(admin_text) > 1000 else admin_text
            
            logger.info(f'Found {len(results["food_interactions"])} food interactions from OpenFDA for "{medicine_name}"')
        else:
            # Fallback to pattern-based advice if OpenFDA has no data
            pattern_advice = _get_generic_food_advice_by_name(generic_name)
            results['food_interactions'] = pattern_advice['interactions']
            results['foods_to_avoid'] = pattern_advice['avoid']
            results['foods_advised'] = pattern_advice['advised']
            results['general_advice'] = pattern_advice['general']
            results['source'] = 'pattern_fallback'
            logger.info(f'No OpenFDA data, using pattern-based advice for "{medicine_name}"')
    else:
        # No Rwanda FDA match, use pattern-based on original name
        pattern_advice = _get_generic_food_advice_by_name(medicine_name)
        results['food_interactions'] = pattern_advice['interactions']
        results['foods_to_avoid'] = pattern_advice['avoid']
        results['foods_advised'] = pattern_advice['advised']
        results['general_advice'] = pattern_advice['general']
        results['source'] = 'pattern_fallback'
        logger.info(f'No Rwanda FDA match, using pattern-based advice for "{medicine_name}"')
    
    return results


def _get_generic_food_advice_by_name(drug_name: str) -> dict:
    """Get food advice based on drug name patterns."""
    advice = {
        'interactions': [],
        'avoid': [],
        'advised': [],
        'general': '',
    }
    
    name_lower = drug_name.lower()
    
    # NSAIDs
    if any(x in name_lower for x in ['ibuprofen', 'naproxen', 'diclofenac', 'aspirin', 'ketoprofen']):
        advice['avoid'] = ['Alcohol', 'Grapefruit juice']
        advice['advised'] = ['Food', 'Milk']
        advice['general'] = 'Take with food or milk to reduce stomach upset.'
        advice['interactions'].append({
            'food': 'Alcohol',
            'severity': 'MAJOR',
            'description': 'Increases risk of stomach bleeding',
            'recommendation': 'Avoid alcohol while taking this medication'
        })
    
    # Antibiotics
    elif any(x in name_lower for x in ['amoxicillin', 'azithromycin', 'ciprofloxacin', 'tetracycline', 'doxycycline']):
        advice['avoid'] = ['Dairy products', 'Calcium supplements', 'Antacids']
        advice['advised'] = ['Water', 'Food (if stomach upset)']
        advice['general'] = 'Take with plenty of water. Avoid dairy 2 hours before and after.'
        advice['interactions'].append({
            'food': 'Dairy products',
            'severity': 'MODERATE',
            'description': 'Calcium binds to antibiotic reducing absorption',
            'recommendation': 'Avoid dairy 2 hours before and after taking this medication'
        })
    
    # Blood thinners
    elif any(x in name_lower for x in ['warfarin', 'heparin', 'rivaroxaban']):
        advice['avoid'] = ['Grapefruit', 'Cranberry juice', 'Alcohol', 'Vitamin K-rich foods (in large amounts)']
        advice['advised'] = ['Consistent vitamin K intake', 'Water']
        advice['general'] = 'Maintain consistent vitamin K intake. Avoid grapefruit and alcohol.'
    
    # Statins
    elif any(x in name_lower for x in ['atorvastatin', 'simvastatin', 'rosuvastatin']):
        advice['avoid'] = ['Grapefruit juice', 'Alcohol']
        advice['general'] = 'Avoid grapefruit juice as it increases side effects.'
        advice['interactions'].append({
            'food': 'Grapefruit juice',
            'severity': 'MAJOR',
            'description': 'Increases statin blood levels and side effects',
            'recommendation': 'Avoid grapefruit juice completely'
        })
    
    # ACE inhibitors
    elif any(x in name_lower for x in ['lisinopril', 'enalapril', 'captopril']):
        advice['avoid'] = ['Potassium supplements', 'Salt substitutes']
        advice['general'] = 'Avoid potassium supplements and salt substitutes.'
    
    # Diuretics
    elif any(x in name_lower for x in ['furosemide', 'hydrochlorothiazide', 'spironolactone']):
        advice['avoid'] = ['Licorice']
        advice['advised'] = ['Potassium-rich foods (if not on potassium-sparing diuretic)']
        advice['general'] = 'Monitor potassium levels. Avoid licorice.'
    
    # Thyroid medications
    elif any(x in name_lower for x in ['levothyroxine', 'thyroxine']):
        advice['avoid'] = ['Soy products', 'High-fiber foods', 'Coffee (within 1 hour)']
        advice['general'] = 'Take on empty stomach. Avoid soy and high-fiber foods around dose time.'
    
    # Paracetamol/Acetaminophen
    elif any(x in name_lower for x in ['paracetamol', 'acetaminophen']):
        advice['avoid'] = ['Alcohol']
        advice['general'] = 'Can be taken with or without food. Avoid alcohol.'
    
    # Metformin
    elif 'metformin' in name_lower:
        advice['advised'] = ['Food']
        advice['general'] = 'Take with meals to reduce stomach upset.'
    
    # Default
    else:
        advice['general'] = 'Take as directed. Consult your pharmacist about food interactions.'
    
    return advice


def _get_generic_food_advice(brand_name: str, generic_name: Optional[str]) -> str:
    """Provide generic food advice when drug not in database."""
    if generic_name:
        generic_lower = generic_name.lower()
        
        # Common patterns
        if any(x in generic_lower for x in ['paracetamol', 'acetaminophen']):
            return 'Can be taken with or without food. Avoid alcohol.'
        elif any(x in generic_lower for x in ['ibuprofen', 'naproxen', 'diclofenac']):
            return 'Take with food or milk to prevent stomach upset. Avoid alcohol.'
        elif any(x in generic_lower for x in ['amoxicillin', 'azithromycin', 'ciprofloxacin']):
            return 'Take with plenty of water. Avoid dairy 2 hours before and after.'
        elif any(x in generic_lower for x in ['metformin']):
            return 'Take with meals to reduce stomach upset.'
        elif any(x in generic_lower for x in ['warfarin']):
            return 'Maintain consistent vitamin K intake. Avoid grapefruit and cranberry.'
    
    return 'Take as directed on the label. Consult your pharmacist for specific food advice.'


def check_medicine_safety_comprehensive(
    medicine_name: str,
    population_type: Optional[str] = None,
    user_allergies: list = None
) -> dict:
    """
    Comprehensive safety check using Rwanda FDA-first strategy.
    
    Flow:
    1. Search Rwanda FDA by brand name to get generic name
    2. Use generic name to fetch all safety info from OpenFDA
    3. Return combined results from OpenFDA with Rwanda FDA metadata
    
    Combines contraindications, food advice, and allergy checks from OpenFDA.
    """
    results = {
        'medicine_name': medicine_name,
        'generic_name': None,
        'rwanda_fda_match': False,
        'openfda_match': False,
        'safety_status': 'SAFE',  # SAFE, CAUTION, WARNING, CONTRAINDICATED
        'alerts': [],
        'contraindications': [],
        'warnings': [],
        'food_advice': {},
        'allergy_warnings': [],
        'source': None,
    }
    
    # Step 1: Get generic name from Rwanda FDA
    generic_name = get_generic_name_from_rwanda(medicine_name)
    if generic_name:
        results['generic_name'] = generic_name
        results['rwanda_fda_match'] = True
        logger.info(f'Rwanda FDA: "{medicine_name}" -> generic "{generic_name}"')
    
    # Step 2: Fetch all safety info from OpenFDA
    if generic_name:
        safety_info = fetch_openfda_safety_info(generic_name)
        
        if safety_info:
            results['openfda_match'] = True
            results['source'] = 'openfda'
            results['openfda_brand_names'] = safety_info.get('brand_names', [])
            
            # Extract contraindications
            contras = safety_info.get('contraindications', [])
            for contra in contras:
                if isinstance(contra, str):
                    results['contraindications'].append({
                        'description': contra[:500] if len(contra) > 500 else contra,
                        'source': 'openfda',
                    })
            
            # Extract warnings
            warnings = safety_info.get('warnings', [])
            for warning in warnings:
                if isinstance(warning, str):
                    results['warnings'].append({
                        'description': warning[:500] if len(warning) > 500 else warning,
                        'source': 'openfda',
                    })
            
            # Extract food interactions
            food_interactions = safety_info.get('food_interactions', [])
            results['food_advice'] = {
                'food_interactions': [],
                'source': 'openfda',
            }
            for interaction in food_interactions:
                if isinstance(interaction, str):
                    results['food_advice']['food_interactions'].append({
                        'description': interaction[:500] if len(interaction) > 500 else interaction,
                        'source': 'openfda',
                    })
            
            # Determine safety status based on OpenFDA data
            if results['contraindications']:
                results['safety_status'] = 'CONTRAINDICATED'
                results['alerts'].append({
                    'type': 'contraindication',
                    'severity': 'CRITICAL',
                    'message': f"{medicine_name} has contraindications. Please consult your doctor."
                })
            elif results['warnings']:
                results['safety_status'] = 'CAUTION'
                results['alerts'].append({
                    'type': 'warning',
                    'severity': 'WARNING',
                    'message': f"{medicine_name} has warnings. Please review carefully."
                })
            
            logger.info(f'Fetched comprehensive safety info from OpenFDA for "{medicine_name}"')
        else:
            # No OpenFDA data
            results['alerts'].append({
                'type': 'info',
                'severity': 'INFO',
                'message': f"No detailed safety data available for {medicine_name} from OpenFDA."
            })
    
    # Step 3: Check allergies if provided
    if user_allergies and generic_name:
        for allergy in user_allergies:
            if allergy.lower() in generic_name.lower():
                results['allergy_warnings'].append({
                    'allergen': allergy,
                    'message': f"You have a reported allergy to {allergy}"
                })
                if results['safety_status'] != 'CONTRAINDICATED':
                    results['safety_status'] = 'WARNING'
    
    return results


def check_medicine_for_condition(
    medicine_name: str,
    condition: str,
    population_type: Optional[str] = None
) -> dict:
    """
    Check if a medicine is safe for a specific medical condition.
    
    Args:
        medicine_name: Brand name of the medicine
        condition: Medical condition to check (e.g., 'diabetes', 'hypertension', 'pregnancy')
        population_type: Optional population category
    
    Returns:
        dict with safety assessment for the condition
    """
    results = {
        'medicine_name': medicine_name,
        'condition': condition,
        'generic_name': None,
        'rwanda_fda_match': False,
        'openfda_match': False,
        'is_safe': True,
        'safety_status': 'SAFE',  # SAFE, CAUTION, WARNING, UNSAFE
        'recommendation': '',
        'reasons': [],
        'alternatives': [],
        'source': None,
    }
    
    # Normalize condition for comparison
    condition_lower = condition.lower()
    
    # Step 1: Get generic name from Rwanda FDA
    generic_name = get_generic_name_from_rwanda(medicine_name)
    if generic_name:
        results['generic_name'] = generic_name
        results['rwanda_fda_match'] = True
    
    # Step 2: Fetch safety info from OpenFDA
    if generic_name:
        safety_info = fetch_openfda_safety_info(generic_name)
        
        if safety_info:
            results['openfda_match'] = True
            results['source'] = 'openfda'
            
            # Check contraindications for the condition
            contraindications = safety_info.get('contraindications', [])
            
            for contra in contraindications:
                if isinstance(contra, str) and condition_lower in contra.lower():
                    results['is_safe'] = False
                    results['safety_status'] = 'UNSAFE'
                    results['reasons'].append({
                        'type': 'contraindication',
                        'description': contra[:500] if len(contra) > 500 else contra,
                        'source': 'openfda'
                    })
            
            # Check warnings for the condition
            if results['is_safe']:
                warnings = safety_info.get('warnings', [])
                for warning in warnings:
                    if isinstance(warning, str) and condition_lower in warning.lower():
                        results['safety_status'] = 'CAUTION'
                        results['reasons'].append({
                            'type': 'warning',
                            'description': warning[:500] if len(warning) > 500 else warning,
                            'source': 'openfda'
                        })
            
            # Population-specific checks
            if population_type:
                pop_lower = population_type.lower()
                
                # Pregnancy check
                if pop_lower in ['pregnant', 'pregnancy'] and condition_lower in ['pregnancy', 'pregnant']:
                    preg_info = safety_info.get('pregnancy', [])
                    if preg_info:
                        preg_text = preg_info[0] if isinstance(preg_info[0], str) else str(preg_info[0])
                        results['pregnancy_info'] = preg_text[:1000]
                        # Check for pregnancy categories
                        if any(cat in preg_text.upper() for cat in ['CATEGORY X', 'CONTRAINDICATED', 'SHOULD NOT BE USED']):
                            results['is_safe'] = False
                            results['safety_status'] = 'UNSAFE'
                            results['reasons'].append({
                                'type': 'pregnancy_contraindication',
                                'description': 'This medication is contraindicated during pregnancy.',
                                'source': 'openfda'
                            })
                        elif any(cat in preg_text.upper() for cat in ['CATEGORY D', 'CATEGORY C']):
                            results['safety_status'] = 'CAUTION'
                            results['reasons'].append({
                                'type': 'pregnancy_warning',
                                'description': 'Use during pregnancy only if clearly needed.',
                                'source': 'openfda'
                            })
                
                # Lactation check
                elif pop_lower in ['lactating', 'nursing', 'breastfeeding'] and condition_lower in ['lactation', 'breastfeeding', 'nursing']:
                    nursing_info = safety_info.get('nursing_mothers', [])
                    if nursing_info:
                        nursing_text = nursing_info[0] if isinstance(nursing_info[0], str) else str(nursing_info[0])
                        results['nursing_info'] = nursing_text[:1000]
                        if any(word in nursing_text.upper() for word in ['CONTRAINDICATED', 'SHOULD NOT BE USED', 'DISCONTINUE NURSING']):
                            results['is_safe'] = False
                            results['safety_status'] = 'UNSAFE'
                            results['reasons'].append({
                                'type': 'lactation_contraindication',
                                'description': 'This medication is not recommended while breastfeeding.',
                                'source': 'openfda'
                            })
        else:
            # No OpenFDA data - use pattern-based detection for known dangerous drugs
            logger.info(f'No OpenFDA data for {medicine_name}, using pattern-based detection')
            results['source'] = 'pattern_fallback'
            
            # Check for known teratogenic drugs (cause birth defects)
            generic_lower = generic_name.lower()
            medicine_lower = medicine_name.lower()
            
            # Known pregnancy contraindicated drugs
            pregnancy_contraindicated = [
                'isotretinoin', 'acnotin', 'roaccutane', 'accutane',  # Vitamin A derivatives
                'warfarin', 'coumadin',  # Blood thinners
                'methotrexate',  # Chemotherapy/immunosuppressant
                'thalidomide',  # Known teratogen
                'valproic acid', 'valproate',  # Anti-seizure
                'finasteride', 'dutasteride',  # 5-alpha reductase inhibitors
                'misoprostol',  # Ulcer medication
                'mifepristone',  # Abortion pill
            ]
            
            if condition_lower in ['pregnancy', 'pregnant']:
                if any(drug in generic_lower for drug in pregnancy_contraindicated) or \
                   any(drug in medicine_lower for drug in pregnancy_contraindicated):
                    results['is_safe'] = False
                    results['safety_status'] = 'UNSAFE'
                    results['reasons'].append({
                        'type': 'pregnancy_contraindication',
                        'description': f'{medicine_name} ({generic_name}) is known to cause severe birth defects and is ABSOLUTELY CONTRAINDICATED during pregnancy.',
                        'source': 'pattern_fallback'
                    })
                    logger.warning(f'Pattern-based detection: {medicine_name} is contraindicated for pregnancy')
    
    # Generate recommendation based on safety status
    if results['safety_status'] == 'SAFE':
        results['recommendation'] = f"{medicine_name} appears to be safe for patients with {condition}. Always consult your healthcare provider."
    elif results['safety_status'] == 'CAUTION':
        results['recommendation'] = f"Use {medicine_name} with caution if you have {condition}. Consult your doctor before use."
    elif results['safety_status'] == 'WARNING':
        results['recommendation'] = f"{medicine_name} may not be suitable for patients with {condition}. Discuss with your healthcare provider."
    else:  # UNSAFE
        results['recommendation'] = f"{medicine_name} is NOT recommended for patients with {condition}. Please consult your doctor for alternatives."
    
    # Add common alternatives based on condition
    condition_alternatives = {
        'diabetes': ['Metformin', 'Insulin', 'Glipizide'],
        'hypertension': ['Lisinopril', 'Amlodipine', 'Losartan'],
        'pregnancy': ['Prenatal vitamins', 'Folic acid'],
        'hypertension in pregnancy': ['Methyldopa', 'Labetalol', 'Nifedipine'],
    }
    
    if condition_lower in condition_alternatives:
        results['alternatives'] = condition_alternatives[condition_lower]
    
    logger.info(f'Condition check: {medicine_name} for {condition} -> {results["safety_status"]}')
    return results
