"""
Pharmacy Admin ID Generator
Format: 00x0y0zph/hp0n
- 00x: Country code (3 digits)
- 0y: Province code (2 digits) 
- 0z: District code (2 digits)
- ph/hp: Pharmacy (PH) or Hospital (HP)
- 0n: Sequential number (2 digits)
"""

import random
from typing import Dict, List

class PharmacyAdminIDGenerator:
    """Generate unique pharmacy admin IDs with specified format"""
    
    # Country codes (example: Rwanda - 250, Uganda - 256, etc.)
    COUNTRY_CODES = {
        'RW': '250',
        'UG': '256', 
        'KE': '254',
        'TZ': '255',
        'BI': '257'
    }
    
    # Province codes for Rwanda (example)
    PROVINCE_CODES = {
        'Kigali': '01',
        'Northern': '02',
        'Southern': '03',
        'Eastern': '04',
        'Western': '05'
    }
    
    # District codes (example for each province)
    DISTRICT_CODES = {
        'Kigali': {
            'Nyarugenge': '01',
            'Kicukiro': '02', 
            'Gasabo': '03'
        },
        'Northern': {
            'Burera': '01',
            'Gicumbi': '02',
            'Musanze': '03',
            'Rulindo': '04'
        },
        'Southern': {
            'Gisagara': '01',
            'Huye': '02',
            'Kamonyi': '03',
            'Muhanga': '04',
            'Nyamagabe': '05',
            'Nyanza': '06',
            'Ruhango': '07'
        },
        'Eastern': {
            'Bugesera': '01',
            'Gatsibo': '02',
            'Kayonza': '03',
            'Kirehe': '04',
            'Ngoma': '05',
            'Nyagatare': '06',
            'Rwamagana': '07'
        },
        'Western': {
            'Karongi': '01',
            'Ngororero': '02',
            'Nyabihu': '03',
            'Nyamasheke': '04',
            'Rubavu': '05',
        }
    }
    
    # Type codes
    TYPE_CODES = {
        'pharmacy': 'PH',
        'hospital': 'HP'
    }
    
    def __init__(self):
        self.used_ids = set()
    
    def generate_id(self, country: str, province: str, district: str, 
                   facility_type: str, sequential_number: int = None) -> str:
        """
        Generate pharmacy admin ID
        
        Args:
            country: Country code (e.g., 'RW', 'UG')
            province: Province name
            district: District name
            facility_type: 'pharmacy' or 'hospital'
            sequential_number: Optional specific number (1-99)
            
        Returns:
            Formatted pharmacy admin ID string
        """
        
        # Get country code
        country_code = self.COUNTRY_CODES.get(country.upper())
        if not country_code:
            raise ValueError(f"Invalid country code: {country}")
        
        # Get province code
        province_code = self.PROVINCE_CODES.get(province)
        if not province_code:
            raise ValueError(f"Invalid province: {province}")
        
        # Get district code
        district_codes = self.DISTRICT_CODES.get(province, {})
        district_code = district_codes.get(district)
        if not district_code:
            raise ValueError(f"Invalid district: {district} for province: {province}")
        
        # Get type code
        type_code = self.TYPE_CODES.get(facility_type.lower())
        if not type_code:
            raise ValueError(f"Invalid facility type: {facility_type}")
        
        # Generate sequential number if not provided
        if sequential_number is None:
            sequential_number = self._generate_sequential_number(
                country_code, province_code, district_code, type_code
            )
        
        # Validate sequential number
        if not (1 <= sequential_number <= 99):
            raise ValueError("Sequential number must be between 1 and 99")
        
        # Format the ID
        formatted_number = f"{sequential_number:02d}"
        pharmacy_id = f"{country_code}{province_code}{district_code}{type_code}{formatted_number}"
        
        # Check for uniqueness
        if pharmacy_id in self.used_ids:
            # Generate new sequential number
            return self.generate_id(country, province, district, facility_type)
        
        self.used_ids.add(pharmacy_id)
        return pharmacy_id
    
    def _generate_sequential_number(self, country_code: str, province_code: str, 
                                  district_code: str, type_code: str) -> int:
        """Generate a random sequential number between 1-99"""
        return random.randint(1, 99)
    
    def parse_id(self, pharmacy_id: str) -> Dict:
        """
        Parse pharmacy admin ID and return components
        
        Args:
            pharmacy_id: Pharmacy admin ID string
            
        Returns:
            Dictionary with parsed components
        """
        if len(pharmacy_id) != 11:
            raise ValueError("Invalid pharmacy ID length")
        
        # Parse components
        country_code = pharmacy_id[:3]
        province_code = pharmacy_id[3:5]
        district_code = pharmacy_id[5:7]
        type_code = pharmacy_id[7:9]
        sequential_number = pharmacy_id[9:11]
        
        # Reverse lookup country
        country = None
        for code, value in self.COUNTRY_CODES.items():
            if value == country_code:
                country = code
                break
        
        # Reverse lookup province
        province = None
        for code, value in self.PROVINCE_CODES.items():
            if value == province_code:
                province = code
                break
        
        # Reverse lookup district
        district = None
        if province:
            district_codes = self.DISTRICT_CODES.get(province, {})
            for code, value in district_codes.items():
                if value == district_code:
                    district = code
                    break
        
        # Reverse lookup type
        facility_type = None
        for code, value in self.TYPE_CODES.items():
            if value == type_code:
                facility_type = code
                break
        
        return {
            'country': country,
            'country_code': country_code,
            'province': province,
            'province_code': province_code,
            'district': district,
            'district_code': district_code,
            'facility_type': facility_type,
            'type_code': type_code,
            'sequential_number': int(sequential_number),
            'full_id': pharmacy_id
        }
    
    def validate_id(self, pharmacy_id: str) -> bool:
        """
        Validate pharmacy admin ID format
        
        Args:
            pharmacy_id: Pharmacy admin ID string
            
        Returns:
            True if valid, False otherwise
        """
        try:
            self.parse_id(pharmacy_id)
            return True
        except (ValueError, KeyError):
            return False
    
    def get_available_countries(self) -> List[str]:
        """Get list of available countries"""
        return list(self.COUNTRY_CODES.keys())
    
    def get_available_provinces(self) -> List[str]:
        """Get list of available provinces"""
        return list(self.PROVINCE_CODES.keys())
    
    def get_available_districts(self, province: str) -> List[str]:
        """Get list of available districts for a province"""
        return list(self.DISTRICT_CODES.get(province, {}).keys())


# Example usage and testing
if __name__ == "__main__":
    generator = PharmacyAdminIDGenerator()
    
    # Generate some example IDs
    examples = [
        ('RW', 'Kigali', 'Nyarugenge', 'pharmacy'),
        ('RW', 'Northern', 'Musanze', 'hospital'),
        ('UG', 'Central', 'Kampala', 'pharmacy'),
    ]
    
    for country, province, district, facility_type in examples:
        try:
            pharmacy_id = generator.generate_id(country, province, district, facility_type)
            print(f"Generated ID: {pharmacy_id}")
            
            # Parse and display components
            parsed = generator.parse_id(pharmacy_id)
            print(f"Parsed: {parsed}")
            print("-" * 50)
        except ValueError as e:
            print(f"Error: {e}")
