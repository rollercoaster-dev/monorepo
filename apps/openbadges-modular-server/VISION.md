# openbadges-modular-server Vision

**Status:** Draft
**Last Updated:** 2025-01-16

---

## Purpose

OB 2.0 and 3.0 compliant badge API server. Easy to deploy, works locally, scales when needed.

---

## Philosophy

### Easy to Deploy

Small organizations shouldn't need a DevOps team to run a badge server.

- **SQLite by default** - No database server needed
- **Docker image ready** - One command to run
- **PostgreSQL when you scale** - Same code, different config
- **Sensible defaults** - Works out of the box

### Spec Compliant

Implementing Open Badges correctly is hard. We did it once so you don't have to.

- Full OB 2.0 support (hosted verification)
- Full OB 3.0 support (Verifiable Credentials)
- OpenAPI documentation at `/docs`
- Proper JSON-LD contexts

### Federation-Ready (Not Federation-Required)

The architecture supports connecting to other badge servers later. But you can run standalone forever if you want.

- Local-first operation
- No external dependencies required
- Federation is opt-in, not mandatory

---

## What We Provide

### Core API

**Issuers:** Create and manage badge issuers
- CRUD operations
- DID document generation (did:web)
- Profile management

**Badge Classes:** Define achievement types
- CRUD operations
- Criteria and alignment
- Image management

**Assertions:** Issue badges to recipients
- Create and revoke
- Evidence attachment
- Recipient identity handling

### Badge Generator (Baking)

Embed credentials directly into images:

```
POST /api/assertions/{id}/bake
{
  "format": "png",  // or "svg"
  "image": "<base64-encoded-image>"
}
```

Returns a PNG or SVG with the credential embedded in metadata. Portable, verifiable, shareable.

### Verification

```
POST /api/verify
{
  "credential": "<OB2 or OB3 credential>"
}

POST /api/verify/baked
{
  "image": "<base64-encoded-baked-image>"
}
```

- Signature verification
- Tamper detection
- Revocation checking
- Status list support

### Cryptographic Signing

- Ed25519 keys (eddsa-rdfc-2022 cryptosuite)
- File-based key storage
- JWKS endpoint for key discovery
- DID document generation

---

## For Small Organizations

```bash
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
docker run -p 3000:3000 -v ./data:/app/data ghcr.io/rollercoaster-dev/openbadges-modular-server
```

That's it. You have a badge server.

**Data stays local:**
- SQLite database in `./data`
- Keys in `./data/keys`
- No cloud required

---

## For Partners

Integrate the API into your existing systems:

- RESTful endpoints
- OpenAPI spec for code generation
- JWT authentication
- API key support

Use your own frontend. We handle the badge logic.

---

## Modular Database Architecture

Adding new databases is straightforward. The architecture uses a factory + interface pattern:

```
DatabaseFactory (registry)
    ↓ registers
DatabaseModuleInterface (contract for modules)
    ↓ creates
DatabaseInterface (contract for database operations)
```

**Currently supported:**
- SQLite (default, zero-config)
- PostgreSQL (production scale)

**To add a new database (e.g., MongoDB):**
1. Create `modules/mongodb/mongodb.module.ts` implementing `DatabaseModuleInterface`
2. Create `modules/mongodb/services/mongodb-database.service.ts` implementing `DatabaseInterface`
3. Add mappers and repositories following existing patterns
4. Register in `database.factory.ts`

The `DatabaseInterface` includes all CRUD operations, health monitoring, transactions, and pagination - implement once, works everywhere.

---

## Current Focus

1. **Stability** - Production-ready for basic badge workflows
2. **OB3 completeness** - Full Verifiable Credentials support
3. **Documentation** - Clear API docs and integration guides
4. **Testing** - E2E tests for all workflows

---

## Future Direction

These are goals, not current work:

- **Status List 2021** - Credential revocation at scale
- **Federation protocol** - Connect badge servers into networks
- **Backup/restore** - Easy data migration
- **Multi-tenancy** - Multiple organizations on one server

---

## Related

- [API Documentation](/docs endpoint when running)
- [CLAUDE.md](CLAUDE.md) - Development context
- [Ecosystem Vision](../../apps/docs/vision/openbadges-ecosystem.md)
