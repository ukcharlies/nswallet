# NSWallet API - Role-Based Access Control Matrix

## Overview

This document shows which API endpoints are accessible by each user role. Use this to understand role-based permissions and verify access control is working correctly.

---

## Role Definitions

| Role | Level | Description |
|------|-------|-------------|
| **SUPER_ADMIN** | 5 | Highest level access - can do everything including system-wide operations |
| **ADMIN** | 4 | Administrative access - manage users, audit logs, high-level operations |
| **MODERATOR** | 3 | Moderation access - view audit logs, limited user management |
| **USER** | 2 | Standard user - manage own profile, wallets, and transactions |
| **GUEST** | 1 | Lowest level - public endpoints only |

---

## Complete Access Matrix

### Authentication Endpoints

| Endpoint | Method | Public | SUPER_ADMIN | ADMIN | MODERATOR | USER | GUEST |
|----------|--------|--------|---|---|---|---|---|
| Register | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Login | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Refresh Token | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Logout | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Logout All | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Google Login | POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Note**: Auth endpoints are public but require authentication where indicated (e.g., logout requires valid token)

---

### User Profile Endpoints

| Endpoint | Method | SUPER_ADMIN | ADMIN | MODERATOR | USER | GUEST |
|----------|--------|---|---|---|---|---|
| Get Current User | GET /users/me | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update Current User | PATCH /users/me | ✅ | ✅ | ✅ | ✅ | ❌ |
| Get User by ID | GET /users/:id | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete User | DELETE /users/:id | ✅ | ✅ | ❌ | ❌ | ❌ |

**Access Control Rules:**
- **Get Current User**: Any authenticated user can get their own profile
- **Update Current User**: Any authenticated user can update their own profile
- **Get User by ID**: Only SUPER_ADMIN and ADMIN can view other users
- **Delete User**: Only SUPER_ADMIN and ADMIN can delete users (soft delete)

---

### Wallet Endpoints

| Endpoint | Method | SUPER_ADMIN | ADMIN | MODERATOR | USER | GUEST |
|----------|--------|---|---|---|---|---|
| Create Wallet | POST /wallets | ✅ | ✅ | ✅ | ✅ | ❌ |
| List All Wallets | GET /wallets | ✅* | ✅* | ✅* | ✅** | ❌ |
| Get Wallet | GET /wallets/:id | ✅* | ✅* | ✅* | ✅** | ❌ |
| Fund Wallet | PATCH /wallets/:id/fund | ✅* | ✅* | ✅* | ✅** | ❌ |
| Withdraw | PATCH /wallets/:id/withdraw | ✅* | ✅* | ✅* | ✅** | ❌ |
| Transfer | PATCH /wallets/:id/transfer | ✅* | ✅* | ✅* | ✅** | ❌ |
| Get Transactions | GET /wallets/:id/transactions | ✅* | ✅* | ✅* | ✅** | ❌ |
| Get Summary | GET /wallets/:id/summary | ✅* | ✅* | ✅* | ✅** | ❌ |
| Delete Wallet | DELETE /wallets/:id | ✅* | ✅* | ✅* | ✅** | ❌ |

**Legend:**
- ✅ = Can access
- ❌ = Cannot access
- \* = SUPER_ADMIN and ADMIN can access all wallets in the system
- \*\* = USER can only access their own wallets (userId match required)

**Access Control Rules:**
- **SUPER_ADMIN**: Can create, view, and modify all wallets in the system
- **ADMIN**: Can create, view, and modify all wallets in the system
- **MODERATOR**: Can create, view, and modify all wallets in the system
- **USER**: Can only create, view, and modify their own wallets (userId must match)
- **GUEST**: Cannot access any wallet endpoints

---

### Exchange Rate Endpoints

| Endpoint | Method | SUPER_ADMIN | ADMIN | MODERATOR | USER | GUEST |
|----------|--------|---|---|---|---|---|
| Get Rates | GET /rates | ✅ | ✅ | ✅ | ✅ | ✅ |
| Get Currencies | GET /rates/currencies | ✅ | ✅ | ✅ | ✅ | ✅ |
| Convert Currency | GET /rates/convert | ✅ | ✅ | ✅ | ✅ | ✅ |

**Access Control Rules:**
- All rate endpoints are public (no authentication required)
- Any user including GUEST can access exchange rates

---

### Audit Log Endpoints

| Endpoint | Method | SUPER_ADMIN | ADMIN | MODERATOR | USER | GUEST |
|----------|--------|---|---|---|---|---|
| Get Audit Logs | GET /audit-logs | ✅ | ✅ | ✅ | ❌ | ❌ |

**Access Control Rules:**
- Only SUPER_ADMIN, ADMIN, and MODERATOR can view audit logs
- Regular USERs and GUESTs cannot access audit logs
- Audit logs track all system operations for compliance

---

