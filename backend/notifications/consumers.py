"""WebSocket consumers for notifications.

This module defines a per-user NotificationConsumer that authenticates the
client using a JWT access token passed as a query string parameter
``?token=<JWT>``. Upon successful authentication the connection joins a
channel layer group named ``user_<id>`` enabling server-side code to push
events targeted at that specific user.

Usage (server side):
    from channels.layers import get_channel_layer
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"user_{user.id}",
        {"type": "send_notification", "message": {"title": "Hello", "body": "World"}}
    )

Incoming client messages are echoed back (useful for simple health checks).
"""

from urllib.parse import parse_qs
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    user = None
    group_name: str | None = None

    async def connect(self):
        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        raw_token = params.get('token', [None])[0]

        self.user = await self._get_user(raw_token)
        if not self.user or isinstance(self.user, AnonymousUser):
            await self.close()
            return

        self.group_name = f'user_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        # Also join a shared 'global' group to support legacy broadcasts
        await self.channel_layer.group_add('global', self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        # Leave global group as well
        await self.channel_layer.group_discard('global', self.channel_name)

    async def receive(self, text_data: str):
        """Echo back received JSON (basic diagnostic)."""
        try:
            payload = json.loads(text_data)
        except json.JSONDecodeError:
            payload = {"_raw": text_data}
        await self.send(text_data=json.dumps({"echo": payload}))

    async def send_notification(self, event):
        """Handler for group_send with type 'send_notification'."""
        message = event.get('message', {})
        await self.send(text_data=json.dumps(message))

    async def broadcast(self, event):
        """Handler for legacy global broadcasts with 'payload' shape."""
        payload = event.get('payload', {})
        await self.send(text_data=json.dumps(payload))

    @database_sync_to_async
    def _get_user(self, token: str | None):
        if not token:
            return None
        try:
            validated = AccessToken(token)
            user_id = validated.get('user_id')
            if not user_id:
                return None
            return User.objects.get(id=user_id)
        except Exception:
            return None
