# Landing Page Flow Design

## Current State

The landing page at rollercoaster.dev walks users through an emotionally resonant scroll experience:

1. **Hero**: "THE ROLLERCOASTER IS THE PATH" - progress tracking for minds that don't move in straight lines
2. **Problem**: "Sometimes the fog rolls in" - speaks to neurodivergent experience of losing momentum
3. **Anti-pattern**: "Most tools punish this" - crossed out streak broken, progress lost, start over
4. **Personas**: Four stories with interactive inputs:
   - **LINA - Quiet Victory**: Self-issued badge for unrecognized work
   - **EVA - The Big Map**: Manic planning, crash, return - platform kept everything
   - **MALIK - Midnight Model**: Evidence-based badge earning for self-taught skills
   - **CARMEN - Passing It On**: Peer verification, knowledge rippling forward
5. **Product**: "What we're building" - Your pace, your proof, your data
6. **Daily Win**: Final input - "What did you do today that mattered?"
7. **YOUR BADGES**: All inputs become proto-badges (5 types)

**Current ending**: "SEE YOU NEXT RIDE" with GitHub/Contact links. Badges just sit there.

---

## Proposed Flow: After Badges Appear

### Three Clear CTAs

After the "YOUR BADGES" section, present three actions:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│                 │  │                 │  │                 │
│    DOWNLOAD     │  │    SIGN UP      │  │   LEARN MORE    │
│                 │  │                 │  │                 │
│  Get your       │  │  Create your    │  │  What makes     │
│  badges now     │  │  own badges     │  │  these special? │
│                 │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Download Flow

**Goal**: User gets real, verifiable baked badges.

1. User clicks "Download"
2. Modal: "Make your badges real" - email + name input
3. Submit triggers:
   - Animation showing signing/baking process
   - Server creates 5 OB3 credentials (platform-signed)
   - Server bakes each into badge images
4. Download page with 5 baked badge images
5. Soft upsell: "Save these to your backpack?" → sign up prompt

### Badge Types (from personas)

| Badge Type       | Color Accent | From Input                             |
| ---------------- | ------------ | -------------------------------------- |
| Quiet Victory    | Green        | "Do you have a quiet victory..."       |
| Thread Finder    | Orange       | "What thread could you pull..."        |
| Skill Builder    | Purple       | "What skill have you been building..." |
| Knowledge Sharer | Blue         | "Who could you teach..."               |
| Daily Win        | Teal         | "What did you do today..."             |

### Technical: Platform-Signed Model

- **Issuer**: rollercoaster.dev (platform)
- **Recipient**: User's email + display name
- **Signing**: Platform's private key
- **Verification**: Platform hosts JWKS endpoint
- **Output**: Baked PNG/SVG with embedded OB3 credential

User is "self-asserting" the achievement; platform provides crypto infrastructure.

---

## Sign Up Flow

**Goal**: User creates account and starts making their own badges.

Direct path to account creation. For users already bought in from the landing page who want to create badges, not just claim these ones.

---

## Learn More Flow (Opt-In Walkthrough)

**Goal**: Educate users about what makes Open Badges different.

This is for the curious - not a gate, but an option. Users who enter this flow WANT to understand.

### Walkthrough Steps

**Step 1: Pick One**
"You claimed 5 achievements. Let's explore one."

- User selects which badge to dive into

**Step 2: Not Just an Image**
"Most badges are just pictures. Anyone can copy them."

- Visual: regular image badge vs. verifiable credential
- Show the difference

**Step 3: What's Inside**
"Your badge contains structured data about what you did."

- Show the credential JSON (simplified)
- Issuer, achievement, date, recipient

**Step 4: Tamper-Proof**
"It's cryptographically signed. Try to change it."

- Interactive: let user modify text, show verification fails
- Demonstrates why this matters

**Step 5: You Own It**
"This isn't locked to our platform. It's yours."

- Explain portability
- Works anywhere that reads Open Badges

**Step 6: The Standard**
"Built on Open Badges - used by Mozilla, IBM, universities worldwide."

- Brief credibility/ecosystem mention
- Link to learn more about the standard

**Step 7: Create Your Own**
"Ready to create badges for what you've accomplished?"

- Sign up CTA

---

## Design Principles

1. **Emotional landing page does the heavy lifting** - Users arrive at badges section already bought in
2. **Don't gate, offer paths** - Quick claim is default, education is opt-in
3. **Learning by doing** - Walkthrough is interactive, not lectures
4. **Real value immediately** - Badges are real before account required
5. **Respect user intent** - Some want badges, some want to learn, some want to create

---

## Open Questions

- [ ] Badge images: Need designs for the 5 badge types
- [ ] Animation: What does "signing/baking" look like visually?
- [ ] Walkthrough interactivity: How to demo verification failure?
- [ ] Mobile experience: How does this flow work on phones?

---

## Dependencies

- Baking service (exists: `apps/openbadges-modular-server/src/services/baking/`)
- Credential creation (exists)
- JWKS/verification endpoint (exists)
- Landing page connection to server (needs building)
- Badge images for 5 types (needs design)

---

_Document created: January 2026_
_Based on landing page review and UX discussion_
