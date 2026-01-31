# Postman Authentication Flow Guide

## 🔑 Understanding Token Management in Postman

Your NSWallet backend uses **two separate tokens**:

### 1. **Access Token** (Short-lived: 15 minutes)
- **Purpose**: Authenticate API requests (attach to Authorization header)
- **Where to get**: Returned in response body from `login` or `register`
- **How to use**: Add to Postman variable or header: `Authorization: Bearer <token>`

### 2. **Refresh Token** (Long-lived: 7 days)
- **Purpose**: Get a new access token when it expires
- **Where to get**: Set automatically in HttpOnly cookie from login response
- **How to use**: Automatically sent by browser/Postman in cookie

---

## ⚙️ Postman Setup for NSWallet

### Step 1: Create Environment Variables

1. Click **Environments** (left sidebar)
2. Click **Create New** environment
3. Add these variables:
   ```
   Variable Name: base_url
   Initial Value: http://localhost:3000/api/v1
   Current Value: http://localhost:3000/api/v1

   Variable Name: access_token
   Initial Value: (leave empty)
   Current Value: (leave empty)

   Variable Name: wallet_id
   Initial Value: (leave empty)
   Current Value: (leave empty)
   ```
4. Click **Save**

### Step 2: Enable Cookie Handling

1. Click **Settings** (gear icon, top right)
2. Scroll to **Cookies**
3. Make sure you're in the right domain: `localhost`
4. Verify cookies are being captured (refresh token should appear here after login)

---

## 🚀 Complete Authentication Flow in Postman

### **Part 1: Register New User**

**Request:**
- URL: `POST {{base_url}}/auth/register`
- Headers:
  ```
  Content-Type: application/json
  ```
- Body (raw JSON):
  ```json
  {
    "email": "testuser@example.com",
    "password": "MySecurePass123!@",
    "name": "Test User"
  }
  ```

**After sending:**
- ✅ Response: 201 Created with user data + `accessToken`
- 📋 **Action**: Copy the `accessToken` value
- 📌 Paste into Postman environment variable `access_token`

**Steps to Save Access Token:**
1. In response body, find `"accessToken": "eyJ..."`
2. Triple-click to select the token value (just the value, not the quotes)
3. Copy it
4. Click **Environments** (left sidebar)
5. Click your environment name
6. Find the `access_token` variable
7. Paste into **Current Value** field
8. Click **Save** (Ctrl+S or Cmd+S)

---

### **Part 2: Login (Alternative to Register)**

If you already have a user account:

**Request:**
- URL: `POST {{base_url}}/auth/login`
- Headers:
  ```
  Content-Type: application/json
  ```
- Body (raw JSON):
  ```json
  {
    "email": "testuser@example.com",
    "password": "MySecurePass123!@"
  }
  ```

**After sending:**
- ✅ Response: 200 OK with `accessToken`
- 🍪 Cookie `refreshToken` automatically captured by Postman
- 📌 **Action**: Save `accessToken` to environment variable (same as Part 1)

---

### **Part 3: Use Access Token for Protected Endpoints**

Now that you have the access token saved, use it for any protected endpoint.

**Example: Get User Profile**

**Request:**
- URL: `GET {{base_url}}/users/me`
- Headers:
  ```
  Authorization: Bearer {{access_token}}
  ```

**Why it works:**
- Postman replaces `{{access_token}}` with the value you saved
- Header becomes: `Authorization: Bearer eyJ...`
- Server verifies token and allows access ✅

---

### **Part 4: Create a Wallet**

**Request:**
- URL: `POST {{base_url}}/wallets`
- Headers:
  ```
  Content-Type: application/json
  Authorization: Bearer {{access_token}}
  ```
- Body (raw JSON):
  ```json
  {
    "name": "My Savings",
    "currency": "USD"
  }
  ```

**After sending:**
- ✅ Response: 201 Created with wallet data + `id`
- 📌 **Action**: Save the wallet `id` to `wallet_id` environment variable

**Steps to Save Wallet ID:**
1. Copy the `id` from response
2. Click **Environments** (left sidebar)
3. Find the `wallet_id` variable
4. Paste into **Current Value** field
5. Click **Save**

---

### **Part 5: Fund Your Wallet**

**Request:**
- URL: `PATCH {{base_url}}/wallets/{{wallet_id}}/fund`
- Headers:
  ```
  Content-Type: application/json
  Authorization: Bearer {{access_token}}
  ```
- Body (raw JSON):
  ```json
  {
    "amount": 1000.50,
    "description": "Initial deposit"
  }
  ```

**Response:** Wallet updated with new balance ✅

