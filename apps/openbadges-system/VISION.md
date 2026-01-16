# openbadges-system Vision

**Status:** Draft
**Last Updated:** 2025-01-16

---

## Purpose

The place where you celebrate your wins. Full-stack badge application for individuals and small organizations.

---

## Philosophy

### Your Wins Matter

Traditional credentialing is institutional. We're for the personal achievements that institutions never recognize:

- "I gave my first public talk"
- "I maintained a morning routine for a month"
- "I finished a project I actually started"
- "I organized a neighborhood cleanup"

### Easy Over Complex

Badge creation should feel like posting to social media, not filling out a grant application.

- Minimal required fields
- Visual badge generator
- One-click sharing
- No credential jargon in the UI

### Self-Signed First

You don't need permission to recognize your own achievement. Create, add evidence, sign it yourself.

Later (when the platform supports it):

- Peer verification - someone you know confirms it
- Mentor verification - a trusted guide validates it

### Neurodivergent-Friendly

Using openbadges-ui components means automatic access to:

- Multiple accessibility themes
- Focus mode for ADHD
- Dyslexia-friendly reading
- Reduced animation options
- Content density controls

---

## What We Provide

### For Individuals

**Badge Generator:**

- Create custom badge images
- Templates, icons, and styling
- Visual editor (no design skills needed)

**Badge Creation:**

- Define your achievement
- Add evidence (links, files, descriptions)
- Sign it with your identity

**Backpack:**

- View all your badges
- Filter and organize
- Share publicly or keep private

**Verification:**

- Check if badges are authentic
- View evidence and provenance

### For Small Organizations

**Deploy as your badge platform:**

- Full issuer management
- Badge class creation
- Issue badges to members
- Verification dashboard

**Admin panel:**

- User management
- Badge analytics
- System configuration

---

## Technical Stack

- **Frontend:** Vue 3, Vue Router, Pinia, TailwindCSS
- **Backend:** Bun runtime, Hono framework
- **Database:** SQLite (dev) / PostgreSQL (prod) via Kysely
- **Components:** openbadges-ui
- **Types:** openbadges-types
- **Badge API:** Proxies to openbadges-modular-server

---

## Current Focus

1. **Simplify the UI** - Less complexity, more joy
2. **Self-signed badge flow** - Create → evidence → sign → share
3. **Badge generator integration** - Visual badge creation in the app
4. **Deploy to rollercoaster.dev** - Real usage, real feedback

---

## Future Direction

These are goals, not current work:

- **Peer connections** - Find and verify each other's badges
- **Mentor relationships** - Designated validators for your achievements
- **Badge collections** - Organize badges into portfolios
- **Public profiles** - Shareable badge portfolios
- **Import/export** - Bring badges from other platforms

---

## Related

- [CLAUDE.md](CLAUDE.md) - Development context
- [openbadges-ui](../../packages/openbadges-ui/VISION.md) - Component library
- [openbadges-modular-server](../openbadges-modular-server/VISION.md) - Badge API
- [Ecosystem Vision](../docs/vision/openbadges-ecosystem.md)
