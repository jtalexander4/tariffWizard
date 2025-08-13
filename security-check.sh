#!/bin/bash

# Security audit script for Tariff Wizard
echo "🔍 Scanning for potential security issues..."

echo "Checking for MongoDB connection strings with credentials..."
grep -r "mongodb+srv://[^:]*:[^@]*@" . --exclude-dir=node_modules --exclude=security-check.sh || echo "✅ No hardcoded MongoDB credentials found"

echo "Checking for API keys in code..."
grep -r "API_KEY.*=" . --exclude-dir=node_modules --exclude=".env.example" --exclude="security-check.sh" | grep -v "process.env" | grep -v "your_.*_key" || echo "✅ No hardcoded API keys found"

echo "Checking for password fields..."
grep -r "password.*=" . --exclude-dir=node_modules --exclude=".env.example" --exclude="security-check.sh" | grep -v "process.env" || echo "✅ No hardcoded passwords found"

echo "Checking for JWT secrets..."
grep -r "JWT_SECRET.*=" . --exclude-dir=node_modules --exclude=".env.example" --exclude="security-check.sh" | grep -v "process.env" | grep -v "your_.*_secret" || echo "✅ No hardcoded JWT secrets found"

echo "Checking .env files are gitignored..."
if git check-ignore server/.env >/dev/null 2>&1; then
    echo "✅ .env files are properly gitignored"
else
    echo "⚠️  WARNING: .env files may not be properly gitignored"
fi

echo "🎉 Security audit complete!"
