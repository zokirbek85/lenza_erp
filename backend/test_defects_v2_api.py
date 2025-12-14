"""
Test script for Defects V2 API endpoints
Run this after starting the Django development server
"""

import requests
import json
from decimal import Decimal

# Configuration
BASE_URL = "http://localhost:8000/api"
# You'll need to update these with valid credentials
USERNAME = "admin"
PASSWORD = "admin"

def get_token():
    """Authenticate and get JWT token"""
    response = requests.post(
        f"{BASE_URL}/token/",
        data={"username": USERNAME, "password": PASSWORD}
    )
    if response.status_code == 200:
        return response.json()["access"]
    else:
        print(f"Authentication failed: {response.status_code}")
        print(response.text)
        return None

def test_defect_types(token):
    """Test defect types endpoint"""
    print("\n=== Testing Defect Types ===")
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/defects-v2/types/", headers=headers)
    print(f"GET /defects-v2/types/ - Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('results', []))} defect types")
    else:
        print(f"Error: {response.text}")

def test_spare_parts(token):
    """Test spare parts endpoint"""
    print("\n=== Testing Spare Parts ===")
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/defects-v2/spare-parts/", headers=headers)
    print(f"GET /defects-v2/spare-parts/ - Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('results', []))} spare parts")
    else:
        print(f"Error: {response.text}")

def test_defect_batches(token):
    """Test defect batches endpoint"""
    print("\n=== Testing Defect Batches ===")
    headers = {"Authorization": f"Bearer {token}"}

    # List batches
    response = requests.get(f"{BASE_URL}/defects-v2/batches/", headers=headers)
    print(f"GET /defects-v2/batches/ - Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('results', []))} defect batches")
        return data.get('results', [])
    else:
        print(f"Error: {response.text}")
        return []

def test_analytics(token):
    """Test analytics endpoint"""
    print("\n=== Testing Analytics ===")
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/defects-v2/analytics/statistics/", headers=headers)
    print(f"GET /defects-v2/analytics/statistics/ - Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Analytics data retrieved successfully")
        print(f"Total batches: {data.get('totals', {}).get('total_batches', 0)}")
    else:
        print(f"Error: {response.text}")

def test_repairs(token):
    """Test repairs endpoint"""
    print("\n=== Testing Repairs ===")
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/defects-v2/repairs/", headers=headers)
    print(f"GET /defects-v2/repairs/ - Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('results', []))} repairs")
    else:
        print(f"Error: {response.text}")

def test_write_offs(token):
    """Test write-offs endpoint"""
    print("\n=== Testing Write-Offs ===")
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(f"{BASE_URL}/defects-v2/write-offs/", headers=headers)
    print(f"GET /defects-v2/write-offs/ - Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('results', []))} write-offs")
    else:
        print(f"Error: {response.text}")

def main():
    """Run all tests"""
    print("=" * 60)
    print("Defects V2 API Test Suite")
    print("=" * 60)

    # Get authentication token
    token = get_token()
    if not token:
        print("\nFailed to authenticate. Please check credentials.")
        return

    print("\nAuthentication successful!")

    # Run tests
    test_defect_types(token)
    test_spare_parts(token)
    test_defect_batches(token)
    test_repairs(token)
    test_write_offs(token)
    test_analytics(token)

    print("\n" + "=" * 60)
    print("Test suite completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()