---

### **Part 6: Logout (THE ISSUE YOU HAD)**

**Request:**
- URL: `POST {{base_url}}/auth/logout`
- Headers:
  ```
  Authorization: Bearer {{access_token}}
  ```
- Body: `{}` (empty JSON object)

**Why this works:**
- You send the access token in Authorization header
- The `@UseGuards(JwtAuthGuard)` validates the token
- If valid, the endpoint revokes the refresh token and clears the cookie
- ✅ Response: 200 OK with `{ "message": "Logged out successfully" }`

**If you get 401 error:**
- ❌ You forgot the `Authorization: Bearer {{access_token}}` header
- ❌ The access token is missing/invalid/expired
- **Fix**: Re-login to get a fresh access token

---

### **Part 7: Refresh Token (When Access Token Expires)**

Access tokens expire after 15 minutes. When that happens:

**Request:**
- URL: `POST {{base_url}}/auth/refresh`
- Headers:
  ```
  Content-Type: application/json
  ```
- Body: `{}` (empty)

**Why it works:**
- Postman automatically includes the `refreshToken` cookie (captured during login)
- Server validates the refresh token from cookie
- Returns a new `accessToken`
- Cookie is automatically renewed

**After sending:**
- ✅ Response: 200 OK with new `accessToken`
- 📌 **Action**: Update your `access_token` variable with the new token

---

## 🔍 Debugging Tips

### **Problem: "401 Authentication required"**

**Checklist:**
- [ ] Do you have `Authorization: Bearer {{access_token}}` header?
- [ ] Did you save the access token to the environment variable?
- [ ] Is the token not expired? (15-minute expiry)
- [ ] Is your Postman environment active? (Check top-right dropdown)

**Solution:**
1. Get a fresh access token by logging in again
2. Save it to the `access_token` variable
3. Make sure the header includes the token

---

### **Problem: "Refresh token is required" on /auth/refresh**

**Checklist:**
- [ ] Did you login first? (to get the cookie)
- [ ] Are cookies enabled in Postman Settings?
- [ ] Is the refresh token cookie still valid?

**Solution:**
1. Go back and login again
2. This will set a fresh `refreshToken` cookie
3. Then try refresh again

---

### **Problem: Access token not being saved in variable**

**Manual save process:**
1. Login and get response
2. Find `"accessToken": "eyJ..."`
3. Copy just the token value (NOT the quotes or comma)
4. Right-click **Environments** (left sidebar)
5. Click your environment
6. Manually paste into `access_token` → **Current Value** field
7. Click **Save**

---

## 📝 Complete Test Sequence

Run these in order:

1. **Register** → Copy `accessToken` to variable
2. **Get Profile** (`GET /users/me`) → Should work ✅
3. **Create Wallet** → Copy `id` to wallet_id variable
4. **Fund Wallet** → Deposit 1000 USD
5. **Get Wallet Summary** → Verify balance
6. **Logout** → Clean termination
7. **Try Get Profile Again** → Should fail (401) because logged out

---

## 🎯 Quick Reference: Headers by Endpoint

### **Public Endpoints** (No auth needed)
```
POST /auth/register
POST /auth/login
POST /auth/refresh
GET /rates
GET /rates/currencies
```

### **Protected Endpoints** (Auth required)
```
Headers MUST include:
Authorization: Bearer {{access_token}}

Endpoints:
POST /auth/logout
POST /auth/logout-all
GET /users/me
PATCH /users/me
GET /wallets
POST /wallets
GET /wallets/:id
PATCH /wallets/:id/fund
PATCH /wallets/:id/withdraw
GET /wallets/:id/transactions
GET /wallets/:id/summary
POST /wallets/:fromId/transfer/:toId
DELETE /wallets/:id
GET /rates/convert
```

---

## ✅ Success Indicators

After login, you should see:

**Response Headers (Login):**
```
Set-Cookie: refreshToken=c7193632b085...; Path=/api/v1/auth; HttpOnly; Expires=...
```

**Response Body (Login/Register):**
```json
{
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "15m"
}
```

**Postman Cookies:**
1. Click **Cookies** button (bottom of Postman window)
2. Should show: `refreshToken` for `localhost`

**Postman Variables:**
1. Click **Environments** → Your environment
2. Should show: `access_token` with a long token value

---

## 🚀 Now Test the Full Flow!

1. Open your NSWallet Postman collection
2. Go to **Authentication** folder
3. Run **Register** (or Login)
4. Save the access token to the variable
5. Test all protected endpoints
6. Logout to clean up

Everything should work now! 🎉
