import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import DrugInteraction, InteractionCheck, Contraindication, DrugDatabase
from .serializers import (
    DrugInteractionSerializer, 
    InteractionCheckSerializer, 
    ContraindicationSerializer,
    DrugDatabaseSerializer
)
from .tasks import initialize_drug_database, add_common_interactions, add_common_contraindications

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Well-known drug-drug interactions (pattern-based fallback)
# Each entry: (set of drug identifiers for drug A, set for drug B, data)
# Matched when generic/brand name *contains* any term in the set. 
# ---------------------------------------------------------------------------
KNOWN_INTERACTIONS = [
    # NSAIDs + Anticoagulants
    (
        {'ibuprofen', 'naproxen', 'diclofenac', 'aspirin', 'ketoprofen', 'meloxicam', 'piroxicam', 'indomethacin', 'celecoxib'},
        {'warfarin', 'heparin', 'rivaroxaban', 'apixaban', 'dabigatran', 'enoxaparin', 'coumadin'},
        {
            'severity': 'MAJOR',
            'description': 'NSAIDs increase the risk of bleeding when taken with anticoagulants (blood thinners). This combination can cause serious gastrointestinal or internal bleeding.',
            'recommendation': 'Avoid combining NSAIDs with blood thinners. If pain relief is needed, consider acetaminophen/paracetamol instead and consult your doctor.',
            'mechanism': 'NSAIDs inhibit platelet function and can cause GI mucosal damage, compounding anticoagulant bleeding risk.',
        },
    ),
    # NSAID + NSAID (double NSAID)
    (
        {'ibuprofen', 'advil', 'motrin', 'nuprin'},
        {'aspirin', 'naproxen', 'diclofenac', 'ketoprofen', 'meloxicam', 'piroxicam', 'indomethacin', 'celecoxib', 'aleve'},
        {
            'severity': 'HIGH',
            'description': 'Taking two NSAIDs together significantly increases the risk of stomach ulcers, gastrointestinal bleeding, and kidney damage.',
            'recommendation': 'Do not take multiple NSAIDs simultaneously. Choose one NSAID at the recommended dose. Consult your pharmacist.',
            'mechanism': 'Additive COX-1/COX-2 inhibition increases GI and renal toxicity.',
        },
    ),
    # ACE inhibitors + Potassium-sparing diuretics / potassium supplements
    (
        {'lisinopril', 'enalapril', 'captopril', 'ramipril', 'perindopril', 'benazepril', 'fosinopril', 'quinapril'},
        {'spironolactone', 'amiloride', 'triamterene', 'potassium', 'eplerenone'},
        {
            'severity': 'HIGH',
            'description': 'ACE inhibitors combined with potassium-sparing diuretics or potassium supplements can cause dangerously high potassium levels (hyperkalemia), which can lead to life-threatening cardiac arrhythmias.',
            'recommendation': 'Monitor potassium levels regularly. Avoid potassium supplements unless prescribed. Consult your doctor immediately if you experience muscle weakness or irregular heartbeat.',
            'mechanism': 'ACE inhibitors reduce aldosterone secretion, decreasing potassium excretion. Potassium-sparing agents further increase serum potassium.',
        },
    ),
    # ACE inhibitors + NSAIDs
    (
        {'lisinopril', 'enalapril', 'captopril', 'ramipril', 'perindopril', 'benazepril'},
        {'ibuprofen', 'naproxen', 'diclofenac', 'aspirin', 'ketoprofen', 'meloxicam', 'piroxicam', 'indomethacin', 'celecoxib'},
        {
            'severity': 'MODERATE',
            'description': 'NSAIDs can reduce the blood-pressure-lowering effect of ACE inhibitors and increase the risk of kidney damage, especially in elderly or dehydrated patients.',
            'recommendation': 'Use the lowest effective NSAID dose for the shortest duration. Stay well hydrated and monitor blood pressure and kidney function.',
            'mechanism': 'NSAIDs inhibit prostaglandin-mediated renal blood flow regulation, reducing antihypertensive effect and increasing nephrotoxicity.',
        },
    ),
    # Statins + Macrolide antibiotics
    (
        {'atorvastatin', 'simvastatin', 'rosuvastatin', 'lovastatin', 'pravastatin', 'fluvastatin'},
        {'erythromycin', 'clarithromycin', 'azithromycin', 'telithromycin'},
        {
            'severity': 'HIGH',
            'description': 'Macrolide antibiotics can increase statin blood levels, raising the risk of severe muscle damage (rhabdomyolysis) and liver injury.',
            'recommendation': 'Consult your doctor. You may need to temporarily stop your statin during antibiotic treatment or switch to a less interacting antibiotic.',
            'mechanism': 'CYP3A4 enzyme inhibition by macrolides impairs statin metabolism, increasing its plasma concentration.',
        },
    ),
    # Statins + Fibrates
    (
        {'atorvastatin', 'simvastatin', 'rosuvastatin', 'lovastatin', 'pravastatin'},
        {'gemfibrozil', 'fenofibrate', 'bezafibrate', 'ciprofibrate'},
        {
            'severity': 'HIGH',
            'description': 'Combining statins with fibrates, especially gemfibrozil, significantly increases the risk of rhabdomyolysis (serious muscle breakdown).',
            'recommendation': 'If both are needed, fenofibrate is preferred over gemfibrozil. Monitor for unexplained muscle pain, tenderness, or weakness.',
            'mechanism': 'Gemfibrozil inhibits hepatic uptake and glucuronidation of statins, increasing their plasma levels.',
        },
    ),
    # Metformin + Alcohol
    (
        {'metformin', 'glucophage', 'fortamet'},
        {'alcohol', 'ethanol'},
        {
            'severity': 'MODERATE',
            'description': 'Alcohol increases the risk of lactic acidosis when combined with metformin, a potentially life-threatening condition.',
            'recommendation': 'Limit alcohol intake. Avoid binge drinking. Seek medical attention if you experience unusual muscle pain, difficulty breathing, or unusual tiredness.',
            'mechanism': 'Alcohol impairs hepatic lactate metabolism, potentiating metformin-associated lactic acidosis.',
        },
    ),
    # Metformin + Contrast dye (iodinated)
    (
        {'metformin', 'glucophage'},
        {'contrast', 'iodine', 'iodinated'},
        {
            'severity': 'HIGH',
            'description': 'Iodinated contrast media used in imaging procedures can impair kidney function, leading to metformin accumulation and lactic acidosis.',
            'recommendation': 'Stop metformin 48 hours before contrast procedures and restart only after kidney function is confirmed normal.',
            'mechanism': 'Contrast-induced nephropathy reduces metformin renal clearance.',
        },
    ),
    # SSRIs + MAOIs
    (
        {'fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'fluvoxamine', 'prozac', 'zoloft', 'paxil'},
        {'phenelzine', 'tranylcypromine', 'isocarboxazid', 'selegiline', 'moclobemide', 'linezolid'},
        {
            'severity': 'CONTRAINDICATED',
            'description': 'Combining SSRIs with MAOIs can cause serotonin syndrome, a life-threatening condition with symptoms including high fever, seizures, and cardiac instability.',
            'recommendation': 'NEVER take SSRIs and MAOIs together. Wait at least 2 weeks (5 weeks for fluoxetine) after stopping one before starting the other.',
            'mechanism': 'Dual serotonin reuptake inhibition and MAO inhibition causes excessive serotonergic activity in the CNS.',
        },
    ),
    # SSRIs + Tramadol
    (
        {'fluoxetine', 'sertraline', 'paroxetine', 'citalopram', 'escitalopram', 'fluvoxamine'},
        {'tramadol', 'tramal', 'ultram'},
        {
            'severity': 'HIGH',
            'description': 'Combining SSRIs with tramadol increases the risk of serotonin syndrome and seizures.',
            'recommendation': 'Use with extreme caution. Monitor for symptoms of serotonin syndrome: agitation, tremor, sweating, rapid heartbeat.',
            'mechanism': 'Both SSRIs and tramadol inhibit serotonin reuptake, causing excessive serotonergic activity.',
        },
    ),
    # Warfarin + Paracetamol/Acetaminophen (high-dose)
    (
        {'warfarin', 'coumadin'},
        {'paracetamol', 'acetaminophen', 'tylenol', 'panadol'},
        {
            'severity': 'MODERATE',
            'description': 'Regular use of paracetamol/acetaminophen (especially >2g/day) can increase the anticoagulant effect of warfarin, raising the INR and bleeding risk.',
            'recommendation': 'Use occasional paracetamol cautiously. Avoid regular doses above 2g/day. Monitor INR more frequently.',
            'mechanism': 'Acetaminophen metabolite inhibits vitamin K-dependent carboxylase, potentiating warfarin effect.',
        },
    ),
    # Ciprofloxacin/Fluoroquinolones + Antacids/Calcium/Iron
    (
        {'ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'norfloxacin', 'ofloxacin'},
        {'calcium', 'iron', 'antacid', 'aluminum', 'magnesium', 'sucralfate', 'zinc'},
        {
            'severity': 'MODERATE',
            'description': 'Antacids, calcium, iron, and zinc supplements significantly reduce fluoroquinolone antibiotic absorption, making it less effective.',
            'recommendation': 'Take fluoroquinolones at least 2 hours before or 6 hours after antacids, calcium, iron, or zinc supplements.',
            'mechanism': 'Polyvalent cations chelate fluoroquinolones in the GI tract, reducing bioavailability.',
        },
    ),
    # Tetracycline/Doxycycline + Dairy/Calcium
    (
        {'tetracycline', 'doxycycline', 'minocycline'},
        {'calcium', 'dairy', 'milk', 'iron', 'antacid', 'aluminum', 'magnesium'},
        {
            'severity': 'MODERATE',
            'description': 'Calcium, dairy products, iron, and antacids chelate tetracyclines reducing their absorption and therapeutic effectiveness.',
            'recommendation': 'Take tetracyclines 1-2 hours before or 4 hours after dairy products, calcium, or iron supplements.',
            'mechanism': 'Divalent/trivalent cation chelation in the GI tract.',
        },
    ),
    # Amlodipine/Calcium channel blockers + Beta-blockers
    (
        {'amlodipine', 'nifedipine', 'verapamil', 'diltiazem', 'felodipine'},
        {'atenolol', 'metoprolol', 'propranolol', 'bisoprolol', 'carvedilol', 'nebivolol'},
        {
            'severity': 'MODERATE',
            'description': 'Combining calcium channel blockers (especially verapamil/diltiazem) with beta-blockers can cause excessive slowing of heart rate (bradycardia) and low blood pressure.',
            'recommendation': 'This combination is sometimes used under careful medical supervision. Monitor heart rate and blood pressure closely.',
            'mechanism': 'Additive negative chronotropic and inotropic effects on the heart.',
        },
    ),
    # Digoxin + Amiodarone
    (
        {'digoxin', 'digitoxin', 'lanoxin'},
        {'amiodarone', 'cordarone'},
        {
            'severity': 'HIGH',
            'description': 'Amiodarone significantly increases digoxin blood levels, potentially causing digoxin toxicity (nausea, visual changes, dangerous arrhythmias).',
            'recommendation': 'Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels and signs of toxicity closely.',
            'mechanism': 'Amiodarone inhibits P-glycoprotein and renal clearance of digoxin.',
        },
    ),
    # Omeprazole/PPIs + Clopidogrel
    (
        {'omeprazole', 'esomeprazole', 'lansoprazole', 'pantoprazole', 'rabeprazole'},
        {'clopidogrel', 'plavix'},
        {
            'severity': 'HIGH',
            'description': 'Omeprazole and esomeprazole reduce the antiplatelet effect of clopidogrel, increasing the risk of heart attack or stroke in patients with cardiovascular disease.',
            'recommendation': 'Use pantoprazole instead (less interaction). If a PPI is needed, avoid omeprazole and esomeprazole with clopidogrel.',
            'mechanism': 'CYP2C19 inhibition reduces conversion of clopidogrel to its active metabolite.',
        },
    ),
    # Lithium + NSAIDs
    (
        {'lithium', 'lithobid', 'eskalith'},
        {'ibuprofen', 'naproxen', 'diclofenac', 'aspirin', 'ketoprofen', 'meloxicam', 'piroxicam', 'indomethacin', 'celecoxib'},
        {
            'severity': 'HIGH',
            'description': 'NSAIDs reduce kidney excretion of lithium, causing lithium accumulation and potentially life-threatening toxicity (tremor, confusion, seizures).',
            'recommendation': 'Avoid NSAIDs if taking lithium. Use paracetamol/acetaminophen for pain relief. If NSAIDs are unavoidable, monitor lithium levels closely.',
            'mechanism': 'NSAIDs reduce renal prostaglandin synthesis, decreasing lithium renal clearance.',
        },
    ),
    # Lithium + ACE inhibitors
    (
        {'lithium', 'lithobid'},
        {'lisinopril', 'enalapril', 'captopril', 'ramipril', 'perindopril'},
        {
            'severity': 'HIGH',
            'description': 'ACE inhibitors decrease lithium excretion, potentially causing lithium toxicity.',
            'recommendation': 'Monitor lithium levels closely if this combination is necessary. Watch for signs of lithium toxicity.',
            'mechanism': 'ACE inhibitors reduce angiotensin II-mediated aldosterone release, decreasing sodium and lithium renal excretion.',
        },
    ),
    # Amoxicillin + Methotrexate
    (
        {'amoxicillin', 'ampicillin', 'penicillin'},
        {'methotrexate'},
        {
            'severity': 'HIGH',
            'description': 'Penicillin-type antibiotics can reduce kidney excretion of methotrexate, increasing methotrexate toxicity risk (bone marrow suppression, liver damage).',
            'recommendation': 'Monitor methotrexate levels and complete blood count closely during concurrent use.',
            'mechanism': 'Competitive inhibition of renal tubular secretion.',
        },
    ),
]

# Map generic names to broader drug class terms found in OpenFDA labeling text
DRUG_CLASS_TERMS = {
    'ibuprofen': ['nsaid', 'nonsteroidal anti-inflammatory', 'anti-inflammatory'],
    'naproxen': ['nsaid', 'nonsteroidal anti-inflammatory', 'anti-inflammatory'],
    'diclofenac': ['nsaid', 'nonsteroidal anti-inflammatory', 'anti-inflammatory'],
    'aspirin': ['nsaid', 'nonsteroidal anti-inflammatory', 'salicylate', 'anti-inflammatory', 'antiplatelet'],
    'ketoprofen': ['nsaid', 'nonsteroidal anti-inflammatory'],
    'meloxicam': ['nsaid', 'nonsteroidal anti-inflammatory'],
    'celecoxib': ['nsaid', 'nonsteroidal anti-inflammatory', 'cox-2'],
    'indomethacin': ['nsaid', 'nonsteroidal anti-inflammatory'],
    'piroxicam': ['nsaid', 'nonsteroidal anti-inflammatory'],
    'warfarin': ['anticoagulant', 'blood thinner', 'coumarin'],
    'heparin': ['anticoagulant', 'blood thinner'],
    'rivaroxaban': ['anticoagulant', 'blood thinner'],
    'apixaban': ['anticoagulant', 'blood thinner'],
    'dabigatran': ['anticoagulant', 'blood thinner'],
    'lisinopril': ['ace inhibitor', 'angiotensin-converting enzyme'],
    'enalapril': ['ace inhibitor', 'angiotensin-converting enzyme'],
    'captopril': ['ace inhibitor', 'angiotensin-converting enzyme'],
    'ramipril': ['ace inhibitor', 'angiotensin-converting enzyme'],
    'atorvastatin': ['statin', 'hmg-coa reductase'],
    'simvastatin': ['statin', 'hmg-coa reductase'],
    'rosuvastatin': ['statin', 'hmg-coa reductase'],
    'lovastatin': ['statin', 'hmg-coa reductase'],
    'metformin': ['biguanide', 'antidiabetic'],
    'fluoxetine': ['ssri', 'selective serotonin reuptake inhibitor', 'antidepressant'],
    'sertraline': ['ssri', 'selective serotonin reuptake inhibitor', 'antidepressant'],
    'paroxetine': ['ssri', 'selective serotonin reuptake inhibitor', 'antidepressant'],
    'citalopram': ['ssri', 'selective serotonin reuptake inhibitor', 'antidepressant'],
    'escitalopram': ['ssri', 'selective serotonin reuptake inhibitor', 'antidepressant'],
    'amlodipine': ['calcium channel blocker'],
    'nifedipine': ['calcium channel blocker'],
    'verapamil': ['calcium channel blocker'],
    'diltiazem': ['calcium channel blocker'],
    'atenolol': ['beta-blocker', 'beta blocker', 'beta-adrenergic'],
    'metoprolol': ['beta-blocker', 'beta blocker', 'beta-adrenergic'],
    'propranolol': ['beta-blocker', 'beta blocker', 'beta-adrenergic'],
    'bisoprolol': ['beta-blocker', 'beta blocker', 'beta-adrenergic'],
    'ciprofloxacin': ['fluoroquinolone', 'quinolone'],
    'levofloxacin': ['fluoroquinolone', 'quinolone'],
    'omeprazole': ['proton pump inhibitor', 'ppi'],
    'esomeprazole': ['proton pump inhibitor', 'ppi'],
    'lansoprazole': ['proton pump inhibitor', 'ppi'],
    'pantoprazole': ['proton pump inhibitor', 'ppi'],
    'clopidogrel': ['antiplatelet', 'thienopyridine'],
    'amoxicillin': ['penicillin', 'aminopenicillin', 'antibiotic'],
    'erythromycin': ['macrolide', 'antibiotic'],
    'clarithromycin': ['macrolide', 'antibiotic'],
    'azithromycin': ['macrolide', 'antibiotic'],
    'tetracycline': ['tetracycline', 'antibiotic'],
    'doxycycline': ['tetracycline', 'antibiotic'],
    'digoxin': ['cardiac glycoside', 'digitalis'],
    'lithium': ['mood stabilizer'],
    'tramadol': ['opioid', 'analgesic'],
    'methotrexate': ['antimetabolite', 'immunosuppressant', 'dmard'],
    'paracetamol': ['acetaminophen', 'analgesic', 'antipyretic'],
    'acetaminophen': ['paracetamol', 'analgesic', 'antipyretic'],
}


def _resolve_generic_name(medicine):
    """
    Resolve the best generic name for a medicine using multiple strategies:
    1. Medicine.scientific_name field (if populated)
    2. Rwanda FDA brand-name lookup
    3. Fall back to medicine.name
    """
    from apps.medicines.safety_lookup import get_generic_name_from_rwanda

    # Try scientific_name field first (most reliable when set)
    if getattr(medicine, 'scientific_name', None):
        return medicine.scientific_name.strip().lower()

    # Rwanda FDA brand-name → generic
    generic = get_generic_name_from_rwanda(medicine.name)
    if generic:
        return generic.strip().lower()

    # Fallback: the name itself (may already be generic)
    return medicine.name.strip().lower()


def _check_known_interactions(name1, name2):
    """
    Check the KNOWN_INTERACTIONS table for a match between two drug names.
    Returns the interaction dict if found, else None.
    """
    n1 = name1.lower()
    n2 = name2.lower()

    for set_a, set_b, data in KNOWN_INTERACTIONS:
        a_match = any(term in n1 for term in set_a)
        b_match = any(term in n2 for term in set_b)
        if a_match and b_match:
            return data

        # Check reverse direction
        a_match_r = any(term in n2 for term in set_a)
        b_match_r = any(term in n1 for term in set_b)
        if a_match_r and b_match_r:
            return data

    return None


def _openfda_cross_check(generic1, generic2, fetch_fn):
    """
    Bidirectional OpenFDA cross-reference with drug-class-aware matching.
    Returns interaction dict if found, else None.
    """
    # Build search terms: the drug name itself + its class aliases
    terms_for_2 = {generic2.lower()}
    terms_for_2.update(DRUG_CLASS_TERMS.get(generic2.lower(), []))

    terms_for_1 = {generic1.lower()}
    terms_for_1.update(DRUG_CLASS_TERMS.get(generic1.lower(), []))

    # Direction 1: check generic2 (or its class) mentioned in generic1's label
    try:
        safety1 = fetch_fn(generic1)
        text1 = ' '.join(safety1.get('drug_interactions', [])).lower()
        if text1:
            for term in terms_for_2:
                if term in text1:
                    return {
                        'severity': 'MODERATE',
                        'description': f'OpenFDA reports a potential interaction between {generic1} and {generic2}.',
                        'recommendation': 'Consult your healthcare provider about taking these medicines together.',
                        'mechanism': f'Mentioned in {generic1} drug interaction labeling (matched: "{term}").',
                        'source': 'openfda',
                    }
    except Exception:
        pass

    # Direction 2: check generic1 (or its class) mentioned in generic2's label
    try:
        safety2 = fetch_fn(generic2)
        text2 = ' '.join(safety2.get('drug_interactions', [])).lower()
        if text2:
            for term in terms_for_1:
                if term in text2:
                    return {
                        'severity': 'MODERATE',
                        'description': f'OpenFDA reports a potential interaction between {generic1} and {generic2}.',
                        'recommendation': 'Consult your healthcare provider about taking these medicines together.',
                        'mechanism': f'Mentioned in {generic2} drug interaction labeling (matched: "{term}").',
                        'source': 'openfda',
                    }
    except Exception:
        pass

    return None


class DrugInteractionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DrugInteractionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['interaction_type', 'severity']
    search_fields = ['medicine1', 'medicine2', 'description']
    ordering_fields = ['severity', 'medicine1', 'medicine2']
    ordering = ['-severity']
    
    def get_queryset(self):
        return DrugInteraction.objects.all()


class InteractionCheckViewSet(viewsets.ModelViewSet):
    serializer_class = InteractionCheckSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [OrderingFilter]
    ordering = ['-check_date']
    
    def get_queryset(self):
        return InteractionCheck.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def check(self, request):
        """
        Synchronous interaction check using a layered strategy:

        Layer 1 – Local DB (apps.interactions.DrugInteraction)
        Layer 2 – Medicines DB (apps.medicines.DrugInteraction via FK)
        Layer 3 – Well-known interactions (pattern-based, ~20 major pairs)
        Layer 4 – OpenFDA label cross-reference (bidirectional + drug-class matching)
        Layer 5 – Food interactions (Rwanda FDA → OpenFDA → pattern fallback)
        Layer 6 – Contraindications (Rwanda FDA → OpenFDA)

        Returns results directly so the frontend can display them immediately.
        """
        medicine_ids = request.data.get('medicine_ids', [])
        
        if len(medicine_ids) < 2:
            return Response(
                {'error': 'At least 2 medicines are required to check interactions'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Import medicine model and safety lookup utilities
        from apps.medicines.models import Medicine
        from apps.medicines.safety_lookup import (
            get_generic_name_from_rwanda,
            fetch_openfda_safety_info,
            get_food_advice_rwanda_first,
            check_contraindications_rwanda_first,
        )
        
        # Get user's medicines
        user_medicines = Medicine.objects.filter(
            id__in=medicine_ids, user=request.user
        )
        
        if user_medicines.count() < 2:
            return Response(
                {'error': 'At least 2 valid medicines are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        interactions = []
        contraindications_list = []
        food_interactions_list = []
        medicine_generic_map = {}
        
        # ----- Step 1: Build generic name map (scientific_name → Rwanda FDA → name) -----
        for medicine in user_medicines:
            generic = _resolve_generic_name(medicine)
            rwanda_generic = get_generic_name_from_rwanda(medicine.name)
            medicine_generic_map[medicine.name] = {
                'generic': generic,
                'rwanda_match': rwanda_generic is not None,
            }
        
        # ----- Step 2: Check pairwise drug-drug interactions (layered) -----
        medicine_list = list(user_medicines)
        seen_pairs = set()  # avoid duplicates

        for i, med1 in enumerate(medicine_list):
            for med2 in medicine_list[i + 1:]:
                generic1 = medicine_generic_map[med1.name]['generic']
                generic2 = medicine_generic_map[med2.name]['generic']
                pair_key = tuple(sorted([generic1, generic2]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)

                found = False
                
                # Layer 1: Local interactions DB
                local_interaction = DrugInteraction.objects.filter(
                    Q(medicine1__icontains=generic1, medicine2__icontains=generic2) |
                    Q(medicine1__icontains=generic2, medicine2__icontains=generic1) |
                    Q(medicine1__icontains=med1.name, medicine2__icontains=med2.name) |
                    Q(medicine1__icontains=med2.name, medicine2__icontains=med1.name)
                ).order_by('-severity').first()
                
                if local_interaction:
                    interactions.append({
                        'medicine1': med1.name,
                        'medicine2': med2.name,
                        'severity': local_interaction.severity.upper(),
                        'description': local_interaction.description,
                        'recommendation': local_interaction.recommendation,
                        'mechanism': f'{generic1} + {generic2} interaction',
                        'source': 'local_database',
                    })
                    found = True
                
                # Layer 2: Medicines app DrugInteraction (FK-based)
                if not found:
                    try:
                        from apps.medicines.models import DrugInteraction as MedDrugInteraction
                        med_interaction = MedDrugInteraction.objects.filter(
                            Q(drug1__generic_name__iexact=generic1, drug2__generic_name__iexact=generic2) |
                            Q(drug1__generic_name__iexact=generic2, drug2__generic_name__iexact=generic1)
                        ).first()
                        
                        if med_interaction:
                            interactions.append({
                                'medicine1': med1.name,
                                'medicine2': med2.name,
                                'severity': (med_interaction.severity or 'MODERATE').upper(),
                                'description': med_interaction.description or '',
                                'recommendation': med_interaction.management or '',
                                'mechanism': med_interaction.mechanism or f'{generic1} + {generic2} interaction',
                                'source': 'drug_database',
                            })
                            found = True
                    except Exception as exc:
                        logger.debug(f'Medicines DrugInteraction lookup skipped: {exc}')
                
                # Layer 3: Well-known interactions (pattern-based)
                if not found:
                    # Check both generic names AND original brand names
                    known = _check_known_interactions(generic1, generic2)
                    if not known:
                        known = _check_known_interactions(med1.name, med2.name)
                    if not known and generic1 != med1.name.lower():
                        known = _check_known_interactions(med1.name, generic2)
                    if not known and generic2 != med2.name.lower():
                        known = _check_known_interactions(generic1, med2.name)

                    if known:
                        interactions.append({
                            'medicine1': med1.name,
                            'medicine2': med2.name,
                            'severity': known['severity'],
                            'description': known['description'],
                            'recommendation': known['recommendation'],
                            'mechanism': known['mechanism'],
                            'source': 'known_interactions',
                        })
                        found = True
                
                # Layer 4: OpenFDA bidirectional cross-reference with class matching
                if not found:
                    openfda_result = _openfda_cross_check(
                        generic1, generic2, fetch_openfda_safety_info
                    )
                    if openfda_result:
                        interactions.append({
                            'medicine1': med1.name,
                            'medicine2': med2.name,
                            'severity': openfda_result['severity'],
                            'description': openfda_result['description'],
                            'recommendation': openfda_result['recommendation'],
                            'mechanism': openfda_result['mechanism'],
                            'source': openfda_result['source'],
                        })
        
        # ----- Step 3: Food interactions for each medicine -----
        for medicine in user_medicines:
            try:
                food_result = get_food_advice_rwanda_first(medicine.name)
                for fi in food_result.get('food_interactions', []):
                    food_interactions_list.append({
                        'medicine': medicine.name,
                        'food': fi.get('food', fi.get('description', '')),
                        'severity': fi.get('severity', 'MINOR'),
                        'description': fi.get('description', ''),
                        'recommendation': fi.get('recommendation', ''),
                        'source': food_result.get('source', 'pattern_fallback'),
                    })
            except Exception as exc:
                logger.debug(f'Food advice lookup failed for {medicine.name}: {exc}')
        
        # ----- Step 4: Contraindications -----
        for medicine in user_medicines:
            try:
                contra_result = check_contraindications_rwanda_first(medicine.name)
                for c in contra_result.get('contraindications', []):
                    contraindications_list.append({
                        'medicine': medicine.name,
                        'condition': c.get('condition', c.get('type', '')),
                        'severity': c.get('severity', 'MODERATE'),
                        'description': c.get('description', ''),
                        'source': contra_result.get('source', 'openfda'),
                    })
            except Exception as exc:
                logger.debug(f'Contraindication lookup failed for {medicine.name}: {exc}')
        
        # ----- Save check record -----
        try:
            InteractionCheck.objects.create(
                user=request.user,
                medicines=list(user_medicines.values_list('name', flat=True)),
                interactions_found=interactions,
            )
        except Exception as exc:
            logger.warning(f'Failed to save interaction check record: {exc}')
        
        return Response({
            'interactions': interactions,
            'food_interactions': food_interactions_list,
            'contraindications': contraindications_list,
            'total_interactions': len(interactions),
            'medicines_checked': list(user_medicines.values_list('name', flat=True)),
            'medicine_generic_map': medicine_generic_map,
            'strategy': 'rwanda_fda_first',
        })
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get interaction check history"""
        checks = self.get_queryset()[:10]  # Last 10 checks
        serializer = self.get_serializer(checks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Get detailed results of a specific interaction check"""
        check = self.get_object()
        return Response({
            'check_id': check.id,
            'medicines': check.medicines,
            'interactions_found': check.interactions_found,
            'check_date': check.check_date,
            'total_interactions': len(check.interactions_found)
        })


class ContraindicationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContraindicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['severity']
    search_fields = ['medicine', 'condition', 'description']
    ordering_fields = ['severity', 'medicine', 'condition']
    ordering = ['-severity']
    
    def get_queryset(self):
        return Contraindication.objects.all()
    
    @action(detail=False, methods=['post'])
    def add_allergy(self, request):
        """Add user allergy (creates a contraindication record)"""
        from apps.medicines.models import UserAllergy
        
        data = {
            'user': request.user,
            'allergen': request.data.get('allergen'),
            'severity': request.data.get('severity', 'medium'),
            'reaction': request.data.get('reaction', '')
        }
        
        allergy = UserAllergy.objects.create(**data)
        
        return Response({
            'message': 'Allergy added successfully',
            'allergy_id': allergy.id
        })
    
    @action(detail=False, methods=['delete'])
    def delete_allergy(self, request):
        """Delete user allergy"""
        from apps.medicines.models import UserAllergy
        
        allergy_id = request.data.get('allergy_id')
        try:
            allergy = UserAllergy.objects.get(id=allergy_id, user=request.user)
            allergy.delete()
            return Response({'message': 'Allergy deleted successfully'})
        except UserAllergy.DoesNotExist:
            return Response(
                {'error': 'Allergy not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class DrugDatabaseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DrugDatabaseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['generic_name', 'brand_names', 'drug_class']
    ordering_fields = ['generic_name', 'drug_class']
    ordering = ['generic_name']
    
    def get_queryset(self):
        return DrugDatabase.objects.filter(is_active=True)
    
    @action(detail=False, methods=['post'])
    def initialize_database(self, request):
        """Initialize the drug database with common medications"""
        if request.user.user_type not in ['pharmacy_admin', 'doctor']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Initialize drug database
        drug_task = initialize_drug_database.delay()
        interaction_task = add_common_interactions.delay()
        contraindication_task = add_common_contraindications.delay()
        
        return Response({
            'message': 'Drug database initialization started',
            'tasks': {
                'drugs': drug_task.id,
                'interactions': interaction_task.id,
                'contraindications': contraindication_task.id
            }
        })
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for drugs in the database"""
        query = request.query_params.get('q', '')
        
        if not query:
            return Response(
                {'error': 'Search query is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        drugs = self.get_queryset().filter(
            Q(generic_name__icontains=query) |
            Q(brand_names__icontains=query) |
            Q(drug_class__icontains=query)
        )
        
        serializer = self.get_serializer(drugs, many=True)
        return Response(serializer.data)
