from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsReturnEditor(BasePermission):
    """
    Permission logic for Returns:
    - Read (GET): All authenticated users
    - Create (POST): Admin, Accountant, Owner, Sales
    - Update (PUT/PATCH): Admin only
    - Delete (DELETE): Admin only
    """

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        
        role = getattr(user, 'role', None)
        
        # Read access for all authenticated users
        if request.method in SAFE_METHODS:
            return True
        
        # Create access
        if request.method == 'POST':
            return role in ['admin', 'accountant', 'owner', 'sales']
        
        # Update and Delete - Admin only
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            return role == 'admin'
        
        return False
