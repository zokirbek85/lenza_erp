from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import DashboardLayout, UserReplacement

User = get_user_model()


class DashboardLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardLayout
        fields = ('layout', 'updated_at')
        read_only_fields = ('updated_at',)


class UserReplacementSerializer(serializers.ModelSerializer):
    old_user_name = serializers.CharField(source='old_user.get_full_name', read_only=True)
    new_user_name = serializers.CharField(source='new_user.get_full_name', read_only=True)
    replaced_by_name = serializers.CharField(source='replaced_by.get_full_name', read_only=True)

    class Meta:
        model = UserReplacement
        fields = (
            'id',
            'old_user',
            'old_user_name',
            'new_user',
            'new_user_name',
            'replacement_date',
            'replaced_at',
            'replaced_by',
            'replaced_by_name',
            'comment',
        )
        read_only_fields = ('id', 'replaced_at')


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    is_online = serializers.BooleanField(read_only=True)
    archived_reason_display = serializers.CharField(source='get_archived_reason_display', read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'first_name',
            'last_name',
            'email',
            'role',
            'role_display',
            'is_active',
            'password',
            'last_seen',
            'is_online',
            'archived_at',
            'archived_reason',
            'archived_reason_display',
        )

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
