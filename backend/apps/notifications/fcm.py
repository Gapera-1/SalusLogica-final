"""
Firebase Cloud Messaging (FCM) integration for SalusLogica.

Sends push notifications to web and mobile devices via FCM HTTP v1 API.
Requires a Firebase service account JSON file configured in settings.py.
"""

import logging
from django.conf import settings

logger = logging.getLogger(__name__)

_firebase_app = None


def _get_firebase_app():
    """Lazily initialise the Firebase Admin SDK (once per process)."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_path = getattr(settings, 'FCM_SERVICE_ACCOUNT_FILE', None)
        if cred_path:
            cred = credentials.Certificate(cred_path)
        else:
            # Fall back to Application Default Credentials (ADC)
            cred = credentials.ApplicationDefault()

        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialised")
        return _firebase_app
    except Exception as exc:
        logger.warning("Firebase Admin SDK not available: %s", exc)
        return None


def send_push_to_device(token, title, body, data=None, image=None):
    """
    Send a push notification to a single FCM registration token.

    Returns True on success, False if the token is invalid/expired, or
    None if FCM is not configured.
    """
    app = _get_firebase_app()
    if app is None:
        logger.info("FCM not configured – skipping push to token %s…", token[:20])
        return None

    try:
        from firebase_admin import messaging

        notification = messaging.Notification(
            title=title,
            body=body,
            image=image,
        )

        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                sound='default',
                channel_id='medication_reminders',
                priority='high',
            ),
        )

        webpush_config = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                icon='/favicon.ico',
                badge='/favicon.ico',
                require_interaction=True,
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link='/',
            ),
        )

        message = messaging.Message(
            notification=notification,
            android=android_config,
            webpush=webpush_config,
            data={str(k): str(v) for k, v in (data or {}).items()},
            token=token,
        )

        response = messaging.send(message, app=app)
        logger.info("FCM message sent: %s", response)
        return True

    except Exception as exc:
        error_str = str(exc)
        # Token is stale / unregistered – caller should deactivate it
        if any(keyword in error_str.lower() for keyword in
               ('not-registered', 'invalid-registration', 'unregistered')):
            logger.warning("FCM token invalid, deactivating: %s", token[:20])
            return False
        logger.error("FCM send failed: %s", exc)
        return None


def send_push_to_user(user, title, body, data=None, image=None):
    """
    Send a push notification to ALL active devices for a given user.
    Automatically deactivates stale tokens.
    Returns the number of successful deliveries.
    """
    from .models import FCMDevice

    devices = FCMDevice.objects.filter(user=user, is_active=True)
    if not devices.exists():
        logger.info("No active FCM devices for user %s", user.username)
        return 0

    success_count = 0
    for device in devices:
        result = send_push_to_device(
            token=device.registration_token,
            title=title,
            body=body,
            data=data,
            image=image,
        )
        if result is True:
            success_count += 1
        elif result is False:
            # Invalid token – deactivate
            device.is_active = False
            device.save(update_fields=['is_active'])
            logger.info("Deactivated stale FCM token for %s", user.username)

    return success_count
