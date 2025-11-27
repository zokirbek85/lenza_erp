"""
Custom permissions for Cashbox and Expenses modules.
Business rules:
- Admin, Accountant, Owner: full access to expenses and cashbox
- Manager: read-only access
- Sales: no access to expenses, read-only to cashbox summary
"""
from rest_framework.permissions import BasePermission


class IsAdminOrAccountantForExpenses(BasePermission):
    """
    Only Admin, Accountant, and Owner can create/update/delete expenses.
    Others get read-only or no access.
    """
    
    def has_permission(self, request, view):
        # Unauthenticated users have no access
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superuser always allowed
        if request.user.is_superuser:
            return True
        
        # Check user role
        user_role = getattr(request.user, 'role', None)
        
        # Read-only methods allowed for manager
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return user_role in ['admin', 'accountant', 'owner', 'manager']
        
        # Write methods (POST, PUT, PATCH, DELETE) only for admin, accountant, owner
        return user_role in ['admin', 'accountant', 'owner']


class IsAdminOrAccountantForCashbox(BasePermission):
    """
    Only Admin, Accountant, and Owner can manage cashbox opening balances.
    Others can view summary.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        user_role = getattr(request.user, 'role', None)
        
        # Read-only allowed for all authenticated users
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # Write methods only for admin, accountant, owner
        return user_role in ['admin', 'accountant', 'owner']


class CannotCreateExpensesForSales(BasePermission):
    """
    Sales role explicitly cannot create expenses.
    This is an additional safeguard.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        user_role = getattr(request.user, 'role', None)
        
        # Explicitly deny expense creation for sales
        if request.method == 'POST' and user_role == 'sales':
            return False
        
        return True


class IsAdminOwnerAccountant(BasePermission):
    """
    Permissions for ExpenseViewSet:
    - POST/PUT/PATCH/DELETE: admin or accountant
    - GET/HEAD/OPTIONS: admin, accountant, owner (manager read-only allowed)
    - Sales users cannot create expenses
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        role = getattr(request.user, 'role', None)

        # Safe methods: allow owner to view, allow manager read-only
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return role in ['admin', 'accountant', 'owner', 'manager']

        # Write methods explicitly limited to admin/accountant
        if request.method == 'POST':
            return role in ['admin', 'accountant']

        # For other write methods (PUT/PATCH/DELETE) follow the same rule
        return role in ['admin', 'accountant']
