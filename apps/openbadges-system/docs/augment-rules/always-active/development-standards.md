# Development Standards - OpenBadges System

## Always Active Rule

This rule is automatically applied to all development activities and ensures consistent code quality, security, and OpenBadges compliance standards.

## Code Quality Standards

### TypeScript Standards
- **Strict Mode**: Always use TypeScript strict mode
- **Type Safety**: Explicit types for all function parameters and return values
- **Interface Definitions**: Define interfaces for all OpenBadges data structures
- **Generic Types**: Use generics for reusable badge and credential operations
- **Null Safety**: Handle null/undefined cases explicitly

### Code Organization
```typescript
// Example: OpenBadges interface structure
interface BadgeClass {
  id: string;
  type: string | string[];
  name: string;
  description: string;
  image: string;
  criteria: string | Criteria;
  issuer: string | Profile;
  '@context'?: string | string[];
}

interface BadgeAssertion {
  id: string;
  type: string | string[];
  recipient: IdentityObject;
  badge: string | BadgeClass;
  verification: VerificationObject;
  issuedOn: string;
  expires?: string;
}
```

### Naming Conventions
- **Components**: PascalCase (`BadgeManager`, `VerificationEngine`)
- **Functions**: camelCase (`verifyBadge`, `createAssertion`)
- **Constants**: SCREAMING_SNAKE_CASE (`OPENBADGES_CONTEXT_URL`)
- **Files**: kebab-case (`badge-verification.ts`, `user-management.vue`)
- **OpenBadges Specific**: Use OpenBadges terminology (`BadgeClass`, `Assertion`, `Profile`)

## Security Standards

### Cryptographic Operations
```typescript
// Required: Use approved algorithms
const APPROVED_ALGORITHMS = {
  HASH: ['SHA-256', 'SHA-384', 'SHA-512'],
  SIGNATURE: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'],
  ENCRYPTION: ['AES-256-GCM', 'ChaCha20-Poly1305']
};

// Forbidden: Weak algorithms
const FORBIDDEN_ALGORITHMS = ['MD5', 'SHA1', 'DES', 'RC4'];
```

### Key Management
- **No Hardcoded Keys**: All cryptographic keys must be stored in environment variables
- **Key Rotation**: Support for cryptographic key rotation
- **Secure Storage**: Use secure key storage mechanisms
- **Access Control**: Implement proper access controls for key operations

### Input Validation
```typescript
// Example: Input validation for badge data
function validateBadgeClass(badgeClass: unknown): BadgeClass {
  const schema = z.object({
    id: z.string().url(),
    type: z.union([z.string(), z.array(z.string())]),
    name: z.string().min(1).max(255),
    description: z.string().min(1).max(1000),
    image: z.string().url(),
    criteria: z.union([z.string().url(), z.object({})]),
    issuer: z.union([z.string().url(), z.object({})])
  });
  
  return schema.parse(badgeClass);
}
```

### Error Handling
- **No Information Disclosure**: Error messages must not reveal sensitive information
- **Structured Logging**: Use structured logging for security events
- **Audit Trail**: Maintain audit logs for all security-relevant operations
- **Graceful Degradation**: Handle errors gracefully without system compromise

## OpenBadges Compliance Standards

### Specification Adherence
```typescript
// Required: OpenBadges 2.x context
const OPENBADGES_2X_CONTEXT = 'https://w3id.org/openbadges/v2';

// Required: OpenBadges 3.0 context (when applicable)
const OPENBADGES_3_CONTEXT = 'https://purl.imsglobal.org/spec/ob/v3p0/context.json';

// Validation: Ensure required fields
const REQUIRED_BADGE_CLASS_FIELDS = ['id', 'type', 'name', 'description', 'image', 'criteria', 'issuer'];
const REQUIRED_ASSERTION_FIELDS = ['id', 'type', 'recipient', 'badge', 'verification', 'issuedOn'];
```

### JSON-LD Structure
```typescript
// Example: Proper OpenBadges JSON-LD structure
interface OpenBadgesDocument {
  '@context': string | string[];
  id: string;
  type: string | string[];
  [key: string]: any;
}
```

### Verification Requirements
- **Signature Verification**: All badges must support cryptographic verification
- **Proof Validation**: Support for OpenBadges 3.0 proof mechanisms
- **Revocation Checking**: Implement badge revocation status checking
- **Issuer Validation**: Verify issuer authenticity and authorization

