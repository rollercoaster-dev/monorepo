# Badge Visual Effects & Animated Sharing Research

This document explores advanced visual effects for digital badges and the possibilities/constraints around animated badge sharing.

## Overview

Making badges "special" requires a multi-layered approach:

1. **In-app experience** - Rich CSS/WebGL effects for interactive viewing
2. **Baked badge exports** - PNG/SVG with embedded credential metadata
3. **Animated exports** - For enhanced sharing (with constraints)
4. **Share pages** - Interactive verification pages with live effects

---

## Critical Constraint: Open Badges Baking

### What is Badge Baking?

"Badge Baking is the process of taking an Assertion and embedding it into the badge image, so that when a user displays a badge on a page, software that is OpenBadges-aware can automatically extract that Assertion data and perform the checks necessary to see if a person legitimately earned the badge."

> ⚠️ **Important OB 2.0 vs OB 3.0 Distinction:**
>
> - **OB 2.0**: The badge image IS the credential - baking is how verification data is stored
> - **OB 3.0**: The credential is a **Verifiable Credential (JSON-LD)** with cryptographic proof - the image is **optional** and baking is for **portability**, not verification

### Supported Formats (Specification Requirement)

| Format   | Baking Support            | Animation Support | Notes               |
| -------- | ------------------------- | ----------------- | ------------------- |
| **PNG**  | Yes (iTXt chunk)          | No\*              | Standard format     |
| **SVG**  | Yes (XML namespace)       | **Yes (SMIL)**    | Best for animation! |
| **APNG** | Likely\* (iTXt preserved) | Yes               | Needs verification  |
| GIF      | **No**                    | Yes               | NOT SUPPORTED       |
| WebP     | **No**                    | Yes               | NOT SUPPORTED       |
| MP4/WebM | **No**                    | Yes               | NOT SUPPORTED       |

\*APNG uses the same chunk structure as PNG, so iTXt metadata should be preserved, but this needs testing.

### PNG Baking Technical Details

```
PNG File Structure:
┌─────────────────────────────────────┐
│ PNG Signature                        │
├─────────────────────────────────────┤
│ IHDR (Image Header)                  │
├─────────────────────────────────────┤
│ iTXt Chunk (keyword: "openbadges")  │  ← Assertion JSON or signature
│   - Compression: MUST NOT be used    │
│   - Only ONE openbadges chunk        │
├─────────────────────────────────────┤
│ IDAT (Image Data)                    │
├─────────────────────────────────────┤
│ IEND (End)                           │
└─────────────────────────────────────┘
```

### SVG Baking Technical Details

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:openbadges="http://openbadges.org"
     viewBox="0 0 100 100">

  <!-- Assertion data embedded here -->
  <openbadges:assertion verify="https://example.com/assertions/123">
    <![CDATA[
      { "@context": "https://w3id.org/openbadges/v2", ... }
    ]]>
  </openbadges:assertion>

  <!-- Badge visual elements -->
  <circle cx="50" cy="50" r="45" fill="#gold"/>

  <!-- SMIL animations work AND preserve baked data! -->
  <circle cx="50" cy="50" r="40">
    <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
  </circle>

</svg>
```

### Open Badges 3.0: Verifiable Credentials Model

OB 3.0 fundamentally changes how badges work by aligning with the W3C Verifiable Credentials (VC) data model:

| Aspect                  | OB 2.0 (Hosted)            | OB 3.0 (Verifiable Credentials)  |
| ----------------------- | -------------------------- | -------------------------------- |
| **Primary credential**  | Baked image or hosted JSON | JSON-LD with cryptographic proof |
| **Image role**          | IS the credential          | **Optional**, for display only   |
| **Verification**        | Contact issuer server      | Verify cryptographic signature   |
| **Issuer dependency**   | Issuer must stay online    | Works even if issuer disappears  |
| **Tampering detection** | Re-fetch from issuer       | **Signature validation fails**   |

#### Cryptographic Proofs in OB 3.0

OB 3.0 credentials include a `proof` property with a cryptographic signature:

**Two Proof Formats Supported:**

1. **JWT (JSON Web Token)** - Credential wrapped in signed JWS
   - Algorithm: RS256 or EdDSA
   - Issuer's public key published as JWK at `/.well-known/jwks.json`

2. **Linked Data Proof** - Embedded signature in credential
   - `DataIntegrityProof` with `eddsa-rdfc-2022` or `ecdsa-sd-2023`
   - Signature covers normalized credential + proof metadata

**Example OB 3.0 Credential with Proof:**

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/ob/v3p0/context-3.0.3.json"
  ],
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "did:web:example.com",
    "type": "Profile",
    "name": "Example Issuer"
  },
  "credentialSubject": {
    "type": "AchievementSubject",
    "achievement": {
      /* BadgeClass data */
    }
  },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-rdfc-2022",
    "verificationMethod": "did:web:example.com#key-1",
    "proofValue": "z58DAdFfa9SkqZMVPxAQpic7ndTeel..."
  }
}
```

