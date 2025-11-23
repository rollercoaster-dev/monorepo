# OpenBadges Badge Builder - Concept Document

## Vision

Create a **neurodivergent-friendly, Open Badges compliant** visual badge designer that integrates seamlessly with the Rollercoaster.dev ecosystem. This tool empowers issuers to create professional, accessible badge images without external design tools.

## Goals

1. **Accessibility First** - Full neurodiversity support from day one
2. **Open Badges Compliant** - Generate OB 2.0/3.0 compatible badge images
3. **Ecosystem Integration** - Connect to openbadges-modular-server and openbadges-system
4. **Local-First** - Save designs locally, sync optionally
5. **Developer Experience** - Vue 3 component library, reusable composables

> ⚠️ **Important Distinction**: This builder creates **badge images** (visual assets), not credentials. The credential (with cryptographic proof) is created by the **server** when issuing. The builder's output becomes the `image` property of a BadgeClass.

---

## Architecture

### Package Location

```
packages/
└── openbadges-badge-builder/    # New package
    ├── src/
    │   ├── components/          # Vue 3 components
    │   │   ├── canvas/          # Canvas rendering
    │   │   ├── toolbar/         # Editing tools
    │   │   ├── sidebar/         # Asset panels
    │   │   └── controls/        # Property editors
    │   ├── composables/         # Reusable logic
    │   ├── stores/              # State management
    │   ├── assets/              # Built-in shapes, icons, ribbons
    │   ├── utils/               # Helpers
    │   └── types/               # TypeScript definitions
    ├── tests/
    └── package.json
```

### Dependencies

```json
{
  "dependencies": {
    "openbadges-ui": "workspace:*",      // Theme system, accessibility
    "openbadges-types": "workspace:*",   // TypeScript types
    "@vueuse/core": "^10.x",             // Composables
    "fabric": "^6.x"                      // Canvas library (or konva)
  }
}
```

---

## OB 3.0 Credential Workflow

Understanding where the Badge Builder fits in the credential lifecycle is critical:

### Image vs Credential Distinction

| Concept | Created By | Contains | Purpose |
|---------|------------|----------|---------|
| **Badge Image** | Badge Builder | Visual design (SVG/PNG) | Display asset for BadgeClass |
| **BadgeClass** | Server | Achievement definition + image URL | Template for badges |
| **Credential (VC)** | Server | Assertion + cryptographic proof | The actual verifiable credential |
| **Baked Image** | Server | Image + embedded signed VC | Portable credential |

### End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BADGE BUILDER → CREDENTIAL FLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DESIGN (Badge Builder)                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ User designs badge image                                          │       │
│  │ • Shapes, icons, text, colors                                     │       │
│  │ • Optional: SMIL animations for animated SVG                      │       │
│  │ • Export: SVG (preferred) or PNG                                  │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                           │                                                  │
│                           ▼                                                  │
│  2. CREATE BADGE CLASS (Server)                                             │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ POST /v3/badge-classes                                            │       │
│  │ {                                                                 │       │
│  │   "name": "Web Development Fundamentals",                         │       │
│  │   "description": "...",                                           │       │
│  │   "image": "<uploaded-badge-image-url>",  ← From Badge Builder    │       │
│  │   "criteria": { ... }                                             │       │
│  │ }                                                                 │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                           │                                                  │
│                           ▼                                                  │
│  3. ISSUE CREDENTIAL (Server)                                               │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ POST /v3/credentials                                              │       │
│  │ Server:                                                           │       │
│  │ • Creates VerifiableCredential JSON-LD                            │       │
│  │ • Signs with issuer's private key (JWT or Linked Data Proof)     │       │
│  │ • Stores credential                                               │       │
│  │ • Returns credential with proof                                   │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                           │                                                  │
│                           ▼                                                  │
│  4. BAKE (Optional, Server)                                                 │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ POST /v3/credentials/:id/bake                                     │       │
│  │ Server:                                                           │       │
│  │ • Fetches BadgeClass image                                        │       │
│  │ • Embeds signed VC into PNG (iTXt) or SVG (namespace)            │       │
│  │ • Returns baked image with credential inside                      │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                           │                                                  │
│                           ▼                                                  │
│  5. SHARE & VERIFY                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ Recipient can share:                                              │       │
│  │ • Baked image (portable, verifiable)                              │       │
│  │ • VC JSON (compact, verifiable)                                   │       │
│  │ • Share page URL (visual + verification)                          │       │
│  │                                                                   │       │
│  │ Verifier:                                                         │       │
│  │ • Extracts VC from baked image (unbake)                          │       │
│  │ • Verifies cryptographic proof against issuer's public key       │       │
│  │ • ✅ Valid or ❌ Tampered/Invalid                                 │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What the Badge Builder Does NOT Do