## Testing Each Role

### Create Test Users with Different Roles

```sql
-- Assuming you've created users via API registration
-- Update their roles in the database:

-- Super Admin User
UPDATE "User" 
SET roles = '{"SUPER_ADMIN"}' 
WHERE email = 'superadmin@example.com';

-- Admin User
UPDATE "User" 
SET roles = '{"ADMIN"}' 
WHERE email = 'admin@example.com';

-- Moderator User
UPDATE "User" 
SET roles = '{"MODERATOR"}' 
WHERE email = 'moderator@example.com';

-- Regular User
UPDATE "User" 
SET roles = '{"USER"}' 
WHERE email = 'user@example.com';

-- Guest User (role array is empty or contains GUEST)
UPDATE "User" 
SET roles = '{"GUEST"}' 
WHERE email = 'guest@example.com';
```

### Test Script Template

Here's a sample test to verify role-based access control:

```javascript
// test-roles.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

const testUsers = [
  {
    email: 'superadmin@example.com',
    password: 'TestPassword123!@',
    role: 'SUPER_ADMIN'
  },
  {
    email: 'admin@example.com',
    password: 'TestPassword123!@',
    role: 'ADMIN'
  },
  {
    email: 'moderator@example.com',
    password: 'TestPassword123!@',
    role: 'MODERATOR'
  },
  {
    email: 'user@example.com',
    password: 'TestPassword123!@',
    role: 'USER'
  },
  {
    email: 'guest@example.com',
    password: 'TestPassword123!@',
    role: 'GUEST'
  }
];

async function testRoleAccess() {
  for (const testUser of testUsers) {
    console.log(`\n=== Testing ${testUser.role} ===`);
    
    // Login
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    const token = loginRes.data.accessToken;
    
    // Test endpoints with this role
    const endpoints = [
      {
        method: 'GET',
        path: '/users/me',
        shouldAccess: testUser.role !== 'GUEST'
      },
      {
        method: 'GET',
        path: '/wallets',
        shouldAccess: testUser.role !== 'GUEST'
      },
      {
        method: 'GET',
        path: '/audit-logs',
        shouldAccess: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(testUser.role)
      },
      {
        method: 'GET',
        path: '/rates/currencies',
        shouldAccess: true  // Public endpoint
      }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const res = await axios({
          method: endpoint.method,
          url: `${BASE_URL}${endpoint.path}`,
          headers: endpoint.shouldAccess ? 
            { Authorization: `Bearer ${token}` } : 
            {}
        });
        
        const actualAccess = res.status === 200;
        const expectedAccess = endpoint.shouldAccess;
        
        if (actualAccess === expectedAccess) {
          console.log(`✓ ${endpoint.path}: ${actualAccess ? 'Allowed' : 'Denied'}`);
        } else {
          console.log(`✗ ${endpoint.path}: Expected ${expectedAccess}, got ${actualAccess}`);
        }
      } catch (error) {
        const actualAccess = error.response?.status !== 403;
        const expectedAccess = endpoint.shouldAccess;
        
        if (actualAccess === expectedAccess) {
          console.log(`✓ ${endpoint.path}: ${actualAccess ? 'Allowed' : 'Denied'}`);
        } else {
          console.log(`✗ ${endpoint.path}: Expected ${expectedAccess}, got ${actualAccess}`);
        }
      }
    }
  }
}

testRoleAccess().catch(console.error);
```

---

## Access Control Implementation

### How It Works

1. **Guard Checking**: `@UseGuards(JwtAuthGuard)` validates Bearer token
2. **Role Checking**: `@Roles(Role.ADMIN)` decorator specifies required roles
3. **Ownership Checking**: For user-specific resources, code checks if user owns the resource
4. **Error Responses**:
   - `401 Unauthorized`: No valid token or token expired
   - `403 Forbidden`: Valid token but user lacks required role/permissions

### Example Implementation

```typescript
// User can only access their own wallet
@Get(':id')
@UseGuards(JwtAuthGuard)
async getWallet(@Param('id') walletId: string, @CurrentUser() user: User) {
  const wallet = await this.walletsService.findById(walletId);
  
  // Authorization check
  if (wallet.userId !== user.id && !user.hasRole([Role.ADMIN, Role.SUPER_ADMIN])) {
    throw new ForbiddenException('You do not have access to this wallet');
  }
  
  return wallet;
}

// Only admins can view other users
@Get(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
async getUserById(@Param('id') userId: string) {
  return this.usersService.findById(userId);
}
```

---

## Permission Hierarchy

The role system uses a hierarchy where higher roles have all permissions of lower roles plus additional ones:

```
SUPER_ADMIN
    ↓ (includes all ADMIN permissions)
ADMIN
    ↓ (includes all MODERATOR permissions)
MODERATOR
    ↓ (includes all USER permissions)
USER
    ↓ (includes all GUEST permissions)
GUEST
```

