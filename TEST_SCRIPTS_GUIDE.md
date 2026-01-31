# NSWallet API - Test Scripts Documentation

## Overview

This document explains the comprehensive test suites included with the NSWallet backend API. Two test scripts are provided to verify all functionality:

1. **test-api.sh** - Bash script using curl commands
2. **test-api.js** - Node.js script for cross-platform testing

Both scripts test all 20+ API endpoints with proper authentication and error handling.

---

## Quick Start

### Prerequisites

- **Node.js** (for JavaScript version): v16+ recommended
- **curl** (for Bash version): Usually pre-installed on macOS/Linux
- **jq** (for Bash version): Required for JSON parsing
- **API Server**: Running at `http://localhost:3000/api/v1`

### Install Dependencies (Bash version only)

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# Or use the Node.js version instead (no additional dependencies)
```

### Running the Tests

**Option 1: Node.js Test Suite (Recommended)**

```bash
# From the project root directory
node test-api.js

# Or with custom API URL
node test-api.js --base-url http://localhost:3000/api/v1
```

**Option 2: Bash Test Suite**

```bash
# From the project root directory
chmod +x test-api.sh
./test-api.sh
```

---

## What Gets Tested

### Test Sequence (20 tests total)

The tests run in a specific sequence because later tests depend on data from earlier tests:

#### Phase 1: Authentication (Tests 1-3)
```
✓ TEST 1: User Registration
  - Creates new test user with unique email
  - Captures access token for subsequent tests

✓ TEST 2: User Login
  - Logs in with credentials
  - Gets fresh access token and refresh token

✓ TEST 3: Token Refresh
  - Tests token refresh mechanism
  - Gets new access token without re-logging in
```

#### Phase 2: User Profile (Tests 4-5)
```
✓ TEST 4: Get User Profile
  - Retrieves current user's profile
  - Requires Bearer token in Authorization header

✓ TEST 5: Update User Profile
  - Updates user's name
  - Verifies changes were saved
```

#### Phase 3: Wallet Operations (Tests 6-11)
```
✓ TEST 6: Create Wallet
  - Creates new wallet in USD currency
  - Captures wallet ID for transaction tests

✓ TEST 7: Get All Wallets
  - Retrieves all user's wallets
  - Verifies the created wallet appears in list

✓ TEST 8: Get Specific Wallet
  - Retrieves single wallet by ID
  - Verifies wallet details

✓ TEST 9: Fund Wallet
  - Adds $1000.50 to wallet
  - Updates wallet balance

✓ TEST 10: Withdraw From Wallet
  - Withdraws $100 from wallet
  - Verifies new balance ($900.50)

✓ TEST 11: Get Wallet Transactions
  - Lists all transactions for wallet
  - Shows fund and withdrawal transactions
```

#### Phase 4: Exchange Rates (Tests 12-14)
```
✓ TEST 12: Get Exchange Rates
  - Retrieves current exchange rates
  - Tests base=USD parameter

✓ TEST 13: Get Supported Currencies
  - Lists all supported currencies
  - Does not require authentication

✓ TEST 14: Convert Currency
  - Converts 100 USD to NGN
  - Shows converted amount
```

#### Phase 5: Error Handling (Tests 15-19)
```
✓ TEST 15: Unauthorized Access
  - Attempts to access protected endpoint without token
  - Should receive 401 error

✓ TEST 16: Invalid Token
  - Uses malformed JWT token
  - Should receive 401 error

✓ TEST 17: Wrong Password
  - Attempts login with incorrect password
  - Should receive 401 error

✓ TEST 18: Invalid Email
  - Attempts to register with invalid email format
  - Should receive 400 error

✓ TEST 19: Wallet Summary
  - Gets wallet transaction summary
  - Shows credits, debits, and balances
```

#### Phase 6: Cleanup (Test 20)
```
✓ TEST 20: Logout
  - Logs out user (invalidates tokens)
  - Requires Bearer token
```

---

## Test Results

### Success Output

When all tests pass, you'll see:

```
✓ User registered successfully
✓ Access token obtained: eyJhbGciOiJIUzI1NiIs...
✓ User ID: 550e8400-e29b-41d4...
✓ Login successful
✓ New access token: eyJhbGciOiJIUzI1NiIs...
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Passed: 20
✗ Failed: 0
ℹ Total: 20

