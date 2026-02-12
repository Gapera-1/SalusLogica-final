"""
Django app configuration for SalusLogica Pharmacy Admin
"""

from django.apps import AppConfig


class SaluslogicaConfig(AppConfig):
    """App configuration for SalusLogica Pharmacy Admin"""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'saluslogica'
    verbose_name = 'SalusLogica Pharmacy Admin'
    
    def ready(self):
        """App initialization"""
        # Import signals if needed
        try:
            from . import signals
        except ImportError:
            pass
