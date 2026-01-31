#!/bin/bash
# NSWallet - Complete Setup Script
# Runs all necessary setup steps in order

set -e

echo "🚀 NSWallet Complete Setup"
echo "=========================="
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi
echo ""

# Step 2: Generate Prisma Client
echo "🔧 Step 2: Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Step 3: Run migrations
echo "🗄️  Step 3: Running database migrations..."
echo "This will create all tables in your database"
npx prisma migrate dev --name init
echo "✅ Migrations completed"
echo ""

# Step 4: Seed database
echo "🌱 Step 4: Seeding database with test data..."
npm run db:seed
echo "✅ Database seeded"
echo ""

# Step 5: Build application
echo "🔨 Step 5: Building application..."
npm run build
echo "✅ Build completed"
echo ""

echo "=========================="
echo "✅ Setup Complete!"
echo "=========================="
echo ""
echo "Test accounts created:"
echo "  📧 admin@nswallet.com / Admin123!"
echo "  📧 user@nswallet.com / User123!"
echo ""
echo "To start the server:"
echo "  npm run start:dev"
echo ""
echo "Server will be available at:"
echo "  http://localhost:3000"
echo ""