#### SVG Editability & Tamper Detection

**Your concern about SVG editability is valid but handled by cryptographic proofs:**

```
┌─────────────────────────────────────────────────────────────────┐
│                     SVG Tampering Detection                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Original Baked SVG              Edited SVG                     │
│  ┌─────────────────┐            ┌─────────────────┐             │
│  │ Credential JSON │    Edit    │ Credential JSON │  Same proof │
│  │ + Proof         │    ───→    │ + Proof         │  but visual │
│  │ + Visual content│            │ + CHANGED visual│  changed!   │
│  └─────────────────┘            └─────────────────┘             │
│          │                              │                        │
│          ▼                              ▼                        │
│  ┌─────────────────┐            ┌─────────────────┐             │
│  │   Verification  │            │   Verification  │             │
│  │   hash(original)│            │   hash(edited)  │             │
│  │   == signature ✓│            │   ≠ signature ✗ │             │
│  └─────────────────┘            └─────────────────┘             │
│                                                                  │
│        VALID ✅                      TAMPERED ❌                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight**: The cryptographic proof is calculated over the **entire credential content**. If someone edits the SVG (visual or metadata), the hash won't match the signature, and verification fails.

**Requirements for this to work:**

1. Credential must include a cryptographic proof (Phase 5 in our roadmap)
2. Issuer's public key must be discoverable (JWKS/DID - Phase 6)
3. Verifiers must actually check the proof (verification endpoint needed)

### Key Implications for Visual Effects

1. **GIF/MP4/WebM cannot be "official" badges** - They lack baking support
2. **SVG with SMIL = Best animated badge format** - Full animation + baked metadata
3. **Animated exports are for display only** - They're marketing materials, not credentials
4. **Share pages are critical** - Where the real credential lives

### Current openbadges-modular-server Status

Per `docs/ob3-roadmap.md` and the changelog, here's the implementation status:

| Phase | Feature                     | Status     | Notes                             |
| ----- | --------------------------- | ---------- | --------------------------------- |
| 5     | **JWT Proof Generation**    | ✅ Done    | PR #54 merged                     |
| 5     | VC Envelope                 | ✅ Partial | `/v3/assertions` returns VC-JSON  |
| 4     | **Baked Images Helper**     | ⏳ Pending | No baking logic exists            |
| 6     | **JWKS/DID:web**            | ⏳ Pending | Required for offline verification |
| 7     | StatusList2021 (revocation) | ⏳ Pending | VC-native revocation              |

**Current State:**

- `BadgeClass.image` stores a URL/IRI reference (not baked data)
- `AssetsController` uploads raw images (PNG, SVG, GIF, WebP, PDF)
- JWT proof generation is implemented but baking is not
- No `/.well-known/jwks.json` endpoint yet

**What Needs to Be Built (in order):**

#### 1. JWKS/DID Endpoint (Phase 6 - Required First!)

```typescript
// GET /.well-known/jwks.json
{
  "keys": [{
    "kty": "OKP",
    "crv": "Ed25519",
    "x": "base64url-encoded-public-key",
    "kid": "key-1",
    "use": "sig"
  }]
}
```

Without this, verifiers cannot validate proofs!

#### 2. Baking Service (Phase 4)

```typescript
// Future: src/services/badge-baking.service.ts

interface BakingService {
  // Bake a signed credential into an image
  bakePNG(
    imageBuffer: Buffer,
    credential: VerifiableCredential,
  ): Promise<Buffer>;
  bakeSVG(
    svgContent: string,
    credential: VerifiableCredential,
  ): Promise<string>;

