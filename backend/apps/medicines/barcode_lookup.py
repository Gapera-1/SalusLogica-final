"""
Barcode / medicine lookup utilities.

Uses the OpenFDA Drug API (free, no key required for low-volume use) to resolve
a UPC/EAN barcode or text search query into medicine details that can auto-fill
the AddMedicine form.

Also integrates Rwanda FDA registered drugs database as a fallback for brand name
to generic name resolution when OpenFDA doesn't have the drug.

Docs: https://open.fda.gov/apis/drug/
"""

import csv
import logging
import os
from functools import lru_cache

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

OPENFDA_BASE = 'https://api.fda.gov/drug'
REQUEST_TIMEOUT = 10  # seconds

# Path to Rwanda FDA registered drugs CSV
RWANDA_DRUGS_CSV = os.path.join(
    settings.BASE_DIR, 'data', 'cleaned-data.csv'
)


# ── Rwanda Registered Drugs Database ──────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_rwanda_drugs() -> list[dict]:
    """
    Load Rwanda FDA registered drugs from CSV file.
    Cached in memory for performance.
    """
    drugs = []
    try:
        with open(RWANDA_DRUGS_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                drugs.append({
                    'registration_number': row.get('registration_number', ''),
                    'brand_name': row.get('brand_name', '').strip(),
                    'generic_name': row.get('generic_name', '').strip(),
                    'strength': row.get('strength', '').strip(),
                    'form': row.get('form', '').strip(),
                    'manufacturer': row.get('manufacturer', '').strip(),
                    'country': row.get('country', '').strip(),
                })
        logger.info(f'Loaded {len(drugs)} Rwanda registered drugs')
    except FileNotFoundError:
        logger.warning(f'Rwanda drugs CSV not found at {RWANDA_DRUGS_CSV}')
    except Exception as exc:
        logger.error(f'Error loading Rwanda drugs CSV: {exc}')
    return drugs


def search_rwanda_registry(name: str) -> dict | None:
    """
    Search Rwanda FDA registered drugs by brand name.
    Returns the first matching drug record or None.
    """
    if not name:
        return None
    
    name_lower = name.lower().strip()
    drugs = _load_rwanda_drugs()
    
    # Exact match first
    for drug in drugs:
        if drug['brand_name'].lower() == name_lower:
            return drug
    
    # Partial match (brand name contains search term)
    for drug in drugs:
        if name_lower in drug['brand_name'].lower():
            return drug
    
    return None


def search_rwanda_registry_by_generic(generic_name: str) -> list[dict]:
    """
    Search Rwanda FDA registered drugs by generic name.
    Returns list of matching drugs.
    """
    if not generic_name:
        return []
    
    name_lower = generic_name.lower().strip()
    drugs = _load_rwanda_drugs()
    matches = []
    
    for drug in drugs:
        if name_lower in drug['generic_name'].lower():
            matches.append(drug)
    
    return matches[:10]  # Limit results


def get_generic_from_rwanda_registry(brand_name: str) -> str | None:
    """
    Get generic name for a brand name from Rwanda registry.
    Used as fallback when OpenFDA doesn't recognize a brand.
    """
    drug = search_rwanda_registry(brand_name)
    if drug and drug.get('generic_name'):
        return drug['generic_name']
    return None


def reload_rwanda_registry():
    """
    Clear the Rwanda drugs cache and reload from CSV.
    Useful when the CSV file has been updated.
    """
    _load_rwanda_drugs.cache_clear()
    return _load_rwanda_drugs()


def get_rwanda_registry_stats() -> dict:
    """Get statistics about the loaded Rwanda drugs registry."""
    drugs = _load_rwanda_drugs()
    return {
        'total_drugs': len(drugs),
        'unique_generic_names': len(set(d['generic_name'].lower() for d in drugs if d['generic_name'])),
        'unique_manufacturers': len(set(d['manufacturer'].lower() for d in drugs if d['manufacturer'])),
        'countries': list(set(d['country'] for d in drugs if d['country'])),
    }


def lookup_by_barcode(barcode: str) -> dict | None:
    """
    Look up a medicine by its UPC / EAN / NDC barcode.

    Returns a dict with auto-fill fields, or None if not found.
    """
    if not barcode or not barcode.strip():
        return None

    barcode = barcode.strip()

    # Try NDC (National Drug Code) lookup first — most common on US medicine barcodes
    # UPC-A barcodes for drugs often embed the NDC: strip leading 0 and check digit
    ndc_variants = [barcode]
    if len(barcode) == 12:
        # UPC-A → NDC: drop first 0 and last check digit
        ndc_variants.append(barcode[1:11])
    if len(barcode) == 13:
        # EAN-13 → try inner 10 digits
        ndc_variants.append(barcode[1:11])
        ndc_variants.append(barcode[2:12])

    for ndc in ndc_variants:
        result = _query_openfda('label', f'openfda.package_ndc:"{ndc}"')
        if result:
            return result

    # Fallback: try product_ndc
    for ndc in ndc_variants:
        result = _query_openfda('label', f'openfda.product_ndc:"{ndc}"')
        if result:
            return result

    # Fallback: try UPC directly
    result = _query_openfda('label', f'openfda.upc:"{barcode}"')
    if result:
        return result

    return None


def lookup_by_name(name: str) -> list[dict]:
    """
    Search for medicines by name. Returns up to 5 matches.
    
    Uses OpenFDA as primary source. If no results found for brand name,
    falls back to Rwanda FDA registry to get generic name, then searches
    OpenFDA with the generic name.
    """
    if not name or not name.strip():
        return []

    name = name.strip()

    try:
        # First, try OpenFDA with the original name (brand or generic)
        url = f'{OPENFDA_BASE}/label.json'
        params = {
            'search': f'openfda.brand_name:"{name}"+openfda.generic_name:"{name}"',
            'limit': 5,
        }
        resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        
        results = []
        seen = set()
        
        if resp.status_code == 200:
            data = resp.json()
            for item in data.get('results', []):
                parsed = _parse_label(item)
                if parsed and parsed['name'].lower() not in seen:
                    seen.add(parsed['name'].lower())
                    results.append(parsed)
        
        # If no results found, try Rwanda registry fallback
        if not results:
            logger.info(f'OpenFDA found no results for "{name}", checking Rwanda registry')
            
            # Look up brand name in Rwanda registry to get generic name
            generic_name = get_generic_from_rwanda_registry(name)
            
            if generic_name:
                logger.info(f'Found generic name "{generic_name}" in Rwanda registry for "{name}"')
                
                # Search OpenFDA with the generic name
                params = {
                    'search': f'openfda.generic_name:"{generic_name}"',
                    'limit': 5,
                }
                resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
                
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get('results', []):
                        parsed = _parse_label(item)
                        if parsed and parsed['name'].lower() not in seen:
                            seen.add(parsed['name'].lower())
                            # Add source info indicating this came via Rwanda registry
                            parsed['rwanda_registry_match'] = True
                            parsed['original_brand_name'] = name
                            results.append(parsed)
                
                # If still no OpenFDA results, return Rwanda registry data directly
                if not results:
                    rwanda_drug = search_rwanda_registry(name)
                    if rwanda_drug:
                        results.append(_parse_rwanda_drug(rwanda_drug))

        return results[:5]
    except Exception as exc:
        logger.warning('OpenFDA name search failed: %s', exc)
        
        # On error, try Rwanda registry as fallback
        rwanda_drug = search_rwanda_registry(name)
        if rwanda_drug:
            return [_parse_rwanda_drug(rwanda_drug)]
        return []


def _parse_rwanda_drug(drug: dict) -> dict:
    """Convert Rwanda registry drug record to standard result format."""
    return {
        'name': drug['brand_name'].title() if drug['brand_name'] else '',
        'scientific_name': drug['generic_name'].title() if drug['generic_name'] else '',
        'dosage': drug['strength'] or '',
        'instructions': '',
        'notes': f"Form: {drug['form']}" if drug['form'] else '',
        'route': '',
        'manufacturer': drug['manufacturer'] or '',
        'ndc': '',
        'source': 'rwanda_fda_registry',
        'registration_number': drug['registration_number'],
        'country_of_origin': drug['country'] or '',
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _query_openfda(endpoint: str, search: str) -> dict | None:
    """Run a single OpenFDA query and return parsed result or None."""
    try:
        url = f'{OPENFDA_BASE}/{endpoint}.json'
        resp = requests.get(url, params={'search': search, 'limit': 1}, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return None

        data = resp.json()
        results = data.get('results', [])
        if not results:
            return None

        return _parse_label(results[0])
    except Exception as exc:
        logger.warning('OpenFDA query failed (%s): %s', search, exc)
        return None


def _parse_label(item: dict) -> dict | None:
    """Parse an OpenFDA drug label result into auto-fill fields."""
    openfda = item.get('openfda', {})

    brand_names = openfda.get('brand_name', [])
    generic_names = openfda.get('generic_name', [])

    name = (brand_names[0] if brand_names else
            generic_names[0] if generic_names else None)
    if not name:
        return None

    # Attempt to extract dosage from dosage_and_administration or active_ingredient
    dosage = ''
    dosage_form = openfda.get('dosage_form', [])
    route = openfda.get('route', [])
    active_ingredient = item.get('active_ingredient', [])

    if active_ingredient and isinstance(active_ingredient, list):
        # Often contains strength info
        first_ingredient = active_ingredient[0] if active_ingredient else ''
        if isinstance(first_ingredient, str) and any(c.isdigit() for c in first_ingredient):
            dosage = first_ingredient
    if not dosage and dosage_form:
        dosage = dosage_form[0]

    # Instructions
    instructions_parts = []
    if item.get('dosage_and_administration'):
        admin = item['dosage_and_administration']
        if isinstance(admin, list):
            admin = admin[0]
        # Truncate very long text
        instructions_parts.append(admin[:500] if len(admin) > 500 else admin)

    warnings_parts = []
    if item.get('warnings'):
        warn = item['warnings']
        if isinstance(warn, list):
            warn = warn[0]
        warnings_parts.append(warn[:300] if len(warn) > 300 else warn)

    return {
        'name': name.title(),
        'scientific_name': generic_names[0].title() if generic_names else '',
        'dosage': dosage,
        'instructions': '\n'.join(instructions_parts),
        'notes': '\n'.join(warnings_parts),
        'route': route[0] if route else '',
        'manufacturer': openfda.get('manufacturer_name', [''])[0],
        'ndc': openfda.get('product_ndc', [''])[0],
    }
