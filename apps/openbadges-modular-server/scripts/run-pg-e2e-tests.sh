#!/bin/bash

# This script runs E2E PostgreSQL tests with proper exit code handling.
# It ensures cleanup always runs while preserving the test exit code.
# Fixes: https://github.com/rollercoaster-dev/monorepo/issues/171

set -euo pipefail

cleanup() {
  echo "Stopping PostgreSQL test container..."
  bun run db:test:pg:stop
}
trap cleanup EXIT

echo "Setting up PostgreSQL E2E test environment..."
bun run test:e2e:pg:setup

echo "Running E2E PostgreSQL tests..."
bun run test:e2e:pg:run

# `cleanup` will run automatically; only log success here
echo "E2E PostgreSQL tests completed successfully."
