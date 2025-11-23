# Development Plan: Issue #110

## Issue Summary
**Title**: feat(keys): Implement key storage service
**Type**: Feature
**Complexity**: SMALL
**Estimated Lines**: ~200 lines

## Objective
Implement key storage and retrieval from environment variables and files, enabling the server to load signing keys at startup.

## Affected Areas
- `src/services/key-management/key-storage.ts`: New file - storage service
- `src/services/key-management/index.ts`: Export new service
- `tests/services/key-management/key-storage.test.ts`: New file - tests

## Implementation Plan

### Step 1: Implement environment variable key loading
**Files**: `src/services/key-management/key-storage.ts`
**Commit**: `feat(keys): add key loading from environment variables`
**Changes**:
- Create `loadKeyPairFromEnv()` function
- Read `KEY_PRIVATE` and `KEY_PUBLIC` env vars
- Parse PEM format keys
- Convert to KeyPair/KeyPairWithJWK using key-generator utilities
- Handle base64-encoded PEM (for single-line env vars)

### Step 2: Implement file-based key storage
**Files**: `src/services/key-management/key-storage.ts`
**Commit**: `feat(keys): add file-based key storage`
**Changes**:
- Create `loadKeyPairFromFile(path: string)` function
- Create `saveKeyPairToFile(keyPair: KeyPair, path: string)` function
- Support `OB_SIGNING_KEY` env var for file path
- Use Bun.file for file I/O
- Validate file exists and is readable

### Step 3: Implement getActiveKey orchestration
**Files**: `src/services/key-management/key-storage.ts`
**Commit**: `feat(keys): add getActiveKey with priority loading`
**Changes**:
- Create `getActiveKey()` function
- Priority: 1) Env vars, 2) File path from OB_SIGNING_KEY
- Cache loaded key in memory
- Optional auto-generate if no key found (configurable)

### Step 4: Add unit tests
**Files**: `tests/services/key-management/key-storage.test.ts`
**Commit**: `test(keys): add key storage unit tests`
**Changes**:
- Test loadKeyPairFromEnv with valid PEM
- Test loadKeyPairFromEnv with base64-encoded PEM
- Test loadKeyPairFromFile
- Test saveKeyPairToFile
- Test getActiveKey priority logic
- Test error handling for missing/invalid keys

## Testing Strategy
- [x] Unit tests for env var loading
- [x] Unit tests for file I/O
- [x] Unit tests for getActiveKey orchestration
- [x] Error handling tests

## Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `KEY_PRIVATE` | Private key in PEM format | `-----BEGIN PRIVATE KEY-----...` |
| `KEY_PUBLIC` | Public key in PEM format | `-----BEGIN PUBLIC KEY-----...` |
| `OB_SIGNING_KEY` | Path to key pair file | `./keys/signing-key.json` |
| `KEY_AUTO_GENERATE` | Auto-generate key if none found | `true` |

## Definition of Done
- [ ] All implementation steps complete
- [ ] Tests passing
- [ ] Type-check passing
- [ ] Lint passing
- [ ] Ready for PR

## Notes
- Keys in env vars can be base64-encoded for single-line storage
- File storage uses JSON format with both PEM and JWK representations
- Memory caching prevents repeated file reads
- Compatible with existing `OB_SIGNING_KEY` env var from docs
