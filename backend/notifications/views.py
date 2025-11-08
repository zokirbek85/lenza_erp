from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SystemNotification
from .serializers import SystemNotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = SystemNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return SystemNotification.objects.exclude(read_by=user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.read_by.add(request.user)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all(self, request):
        unread = self.get_queryset()
        for notification in unread:
            notification.read_by.add(request.user)
        return Response({'detail': 'All notifications marked as read.'})
