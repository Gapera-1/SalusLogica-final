"""
Barcode / medicine lookup utilities.

Uses the OpenFDA Drug API (free, no key required for low-volume use) to resolve
a UPC/EAN barcode or text search query into medicine details that can auto-fill
the AddMedicine form.

Docs: https://open.fda.gov/apis/drug/
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

OPENFDA_BASE = 'https://api.fda.gov/drug'
REQUEST_TIMEOUT = 10  # seconds


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
    Search for medicines by name.  Returns up to 5 matches.
    """
    if not name or not name.strip():
        return []

    name = name.strip()

    try:
        url = f'{OPENFDA_BASE}/label.json'
        params = {
            'search': f'openfda.brand_name:"{name}"+openfda.generic_name:"{name}"',
            'limit': 5,
        }
        resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return []

        data = resp.json()
        results = []
        seen = set()
        for item in data.get('results', []):
            parsed = _parse_label(item)
            if parsed and parsed['name'].lower() not in seen:
                seen.add(parsed['name'].lower())
                results.append(parsed)

        return results[:5]
    except Exception as exc:
        logger.warning('OpenFDA name search failed: %s', exc)
        return []


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
