# Production Deployment Guide

This guide covers deploying openbadges-system to production environments.

## Production Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Production Environment                           │
│                                                                         │
│  ┌───────────────┐     ┌───────────────────────────────────────────┐   │
│  │  Load Balancer│     │           Hono Server (Bun)               │   │
│  │  (nginx/etc)  │────▶│  ┌─────────────────────────────────────┐  │   │
│  │               │     │  │  Static Files (dist/client)         │  │   │
│  └───────────────┘     │  │  /assets/*, /index.html             │  │   │
│                        │  ├─────────────────────────────────────┤  │   │
│                        │  │  API Routes (/api/*)                │  │   │
│                        │  │  JWKS Endpoint (/.well-known/jwks)  │  │   │
│                        │  └─────────────────────────────────────┘  │   │
│                        └──────────────────┬────────────────────────┘   │
│                                           │                             │
│         ┌─────────────────────────────────┼─────────────────────────┐  │
│         │                                 │                         │  │
│         ▼                                 ▼                         │  │
│  ┌─────────────────┐           ┌─────────────────────────┐         │  │
│  │   PostgreSQL    │           │   OpenBadges Server     │         │  │
│  │   Database      │           │   (Badge Storage)       │         │  │
│  └─────────────────┘           └─────────────────────────┘         │  │
│                                                                     │  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Build Process

### Building for Production

```bash
# From monorepo root
bun --filter openbadges-system run build

# Or from app directory
cd apps/openbadges-system
bun run build
```

This creates:

- `dist/client/` - Static frontend files
- `dist/server/` - Compiled server (optional, Bun runs TypeScript directly)

### Build Output

```
dist/
├── client/
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── ...
│   └── favicon.ico
└── server/
    └── index.js  (if pre-compiled)
```

### Build Optimization

The Vite build includes:

- Code splitting for routes
- Tree shaking for unused code
- Minification (JS + CSS)
- Asset hashing for cache busting

## Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=8888

# Database (PostgreSQL for production)
DB_TYPE=postgresql
DATABASE_URL=postgresql://user:password@host:5432/openbadges

# JWT Keys (RS256) - REQUIRED
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...
-----END PRIVATE KEY-----"

JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOC...
-----END PUBLIC KEY-----"

# OAuth (optional, for GitHub login)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=https://yourdomain.com/api/oauth/github/callback

# OpenBadges Server Integration
OPENBADGES_SERVER_URL=https://badges.yourdomain.com
OPENBADGES_AUTH_MODE=oauth
OPENBADGES_CLIENT_ID=your_client_id
OPENBADGES_CLIENT_SECRET=your_client_secret

# Security
CORS_ORIGIN=https://yourdomain.com
```

### Generating JWT Keys

```bash
# Generate RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Convert to single-line for environment variables
cat private.pem | tr '\n' '\\n'
cat public.pem | tr '\n' '\\n'
```

## Database Setup

### PostgreSQL Configuration

```bash
# Create database
createdb openbadges

# Or via psql
psql -U postgres
CREATE DATABASE openbadges;
CREATE USER openbadges_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE openbadges TO openbadges_user;
```

### Running Migrations

```bash
# Set database URL
export DATABASE_URL=postgresql://user:password@localhost:5432/openbadges

# Run migrations
bun run migrate
```

### Connection Pool Settings

For production PostgreSQL:

```typescript
// Recommended pool settings
new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
})
```

## Starting the Server

### Direct Bun Execution

```bash
# Production start
NODE_ENV=production bun run src/server/index.ts

# Or use the start script
bun run start
```

### Process Manager (PM2)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'openbadges-system',
      script: 'bun',
      args: 'run src/server/index.ts',
      cwd: '/path/to/apps/openbadges-system',
      env: {
        NODE_ENV: 'production',
        PORT: 8888,
      },
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
}
```

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs openbadges-system
```

### Systemd Service

```ini
# /etc/systemd/system/openbadges-system.service
[Unit]
Description=OpenBadges System
After=network.target postgresql.service

[Service]
Type=simple
User=openbadges
WorkingDirectory=/opt/openbadges-system
ExecStart=/usr/local/bin/bun run src/server/index.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8888
EnvironmentFile=/opt/openbadges-system/.env

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable openbadges-system
sudo systemctl start openbadges-system

# Check status
sudo systemctl status openbadges-system
```

## Reverse Proxy Setup

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/openbadges-system
upstream openbadges {
    server 127.0.0.1:8888;
    keepalive 64;
}

server {
    listen 80;
    server_name badges.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name badges.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/badges.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/badges.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Bun server
    location / {
        proxy_pass http://openbadges;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static asset caching
    location /assets/ {
        proxy_pass http://openbadges;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }

    # JWKS endpoint - allow caching
    location /.well-known/jwks.json {
        proxy_pass http://openbadges;
        proxy_cache_valid 200 1h;
    }
}
```

### Caddy Configuration

```caddyfile
badges.yourdomain.com {
    reverse_proxy localhost:8888 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
}
```

## Docker Deployment

### Dockerfile

```dockerfile
# Dockerfile
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY apps/openbadges-system/package.json ./apps/openbadges-system/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source
COPY apps/openbadges-system ./apps/openbadges-system

# Build frontend
WORKDIR /app/apps/openbadges-system
RUN bun run build

# Production image
FROM oven/bun:1-slim

WORKDIR /app

# Copy built assets and server
COPY --from=builder /app/apps/openbadges-system/dist ./dist
COPY --from=builder /app/apps/openbadges-system/src/server ./src/server
COPY --from=builder /app/apps/openbadges-system/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create data directory
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=8888

EXPOSE 8888

CMD ["bun", "run", "src/server/index.ts"]
```

### Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '8888:8888'
    environment:
      - NODE_ENV=production
      - DB_TYPE=postgresql
      - DATABASE_URL=postgresql://openbadges:password@db:5432/openbadges
    env_file:
      - .env.production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=openbadges
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=openbadges
    restart: unless-stopped

volumes:
  postgres_data:
```

## Security Considerations

### Environment Variables

- Never commit `.env` files with secrets
- Use secret management (Vault, AWS Secrets Manager, etc.)
- Rotate JWT keys periodically
- Use strong database passwords

### HTTPS/TLS

- Always use HTTPS in production
- Use Let's Encrypt for free certificates
- Configure strong cipher suites
- Enable HSTS

### JWT Security

```bash
# JWT best practices
- Use RS256 (asymmetric) not HS256
- Set reasonable expiration (24h recommended)
- Rotate keys periodically
- Never expose private key
```

### CORS Configuration

```typescript
// Restrict CORS to your domain
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // e.g., 'https://badges.yourdomain.com'
    credentials: true,
  })
)
```

### Rate Limiting

```typescript
// Add rate limiting for API endpoints
import { rateLimiter } from 'hono-rate-limiter'

app.use(
  '/api/*',
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // 100 requests per window
    message: { error: 'Too many requests' },
  })
)
```

## Monitoring

### Health Check Endpoint

```typescript
// Add health check endpoint
app.get('/health', c => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  })
})
```

### Logging

```typescript
// Structured logging for production
import { logger } from '@rollercoaster-dev/rd-logger'

const log = new Logger({
  level: process.env.LOG_LEVEL || 'info',
})

// Log requests
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const duration = Date.now() - start

  log.info('Request completed', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  })
})
```

### Metrics

Consider adding:

- Request count and latency
- Database query performance
- Error rates
- Memory usage

## Backup Strategy

### Database Backups

```bash
# PostgreSQL backup
pg_dump -h localhost -U openbadges openbadges > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > $BACKUP_DIR/openbadges_$DATE.sql
gzip $BACKUP_DIR/openbadges_$DATE.sql

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Restore

```bash
# Restore from backup
gunzip -c backup_20241201.sql.gz | psql $DATABASE_URL
```

## Troubleshooting

### Common Issues

**Port already in use:**

```bash
# Find and kill process
lsof -i :8888
kill -9 <PID>
```

**Database connection failed:**

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**JWT verification failed:**

```bash
# Verify key format
echo $JWT_PUBLIC_KEY | openssl rsa -pubin -text -noout
```

**Static files not loading:**

```bash
# Verify build output
ls -la dist/client/
```

### Logs

```bash
# PM2 logs
pm2 logs openbadges-system --lines 100

# Systemd logs
journalctl -u openbadges-system -f

# Docker logs
docker logs -f openbadges-system
```

## Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] JWT keys generated
- [ ] SSL certificates obtained
- [ ] Reverse proxy configured

### Deployment

- [ ] Build completed successfully
- [ ] Database migrations run
- [ ] Server started without errors
- [ ] Health check passing
- [ ] HTTPS working
- [ ] Authentication working

### Post-Deployment

- [ ] Monitoring configured
- [ ] Backup schedule set
- [ ] Error alerting enabled
- [ ] Performance baseline recorded

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Database Architecture](../architecture/database-architecture.md)
- [Backend Architecture](../architecture/backend-architecture.md)