  // Extract credential from baked image
  unbakePNG(imageBuffer: Buffer): Promise<VerifiableCredential>;
  unbakeSVG(svgContent: string): Promise<VerifiableCredential>;
}
```

**Key difference from original plan**: We bake the **signed VerifiableCredential** (with proof), not just the assertion URL!

#### 3. Baking API Endpoints

```
# Bake a credential into its badge image
POST /v3/credentials/:id/bake
Content-Type: application/json
{ "format": "svg" | "png" }

Response: Baked image file with embedded VC

# Verify a baked image
POST /v3/verify/baked
Content-Type: multipart/form-data
file: <baked-image>

Response: { valid: boolean, credential?: VerifiableCredential, errors?: string[] }
```

#### 4. Verification Endpoint

```typescript
// POST /v3/verify
// Verify any credential (baked or JSON)
async function verifyCredential(credential: VerifiableCredential): Promise<{
  valid: boolean;
  checks: {
    proofValid: boolean; // Cryptographic signature verified
    issuerValid: boolean; // Issuer DID/JWKS resolved
    notExpired: boolean; // credentialStatus check
    notRevoked: boolean; // StatusList2021 check (Phase 7)
  };
  errors?: string[];
}>;
```

**Recommended Libraries:**

- `png-chunks-extract` / `png-chunks-encode` - For PNG iTXt manipulation
- `fast-xml-parser` - For SVG XML manipulation
- `@digitalbazaar/ed25519-signature-2020` - For Linked Data Proofs
- `jose` - For JWT proof verification (already likely in use)

---

## 1. Glassmorphism Design

### Core Technique

Glassmorphism creates a "frosted glass" effect using:

```css
.glass-badge {
  /* Semi-transparent background */
  background: rgba(255, 255, 255, 0.15);

  /* The magic: blur what's behind */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  /* Subtle border for definition */
  border: 1px solid rgba(255, 255, 255, 0.18);

  /* Optional: inner glow */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 0 32px rgba(255, 255, 255, 0.1);
}
```

### Key Parameters

| Property           | Recommended Range | Effect                      |
| ------------------ | ----------------- | --------------------------- |
| Background opacity | 0.05 - 0.25       | Higher = more visible glass |
| Blur radius        | 8px - 20px        | Higher = more frosted       |
| Border opacity     | 0.1 - 0.3         | Subtle edge definition      |

### Requirements & Constraints

- **Vibrant background required** - Glass effect is invisible on plain backgrounds
- **Performance impact** - `backdrop-filter` is GPU-intensive; use sparingly
- **Accessibility concern** - Text contrast may fail WCAG; test carefully
- **Browser support** - Excellent (95%+ as of 2024)

### Badge Application Ideas

- Badge card containers with glass panels
- Achievement level indicators
- Skill category headers
- Verification status overlays

---

## 2. 3D Perspective & Card Tilt Effects

### CSS Perspective Foundation

```css
/* Parent container sets the 3D space */
.badge-container {
  perspective: 800px; /* Lower = more dramatic */
}

/* Child element transforms in 3D */
.badge-card {
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}

/* Example tilt on hover */
.badge-card:hover {
  transform: rotateX(5deg) rotateY(-5deg) scale(1.02);
}
```

### Interactive Tilt (JavaScript)

For cursor-following tilt (like the frontend.fyi tutorial):

```javascript
function handleMouseMove(e, element) {
  const rect = element.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const centerX = rect.width / 2;
  const centerY = rect.height / 2;

  const rotateX = (y - centerY) / 10; // Adjust divisor for sensitivity
  const rotateY = (centerX - x) / 10;

  element.style.transform = `
    perspective(800px)
    rotateX(${rotateX}deg)
    rotateY(${rotateY}deg)
    scale(1.02)
  `;
}
```

### Existing Libraries

- **vanilla-tilt.js** - Lightweight, popular
- **tilt.js** - jQuery-based
- **react-tilt** / **vue-tilt** - Framework-specific

---

## 3. Holographic / Iridescent Effects

### The Gold Standard: Pokemon Cards CSS

The [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css) project is the definitive reference for trading card holographic effects.

**Live demo**: https://poke-holo.simey.me/

### Techniques Used

1. **Layered gradients** - Multiple overlapping color gradients
2. **Blend modes** - `mix-blend-mode` and `background-blend-mode`
3. **CSS filters** - Brightness, contrast, saturation adjustments
4. **Cursor-reactive positioning** - Gradients shift based on mouse position
5. **Texture overlays** - Pattern images for sparkle/grain effects

### Simplified Holographic Implementation

```css
.holo-badge {
  position: relative;
  overflow: hidden;
}

