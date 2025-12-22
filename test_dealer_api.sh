#!/bin/bash
# Dealer Portal API Test Script
#
# Usage: bash test_dealer_api.sh
#
# Prerequisites:
# - Server running on localhost:8000
# - Dealer credentials generated via admin panel

BASE_URL="http://localhost:8000/api/dealer-portal"

echo "========================================="
echo "DEALER PORTAL API TEST"
echo "========================================="
echo ""

# Test 1: Login
echo "Test 1: Login"
echo "-------------"
CREDENTIALS='{"username": "test001", "password": "YOUR_PASSWORD_HERE"}'
echo "Request: POST $BASE_URL/login/"
echo "Body: $CREDENTIALS"

curl -X POST "$BASE_URL/login/" \
  -H "Content-Type: application/json" \
  -d "$CREDENTIALS" \
  -c cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq . 2>/dev/null || cat

echo ""
echo ""

# Test 2: Get Profile
echo "Test 2: Get Profile"
echo "-------------------"
echo "Request: GET $BASE_URL/profile/"

curl "$BASE_URL/profile/" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq . 2>/dev/null || cat

echo ""
echo ""

# Test 3: Get Orders
echo "Test 3: Get Orders"
echo "------------------"
echo "Request: GET $BASE_URL/orders/"

curl "$BASE_URL/orders/" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq . 2>/dev/null || cat

echo ""
echo ""

# Test 4: Get Payments
echo "Test 4: Get Payments"
echo "--------------------"
echo "Request: GET $BASE_URL/payments/"

curl "$BASE_URL/payments/" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq . 2>/dev/null || cat

echo ""
echo ""

# Test 5: Get Returns
echo "Test 5: Get Returns"
echo "-------------------"
echo "Request: GET $BASE_URL/returns/"

curl "$BASE_URL/returns/" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq . 2>/dev/null || cat

echo ""
echo ""

# Test 6: Get Refunds
echo "Test 6: Get Refunds"
echo "-------------------"
echo "Request: GET $BASE_URL/refunds/"

curl "$BASE_URL/refunds/" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq . 2>/dev/null || cat

echo ""
echo ""

# Test 7: Logout
echo "Test 7: Logout"
echo "--------------"
echo "Request: POST $BASE_URL/logout/"

curl -X POST "$BASE_URL/logout/" \
  -b cookies.txt \
  -w "\nHTTP Status: %{http_code}\n" \
  | jq . 2>/dev/null || cat

echo ""
echo ""

echo "========================================="
echo "TEST COMPLETE"
echo "========================================="
echo ""
echo "Note: Update YOUR_PASSWORD_HERE in this script with actual dealer password"
echo "Cookies saved to: cookies.txt"
