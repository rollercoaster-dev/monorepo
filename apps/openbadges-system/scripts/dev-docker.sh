#!/bin/bash

# Docker Development Setup Script
# This script sets up the development environment to connect to a Docker OpenBadges server

echo "🐳 Starting Docker development setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if OpenBadges server container is running
echo "🔍 Checking if OpenBadges server container is running..."
if docker ps | grep -q "openbadges_modular_server"; then
    echo "✅ OpenBadges server container is running"
else
    echo "❌ OpenBadges server container is not running"
    echo "Starting OpenBadges server container..."
    docker-compose up -d
    echo "⏳ Waiting for server to start..."
    sleep 5
fi

# Test connection to OpenBadges server
echo "🔍 Testing connection to OpenBadges server..."
if curl -s -f -m 5 http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ OpenBadges server is responding on port 3000"
else
    echo "❌ OpenBadges server is not responding on port 3000"
    echo "Please check Docker logs: docker logs openbadges_modular_server"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    echo "📁 Loading environment variables..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ No .env file found"
    exit 1
fi

# Start the development servers
echo "🏃 Starting development servers..."
pnpm dev

echo "🎉 Docker development setup complete!"
echo "Frontend: http://localhost:7777"
echo "Backend: http://localhost:8888"
echo "OpenBadges: http://localhost:3000"