## API Development Standards

### OpenBadges API Compliance
```typescript
// Example: OpenBadges-compliant API endpoint
app.get('/badges/:id', async (c) => {
  const badgeId = c.req.param('id');
  
  // Validate input
  if (!isValidBadgeId(badgeId)) {
    return c.json({ error: 'Invalid badge ID' }, 400);
  }
  
  // Set proper content type
  c.header('Content-Type', 'application/json');
  c.header('Access-Control-Allow-Origin', '*');
  
  const badge = await getBadgeClass(badgeId);
  if (!badge) {
    return c.json({ error: 'Badge not found' }, 404);
  }
  
  return c.json(badge);
});
```

### REST API Standards
- **HTTP Methods**: Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- **Status Codes**: Return proper HTTP status codes
- **Content Types**: Set appropriate Content-Type headers
- **CORS**: Configure CORS for cross-origin badge verification
- **Rate Limiting**: Implement rate limiting for API endpoints

### Error Response Format
```typescript
interface APIError {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
}
```

## Testing Standards

### Test Coverage Requirements
- **Unit Tests**: Minimum 80% code coverage
- **Integration Tests**: All API endpoints tested
- **Security Tests**: Cryptographic operations thoroughly tested
- **Compliance Tests**: OpenBadges specification compliance verified

### Test Structure
```typescript
// Example: Badge verification test
describe('Badge Verification', () => {
  describe('RSA Signature Verification', () => {
    it('should verify valid RSA signatures', async () => {
      const badge = createTestBadge();
      const signature = await signBadge(badge, privateKey);
      
      const isValid = await verifyBadgeSignature(badge, signature, publicKey);
      expect(isValid).toBe(true);
    });
    
    it('should reject invalid signatures', async () => {
      const badge = createTestBadge();
      const invalidSignature = 'invalid-signature';
      
      const isValid = await verifyBadgeSignature(badge, invalidSignature, publicKey);
      expect(isValid).toBe(false);
    });
  });
});
```

### Test Data Management
- **Test Fixtures**: Use realistic OpenBadges test data
- **Mock Services**: Mock external badge provider services
- **Cryptographic Tests**: Test with known good/bad cryptographic data
- **Edge Cases**: Test boundary conditions and error scenarios

## Performance Standards

### Frontend Performance
- **Bundle Size**: Keep JavaScript bundles under 250KB gzipped
- **Loading Time**: Initial page load under 3 seconds
- **Badge Rendering**: Support for 100+ badges without performance degradation
- **Memory Usage**: Efficient memory management for large badge collections

### Backend Performance
- **Response Time**: API responses under 200ms for badge retrieval
- **Throughput**: Support for 1000+ concurrent badge verifications
- **Database Queries**: Optimize queries for badge and user data
- **Caching**: Implement appropriate caching for badge metadata

## Documentation Standards

### Code Documentation
```typescript
/**
 * Verifies the cryptographic signature of an OpenBadges assertion
 * @param assertion - The badge assertion to verify
 * @param publicKey - The issuer's public key for verification
 * @returns Promise resolving to verification result
 * @throws {VerificationError} When signature verification fails
 */
async function verifyBadgeAssertion(
  assertion: BadgeAssertion, 
  publicKey: string
): Promise<VerificationResult> {
  // Implementation
}
```

### API Documentation
- **OpenAPI Specification**: Maintain OpenAPI 3.0 specification
- **Example Requests/Responses**: Include realistic OpenBadges examples
- **Error Documentation**: Document all possible error conditions
- **Authentication**: Document authentication requirements

### Architecture Documentation
- **Component Diagrams**: Visual representation of system architecture
- **Data Flow**: Document badge issuance and verification flows
- **Security Model**: Document security architecture and threat model
- **Compliance Mapping**: Map implementation to OpenBadges specification

## Deployment Standards

### Environment Configuration
- **Environment Variables**: All configuration via environment variables
- **Secrets Management**: Secure handling of cryptographic keys and secrets
- **Database Migrations**: Versioned database schema migrations
- **Health Checks**: Implement comprehensive health check endpoints

### Monitoring and Logging
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Security Events**: Log all security-relevant operations
- **Performance Metrics**: Track API response times and error rates
- **Compliance Monitoring**: Monitor OpenBadges specification adherence

These development standards ensure consistent, secure, and compliant development practices for the OpenBadges digital credential system while maintaining high code quality and performance standards.
