# Security & Compliance Guidelines - OpenBadges System

## Agent-Requested Rule

This rule is applied when working on security-sensitive features, cryptographic operations, or compliance-related functionality in the OpenBadges system.

## Security Principles

### Defense in Depth
- **Multiple Security Layers**: Implement security at transport, application, and data layers
- **Fail Secure**: Default to secure configurations and fail-safe behaviors
- **Least Privilege**: Grant minimum necessary permissions for operations
- **Zero Trust**: Verify all requests and validate all inputs

### Cryptographic Security
- **Strong Algorithms**: Use only approved cryptographic algorithms
- **Key Management**: Secure generation, storage, and rotation of keys
- **Perfect Forward Secrecy**: Protect past communications if keys are compromised
- **Quantum Resistance**: Consider post-quantum cryptographic algorithms

## Cryptographic Standards

### Approved Algorithms

```typescript
const APPROVED_ALGORITHMS = {
  // Hash functions
  HASH: {
    'SHA-256': { minKeySize: 256, recommended: true },
    'SHA-384': { minKeySize: 384, recommended: true },
    'SHA-512': { minKeySize: 512, recommended: true },
    'SHA3-256': { minKeySize: 256, recommended: true },
    'BLAKE2b': { minKeySize: 256, recommended: true }
  },
  
  // Digital signatures
  SIGNATURE: {
    'RS256': { minKeySize: 2048, recommended: true },
    'RS384': { minKeySize: 2048, recommended: true },
    'RS512': { minKeySize: 2048, recommended: true },
    'ES256': { curve: 'P-256', recommended: true },
    'ES384': { curve: 'P-384', recommended: true },
    'ES512': { curve: 'P-521', recommended: true },
    'EdDSA': { curve: 'Ed25519', recommended: true }
  },
  
  // Symmetric encryption
  ENCRYPTION: {
    'AES-256-GCM': { keySize: 256, recommended: true },
    'ChaCha20-Poly1305': { keySize: 256, recommended: true },
    'AES-256-CBC': { keySize: 256, recommended: false } // Requires proper IV
  }
};

const FORBIDDEN_ALGORITHMS = [
  'MD5', 'SHA1', 'DES', '3DES', 'RC4', 'RC2', 
  'RSA-1024', 'DSA-1024', 'ECDSA-P192'
];
```

### Key Management Requirements

```typescript
interface KeyManagementService {
  // Key generation with secure randomness
  generateKeyPair(algorithm: string, keySize: number): Promise<KeyPair>;
  
  // Secure key storage
  storePrivateKey(key: PrivateKey, keyId: string, metadata: KeyMetadata): Promise<void>;
  
  // Key rotation
  rotateKey(keyId: string): Promise<KeyRotationResult>;
  
  // Key revocation
  revokeKey(keyId: string, reason: string): Promise<RevocationResult>;
  
  // Secure key retrieval
  getPublicKey(keyId: string): Promise<PublicKey>;
  
  // Key validation
  validateKey(key: Key): Promise<KeyValidationResult>;
}

// Key storage requirements
interface SecureKeyStorage {
  // Environment-based storage
  storeInEnvironment(key: string, value: string): void;
  
  // Hardware Security Module (HSM) integration
  storeInHSM(key: PrivateKey, keyId: string): Promise<void>;
  
  // Key derivation for additional security
  deriveKey(masterKey: string, context: string): Promise<DerivedKey>;
}
```

## Input Validation & Sanitization

### OpenBadges Data Validation

```typescript
import { z } from 'zod';

// Comprehensive badge class validation
const BadgeClassSchema = z.object({
  '@context': z.union([
    z.string().url(),
    z.array(z.string().url())
  ]),
  id: z.string().url().max(2048),
  type: z.union([
    z.literal('BadgeClass'),
    z.array(z.string()).min(1)
  ]),
  name: z.string().min(1).max(255).regex(/^[^<>\"'&]*$/), // No HTML/script injection
  description: z.string().min(1).max(2000).regex(/^[^<>\"'&]*$/),
  image: z.string().url().max(2048),
  criteria: z.union([
    z.string().url().max(2048),
    z.object({
      narrative: z.string().max(2000).regex(/^[^<>\"'&]*$/)
    })
  ]),
  issuer: z.union([
    z.string().url().max(2048),
    z.object({
      id: z.string().url().max(2048),
      type: z.literal('Profile'),
      name: z.string().min(1).max(255).regex(/^[^<>\"'&]*$/)
    })
  ])
});

// Assertion validation with security checks
const AssertionSchema = z.object({
  '@context': z.union([
    z.string().url(),
    z.array(z.string().url())
  ]),
  id: z.string().url().max(2048),
  type: z.union([
    z.literal('Assertion'),
    z.array(z.string()).min(1)
  ]),
  recipient: z.object({
    type: z.literal('email'),
    hashed: z.boolean(),
    identity: z.string().email().max(255) // Validate email format
  }),
  badge: z.union([
    z.string().url().max(2048),
    BadgeClassSchema
  ]),
  verification: z.object({
    type: z.enum(['hosted', 'signed']),
    // Additional verification fields based on type
  }),
  issuedOn: z.string().datetime(), // ISO 8601 format
  expires: z.string().datetime().optional()
});
```

