import base64
from io import BytesIO

import pyotp
import qrcode
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

REQUIRED_2FA_ROLES = {'accountant'}


def _authenticate_request(request):
    if request.user and request.user.is_authenticated:
        return request.user
    username = request.data.get('username')
    password = request.data.get('password')
    if not username or not password:
        return None
    return authenticate(username=username, password=password)


class TwoFactorSetupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = _authenticate_request(request)
        if not user:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        if user.role not in REQUIRED_2FA_ROLES:
            return Response({'detail': '2FA required only for admin/accountant roles.'}, status=status.HTTP_400_BAD_REQUEST)

        secret = pyotp.random_base32()
        user.otp_secret = secret
        user.is_2fa_enabled = False
        user.save(update_fields=['otp_secret', 'is_2fa_enabled'])

        totp = pyotp.TOTP(secret)
        uri = totp.provisioning_uri(name=user.username, issuer_name='Lenza ERP')
        qr = qrcode.make(uri)
        buffer = BytesIO()
        qr.save(buffer, format='PNG')
        image_b64 = base64.b64encode(buffer.getvalue()).decode()
        return Response({'secret': secret, 'qr': image_b64})


class TwoFactorVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = _authenticate_request(request)
        if not user:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        otp = request.data.get('otp')
        if not user.otp_secret:
            return Response({'detail': '2FA not initialized.'}, status=status.HTTP_400_BAD_REQUEST)
        if not otp:
            return Response({'detail': 'OTP code required.'}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(user.otp_secret)
        if not totp.verify(str(otp)):
            return Response({'detail': 'Invalid OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_2fa_enabled = True
        user.save(update_fields=['is_2fa_enabled'])
        return Response({'verified': True})
