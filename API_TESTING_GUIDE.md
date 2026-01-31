# NSWallet Backend - Complete Testing Guide

## 🚀 Quick Start

### Prerequisites

1. **PostgreSQL** running locally on `localhost:5432`
2. **Node.js 18+** installed
3. Create `.env` file from `.env.example` and fill in values

---

## 📋 Complete API Endpoints Reference

### Base URL

```
http://localhost:3000/api/v1
```

---

## 🔐 Authentication Routes

### 1. Register New User

**Endpoint:** `POST /auth/register`

**Requirements:**

- Email must be valid
- Password must be at least 12 characters
- Password must contain: uppercase, lowercase, number, special character
- Optional: name (max 100 chars)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@",
  "name": "John Doe"
}
```

**Response (201 Created):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isEmailVerified": false,
    "roles": ["USER"],
    "createdAt": "2026-01-31T10:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

**Curl Example:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "MyPassword123!@",
    "name": "John Doe"
  }'
```

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

**Curl Example:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "MyPassword123!@"
  }'
```

---

### 3. Refresh Access Token

**Endpoint:** `POST /auth/refresh`

**Request Body (Option A - in body):**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Request (Option B - in cookie):**

- Cookie is set automatically on login response
- Just send empty body: `{}`

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

**Curl Example:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Cookie: refreshToken=eyJhbGciOiJIUzI1NiIs..." \
  -d '{}'
```

---

### 4. Logout (Single Device)

**Endpoint:** `POST /auth/logout`
**Auth Required:** Yes (Bearer token)

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:** `200 OK` (empty body)

---

### 5. Logout All Devices

**Endpoint:** `POST /auth/logout-all`
**Auth Required:** Yes (Bearer token)

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:** `200 OK` (empty body)

---

### 6. Google OAuth Login

**Endpoint:** `GET /auth/google`

**URL:**

```
http://localhost:3000/api/v1/auth/google
```

**Callback:** `GET /auth/google/callback`

---

## 👤 User Management Routes

### 1. Get Current User Profile

**Endpoint:** `GET /users/me`
**Auth Required:** Yes (Bearer token)

**Request:**

```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "isEmailVerified": false,
  "roles": ["USER"],
  "createdAt": "2026-01-31T10:00:00Z",
  "updatedAt": "2026-01-31T10:00:00Z"
}
```

---

### 2. Update Current User Profile

**Endpoint:** `PATCH /users/me`
**Auth Required:** Yes

**Request Body:**

```json
{
  "name": "John Smith",
  "phone": "+1234567890"
}
```

**Response:** Updated user object

**Curl Example:**

```bash
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith"
  }'
```

---

### 3. Get User by ID (Admin Only)

**Endpoint:** `GET /users/:id`
**Auth Required:** Yes (ADMIN or SUPER_ADMIN role)

**Request:**

```bash
curl -X GET http://localhost:3000/api/v1/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### 4. Delete User (Admin Only - Soft Delete)

**Endpoint:** `DELETE /users/:id`
**Auth Required:** Yes (ADMIN or SUPER_ADMIN)

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:** `204 No Content`

---

## 💰 Wallet Management Routes

### 1. Create Wallet

**Endpoint:** `POST /wallets`
**Auth Required:** Yes

**Supported Currencies:**
`NGN, USD, EUR, GBP, KES, GHS, AUD, CAD, ZAR`

**Request Body:**

```json
{
  "name": "My Savings Account",
  "currency": "USD"
}
```

**Response:**

```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "My Savings Account",
  "currency": "USD",
  "balance": 0,
  "version": 0,
  "createdAt": "2026-01-31T10:00:00Z"
}
```

**Curl Example:**

```bash
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Savings Account",
    "currency": "USD"
  }'
```

---

### 2. Get All User Wallets

**Endpoint:** `GET /wallets`
**Auth Required:** Yes

**Request:**

```bash
curl -X GET http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**

