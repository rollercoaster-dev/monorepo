# OpenBadges System Security Assessment

## Executive Summary

This document provides a comprehensive security assessment of the OpenBadges system, focusing on threat modeling for public key storage, passwordless authentication, JWT secrets, CORS configuration, and Basic Auth proxy. The assessment includes CVSS-like risk ratings and prioritized quick wins for immediate security improvements.

## System Architecture Overview

The OpenBadges system consists of:
- **Frontend**: Vue.js client (Port 7777) with WebAuthn passwordless auth
- **Backend**: Hono.js server (Port 8888) with JWT authentication
- **Database**: SQLite for user management and WebAuthn credentials
- **External Service**: OpenBadges server (Port 3000) with Basic Auth proxy
- **File Storage**: RSA private/public key pairs for JWT signing

## Threat Model Analysis

### 1. Public Key Storage

**Current Implementation:**
- RSA private key: `./keys/platform-private.pem`
- RSA public key: `./keys/platform-public.pem`
- Keys loaded synchronously at service initialization
- No encryption at rest for private keys

**Threats:**
- **T1.1**: Private key exposure through file system access
- **T1.2**: Private key theft through container compromise
- **T1.3**: Private key leakage through logs or error messages
- **T1.4**: Weak key generation or storage practices

**Risk Rating: HIGH (7.5/10)**
- **Attack Vector**: Local/Network
- **Attack Complexity**: Low
- **Privileges Required**: Low
- **User Interaction**: None
- **Scope**: Changed
- **Impact**: High (CIA all affected)

### 2. Passwordless Authentication (WebAuthn)

**Current Implementation:**
- WebAuthn/FIDO2 for user authentication
- Credentials stored in SQLite database
- Challenge-response authentication flow
- Platform authenticator preference

**Threats:**
- **T2.1**: Credential database compromise
- **T2.2**: Man-in-the-middle attacks during registration
- **T2.3**: Replay attacks on authentication challenges
- **T2.4**: Cross-origin attacks due to domain mismatch

**Risk Rating: MEDIUM (5.5/10)**
- **Attack Vector**: Network
- **Attack Complexity**: High
- **Privileges Required**: None
- **User Interaction**: Required
- **Scope**: Unchanged
- **Impact**: Medium

### 3. JWT Secrets and Token Management

**Current Implementation:**
- RS256 algorithm with RSA key pair
- 1-hour token expiration
- No token refresh mechanism
- No token blacklisting/revocation

**Threats:**
- **T3.1**: JWT token theft and replay
- **T3.2**: JWT secret compromise
- **T3.3**: Token manipulation and privilege escalation
- **T3.4**: Timing attacks on token validation

**Risk Rating: MEDIUM-HIGH (6.5/10)**
- **Attack Vector**: Network/Local
- **Attack Complexity**: Medium
- **Privileges Required**: Low
- **User Interaction**: None
- **Scope**: Changed
- **Impact**: Medium

### 4. CORS Configuration

**Current Implementation:**
```javascript
cors({
  origin: ['http://localhost:7777'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
})
```

**Threats:**
- **T4.1**: Cross-origin request forgery (CSRF)
- **T4.2**: Credentials exposure in cross-origin requests
- **T4.3**: Preflight bypass attacks
- **T4.4**: Origin validation bypass

**Risk Rating: LOW-MEDIUM (4.0/10)**
- **Attack Vector**: Network
- **Attack Complexity**: Medium
- **Privileges Required**: None
- **User Interaction**: Required
- **Scope**: Unchanged
- **Impact**: Low

### 5. Basic Auth Proxy

**Current Implementation:**
- Hardcoded credentials: `admin:admin-user`
- Basic Auth for OpenBadges server proxy
- No rate limiting or brute force protection
- Credentials transmitted in base64 encoding

**Threats:**
- **T5.1**: Credential brute force attacks
- **T5.2**: Credential interception in transit
- **T5.3**: Credential exposure in logs
- **T5.4**: Replay attacks with stolen credentials

**Risk Rating: HIGH (7.0/10)**
- **Attack Vector**: Network
- **Attack Complexity**: Low
- **Privileges Required**: None
- **User Interaction**: None
- **Scope**: Changed
- **Impact**: High