/* Base holographic gradient */
.holo-badge::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    125deg,
    rgba(255, 0, 0, 0.3) 0%,
    rgba(255, 154, 0, 0.3) 10%,
    rgba(208, 222, 33, 0.3) 20%,
    rgba(79, 220, 74, 0.3) 30%,
    rgba(63, 218, 216, 0.3) 40%,
    rgba(47, 201, 226, 0.3) 50%,
    rgba(28, 127, 238, 0.3) 60%,
    rgba(95, 21, 242, 0.3) 70%,
    rgba(186, 12, 248, 0.3) 80%,
    rgba(251, 7, 217, 0.3) 90%,
    rgba(255, 0, 0, 0.3) 100%
  );
  background-size: 200% 200%;
  mix-blend-mode: color-dodge;
  opacity: 0;
  transition: opacity 0.3s;
}

.holo-badge:hover::before {
  opacity: 1;
  animation: holo-shift 3s ease infinite;
}

@keyframes holo-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
```

### Shimmer / Shine Effect

```css
.shimmer-badge {
  position: relative;
  overflow: hidden;
}

.shimmer-badge::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  transform: skewX(-25deg);
}

.shimmer-badge:hover::after {
  animation: shimmer 1.5s ease;
}

@keyframes shimmer {
  to {
    left: 150%;
  }
}
```

### Performance Considerations

- Blend modes are GPU-intensive
- Limit concurrent animated badges (max 3-5 on screen)
- Consider `will-change: transform` for smoother animations
- Provide reduced-motion alternatives

---

## 4. SVG Animations (The Key to Animated Baked Badges!)

**This is the most important section** - SVG with SMIL animations is the ONLY way to have animated badges that also contain baked credential metadata.

### Why SVG + SMIL?

| Feature                   | CSS Animation | SMIL Animation       |
| ------------------------- | ------------- | -------------------- |
| Works in `<img>` tag      | No            | **Yes**              |
| Works as background-image | No            | **Yes**              |
| Works when downloaded     | No            | **Yes**              |
| Preserves baked metadata  | N/A           | **Yes**              |
| Browser support           | 95%+          | 95%+ (except old IE) |

### CSS Animations (In-App Only)

CSS animations only work when SVG is inline in the DOM:

```css
/* Only works for inline SVG, NOT downloaded files */
.badge-icon {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}
```

### SMIL Animations (Portable & Baked!)

SMIL animations are embedded IN the SVG file and work everywhere:

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:openbadges="http://openbadges.org"
     viewBox="0 0 100 100">

  <!-- BAKED ASSERTION DATA -->
  <openbadges:assertion verify="https://example.com/assertions/123"/>

  <!-- Animated badge with SMIL -->
  <defs>
    <radialGradient id="gold-gradient">
      <stop offset="0%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </radialGradient>
  </defs>

  <!-- Pulsing outer ring -->
  <circle cx="50" cy="50" r="45" fill="none" stroke="url(#gold-gradient)" stroke-width="3">
    <animate
      attributeName="stroke-opacity"
      values="0.5;1;0.5"
      dur="2s"
      repeatCount="indefinite"
    />
  </circle>

  <!-- Breathing badge body -->
  <circle cx="50" cy="50" r="40" fill="url(#gold-gradient)">
    <animate
      attributeName="r"
      values="38;42;38"
      dur="3s"
      repeatCount="indefinite"
    />
  </circle>

  <!-- Rotating sparkle decoration -->
  <g transform="translate(50,50)">
    <path d="M0,-35 L2,-2 L35,0 L2,2 L0,35 L-2,2 L-35,0 L-2,-2 Z"
          fill="#fff" opacity="0.6">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to="360"
        dur="10s"
        repeatCount="indefinite"
      />
    </path>
  </g>

  <!-- Shimmer effect -->
  <rect x="0" y="0" width="100" height="100" fill="url(#shimmer)" opacity="0.3">
    <animate
      attributeName="x"
      values="-100;100"
      dur="3s"
      repeatCount="indefinite"
    />
  </rect>

</svg>
```