```json
[
  {
    "id": "uuid",
    "name": "My Savings Account",
    "currency": "USD",
    "balance": 1000.5,
    "version": 5
  }
]
```

---

### 3. Get Specific Wallet

**Endpoint:** `GET /wallets/:id`
**Auth Required:** Yes

**Request:**

```bash
curl -X GET http://localhost:3000/api/v1/wallets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

### 4. Fund Wallet (Add Money)

**Endpoint:** `PATCH /wallets/:id/fund`
**Auth Required:** Yes

**Request Body:**

```json
{
  "amount": 1000.5,
  "reference": "FUND-001",
  "description": "Initial deposit",
  "metadata": {
    "source": "bank_transfer"
  }
}
```

**Response:**

```json
{
  "id": "uuid",
  "balance": 1000.5,
  "version": 1
}
```

**Curl Example:**

```bash
curl -X PATCH http://localhost:3000/api/v1/wallets/550e8400-e29b-41d4-a716-446655440000/fund \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000.50,
    "description": "Initial deposit"
  }'
```

---

### 5. Withdraw from Wallet (Remove Money)

**Endpoint:** `PATCH /wallets/:id/withdraw`
**Auth Required:** Yes

**Request Body:**

```json
{
  "amount": 100.0,
  "reference": "WITHDRAW-001",
  "description": "Cash withdrawal"
}
```

**Response:**

```json
{
  "id": "uuid",
  "balance": 900.5,
  "version": 2
}
```

**Curl Example:**

```bash
curl -X PATCH http://localhost:3000/api/v1/wallets/550e8400-e29b-41d4-a716-446655440000/withdraw \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.00,
    "description": "Cash withdrawal"
  }'
```

---

### 6. Get Wallet Transactions

**Endpoint:** `GET /wallets/:id/transactions`
**Auth Required:** Yes

**Query Parameters:**

- `type` (optional): `CREDIT` or `DEBIT`
- `limit` (optional): Default 50
- `offset` (optional): Default 0

**Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/wallets/550e8400-e29b-41d4-a716-446655440000/transactions?type=CREDIT&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**

```json
[
  {
    "id": "uuid",
    "walletId": "uuid",
    "type": "CREDIT",
    "amount": 1000.5,
    "balanceBefore": 0,
    "balanceAfter": 1000.5,
    "reference": "FUND-001",
    "description": "Initial deposit",
    "createdAt": "2026-01-31T10:00:00Z"
  }
]
```

---

### 7. Get Wallet Transaction Summary

**Endpoint:** `GET /wallets/:id/summary`
**Auth Required:** Yes

**Request:**

```bash
curl -X GET http://localhost:3000/api/v1/wallets/550e8400-e29b-41d4-a716-446655440000/summary \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**

```json
{
  "wallet": {
    "id": "uuid",
    "name": "My Savings Account",
    "currency": "USD",
    "balance": 1000.5,
    "version": 5
  },
  "summary": {
    "totalCredits": 5000.0,
    "totalDebits": 3999.5,
    "transactionCount": 15
  }
}
```

---

### 8. Transfer Between Wallets

**Endpoint:** `POST /wallets/:fromId/transfer/:toId`
**Auth Required:** Yes

**Request Body:**

```json
{
  "amount": 250.0,
  "description": "Transfer to friend"
}
```

**Response:**

```json
{
  "fromWallet": { "id": "uuid", "balance": 750.5, "version": 3 },
  "toWallet": { "id": "uuid", "balance": 2250.0, "version": 2 }
}
```

---

### 9. Delete Wallet (Soft Delete)

**Endpoint:** `DELETE /wallets/:id`
**Auth Required:** Yes

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/wallets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:** `204 No Content`

---

## 💹 Exchange Rates Routes

### 1. Get Exchange Rates

**Endpoint:** `GET /rates`
**Auth Required:** No (Public)

**Query Parameters:**

- `base` (optional): Base currency code (default: NGN)

**Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/rates?base=USD"
```

**Response:**

```json
{
  "base": "USD",
  "rates": {
    "NGN": 1234.5,
    "EUR": 0.92,
    "GBP": 0.79,
    "KES": 130.5,
    "GHS": 12.8,
    "AUD": 1.52,
    "CAD": 1.36,
    "ZAR": 18.92
  }
}
```

---

### 2. Get Supported Currencies

**Endpoint:** `GET /rates/currencies`
**Auth Required:** No (Public)

**Request:**

```bash
curl -X GET http://localhost:3000/api/v1/rates/currencies
```

**Response:**

```json
{
  "currencies": ["NGN", "USD", "EUR", "GBP", "KES", "GHS", "AUD", "CAD", "ZAR"]
}
```

---

### 3. Convert Currency

**Endpoint:** `GET /rates/convert`
**Auth Required:** Yes

**Query Parameters:**

- `amount` (required): Amount to convert
- `from` (required): Source currency
- `to` (required): Target currency

**Request:**

```bash
curl -X GET "http://localhost:3000/api/v1/rates/convert?amount=100&from=USD&to=NGN" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Response:**

```json
{
  "amount": 100,
  "from": "USD",
  "to": "NGN",
  "convertedAmount": 123450,
  "rate": 1234.5
}
```

---

## 🔑 How to Get Required Credentials

### 1. HIBP API Key (Password Breach Check)

**Purpose:** Check if user's password appears in known breach databases

**Steps:**

1. Go to https://haveibeenpwned.com/API/Key
2. Sign up or login
3. Create an API key (free tier available)
4. Add to `.env`:
   ```
   HIBP_API_KEY="your-api-key"
   ```

**Note:** Leave empty to skip breach check (optional)

---

### 2. Google OAuth Credentials

**Purpose:** Allow users to login with Google account

**Steps to Get Credentials:**

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com

2. **Create New Project:**
   - Click "Select a Project" → "New Project"
   - Name: "NSWallet"
   - Click "Create"

3. **Enable OAuth 2.0:**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Select "External" user type
   - Click "Create"
   - Fill in required fields:
     - App name: "NSWallet"
     - User support email: your-email@gmail.com
     - Developer contact: your-email@gmail.com
   - Click "Save and Continue"

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Web application"
   - Name: "NSWallet Web"
   - Add Authorized redirect URIs:
     ```
     http://localhost:3000/auth/google/callback
     http://localhost:3000/api/v1/auth/google/callback
     ```
     (For production, add your domain)
   - Click "Create"

5. **Copy Your Credentials:**

   ```
   GOOGLE_CLIENT_ID: Copy "Client ID"
   GOOGLE_CLIENT_SECRET: Copy "Client secret"
   GOOGLE_CALLBACK_URL: "http://localhost:3000/api/v1/auth/google/callback"
   ```

6. **Add to `.env`:**
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/google/callback"
   ```

---

## 🗄️ Generate JWT Secrets

**Purpose:** Sign and verify JWT tokens

**One-time setup (run once):**

```bash
# Generate for JWT_ACCESS_SECRET
openssl rand -base64 64

# Generate for JWT_REFRESH_SECRET
openssl rand -base64 64

# Generate for COOKIE_SECRET
openssl rand -base64 64
```

**Add to `.env`:**

```env
JWT_ACCESS_SECRET="generated-base64-string-here"
JWT_REFRESH_SECRET="generated-base64-string-here"
COOKIE_SECRET="generated-base64-string-here"
```

---

## 🔄 Exchange Rates API

**Purpose:** Get real-time currency exchange rates

**Recommended Options:**

### Option 1: ExchangeRate-API (Recommended - Free tier available)

- Website: https://www.exchangerate-api.com
- Sign up for free account
- Get API key from dashboard
- Add to `.env`:
  ```env
  RATES_API_URL="https://api.exchangerate-api.com/v4/latest"
  RATES_API_KEY="" # Not needed for free tier
  ```

### Option 2: OpenExchangeRates

- Website: https://openexchangerates.org
- Free tier: 1000 requests/month
- Add to `.env`:
  ```env
  RATES_API_URL="https://openexchangerates.org/api/latest.json"
  RATES_API_KEY="your-api-key"
  ```

---

## 📊 Complete `.env` Template

```bash
# ============================================
# NSWallet Environment Configuration
# ============================================