## Detailed Security Findings

### Critical Issues

#### 1. Hardcoded Basic Auth Credentials
**File**: `src/server/index.ts:92`
```javascript
headers.set('Authorization', 'Basic ' + btoa('admin:admin-user'));
```
**Risk**: Critical - Hardcoded credentials in source code
**Impact**: Full compromise of OpenBadges server access

#### 2. Private Key Storage in Plain Text
**File**: `src/server/services/jwt.ts:34`
```javascript
this.privateKey = readFileSync(join(process.cwd(), 'keys', 'platform-private.pem'), 'utf8');
```
**Risk**: High - Unencrypted private key storage
**Impact**: JWT signing compromise, impersonation attacks

#### 3. No Token Revocation Mechanism
**File**: `src/server/services/jwt.ts`
**Risk**: Medium - No way to invalidate compromised tokens
**Impact**: Extended attack window for stolen tokens

### High-Risk Issues

#### 4. WebAuthn Challenge Reuse
**File**: `src/client/utils/webauthn.ts:84`
**Risk**: Medium - Potential replay attacks
**Impact**: Authentication bypass

#### 5. Insufficient Input Validation
**File**: `src/server/routes/auth.ts:11`
**Risk**: Medium - Basic validation only
**Impact**: Injection attacks, data corruption

#### 6. Missing Rate Limiting
**Risk**: High - No protection against brute force
**Impact**: DoS attacks, credential stuffing

### Medium-Risk Issues

#### 7. CORS Configuration Too Permissive
**File**: `src/server/index.ts:25-30`
**Risk**: Medium - Allows all methods
**Impact**: CSRF attacks, unauthorized actions

#### 8. Error Information Disclosure
**File**: `src/server/index.ts:123`
**Risk**: Low - Detailed error messages
**Impact**: Information leakage

## Quick Wins - Priority Security Improvements

### 1. IMMEDIATE (Deploy within 1 week)

#### A. Implement Rate Limiting
**Priority**: Critical
**Effort**: Low
**Impact**: High

```javascript
// Add to src/server/index.ts
import { rateLimiter } from 'hono-rate-limiter'

app.use('*', rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
}))

// Stricter limits for auth endpoints
app.use('/api/auth/*', rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
}))
```

#### B. Force HTTPS in Production
**Priority**: Critical
**Effort**: Low
**Impact**: High

```javascript
// Add to src/server/index.ts
app.use('*', async (c, next) => {
  if (process.env.NODE_ENV === 'production' && !c.req.header('x-forwarded-proto')?.includes('https')) {
    return c.redirect(`https://${c.req.header('host')}${c.req.path}`)
  }
  await next()
})
```

#### C. Add Security Headers (Helmet-style)
**Priority**: Critical
**Effort**: Low
**Impact**: Medium

```javascript
// Add to src/server/index.ts
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  await next()
})
```

#### D. Implement CSRF Protection
**Priority**: High
**Effort**: Low
**Impact**: Medium

```javascript
// Add to src/server/index.ts
import { csrf } from 'hono/csrf'

app.use('*', csrf({
  origin: ['http://localhost:7777', 'https://yourdomain.com'],
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}))
```

### 2. SHORT-TERM (Deploy within 2 weeks)

#### E. Environment-based Configuration
**Priority**: Critical
**Effort**: Medium
**Impact**: High

```javascript
// Replace hardcoded credentials in src/server/index.ts
const basicAuthUser = process.env.OPENBADGES_BASIC_AUTH_USER || 'admin'
const basicAuthPass = process.env.OPENBADGES_BASIC_AUTH_PASS || 'admin-user'

if (basicAuthUser === 'admin' && basicAuthPass === 'admin-user') {
  console.warn('WARNING: Using default Basic Auth credentials. Set OPENBADGES_BASIC_AUTH_USER and OPENBADGES_BASIC_AUTH_PASS environment variables.')
}

headers.set('Authorization', 'Basic ' + btoa(`${basicAuthUser}:${basicAuthPass}`))
```

#### F. Enhanced JWT Security
**Priority**: High
**Effort**: Medium
**Impact**: High

```javascript
// Add to src/server/services/jwt.ts
import crypto from 'crypto'