This means:
- SUPER_ADMIN can do anything
- ADMIN can do everything except super-admin-only operations
- MODERATOR can do everything except admin-only operations
- USER can only manage their own data
- GUEST can only access public data

---

## Testing Access Denial

To verify role restrictions are working:

### Test 1: USER accessing ADMIN-only endpoint

```bash
# Login as USER
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "TestPassword123!@"}'

# Expected response:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
#   "user": { "id": "...", "role": ["USER"] }
# }

# Try to access admin endpoint
curl -X GET http://localhost:3000/api/v1/audit-logs \
  -H "Authorization: Bearer <USER_TOKEN>"

# Expected response: 403 Forbidden
# {
#   "statusCode": 403,
#   "message": "Insufficient permissions",
#   "error": "Forbidden"
# }
```

### Test 2: USER accessing another user's wallet

```bash
# Create two users
# User A creates wallet
# User B tries to access User A's wallet with their token

curl -X GET http://localhost:3000/api/v1/wallets/<USER_A_WALLET_ID> \
  -H "Authorization: Bearer <USER_B_TOKEN>"

# Expected response: 403 Forbidden
```

### Test 3: GUEST trying to access protected endpoint

```bash
# GUEST user has no authentication token
curl -X GET http://localhost:3000/api/v1/users/me

# Expected response: 401 Unauthorized
# {
#   "statusCode": 401,
#   "message": "Authentication required",
#   "error": "Unauthorized"
# }
```

---

## Permission Examples

### Scenario 1: User Creating and Managing Own Wallet

```
User (USER role) → POST /wallets ✅ (allowed)
User → GET /wallets ✅ (allowed - only their wallets)
User → GET /wallets/:id ✅ (allowed - only their wallets)
User → PATCH /wallets/:id/fund ✅ (allowed - only their wallets)
```

### Scenario 2: Admin Viewing Any User's Data

```
Admin (ADMIN role) → GET /users/:id ✅ (allowed)
Admin → GET /wallets ✅ (allowed - all wallets)
Admin → GET /wallets/:id ✅ (allowed - any wallet)
Admin → GET /audit-logs ✅ (allowed)
```

### Scenario 3: Moderator Restricted Access

```
Moderator (MODERATOR role) → GET /audit-logs ✅ (allowed)
Moderator → DELETE /users/:id ❌ (forbidden)
Moderator → POST /wallets ✅ (allowed)
Moderator → GET /audit-logs?userId=:id ✅ (allowed)
```

---

## Debugging Role Issues

### Check User's Roles

```sql
-- View user's roles
SELECT email, roles FROM "User" WHERE email = 'user@example.com';

-- Output: roles = '{"USER"}' or roles = '{"ADMIN","MODERATOR"}'
```

### Check Current User in Request

```typescript
// Add logging in controller
@Get('me')
@UseGuards(JwtAuthGuard)
async getCurrentUser(@CurrentUser() user: User) {
  console.log('Current user:', {
    id: user.id,
    email: user.email,
    roles: user.roles  // Check what roles are in the token
  });
  
  return user;
}
```

### Verify JWT Payload

```bash
# Decode JWT token (without verification) at jwt.io or:
node -e "console.log(JSON.parse(Buffer.from('eyJhbGc...', 'base64').toString()))"
```

---

## Common Issues

### Issue: User can't access their own wallet

**Cause**: userId in wallet doesn't match current user's id

**Solution**: 
```sql
-- Check wallet ownership
SELECT id, name, "userId" FROM "Wallet" WHERE id = 'wallet-id';

-- Verify user ID
SELECT id, email FROM "User" WHERE email = 'user@example.com';

-- Fix if needed
UPDATE "Wallet" SET "userId" = 'correct-user-id' WHERE id = 'wallet-id';
```

### Issue: Admin can't access audit logs

**Cause**: User doesn't have ADMIN role or JWT token is invalid

**Solution**:
```bash
# Verify user is admin
SELECT email, roles FROM "User" WHERE email = 'admin@example.com';

# Should show: roles = '{"ADMIN"}' or '{"ADMIN","MODERATOR"}'

# Re-login to get fresh token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "..."}'
```

### Issue: JWT token says wrong role

**Cause**: Token was generated before role was updated in database

**Solution**: 
```bash
# Simply re-login to get a fresh token with new roles
# Or manually update the database role and refresh token
```

---

## Best Practices

1. **Always check permissions**: Never trust client-side role checks
2. **Use decorators**: `@Roles()` and `@UseGuards()` for consistency
3. **Log access**: Audit logs track who accessed what
4. **Test denial**: Verify unauthorized access is blocked
5. **Update tokens**: New roles take effect on next login
6. **Document roles**: Keep this matrix up-to-date

---

**Last Updated**: January 31, 2026
**Version**: 1.0.0
