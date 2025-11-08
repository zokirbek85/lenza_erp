from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def push_global(event: str, payload: dict):
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
    async_to_sync(channel_layer.group_send)(
        'global',
        {
            'type': 'broadcast',
            'payload': {
                'event': event,
                'data': payload,
            },
        },
    )
