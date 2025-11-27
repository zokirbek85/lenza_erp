from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsReturnEditor(BasePermission):
    """
    Admin/Accountant/Owner/Sales can create/update; others read-only.
    Warehouse remains view-only.
    """

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        role = getattr(user, 'role', None)
        return role in ['admin', 'accountant', 'owner', 'sales']
