# OAuth Integration Troubleshooting Guide

This guide provides solutions for common OAuth integration issues between the OpenBadges main application and badge server.

## Quick Diagnostic Checklist

Before diving into specific issues, run these quick checks:

```bash
# 1. Check if both services are running
curl -s http://localhost:8888/api/health  # Main app
curl -s http://localhost:3000/health      # Badge server

# 2. Verify JWKS endpoint is accessible
curl -s http://localhost:8888/.well-known/jwks.json

# 3. Test basic proxy functionality
curl -s http://localhost:8888/api/bs/badge-classes

# 4. Check Docker container status
docker-compose ps
```

## Common Issues and Solutions

### 1. "401 Unauthorized" from Badge Server

**Symptoms:**

- Requests to `/api/bs/*` endpoints return 401
- Badge server logs show "Authentication failed - no adapter could handle the request"

**Causes and Solutions:**

#### A. OAuth not enabled on badge server

```bash
# Check environment variables
docker-compose exec openbadges-server env | grep OAUTH
```

**Solution:** Ensure these variables are set in `docker-compose.yml`:

```yaml
- OAUTH_ENABLED=true
- AUTH_OAUTH2_ENABLED=true
```

#### B. Wrong authentication mode in main app

**Check:** `.env` file should have:

```bash
OPENBADGES_AUTH_MODE=oauth  # Not 'docker' or 'local'
```

#### C. JWKS endpoint not accessible

```bash
# Test from badge server container
docker-compose exec openbadges-server curl -s http://host.docker.internal:8888/.well-known/jwks.json
```

**Solution:** If this fails, check Docker networking or use alternative URL.

### 2. "Key for the RS256 algorithm must be..." Error

**Symptoms:**

- Badge server logs show JWT verification errors
- Requests work but return authentication errors

**Causes and Solutions:**

#### A. JWT keys not properly mounted

```bash
# Check if keys are accessible in container
docker-compose exec openbadges-server ls -la /app/keys/
```

**Solution:** Ensure volume mount in `docker-compose.yml`:

```yaml
volumes:
  - ./keys:/app/keys:ro
```

#### B. Invalid key format

```bash
# Verify key format
openssl rsa -in keys/platform-private.pem -text -noout
openssl rsa -pubin -in keys/platform-public.pem -text -noout
```

**Solution:** Regenerate keys if invalid:

```bash
openssl genrsa -out keys/platform-private.pem 2048
openssl rsa -in keys/platform-private.pem -pubout -out keys/platform-public.pem
```

### 3. "Route Not Found" or "No adapter could handle"

**Symptoms:**

- Badge server returns 404 or authentication errors
- Logs show "authType: Bearer" but no successful authentication

**Causes and Solutions:**

#### A. Issuer mismatch

**Check:** Both services must use the same issuer:

Main app (`.env`):

```bash
PLATFORM_JWT_ISSUER=openbadges-demo-main-app
```

Badge server (`docker-compose.yml`):

```yaml
- AUTH_OAUTH2_ISSUER=openbadges-demo-main-app
- PLATFORM_JWT_ISSUER=openbadges-demo-main-app
```

#### B. JWT token format issues

**Debug:** Generate and inspect a test token:

```bash
node -e "
const jwt = require('jsonwebtoken');
const fs = require('fs');
const privateKey = fs.readFileSync('./keys/platform-private.pem', 'utf8');
const token = jwt.sign({
  sub: 'test-user',
  platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
  displayName: 'Test User'
}, privateKey, {
  algorithm: 'RS256',
  issuer: 'openbadges-demo-main-app',
  expiresIn: '1h'
});
console.log('Token:', token);
console.log('Decoded:', jwt.decode(token, {complete: true}));
"
```

### 4. JWKS Endpoint Issues

**Symptoms:**

- Badge server can't fetch JWKS
- Logs show network errors when accessing JWKS

**Causes and Solutions:**

#### A. Main application not running

```bash
# Ensure main app is running
curl -s http://localhost:8888/.well-known/jwks.json
```

#### B. Docker networking issues

**Test from container:**

```bash
docker-compose exec openbadges-server nslookup host.docker.internal
```

**Alternative solutions:**

1. Use Docker service name if both services are in same compose file
2. Use host IP address instead of `host.docker.internal`
3. Configure custom Docker network

#### C. JWKS endpoint returning errors