export class JWTService {
  private jti: Set<string> = new Set() // Token blacklist
  
  generatePlatformToken(user: PlatformUser): string {
    const jti = crypto.randomUUID() // Unique token ID
    
    const payload: JWTPayload = {
      sub: user.id,
      platformId: this.platformId,
      displayName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      jti, // Add token ID for revocation
      iat: Math.floor(Date.now() / 1000),
      metadata: {
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin
      }
    }

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      issuer: this.clientId,
      expiresIn: '1h'
    })
  }
  
  revokeToken(jti: string): void {
    this.jti.add(jti)
  }
  
  verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.privateKey) as JWTPayload
      
      // Check if token is revoked
      if (this.jti.has(payload.jti)) {
        return null
      }
      
      return payload
    } catch (error) {
      console.error('JWT verification failed:', error)
      return null
    }
  }
}
```

#### G. Stricter CORS Configuration
**Priority**: Medium
**Effort**: Low
**Impact**: Medium

```javascript
// Update src/server/index.ts CORS configuration
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'http://localhost:7777',
      'https://yourdomain.com'
    ]
    
    if (!origin || allowedOrigins.includes(origin)) {
      return origin
    }
    
    return false
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'], // Remove OPTIONS from public access
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight for 24 hours
}))
```

### 3. MEDIUM-TERM (Deploy within 1 month)

#### H. Private Key Encryption
**Priority**: High
**Effort**: High
**Impact**: High

```javascript
// Add to src/server/services/jwt.ts
import { createHash, createDecipheriv } from 'crypto'

export class JWTService {
  private privateKey: string
  
  constructor() {
    try {
      const encryptedKey = readFileSync(join(process.cwd(), 'keys', 'platform-private.pem.enc'), 'utf8')
      const passphrase = process.env.JWT_PRIVATE_KEY_PASSPHRASE
      
      if (!passphrase) {
        throw new Error('JWT_PRIVATE_KEY_PASSPHRASE environment variable is required')
      }
      
      this.privateKey = this.decryptPrivateKey(encryptedKey, passphrase)
    } catch (error) {
      console.error('Failed to load private key:', error)
      throw new Error('Private key not found or invalid passphrase')
    }
  }
  
  private decryptPrivateKey(encryptedKey: string, passphrase: string): string {
    // Implementation for decrypting private key
    // Use industry-standard encryption like AES-256-GCM
  }
}
```

#### I. Enhanced WebAuthn Security
**Priority**: Medium
**Effort**: Medium
**Impact**: Medium

```javascript
// Add to src/client/utils/webauthn.ts
export class WebAuthnUtils {
  static createRegistrationOptions(
    userId: string,
    username: string,
    displayName: string,
    existingCredentials: WebAuthnCredential[] = []
  ): RegistrationOptions {
    const challenge = this.generateChallenge()
    const userIdBuffer = new TextEncoder().encode(userId)

    return {
      challenge: this.arrayBufferToBase64Url(challenge),
      user: {
        id: this.arrayBufferToBase64Url(userIdBuffer.buffer as ArrayBuffer),
        name: username,
        displayName: displayName
      },
      rp: {
        name: this.RP_NAME,
        id: this.RP_ID
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      timeout: this.TIMEOUT,
      attestation: 'direct', // Changed from 'none' for better security
      excludeCredentials: existingCredentials.map(cred => ({
        id: this.base64UrlToArrayBuffer(cred.id),
        type: 'public-key' as const,
        transports: cred.transports
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required', // Changed from 'preferred'
        requireResidentKey: true,      // Added for better security
        residentKey: 'required'        // Added for better security
      }
    }
  }
}
```

#### J. Input Validation and Sanitization
**Priority**: Medium
**Effort**: Medium
**Impact**: Medium

```javascript
// Add to src/server/routes/auth.ts
import { z } from 'zod'

const PlatformTokenSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    isAdmin: z.boolean()
  })
})

authRoutes.post('/platform-token', async (c) => {
  try {
    const body = await c.req.json()
    const { user } = PlatformTokenSchema.parse(body)
    
    // Rest of the implementation
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data' }, 400)
    }
    
    console.error('Platform token generation failed:', error)
    return c.json({ error: 'Failed to generate platform token' }, 500)
  }
})
```

## Security Monitoring and Alerting

### 1. Security Event Logging
```javascript
// Add to src/server/index.ts
import winston from 'winston'

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
})

