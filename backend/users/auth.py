import pyotp
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

REQUIRED_2FA_ROLES = {'accountant'}


class RoleAwareTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.role in REQUIRED_2FA_ROLES:
            if not user.otp_secret or not user.is_2fa_enabled:
                raise AuthenticationFailed('2FA setup required for this role.')
            otp = self.context['request'].data.get('otp')
            if not otp:
                raise AuthenticationFailed('OTP code is required.')
            totp = pyotp.TOTP(user.otp_secret)
            if not totp.verify(str(otp)):
                raise AuthenticationFailed('Invalid OTP code.')
        return data


class RoleAwareTokenObtainPairView(TokenObtainPairView):
    serializer_class = RoleAwareTokenSerializer
