from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model

User = get_user_model()


class GlobalConsumer(AsyncJsonWebsocketConsumer):
    group_name = 'global'

    async def connect(self):
        # Extract token from query string
        query_string = self.scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]
        
        # Validate JWT token
        if token:
            try:
                UntypedToken(token)
                await self.channel_layer.group_add(self.group_name, self.channel_name)
                await self.accept()
            except (InvalidToken, TokenError) as e:
                print(f'[WS] Invalid token: {e}')
                await self.close()
        else:
            print('[WS] No token provided')
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast(self, event):
        await self.send_json(event['payload'])
