# User Flows: Iteration A

**Date:** 2026-02-02
**Status:** Draft
**Owner:** Joe

---

## Overview

Iteration A is the core loop: create a goal, break it into steps, attach evidence, complete it, earn a badge. These flows cover every screen and interaction in the app.

### Screen Map

```
Welcome (first launch only)
    ↓
Home (Goals tab)  ←→  Badges tab
    ↓                    ↓
Goal Detail          Badge Detail
    ↓
Add Evidence
    ↓
Badge Earned

Settings (accessible from any screen)
```

### Navigation

Two bottom tabs. That's it.

- **Goals** — active goals with progress. The default screen.
- **Badges** — earned badges. The backpack.

Settings is a gear icon in the top corner, not a tab.

---

## Flow 1: First Launch

The user opens the app for the first time.

```
Splash → Welcome Screen → Home (empty state)
```

### Welcome Screen

Brief — one or two screens max, not a tutorial carousel.

- "Track your goals. Earn your badges. Everything stays on your phone."
- Theme picker shown immediately: "Pick what feels right" with the 7 themes as visual swatches
- Content density option: compact / normal / spacious
- No account creation, no email, no sign-up. The app just works.

### Behind the Scenes

- Generate Ed25519 keypair (for badge signing)
- Store private key in Expo SecureStore
- Create local database
- Apply chosen theme

### Home (empty state)

- "No badges yet. What have you been up to?"
- Single prominent button: "New Goal"

### ND Considerations

- Theme choice is the first thing, not an afterthought buried in settings
- No forced decisions — theme and density can be changed anytime
- Zero friction to start — no account, no permissions, no onboarding quiz

---

## Flow 2: Create a Goal and Add Steps

```
Home → New Goal → Goal Detail → Add Steps
```

### New Goal

- Title field (required, autofocused)
- Description field (optional, collapsed by default — tap to expand)
- "Create" button
- That's it. No category picker, no due date, no priority level. Just a title.

### Goal Detail

- Goal title and description at top
- "Add Step" button
- Empty step list: "Break it down. What's the first small piece?"
- "Add Evidence" button (for goal-level evidence)

### Add Step

