# Badge Baking Implementation Plan

This document outlines the implementation plan for Open Badges 3.0 badge baking in openbadges-modular-server.

## Overview

Badge baking embeds a signed Verifiable Credential (VC) into a badge image (PNG or SVG), making the credential portable and self-contained. This is critical for:

- **Portability**: Recipients can share baked images anywhere
- **Offline verification**: Credentials can be verified without server connectivity
- **Visual + data**: Single file contains both display and credential

> **Important**: Baking is for **portability**, not verification. Verification relies on cryptographic proofs, regardless of whether the credential is baked or not.

---

## Prerequisites (Must Complete First)

### 1. JWKS Endpoint (Phase 6)

**What**: Publish issuer's public keys at `/.well-known/jwks.json`

**Why**: Verifiers need to discover the issuer's public key to validate JWT proofs

**Implementation**:

```typescript
// src/api/controllers/well-known.controller.ts
import { Hono } from "hono";
import { getIssuerJWKS } from "../services/key-management.service";

const wellKnown = new Hono();

// GET /.well-known/jwks.json
wellKnown.get("/jwks.json", async (c) => {
  const jwks = await getIssuerJWKS();
  return c.json(jwks);
});

export { wellKnown };
```

**Response Format**:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "n": "...",
      "e": "AQAB",
      "alg": "RS256",
      "kid": "key-2024-01",
      "use": "sig"
    }
  ]
}
```

**Tasks**:

- [ ] Create key management service
- [ ] Implement JWKS endpoint
- [ ] Add key rotation support
- [ ] Document key generation process

### 2. DID:web Document (Phase 6 - Optional but Recommended)

**What**: Publish DID document at `/.well-known/did.json`

**Why**: DIDs provide a standardized way to identify issuers and locate verification methods

**Implementation**:

```typescript
// GET /.well-known/did.json
wellKnown.get("/did.json", async (c) => {
  const baseUrl = config.baseUrl; // e.g., https://badges.example.com
  const jwks = await getIssuerJWKS();

  return c.json({
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: `did:web:${new URL(baseUrl).host}`,
    verificationMethod: jwks.keys.map((key, i) => ({
      id: `did:web:${new URL(baseUrl).host}#key-${i}`,
      type: "JsonWebKey2020",
      controller: `did:web:${new URL(baseUrl).host}`,
      publicKeyJwk: key,
    })),
    authentication: jwks.keys.map(
      (_, i) => `did:web:${new URL(baseUrl).host}#key-${i}`,
    ),
    assertionMethod: jwks.keys.map(
      (_, i) => `did:web:${new URL(baseUrl).host}#key-${i}`,
    ),
  });
});
```

**Tasks**:

- [ ] Implement DID document endpoint
- [ ] Update issuer profiles to use DID
- [ ] Test with DID resolvers

---

## Baking Service Implementation (Phase 4)

### Service Interface

```typescript
// src/services/baking/baking.service.ts

interface BakingService {
  /**
   * Bake a credential into a PNG image
   * @param imageBuffer - Original PNG image data
   * @param credential - Signed VerifiableCredential
   * @returns Baked PNG with credential in iTXt chunk
   */
  bakePNG(
    imageBuffer: Buffer,
    credential: VerifiableCredential,
  ): Promise<Buffer>;

  /**
   * Bake a credential into an SVG image
   * @param svgContent - Original SVG markup
   * @param credential - Signed VerifiableCredential
   * @returns Baked SVG with credential in openbadges namespace
   */
  bakeSVG(
    svgContent: string,
    credential: VerifiableCredential,
  ): Promise<string>;

  /**
   * Extract credential from a baked PNG
   * @param imageBuffer - Baked PNG image data
   * @returns Extracted VerifiableCredential or null
   */
  unbakePNG(imageBuffer: Buffer): Promise<VerifiableCredential | null>;