### API Input Sanitization

```typescript
// Sanitize user inputs to prevent injection attacks
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .trim()
    .substring(0, 2048); // Limit length
}

// Validate and sanitize badge data
function validateBadgeInput(input: unknown): BadgeClass {
  try {
    // Parse and validate structure
    const parsed = BadgeClassSchema.parse(input);
    
    // Additional security checks
    validateUrls(parsed);
    checkForMaliciousContent(parsed);
    
    return parsed;
  } catch (error) {
    throw new ValidationError('Invalid badge data', error);
  }
}

function validateUrls(badge: BadgeClass): void {
  const urls = [badge.id, badge.image];
  
  for (const url of urls) {
    if (typeof url === 'string') {
      // Check for malicious URLs
      if (url.includes('javascript:') || url.includes('data:')) {
        throw new SecurityError('Malicious URL detected');
      }
      
      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new ValidationError('Invalid URL format');
      }
    }
  }
}
```

## Authentication & Authorization

### Multi-Factor Authentication

```typescript
interface AuthenticationService {
  // Primary authentication
  authenticateWithPassword(email: string, password: string): Promise<AuthResult>;
  
  // WebAuthn for passwordless authentication
  initiateWebAuthn(userId: string): Promise<WebAuthnChallenge>;
  verifyWebAuthn(response: WebAuthnResponse): Promise<AuthResult>;
  
  // OAuth 2.0 for badge provider integration
  authenticateWithOAuth(providerId: string, code: string): Promise<OAuthResult>;
  
  // Multi-factor authentication
  initiateMFA(userId: string, method: 'totp' | 'sms' | 'email'): Promise<MFAChallenge>;
  verifyMFA(userId: string, token: string): Promise<MFAResult>;
}
```

### Role-Based Access Control

```typescript
enum Permission {
  // Badge management
  CREATE_BADGE_CLASS = 'badge:create',
  UPDATE_BADGE_CLASS = 'badge:update',
  DELETE_BADGE_CLASS = 'badge:delete',
  
  // Assertion management
  ISSUE_ASSERTION = 'assertion:issue',
  REVOKE_ASSERTION = 'assertion:revoke',
  
  // User management
  MANAGE_USERS = 'user:manage',
  VIEW_USERS = 'user:view',
  
  // System administration
  MANAGE_KEYS = 'system:keys',
  VIEW_AUDIT_LOGS = 'system:audit'
}

interface AuthorizationService {
  checkPermission(userId: string, permission: Permission): Promise<boolean>;
  checkResourceAccess(userId: string, resourceId: string, action: string): Promise<boolean>;
  
  // Role management
  assignRole(userId: string, role: string): Promise<void>;
  revokeRole(userId: string, role: string): Promise<void>;
  
  // Permission checking middleware
  requirePermission(permission: Permission): MiddlewareHandler;
  requireResourceAccess(resourceType: string, action: string): MiddlewareHandler;
}
```

## Data Protection & Privacy

### Personal Data Handling

```typescript
interface PrivacyService {
  // Data minimization
  collectMinimalData(userData: UserData): MinimalUserData;
  
  // Consent management
  recordConsent(userId: string, purpose: string, consent: boolean): Promise<void>;
  checkConsent(userId: string, purpose: string): Promise<boolean>;
  
  // Data retention
  scheduleDataDeletion(userId: string, retentionPeriod: Duration): Promise<void>;
  
  // Right to be forgotten
  deleteUserData(userId: string): Promise<DeletionResult>;
  
  // Data portability
  exportUserData(userId: string): Promise<UserDataExport>;
}
```

### Encryption at Rest

```typescript
interface DataEncryptionService {
  // Field-level encryption for sensitive data
  encryptField(data: string, fieldType: 'email' | 'name' | 'identifier'): Promise<EncryptedField>;
  decryptField(encryptedField: EncryptedField): Promise<string>;
  
  // Database encryption
  encryptSensitiveData(record: DatabaseRecord): Promise<EncryptedRecord>;
  decryptSensitiveData(encryptedRecord: EncryptedRecord): Promise<DatabaseRecord>;
  
  // Key rotation for encrypted data
  rotateEncryptionKeys(): Promise<KeyRotationResult>;
}
```