- Inline — tap "Add Step," a text field appears in the list, type the title, press enter
- Next step field appears immediately (rapid entry for when you're in the zone)
- Tap away or press done to stop adding
- Steps are reorderable by drag

### ND Considerations

- Minimal required fields — just a title to get started
- Rapid step entry for the ADHD hyperfocus moment when you're breaking things down
- No forced categorization or metadata upfront
- Description is collapsed so the screen isn't overwhelming
- Steps can always be added, reordered, or removed later

---

## Flow 3: Attach Evidence

```
Goal Detail or Step → Add Evidence → Choose Type → Capture/Select → Done
```

### Add Evidence (action sheet)

- "Take Photo" (opens camera directly)
- "Choose from Library" (photo/video picker)
- "Voice Memo" (starts recording immediately)
- "Write a Note" (text editor)
- "Add Link" (URL field)
- "Attach File" (document picker)

### After Capture

- Preview of what you just captured
- Optional caption field (one line, not required)
- "Attach" button
- Evidence appears as a thumbnail/card on the goal or step

### Evidence Display on Goal/Step

- Thumbnails for photos/videos
- Waveform or play button for voice memos
- Text preview for notes
- URL preview for links
- Tap any evidence to view full screen

### ND Considerations

- Camera and voice memo open directly — fewest taps possible between "I want to capture this" and recording
- Voice memo is equal to text, not hidden behind "more options"
- Caption is optional — the evidence speaks for itself if you don't want to write
- No mandatory metadata. Timestamp is automatic.

---

## Flow 4: Complete a Goal and Earn a Badge

```
Goal Detail → Mark Steps Complete → Complete Goal → Badge Earned → Badge Detail
```

### Mark Steps Complete

- Tap a step to toggle complete (checkbox or swipe)
- Step shows as done with a subtle visual change (not crossed out — the work matters, don't strike through it)
- Progress indicator updates: "3/5 steps"

### Complete Goal

- When all steps are complete, a "Complete Goal" button appears
- Also available at any time — you can complete a goal before all steps are done (scope adjustment is valid, some steps might not matter anymore)
- Tap to complete

### Badge Earned

The moment of celebration. This is a character moment.

- Badge image appears (generated from goal title and accent color)
- "First one. (noted.)" for the very first badge
- Badge is signed with the user's local Ed25519 key
- OB3 credential is created with all evidence references
- Badge image is baked (credential embedded in PNG)
- Brief, not overwhelming. A beat of recognition, then you move on.

### Badge Detail

- Badge image
- Goal title (the achievement)
- Date earned
- All evidence (from goal and steps) listed and viewable
- Export options: "Save Image," "Export Credential (JSON)"

### ND Considerations

- Completing before all steps are done is intentional — scope change is a feature
- Completed steps aren't struck through — they're celebrated, not deleted
- The badge moment is brief and warm, not a confetti explosion that demands attention
- You can leave immediately after earning — no forced sharing prompt, no "tell your friends"

---

## Flow 5: Home Screen

### Goals Tab (default)

```
┌─────────────────────────┐
│  ⚙️                      │
│                          │
│  [Active Goal 1]         │  ← tap → Goal Detail
│    3/5 steps             │
│                          │
│  [Active Goal 2]         │  ← tap → Goal Detail
│    1/3 steps             │
│                          │
│         + New Goal       │
│                          │
│  ▸ 4 completed           │  ← tap to expand
│                          │
├──────────────────────────┤
│   Goals      Badges      │
└──────────────────────────┘
```

- Active goals listed with title and step progress
- Completed goals hidden by default, expandable: "4 completed" tap to show
- Single "New Goal" button, always visible

### Badges Tab

- Badge images in a grid or list (user preference)
- Tap for badge detail
- Most recent first
- Empty state: "No badges yet" with link to goals tab

### ND Considerations

- Two tabs, not five. Minimum navigation decisions.
- Active goals are the default view — the thing you're working on right now
- Completed goals aren't deleted or archived, just tucked away to reduce visual noise
- No hamburger menus, no deep navigation hierarchies

---

## Flow 6: Settings

Accessible from the gear icon in the top corner of any screen.

```
Settings
│
├── Appearance
│   ├── Theme (7 swatches, tap to switch instantly)
│   ├── Content Density (compact / normal / spacious)
│   └── Animation (none / minimal / full)
│
├── Accessibility
│   ├── Font (system / OpenDyslexic / Atkinson Hyperlegible)
│   ├── Text Size (slider, respects OS Dynamic Type)
│   └── Spacing (letter / line / word spacing adjustments)
│
├── Data
│   ├── Export All Badges (OB3 JSON)
│   ├── Export All Goals (JSON backup)
│   └── Storage Used
│
└── About
    ├── Version
    └── Open Source Licenses
```

### ND Considerations

- Theme switching is instant preview — tap a swatch, see it immediately, no "apply" button
- Font choice is three options, not a font browser. Each one serves a clear purpose.
- Export is always available — your data, your way out
- No account section in iteration A. No login, no profile, no sync settings yet.
- Settings are flat, not nested. One scroll, everything visible.

---

## Screen Count

Iteration A has 7 distinct screens:

| Screen | Purpose |
|--------|---------|
| Welcome | First launch only — theme picker, brief intro |
| Home (Goals) | Active goals list, primary screen |
| Home (Badges) | Earned badges grid/list |
| Goal Detail | Steps, evidence, progress, complete button |
| Badge Detail | Badge image, evidence, export |
| Badge Earned | Celebration moment (transient/modal) |
| Settings | Theme, accessibility, data export |

Plus action sheets (not full screens): New Goal, Add Step (inline), Add Evidence, Evidence Viewer.

---

## Interaction Summary

| Action | Gesture | Where |
|--------|---------|-------|
| Create goal | Tap "New Goal" | Home |
| Add step | Tap "Add Step," type, enter | Goal Detail |
| Reorder steps | Drag | Goal Detail |
| Add evidence | Tap "Add Evidence," choose type | Goal Detail or Step |
| Complete step | Tap checkbox or swipe | Goal Detail |
| Complete goal | Tap "Complete Goal" | Goal Detail |
| View badge | Tap badge | Badges tab or Badge Earned |
| Switch theme | Tap swatch | Settings or Welcome |
| Export badge | Tap export option | Badge Detail |

---

## Related Documents

- [ADR-0001: Iteration Strategy](../decisions/ADR-0001-iteration-strategy.md) — scope for iteration A
- [User Stories](../vision/user-stories.md) — Lina, Malik, Tomás
- [Design Principles](../vision/design-principles.md) — ND rules and visual identity
- [Data Model](../architecture/data-model.md) — Goal, Step, Evidence, Badge entities

---

_Draft created 2026-02-02. Seven screens, two tabs, one clear loop._
