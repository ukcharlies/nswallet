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
 *   node test-all-roles.js --help
 * 
 * This script tests:
 * - All 22 endpoints across all 5 roles
 * - Role-based access control (who can access what)
 * - Authentication and authorization
 * - Permission restrictions
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

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
 * Parse command line arguments
 */
let BASE_URL = 'http://localhost:3000/api/v1';
const LOG_FILE = 'role_test_results.log';

// Parse CLI arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    BASE_URL = args[i + 1];
    i++; // Skip next arg since we used it
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
${colors.bright}NSWallet API - Role-Based Test Suite${colors.reset}

${colors.bright}Usage:${colors.reset}
  node test-all-roles.js [options]

${colors.bright}Options:${colors.reset}
  --base-url <url>  API base URL (default: http://localhost:3000/api/v1)
  --help, -h        Show this help message

${colors.bright}Examples:${colors.reset}
  node test-all-roles.js
  node test-all-roles.js --base-url http://localhost:5000/api/v1
  node test-all-roles.js --base-url https://api.example.com/v1

${colors.bright}Output:${colors.reset}
  - Console: Real-time test results with color-coded output
  - File: Detailed results saved to role_test_results.log
    `);
    process.exit(0);
  }
}

/**
 * Test Data - Create one user per role
 */
const TEST_USERS = {
  SUPER_ADMIN: {
    email: `superadmin+${Date.now()}@example.com`,
    password: 'TestPassword123!@',
    name: 'Super Admin User',
    role: 'SUPER_ADMIN',
    token: '',
    walletId: '',
    userId: ''
  },
  ADMIN: {
    email: `admin+${Date.now()}@example.com`,
    password: 'TestPassword123!@',
    name: 'Admin User',
    role: 'ADMIN',
    token: '',
    walletId: '',
    userId: ''
  },
  MODERATOR: {
    email: `moderator+${Date.now()}@example.com`,
    password: 'TestPassword123!@',
    name: 'Moderator User',
    role: 'MODERATOR',
    token: '',
    walletId: '',
    userId: ''
  },
  USER: {
    email: `user+${Date.now()}@example.com`,
    password: 'TestPassword123!@',
    name: 'Regular User',
    role: 'USER',
    token: '',
    walletId: '',
    userId: ''
  },
  GUEST: {
    email: `guest+${Date.now()}@example.com`,
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
 */
const ENDPOINT_MATRIX = {
  // Authentication endpoints (all public)
  'POST /auth/register': {
    public: true,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER', 'GUEST'],
    description: 'Register new user'
  },
  'POST /auth/login': {
    public: true,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER', 'GUEST'],
    description: 'Login user'
  },
  'POST /auth/refresh': {
    public: true,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER', 'GUEST'],
    description: 'Refresh access token'
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
    description: 'Update current user profile'
  },
  'GET /users/:id': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
    description: 'Get user by ID (admin only)'
  },
  'DELETE /users/:id': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
    description: 'Delete user (admin only)'
  },

  // Wallet Endpoints
  'POST /wallets': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Create wallet'
  },
  'GET /wallets': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'List wallets'
  },
  'GET /wallets/:id': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Get specific wallet'
  },
  'PATCH /wallets/:id/fund': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Fund wallet (add money)'
  },
  'PATCH /wallets/:id/withdraw': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Withdraw from wallet'
  },
  'PATCH /wallets/:id/transfer': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Transfer between wallets'
  },
  'GET /wallets/:id/transactions': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Get wallet transactions'
  },
  'GET /wallets/:id/summary': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Get wallet summary'
  },
  'DELETE /wallets/:id': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER'],
    description: 'Delete wallet (soft delete)'
  },

  // Exchange Rate Endpoints (all public)
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
    public: true,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'USER', 'GUEST'],
    description: 'Convert currency'
  },

  // Audit Log Endpoints (admin only)
  'GET /audit-logs': {
    public: false,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
    description: 'Get audit logs (admin/moderator only)'
  }
};

/**
 * Test Functions
 */

async function testEndpointAccess(endpoint, role, userToken) {
  const [method, path] = endpoint.split(' ');
  const endpointConfig = ENDPOINT_MATRIX[endpoint];
  const canAccessEndpoint = endpointConfig.allowedRoles.includes(role);

  let actuallyCanAccess = false;
  let statusCode = null;

  try {
    let actualPath = path;

    // Replace :id with a test ID
    if (path.includes(':id')) {
      actualPath = path.replace(':id', 'test-id-123');
    }

    const response = await makeRequest(
      method.toUpperCase(),
      actualPath,
      method === 'PATCH' ? { amount: 100, description: 'Test' } : null,
      userToken || null
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

async function registerAndLoginUser(roleData) {
  logSection(`Setting up ${roleData.role} user: ${roleData.email}`);

  try {
    // Register
    logTest('Registering user', roleData.role);
    const registerRes = await makeRequest('POST', '/auth/register', {
      email: roleData.email,
      password: roleData.password,
      name: roleData.name
    });

    if (registerRes.status !== 201) {
      logError(`Registration failed: ${registerRes.status}`);
      return false;
    }

    roleData.userId = registerRes.data.user?.id;
    roleData.token = registerRes.data.accessToken;
    logSuccess(`User registered and logged in`);
    logInfo(`Token: ${roleData.token.substring(0, 20)}...`);

    // Create a test wallet
    if (roleData.role !== 'GUEST') {
      logTest('Creating test wallet', roleData.role);
      const walletRes = await makeRequest('POST', '/wallets', {
        name: `Test Wallet - ${roleData.role}`,
        currency: 'USD'
      }, roleData.token);

      if (walletRes.status === 201) {
        roleData.walletId = walletRes.data.id;
        logSuccess(`Test wallet created: ${roleData.walletId}`);
      }
    }

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
    tests: []
  };

  for (const [endpoint, config] of Object.entries(ENDPOINT_MATRIX)) {
    const result = await testEndpointAccess(endpoint, roleName, roleData.token);

    logTest(config.description, roleName);

    if (result.isCorrect) {
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

    roleResults.tests.push(result);
    testResults.totalTests++;

    // Save to log
    saveLog(
      `${roleName} - ${endpoint}: ${result.isCorrect ? 'PASS' : 'FAIL'} (Status: ${result.statusCode})`
    );
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
  logInfo(`Total Endpoints: ${Object.keys(ENDPOINT_MATRIX).length}`);
  logInfo(`Total Roles: ${Object.keys(TEST_USERS).length}`);
  logInfo(`Total Tests: ${Object.keys(ENDPOINT_MATRIX).length * Object.keys(TEST_USERS).length}`);
  logInfo(`Results will be saved to: ${LOG_FILE}`);

  // Phase 1: Setup all users
  logHeader('📋 PHASE 1: User Setup');

  const setupResults = {};
  for (const [roleName, roleData] of Object.entries(TEST_USERS)) {
    testResults.byRole[roleName] = { role: roleName, passed: 0, failed: 0, tests: [] };
    const success = await registerAndLoginUser(roleData);
    setupResults[roleName] = success;

    if (!success) {
      logError(`Failed to setup ${roleName} user`);
    }
  }

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
  const passPercentage = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(2);
  console.log(`Pass Rate: ${colors.bright}${passPercentage}%${colors.reset}\n`);

  console.log(colors.bright + 'Results by Role:' + colors.reset);
  for (const [roleName, results] of Object.entries(testResults.byRole)) {
    const total = results.passed + results.failed;
    if (total === 0) continue;
    const rolePassRate = ((results.passed / total) * 100).toFixed(2);
    console.log(
      `  ${roleName}: ${colors.green}${results.passed}${colors.reset}/${total} passed (${rolePassRate}%)`
    );
  }

  // Print failing tests
  const failingTests = Object.values(testResults.byRole)
    .flatMap(r => r.tests)
    .filter(t => !t.isCorrect);

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
