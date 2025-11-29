# badge.design Analysis Report

This document analyzes Accredible's badge.design tool to inform the development of our own OpenBadges Badge Builder.

## Overview

**badge.design** (https://badge.design) is a free online badge designer tool by Accredible that provides:

- A web-based visual badge editor
- Design guide with best practices
- Downloadable design assets

> **Note**: This tool creates **badge images** (visual assets), not credentials. In Open Badges terminology, the output becomes the `image` property of a BadgeClass. The actual credential (with cryptographic proof) is created separately by an issuing server. See [Badge Visual Effects Research](./BADGE_VISUAL_EFFECTS_RESEARCH.md) for the full OB 3.0 credential workflow.

## Badge Designer Tool Analysis

### Interface Layout

The designer uses a **left-sidebar + canvas** layout:

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  Badge Designer | Design Guide | Design Assets  │
├──────────┬──────────────────────────────────────────────┤
│          │  [Toolbar: Download SVG/PNG | Undo/Redo]     │
│ Templates│──────────────────────────────────────────────│
│          │                                              │
│Backgrounds                                              │
│          │                                              │
│   Text   │        [Canvas - Transparent BG]             │
│          │                                              │
│  Images  │        [Selected element shows               │
│          │         manipulation handles]                │
│   Icons  │                                              │
│          │                                              │
│  Ribbons │                                              │
│          │                                              │
│ Document │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Feature Breakdown

#### 1. Templates (Requires Account)

- Pre-built badge designs as starting points
- Organized by style/category

#### 2. Background Shapes (~90+ options)

Shape categories include:

- **Hexagons** - Classic badge shape, various border styles
- **Shields** - Traditional heraldic shapes
- **Circles** - With decorative borders, ribbons
- **Ornate badges** - Complex decorative frames
- **Custom shapes** - Stars, medals, etc.

Each shape features:

- Multiple color zones (2-3 customizable colors)
- Transparent areas for layering
- Consistent sizing for the canvas

#### 3. Text Tools

Two text modes:

- **Add Text** - Standard horizontal text
- **Add Text on Circle** - Curved text for circular badges

Text editing options:

- Font family selection
- Font weight (Normal/Bold)
- Italic and Underline
- Text alignment (Left/Center/Right)
- Font size
- Letter/line spacing
- Text color with eyedropper tool
- **Dynamic date format** - Placeholder for badge issue date (multiple formats)

#### 4. Images

- Upload custom images (logos, photos)
- Drag to position
- Resize with handles

#### 5. Icons (~50+ options)

Categories include:

- Geometric shapes (circles, shields, stars)
- Education (graduation cap, diploma, books)
- Achievement (trophies, ribbons, medals)
- Technology (computers, monitors)
- Creative (lightbulb, pen, gears)
- 3D cubes (colorful blocks)

All icons:

- Monochromatic (single color)
- Scalable
- Customizable color

#### 6. Ribbons (~25 options)

Types:

- Horizontal banners (various styles)
- Vertical bookmarks/ribbons
- Decorative swirl ribbons
- Various colors (blue, green, gold, red)

#### 7. Document Settings

- **Language selection** - 35+ languages for localization
- Sets the badge's language metadata

### Editing Capabilities

When an element is selected:

**Toolbar shows:**

- Opacity slider
- Color swatches (1-3 depending on element)
- Color picker/eyedropper tool

**Canvas controls:**

- Resize handles (corners/edges)
- Rotation point (center)
- Layer controls (forward/backward)
- Delete button
- Duplicate button

**Keyboard shortcuts:**

- Undo: ⌘+Z
- Redo: ⌘+Y
- Arrange Forward: ⌘+]
- Arrange Backward: ⌘+[
- Delete: DEL
- Duplicate: ⌘+D
- Italic: ⌘+I
- Underline: ⌘+U

### Export Options

- **SVG** - Vector format, scalable
- **PNG** - Raster format with transparency

---

## Design Guide Key Principles

### 1. Recognizing Levels of Achievement

**Purpose:** Communicate badge hierarchy when courses "stack" (Level 1 → Level 2 → etc.)

**Visual indicators:**

- Stars (★★★)
- Dots (●●●)
- Level numbers (L1, L2)
- Color progression
- Text labels ("Level 2", "Black Belt")

**Best Practices:**

- Use consistent shape/branding across levels
- Make level indicator prominent
- Consider both visual + text indicators

### 2. Prerequisites vs Cap-stone Certifications

**Purpose:** Distinguish low-stakes modules from high-stakes certifications

**Approaches:**

- **Different shapes** - Prerequisites use simple logos, capstones use full badge designs
- **Different visual weight** - Prerequisites are understated, capstones are bold/eye-catching
- **Color differentiation** - Muted vs vibrant
- Consider using **Certificate designs** for high-stakes credentials

### 3. Differentiating Course Streams

**Purpose:** Visual grouping for related courses or different brands

**Methods:**

- Color coding (different color rings/accents)
- Consistent logo placement
- Text labels indicating stream ("Professional", "Associate")
- Shape variations while maintaining brand consistency

### 4. Dynamic Text for Consistency

**Purpose:** Reuse one design across multiple badges

**Implementation:**

- Template variables/attributes
- Same design, different course names
- Maintains visual consistency at scale
- Reduces design effort

---

## Design Assets Library

### Available Downloads (PNG + SVG)

| Category     | Count | Description                               |
| ------------ | ----- | ----------------------------------------- |
| Badge Shapes | 90+   | Circles, hexagons, shields, ornate frames |
| Ribbons      | 24+   | Banners, bookmarks, decorative            |
| Icons        | 50+   | Educational, achievement, geometric       |

All assets are:

- Free to use
- Available in both PNG and SVG
- Designed for badge creation
- Customizable colors

---

## Strengths to Adopt

1. **Intuitive Layer-Based Editing** - Click to select, drag to move, handles to resize
2. **Rich Asset Library** - Pre-made shapes/icons save design time
3. **Color Customization** - Multiple color zones per element
4. **Curved Text** - Essential for circular badge designs
5. **Dynamic Text** - Template variables for scalable badge creation
6. **SVG Export** - Preserves quality at any size
7. **Keyboard Shortcuts** - Efficient editing workflow

## Weaknesses to Improve Upon

1. **No Real-Time Preview** - No live preview of final badge appearance
2. **Limited Templates** - Requires account for templates
3. **No Collaboration** - Single-user, no sharing/team features
4. **No Version History** - Only undo/redo, no save points
5. **Limited Accessibility** - No neurodivergent-friendly themes or controls
6. **No Integration** - Standalone tool, doesn't connect to badge issuance

---

## Recommendations for OpenBadges Badge Builder

Based on this analysis, our badge builder should:

1. **Adopt the proven UX pattern** - Left sidebar + central canvas
2. **Provide rich assets** - Shapes, icons, ribbons library
3. **Support layer-based editing** - With full manipulation controls
4. **Include curved text** - Essential for badge aesthetics
5. **Add dynamic fields** - {{badge_name}}, {{issue_date}}, {{recipient}}
6. **Integrate neurodiversity features** - Leverage existing openbadges-ui themes
7. **Connect to our ecosystem** - Link to BadgeClass creation, issuing workflow
8. **Support OB 3.0 workflow** - Generate images suitable for baking (SVG with SMIL for animations)
9. **Local-first architecture** - Store designs locally with optional sync
10. **Accessibility-first** - Reduced motion, high contrast, keyboard navigation

> **Important**: The badge builder creates **images only**. OB 3.0 credential signing, baking, and verification are handled by the server. See [Badge Builder Concept](./OPENBADGES_BADGE_BUILDER_CONCEPT.md) for the full integration architecture.

---

## Related Documents

- [Badge Builder Concept](./OPENBADGES_BADGE_BUILDER_CONCEPT.md) - Our badge builder design
- [Badge Visual Effects Research](./BADGE_VISUAL_EFFECTS_RESEARCH.md) - Visual effects & OB 3.0 baking
- [OB 3.0 Server Roadmap](../../apps/openbadges-modular-server/docs/ob3-roadmap.md) - Server implementation

---

_Analysis Date: November 2025_
_Updated: November 2025 (OB 3.0 workflow clarification)_
_Source: https://badge.design_