## Audit Logging & Monitoring

### Security Event Logging

```typescript
interface AuditLogger {
  // Authentication events
  logAuthenticationAttempt(userId: string, success: boolean, method: string): Promise<void>;
  logAuthenticationFailure(email: string, reason: string, ipAddress: string): Promise<void>;
  
  // Authorization events
  logPermissionCheck(userId: string, permission: string, granted: boolean): Promise<void>;
  logUnauthorizedAccess(userId: string, resource: string, action: string): Promise<void>;
  
  // Badge operations
  logBadgeIssuance(issuerId: string, recipientId: string, badgeId: string): Promise<void>;
  logBadgeRevocation(issuerId: string, assertionId: string, reason: string): Promise<void>;
  
  // Cryptographic operations
  logKeyGeneration(keyId: string, algorithm: string, purpose: string): Promise<void>;
  logSigningOperation(keyId: string, dataHash: string, success: boolean): Promise<void>;
  
  // Security incidents
  logSecurityIncident(type: string, severity: 'low' | 'medium' | 'high' | 'critical', details: object): Promise<void>;
}
```

### Monitoring & Alerting

```typescript
interface SecurityMonitoring {
  // Anomaly detection
  detectAnomalousActivity(userId: string, activity: ActivityLog[]): Promise<AnomalyResult>;
  
  // Rate limiting monitoring
  checkRateLimit(userId: string, endpoint: string): Promise<RateLimitResult>;
  
  // Failed authentication monitoring
  monitorFailedLogins(timeWindow: Duration): Promise<FailedLoginReport>;
  
  // Security alerts
  sendSecurityAlert(incident: SecurityIncident): Promise<void>;
  
  // Compliance monitoring
  generateComplianceReport(period: DateRange): Promise<ComplianceReport>;
}
```

## Vulnerability Management

### Security Testing Requirements

```typescript
// Security test categories
interface SecurityTestSuite {
  // Input validation tests
  testInputValidation(): Promise<TestResult[]>;
  
  // Authentication tests
  testAuthenticationBypass(): Promise<TestResult[]>;
  testPasswordSecurity(): Promise<TestResult[]>;
  
  // Authorization tests
  testPrivilegeEscalation(): Promise<TestResult[]>;
  testAccessControl(): Promise<TestResult[]>;
  
  // Cryptographic tests
  testCryptographicImplementation(): Promise<TestResult[]>;
  testKeyManagement(): Promise<TestResult[]>;
  
  // Injection tests
  testSQLInjection(): Promise<TestResult[]>;
  testXSSVulnerabilities(): Promise<TestResult[]>;
  testCommandInjection(): Promise<TestResult[]>;
  
  // OpenBadges-specific tests
  testBadgeVerificationSecurity(): Promise<TestResult[]>;
  testIssuerImpersonation(): Promise<TestResult[]>;
}
```

### Dependency Security

```typescript
// Regular security audits
interface DependencySecurityService {
  // Vulnerability scanning
  scanDependencies(): Promise<VulnerabilityReport>;
  
  // Security updates
  checkSecurityUpdates(): Promise<SecurityUpdate[]>;
  applySecurityUpdates(updates: SecurityUpdate[]): Promise<UpdateResult>;
  
  // License compliance
  checkLicenseCompliance(): Promise<LicenseReport>;
  
  // Supply chain security
  verifyPackageIntegrity(packageName: string, version: string): Promise<IntegrityResult>;
}
```

## Incident Response

### Security Incident Handling

```typescript
interface IncidentResponseService {
  // Incident detection
  detectIncident(indicators: SecurityIndicator[]): Promise<IncidentDetectionResult>;
  
  // Incident classification
  classifyIncident(incident: SecurityIncident): Promise<IncidentClassification>;
  
  // Response coordination
  initiateResponse(incident: SecurityIncident): Promise<ResponsePlan>;
  
  // Communication
  notifyStakeholders(incident: SecurityIncident, stakeholders: string[]): Promise<void>;
  
  // Recovery
  executeRecoveryPlan(plan: RecoveryPlan): Promise<RecoveryResult>;
  
  // Post-incident analysis
  conductPostIncidentReview(incident: SecurityIncident): Promise<PostIncidentReport>;
}
```

This comprehensive security and compliance framework ensures that the OpenBadges system maintains the highest standards of security while complying with relevant regulations and industry best practices.
