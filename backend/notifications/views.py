from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import SystemNotification
from .serializers import SystemNotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = SystemNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return all notifications, newest first; serializer computes is_read per user
        return SystemNotification.objects.all().order_by('-created_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.read_by.add(request.user)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all(self, request):
        # Mark all unread as read for the current user
        unread = SystemNotification.objects.exclude(read_by=request.user)
        for notification in unread:
            notification.read_by.add(request.user)
        return Response({'detail': 'All notifications marked as read.'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        # Alias endpoint as required by frontend
        return self.mark_all(request)
