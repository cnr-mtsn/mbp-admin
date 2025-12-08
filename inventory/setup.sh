#!/bin/bash

# Paint Inventory System - Setup Script
# This script helps you set up the application quickly

set -e  # Exit on any error

echo "🎨 Paint Inventory System - Setup Script"
echo "=========================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher (you have: $(node -v))"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found in PATH"
    echo "Please ensure PostgreSQL is installed and running"
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ PostgreSQL found"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Backend setup
echo "Setting up backend..."
cd backend

if [ ! -f "package.json" ]; then
    echo "❌ backend/package.json not found!"
    exit 1
fi

npm install
echo "✅ Backend dependencies installed"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating backend .env file..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your database credentials"
    echo ""
    echo "Press Enter to open .env in your default editor..."
    read -r
    ${EDITOR:-nano} .env
fi

cd ..

# Frontend setup
echo ""
echo "Setting up frontend..."
cd frontend

if [ ! -f "package.json" ]; then
    echo "❌ frontend/package.json not found!"
    exit 1
fi

npm install
echo "✅ Frontend dependencies installed"

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating frontend .env file..."
    cp .env.example .env
    echo "✅ Frontend .env created (using defaults)"
fi

cd ..

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo ""
echo "1. Make sure PostgreSQL is running"
echo "2. Create a database: createdb matson_bros"
echo "3. Update backend/.env with your database credentials"
echo "4. Run database migration:"
echo "   cd backend && npm run migrate"
echo ""
echo "5. Start the backend (in one terminal):"
echo "   cd backend && npm run dev"
echo ""
echo "6. Start the frontend (in another terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "7. Open http://localhost:5173 in your browser"
echo "   Login: admin / admin123"
echo ""
echo "For detailed instructions, see QUICKSTART.md"
echo ""
