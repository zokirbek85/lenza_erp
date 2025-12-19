from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DashboardLayout, UserReplacement
from .serializers import UserSerializer, DashboardLayoutSerializer, UserReplacementSerializer

User = get_user_model()


class UserAccessPermission(permissions.BasePermission):
    safe_roles = {'admin', 'owner', 'accountant', 'warehouse', 'sales'}
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

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=['is_active'])
        return Response(self.get_serializer(user).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='replace')
    def replace(self, request, pk=None):
        """
        Replace a user with a new user.
        Creates new user with same permissions, archives old user, logs replacement.
        """
        old_user = self.get_object()
        
        # Validate new user data
        new_user_data = request.data.get('new_user', {})
        archive_reason = request.data.get('archive_reason', User.ArchiveReasons.REPLACED)
        comment = request.data.get('comment', '')
        replacement_date = request.data.get('replacement_date')
        
        if not new_user_data.get('username'):
            return Response(
                {'detail': 'new_user.username is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if username already exists
        if User.objects.filter(username=new_user_data['username']).exists():
            return Response(
                {'detail': 'Username already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Create new user with copied permissions
            new_user = User.objects.create(
                username=new_user_data['username'],
                first_name=new_user_data.get('first_name', ''),
                last_name=new_user_data.get('last_name', ''),
                email=new_user_data.get('email', ''),
                role=old_user.role,
                is_active=True,
                is_staff=old_user.is_staff,
            )
            
            # Set password if provided
            password = new_user_data.get('password')
            if password:
                new_user.set_password(password)
            else:
                new_user.set_unusable_password()
            new_user.save()
            
            # Copy groups and permissions
            new_user.groups.set(old_user.groups.all())
            new_user.user_permissions.set(old_user.user_permissions.all())
            
            # Archive old user
            old_user.is_active = False
            old_user.archived_at = timezone.now()
            old_user.archived_reason = archive_reason
            old_user.save(update_fields=['is_active', 'archived_at', 'archived_reason'])
            
            # Create replacement log
            replacement = UserReplacement.objects.create(
                old_user=old_user,
                new_user=new_user,
                replacement_date=replacement_date or timezone.now().date(),
                replaced_by=request.user,
                comment=comment
            )
        
        return Response({
            'old_user': self.get_serializer(old_user).data,
            'new_user': self.get_serializer(new_user).data,
            'replacement': UserReplacementSerializer(replacement).data
        }, status=status.HTTP_201_CREATED)


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


class DashboardLayoutView(APIView):
    """
    GET: Retrieve current user's dashboard layout
    POST: Save/update current user's dashboard layout
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        layout_obj, created = DashboardLayout.objects.get_or_create(
            user=request.user,
            defaults={'layout': []}
        )
        serializer = DashboardLayoutSerializer(layout_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        layout_obj, created = DashboardLayout.objects.get_or_create(user=request.user)
        serializer = DashboardLayoutSerializer(layout_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
