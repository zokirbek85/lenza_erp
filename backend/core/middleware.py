import json
import threading

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

_audit_local = threading.local()
WATCHED_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}


class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=255)
    data_snapshot = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        ordering = ('-timestamp',)


def set_current_user(user):
    _audit_local.user = user


def get_current_user():
    return getattr(_audit_local, 'user', None)


class AuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        user = request.user if request.user.is_authenticated else None
        set_current_user(user)
        if request.method in WATCHED_METHODS:
            request._audit_payload = self._extract_payload(request)

    def process_response(self, request, response):
        if request.method in WATCHED_METHODS:
            self._write_log(request)
        set_current_user(None)
        return response

    def process_exception(self, request, exception):
        if request.method in WATCHED_METHODS:
            self._write_log(request)
        set_current_user(None)
        return None

    def _extract_payload(self, request):
        # Skip logging file upload payloads (binary data causes DB errors)
        content_type = request.META.get('CONTENT_TYPE', '')
        if 'multipart/form-data' in content_type or 'application/octet-stream' in content_type:
            return {'_note': 'File upload request - payload not logged'}
        
        body = getattr(request, 'body', b'')
        if not body:
            return {}
        try:
            return json.loads(body.decode('utf-8'))
        except Exception:
            # Avoid logging binary data that can't be decoded
            return {'_note': 'Binary or non-JSON payload - not logged'}

    def _write_log(self, request):
        if getattr(request, '_audit_logged', False):
            return
        snapshot = getattr(request, '_audit_payload', {})
        AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            method=request.method,
            path=request.get_full_path()[:255],
            data_snapshot=snapshot if isinstance(snapshot, dict) else {'data': snapshot},
        )
        request._audit_logged = True


class UpdateLastSeenMiddleware(MiddlewareMixin):
    """
    Updates the last_seen timestamp for authenticated users on each request.
    This enables online status tracking in the user interface.
    """
    def process_response(self, request, response):
        if request.user.is_authenticated:
            # Update last_seen timestamp
            # Using update() to avoid triggering signals and improve performance
            from django.contrib.auth import get_user_model
            User = get_user_model()
            User.objects.filter(pk=request.user.pk).update(last_seen=timezone.now())
        return response
