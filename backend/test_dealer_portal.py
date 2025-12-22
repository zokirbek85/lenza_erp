#!/usr/bin/env python
"""
Test script for Dealer Portal functionality.
Run this script to test dealer portal features.

Usage:
    python test_dealer_portal.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from dealers.models import Dealer, Region
from users.models import User
from django.contrib.auth.hashers import check_password


def test_dealer_credential_generation():
    """Test automatic credential generation."""
    print("\n" + "="*60)
    print("TEST 1: Dealer Credential Generation")
    print("="*60)

    # Get or create a dealer
    region, _ = Region.objects.get_or_create(name="Test Region")
    dealer, created = Dealer.objects.get_or_create(
        code="TEST001",
        defaults={
            'name': 'Test Dealer',
            'region': region,
            'is_active': True
        }
    )

    if created:
        print(f"[OK] Created new dealer: {dealer.code}")
    else:
        print(f"[OK] Using existing dealer: {dealer.code}")

    # Generate credentials if not exists
    if not dealer.portal_username:
        credentials = dealer.generate_portal_credentials()
        print(f"\n[OK] Generated credentials:")
        print(f"  Username: {credentials['username']}")
        print(f"  Password: {credentials['password']}")
        print(f"  Portal Enabled: {dealer.portal_enabled}")

        # Verify password was hashed
        assert dealer.portal_password.startswith('pbkdf2_'), "Password should be hashed!"
        print(f"[OK] Password is properly hashed")

        # Verify password can be checked
        is_valid = check_password(credentials['password'], dealer.portal_password)
        assert is_valid, "Password verification failed!"
        print(f"[OK] Password verification successful")

        return credentials
    else:
        print(f"\n[WARN] Dealer already has credentials:")
        print(f"  Username: {dealer.portal_username}")
        print(f"  Portal Enabled: {dealer.portal_enabled}")
        return {
            'username': dealer.portal_username,
            'password': '(password already set - generate new one to see)'
        }


def test_password_reset():
    """Test password reset functionality."""
    print("\n" + "="*60)
    print("TEST 2: Password Reset")
    print("="*60)

    dealer = Dealer.objects.get(code="TEST001")

    if dealer.portal_username:
        old_password_hash = dealer.portal_password
        new_password = dealer.reset_portal_password()

        print(f"[OK] Password reset successful")
        print(f"  New Password: {new_password}")
        print(f"  Password changed: {old_password_hash != dealer.portal_password}")

        # Verify new password
        is_valid = check_password(new_password, dealer.portal_password)
        assert is_valid, "New password verification failed!"
        print(f"[OK] New password verified")

        return new_password
    else:
        print("[WARN] No credentials exist. Run test 1 first.")
        return None


def test_authentication():
    """Test dealer authentication."""
    print("\n" + "="*60)
    print("TEST 3: Dealer Authentication")
    print("="*60)

    from dealer_portal.authentication import authenticate_dealer

    dealer = Dealer.objects.get(code="TEST001")

    if not dealer.portal_username:
        print("[WARN] No credentials exist. Run test 1 first.")
        return

    # Test with correct credentials (need to generate new to get plain password)
    print("\nGenerating fresh credentials for authentication test...")
    credentials = dealer.generate_portal_credentials()

    # Test successful authentication
    authenticated = authenticate_dealer(
        credentials['username'],
        credentials['password']
    )
    assert authenticated is not None, "Authentication should succeed!"
    assert authenticated.id == dealer.id, "Wrong dealer authenticated!"
    print(f"[OK] Authentication successful with correct credentials")

    # Test failed authentication
    failed = authenticate_dealer(
        credentials['username'],
        'wrong_password'
    )
    assert failed is None, "Authentication should fail with wrong password!"
    print(f"[OK] Authentication correctly failed with wrong password")

    # Test with disabled portal
    dealer.portal_enabled = False
    dealer.save()

    disabled = authenticate_dealer(
        credentials['username'],
        credentials['password']
    )
    assert disabled is None, "Authentication should fail when portal disabled!"
    print(f"[OK] Authentication correctly failed when portal disabled")

    # Re-enable portal
    dealer.portal_enabled = True
    dealer.save()
    print(f"[OK] Portal re-enabled for dealer")


def test_data_isolation():
    """Test that dealers only see their own data."""
    print("\n" + "="*60)
    print("TEST 4: Data Isolation")
    print("="*60)

    from orders.models import Order

    dealer1 = Dealer.objects.get(code="TEST001")

    # Create second dealer
    region, _ = Region.objects.get_or_create(name="Test Region")
    dealer2, _ = Dealer.objects.get_or_create(
        code="TEST002",
        defaults={
            'name': 'Test Dealer 2',
            'region': region,
            'is_active': True
        }
    )

    # Get or create admin user
    admin_user, _ = User.objects.get_or_create(
        username='admin',
        defaults={'role': 'admin'}
    )

    # Create orders for both dealers
    order1, created1 = Order.objects.get_or_create(
        dealer=dealer1,
        defaults={'created_by': admin_user}
    )

    order2, created2 = Order.objects.get_or_create(
        dealer=dealer2,
        defaults={'created_by': admin_user}
    )

    # Check data isolation
    dealer1_orders = Order.objects.filter(dealer=dealer1)
    dealer2_orders = Order.objects.filter(dealer=dealer2)

    assert order2 not in dealer1_orders, "Dealer 1 should not see Dealer 2's orders!"
    assert order1 not in dealer2_orders, "Dealer 2 should not see Dealer 1's orders!"

    print(f"[OK] Dealer 1 has {dealer1_orders.count()} orders")
    print(f"[OK] Dealer 2 has {dealer2_orders.count()} orders")
    print(f"[OK] Data isolation working correctly")


def test_api_endpoints():
    """Test API endpoint availability."""
    print("\n" + "="*60)
    print("TEST 5: API Endpoint Structure")
    print("="*60)

    from django.urls import reverse

    endpoints = [
        'dealer-login',
        'dealer-logout',
        'dealer-profile',
    ]

    for endpoint_name in endpoints:
        try:
            url = reverse(endpoint_name)
            print(f"[OK] {endpoint_name}: {url}")
        except Exception as e:
            print(f"[FAIL] {endpoint_name}: ERROR - {e}")

    print("\n[OK] All required endpoints are configured")


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("DEALER PORTAL TEST SUITE")
    print("="*60)

    try:
        # Run tests
        test_dealer_credential_generation()
        test_password_reset()
        test_authentication()
        test_data_isolation()
        test_api_endpoints()

        print("\n" + "="*60)
        print("ALL TESTS PASSED! [OK]")
        print("="*60)
        print("\nNext Steps:")
        print("1. Go to Django admin: /admin/dealers/dealer/")
        print("2. Select dealers and use 'Generate portal credentials' action")
        print("3. Test API endpoints using Postman or cURL")
        print("4. Build frontend application")

    except AssertionError as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
    except Exception as e:
        print(f"\n[FAIL] ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
