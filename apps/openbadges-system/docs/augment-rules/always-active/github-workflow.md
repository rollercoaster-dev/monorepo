# GitHub Workflow Standards - OpenBadges System

## Always Active Rule

This rule is automatically applied to all interactions and ensures consistent GitHub workflow practices for OpenBadges digital credential development.

## Branch Management

### Branch Naming Conventions
- `feature/[issue-number]-[description]` - New features (e.g., `feature/123-badge-verification-api`)
- `bugfix/[issue-number]-[description]` - Bug fixes (e.g., `bugfix/456-verification-error`)
- `compliance/[issue-number]-[description]` - OpenBadges compliance work
- `security/[issue-number]-[description]` - Security-related changes
- `hotfix/[description]` - Critical production fixes

### Branch Protection
- All changes must go through pull requests
- At least one approval required for merge
- All status checks must pass
- Conversations must be resolved
- Branch must be up to date before merge

## Commit Standards

### Conventional Commit Format
```
type(scope): description

[optional body]

[optional footer]
```

### OpenBadges-Specific Types
- `feat(auth)`: New authentication features
- `feat(badges)`: Badge management features
- `feat(verify)`: Verification functionality
- `feat(api)`: API endpoint development
- `fix(security)`: Security vulnerability fixes
- `fix(compliance)`: OpenBadges specification fixes
- `docs(spec)`: OpenBadges documentation updates
- `test(crypto)`: Cryptographic operation tests

### Required Information in Commits
- Link to related issue: `Closes #123`
- Task ID when applicable: `Task: auth-001`
- OpenBadges version context: `OpenBadges-Version: 2.x, 3.0`
- Security review flag: `Security-Review: Required` (for cryptographic changes)

## Pull Request Requirements

### PR Title Format
Must follow conventional commit format:
- `feat(verification): implement cryptographic badge validation`
- `fix(auth): resolve OAuth token refresh issue`
- `compliance(api): update endpoints for OpenBadges 3.0`

### Required PR Template Sections
1. **Description**: Clear explanation of changes
2. **Related Issues**: Link to GitHub issues and task IDs
3. **Type of Change**: Bug fix, feature, breaking change, etc.
4. **Component Areas**: OpenBadges components affected
5. **OpenBadges Compliance**: Specification adherence checklist
6. **Security Review**: Cryptographic and security validation
7. **Testing**: Comprehensive test coverage verification

### OpenBadges-Specific PR Checklist
- [ ] Maintains OpenBadges 2.x compatibility
- [ ] Supports OpenBadges 3.0 features (if applicable)
- [ ] Follows OpenBadges specification requirements
- [ ] Badge verification functionality tested
- [ ] Cryptographic operations reviewed
- [ ] API endpoints follow OpenBadges standards
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Security vulnerabilities addressed

## Issue Management

### Issue Templates
Always use appropriate issue templates:
- **Feature Request**: For new OpenBadges functionality
- **Bug Report**: For credential/badge-related issues
- **Task Implementation**: For development tasks with compliance tracking

### Required Issue Information
- Component affected (Authentication, Badge Management, Verification, etc.)
- OpenBadges version relevance (2.x, 3.0, Both, N/A)
- Priority level (Critical for security/compliance issues)
- Compliance considerations checklist
- Security impact assessment

### Issue Labels
Automatically applied based on content:
- Component labels: `component: badge-management`, `component: verification`
- Priority labels: `priority: critical` (for security issues)
- OpenBadges labels: `openbadges-compliance`, `security-review`
- Status labels: `status: in-progress`, `status: blocked`

## Code Review Standards

### Review Requirements
- **Security Focus**: All cryptographic operations must be reviewed
- **Compliance Check**: OpenBadges specification adherence verified
- **Test Coverage**: Adequate test coverage for credential operations
- **Documentation**: API changes documented, especially for OpenBadges endpoints

### Review Checklist
- [ ] Code follows project style guidelines
- [ ] OpenBadges specification requirements met
- [ ] Security best practices followed
- [ ] No hardcoded secrets or keys
- [ ] Proper error handling implemented
- [ ] Input validation comprehensive
- [ ] Test coverage adequate
- [ ] Documentation updated

## Automation Integration

### GitHub Actions Triggers
- **Issue Creation**: Auto-assign labels and sync with task management
- **PR Creation**: Validate title format, template completion, task linking
- **Code Changes**: Run OpenBadges compliance validation, security scanning
- **PR Merge**: Update task status, close linked issues, trigger deployment

### Required Status Checks
- Linting and formatting
- Type checking
- Unit and integration tests
- OpenBadges compliance validation
- Security scanning
- Build verification

## Security and Compliance

### Security Requirements
- No hardcoded secrets, keys, or credentials
- All cryptographic operations use approved algorithms (SHA-256+, RSA-2048+)
- Input validation for all user-provided data
- Proper error handling without information disclosure
- Audit logging for security-relevant operations

### OpenBadges Compliance Requirements
- All badge-related code must follow OpenBadges 2.x/3.0 specifications
- JSON-LD context validation for badge data
- Required fields validation for badge classes and assertions
- Proper cryptographic signature handling
- API endpoints must be OpenBadges-compliant

## Documentation Standards

### Required Documentation
- API endpoint documentation for OpenBadges compliance
- Security considerations for cryptographic operations
- OpenBadges specification mapping
- Migration guides for breaking changes
- Deployment and configuration instructions

### Documentation Updates
- Update README for significant feature changes
- Update API documentation for endpoint changes
- Update OpenBadges compliance documentation
- Update security documentation for cryptographic changes

This workflow ensures consistent, secure, and compliant development practices for the OpenBadges digital credential system while maintaining high code quality and proper project management integration.
