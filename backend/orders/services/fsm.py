"""
Order Status FSM (Finite State Machine)
Provides transaction-safe, role-based status transition validation.
"""
from typing import Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

User = get_user_model()


# Allowed status transitions (FSM graph)
ALLOWED_TRANSITIONS = {
    'created': {'confirmed', 'cancelled'},
    'confirmed': {'packed', 'cancelled'},
    'packed': {'shipped', 'cancelled'},
    'shipped': {'delivered', 'returned', 'cancelled'},
    'delivered': {'returned'},  # Can be returned after delivery
    'cancelled': set(),  # Terminal state
    'returned': set(),  # Terminal state
}


# Role-based permissions for status transitions
# Format: (from_status, to_status) -> allowed_roles
ROLE_PERMISSIONS = {
    # Created → Confirmed/Cancelled
    ('created', 'confirmed'): {'admin', 'sales', 'owner', 'accountant'},
    ('created', 'cancelled'): {'admin', 'sales', 'owner', 'accountant'},
    
    # Confirmed → Packed/Cancelled
    ('confirmed', 'packed'): {'admin', 'warehouse', 'owner', 'accountant'},
    ('confirmed', 'cancelled'): {'admin', 'owner', 'accountant'},
    
    # Packed → Shipped/Cancelled
    ('packed', 'shipped'): {'admin', 'warehouse', 'owner', 'accountant'},
    ('packed', 'cancelled'): {'admin', 'owner', 'accountant'},
    
    # Shipped → Delivered/Returned/Cancelled
    ('shipped', 'delivered'): {'admin', 'warehouse', 'owner', 'accountant'},
    ('shipped', 'returned'): {'admin', 'warehouse', 'owner', 'accountant'},
    ('shipped', 'cancelled'): {'admin', 'owner', 'accountant'},
    
    # Delivered → Returned
    ('delivered', 'returned'): {'admin', 'warehouse', 'owner', 'accountant'},
}


# Warehouse strict workflow (one-way path)
WAREHOUSE_FLOW = {
    'confirmed': 'packed',
    'packed': 'shipped',
    'shipped': 'delivered',
    'delivered': 'returned',
}


def validate_transition(
    order,
    new_status: str,
    user: Optional[User] = None,
    skip_role_check: bool = False
) -> None:
    """
    Validate order status transition.
    
    Args:
        order: Order instance
        new_status: Target status
        user: User performing the transition
        skip_role_check: Skip role validation (for system operations)
    
    Raises:
        ValidationError: If transition is not allowed
    """
    current_status = order.status
    
    # 1. Check if transition is valid in FSM
    if new_status == current_status:
        return  # No change, nothing to validate
    
    allowed_next = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed_next:
        raise ValidationError({
            'status': f"Status o'tishi mumkin emas: '{current_status}' → '{new_status}'. "
                     f"Ruxsat etilgan: {', '.join(allowed_next) if allowed_next else 'hech qanday'}"
        })
    
    # 2. Check role-based permissions
    if not skip_role_check and user:
        transition_key = (current_status, new_status)
        allowed_roles = ROLE_PERMISSIONS.get(transition_key, set())
        
        # Superuser bypass
        if user.is_superuser:
            return
        
        user_role = getattr(user, 'role', None)
        if not user_role:
            raise ValidationError({
                'status': 'Foydalanuvchi roli aniqlanmagan.'
            })
        
        # Special case: sales can only change their own orders
        if user_role == 'sales':
            if order.created_by_id != user.id:
                raise ValidationError({
                    'status': 'Manager faqat o\'z buyurtmalarini o\'zgartirishi mumkin.'
                })
        
        # Warehouse strict workflow validation
        if user_role == 'warehouse':
            expected_next = WAREHOUSE_FLOW.get(current_status)
            if new_status != expected_next:
                raise ValidationError({
                    'status': f"Warehouse faqat qat'iy ketma-ketlikda: '{current_status}' → '{expected_next}'. "
                             f"Siz '{new_status}' ga o'tkazishga harakat qildingiz."
                })
        
        # Check if role is allowed for this transition
        if user_role not in allowed_roles:
            raise ValidationError({
                'status': f"Sizning rolingiz ('{user_role}') ushbu o'tishni amalga oshira olmaydi. "
                         f"Ruxsat etilgan rollar: {', '.join(allowed_roles)}"
            })


def apply_status_transition(order, new_status: str, user: Optional[User] = None) -> None:
    """
    Apply status transition with validation and logging.
    Must be called within transaction.atomic().
    
    Args:
        order: Order instance (must be locked with select_for_update)
        new_status: Target status
        user: User performing the transition
    """
    # Validate transition
    validate_transition(order, new_status, user)
    
    if order.status == new_status:
        return  # No change needed
    
    old_status = order.status
    
    # Apply new status
    order.status = new_status
    order.save(update_fields=['status', 'updated_at'])
    
    # Log status change
    from orders.models import OrderStatusLog
    OrderStatusLog.objects.create(
        order=order,
        old_status=old_status,
        new_status=new_status,
        by_user=user
    )


def get_allowed_next_statuses(order, user: Optional[User] = None) -> list[str]:
    """
    Get list of statuses that user can transition to.
    
    Args:
        order: Order instance
        user: User requesting allowed transitions
    
    Returns:
        List of allowed status values
    """
    current_status = order.status
    
    # Get FSM-allowed transitions
    allowed_by_fsm = ALLOWED_TRANSITIONS.get(current_status, set())
    if not allowed_by_fsm:
        return []
    
    # If no user, return FSM-allowed only
    if not user:
        return sorted(list(allowed_by_fsm))
    
    # Superuser can do anything
    if user.is_superuser:
        return sorted(list(allowed_by_fsm))
    
    user_role = getattr(user, 'role', None)
    if not user_role:
        return []
    
    # Admin/owner/accountant can transition to any FSM-allowed status
    if user_role in {'admin', 'owner', 'accountant'}:
        return sorted(list(allowed_by_fsm))
    
    # Sales: only their own orders, all FSM-allowed transitions
    if user_role == 'sales':
        if order.created_by_id == user.id:
            return sorted(list(allowed_by_fsm))
        return []
    
    # Warehouse: only next step in workflow
    if user_role == 'warehouse':
        next_step = WAREHOUSE_FLOW.get(current_status)
        return [next_step] if next_step else []
    
    return []


def can_change_status(order, user: Optional[User] = None, new_status: Optional[str] = None) -> bool:
    """
    Check if user can change order status.
    
    Args:
        order: Order instance
        user: User requesting permission
        new_status: Optional specific target status
    
    Returns:
        True if user can change status (to new_status if provided)
    """
    if not user:
        return False
    
    # Superuser can do anything
    if user.is_superuser:
        return True
    
    user_role = getattr(user, 'role', None)
    if not user_role:
        return False
    
    # Admin/owner/accountant can always change
    if user_role in {'admin', 'owner', 'accountant'}:
        if new_status:
            # Still check FSM validity
            try:
                validate_transition(order, new_status, user, skip_role_check=True)
                return True
            except ValidationError:
                return False
        return True
    
    # Sales: only their own orders
    if user_role == 'sales':
        if order.created_by_id == user.id:
            if new_status:
                try:
                    validate_transition(order, new_status, user)
                    return True
                except ValidationError:
                    return False
            return True
        return False
    
    # Warehouse: only workflow transitions
    if user_role == 'warehouse':
        if new_status:
            expected = WAREHOUSE_FLOW.get(order.status)
            return new_status == expected
        return order.status in WAREHOUSE_FLOW
    
    return False
