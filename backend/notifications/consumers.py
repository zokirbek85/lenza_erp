from channels.generic.websocket import AsyncJsonWebsocketConsumer


class GlobalConsumer(AsyncJsonWebsocketConsumer):
    group_name = 'global'

    async def connect(self):
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast(self, event):
        await self.send_json(event['payload'])
