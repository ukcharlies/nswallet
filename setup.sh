#!/bin/bash

# NSWallet - Quick Setup Script
# This script helps you generate secrets and set up credentials

echo "╔════════════════════════════════════════════════════════╗"
echo "║         NSWallet Backend - Quick Setup Script          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ .env file not found!"
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ .env created. Please fill in the values below."
else
  echo "✅ .env file found"
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║              Generate JWT Secrets (Required)           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "🔐 Generating JWT_ACCESS_SECRET..."
JWT_ACCESS=$(openssl rand -base64 64)
echo "Generated: $JWT_ACCESS"
echo ""

echo "🔐 Generating JWT_REFRESH_SECRET..."
JWT_REFRESH=$(openssl rand -base64 64)
echo "Generated: $JWT_REFRESH"
echo ""

echo "🔐 Generating COOKIE_SECRET..."
COOKIE_SECRET=$(openssl rand -base64 64)
echo "Generated: $COOKIE_SECRET"
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║           Updating .env with Generated Secrets         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Update .env with generated secrets
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=\"$JWT_ACCESS\"|g" .env
  sed -i '' "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\"$JWT_REFRESH\"|g" .env
  sed -i '' "s|COOKIE_SECRET=.*|COOKIE_SECRET=\"$COOKIE_SECRET\"|g" .env
else
  # Linux
  sed -i "s|JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=\"$JWT_ACCESS\"|g" .env
  sed -i "s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=\"$JWT_REFRESH\"|g" .env
  sed -i "s|COOKIE_SECRET=.*|COOKIE_SECRET=\"$COOKIE_SECRET\"|g" .env
fi

echo "✅ JWT secrets updated in .env"
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║           Manual Steps Required (Do These Now)         ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "📋 Step 1: Update DATABASE_URL"
echo "   Edit .env and set your PostgreSQL connection string:"
echo "   DATABASE_URL=\"postgresql://user:pass@localhost:5432/nswallet_dev\""
echo ""

echo "📋 Step 2: Get Google OAuth Credentials"
echo "   1. Go to: https://console.cloud.google.com"
echo "   2. Create new project named 'NSWallet'"
echo "   3. Enable OAuth 2.0 API"
echo "   4. Create OAuth 2.0 credentials (Web application)"
echo "   5. Add redirect URI: http://localhost:3000/api/v1/auth/google/callback"
echo "   6. Copy Client ID and Secret to .env:"
echo "      GOOGLE_CLIENT_ID=\"your-id.apps.googleusercontent.com\""
echo "      GOOGLE_CLIENT_SECRET=\"your-secret\""
echo ""

echo "📋 Step 3: (Optional) Get HIBP API Key"
echo "   1. Go to: https://haveibeenpwned.com/API/Key"
echo "   2. Sign up and create API key"
echo "   3. Add to .env: HIBP_API_KEY=\"your-key\""
echo ""

echo "📋 Step 4: (Optional) Configure Exchange Rates API"
echo "   1. Go to: https://www.exchangerate-api.com"
echo "   2. Sign up for free account"
echo "   3. No API key needed for free tier"
echo "   4. RATES_API_URL is already set in .env"
echo ""

echo "╔════════════════════════════════════════════════════════╗"
echo "║         Next Steps: Run Database Setup                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "After updating .env with all values, run:"
echo ""
echo "   npm run db:migrate    # Create database schema"
echo "   npm run db:seed       # (Optional) Add test data"
echo "   npm run start:dev     # Start development server"
echo ""

echo "✅ Setup complete!"
echo ""
