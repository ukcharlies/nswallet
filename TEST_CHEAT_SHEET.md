# 🚀 Test Scripts Cheat Sheet

## TL;DR - Just Run This

```bash
# Test all endpoints with ONE user
node test-api.js

# OR test all endpoints with ALL 5 ROLES (RECOMMENDED)
node test-all-roles.js
```

---

## 🎯 At a Glance

| Need | Command | Time | Tests |
|------|---------|------|-------|
| Quick validation | `node test-api.js` | 15-30s | 20 |
| **Role testing** | `node test-all-roles.js` | 45-90s | **115** |
| Bash version | `./test-api.sh` | 15-30s | 20 |
| Custom URL | `node test-api.js --base-url URL` | 15-30s | 20 |

---

## 📊 What Gets Tested

### test-api.js (20 tests, 1 user)
```
✅ Register + Login
✅ User Profile (get/update)
✅ Wallet CRUD (create, read, update, delete)
✅ Wallet Operations (fund, withdraw, transfer)
✅ Transactions
✅ Exchange Rates
✅ Error Handling
✅ Token Refresh
✅ Logout
```

### test-all-roles.js (115 tests, 5 users)
```
23 Endpoints × 5 Roles:

Roles tested:
  ├─ SUPER_ADMIN (can do everything)
  ├─ ADMIN (manage users, audit logs)
  ├─ MODERATOR (view audit logs only)
  ├─ USER (own data only)
  └─ GUEST (public endpoints only)

Expected Results:
  ├─ SUPER_ADMIN: 23/23 (100%)
  ├─ ADMIN: 22/23 (96%)
  ├─ MODERATOR: 20/23 (87%)
  ├─ USER: 18/23 (78%)
  └─ GUEST: 12/23 (52%)
```

---

## 🔐 Role Permissions Matrix

```
ENDPOINT                 SUPER ADMIN ADMIN MODERATOR USER GUEST
─────────────────────────────────────────────────────────────
Register                   ✅      ✅      ✅      ✅    ✅
Login                       ✅      ✅      ✅      ✅    ✅
Get Profile                 ✅      ✅      ✅      ✅    ❌
Update Profile              ✅      ✅      ✅      ✅    ❌
Get Other User              ✅      ✅      ❌      ❌    ❌
Delete User                 ✅      ✅      ❌      ❌    ❌
Create Wallet               ✅      ✅      ✅      ✅    ❌
List Wallets                ✅      ✅      ✅      ✅    ❌
Get Wallet                  ✅      ✅      ✅      ✅    ❌
Fund Wallet                 ✅      ✅      ✅      ✅    ❌
Withdraw                    ✅      ✅      ✅      ✅    ❌
Transfer                    ✅      ✅      ✅      ✅    ❌
Transactions                ✅      ✅      ✅      ✅    ❌
Summary                     ✅      ✅      ✅      ✅    ❌
Delete Wallet               ✅      ✅      ✅      ✅    ❌
Get Rates                   ✅      ✅      ✅      ✅    ✅
Get Currencies              ✅      ✅      ✅      ✅    ✅
Convert Currency            ✅      ✅      ✅      ✅    ✅
Audit Logs                  ✅      ✅      ✅      ❌    ❌
```

---

## 📋 Expected Output

### test-api.js ✅
```
🚀 NSWallet API - Comprehensive Test Suite Starting
✓ User registered successfully
✓ Login successful
✓ Profile retrieved successfully
✓ Wallet created successfully
✓ Wallet funded successfully
✓ Withdrawal successful
✓ Retrieved X transaction(s)
✓ All tests passed! 🎉
```

### test-all-roles.js ✅
```
🧪 NSWallet API - Comprehensive Role-Based Test Suite

PHASE 1: User Setup
✓ SUPER_ADMIN registered
✓ ADMIN registered
✓ MODERATOR registered
✓ USER registered
✓ GUEST registered

PHASE 2: Role-Based Access Testing
Testing 23 endpoints × 5 roles = 115 tests

PHASE 3: TEST SUMMARY
✓ Passed: 115
✗ Failed: 0
Pass Rate: 100.00%

Results by Role:
  SUPER_ADMIN: 23/23 passed (100%)
  ADMIN: 22/23 passed (96%)
  MODERATOR: 20/23 passed (87%)
  USER: 18/23 passed (78%)
  GUEST: 12/23 passed (52%)

✓ All tests passed! 🎉
```

---

## 🔧 Setup

