from django.urls import re_path

from .consumers import NotificationConsumer

websocket_urlpatterns = [
    # Primary notifications endpoint
    re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
]
