from django.urls import path

from .consumers import GlobalConsumer

websocket_urlpatterns = [
    path('ws/global/', GlobalConsumer.as_asgi()),  # legacy global group
    path('ws/notifications/', GlobalConsumer.as_asgi()),  # alias for notification center
]