  /**
   * Extract credential from a baked SVG
   * @param svgContent - Baked SVG markup
   * @returns Extracted VerifiableCredential or null
   */
  unbakeSVG(svgContent: string): Promise<VerifiableCredential | null>;
}
```

### PNG Baking Implementation

```typescript
// src/services/baking/png-baking.service.ts
import { encode as encodePNG, decode as decodePNG } from "png-chunks-encode";
import extractChunks from "png-chunks-extract";
import { text as textEncode } from "png-chunk-text";

const OPENBADGES_KEYWORD = "openbadges";

export async function bakePNG(
  imageBuffer: Buffer,
  credential: VerifiableCredential,
): Promise<Buffer> {
  // 1. Extract existing chunks
  const chunks = extractChunks(imageBuffer);

  // 2. Remove any existing openbadges chunk
  const filteredChunks = chunks.filter(
    (chunk) =>
      !(chunk.name === "iTXt" && chunk.data.includes(OPENBADGES_KEYWORD)),
  );

  // 3. Create new iTXt chunk with credential
  const credentialJson = JSON.stringify(credential);
  const iTXtChunk = createiTXtChunk(OPENBADGES_KEYWORD, credentialJson);

  // 4. Insert before IEND
  const iendIndex = filteredChunks.findIndex((c) => c.name === "IEND");
  filteredChunks.splice(iendIndex, 0, iTXtChunk);

  // 5. Encode back to PNG
  return Buffer.from(encodePNG(filteredChunks));
}

function createiTXtChunk(keyword: string, text: string): PNGChunk {
  // iTXt format: keyword + null + compression flag (0) + compression method (0)
  // + language tag + null + translated keyword + null + text
  const keywordBuf = Buffer.from(keyword, "latin1");
  const textBuf = Buffer.from(text, "utf8");

  const data = Buffer.concat([
    keywordBuf,
    Buffer.from([0]), // Null separator
    Buffer.from([0]), // Compression flag (0 = uncompressed, REQUIRED by spec)
    Buffer.from([0]), // Compression method
    Buffer.from([0]), // Language tag (empty)
    Buffer.from([0]), // Translated keyword (empty)
    textBuf,
  ]);

  return { name: "iTXt", data };
}
```

### SVG Baking Implementation

```typescript
// src/services/baking/svg-baking.service.ts

const OPENBADGES_NS = "http://openbadges.org";

