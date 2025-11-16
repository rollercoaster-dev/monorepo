FROM --platform=$BUILDPLATFORM oven/bun:1 AS builder

# Add build arguments for architecture-specific optimizations
ARG BUILDPLATFORM
ARG TARGETPLATFORM
ARG TARGETARCH

# Print build information for debugging
RUN echo "Building on $BUILDPLATFORM for $TARGETPLATFORM ($TARGETARCH)"

WORKDIR /build

# Install system dependencies for better-sqlite3
# Use architecture-specific optimizations where possible
RUN apt-get update && \
    apt-get install -y libsqlite3-dev python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy monorepo root package files for workspace resolution
COPY package.json bun.lock* ./

# Copy workspace packages that this app depends on
COPY packages/rd-logger ./packages/rd-logger
COPY packages/openbadges-types ./packages/openbadges-types

# Copy the application package
COPY apps/openbadges-modular-server ./apps/openbadges-modular-server

# Install all dependencies (workspace protocol will resolve correctly)
RUN bun install

# Build workspace dependencies first
WORKDIR /build/packages/rd-logger
RUN bun run build

WORKDIR /build/packages/openbadges-types
RUN bun run build

# Now build the application
WORKDIR /build/apps/openbadges-modular-server
RUN bun run build && \
    bun run build:migrations

# Production image
FROM oven/bun:1-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y libsqlite3-0 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built application from builder
COPY --from=builder /build/apps/openbadges-modular-server/node_modules ./node_modules
COPY --from=builder /build/apps/openbadges-modular-server/package.json ./package.json
COPY --from=builder /build/apps/openbadges-modular-server/dist ./dist
COPY --from=builder /build/apps/openbadges-modular-server/drizzle ./drizzle

# Copy workspace dependencies (built packages)
COPY --from=builder /build/packages/rd-logger/dist ./node_modules/@rollercoaster-dev/rd-logger/dist
COPY --from=builder /build/packages/openbadges-types/dist ./node_modules/openbadges-types/dist

# Copy scripts from app directory
COPY --from=builder /build/apps/openbadges-modular-server/docker/scripts/health-check.sh /app/health-check.sh
RUN chmod +x /app/health-check.sh

# Create data directory for SQLite
RUN mkdir -p /data && chmod 777 /data

# Expose the port the app runs on
EXPOSE 3000

# Create a script to run migrations and start the app
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# Function to log with timestamp\n\
log() {\n\
    echo "$(date -Iseconds) [CONTAINER] $1"\n\
}\n\
\n\
# Function to handle errors\n\
handle_error() {\n\
    log "ERROR: $1"\n\
    log "Container startup failed. Check logs above for details."\n\
    exit 1\n\
}\n\
\n\
log "Starting OpenBadges container..."\n\
log "Environment: NODE_ENV=${NODE_ENV:-development}"\n\
log "Database type: ${DB_TYPE:-sqlite}"\n\
log "Port: ${PORT:-3000}"\n\
\n\
# Check if required files exist\n\
if [ ! -f "/app/dist/migrations/run.js" ]; then\n\
    handle_error "Migration file not found: /app/dist/migrations/run.js"\n\
fi\n\
\n\
if [ ! -f "/app/dist/index.js" ]; then\n\
    handle_error "Application file not found: /app/dist/index.js"\n\
fi\n\
\n\
log "Running database migrations..."\n\
if ! bun run dist/migrations/run.js; then\n\
    handle_error "Database migration failed"\n\
fi\n\
\n\
log "Migrations completed successfully"\n\
log "Starting application server..."\n\
exec bun run dist/index.js' > /app/start.sh && chmod +x /app/start.sh

# Set health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 CMD ["/app/health-check.sh"]

# Command to run the application
CMD ["/app/start.sh"]
