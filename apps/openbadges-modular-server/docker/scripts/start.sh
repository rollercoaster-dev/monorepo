#!/bin/sh
set -e

# Function to log with timestamp
log() {
    echo "$(date -Iseconds) [CONTAINER] $1"
}

# Function to handle errors
handle_error() {
    log "ERROR: $1"
    log "Container startup failed. Check logs above for details."
    exit 1
}

log "Starting OpenBadges container..."
log "Environment: NODE_ENV=${NODE_ENV:-development}"
log "Database type: ${DB_TYPE:-sqlite}"
log "Port: ${PORT:-3000}"

# Check if required files exist
if [ ! -f "/app/dist/migrations/run.js" ]; then
    handle_error "Migration file not found: /app/dist/migrations/run.js"
fi

if [ ! -f "/app/dist/index.js" ]; then
    handle_error "Application file not found: /app/dist/index.js"
fi

log "Running database migrations..."
if ! bun run dist/migrations/run.js; then
    handle_error "Database migration failed"
fi

log "Migrations completed successfully"
log "Starting application server..."
exec bun run dist/index.js