// Log security events
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  
  if (c.req.path.includes('/auth/') || c.req.path.includes('/users/')) {
    securityLogger.info({
      timestamp: new Date().toISOString(),
      method: c.req.method,
      path: c.req.path,
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      userAgent: c.req.header('user-agent'),
      status: c.res.status,
      responseTime: Date.now() - start
    })
  }
})
```

### 2. Intrusion Detection
```javascript
// Add basic intrusion detection
const suspiciousActivity = new Map()

app.use('*', async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  const path = c.req.path
  
  // Track failed auth attempts
  if (path.includes('/auth/') && c.res.status === 401) {
    const key = `${ip}-${path}`
    const attempts = suspiciousActivity.get(key) || 0
    suspiciousActivity.set(key, attempts + 1)
    
    if (attempts > 5) {
      securityLogger.warn({
        type: 'POTENTIAL_BRUTE_FORCE',
        ip,
        path,
        attempts: attempts + 1,
        timestamp: new Date().toISOString()
      })
    }
  }
  
  await next()
})
```

## Security Testing Recommendations

### 1. Automated Security Tests
```javascript
// Add to src/test/security/
describe('Security Tests', () => {
  test('should reject requests without CSRF token', async () => {
    // Test CSRF protection
  })
  
  test('should enforce rate limiting', async () => {
    // Test rate limiting
  })
  
  test('should validate JWT tokens properly', async () => {
    // Test JWT validation
  })
  
  test('should prevent XSS attacks', async () => {
    // Test XSS prevention
  })
})
```

### 2. Regular Security Audits
- **Monthly**: Dependency vulnerability scanning
- **Quarterly**: Manual security testing
- **Semi-annually**: Third-party security assessment
- **Annually**: Penetration testing

## Compliance and Best Practices

### 1. Data Protection
- Implement proper data encryption at rest
- Use secure communication protocols (HTTPS/TLS 1.3)
- Regular data backup and recovery procedures
- Data retention and deletion policies

### 2. Access Control
- Implement principle of least privilege
- Regular access reviews and updates
- Multi-factor authentication for admin access
- Role-based access control (RBAC)

### 3. Security Documentation
- Maintain security runbooks
- Document incident response procedures
- Keep security policies up to date
- Regular security training for developers

## Risk Matrix Summary

| Component | Current Risk | After Quick Wins | Long-term Target |
|-----------|--------------|------------------|------------------|
| Public Key Storage | HIGH (7.5) | MEDIUM (5.0) | LOW (2.5) |
| WebAuthn Auth | MEDIUM (5.5) | LOW-MEDIUM (4.0) | LOW (2.0) |
| JWT Management | MEDIUM-HIGH (6.5) | MEDIUM (4.5) | LOW (2.5) |
| CORS Config | LOW-MEDIUM (4.0) | LOW (2.5) | LOW (1.5) |
| Basic Auth Proxy | HIGH (7.0) | MEDIUM (4.0) | LOW (2.0) |

## Implementation Timeline

| Phase | Duration | Priority Items |
|-------|----------|----------------|
| **Immediate** | 1 week | Rate limiting, HTTPS, Security headers, CSRF |
| **Short-term** | 2 weeks | Environment config, JWT security, CORS updates |
| **Medium-term** | 1 month | Private key encryption, WebAuthn enhancements, Input validation |
| **Long-term** | 3 months | Full security monitoring, Compliance, Regular audits |

## Conclusion

The OpenBadges system has a solid foundation but requires immediate attention to several critical security issues. The most pressing concerns are hardcoded credentials and unencrypted private key storage. By implementing the recommended quick wins, the overall security posture can be significantly improved within 2-4 weeks.

The risk ratings will drop from HIGH/MEDIUM-HIGH to LOW/MEDIUM after implementing all recommendations, making the system suitable for production deployment with proper security monitoring and maintenance procedures.

---

**Assessment Date**: December 2024  
**Next Review**: March 2025  
**Classification**: Internal Use Only
