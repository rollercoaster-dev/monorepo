# Sensitive Data Protection

The rd-logger package includes robust mechanisms to prevent accidental logging of sensitive information such as API keys, passwords, tokens, and other credentials.

## Features

- **SensitiveValue Wrapper**: A generic wrapper class that redacts sensitive values in logs
- **Pattern Detection**: Automatic detection and redaction of common sensitive data patterns
- **Explicit Opt-in**: Clear methods for the rare cases when logging sensitive data is necessary

## Using the SensitiveValue Wrapper

The `SensitiveValue` wrapper is the primary way to protect sensitive data:

```typescript
import { logger, SensitiveValue } from '@rollercoaster-dev/rd-logger';

// Create a sensitive value
const apiKey = 'api_key_12345';
const sensitiveApiKey = SensitiveValue.from(apiKey);

// Safe logging - will show [REDACTED]
logger.info('Created API key', { key: sensitiveApiKey });

// Accessing the actual value when needed for operations
const actualKey = sensitiveApiKey.getValue();
```

### Custom Redaction Text

You can customize the redacted text:

```typescript
// Custom redaction text
const password = 'super-secret-password';
const sensitivePassword = SensitiveValue.from(password, '[PASSWORD HIDDEN]');

logger.info('User created', { password: sensitivePassword });
// Will show: [PASSWORD HIDDEN] instead of [REDACTED]
```

### Working with Objects

The wrapper works with any type of value, including objects:

```typescript
const userData = { 
  id: 123, 
  name: 'John Doe', 
  ssn: '123-45-6789' 
};
const sensitiveUserData = SensitiveValue.from(userData);

logger.info('User data', { user: sensitiveUserData });
// The entire object will be redacted
```

## Automatic Pattern Detection

The logger automatically detects and redacts common patterns of sensitive data:

- API keys
- JWT tokens
- OAuth tokens
- Passwords
- Credit card numbers
- Social security numbers
- Email addresses
- IP addresses
- AWS access keys
- Private keys

This provides an additional layer of protection even when the `SensitiveValue` wrapper is not used:

```typescript
// Even without SensitiveValue, this will be automatically redacted
logger.info('Debug info', { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U' });
```

## Explicitly Logging Sensitive Data

In rare cases where logging sensitive data is necessary (e.g., debugging critical issues), use the explicit opt-in methods:

```typescript
import { logger, SensitiveLoggingApproval } from '@rollercoaster-dev/rd-logger';

// Create approval information
const approval: SensitiveLoggingApproval = {
  reason: 'Debugging authentication issue #1234',
  approvedBy: 'Security Team',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
};

// Log with sensitive data
logger.logWithSensitiveData(
  'info',
  'Debug API key issue',
  { key: 'api_key_12345' },
  approval
);

// Convenience methods for common log levels
logger.infoWithSensitiveData('Info with sensitive data', { key: 'api_key_12345' }, approval);
logger.errorWithSensitiveData('Error with sensitive data', { key: 'api_key_12345' }, approval);
```

These methods:
- Require explicit approval information
- Add metadata about who approved the logging and why
- Add special highlighting in the logs
- Support optional expiration for the approval

## Best Practices

1. **Always use SensitiveValue**: Wrap all sensitive data in `SensitiveValue` as soon as it's received or created
2. **Don't trust pattern detection alone**: While helpful, pattern detection is not foolproof and should be a backup, not the primary protection
3. **Limit access to getValue()**: Only call `getValue()` when absolutely necessary
4. **Be cautious with explicit logging**: Only use `logWithSensitiveData()` in exceptional circumstances
5. **Set expiration for approvals**: Always set an `expiresAt` date for sensitive data logging approvals
6. **Audit sensitive data logging**: Regularly review logs for instances of sensitive data logging

## Security Considerations

- The `SensitiveValue` wrapper protects against accidental logging but not malicious code
- Sensitive values still exist in memory while your application is running
- Pattern detection may have false positives (detecting non-sensitive data as sensitive) or false negatives (missing some sensitive data)
- Consider implementing additional security measures like log encryption for highly sensitive environments