- ❌ Create credentials (server responsibility)
- ❌ Sign credentials (server responsibility)
- ❌ Bake images (server responsibility)
- ❌ Verify credentials (server/verifier responsibility)

### What the Badge Builder DOES Do

- ✅ Create beautiful, accessible badge images
- ✅ Export SVG with SMIL animations (for animated baked badges)
- ✅ Export PNG for static badges
- ✅ Provide dynamic text fields (resolved at bake time)
- ✅ Store designs locally for reuse
- ✅ Integrate with BadgeClass creation flow

---

## Core Components

### 1. BadgeBuilder (Main Component)

```vue
<BadgeBuilder
  v-model="badgeDesign"
  :badge-class="currentBadgeClass"
  :theme="userTheme"
  @save="handleSave"
  @export="handleExport"
/>
```

**Props:**
- `modelValue` - Current badge design state
- `badgeClass` - Optional BadgeClass for dynamic fields
- `theme` - Accessibility theme (inherits from openbadges-ui)
- `assets` - Custom asset library (optional)

**Emits:**
- `update:modelValue` - Design state changes
- `save` - User saves design
- `export` - Export triggered (format, data)

### 2. BuilderCanvas

Central editing area with:
- SVG/Canvas rendering
- Element selection
- Drag-and-drop positioning
- Resize/rotate handles
- Grid/snap-to-grid (optional)
- Zoom controls

### 3. BuilderSidebar

Collapsible panels:

```
┌────────────────┐
│ 📄 Templates   │  Pre-built designs
├────────────────┤
│ 🎨 Backgrounds │  Badge shapes
├────────────────┤
│ 📝 Text        │  Add text elements
├────────────────┤
│ 🖼️ Images      │  Upload custom images
├────────────────┤
│ ⭐ Icons       │  Decorative icons
├────────────────┤
│ 🎀 Ribbons     │  Banners and ribbons
├────────────────┤
│ ⚙️ Settings    │  Document settings
└────────────────┘
```

### 4. BuilderToolbar

Top toolbar with:
- Undo/Redo buttons
- Export buttons (SVG/PNG)
- Zoom controls
- Grid toggle
- Preview mode

### 5. PropertyPanel

Context-sensitive panel showing:
- Color pickers (with accessible color choices)
- Opacity slider
- Font controls (for text)
- Layer controls
- Transform controls

---

## Neurodiversity Features

### Inherited from openbadges-ui

- Theme switching (default, dark, high-contrast, ADHD-friendly, autism-friendly, dyslexia-friendly)
- Reduced motion support
- Focus mode
- Content density controls
- Accessible color palettes

### Builder-Specific

1. **Simplified Mode**
   - Fewer options visible
   - Step-by-step guided workflow
   - Reduced cognitive load

2. **Predictable Interactions**
   - Consistent button placement
   - Clear visual feedback
   - No surprise animations

3. **Clear Visual Hierarchy**
   - Strong element selection indicators
   - Obvious active states
   - High contrast handles

4. **Keyboard Navigation**
   - Full keyboard support
   - Clear focus indicators
   - Logical tab order

5. **Auto-Save**
   - Frequent automatic saves
   - Version history
   - Reduces anxiety about losing work

---

## Data Model

### BadgeDesign

```typescript
interface BadgeDesign {
  id: string;
  name: string;
  version: number;
  canvas: CanvasSettings;
  layers: Layer[];
  metadata: DesignMetadata;
}

interface CanvasSettings {
  width: number;
  height: number;
  backgroundColor: string | null;  // null = transparent
}

interface Layer {
  id: string;
  type: 'shape' | 'text' | 'image' | 'icon' | 'ribbon';
  visible: boolean;
  locked: boolean;
  opacity: number;
  transform: Transform;
  properties: ShapeProperties | TextProperties | ImageProperties;
}

interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

interface TextProperties {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  curved: boolean;
  curveRadius?: number;
  curveStartAngle?: number;
  isDynamic: boolean;
  dynamicField?: 'badge_name' | 'issue_date' | 'recipient_name' | 'issuer_name';
}

interface ShapeProperties {
  assetId: string;  // Reference to built-in asset
  colors: string[]; // Array for multi-zone shapes
}

interface ImageProperties {
  src: string;      // Data URL or external URL
  alt: string;
  objectFit: 'contain' | 'cover' | 'fill';
}

interface DesignMetadata {
  createdAt: string;
  updatedAt: string;
  language: string;
  tags: string[];
  linkedBadgeClassId?: string;
}
```

### Dynamic Fields

Support template variables that resolve at export/display:

