from django.urls import path

from .consumers import GlobalConsumer

websocket_urlpatterns = [
    path('ws/global/', GlobalConsumer.as_asgi()),
]
