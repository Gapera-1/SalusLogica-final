from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json

@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint for frontend"""
    return JsonResponse({
        'status': 'healthy',
        'message': 'SalusLogica API is running',
        'version': '1.0.0',
        'frontend': 'React SPA',
        'backend': 'Django REST API'
    })

@csrf_exempt
@require_http_methods(["GET"])
def api_root(request):
    """API root endpoint"""
    return JsonResponse({
        'message': 'SalusLogica Medicine Reminder API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/',
            'medicines': '/api/medicines/',
            'doses': '/api/doses/',
            'notifications': '/api/notifications/',
            'analytics': '/api/analytics/',
            'interactions': '/api/interactions/',
            'alarms': '/api/alarms/'
        }
    })