```typescript
type DynamicField =
  | '{{badge_name}}'      // From BadgeClass.name
  | '{{issue_date}}'      // Formatted date
  | '{{recipient_name}}'  // From Assertion recipient
  | '{{issuer_name}}'     // From Issuer Profile
  | '{{criteria}}'        // From BadgeClass.criteria
  | '{{level}}'           // Custom attribute
  | '{{custom:key}}';     // Custom extension field
```

---

## Composables

### useBadgeBuilder

```typescript
function useBadgeBuilder(initialDesign?: Partial<BadgeDesign>) {
  const design = ref<BadgeDesign>(/* ... */);
  const selectedLayerId = ref<string | null>(null);
  const history = useHistoryStack(design);

  return {
    // State
    design,
    selectedLayer,
    canUndo,
    canRedo,

    // Actions
    addLayer,
    removeLayer,
    updateLayer,
    selectLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    undo,
    redo,

    // Export
    exportSVG,
    exportPNG,
    exportJSON,

    // Persistence
    save,
    load,
    autoSave,
  };
}
```

### useCanvasRenderer

```typescript
function useCanvasRenderer(design: Ref<BadgeDesign>) {
  const canvasRef = ref<HTMLCanvasElement | null>(null);

  return {
    canvasRef,
    render,
    getElementAtPoint,
    getSelectedBounds,
    zoomIn,
    zoomOut,
    fitToScreen,
  };
}
```

### useAssetLibrary

```typescript
function useAssetLibrary() {
  return {
    shapes: computed(() => /* ... */),
    icons: computed(() => /* ... */),
    ribbons: computed(() => /* ... */),
    templates: computed(() => /* ... */),

    searchAssets,
    getAssetById,
    loadCustomAssets,
  };
}
```

---

## Asset Library

### Built-in Assets

#### Shapes (50+ planned)
- Circles (plain, bordered, decorative)
- Hexagons (various border styles)
- Shields (classic, modern)
- Stars (5-point, 6-point, decorative)
- Custom shapes (medals, seals)

#### Icons (30+ planned)
- Education (graduation cap, book, diploma)
- Achievement (trophy, medal, star)
- Skills (lightbulb, gear, wrench)
- Communication (speech bubble, envelope)
- Technology (code, computer, cloud)

#### Ribbons (20+ planned)
- Horizontal banners
- Curved ribbons
- Bookmark ribbons
- Decorative swirls

### Asset Format

```typescript
interface BuiltInAsset {
  id: string;
  name: string;
  category: 'shape' | 'icon' | 'ribbon';
  subcategory: string;
  svg: string;             // SVG markup
  colorZones: number;      // Number of customizable colors
  defaultColors: string[]; // Default color palette
  tags: string[];          // For search
}
```

---

## Integration Points

### openbadges-system Integration

```vue
<!-- In apps/openbadges-system - BadgeClass Creation Flow -->
<script setup lang="ts">
import { BadgeBuilder } from 'openbadges-badge-builder';
import { ref } from 'vue';

const newBadgeClass = ref({
  name: '',
  description: '',
  image: null as string | null,
  criteria: {}
});

async function handleExport({ svg, png }: { svg: string; png: Blob }) {
  // 1. Upload image to server
  const formData = new FormData();
  formData.append('file', svg ? new Blob([svg], { type: 'image/svg+xml' }) : png);

  const response = await fetch('/api/assets/upload', {
    method: 'POST',
    body: formData
  });
  const { url } = await response.json();

  // 2. Set as BadgeClass image
  newBadgeClass.value.image = url;
}
</script>

<template>
  <BadgeBuilder
    v-model="badgeDesign"
    @export="handleExport"
  />

  <!-- Then create BadgeClass with the image URL -->
  <button @click="createBadgeClass">Create Badge Class</button>
</template>
```

### openbadges-modular-server Integration

**Current Endpoints (Image Upload):**

```typescript
// Upload badge image (existing)
POST /api/assets/upload
Content-Type: multipart/form-data
file: <svg-or-png-file>

Response: { url: "https://server.com/assets/abc123.svg" }
```

**Future Endpoints (Baking - Phase 4):**

```typescript
// Bake a credential into its badge image
POST /v3/credentials/:id/bake
Content-Type: application/json
{
  "format": "svg" | "png"
}

Response: Baked image file with embedded VerifiableCredential

// Render badge with dynamic values (for previews)
POST /api/badges/render
Content-Type: application/json
{
  "design": BadgeDesign,       // From Badge Builder
  "format": "svg" | "png",
  "dynamicValues": {           // Resolved at render time
    "badge_name": "Web Development",
    "issue_date": "2025-11-23",
    "recipient_name": "John Doe"
  }
}

Response: Rendered image with dynamic text resolved
```

### Verification UI (openbadges-system)

