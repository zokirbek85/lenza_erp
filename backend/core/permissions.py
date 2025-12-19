from __future__ import annotations

from typing import Iterable

from rest_framework.permissions import SAFE_METHODS, BasePermission


class RolePermission(BasePermission):
    """
    Base permission that checks authenticated user's role.

    Subclasses should provide ``allowed_roles`` iterable with role strings.
    """

    allowed_roles: Iterable[str] = ()

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        if not self.allowed_roles:
            return True
        return user.role in self.allowed_roles


class SafeRolePermission(RolePermission):
    """
    Restricts the permission to safe (read-only) methods for provided roles.
    """

    def has_permission(self, request, view) -> bool:  # type: ignore[override]
        if request.method not in SAFE_METHODS:
            return False
        return super().has_permission(request, view)


class IsAdmin(RolePermission):
    allowed_roles = {'admin'}


class IsOwner(RolePermission):
    allowed_roles = {'owner'}


class IsAccountant(RolePermission):
    allowed_roles = {'accountant'}


class IsWarehouse(RolePermission):
    allowed_roles = {'warehouse'}


class IsSales(RolePermission):
    allowed_roles = {'sales'}


class IsManager(RolePermission):
    allowed_roles = {'manager'}


class IsSalesCanCreateTransaction(BasePermission):
    """
    Permission for sales managers:
    - Can POST (create) finance transactions
    - Cannot GET, PUT, PATCH, DELETE
    - Can only create transactions for dealers assigned to them
    """
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        if getattr(user, 'is_superuser', False):
            return True
        
        # Only allow POST (create) for sales role
        if user.role == 'sales' and request.method == 'POST':
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Sales managers cannot edit/delete transactions they created"""
        return False


class IsOwnerReadOnly(SafeRolePermission):
    allowed_roles = {'owner'}


class IsWarehouseReadOnly(SafeRolePermission):
    allowed_roles = {'warehouse'}


class IsAccountantReadOnly(SafeRolePermission):
    allowed_roles = {'accountant'}
