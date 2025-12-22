"""
Dealer portal authentication backend.
Authenticates dealers using portal_username and portal_password.
"""
from django.contrib.auth.hashers import check_password
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from dealers.models import Dealer


class DealerAuthentication(BaseAuthentication):
    """
    Custom authentication for dealer portal.
    Uses portal_username and portal_password from Dealer model.
    """

    def authenticate(self, request):
        """
        Authenticate dealer from request.
        Returns (dealer, None) if authenticated, None otherwise.
        """
        # Try to get dealer from session (already authenticated)
        dealer_id = request.session.get('dealer_id')
        if dealer_id:
            try:
                dealer = Dealer.objects.get(pk=dealer_id, portal_enabled=True, is_active=True)
                return (dealer, None)
            except Dealer.DoesNotExist:
                pass

        return None

    def authenticate_header(self, request):
        """
        Return authentication header for 401 response.
        """
        return 'Dealer'


def authenticate_dealer(username: str, password: str) -> Dealer | None:
    """
    Authenticate dealer by username and password.
    Returns Dealer instance if successful, None otherwise.
    """
    try:
        dealer = Dealer.objects.get(
            portal_username=username,
            portal_enabled=True,
            is_active=True
        )

        if dealer.portal_password and check_password(password, dealer.portal_password):
            return dealer

    except Dealer.DoesNotExist:
        pass

    return None