```bash
# 1. Make sure API is running
npm run start:dev

# 2. (Optional) For role tests, assign roles in database
psql $DATABASE_URL

UPDATE "User" SET roles = '{"SUPER_ADMIN"}' WHERE email LIKE 'superadmin+%@example.com';
UPDATE "User" SET roles = '{"ADMIN"}' WHERE email LIKE 'admin+%@example.com';
UPDATE "User" SET roles = '{"MODERATOR"}' WHERE email LIKE 'moderator+%@example.com';
UPDATE "User" SET roles = '{"USER"}' WHERE email LIKE 'user+%@example.com';
UPDATE "User" SET roles = '{"GUEST"}' WHERE email LIKE 'guest+%@example.com';

\q

# 3. Run test
node test-all-roles.js
```

---

## 📊 View Results

```bash
# See results in console (already shows in terminal)

# Save results to file
node test-api.js > test_run_$(date +%s).txt

# View detailed logs
cat api_test_results.log
cat role_test_results.log

# Search for failures
grep "FAIL\|error" role_test_results.log

# Count results
echo "Passes:" && grep -c "PASS" role_test_results.log
echo "Fails:" && grep -c "FAIL" role_test_results.log
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| "API server not running" | `npm run start:dev` |
| Tests fail with 401 | API needs JWT secrets in .env |
| Role tests show 0% GUEST access | Roles not assigned in DB (see setup above) |
| Port 3000 in use | `lsof -i :3000` then kill process |
| Can't connect to DB | Check DATABASE_URL in .env |
| jq not found (bash) | `brew install jq` or use Node version |

---

## 📁 Files Location

```
project-root/
├── test-api.js                    ← Basic tests
├── test-all-roles.js              ← Role tests (RECOMMENDED)
├── test-api.sh                    ← Bash version
├── api_test_results.log           ← Results from test-api.js
├── role_test_results.log          ← Results from test-all-roles.js
└── docs/
    ├── QUICK_START_TESTING.md
    ├── TEST_SCRIPTS_GUIDE.md
    ├── TEST_ALL_ROLES_GUIDE.md
    └── ROLE_BASED_ACCESS_MATRIX.md
```

---

## 🎯 Quick Reference Commands

```bash
# Start development server
npm run start:dev

# Run basic tests
node test-api.js

# Run role-based tests
node test-all-roles.js

# Run with custom API URL
node test-api.js --base-url http://localhost:4000/api/v1

# Run bash version
chmod +x test-api.sh
./test-api.sh

# View logs
cat api_test_results.log | tail -20

# Watch logs in real-time
tail -f role_test_results.log

# Run tests continuously
while true; do node test-api.js; sleep 60; done

# Run with nodemon (auto-reload)
npx nodemon --exec "node test-api.js"

# Add npm scripts
npm run test:api
npm run test:roles
```

---

## 📈 Typical Pass Rates

### test-api.js
```
Expected: 20/20 (100%)
Time: 15-30 seconds
```

### test-all-roles.js (without role assignment)
```
Expected: 65/115 (57%)
Reason: Roles not assigned yet
```

### test-all-roles.js (with role assignment)
```
Expected: 110+/115 (96%+)
Time: 45-90 seconds
```

---

## 🔍 What Each Role Should Access

### SUPER_ADMIN (5/5) ✅
```
✅ All endpoints
✅ Manage all users
✅ View all wallets
✅ View audit logs
✅ Everything else
```

### ADMIN (4/5) ✅
```
✅ Manage users
✅ View all wallets
✅ View audit logs
✅ All endpoints except super-admin only
❌ Super-admin functions
```

### MODERATOR (3/5) ✅
```
✅ View audit logs
✅ Manage wallets
✅ Access own profile
❌ Manage other users
❌ Delete users
```

### USER (2/5) ✅
```
✅ Own profile
✅ Own wallets
❌ Other users
❌ Audit logs
❌ Admin functions
```

### GUEST (1/5) ✅
```
✅ Public endpoints
✅ Exchange rates
❌ Everything else
```

---

## 🎓 Learning Path

1. **Beginner**: Run `test-api.js` and understand output
2. **Intermediate**: Run `test-all-roles.js` and see role differences
3. **Advanced**: Modify tests and add custom endpoints
4. **Expert**: Integrate into CI/CD pipeline

---

## 📞 Quick Help

```
❓ How to run tests?
→ node test-api.js

❓ How to test roles?
→ node test-all-roles.js

❓ How to see results?
→ cat api_test_results.log

❓ Where's the documentation?
→ See QUICK_START_TESTING.md

❓ What if tests fail?
→ Check error in log file, ensure API is running

❓ How to add more tests?
→ Edit test-all-roles.js and add to ENDPOINT_MATRIX
```

---

**Last Updated**: January 31, 2026  
**Quick Start**: `node test-api.js` or `node test-all-roles.js`  
**Documentation**: See markdown files in project root