export async function bakeSVG(
  svgContent: string,
  credential: VerifiableCredential,
): Promise<string> {
  // 1. Parse SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svg = doc.documentElement;

  // 2. Add openbadges namespace if not present
  if (!svg.getAttribute("xmlns:openbadges")) {
    svg.setAttribute("xmlns:openbadges", OPENBADGES_NS);
  }

  // 3. Remove existing assertion element
  const existingAssertion = doc.getElementsByTagNameNS(
    OPENBADGES_NS,
    "assertion",
  )[0];
  if (existingAssertion) {
    existingAssertion.remove();
  }

  // 4. Create new assertion element
  const assertionElement = doc.createElementNS(
    OPENBADGES_NS,
    "openbadges:assertion",
  );
  assertionElement.setAttribute("verify", credential.id || "");

  // 5. Add credential as CDATA
  const cdata = doc.createCDATASection(JSON.stringify(credential));
  assertionElement.appendChild(cdata);

  // 6. Insert as first child of SVG
  svg.insertBefore(assertionElement, svg.firstChild);

  // 7. Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}
```

### Libraries to Use

| Library              | Purpose                       | Install                      |
| -------------------- | ----------------------------- | ---------------------------- |
| `png-chunks-extract` | Extract chunks from PNG       | `bun add png-chunks-extract` |
| `png-chunks-encode`  | Encode chunks to PNG          | `bun add png-chunks-encode`  |
| `@xmldom/xmldom`     | Parse/serialize SVG (Node.js) | `bun add @xmldom/xmldom`     |

---

## API Endpoints

### Bake Credential Endpoint

```typescript
// POST /v3/credentials/:id/bake
bakingController.post("/:id/bake", async (c) => {
  const credentialId = c.req.param("id");
  const { format = "svg" } = await c.req.json();

  // 1. Fetch the credential (with proof)
  const credential = await credentialRepository.findById(credentialId);
  if (!credential) {
    return c.json({ error: "Credential not found" }, 404);
  }

  // 2. Get the BadgeClass image
  const badgeClass = await badgeClassRepository.findById(
    credential.credentialSubject.achievement.id,
  );
  const imageUrl = badgeClass.image;

  // 3. Fetch and bake
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  let bakedImage: Buffer | string;
  let contentType: string;

  if (format === "png") {
    bakedImage = await bakingService.bakePNG(imageBuffer, credential);
    contentType = "image/png";
  } else {
    const svgContent = imageBuffer.toString("utf8");
    bakedImage = await bakingService.bakeSVG(svgContent, credential);
    contentType = "image/svg+xml";
  }

  // 4. Return baked image
  return new Response(bakedImage, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="badge-${credentialId}.${format}"`,
    },
  });
});
```

### Verify Baked Image Endpoint

```typescript
// POST /v3/verify/baked
verifyController.post("/baked", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // 1. Detect format and unbake
  const buffer = Buffer.from(await file.arrayBuffer());
  let credential: VerifiableCredential | null = null;

  if (file.type === "image/png" || file.name.endsWith(".png")) {
    credential = await bakingService.unbakePNG(buffer);
  } else if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
    const svgContent = buffer.toString("utf8");
    credential = await bakingService.unbakeSVG(svgContent);
  }

  if (!credential) {
    return c.json({
      valid: false,
      error: "No credential found in image",
    });
  }

  // 2. Verify the credential
  const verificationResult = await verificationService.verify(credential);

  return c.json({
    valid: verificationResult.valid,
    credential: verificationResult.valid ? credential : undefined,
    checks: verificationResult.checks,
    errors: verificationResult.errors,
  });
});
```

### Verify Credential Endpoint

```typescript
// POST /v3/verify
verifyController.post("/", async (c) => {
  const credential = await c.req.json();

  const result = await verificationService.verify(credential);

  return c.json({
    valid: result.valid,
    checks: {
      proofValid: result.proofValid,
      issuerValid: result.issuerValid,
      notExpired: result.notExpired,
      notRevoked: result.notRevoked,
    },
    errors: result.errors,
  });
});
```

---

## Verification Service

```typescript
// src/services/verification/verification.service.ts

interface VerificationResult {
  valid: boolean;
  proofValid: boolean;
  issuerValid: boolean;
  notExpired: boolean;
  notRevoked: boolean;
  errors: string[];
}

export async function verify(
  credential: VerifiableCredential,
): Promise<VerificationResult> {
  const errors: string[] = [];

  // 1. Check proof
  const proofValid = await verifyProof(credential);
  if (!proofValid) {
    errors.push("Cryptographic proof verification failed");
  }

  // 2. Check issuer (resolve DID/JWKS)
  const issuerValid = await verifyIssuer(credential);
  if (!issuerValid) {
    errors.push("Issuer verification failed");
  }

  // 3. Check expiration
  const notExpired = !isExpired(credential);
  if (!notExpired) {
    errors.push("Credential has expired");
  }

  // 4. Check revocation (Phase 7)
  const notRevoked = await checkRevocationStatus(credential);
  if (!notRevoked) {
    errors.push("Credential has been revoked");
  }

  return {
    valid: proofValid && issuerValid && notExpired && notRevoked,
    proofValid,
    issuerValid,
    notExpired,
    notRevoked,
    errors,
  };
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/services/baking.service.test.ts

describe("BakingService", () => {
  describe("bakePNG", () => {
    it("should embed credential in iTXt chunk", async () => {
      const image = await fs.readFile("test-fixtures/badge.png");
      const credential = mockCredential();

      const baked = await bakingService.bakePNG(image, credential);

      // Verify iTXt chunk exists
      const chunks = extractChunks(baked);
      const iTXt = chunks.find((c) => c.name === "iTXt");
      expect(iTXt).toBeDefined();
      expect(iTXt.data.toString()).toContain("openbadges");
    });

    it("should unbake to same credential", async () => {
      const image = await fs.readFile("test-fixtures/badge.png");
      const credential = mockCredential();

      const baked = await bakingService.bakePNG(image, credential);
      const unbaked = await bakingService.unbakePNG(baked);

      expect(unbaked).toEqual(credential);
    });
  });

  describe("bakeSVG", () => {
    it("should add openbadges namespace and assertion element", async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      const credential = mockCredential();

      const baked = await bakingService.bakeSVG(svg, credential);

      expect(baked).toContain('xmlns:openbadges="http://openbadges.org"');
      expect(baked).toContain("<openbadges:assertion");
    });
  });
});
```

### E2E Tests

```typescript
// tests/e2e/baking.e2e.test.ts

describe("Baking E2E", () => {
  it("should bake and verify a credential", async () => {
    // 1. Create issuer and badge class
    const issuer = await createTestIssuer();
    const badgeClass = await createTestBadgeClass(issuer.id);

    // 2. Issue credential
    const credential = await issueCredential(badgeClass.id, "test@example.com");

    // 3. Bake
    const bakedResponse = await fetch(
      `${API_URL}/v3/credentials/${credential.id}/bake`,
      {
        method: "POST",
        body: JSON.stringify({ format: "svg" }),
      },
    );
    const bakedSvg = await bakedResponse.text();

    // 4. Verify baked image
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([bakedSvg], { type: "image/svg+xml" }),
      "badge.svg",
    );

    const verifyResponse = await fetch(`${API_URL}/v3/verify/baked`, {
      method: "POST",
      body: formData,
    });
    const result = await verifyResponse.json();

    expect(result.valid).toBe(true);
    expect(result.credential.id).toBe(credential.id);
  });
});
```

---

## Implementation Order

| Step | Task                   | Depends On    | Priority |
| ---- | ---------------------- | ------------- | -------- |
| 1    | Key management service | -             | High     |
| 2    | JWKS endpoint          | Step 1        | High     |
| 3    | DID:web endpoint       | Step 1        | Medium   |
| 4    | PNG baking service     | -             | High     |
| 5    | SVG baking service     | -             | High     |
| 6    | Bake endpoint          | Steps 4, 5    | High     |
| 7    | Verification service   | Steps 2, 3    | High     |
| 8    | Verify endpoint        | Step 7        | High     |
| 9    | Verify baked endpoint  | Steps 4, 5, 7 | Medium   |
| 10   | Unit tests             | Steps 4, 5, 7 | High     |
| 11   | E2E tests              | All           | Medium   |

---

## Related Issues

Create these GitHub issues to track implementation:

1. **feat: Implement key management service** - Phase 6
2. **feat: Add JWKS endpoint (/.well-known/jwks.json)** - Phase 6
3. **feat: Add DID:web document endpoint** - Phase 6
4. **feat: Implement PNG baking service** - Phase 4
5. **feat: Implement SVG baking service** - Phase 4
6. **feat: Add bake credential endpoint (POST /v3/credentials/:id/bake)** - Phase 4
7. **feat: Implement verification service** - Phase 6
8. **feat: Add verify endpoint (POST /v3/verify)** - Phase 6
9. **feat: Add verify baked image endpoint** - Phase 4

---

## Related Documents

- [OB 3.0 Roadmap](./ob3-roadmap.md) - Overall implementation phases
- [Badge Visual Effects Research](../../docs/research/BADGE_VISUAL_EFFECTS_RESEARCH.md) - Visual effects & baking constraints
- [Badge Builder Concept](../../docs/research/OPENBADGES_BADGE_BUILDER_CONCEPT.md) - Badge builder integration

---

_Document Version: 1.0_
_Date: November 2025_
_Author: Rollercoaster.dev Team_