The Badge Builder should integrate with verification display:

```vue
<!-- Badge Display with Verification Status -->
<template>
  <div class="badge-card">
    <!-- Badge image with visual effects -->
    <BadgeDisplay
      :credential="credential"
      :animated="true"
      :holographic="isRare"
    />

    <!-- Verification status indicator -->
    <VerificationBadge
      :status="verificationResult.valid ? 'valid' : 'invalid'"
      :issuer="verificationResult.issuer"
      :checked-at="verificationResult.checkedAt"
    />

    <!-- Download options -->
    <ExportMenu>
      <ExportOption format="vc-json" label="Credential (JSON)" />
      <ExportOption format="baked-svg" label="Baked Badge (SVG)" />
      <ExportOption format="baked-png" label="Baked Badge (PNG)" />
      <ExportOption format="gif" label="Animated (GIF) - Display Only" />
    </ExportMenu>
  </div>
</template>
```

---

## Implementation Phases

### Phase 1: Core Editor (MVP)
- [ ] Basic canvas with layer support
- [ ] Shape library (10 shapes)
- [ ] Text tool (basic)
- [ ] Color customization
- [ ] PNG/SVG export
- [ ] Local storage persistence

### Phase 2: Enhanced Editing
- [ ] Curved text on paths
- [ ] Icon library (20 icons)
- [ ] Ribbon library (10 ribbons)
- [ ] Undo/redo history
- [ ] Layer management UI
- [ ] Keyboard shortcuts

### Phase 3: Templates & Assets
- [ ] Template system
- [ ] Full asset library
- [ ] Asset search
- [ ] Custom asset upload
- [ ] Asset favoriting

### Phase 4: Dynamic Content
- [ ] Dynamic text fields
- [ ] BadgeClass integration
- [ ] Preview with sample data
- [ ] Server-side rendering

### Phase 5: Collaboration (Future)
- [ ] Design sharing
- [ ] Team asset libraries
- [ ] Design versioning
- [ ] Comments/feedback

---

## Technical Considerations

### Canvas Library Options

| Library | Pros | Cons |
|---------|------|------|
| **Fabric.js** | Mature, rich API, good docs | Large bundle, canvas-based |
| **Konva.js** | React/Vue bindings, performant | Less features than Fabric |
| **SVG.js** | Native SVG, smaller bundle | Less manipulation features |
| **Custom SVG** | Full control, tiny bundle | More development effort |

**Recommendation:** Start with Fabric.js for rapid development, consider custom SVG for production to reduce bundle size.

### Performance

- Virtual scrolling for asset panels
- Debounced rendering on changes
- Web Workers for export processing
- Lazy loading of asset categories

### Accessibility Testing

- Automated: axe-core, Pa11y
- Screen reader testing: NVDA, VoiceOver
- Keyboard navigation audit
- Color contrast validation

---

## Success Metrics

1. **Time to First Badge** - < 5 minutes for new users
2. **Accessibility Score** - 100% WCAG 2.1 AA compliance
3. **Export Quality** - Crisp at any resolution
4. **Bundle Size** - < 200KB gzipped (core)
5. **User Satisfaction** - Positive feedback from neurodivergent users

---

## Related Documents

- [Badge Design Analysis](./BADGE_DESIGN_ANALYSIS.md) - Analysis of badge.design tool
- [Badge Visual Effects Research](./BADGE_VISUAL_EFFECTS_RESEARCH.md) - Visual effects, baking, OB 3.0 verification
- [OpenBadges UI Design Philosophy](../../packages/openbadges-ui/docs/DESIGN_PHILOSOPHY.md)
- [Neurodiversity Considerations](../../packages/openbadges-ui/docs/neurodiversity.md)
- [OB 3.0 Server Roadmap](../../apps/openbadges-modular-server/docs/ob3-roadmap.md) - Implementation phases

## Server Prerequisites

Before the Badge Builder can fully integrate with OB 3.0 baking:

| Server Feature | Phase | Status | Required For |
|----------------|-------|--------|--------------|
| JWT Proof Generation | 5 | ✅ Done | Signing credentials |
| JWKS/DID:web Endpoint | 6 | ⏳ Pending | Verification |
| Baking Service | 4 | ⏳ Pending | Portable credentials |
| Verification Endpoint | 6 | ⏳ Pending | UI verification display |

See [BADGE_VISUAL_EFFECTS_RESEARCH.md](./BADGE_VISUAL_EFFECTS_RESEARCH.md#current-openbadges-modular-server-status) for detailed server implementation plan.

---

*Concept Version: 1.1*
*Date: November 2025*
*Updated: November 2025 (OB 3.0 Credential Workflow, Integration Points)*
*Author: Rollercoaster.dev Team*
