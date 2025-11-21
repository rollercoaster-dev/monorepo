# Rollercoaster.dev – OpenBadges System Project Plan

This document outlines the milestones, project board columns and individual issues needed to deliver a complete demonstration of Open Badges v2 and v3 within the **openbadges-system**.  
Each issue includes a brief description and acceptance criteria so tasks can be created programmatically (e.g., via scripts or GitHub API).

---

## Project Board Columns

- **Backlog** – Ideas and tasks not yet started.
- **In Progress** – Currently being worked on.
- **In Review** – Ready for code/design review.
- **Done** – Completed tasks.

---

## Milestones

### M1: Core OB2 Functionality

- Implement badge creation, issuance, backpack and verification.

### M2: UI/UX Overhaul

- Adopt design system, add multi-step forms, improve responsiveness.

### M3: OB3 Enhancements

- Add DID support, verifiable credentials, and self-signed badge workflow.

### M4: Educational/Demonstration Layer

- In-app tutorials, feature explanations, OB2 vs OB3 comparison views.

---

## Issues

### **M1: Core OB2 Functionality**

**Issue:** Implement badge creation and issuance (OB2)  
_Description:_ Allow creation of `BadgeClass` and assertions with all OB2 fields (criteria, evidence, alignment).  
_Acceptance Criteria:_ Users can create and issue badges to recipients; generated badges validate against OB2 spec.  
_Labels:_ `feature`, `openbadges-v2`

**Issue:** Implement basic badge backpack  
_Description:_ Create a page to store and display earned badges for a user.  
_Acceptance Criteria:_ Issued badges appear in backpack with metadata; badges persist via backend storage.  
_Labels:_ `feature`, `ui`

**Issue:** Add OB2 badge verification service  
_Description:_ Backend endpoint that validates JSON-LD, hosted criteria URLs, and signature (if present).  
_Acceptance Criteria:_ Valid badges return “verified” with details; invalid badges return clear error messages.  
_Labels:_ `feature`, `verification`

---

### **M2: UI/UX Overhaul**

**Issue:** Refactor badge creation into multi-step wizard  
_Description:_ Break badge creation into logical steps (image → details → criteria → review).  
_Acceptance Criteria:_ Form state persists across steps; navigation works forwards/backwards; Tailwind/PrimeVue styling applied.  
_Labels:_ `ui`, `enhancement`

**Issue:** Apply consistent visual hierarchy & styles  
_Description:_ Use unified card style, typography, and spacing; apply brand colors.  
_Acceptance Criteria:_ All major pages follow the same spacing and font scale; buttons and form inputs have consistent styles.  
_Labels:_ `ui`, `design`

---

### **M3: OB3 Enhancements**

**Issue:** Implement DID support in backend  
_Description:_ Add DID method and keypair generation; store in user profile.  
_Acceptance Criteria:_ Users can view their DID; badges issued use DID as `issuer`.  
_Labels:_ `feature`, `openbadges-v3`

**Issue:** Add verifiable credential proof to badges  
_Description:_ Sign OB3 badge assertions using DID keypair; embed proof in JSON.  
_Acceptance Criteria:_ Proof verifies using public key in DID Document.  
_Labels:_ `feature`, `verification`

**Issue:** Support self-signed badge workflow  
_Description:_ Allow issuer and recipient DIDs to match; guide user through signing and verification.  
_Acceptance Criteria:_ Self-issued badges verify successfully; UI shows “self-asserted” status.  
_Labels:_ `feature`, `openbadges-v3`, `self-signed`

---

### **M4: Educational/Demonstration Layer**

**Issue:** Add OB2/OB3 comparison page  
_Description:_ Show JSON and feature differences; highlight v3 additions like DID, proof, blockchain support.  
_Acceptance Criteria:_ Page loads side-by-side examples; highlights differences in color.  
_Labels:_ `documentation`, `ui`

**Issue:** Add contextual help tooltips throughout UI  
_Description:_ For each major field, add tooltip linking to OB spec section.  
_Acceptance Criteria:_ Hover or click displays relevant explanation; links open in new tab.  
_Labels:_ `ui`, `documentation`

**Issue:** Add JSON viewer for badge assertions  
_Description:_ Toggle to display raw JSON of badge with syntax highlighting.  
_Acceptance Criteria:_ Displays formatted JSON; supports both OB2 and OB3 badges.  
_Labels:_ `ui`, `feature`

---

## Labels

- `feature`
- `ui`
- `design`
- `enhancement`
- `verification`
- `openbadges-v2`
- `openbadges-v3`
- `self-signed`
- `documentation`
