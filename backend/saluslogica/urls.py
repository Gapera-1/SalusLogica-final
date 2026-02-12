from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.api.views import health_check, api_root
from . import pharmacy_urls

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root),
    path('health/', health_check),
    
    # API endpoints
    path('api/auth/', include('apps.authentication.urls')),
    path('api/medicines/', include('apps.medicines.urls')),
    path('api/doses/', include('apps.doses.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/interactions/', include('apps.interactions.urls')),
    path('api/alarms/', include('apps.alarms.urls')),
    path('api/pharmacy-admin/', include(pharmacy_urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
