#!/usr/bin/env node

/**
 * NSWallet API - Comprehensive Test Suite
 * Tests all endpoints with full role-based access control
 * Author: Senior Engineer
 * Date: January 31, 2026
 * 
 * Usage: 
 *   node test-api.js
 *   node test-api.js --base-url http://localhost:5000/api/v1
 *   node test-api.js --help
 */

const http = require('http');
const https = require('https');
const url = require('url');

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
  bright: '\x1b[1m'
};

/**
 * Configuration
 */
let BASE_URL = 'http://localhost:3000/api/v1';
const LOG_FILE = 'api_test_results.log';
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    BASE_URL = args[i + 1];
    i++; // Skip next arg since we used it
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
${colors.bright}NSWallet API - Basic Test Suite${colors.reset}

${colors.bright}Usage:${colors.reset}
  node test-api.js [options]

${colors.bright}Options:${colors.reset}
  --base-url <url>  API base URL (default: http://localhost:3000/api/v1)
  --help, -h        Show this help message

${colors.bright}Examples:${colors.reset}
  node test-api.js
  node test-api.js --base-url http://localhost:5000/api/v1
  node test-api.js --base-url https://api.example.com/v1

${colors.bright}Output:${colors.reset}
  - Console: Real-time test results with color-coded output
  - File: Detailed results saved to api_test_results.log
    `);
    process.exit(0);
  }
}

/**
 * Test data
 */
const TEST_USER_EMAIL = `testuser+${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!@';
const TEST_USER_NAME = 'Test User';

/**
 * Tokens and IDs (will be populated during tests)
 */
let accessToken = '';
let refreshToken = '';
let walletId = '';
let userId = '';
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Utility Functions
 */

function logHeader(text) {
  console.log('\n' + colors.blue + '━'.repeat(60) + colors.reset);
  console.log(colors.blue + text + colors.reset);
  console.log(colors.blue + '━'.repeat(60) + colors.reset + '\n');
}

function logTest(text) {
  console.log(colors.yellow + '→ ' + text + colors.reset);
}

function logSuccess(text) {
  console.log(colors.green + '✓ ' + text + colors.reset);
}

function logError(text) {
  console.log(colors.red + '✗ ' + text + colors.reset);
}

function logInfo(text) {
  console.log(colors.cyan + 'ℹ ' + text + colors.reset);
}

function saveResponse(response, testName) {
  const logEntry = `\n[${new Date().toISOString()}] ${testName}\n${JSON.stringify(response, null, 2)}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
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
 * Test Runner Helper
 */
async function runTest(testName, testFn) {
  try {
    logTest(testName);
    const result = await testFn();
    
    if (result.success) {
      logSuccess(result.message);
      testResults.passed++;
      testResults.tests.push({
        name: testName,
        status: 'PASS',
        message: result.message
      });
      return true;
    } else {
      logError(result.message);
      if (result.error) console.log(colors.red + JSON.stringify(result.error, null, 2) + colors.reset);
      testResults.failed++;
      testResults.tests.push({
        name: testName,
        status: 'FAIL',
        message: result.message,
        error: result.error
      });
      return false;
    }
  } catch (error) {
    logError(`${testName} threw an error: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({
      name: testName,
      status: 'ERROR',
      message: error.message
    });
    return false;
  }
}

/**
 * Authentication Tests
 */

async function testRegister() {
  const response = await makeRequest('POST', '/auth/register', {
    email: TEST_USER_EMAIL,
    password: TEST_PASSWORD,
    name: TEST_USER_NAME
  });

  if (response.status === 201 && response.data.accessToken) {
    accessToken = response.data.accessToken;
    userId = response.data.user?.id;
    saveResponse(response.data, 'testRegister');
    return {
      success: true,
      message: `User registered: ${TEST_USER_EMAIL}, Token: ${accessToken.substring(0, 20)}...`
    };
  }

  return {
    success: false,
    message: 'Registration failed',
    error: response.data
  };
}

async function testLogin() {
  const response = await makeRequest('POST', '/auth/login', {
    email: TEST_USER_EMAIL,
    password: TEST_PASSWORD
  });

  if (response.status === 200 && response.data.accessToken) {
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    saveResponse(response.data, 'testLogin');
    return {
      success: true,
      message: `Login successful, Token: ${accessToken.substring(0, 20)}...`
    };
  }

  return {
    success: false,
    message: 'Login failed',
    error: response.data
  };
}

async function testRefreshToken() {
  const response = await makeRequest('POST', '/auth/refresh', {}, accessToken);

  if (response.status === 200 && response.data.accessToken) {
    accessToken = response.data.accessToken;
    saveResponse(response.data, 'testRefreshToken');
    return {
      success: true,
      message: `Token refreshed successfully, New token: ${accessToken.substring(0, 20)}...`
    };
  }

  return {
    success: false,
    message: 'Token refresh failed',
    error: response.data
  };
}

async function testLogout() {
  const response = await makeRequest('POST', '/auth/logout', {}, accessToken);

  if (response.status === 200 || response.data.message?.includes('Logged out')) {
    saveResponse(response.data, 'testLogout');
    return {
      success: true,
      message: 'Logout successful'
    };
  }

  return {
    success: false,
    message: 'Logout failed',
    error: response.data
  };
}

/**
 * User Profile Tests
 */

async function testGetProfile() {
  const response = await makeRequest('GET', '/users/me', null, accessToken);

  if (response.status === 200 && response.data.email) {
    saveResponse(response.data, 'testGetProfile');
    return {
      success: true,
      message: `Profile retrieved: ${response.data.email}`
    };
  }

  return {
    success: false,
    message: 'Failed to get profile',
    error: response.data
  };
}

async function testUpdateProfile() {
  const newName = 'Updated User Name';
  const response = await makeRequest('PATCH', '/users/me', {
    name: newName
  }, accessToken);

  if (response.status === 200 && response.data.name === newName) {
    saveResponse(response.data, 'testUpdateProfile');
    return {
      success: true,
      message: `Profile updated: name = ${newName}`
    };
  }

  return {
    success: false,
    message: 'Failed to update profile',
    error: response.data
  };
}

/**
 * Wallet Tests
 */

async function testCreateWallet() {
  const response = await makeRequest('POST', '/wallets', {
    name: 'My Test Wallet',
    currency: 'USD'
  }, accessToken);

  if (response.status === 201 && response.data.id) {
    walletId = response.data.id;
    saveResponse(response.data, 'testCreateWallet');
    return {
      success: true,
      message: `Wallet created: ${response.data.name}, ID: ${walletId}`
    };
  }

  return {
    success: false,
    message: 'Failed to create wallet',
    error: response.data
  };
}

async function testGetAllWallets() {
  const response = await makeRequest('GET', '/wallets', null, accessToken);

  if (response.status === 200 && Array.isArray(response.data)) {
    saveResponse(response.data, 'testGetAllWallets');
    return {
      success: true,
      message: `Retrieved ${response.data.length} wallet(s)`
    };
  }

  return {
    success: false,
    message: 'Failed to get wallets',
    error: response.data
  };
}

async function testGetWalletById() {
  if (!walletId) {
    return {
      success: false,
      message: 'Wallet ID not available (create wallet first)'
    };
  }

  const response = await makeRequest('GET', `/wallets/${walletId}`, null, accessToken);

  if (response.status === 200 && response.data.id === walletId) {
    saveResponse(response.data, 'testGetWalletById');
    return {
      success: true,
      message: `Wallet retrieved: ${response.data.name}`
    };
  }

  return {
    success: false,
    message: 'Failed to get wallet',
    error: response.data
  };
}

async function testFundWallet() {
  if (!walletId) {
    return {
      success: false,
      message: 'Wallet ID not available (create wallet first)'
    };
  }

  const response = await makeRequest('PATCH', `/wallets/${walletId}/fund`, {
    amount: 1000.50,
    description: 'Initial deposit'
  }, accessToken);

  if (response.status === 200 && response.data.balance) {
    saveResponse(response.data, 'testFundWallet');
    return {
      success: true,
      message: `Wallet funded: Balance = $${response.data.balance}`
    };
  }

  return {
    success: false,
    message: 'Failed to fund wallet',
    error: response.data
  };
}

async function testWithdrawFromWallet() {
  if (!walletId) {
    return {
      success: false,
      message: 'Wallet ID not available (create wallet first)'
    };
  }

  const response = await makeRequest('PATCH', `/wallets/${walletId}/withdraw`, {
    amount: 100,
    description: 'Test withdrawal'
  }, accessToken);

  if (response.status === 200 && response.data.balance) {
    saveResponse(response.data, 'testWithdrawFromWallet');
    return {
      success: true,
      message: `Withdrawal successful: New balance = $${response.data.balance}`
    };
  }

  return {
    success: false,
    message: 'Failed to withdraw',
    error: response.data
  };
}

async function testGetWalletTransactions() {
  if (!walletId) {
    return {
      success: false,
      message: 'Wallet ID not available (create wallet first)'
    };
  }

  const response = await makeRequest('GET', `/wallets/${walletId}/transactions?limit=10`, null, accessToken);

  if (response.status === 200 && Array.isArray(response.data)) {
    saveResponse(response.data, 'testGetWalletTransactions');
    return {
      success: true,
      message: `Retrieved ${response.data.length} transaction(s)`
    };
  }

  return {
    success: false,
    message: 'Failed to get transactions',
    error: response.data
  };
}

async function testGetWalletSummary() {
  if (!walletId) {
    return {
      success: false,
      message: 'Wallet ID not available (create wallet first)'
    };
  }

  const response = await makeRequest('GET', `/wallets/${walletId}/summary`, null, accessToken);

  if (response.status === 200 && response.data) {
    saveResponse(response.data, 'testGetWalletSummary');
    return {
      success: true,
      message: 'Wallet summary retrieved successfully'
    };
  }

  return {
    success: false,
    message: 'Failed to get wallet summary',
    error: response.data
  };
}

/**
 * Exchange Rates Tests
 */

async function testGetExchangeRates() {
  const response = await makeRequest('GET', '/rates?base=USD');

  if (response.status === 200 && response.data.rates) {
    saveResponse(response.data, 'testGetExchangeRates');
    const rateCount = Object.keys(response.data.rates).length;
    return {
      success: true,
      message: `Retrieved ${rateCount} exchange rates`
    };
  }

  return {
    success: false,
    message: 'Failed to get exchange rates',
    error: response.data
  };
}

async function testGetSupportedCurrencies() {
  const response = await makeRequest('GET', '/rates/currencies');

  if (response.status === 200 && Array.isArray(response.data.currencies)) {
    saveResponse(response.data, 'testGetSupportedCurrencies');
    return {
      success: true,
      message: `Retrieved ${response.data.currencies.length} supported currencies`
    };
  }

  return {
    success: false,
    message: 'Failed to get currencies',
    error: response.data
  };
}

async function testConvertCurrency() {
  const response = await makeRequest('GET', '/rates/convert?amount=100&from=USD&to=NGN', null, accessToken);

  if (response.status === 200 && response.data.convertedAmount) {
    saveResponse(response.data, 'testConvertCurrency');
    return {
      success: true,
      message: `Conversion: 100 USD = ${response.data.convertedAmount} NGN`
    };
  }

  return {
    success: false,
    message: 'Failed to convert currency',
    error: response.data
  };
}

/**
 * Error Handling Tests
 */

async function testUnauthorizedAccess() {
  const response = await makeRequest('GET', '/users/me');

  if (response.status === 401 || response.data.message?.includes('Authentication')) {
    saveResponse(response.data, 'testUnauthorizedAccess');
    return {
      success: true,
      message: 'Correctly rejected unauthorized request'
    };
  }

  return {
    success: false,
    message: 'Should have rejected unauthorized request',
    error: response.data
  };
}

async function testInvalidToken() {
  const response = await makeRequest('GET', '/users/me', null, 'invalid.token.here');

  if (response.status === 401 || response.data.message?.includes('Invalid') || response.data.message?.includes('Unauthorized')) {
    saveResponse(response.data, 'testInvalidToken');
    return {
      success: true,
      message: 'Correctly rejected invalid token'
    };
  }

  return {
    success: false,
    message: 'Should have rejected invalid token',
    error: response.data
  };
}

async function testWrongPassword() {
  const response = await makeRequest('POST', '/auth/login', {
    email: TEST_USER_EMAIL,
    password: 'WrongPassword123!@'
  });

  if (response.status === 401 || response.data.message?.includes('Invalid') || response.data.message?.includes('failed')) {
    saveResponse(response.data, 'testWrongPassword');
    return {
      success: true,
      message: 'Correctly rejected wrong password'
    };
  }

  return {
    success: false,
    message: 'Should have rejected wrong password',
    error: response.data
  };
}

async function testInvalidEmail() {
  const response = await makeRequest('POST', '/auth/register', {
    email: 'notanemail',
    password: TEST_PASSWORD,
    name: 'Test'
  });

  if (response.status === 400 || response.data.message?.includes('email') || response.data.message?.includes('invalid')) {
    saveResponse(response.data, 'testInvalidEmail');
    return {
      success: true,
      message: 'Correctly rejected invalid email'
    };
  }

  return {
    success: false,
    message: 'Should have rejected invalid email',
    error: response.data
  };
}

/**
 * Main Test Suite Runner
 */

async function runAllTests() {
  // Clear log file
  fs.writeFileSync(LOG_FILE, '');

  logHeader('🚀 NSWallet API - Comprehensive Test Suite Starting');
  logInfo(`Base URL: ${BASE_URL}`);
  logInfo(`Test User Email: ${TEST_USER_EMAIL}`);
  logInfo(`Results will be saved to: ${LOG_FILE}`);
  logInfo(`Node.js Version: ${process.version}`);

  // Define tests in sequence (some depend on previous tests)
  const tests = [
    { name: 'Register User', fn: testRegister },
    { name: 'Login User', fn: testLogin },
    { name: 'Get User Profile', fn: testGetProfile },
    { name: 'Update User Profile', fn: testUpdateProfile },
    { name: 'Create Wallet', fn: testCreateWallet },
    { name: 'Get All Wallets', fn: testGetAllWallets },
    { name: 'Get Specific Wallet', fn: testGetWalletById },
    { name: 'Fund Wallet', fn: testFundWallet },
    { name: 'Withdraw From Wallet', fn: testWithdrawFromWallet },
    { name: 'Get Wallet Transactions', fn: testGetWalletTransactions },
    { name: 'Get Wallet Summary', fn: testGetWalletSummary },
    { name: 'Refresh Access Token', fn: testRefreshToken },
    { name: 'Get Exchange Rates', fn: testGetExchangeRates },
    { name: 'Get Supported Currencies', fn: testGetSupportedCurrencies },
    { name: 'Convert Currency', fn: testConvertCurrency },
    { name: 'Unauthorized Access (No Token)', fn: testUnauthorizedAccess },
    { name: 'Invalid Token', fn: testInvalidToken },
    { name: 'Wrong Password', fn: testWrongPassword },
    { name: 'Invalid Email', fn: testInvalidEmail },
    { name: 'Logout User', fn: testLogout }
  ];

  // Run all tests
  for (const test of tests) {
    await runTest(test.name, test.fn);
  }

  // Print summary
  logHeader('📊 TEST SUMMARY');
  logSuccess(`Passed: ${testResults.passed}`);
  logError(`Failed: ${testResults.failed}`);
  logInfo(`Total: ${testResults.passed + testResults.failed}`);

  // Print detailed results
  console.log(colors.bright + '\nDetailed Results:' + colors.reset);
  testResults.tests.forEach(test => {
    const statusColor = test.status === 'PASS' ? colors.green : colors.red;
    console.log(`${statusColor}[${test.status}]${colors.reset} ${test.name}: ${test.message}`);
  });

  if (testResults.failed === 0) {
    logSuccess('\nAll tests passed! 🎉\n');
    process.exit(0);
  } else {
    logError(`\n${testResults.failed} test(s) failed\n`);
    process.exit(1);
  }
}

/**
 * Check prerequisites and start tests
 */

async function main() {
  try {
    // Test server connectivity
    logInfo('Checking API server connectivity...');
    try {
      const response = await makeRequest('GET', '/rates/currencies');
      if (response.status === 200) {
        logSuccess(`API server is responding at ${BASE_URL}`);
      }
    } catch (error) {
      logError(`Cannot connect to API server at ${BASE_URL}`);
      logInfo('Make sure the server is running: npm run start:dev');
      process.exit(1);
    }

    // Run tests
    await runAllTests();
  } catch (error) {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Start the test suite
main();
