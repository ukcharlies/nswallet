#!/usr/bin/env node

/**
 * NSWallet API - Role-Based Test Suite
 * Tests all endpoints with all roles (SUPER_ADMIN, ADMIN, MODERATOR, USER, GUEST)
 * Author: Senior Engineer
 * Date: January 31, 2026
 * 
 * Usage: 
 *   node test-all-roles.js
 *   node test-all-roles.js --base-url http://localhost:5000/api/v1
 *   node test-all-roles.js --reuse-users
 *   node test-all-roles.js --help
 * 
 * This script tests:
 * - All endpoints across all 5 roles
 * - Role-based access control (who can access what)
 * - Authentication and authorization
 * - Permission restrictions
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

/**
 * Color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bright: '\x1b[1m'
};

/**
 * Configuration
 */
let BASE_URL = 'http://localhost:3000/api/v1';
const LOG_FILE = 'role_test_results.log';
const USERS_CACHE_FILE = 'test_users_cache.json';
let REUSE_USERS = false;
const REQUEST_DELAY_MS = 500; // Delay between requests to avoid rate limiting

// Parse CLI arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    BASE_URL = args[i + 1];
    i++; // Skip next arg since we used it
  } else if (args[i] === '--reuse-users' || args[i] === '-r') {
    REUSE_USERS = true;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
${colors.bright}NSWallet API - Role-Based Test Suite${colors.reset}

${colors.bright}Usage:${colors.reset}
  node test-all-roles.js [options]

${colors.bright}Options:${colors.reset}
  --base-url <url>   API base URL (default: http://localhost:3000/api/v1)
  --reuse-users, -r  Reuse existing test users (login instead of register)
  --help, -h         Show this help message

${colors.bright}Examples:${colors.reset}
  node test-all-roles.js
  node test-all-roles.js --base-url http://localhost:5000/api/v1
  node test-all-roles.js --base-url http://localhost:5000/api/v1 --reuse-users
  node test-all-roles.js --reuse-users

${colors.bright}Output:${colors.reset}
  - Console: Real-time test results with color-coded output
  - File: Detailed results saved to role_test_results.log
  - Cache: User credentials saved to test_users_cache.json for reuse
    `);
    process.exit(0);
  }
}

/**
 * Helper: delay function to avoid rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test Data - Create one user per role
 */
const TEST_USERS = {
  SUPER_ADMIN: {
    email: 'superadmin_test@example.com',
    password: 'TestPassword123!@',
    name: 'Super Admin User',
    role: 'SUPER_ADMIN',
    token: '',
    walletId: '',
    userId: ''
  },
  ADMIN: {
    email: 'admin_test@example.com',
    password: 'TestPassword123!@',
    name: 'Admin User',
    role: 'ADMIN',
    token: '',
    walletId: '',
    userId: ''
  },
  MODERATOR: {
    email: 'moderator_test@example.com',
    password: 'TestPassword123!@',
    name: 'Moderator User',
    role: 'MODERATOR',
    token: '',
    walletId: '',
    userId: ''
  },
  USER: {
    email: 'user_test@example.com',
    password: 'TestPassword123!@',
    name: 'Regular User',
    role: 'USER',
    token: '',
    walletId: '',
    userId: ''
  },
  GUEST: {
    email: 'guest_test@example.com',
    password: 'TestPassword123!@',
    name: 'Guest User',
    role: 'GUEST',
    token: '',
    walletId: '',
    userId: ''
  }
};

/**
 * Test Results Storage
 */
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  byRole: {},
  byEndpoint: {}
};

/**
 * Utility Functions
 */

function logHeader(text) {
  console.log('\n' + colors.blue + '═'.repeat(70) + colors.reset);
  console.log(colors.bright + colors.blue + text + colors.reset);
  console.log(colors.blue + '═'.repeat(70) + colors.reset + '\n');
}

function logSection(text) {
  console.log(colors.cyan + '\n>>> ' + text + colors.reset);
}

function logTest(text, role = null) {
  const roleStr = role ? ` [${role}]` : '';
  console.log(colors.yellow + '→ ' + text + roleStr + colors.reset);
}

function logSuccess(text) {
  console.log(colors.green + '  ✓ ' + text + colors.reset);
}

function logError(text) {
  console.log(colors.red + '  ✗ ' + text + colors.reset);
}

function logWarning(text) {
  console.log(colors.yellow + '  ⚠ ' + text + colors.reset);
}

function logInfo(text) {
  console.log(colors.cyan + '  ℹ ' + text + colors.reset);
}

function saveLog(text) {
  fs.appendFileSync(LOG_FILE, text + '\n');
}

/**
 * HTTP Request Helper
 */
function makeRequest(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const requestUrl = `${BASE_URL}${endpoint}`;
    const parsedUrl = new url.URL(requestUrl);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const protocol = requestUrl.startsWith('https') ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: response,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: { raw: data },
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Role-Based Endpoint Access Matrix
 * Defines which roles can access which endpoints
 * NOTE: This matches the actual API implementation
 */
const ENDPOINT_MATRIX = {
  // Authentication endpoints (all public)
  'POST /auth/register': {
    public: true,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER', 'GUEST'],
    description: 'Register new user',
    body: { email: 'temp@example.com', password: 'TempPass123!@', name: 'Temp User' }
  },
  'POST /auth/login': {
    public: true,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER', 'GUEST'],
    description: 'Login user',
    body: { email: 'temp@example.com', password: 'TempPass123!@' }
  },

  // User Profile Endpoints
  'GET /users/me': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Get current user profile'
  },
  'PATCH /users/me': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Update current user profile',
    body: { name: 'Updated Name' }
  },
  'GET /users/:id': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
    description: 'Get user by ID (admin only)',
    needsUserId: true
  },
  'DELETE /users/:id': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
    description: 'Delete user (admin only)',
    needsUserId: true,
    skipTest: true // Skip to avoid deleting test users
  },

  // Wallet Endpoints
  'POST /wallets': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Create wallet',
    body: { name: 'Test Wallet', currency: 'USD' }
  },
  'GET /wallets': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'List wallets'
  },
  'GET /wallets/:id': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Get specific wallet',
    needsWalletId: true
  },
  'PATCH /wallets/:id/fund': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Fund wallet (add money)',
    needsWalletId: true,
    body: { amount: 100, description: 'Test funding' }
  },
  'PATCH /wallets/:id/withdraw': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Withdraw from wallet',
    needsWalletId: true,
    body: { amount: 10, description: 'Test withdrawal' }
  },
  'GET /wallets/:id/transactions': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Get wallet transactions',
    needsWalletId: true
  },
  'GET /wallets/:id/summary': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Get wallet summary',
    needsWalletId: true
  },
  'DELETE /wallets/:id': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Delete wallet (soft delete)',
    needsWalletId: true,
    skipTest: true // Skip to avoid deleting test wallets
  },

  // Exchange Rate Endpoints
  'GET /rates': {
    public: true,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER', 'GUEST'],
    description: 'Get exchange rates'
  },
  'GET /rates/currencies': {
    public: true,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER', 'GUEST'],
    description: 'Get supported currencies'
  },
  'GET /rates/convert': {
    public: false, // Fixed: This endpoint is NOT public
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Convert currency',
    queryParams: '?amount=100&from=USD&to=NGN'
  }
};

/**
 * Test Functions
 */

async function testEndpointAccess(endpoint, role, roleData) {
  const [method, path] = endpoint.split(' ');
  const endpointConfig = ENDPOINT_MATRIX[endpoint];
  const canAccessEndpoint = endpointConfig.allowedRoles.includes(role);

  // Skip tests marked for skipping
  if (endpointConfig.skipTest) {
    return {
      endpoint,
      role,
      canAccessEndpoint,
      actuallyCanAccess: 'SKIPPED',
      statusCode: 'SKIPPED',
      isCorrect: true,
      skipped: true
    };
  }

  let actuallyCanAccess = false;
  let statusCode = null;

  try {
    let actualPath = path;

    // Replace :id with actual wallet ID or user ID
    if (endpointConfig.needsWalletId && path.includes(':id')) {
      if (!roleData.walletId) {
        // No wallet available, expected to fail for GUEST
        actualPath = path.replace(':id', '00000000-0000-0000-0000-000000000000');
      } else {
        actualPath = path.replace(':id', roleData.walletId);
      }
    } else if (endpointConfig.needsUserId && path.includes(':id')) {
      actualPath = path.replace(':id', roleData.userId || '00000000-0000-0000-0000-000000000000');
    }

    // Add query params if needed
    if (endpointConfig.queryParams) {
      actualPath += endpointConfig.queryParams;
    }

    // Determine request body
    let body = null;
    if (endpointConfig.body) {
      body = { ...endpointConfig.body };
    }

    const response = await makeRequest(
      method.toUpperCase(),
      actualPath,
      body,
      roleData.token || null
    );

    statusCode = response.status;

    // Check if access was granted
    if (statusCode === 200 || statusCode === 201 || statusCode === 204) {
      actuallyCanAccess = true;
    } else if (statusCode === 401 || statusCode === 403) {
      actuallyCanAccess = false;
    }
  } catch (error) {
    logError(`Request failed: ${error.message}`);
  }

  // Verify access matches expectations
  const isCorrect = actuallyCanAccess === canAccessEndpoint;

  const result = {
    endpoint,
    role,
    canAccessEndpoint,
    actuallyCanAccess,
    statusCode,
    isCorrect
  };

  return result;
}

/**
 * Test Sequence
 */

/**
 * Load cached users from file
 */
function loadCachedUsers() {
  try {
    if (fs.existsSync(USERS_CACHE_FILE)) {
      const data = fs.readFileSync(USERS_CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logWarning(`Could not load cached users: ${error.message}`);
  }
  return null;
}

/**
 * Save users to cache file
 */
function saveCachedUsers(users) {
  try {
    const cacheData = {};
    for (const [roleName, roleData] of Object.entries(users)) {
      cacheData[roleName] = {
        email: roleData.email,
        password: roleData.password,
        name: roleData.name,
        role: roleData.role,
        userId: roleData.userId,
        walletId: roleData.walletId
      };
    }
    fs.writeFileSync(USERS_CACHE_FILE, JSON.stringify(cacheData, null, 2));
    logInfo(`Users cached to ${USERS_CACHE_FILE}`);
  } catch (error) {
    logWarning(`Could not save cached users: ${error.message}`);
  }
}

/**
 * Try to login existing user
 */
async function loginUser(roleData) {
  logTest('Attempting to login existing user', roleData.role);
  
  const loginRes = await makeRequest('POST', '/auth/login', {
    email: roleData.email,
    password: roleData.password
  });

  if (loginRes.status === 200 || loginRes.status === 201) {
    roleData.userId = loginRes.data.user?.id;
    roleData.token = loginRes.data.accessToken;
    logSuccess(`Logged in successfully`);
    logInfo(`Token: ${roleData.token.substring(0, 20)}...`);
    return true;
  }
  
  return false;
}

/**
 * Get or create wallet for user
 */
async function getOrCreateWallet(roleData) {
  if (roleData.role === 'GUEST') return true;
  
  // First try to get existing wallets
  logTest('Checking for existing wallets', roleData.role);
  const walletsRes = await makeRequest('GET', '/wallets', null, roleData.token);
  
  if (walletsRes.status === 200 && walletsRes.data && walletsRes.data.length > 0) {
    roleData.walletId = walletsRes.data[0].id;
    logSuccess(`Found existing wallet: ${roleData.walletId}`);
    return true;
  }
  
  // Create a new wallet
  logTest('Creating test wallet', roleData.role);
  const walletRes = await makeRequest('POST', '/wallets', {
    name: `Test Wallet - ${roleData.role}`,
    currency: 'USD'
  }, roleData.token);

  if (walletRes.status === 201) {
    roleData.walletId = walletRes.data.id;
    logSuccess(`Test wallet created: ${roleData.walletId}`);
    
    // Fund the wallet for withdraw tests
    await makeRequest('PATCH', `/wallets/${roleData.walletId}/fund`, {
      amount: 1000,
      description: 'Initial test funding'
    }, roleData.token);
    logSuccess(`Wallet funded with $1000`);
    
    return true;
  }
  
  logError(`Failed to create wallet: ${walletRes.status}`);
  return false;
}

async function registerAndLoginUser(roleData) {
  logSection(`Setting up ${roleData.role} user: ${roleData.email}`);

  try {
    // If reusing users, try login first
    if (REUSE_USERS) {
      const loggedIn = await loginUser(roleData);
      if (loggedIn) {
        await getOrCreateWallet(roleData);
        return true;
      }
      logInfo('Login failed, will try to register');
    }

    // Add delay before registration to avoid rate limiting
    await delay(REQUEST_DELAY_MS);

    // Register new user
    logTest('Registering user', roleData.role);
    const registerRes = await makeRequest('POST', '/auth/register', {
      email: roleData.email,
      password: roleData.password,
      name: roleData.name
    });

    if (registerRes.status === 429) {
      logError(`Rate limited! Waiting 5 seconds...`);
      await delay(5000);
      // Retry once
      const retryRes = await makeRequest('POST', '/auth/register', {
        email: roleData.email,
        password: roleData.password,
        name: roleData.name
      });
      if (retryRes.status !== 201) {
        // User might already exist, try login
        logInfo('Registration failed, trying login...');
        const loggedIn = await loginUser(roleData);
        if (loggedIn) {
          await getOrCreateWallet(roleData);
          return true;
        }
        logError(`Registration failed after retry: ${retryRes.status}`);
        return false;
      }
      registerRes.status = retryRes.status;
      registerRes.data = retryRes.data;
    }

    if (registerRes.status === 400 || registerRes.status === 409) {
      // User might already exist (409 Conflict) or validation error
      logInfo('User may already exist, trying login...');
      const loggedIn = await loginUser(roleData);
      if (loggedIn) {
        await getOrCreateWallet(roleData);
        return true;
      }
      logError(`Could not register or login: ${registerRes.status}`);
      return false;
    }

    if (registerRes.status !== 201) {
      logError(`Registration failed: ${registerRes.status}`);
      return false;
    }

    roleData.userId = registerRes.data.user?.id;
    roleData.token = registerRes.data.accessToken;
    logSuccess(`User registered and logged in`);
    logInfo(`Token: ${roleData.token.substring(0, 20)}...`);

    // Create a test wallet
    await getOrCreateWallet(roleData);

    return true;
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    return false;
  }
}

async function testAllEndpointsForRole(roleName, roleData) {
  logSection(`Testing all endpoints for ${roleName} role`);

  const roleResults = {
    role: roleName,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
  };

  for (const [endpoint, config] of Object.entries(ENDPOINT_MATRIX)) {
    // Pass full roleData instead of just token
    const result = await testEndpointAccess(endpoint, roleName, roleData);

    logTest(config.description, roleName);

    if (result.skipped) {
      logWarning(`${endpoint} - SKIPPED`);
      roleResults.skipped++;
    } else if (result.isCorrect) {
      logSuccess(
        `${endpoint} - Status: ${result.statusCode} (Expected access: ${result.canAccessEndpoint})`
      );
      roleResults.passed++;
      testResults.passedTests++;
    } else {
      logError(
        `${endpoint} - Status: ${result.statusCode} (Expected access: ${result.canAccessEndpoint}, Got: ${result.actuallyCanAccess})`
      );
      roleResults.failed++;
      testResults.failedTests++;
    }

    if (!result.skipped) {
      roleResults.tests.push(result);
      testResults.totalTests++;
    }

    // Save to log
    saveLog(
      `${roleName} - ${endpoint}: ${result.skipped ? 'SKIPPED' : result.isCorrect ? 'PASS' : 'FAIL'} (Status: ${result.statusCode})`
    );

    // Small delay between tests
    await delay(100);
  }

  testResults.byRole[roleName] = roleResults;
  return roleResults;
}

/**
 * Main Test Runner
 */

async function runAllRoleTests() {
  // Clear log file
  fs.writeFileSync(LOG_FILE, '');

  logHeader('🧪 NSWallet API - Comprehensive Role-Based Test Suite');
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Reuse Users: ${REUSE_USERS ? 'Yes' : 'No'}`);
  logInfo(`Total Endpoints: ${Object.keys(ENDPOINT_MATRIX).length}`);
  logInfo(`Total Roles: ${Object.keys(TEST_USERS).length}`);
  logInfo(`Results will be saved to: ${LOG_FILE}`);

  // Phase 1: Setup all users
  logHeader('📋 PHASE 1: User Setup');

  const setupResults = {};
  for (const [roleName, roleData] of Object.entries(TEST_USERS)) {
    testResults.byRole[roleName] = { role: roleName, passed: 0, failed: 0, skipped: 0, tests: [] };
    const success = await registerAndLoginUser(roleData);
    setupResults[roleName] = success;

    if (!success) {
      logError(`Failed to setup ${roleName} user`);
    }
    
    // Add delay between user setups to avoid rate limiting
    await delay(REQUEST_DELAY_MS);
  }

  // Save users to cache for reuse
  saveCachedUsers(TEST_USERS);

  // Phase 2: Test all endpoints for each role
  logHeader('🔐 PHASE 2: Role-Based Access Testing');

  for (const [roleName, roleData] of Object.entries(TEST_USERS)) {
    if (!setupResults[roleName]) {
      logWarning(`Skipping tests for ${roleName} (setup failed)`);
      continue;
    }

    await testAllEndpointsForRole(roleName, roleData);
  }

  // Phase 3: Print Summary
  logHeader('📊 TEST SUMMARY');

  console.log(colors.bright + 'Overall Results:' + colors.reset);
  logInfo(`Total Tests: ${testResults.totalTests}`);
  logSuccess(`Passed: ${testResults.passedTests}`);
  logError(`Failed: ${testResults.failedTests}`);
  
  const passPercentage = testResults.totalTests > 0 
    ? ((testResults.passedTests / testResults.totalTests) * 100).toFixed(2)
    : 0;
  console.log(`Pass Rate: ${colors.bright}${passPercentage}%${colors.reset}\n`);

  console.log(colors.bright + 'Results by Role:' + colors.reset);
  for (const [roleName, results] of Object.entries(testResults.byRole)) {
    const total = results.passed + results.failed;
    if (total === 0) {
      console.log(`  ${roleName}: ${colors.yellow}No tests run${colors.reset}`);
      continue;
    }
    const rolePassRate = ((results.passed / total) * 100).toFixed(2);
    const skippedStr = results.skipped > 0 ? ` (${results.skipped} skipped)` : '';
    console.log(
      `  ${roleName}: ${colors.green}${results.passed}${colors.reset}/${total} passed (${rolePassRate}%)${skippedStr}`
    );
  }

  // Print failing tests
  const failingTests = Object.values(testResults.byRole)
    .flatMap(r => r.tests)
    .filter(t => !t.isCorrect && !t.skipped);

  if (failingTests.length > 0) {
    console.log(colors.bright + '\nFailing Tests:' + colors.reset);
    failingTests.forEach(test => {
      console.log(
        `  ${colors.red}${test.role}${colors.reset} - ${test.endpoint} (Status: ${test.statusCode})`
      );
    });
  }

  // Final result
  console.log('\n' + colors.blue + '═'.repeat(70) + colors.reset);
  if (testResults.failedTests === 0) {
    logSuccess('All tests passed! 🎉');
    process.exit(0);
  } else {
    logError(`${testResults.failedTests} test(s) failed`);
    logInfo(`Tip: Run with --reuse-users to retest without creating new users`);
    process.exit(1);
  }
}

/**
 * Main Entry Point
 */

async function main() {
  try {
    // Display configuration
    logInfo(`API Base URL: ${BASE_URL}`);
    logInfo(`Reuse Users: ${REUSE_USERS ? 'Yes' : 'No'}`);
    logInfo(`Log file: ${LOG_FILE}`);
    
    // Check server connectivity
    logInfo('Checking API server connectivity...');
    try {
      const response = await makeRequest('GET', '/rates/currencies');
      if (response.status === 200) {
        logSuccess(`API server is responding at ${BASE_URL}`);
      }
    } catch (error) {
      logError(`Cannot connect to API server at ${BASE_URL}`);
      logInfo('Make sure the server is running on the correct port');
      logInfo(`You can specify a custom URL: node test-all-roles.js --base-url http://localhost:5000/api/v1`);
      logInfo(`For help: node test-all-roles.js --help`);
      process.exit(1);
    }

    // Run tests
    await runAllRoleTests();
  } catch (error) {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Start the test suite
main();
