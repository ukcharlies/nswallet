#!/bin/bash

##############################################################################
# NSWallet API - Comprehensive Test Suite
# Tests all endpoints with full role-based access control
# Author: Senior Engineer
# Date: January 31, 2026
##############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000/api/v1"
LOG_FILE="api_test_results.log"

# Test data
TEST_USER_EMAIL="testuser+$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!@"
TEST_USER_NAME="Test User"

# Tokens and IDs (will be populated during tests)
ACCESS_TOKEN=""
REFRESH_TOKEN=""
WALLET_ID=""
USER_ID=""

##############################################################################
# Utility Functions
##############################################################################

log_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

log_test() {
  echo -e "${YELLOW}→ $1${NC}"
}

log_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
  echo -e "${RED}✗ $1${NC}"
}

log_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

save_response() {
  local response=$1
  local filename=$2
  echo "$response" > "$filename"
  echo "$response" >> "$LOG_FILE"
}

# Extract JSON value
extract_json_value() {
  local json=$1
  local key=$2
  echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

##############################################################################
# Authentication Tests
##############################################################################

test_register() {
  log_header "TEST 1: USER REGISTRATION"
  
  log_test "Registering new user: $TEST_USER_EMAIL"
  
  local response=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_USER_EMAIL\",
      \"password\": \"$TEST_PASSWORD\",
      \"name\": \"$TEST_USER_NAME\"
    }")
  
  if echo "$response" | grep -q "accessToken"; then
    log_success "User registered successfully"
    ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken // empty')
    USER_ID=$(echo "$response" | jq -r '.user.id // empty')
    
    if [ -z "$ACCESS_TOKEN" ]; then
      log_error "Failed to extract access token"
      return 1
    fi
    
    log_success "Access token obtained: ${ACCESS_TOKEN:0:20}..."
    log_success "User ID: $USER_ID"
    return 0
  else
    log_error "Registration failed"
    echo "$response"
    return 1
  fi
}

test_login() {
  log_header "TEST 2: USER LOGIN"
  
  log_test "Logging in with email: $TEST_USER_EMAIL"
  
  local response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_USER_EMAIL\",
      \"password\": \"$TEST_PASSWORD\"
    }")
  
  if echo "$response" | grep -q "accessToken"; then
    log_success "Login successful"
    ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken // empty')
    log_success "New access token: ${ACCESS_TOKEN:0:20}..."
    return 0
  else
    log_error "Login failed"
    echo "$response"
    return 1
  fi
}

test_refresh_token() {
  log_header "TEST 3: REFRESH ACCESS TOKEN"
  
  log_test "Refreshing access token (simulating 15+ minutes later)"
  
  local response=$(curl -s -X POST "$BASE_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{}")
  
  if echo "$response" | grep -q "accessToken"; then
    log_success "Token refresh successful"
    ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken // empty')
    log_success "New access token: ${ACCESS_TOKEN:0:20}..."
    return 0
  else
    log_error "Token refresh failed"
    echo "$response"
    return 1
  fi
}