### SMIL Animation Elements

| Element              | Purpose                  | Example                   |
| -------------------- | ------------------------ | ------------------------- |
| `<animate>`          | Animate single attribute | Opacity, radius, position |
| `<animateTransform>` | Transform animations     | Rotate, scale, translate  |
| `<animateMotion>`    | Move along path          | Orbiting elements         |
| `<set>`              | Set value at time        | Delayed visibility        |

### Holographic Effect in SVG

```svg
<!-- Holographic gradient overlay with animation -->
<defs>
  <linearGradient id="holo" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#ff0000" stop-opacity="0.2">
      <animate attributeName="stop-color"
               values="#ff0000;#00ff00;#0000ff;#ff0000"
               dur="4s" repeatCount="indefinite"/>
    </stop>
    <stop offset="50%" stop-color="#00ff00" stop-opacity="0.2">
      <animate attributeName="stop-color"
               values="#00ff00;#0000ff;#ff0000;#00ff00"
               dur="4s" repeatCount="indefinite"/>
    </stop>
    <stop offset="100%" stop-color="#0000ff" stop-opacity="0.2">
      <animate attributeName="stop-color"
               values="#0000ff;#ff0000;#00ff00;#0000ff"
               dur="4s" repeatCount="indefinite"/>
    </stop>
  </linearGradient>
</defs>

<circle cx="50" cy="50" r="45" fill="url(#holo)" style="mix-blend-mode: overlay"/>
```

### Best Practices for Animated Baked SVGs

1. **Keep animations subtle** - Badges may display in many contexts
2. **Use `repeatCount="indefinite"`** for continuous effects
3. **Respect reduced motion** - Include `<style>` with media query
4. **Test in `<img>` context** - Ensure animations work when downloaded
5. **Optimize file size** - Keep SVG under 100KB for fast loading

```svg
<!-- Reduced motion support in SVG -->
<style>
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; }
    animate, animateTransform, animateMotion { display: none; }
  }
</style>
```

### Browser Support for SMIL

| Browser | SMIL Support | Notes                         |
| ------- | ------------ | ----------------------------- |
| Chrome  | Yes          | Was deprecated, now supported |
| Firefox | Yes          | Full support                  |
| Safari  | Yes          | Full support                  |
| Edge    | Yes          | Chromium-based                |
| IE      | No           | Use static fallback           |

---

## 5. Sharing Constraints & Solutions

### The Problem

Social media platforms have significant limitations:

| Platform  | GIF Support      | Animation in OG Preview |
| --------- | ---------------- | ----------------------- |
| LinkedIn  | First frame only | No                      |
| Twitter/X | First frame only | No (cards)              |
| Facebook  | First frame only | No                      |
| Discord   | Full animation   | Limited                 |
| Slack     | Full animation   | Limited                 |

**Key finding**: Open Graph `og:image` tags **do not support animation** - only the first frame displays.

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Badge Sharing Strategy                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. STATIC OG IMAGE                 2. INTERACTIVE SHARE PAGE   │
│  ┌─────────────────────┐           ┌─────────────────────┐     │
│  │  PNG/JPG            │    →      │  Full CSS/JS effects │     │
│  │  1200×630px         │   Link    │  3D tilt, holo, etc. │     │
│  │  Eye-catching       │    to     │  Verification UI     │     │
│  │  "Click to view"    │    →      │  Download options    │     │
│  └─────────────────────┘           └─────────────────────┘     │
│                                                                  │
│  3. DIRECT ANIMATION SHARING                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  GIF/MP4/WebM exports for direct upload to platforms    │   │
│  │  (bypass OG limitations by uploading media directly)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Approach

#### Option A: Interactive Share Page (Best Experience)

1. Generate static, high-quality OG image (1200×630px)
2. Link to dedicated share page with full interactive effects
3. Share page includes:
   - Full holographic/3D badge display
   - Verification status with animated progress
   - Download buttons (PNG, SVG, GIF, MP4)
   - Social sharing buttons for direct media upload
   - Embedded badge JSON-LD for SEO

