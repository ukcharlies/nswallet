# NSWallet - Secure Wallet System

A banking-grade wallet system built with NestJS, TypeScript, Prisma, and PostgreSQL.

## Features

### 🔐 Authentication & Security

- **Local authentication** (email/password with Argon2 hashing)
- **Google OAuth 2.0** integration
- **JWT access tokens** (short-lived, 15 minutes)
- **Refresh tokens** (long-lived, stored in DB with rotation)
- **Password policy enforcement** (min 12 chars, uppercase, lowercase, number, symbol)
- **HIBP integration** (Have I Been Pwned password breach check)
- **Account lockout** (progressive lockout after failed attempts)
- **HTTP-only secure cookies** for refresh tokens

### 💰 Wallet Operations

- Create multiple wallets per user
- Support for multiple currencies (ISO 4217)
- Fund wallet (credit)
- Withdraw from wallet (debit with insufficient funds check)
- View wallet balance and details
- Transaction history with full audit trail
- Soft delete (data preservation)

### 🔒 Concurrency Control

- **Optimistic locking** via version field
- Automatic retry on conflict (up to 3 attempts)
- Fallback to **pessimistic locking** (FOR UPDATE) for extreme concurrency
- Atomic transactions using Prisma's `$transaction`

### 📊 Exchange Rates

- Fetch rates from external provider
- Caching with configurable TTL (default 60s)
- Support for NGN, USD, EUR, GBP, KES, GHS, AUD, CAD

### 📝 Audit Trail

- Complete audit logging for all operations
- Captures: who, what, when, IP address, user agent
- JSON diff for update operations
- Immutable audit records

### 🛡️ Security Middleware

- Helmet (security headers)
- CORS with allowlist
- Rate limiting (configurable tiers)
- Input validation (class-validator)
- Global exception filter

## Tech Stack

- **Framework**: NestJS 11+
- **Language**: TypeScript 5
- **ORM**: Prisma 7+
- **Database**: PostgreSQL
- **Auth**: Passport.js (JWT, Local, Google OAuth)
- **Password Hashing**: Argon2
- **Testing**: Jest, Supertest
- **HTTP Client**: Axios

## Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── dto/             # DTOs for auth endpoints
│   ├── strategies/      # Passport strategies
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── audit/               # Audit logging module
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── filters/         # Exception filters
│   ├── guards/          # Auth guards
│   ├── interceptors/    # Audit interceptor
│   └── utils/           # Crypto, password utils
├── prisma/              # Database module
├── rates/               # Exchange rates module
├── users/               # User management module
├── wallets/             # Wallet & transactions module
│   ├── dto/             # DTOs
│   ├── wallets.controller.ts
│   ├── wallets.service.ts
│   └── transactions.service.ts
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Seed script
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nswallet

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Required: DATABASE_URL, JWT secrets, etc.
```

### Environment Variables

Create a `.env` file with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nswallet?schema=public"

# Server
PORT=3000
NODE_ENV=development

# JWT Secrets (generate with: openssl rand -base64 64)
JWT_ACCESS_SECRET="your-access-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Cookie Secret
COOKIE_SECRET="your-cookie-secret-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/google/callback"

# Exchange Rates API
RATES_API_URL="https://api.exchangerate-api.com/v4/latest"
RATES_CACHE_TTL=60

# Security
LOCKOUT_THRESHOLD=5
LOCKOUT_DURATION_MINUTES=15
CORS_ORIGINS="http://localhost:3000,http://localhost:4200"

# HIBP (optional - for password breach checking)
HIBP_API_KEY=""
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed the database (optional - creates test users)
npx prisma db seed
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3000/api/v1`

## API Endpoints

### Health Check

```
GET /api/v1/health
```

### Authentication

```
POST /api/v1/auth/register    # Register new user
POST /api/v1/auth/login       # Login with email/password
POST /api/v1/auth/refresh     # Refresh access token
POST /api/v1/auth/logout      # Logout (revoke refresh token)
POST /api/v1/auth/logout-all  # Logout from all devices
GET  /api/v1/auth/google      # Initiate Google OAuth
GET  /api/v1/auth/google/callback  # Google OAuth callback
```

### Users

```
GET   /api/v1/users/me        # Get current user profile
PATCH /api/v1/users/me        # Update current user profile
```

### Wallets

```
POST   /api/v1/wallets              # Create wallet
GET    /api/v1/wallets              # List user's wallets
GET    /api/v1/wallets/:id          # Get wallet details
PATCH  /api/v1/wallets/:id/fund     # Fund wallet
PATCH  /api/v1/wallets/:id/withdraw # Withdraw from wallet
DELETE /api/v1/wallets/:id          # Delete wallet (soft delete)
GET    /api/v1/wallets/:id/transactions  # Get wallet transactions
GET    /api/v1/wallets/:id/summary  # Get wallet summary
```

### Exchange Rates

```
GET /api/v1/rates?base=NGN     # Get exchange rates
GET /api/v1/rates/currencies   # List supported currencies
GET /api/v1/rates/convert?amount=100&from=USD&to=NGN  # Convert amount
```

## Testing

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires test database)
npm run test:e2e

# Watch mode
npm run test:watch
```

### Test Database Setup

For E2E tests, create a separate database:

```env
# .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/nswallet_test?schema=public"
```

### Test Users (after seeding)

| Email              | Password          | Role        |
| ------------------ | ----------------- | ----------- |
| admin@nswallet.com | AdminPassword123! | ADMIN, USER |
| user@nswallet.com  | UserPassword123!  | USER        |

## Security Notes

### Password Policy

- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Optional HIBP breach check

### Token Security

- **Access tokens**: Short-lived (15 min), stateless JWT
- **Refresh tokens**: Long-lived (7 days), stored as SHA-256 hash
- **Token rotation**: Old token invalidated on refresh
- **Reuse detection**: All tokens revoked if reuse detected

### Concurrency Control

Optimistic locking prevents lost updates:

```typescript
// Update only succeeds if version matches
const updated = await tx.wallet.updateMany({
  where: { id: walletId, version: currentVersion },
  data: {
    balance: newBalance,
    version: { increment: 1 },
  },
});

if (updated.count === 0) {
  // Concurrent modification - retry up to 3 times
}
```

### Rate Limiting

Default limits (configurable):

- 100 requests per minute per IP
- Authentication endpoints: 10 requests per minute

## Production Checklist

- [ ] Set strong JWT secrets (use `openssl rand -base64 64`)
- [ ] Configure CORS origins properly
- [ ] Enable HIBP password checking
- [ ] Set up Google OAuth credentials
- [ ] Configure database connection pooling
- [ ] Set up proper logging aggregation
- [ ] Enable APM monitoring
- [ ] Configure database backups
- [ ] Set up SSL/TLS termination
- [ ] Review and adjust rate limits

## License

UNLICENSED - Private project
