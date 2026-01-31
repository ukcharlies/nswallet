#!/bin/bash
# NSWallet - Comprehensive Setup & Health Check Script
# This script checks all dependencies and configurations

set -e  # Exit on error

echo "🔍 NSWallet Health Check & Setup"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "1️⃣  Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi

# Check npm
echo ""
echo "2️⃣  Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Check if node_modules exists
echo ""
echo "3️⃣  Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules directory exists${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules not found. Running npm install...${NC}"
    npm install
fi

# Check .env file
echo ""
echo "4️⃣  Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check critical env vars
    if grep -q "DATABASE_URL" .env && grep -q "JWT_ACCESS_SECRET" .env; then
        echo -e "${GREEN}✅ Critical environment variables present${NC}"
    else
        echo -e "${YELLOW}⚠️  Some environment variables may be missing${NC}"
    fi
else
    echo -e "${RED}❌ .env file missing${NC}"
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your configuration${NC}"
fi

# Check Prisma
echo ""
echo "5️⃣  Checking Prisma..."
if [ -d "node_modules/.prisma/client" ]; then
    echo -e "${GREEN}✅ Prisma client generated${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma client not generated. Running prisma generate...${NC}"
    npx prisma generate
fi

# Check database connection
echo ""
echo "6️⃣  Checking database connection..."
if npx prisma db execute --stdin <<< "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo -e "${YELLOW}Please check your DATABASE_URL in .env${NC}"
    echo -e "${YELLOW}Make sure PostgreSQL is running${NC}"
fi

# Check migrations
echo ""
echo "7️⃣  Checking database migrations..."
MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || echo "error")
if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    echo -e "${GREEN}✅ Database schema is up to date${NC}"
elif echo "$MIGRATION_STATUS" | grep -q "pending migrations"; then
    echo -e "${YELLOW}⚠️  Pending migrations detected${NC}"
    echo -e "${YELLOW}Run: npm run db:migrate${NC}"
else
    echo -e "${YELLOW}⚠️  No migrations applied yet${NC}"
    echo -e "${YELLOW}Run: npm run db:migrate${NC}"
fi

# Try TypeScript compilation
echo ""
echo "8️⃣  Checking TypeScript compilation..."
if npm run build &> /tmp/nswallet-build.log; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    echo -e "${YELLOW}Showing last 20 lines of build log:${NC}"
    tail -20 /tmp/nswallet-build.log
fi

# Summary
echo ""
echo "=================================="
echo "📊 Setup Check Complete"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. If database is not connected, check .env DATABASE_URL"
echo "2. If migrations pending: npm run db:migrate"
echo "3. To seed test data: npm run db:seed"
echo "4. To start dev server: npm run start:dev"
echo "5. To open Prisma Studio: npm run db:studio"
echo ""
