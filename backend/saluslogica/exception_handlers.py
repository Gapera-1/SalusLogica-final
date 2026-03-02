"""
Custom exception handlers for Django REST Framework API endpoints
Provides consistent error responses across all API endpoints
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.http import Http404
from django.core.exceptions import PermissionDenied
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that provides consistent error responses
    
    Returns JSON responses for API endpoints with helpful error messages
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Get the view that raised the exception
    view = context.get('view', None)
    request = context.get('request', None)
    
    # Log the exception
    if response is not None:
        logger.warning(
            f"API Exception: {exc.__class__.__name__} - {str(exc)} "
            f"[View: {view.__class__.__name__ if view else 'Unknown'}]"
        )
    
    # Customize the response format
    if response is not None:
        # Standard error response format
        custom_response_data = {
            'success': False,
            'error': {
                'message': get_error_message(exc, response),
                'type': exc.__class__.__name__,
                'status_code': response.status_code,
            }
        }
        
        # Add field errors if they exist (validation errors)
        if isinstance(response.data, dict):
            if 'detail' not in response.data and response.data:
                custom_response_data['error']['fields'] = response.data
        
        # Add helpful suggestions based on error type
        suggestions = get_error_suggestions(response.status_code, exc)
        if suggestions:
            custom_response_data['error']['suggestions'] = suggestions
        
        response.data = custom_response_data
    
    # Handle exceptions that DRF doesn't handle
    elif isinstance(exc, Http404):
        custom_response_data = {
            'success': False,
            'error': {
                'message': 'The requested resource was not found.',
                'type': 'NotFound',
                'status_code': 404,
                'suggestions': [
                    'Check the URL for typos',
                    'Verify the resource ID is correct',
                    'Make sure the resource exists',
                ]
            }
        }
        response = Response(custom_response_data, status=status.HTTP_404_NOT_FOUND)
    
    elif isinstance(exc, PermissionDenied):
        custom_response_data = {
            'success': False,
            'error': {
                'message': 'You do not have permission to perform this action.',
                'type': 'PermissionDenied',
                'status_code': 403,
                'suggestions': [
                    'Verify you are logged in',
                    'Check your account permissions',
                    'Contact an administrator if you need access',
                ]
            }
        }
        response = Response(custom_response_data, status=status.HTTP_403_FORBIDDEN)
    
    return response


def get_error_message(exc, response):
    """
    Extract a user-friendly error message from the exception
    """
    # Try to get detail from response data
    if isinstance(response.data, dict):
        if 'detail' in response.data:
            return str(response.data['detail'])
        elif 'message' in response.data:
            return str(response.data['message'])
        # For validation errors, extract the actual messages
        elif response.data:
            # Collect field error messages
            messages = []
            for key, value in response.data.items():
                if isinstance(value, list):
                    messages.extend([str(v) for v in value])
                elif isinstance(value, str):
                    messages.append(value)
            if messages:
                return '; '.join(messages)
            return 'Validation error. Please check your input.'
    
    # Fall back to exception message
    return str(exc) if str(exc) else 'An error occurred processing your request.'


def get_error_suggestions(status_code, exc):
    """
    Provide helpful suggestions based on error type
    """
    suggestions = {
        400: [
            'Check your request data for errors',
            'Verify all required fields are provided',
            'Ensure data types are correct',
        ],
        401: [
            'Make sure you are logged in',
            'Check your authentication token is valid',
            'Try logging in again',
        ],
        403: [
            'Verify you have permission to perform this action',
            'Check your account role and permissions',
            'Contact support if you believe this is an error',
        ],
        404: [
            'Check the URL is correct',
            'Verify the resource ID exists',
            'Try searching for the resource',
        ],
        405: [
            'Check the HTTP method (GET, POST, PUT, DELETE)',
            'Review the API documentation for this endpoint',
        ],
        429: [
            'Wait a moment before trying again',
            'You may have exceeded the rate limit',
        ],
        500: [
            'Try again in a few moments',
            'Contact support if the problem persists',
            'Check your request data is valid',
        ],
    }
    
    return suggestions.get(status_code, [])


def api_404_response(message="Resource not found"):
    """
    Helper function for consistent 404 API responses
    """
    return Response({
        'success': False,
        'error': {
            'message': message,
            'type': 'NotFound',
            'status_code': 404,
            'suggestions': [
                'Verify the resource ID is correct',
                'Check the resource exists',
                'Review the API documentation',
            ]
        }
    }, status=status.HTTP_404_NOT_FOUND)


def api_403_response(message="Permission denied"):
    """
    Helper function for consistent 403 API responses
    """
    return Response({
        'success': False,
        'error': {
            'message': message,
            'type': 'PermissionDenied',
            'status_code': 403,
            'suggestions': [
                'Verify you are logged in',
                'Check your account permissions',
                'Contact an administrator',
            ]
        }
    }, status=status.HTTP_403_FORBIDDEN)


def api_500_response(message="Internal server error"):
    """
    Helper function for consistent 500 API responses
    """
    return Response({
        'success': False,
        'error': {
            'message': message,
            'type': 'InternalServerError',
            'status_code': 500,
            'suggestions': [
                'Wait a moment and try again',
                'Contact support if the issue persists',
            ]
        }
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
