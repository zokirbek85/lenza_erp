from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserSerializer

User = get_user_model()


class UserAccessPermission(permissions.BasePermission):
    safe_roles = {'admin', 'owner', 'accountant', 'warehouse'}
    write_roles = {'admin', 'owner'}

    def has_permission(self, request, view):  # type: ignore[override]
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if request.method in SAFE_METHODS:
            return user.role in self.safe_roles
        return user.role in self.write_roles


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [UserAccessPermission]
    filter_backends = (DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter)
    filterset_fields = ('role', 'is_active')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('-date_joined',)

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        return Response(self.get_serializer(user).data, status=status.HTTP_200_OK)


class TelegramLinkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        telegram_id = getattr(request.user, 'telegram_id', None)
        return Response({'telegram_id': telegram_id}, status=status.HTTP_200_OK)

    def post(self, request):
        telegram_id = request.data.get('telegram_id')
        if telegram_id is None:
            return Response({'detail': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.telegram_id = telegram_id
        user.save(update_fields=['telegram_id'])
        return Response({'telegram_id': user.telegram_id}, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(self.get_serializer(user).data, status=status.HTTP_200_OK)