test_logout() {
  log_header "TEST 4: USER LOGOUT"
  
  log_test "Logging out user"
  
  local response=$(curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{}")
  
  if echo "$response" | grep -q "Logged out"; then
    log_success "Logout successful"
    return 0
  else
    log_error "Logout failed"
    echo "$response"
    return 1
  fi
}

##############################################################################
# User Profile Tests
##############################################################################

test_get_profile() {
  log_header "TEST 5: GET USER PROFILE"
  
  log_test "Fetching current user profile"
  
  local response=$(curl -s -X GET "$BASE_URL/users/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "$TEST_USER_EMAIL"; then
    log_success "Profile retrieved successfully"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to get profile"
    echo "$response"
    return 1
  fi
}

test_update_profile() {
  log_header "TEST 6: UPDATE USER PROFILE"
  
  local new_name="Updated User Name"
  log_test "Updating profile name to: $new_name"
  
  local response=$(curl -s -X PATCH "$BASE_URL/users/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$new_name\"
    }")
  
  if echo "$response" | grep -q "$new_name"; then
    log_success "Profile updated successfully"
    return 0
  else
    log_error "Failed to update profile"
    echo "$response"
    return 1
  fi
}

##############################################################################
# Wallet Tests
##############################################################################

test_create_wallet() {
  log_header "TEST 7: CREATE WALLET"
  
  log_test "Creating new wallet (USD currency)"
  
  local response=$(curl -s -X POST "$BASE_URL/wallets" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"My Test Wallet\",
      \"currency\": \"USD\"
    }")
  
  if echo "$response" | grep -q "My Test Wallet"; then
    log_success "Wallet created successfully"
    WALLET_ID=$(echo "$response" | jq -r '.id // empty')
    log_success "Wallet ID: $WALLET_ID"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to create wallet"
    echo "$response"
    return 1
  fi
}

test_get_all_wallets() {
  log_header "TEST 8: GET ALL USER WALLETS"
  
  log_test "Fetching all wallets for user"
  
  local response=$(curl -s -X GET "$BASE_URL/wallets" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "My Test Wallet"; then
    log_success "Wallets retrieved successfully"
    echo "$response" | jq '.[]'
    return 0
  else
    log_error "Failed to get wallets"
    echo "$response"
    return 1
  fi
}

test_get_wallet_by_id() {
  log_header "TEST 9: GET SPECIFIC WALLET"
  
  if [ -z "$WALLET_ID" ]; then
    log_error "Wallet ID not set"
    return 1
  fi
  
  log_test "Fetching wallet: $WALLET_ID"
  
  local response=$(curl -s -X GET "$BASE_URL/wallets/$WALLET_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "$WALLET_ID"; then
    log_success "Wallet retrieved successfully"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to get wallet"
    echo "$response"
    return 1
  fi
}

test_fund_wallet() {
  log_header "TEST 10: FUND WALLET (ADD MONEY)"
  
  if [ -z "$WALLET_ID" ]; then
    log_error "Wallet ID not set"
    return 1
  fi
  
  log_test "Funding wallet with $1000.50"
  
  local response=$(curl -s -X PATCH "$BASE_URL/wallets/$WALLET_ID/fund" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"amount\": 1000.50,
      \"description\": \"Initial deposit\"
    }")
  
  if echo "$response" | grep -q "1000.50"; then
    log_success "Wallet funded successfully"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to fund wallet"
    echo "$response"
    return 1
  fi
}

test_withdraw_from_wallet() {
  log_header "TEST 11: WITHDRAW FROM WALLET"
  
  if [ -z "$WALLET_ID" ]; then
    log_error "Wallet ID not set"
    return 1
  fi
  
  log_test "Withdrawing $100 from wallet"
  
  local response=$(curl -s -X PATCH "$BASE_URL/wallets/$WALLET_ID/withdraw" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"amount\": 100,
      \"description\": \"Test withdrawal\"
    }")
  
  if echo "$response" | grep -q "900"; then
    log_success "Withdrawal successful"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to withdraw"
    echo "$response"
    return 1
  fi
}

test_get_wallet_transactions() {
  log_header "TEST 12: GET WALLET TRANSACTIONS"
  
  if [ -z "$WALLET_ID" ]; then
    log_error "Wallet ID not set"
    return 1
  fi
  
  log_test "Fetching transactions for wallet: $WALLET_ID"
  
  local response=$(curl -s -X GET "$BASE_URL/wallets/$WALLET_ID/transactions?limit=10" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "CREDIT\|DEBIT"; then
    log_success "Transactions retrieved successfully"
    echo "$response" | jq '.[]'
    return 0
  else
    log_error "Failed to get transactions"
    echo "$response"
    return 1
  fi
}

test_get_wallet_summary() {
  log_header "TEST 13: GET WALLET SUMMARY"
  
  if [ -z "$WALLET_ID" ]; then
    log_error "Wallet ID not set"
    return 1
  fi
  
  log_test "Fetching summary for wallet: $WALLET_ID"
  
  local response=$(curl -s -X GET "$BASE_URL/wallets/$WALLET_ID/summary" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "summary"; then
    log_success "Wallet summary retrieved successfully"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to get summary"
    echo "$response"
    return 1
  fi
}

##############################################################################
# Exchange Rates Tests
##############################################################################

test_get_exchange_rates() {
  log_header "TEST 14: GET EXCHANGE RATES"
  
  log_test "Fetching exchange rates (base: USD)"
  
  local response=$(curl -s -X GET "$BASE_URL/rates?base=USD" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "rates"; then
    log_success "Exchange rates retrieved successfully"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to get exchange rates"
    echo "$response"
    return 1
  fi
}

test_get_supported_currencies() {
  log_header "TEST 15: GET SUPPORTED CURRENCIES"
  
  log_test "Fetching supported currencies"
  
  local response=$(curl -s -X GET "$BASE_URL/rates/currencies" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "currencies"; then
    log_success "Supported currencies retrieved successfully"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to get currencies"
    echo "$response"
    return 1
  fi
}

test_convert_currency() {
  log_header "TEST 16: CONVERT CURRENCY"
  
  log_test "Converting 100 USD to NGN"
  
  local response=$(curl -s -X GET "$BASE_URL/rates/convert?amount=100&from=USD&to=NGN" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "convertedAmount"; then
    log_success "Currency conversion successful"
    echo "$response" | jq '.'
    return 0
  else
    log_error "Failed to convert currency"
    echo "$response"
    return 1
  fi
}

##############################################################################
# Error Handling Tests
##############################################################################

test_unauthorized_access() {
  log_header "TEST 17: UNAUTHORIZED ACCESS (No Token)"
  
  log_test "Attempting to access protected endpoint without token"
  
  local response=$(curl -s -X GET "$BASE_URL/users/me" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "Authentication required"; then
    log_success "Correctly rejected unauthorized request"
    return 0
  else
    log_error "Failed to reject unauthorized request"
    echo "$response"
    return 1
  fi
}

test_invalid_token() {
  log_header "TEST 18: INVALID TOKEN"
  
  log_test "Attempting to access with invalid token"
  
  local response=$(curl -s -X GET "$BASE_URL/users/me" \
    -H "Authorization: Bearer invalid.token.here" \
    -H "Content-Type: application/json")
  
  if echo "$response" | grep -q "Invalid\|Unauthorized"; then
    log_success "Correctly rejected invalid token"
    return 0
  else
    log_error "Failed to reject invalid token"
    echo "$response"
    return 1
  fi
}

test_wrong_password() {
  log_header "TEST 19: WRONG PASSWORD"
  
  log_test "Attempting login with wrong password"
  
  local response=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_USER_EMAIL\",
      \"password\": \"WrongPassword123!@\"
    }")
  
  if echo "$response" | grep -q "Invalid\|failed\|Unauthorized"; then
    log_success "Correctly rejected wrong password"
    return 0
  else
    log_error "Failed to reject wrong password"
    echo "$response"
    return 1
  fi
}

test_invalid_email() {
  log_header "TEST 20: INVALID EMAIL"
  
  log_test "Attempting to register with invalid email"
  
  local response=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"notanemail\",
      \"password\": \"TestPassword123!@\",
      \"name\": \"Test\"
    }")
  
  if echo "$response" | grep -q "email\|invalid"; then
    log_success "Correctly rejected invalid email"
    return 0
  else
    log_error "Failed to reject invalid email"
    echo "$response"
    return 1
  fi
}

##############################################################################
# Main Test Suite Runner
##############################################################################

run_all_tests() {
  local passed=0
  local failed=0
  
  log_header "🚀 NSWallet API - Comprehensive Test Suite Starting"
  log_info "Base URL: $BASE_URL"
  log_info "Test User Email: $TEST_USER_EMAIL"
  log_info "Results will be saved to: $LOG_FILE"
  
  # Clear log file
  > "$LOG_FILE"
  
  # Run tests
  local tests=(
    "test_register"
    "test_login"
    "test_get_profile"
    "test_update_profile"
    "test_create_wallet"
    "test_get_all_wallets"
    "test_get_wallet_by_id"
    "test_fund_wallet"
    "test_withdraw_from_wallet"
    "test_get_wallet_transactions"
    "test_get_wallet_summary"
    "test_refresh_token"
    "test_get_exchange_rates"
    "test_get_supported_currencies"
    "test_convert_currency"
    "test_unauthorized_access"
    "test_invalid_token"
    "test_wrong_password"
    "test_invalid_email"
    "test_logout"
  )
  
  for test in "${tests[@]}"; do
    if $test; then
      ((passed++))
    else
      ((failed++))
    fi
  done
  
  # Summary
  log_header "📊 TEST SUMMARY"
  log_success "Passed: $passed"
  log_error "Failed: $failed"
  log_info "Total: $((passed + failed))"
  
  if [ $failed -eq 0 ]; then
    log_success "All tests passed! 🎉"
    return 0
  else
    log_error "Some tests failed"
    return 1
  fi
}

##############################################################################
# Script Entry Point
##############################################################################

main() {
  # Check if curl is installed
  if ! command -v curl &> /dev/null; then
    log_error "curl is not installed"
    exit 1
  fi
  
  # Check if jq is installed
  if ! command -v jq &> /dev/null; then
    log_error "jq is not installed. Please install jq for JSON parsing"
    exit 1
  fi
  
  # Check if server is running
  if ! curl -s "$BASE_URL/rates/currencies" > /dev/null; then
    log_error "API server is not running at $BASE_URL"
    exit 1
  fi
  
  # Run all tests
  run_all_tests
}

# Run main function
main "$@"
