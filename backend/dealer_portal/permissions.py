"""
Permissions for dealer portal.
"""
from rest_framework.permissions import BasePermission
from dealers.models import Dealer


class IsDealerAuthenticated(BasePermission):
    """
    Permission class to check if user is an authenticated dealer.
    """

    def has_permission(self, request, view):
        """
        Check if request has authenticated dealer in session.
        """
        dealer_id = request.session.get('dealer_id')
        if not dealer_id:
            return False

        try:
            dealer = Dealer.objects.get(
                pk=dealer_id,
                portal_enabled=True,
                is_active=True
            )
            # Attach dealer to request for easy access
            request.user = dealer
            return True
        except Dealer.DoesNotExist:
            return False