**Check main app logs** for JWKS endpoint errors and verify key files exist.

### 5. JWT Token Expiration Issues

**Symptoms:**

- Authentication works initially but fails after some time
- "Token expired" errors in logs

**Solutions:**

#### A. Increase token expiration

In `src/server/services/jwt.ts`, modify:

```typescript
expiresIn: '24h' // Instead of '1h'
```

#### B. Implement token refresh

Add token refresh logic to handle expired tokens automatically.

### 6. Environment Variable Issues

**Symptoms:**

- Configuration seems correct but authentication still fails
- Inconsistent behavior between restarts

**Solutions:**

#### A. Verify environment loading

```bash
# Check if .env is being loaded
node -e "console.log(process.env.OPENBADGES_AUTH_MODE)"
```

#### B. Restart services after .env changes

```bash
# Restart main application
# (Ctrl+C and npm run dev)

# Restart badge server
docker-compose down && docker-compose up -d
```

## Advanced Debugging

### Enable Detailed Logging

#### Main Application

Add debug logging to `src/server/index.ts`:

```typescript
console.log('Auth mode:', process.env.OPENBADGES_AUTH_MODE)
console.log('JWT token generated:', jwtToken.substring(0, 50) + '...')
```

#### Badge Server

Check Docker logs with timestamps:

```bash
docker-compose logs -f --timestamps openbadges-server
```

### Manual JWT Testing

Create a test script to manually verify JWT flow:

```javascript
// test-jwt.js
const jwt = require('jsonwebtoken')
const fs = require('fs')

const privateKey = fs.readFileSync('./keys/platform-private.pem', 'utf8')
const token = jwt.sign(
  {
    sub: 'manual-test',
    platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
    displayName: 'Manual Test',
  },
  privateKey,
  {
    algorithm: 'RS256',
    issuer: 'openbadges-demo-main-app',
    expiresIn: '1h',
  }
)

console.log('Test token:', token)

// Test with curl
console.log('\nTest command:')
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/badge-classes`)
```

### Network Debugging

#### Test Docker Networking

```bash
# From badge server container, test connectivity
docker-compose exec openbadges-server ping host.docker.internal
docker-compose exec openbadges-server curl -v http://host.docker.internal:8888/api/health
```

#### Alternative Network Configuration

If `host.docker.internal` doesn't work, try:

1. **Use host network mode:**

```yaml
services:
  openbadges-server:
    network_mode: host
```

2. **Use custom network:**

```yaml
networks:
  openbadges:
    driver: bridge

services:
  openbadges-server:
    networks:
      - openbadges
```

## Performance Considerations

### JWKS Caching

The badge server caches JWKS responses. If you update keys:

1. Restart the badge server
2. Or wait for cache expiration (usually 5-15 minutes)

### Token Generation Frequency

JWT tokens are generated for each request. For high-traffic scenarios, consider:

1. Token caching with expiration
2. Connection pooling
3. Token reuse within expiration window

## Security Best Practices

1. **Rotate Keys Regularly:** Update JWT keys periodically
2. **Use HTTPS in Production:** Never use HTTP for OAuth in production
3. **Secure Environment Variables:** Use proper secret management
4. **Monitor Token Usage:** Log and monitor JWT token usage patterns
5. **Validate Token Claims:** Ensure all required claims are present and valid

## Getting Help

If issues persist after following this guide:

1. **Check GitHub Issues:** Look for similar problems in the repository
2. **Enable Debug Logging:** Add detailed logging to identify the exact failure point
3. **Test with Minimal Configuration:** Start with basic setup and add complexity gradually
4. **Verify Dependencies:** Ensure all required packages and versions are correct

## Useful Commands Reference

```bash
# Service health checks
curl -s http://localhost:8888/api/health
curl -s http://localhost:3000/health

# JWT debugging
node -e "console.log(require('jsonwebtoken').decode('YOUR_TOKEN_HERE', {complete: true}))"

# Docker debugging
docker-compose logs openbadges-server --tail=50
docker-compose exec openbadges-server env | grep -E "(OAUTH|JWT|PLATFORM)"

# Network testing
docker-compose exec openbadges-server curl -s http://host.docker.internal:8888/.well-known/jwks.json

# Key validation
openssl rsa -in keys/platform-private.pem -check
openssl rsa -pubin -in keys/platform-public.pem -text -noout
```
