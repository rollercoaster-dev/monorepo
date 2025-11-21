#!/bin/bash

# Local Development Setup Script
# This script sets up the development environment to connect to a local OpenBadges server

echo "🚀 Starting local development setup..."

# Load environment variables
if [ -f .env ]; then
    echo "📁 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  No .env file found, using defaults"
fi

# Get OpenBadges server URL from environment
OPENBADGES_URL=${OPENBADGES_SERVER_URL:-http://localhost:3000}

# Check if local OpenBadges server is running
echo "🔍 Checking if OpenBadges server is running at $OPENBADGES_URL..."
if curl -s -f -m 5 "$OPENBADGES_URL" > /dev/null 2>&1; then
    echo "✅ OpenBadges server is running at $OPENBADGES_URL"
else
    echo "❌ OpenBadges server is not running at $OPENBADGES_URL"
    echo "Please start the OpenBadges server first:"
    echo "  cd ../openbadges-modular-server"
    echo "  bun dev"
    exit 1
fi

# Start the development servers
echo "🏃 Starting development servers..."
pnpm dev

echo "🎉 Local development setup complete!"
echo "Frontend: http://localhost:${VITE_PORT:-7777}"
echo "Backend: http://localhost:${PORT:-8888}"
echo "OpenBadges: $OPENBADGES_URL"