# DATABASE
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nswallet_dev?schema=public"
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/nswallet_test?schema=public"

# JWT
JWT_ACCESS_SECRET="your-base64-encoded-secret-min-64-chars"
JWT_REFRESH_SECRET="your-base64-encoded-secret-min-64-chars"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# GOOGLE OAUTH
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/google/callback"

# APPLICATION
NODE_ENV="development"
PORT=3000
API_PREFIX="api/v1"
FRONTEND_URL="http://localhost:3001"
CORS_ORIGINS="http://localhost:3001,http://localhost:3000"

# RATE LIMITING
THROTTLE_TTL=60
THROTTLE_LIMIT=100
AUTH_THROTTLE_TTL=60
AUTH_THROTTLE_LIMIT=5

# EXCHANGE RATES
RATES_API_URL="https://api.exchangerate-api.com/v4/latest"
RATES_API_KEY=""
RATES_CACHE_TTL=60

# SECURITY
COOKIE_SECRET="your-base64-encoded-secret-min-64-chars"
COOKIE_DOMAIN="localhost"
COOKIE_SECURE=false
LOCKOUT_THRESHOLD=5
LOCKOUT_DURATION_MINUTES=15

# HIBP PASSWORD CHECK
HIBP_API_KEY="" # Optional - get from https://haveibeenpwned.com/API/Key

# EMAIL (Optional)
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@nswallet.com"

# LOGGING
LOG_LEVEL="debug"
```

---

## 🧪 Testing Workflow

### Step 1: Setup Database

```bash
npm run db:migrate
npm run db:seed # Optional - creates test users
```

### Step 2: Start Server

```bash
npm run start:dev
```

### Step 3: Test Registration

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!@",
    "name": "Test User"
  }'
```

### Step 4: Login and Get Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!@"
  }'
```

### Step 5: Create Wallet (Use token from Step 4)

```bash
curl -X POST http://localhost:3000/api/v1/wallets \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Wallet",
    "currency": "USD"
  }'
```

### Step 6: Fund Wallet

```bash
curl -X PATCH http://localhost:3000/api/v1/wallets/WALLET_ID/fund \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "description": "Test funding"
  }'
```

---

## ✅ Password Requirements

- **Minimum length:** 12 characters
- **Must include:**
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&\*()\_+-=[]{}';:"\\|,.<>/?)

**Example Valid Passwords:**

- `MySecurePass123!`
- `Wallet@2026Secure99`
- `P@ssw0rd.Banking`

---

## 🔒 Security Features

- ✅ Password hashing with Argon2
- ✅ JWT token-based authentication
- ✅ Account lockout after failed attempts
- ✅ Soft deletes (data never permanently removed)
- ✅ Audit trail for all operations
- ✅ Rate limiting on auth endpoints
- ✅ CORS protection
- ✅ HIBP breach checking (optional)
- ✅ Optimistic locking for concurrent operations

---

## 🐛 Common Issues & Solutions

### Issue: "PrismaClientConstructorValidationError"

**Solution:** Ensure Prisma 6.6.0 is installed and database URL is in `.env`

### Issue: "Invalid currency"

**Solution:** Use 3-letter ISO codes: USD, NGN, EUR, GBP, etc.

### Issue: "Insufficient balance"

**Solution:** Fund wallet first before withdrawing

### Issue: "Account locked"

**Solution:** Wait 15+ minutes (or use password reset if configured)

---

## 📞 Support

For issues or questions, check the README.md or SETUP.md files