#### Option B: Animated Export Options

Provide users with export formats for direct sharing:

| Format | Best For                        | File Size | Quality                   |
| ------ | ------------------------------- | --------- | ------------------------- |
| GIF    | Universal compatibility         | Large     | Medium (256 colors)       |
| APNG   | Higher quality                  | Medium    | High (full color + alpha) |
| WebP   | Modern browsers                 | Small     | High                      |
| MP4    | Twitter/Instagram direct upload | Small     | Highest                   |
| WebM   | Discord, web embeds             | Small     | High                      |

---

## 6. Generating Animated Exports

### Browser-Based Video Recording

Using Canvas + MediaRecorder API:

```javascript
import CanvasCapture from "canvas-capture";

async function exportBadgeAnimation(badgeElement, duration = 3000) {
  // Create off-screen canvas
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  // Start recording
  CanvasCapture.init(canvas);
  CanvasCapture.beginGIFRecord({ fps: 30 });

  // Animate badge for duration
  const startTime = Date.now();
  function animate() {
    const elapsed = Date.now() - startTime;
    if (elapsed < duration) {
      // Render badge state to canvas
      renderBadgeFrame(canvas, elapsed);
      requestAnimationFrame(animate);
    } else {
      // Stop and download
      CanvasCapture.stopRecord();
    }
  }
  animate();
}
```

### Recommended Libraries

1. **canvas-capture** - All-in-one solution
   - Exports: MP4, WebM, GIF, PNG sequences
   - npm: `canvas-capture`

2. **CCapture.js** - Battle-tested
   - Good for complex animations
   - Supports TAR, WebM, GIF

3. **MediaRecorder API** - Native browser
   - WebM only (no MP4 in Chrome)
   - Requires ffmpeg.wasm for MP4 conversion

### Server-Side Generation (Future)

For high-quality exports:

- Puppeteer + headless Chrome
- Record CSS animations to video
- Generate consistent, high-quality output
- Offload processing from client

---

## 7. Neurodiversity Considerations

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  .badge-card,
  .holo-badge::before,
  .shimmer-badge::after {
    animation: none !important;
    transition: none !important;
  }

  /* Provide static alternative */
  .holo-badge::before {
    opacity: 0.3;
  }
}
```

### Animation Controls

```vue
<template>
  <div class="badge-display">
    <BadgeCard
      :animated="userPreferences.animations"
      :holographic="userPreferences.holographic"
    />

    <div class="controls">
      <toggle v-model="userPreferences.animations"> Enable animations </toggle>
      <toggle v-model="userPreferences.holographic">
        Enable holographic effect
      </toggle>
    </div>
  </div>
