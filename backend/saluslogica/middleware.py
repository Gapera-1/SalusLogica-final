import logging
import time

from django.conf import settings


logger = logging.getLogger(__name__)


class RequestTimingMiddleware:
    """
    Middleware to log slow API requests for performance monitoring.

    Logs a warning when a request takes longer than the configured
    SLOW_REQUEST_THRESHOLD_MS setting (in milliseconds).
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.threshold_ms = getattr(settings, "SLOW_REQUEST_THRESHOLD_MS", 500)

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        duration_ms = (time.monotonic() - start) * 1000

        if duration_ms >= self.threshold_ms:
            user_id = getattr(getattr(request, "user", None), "id", None)
            logger.warning(
                "Slow request: %.2f ms %s %s status=%s user_id=%s",
                duration_ms,
                request.method,
                request.get_full_path(),
                getattr(response, "status_code", "unknown"),
                user_id,
            )

        return response