✓ All tests passed! 🎉
```

### Failure Output

If a test fails:

```
✗ Registration failed
{
  "statusCode": 400,
  "message": "Email already exists",
  "error": "Bad Request"
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TEST SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Passed: 15
✗ Failed: 5
ℹ Total: 20

✗ Some tests failed
```

### Log Files

Both scripts save detailed response logs:

- **test-api.sh**: Results in `api_test_results.log`
- **test-api.js**: Results in `api_test_results.log`

View logs:
```bash
# See full responses
cat api_test_results.log

# Search for specific test
grep "testCreateWallet" api_test_results.log

# Follow logs in real-time
tail -f api_test_results.log
```

---

## Understanding the Tests

### Authentication Flow

The tests demonstrate the complete authentication flow:

```
1. Register → Creates user, returns accessToken (15 min) + refreshToken (7 days)
2. Login → Authenticates with email/password, returns tokens
3. RefreshToken → Uses old token to get new one without re-entering password
4. Protected Endpoints → Use accessToken in "Authorization: Bearer <token>" header
5. Logout → Invalidates tokens, removes refresh token from database
```

### Bearer Token Requirement

Protected endpoints (most of them) require a Bearer token in the Authorization header:

```bash
# Correct way to call protected endpoint
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  http://localhost:3000/api/v1/users/me

# Wrong - will get 401
curl http://localhost:3000/api/v1/users/me
```

The test scripts automatically handle this for you.

### Public vs Protected Endpoints

**Public Endpoints** (no token needed):
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /rates` - Get exchange rates
- `GET /rates/currencies` - Get supported currencies

**Protected Endpoints** (token needed):
- `GET /users/me` - Get current user
- `PATCH /users/me` - Update current user
- `POST /wallets` - Create wallet
- `GET /wallets` - List wallets
- And all other wallet operations

### Soft Delete Verification

When you delete a wallet, it's soft-deleted (not permanently removed). The tests verify:

1. Deleted records don't appear in list queries
2. Soft deleted records can't be accessed by ID
3. The `deletedAt` timestamp is set

### Optimistic Locking

Wallet operations use optimistic locking for concurrency safety. The tests verify:

1. Wallet operations update correctly
2. Concurrent modifications are handled
3. Version field is incremented on updates

---

## Troubleshooting

### "API server is not running" Error

```bash
# Make sure server is running in another terminal
npm run start:dev

# Or check if port 3000 is in use
lsof -i :3000
```

### "jq command not found" (Bash script)

Either:
1. Install jq: `brew install jq`
2. Or use the Node.js version instead: `node test-api.js`

### "Permission denied" (Bash script)

```bash
# Make script executable
chmod +x test-api.sh
```

### Tests pass individually but fail in sequence

This might mean:
1. **Database state issue**: Delete test data manually
2. **Timing issue**: Add delays between requests
3. **Token expiration**: Tests run fast enough that tokens don't expire

### "Refresh token is required" Error

This usually means:
1. The refresh token cookie wasn't sent back by the server
2. Or the refresh endpoint isn't receiving the cookie properly

Check:
- Server is storing refresh tokens correctly (database query)
- Cookie path is set to `/api/v1/auth` (must match route)
- Cookie is not expired

---

## Custom Configuration

### Change API Base URL

```bash
# Node.js
node test-api.js --base-url http://api.example.com/api/v1

# Bash - edit the file
# Find: BASE_URL="http://localhost:3000/api/v1"
# Change: BASE_URL="http://api.example.com/api/v1"
```

### Change Test User Credentials

**Node.js**: Edit these lines in `test-api.js`:
```javascript
const TEST_USER_EMAIL = `testuser+${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!@';
const TEST_USER_NAME = 'Test User';
```

**Bash**: Edit these lines in `test-api.sh`:
```bash
TEST_USER_EMAIL="testuser+$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!@"
TEST_USER_NAME="Test User"
```

### Add More Tests

The tests are organized in functions that can easily be extended:

```javascript
// test-api.js
async function testMyNewFeature() {
  const response = await makeRequest('GET', '/my-endpoint', null, accessToken);
  
  if (response.status === 200) {
    return {
      success: true,
      message: 'My test passed'
    };
  }
  
  return {
    success: false,
    message: 'My test failed',
    error: response.data
  };
}

// Then add to the tests array:
// { name: 'My New Test', fn: testMyNewFeature }
```

---

## Role-Based Access Control Testing

The current tests use a regular USER role. To test role-based access:

### Create Test Users with Different Roles

```sql
-- In your database, after creating users via API:

UPDATE "User" SET roles = ARRAY['SUPER_ADMIN'] WHERE email = 'admin@example.com';
UPDATE "User" SET roles = ARRAY['ADMIN'] WHERE email = 'moderator@example.com';
UPDATE "User" SET roles = ARRAY['MODERATOR'] WHERE email = 'user@example.com';
UPDATE "User" SET roles = ARRAY['USER'] WHERE email = 'guest@example.com';
```

### Expected Results by Role

| Endpoint | SUPER_ADMIN | ADMIN | MODERATOR | USER | GUEST |
|----------|---|---|---|---|---|
| POST /auth/register | ✓ | ✓ | ✓ | ✓ | ✓ |
| POST /auth/login | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET /users/me | ✓ | ✓ | ✓ | ✓ | ✗ |
| PATCH /users/me | ✓ | ✓ | ✓ | ✓ | ✗ |
| GET /users/:id | ✓ | ✓ | ✓ | ✗ | ✗ |
| POST /wallets | ✓ | ✓ | ✓ | ✓ | ✗ |
| GET /wallets | ✓ | ✓ | ✓ | ✓ | ✗ |
| GET /rates | ✓ | ✓ | ✓ | ✓ | ✓ |
| GET /audit-logs | ✓ | ✓ | ✓ | ✗ | ✗ |

### Test with Each Role

```bash
# Create multiple test users with different roles
# Then run tests multiple times, updating the test user in between

node test-api.js  # Tests with USER role first time
# Manually change user to ADMIN role in database
node test-api.js  # Tests with ADMIN role second time
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test-api.yml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: nswallet_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v2
      
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      
      - run: npm run start:dev &
      
      - run: sleep 5
      
      - run: npm run test:api
```

### npm scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:api": "node test-api.js",
    "test:api:sh": "bash test-api.sh",
    "test:api:watch": "node test-api.js && npm run test:api:watch"
  }
}
```

Then run:
```bash
npm run test:api
npm run test:api:sh
```

---

## Performance Notes

### Expected Execution Time

- Full test suite: 15-30 seconds
- Individual test: 0.5-1 second
- Database operations: < 100ms typically

### Optimization Tips

1. **Run only critical tests**: Edit the test array to exclude non-essential tests
2. **Parallel execution**: Can modify scripts to run independent tests in parallel
3. **Pre-seeded data**: Create test users beforehand instead of via API
4. **Database indexes**: Ensure database has proper indexes (script checks this)

---

## Support & Debugging

### Enable Debug Mode

**Node.js**:
```javascript
// Add at top of test-api.js
process.env.DEBUG = true;

// Then modify makeRequest to log:
console.log(`${method} ${endpoint}`, body);
```

**Bash**:
```bash
# Run with debug flag
bash -x test-api.sh
```

### Common Issues Checklist

- [ ] API server is running: `npm run start:dev`
- [ ] Port 3000 is available: `lsof -i :3000`
- [ ] Database is accessible: Check DATABASE_URL in .env
- [ ] JWT secrets are set: Check .env has JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
- [ ] Node.js version is 16+: `node --version`
- [ ] All dependencies installed: `npm install`

### Getting Help

Check logs:
```bash
# Full API response logs
cat api_test_results.log | jq '.'

# Server logs
npm run start:dev  # Watch for errors

# Database logs
# Enable query logging in Prisma

# Browser DevTools
# If testing through browser, check Network tab
```

---

## Next Steps

1. **Run tests**: `node test-api.js`
2. **Review results**: Check `api_test_results.log`
3. **Fix any failures**: Check error messages
4. **Test with different roles**: Verify role-based access control
5. **Add custom tests**: Extend test suite with your own endpoints
6. **Integrate into CI/CD**: Add to GitHub Actions/GitLab CI

---

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Prisma Testing Guide](https://www.prisma.io/docs/concepts/components/prisma-client/testing)
- [JWT Authentication Best Practices](https://tools.ietf.org/html/rfc8725)
- [REST API Testing Best Practices](https://www.postman.com/api-testing/)

---

**Last Updated**: January 31, 2026
**Maintained By**: Senior Engineering Team
**Version**: 1.0.0