</template>
```

### Theme-Specific Adjustments

| Theme           | Animation Level | Effect Intensity   |
| --------------- | --------------- | ------------------ |
| Default         | Full            | 100%               |
| ADHD-friendly   | Minimal         | 50% (no auto-play) |
| Autism-friendly | None            | 0% (static only)   |
| High contrast   | Reduced         | 30%                |

---

## 8. Implementation Recommendations

### Phase 1: Core Effects (MVP)

1. **3D card tilt** on hover/touch
2. **Subtle shimmer** effect on hover
3. **Glassmorphism** containers for badge cards
4. **Static PNG** export with polished design

### Phase 2: Enhanced Effects

1. **Full holographic** effect (cursor-reactive)
2. **SVG animations** for badge elements
3. **GIF export** for sharing
4. **Interactive share page** with live effects

### Phase 3: Premium Features

1. **MP4/WebM export** with full animations
2. **Customizable effects** per badge tier
3. **Server-side rendering** for consistent output
4. **AR badge viewing** (future)

### Badge Tier Visual Hierarchy

| Tier      | Effects                          | Example           |
| --------- | -------------------------------- | ----------------- |
| Standard  | Subtle shadow, gentle hover      | Course completion |
| Rare      | 3D tilt, shimmer on hover        | Skill mastery     |
| Epic      | Holographic gradient, particles  | Certification     |
| Legendary | Full holo, animated border, glow | Major achievement |

---

## 9. Technical Resources

### Key Libraries

- **pokemon-cards-css** - Holographic reference implementation
- **vanilla-tilt.js** - 3D tilt effects
- **canvas-capture** - Animation export
- **lottie-web** - Vector animations
- **anime.js** - JavaScript animation

### Useful Links

- [Pokemon Cards CSS Demo](https://poke-holo.simey.me/)
- [CSS-Tricks Holographic Effect](https://css-tricks.com/holographic-trading-card-effect/)
- [Glass UI Generator](https://ui.glass/generator/)
- [Frontend.fyi 3D Perspective](https://www.frontend.fyi/tutorials/css-3d-perspective-animations)

### Browser Support Matrix

| Effect            | Chrome | Firefox | Safari | Edge |
| ----------------- | ------ | ------- | ------ | ---- |
| backdrop-filter   | 76+    | 103+    | 9+     | 79+  |
| mix-blend-mode    | 41+    | 32+     | 8+     | 79+  |
| CSS transforms 3D | 36+    | 16+     | 9+     | 12+  |
| MediaRecorder     | 49+    | 25+     | 14.1+  | 79+  |

---

## 10. Summary

### OB 3.0 Credential Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    OPEN BADGES 3.0 CREDENTIAL LIFECYCLE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DESIGN              2. ISSUE & SIGN           3. BAKE (Optional)        │
│  ┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐        │
│  │ Badge       │       │ Server creates  │       │ Embed signed VC │        │
│  │ Builder     │  →    │ VerifiableCred  │  →    │ into PNG/SVG    │        │
│  │ (image)     │       │ + signs with    │       │ for portability │        │
│  │             │       │ issuer's key    │       │                 │        │
│  └─────────────┘       └─────────────────┘       └─────────────────┘        │
│       │                        │                         │                   │
│       ▼                        ▼                         ▼                   │
│  BadgeClass.image       proof: { type,            Baked image with         │
│  (display asset)        proofValue }              credential inside         │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  4. SHARE               5. VERIFY                 6. DISPLAY                │
│  ┌─────────────┐       ┌─────────────────┐       ┌─────────────────┐        │
│  │ Recipient   │       │ Verifier checks │       │ Show badge with │        │
│  │ shares      │  →    │ cryptographic   │  →    │ verification    │        │
│  │ credential  │       │ signature       │       │ status          │        │
│  │             │       │ (no issuer req) │       │                 │        │
│  └─────────────┘       └─────────────────┘       └─────────────────┘        │
│       │                        │                         │                   │
│       ▼                        ▼                         ▼                   │
│  Baked image OR         ✅ Valid (signature        Visual effects +        │
│  VC JSON                   matches)                verification badge       │
│                         ❌ Invalid (tampered)                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Badge Output Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BADGE OUTPUT FORMATS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   VERIFIABLE CREDENTIALS              DISPLAY/MARKETING (No Verification)   │
│   (Cryptographically Signed)                                                │
│   ┌─────────────────────────┐        ┌─────────────────────────┐            │
│   │                         │        │                         │            │
│   │  VC JSON (primary)      │        │  GIF (animated)         │            │
│   │  • THE credential       │        │  • Universal support    │            │
│   │  • Includes proof       │        │  • For social sharing   │            │
│   │                         │        │                         │            │
│   │  Baked PNG (portable)   │        │  MP4/WebM (animated)    │            │
│   │  • iTXt with full VC    │        │  • High quality video   │            │
│   │  • Static display       │        │  • Direct social upload │            │
│   │                         │        │                         │            │
│   │  Baked SVG (animated!)  │        │  Interactive Page       │            │
│   │  • SMIL animations      │        │  • Full CSS/JS effects  │            │
│   │  • Full VC with proof   │        │  • 3D tilt, holographic │            │
│   │  • BEST PORTABLE OPTION │        │  • Links to real VC     │            │
│   │                         │        │                         │            │
│   └─────────────────────────┘        └─────────────────────────┘            │
│                                                                              │
│   ⚠️ Editing these invalidates        ℹ️ These are marketing               │
│      the cryptographic proof!            assets only                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What We Can Do

**Verifiable Credentials (Tamper-Evident):**

- VC JSON with JWT or Linked Data Proof
- Baked PNG with embedded VC (static)
- Baked SVG with embedded VC + SMIL animations
- All include cryptographic proof for verification

**Animated Baked Badges** (SVG + SMIL):

- Pulsing, breathing effects
- Rotating decorative elements
- Holographic color-shifting gradients
- Shimmer/shine animations
- **All while preserving cryptographic proof!**

**In-App Experience** (Full Effects):

- Glassmorphism containers
- 3D perspective tilt (cursor-reactive)
- Complex holographic effects (Pokemon-card style)
- Particle effects
- Real-time verification status display

**Marketing/Display Formats** (Non-credential):

- Animated GIF for social sharing
- MP4/WebM for video platforms
- Eye-catching OG images (static)

### What We Can't Do

- Bake credentials into GIF/MP4/WebM (specification limitation)
- Animated OG image previews (platform limitation)
- 3D tilt in downloadable files (requires JavaScript)
- Complex blend modes in SVG (limited support)
- **Edit baked badges without invalidating them** (by design!)

### Revised Strategy

1. **VC JSON as primary credential format** - The actual verifiable credential
2. **Baked SVG for portable animated badges** - SMIL animations + embedded VC
3. **Baked PNG as fallback** - For contexts that don't support SVG
4. **Interactive share pages** for full holographic/3D effects + live verification
5. **GIF/MP4 exports** for marketing (clearly labeled as display-only)
6. **Static OG images** for social link previews
7. **Verification UI** showing proof status and issuer identity

### Key Insights

**1. SVG + SMIL is the golden path for animated portable badges:**

- Embedded animation that works everywhere
- Baked VC with cryptographic proof
- Tamper-evident (edits invalidate signature)
- Universal browser support

**2. The proof is the security, not the format:**

- SVG editability is NOT a security hole
- Any edit invalidates the cryptographic proof
- Verifiers check signature, not file integrity

**3. Baking is for portability, not verification:**

- OB 3.0 verification uses cryptographic proofs
- Baking embeds the VC for offline/portable use
- The credential works with OR without the image

---

## 11. Next Steps

### Server Implementation Priority

These must be completed before visual effects can be properly integrated:

| Priority | Feature                   | Server Phase | Why First?                            |
| -------- | ------------------------- | ------------ | ------------------------------------- |
| 🔴 1     | **JWKS/DID:web endpoint** | Phase 6      | Required for any verification to work |
| 🔴 2     | **Verification endpoint** | Phase 6      | Users need to verify credentials      |
| 🟡 3     | **Baking service**        | Phase 4      | Enables portable credentials          |
| 🟡 4     | **Unbaking service**      | Phase 4      | Extract VC from baked images          |
| 🟢 5     | **StatusList2021**        | Phase 7      | Revocation support                    |

### Badge Builder / Visual Effects Priority

After server prerequisites are met:

| Priority | Feature                   | Format | Notes                                   |
| -------- | ------------------------- | ------ | --------------------------------------- |
| 1        | Static baked PNG          | PNG    | Basic portable credential               |
| 2        | Animated baked SVG (SMIL) | SVG    | Best portable format                    |
| 3        | Interactive share page    | Web    | Full visual effects + live verification |
| 4        | Verification status UI    | Web    | Show proof validity, issuer identity    |
| 5        | Marketing GIF export      | GIF    | Clearly labeled as display-only         |
| 6        | Video export for social   | MP4    | For social media direct upload          |

### Research Still Needed

1. **Test APNG baking** - Verify iTXt chunks preserved after animation
2. **Benchmark SVG file sizes** - Ensure animated SVGs stay under 100KB
3. **Test SMIL cross-browser** - Verify animations in Safari, Firefox, Chrome
4. **Evaluate proof libraries** - Compare `jose`, `@digitalbazaar/ed25519-signature-2020`
5. **DID method selection** - `did:web` vs `did:key` for issuers

### Related Issues to Create

- [ ] Implement JWKS endpoint (`/.well-known/jwks.json`)
- [ ] Implement DID:web document (`/.well-known/did.json`)
- [ ] Create baking service (PNG + SVG)
- [ ] Create verification endpoint (`/v3/verify`)
- [ ] Add verification UI to openbadges-system

---

_Research Date: November 2025_
_Updated: November 2025 (OB 3.0 Verification Model, SVG Tamper Detection)_
_Author: Rollercoaster.dev Team_
