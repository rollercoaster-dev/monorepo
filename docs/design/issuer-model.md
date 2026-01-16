# Issuer Model

How openbadges-system handles the relationship between users, issuers, and organizations.

---

## Core Concepts

### User

A person with an account. Users can:

- Have their own personal issuer identity
- Be members of organizations
- Earn badges (as recipients)

### Issuer

An identity that issues badges. Two types:

1. **Personal Issuer** - Created automatically for every user. Issues badges as yourself.
2. **Organization Issuer** - Created explicitly. Issues badges as the organization.

A user can issue badges as any issuer they have access to.

### Organization

A group issuer with members. Organizations have:

- A name, URL, and description (the issuer identity)
- Members with assigned roles
- Badges that belong to the organization

---

## Roles

Within an organization, members have roles:

| Role    | Can Create Badges | Can Issue Badges | Can Manage Org |
| ------- | ----------------- | ---------------- | -------------- |
| Admin   | Yes               | Yes              | Yes            |
| Creator | Yes               | Yes              | No             |
| Issuer  | No                | Yes              | No             |

**Personal issuers don't need roles** - you're the only member and have full control.

---

## The 80% Model

Most users fall into one of these patterns:

### Individual

- Uses personal issuer (automatic)
- Creates badges, issues to self or others
- No org setup needed

### Small Team

- Creates one organization
- Invites members as creators or issuers
- Badges issued as the org

### Platform (Fobizz-type)

- Organization exists for the platform
- Creators join with creator+issuer role
- Creators can issue as the platform OR as themselves
- Platform admin manages overall badge catalog

---

## Issuer Selection

When creating or issuing a badge, users pick which issuer identity to use:

```
Issue As:
  [x] Jane Developer (Personal)
  [ ] Fobizz (Organization)
  [ ] ACME Corp (Organization)
```

This is the key flexibility point. Everything else flows from this choice.

---

## Evidence Validation

Evidence is proof that someone earned a badge. The system handles evidence at three points:

### 1. At Badge Creation - Requirements

When creating a badge, issuers define evidence requirements:

| Setting        | Options                               |
| -------------- | ------------------------------------- |
| Requirement    | None / Optional / Required            |
| Accepted types | URL, File upload, Text description    |
| Instructions   | Custom text explaining what to submit |

### 2. Approval Workflows

How applications get processed:

| Method              | How it works           | Use case                                |
| ------------------- | ---------------------- | --------------------------------------- |
| **Self-issue**      | No review, instant     | Personal achievements, self-attestation |
| **Review required** | Goes to reviewer queue | Courses, certifications, org badges     |
| **Claim code**      | Enter code to claim    | Events, workshops, attendance           |

For "Review required" badges:

- Applications appear in the Review Applications queue
- Reviewers see submitted evidence
- Can approve, reject, or request more info
- Badge issued only after approval

### 3. At Verification - Validity Checks

When someone verifies a badge:

- **Signature check** - Has the credential been tampered with?
- **Issuer check** - Is the issuer who they claim to be?
- **URL check** - Is evidence URL still accessible? (optional)
- **Expiration check** - Has the badge expired?

---

## What We're NOT Building (Yet)

These features exist in enterprise platforms but add complexity:

- **Sub-organizations** - Hierarchies like University > Faculty > Department
- **Badge-level permissions** - Restricting which members can issue which badges
- **Peer assessment** - Multiple reviewers voting on applications
- **Multi-step approval** - Jury-based review with multiple stages

If needed, these can be added later without changing the core model.

---

## Data Model

```
User
  - id
  - email
  - name
  - personalIssuerId (auto-created)

Issuer
  - id
  - type: "personal" | "organization"
  - name
  - url (optional)
  - description (optional)
  - image (optional)

OrganizationMember
  - organizationId (issuer)
  - userId
  - role: "admin" | "creator" | "issuer"

Badge (BadgeClass/Achievement)
  - id
  - issuerId (who owns this badge definition)
  - name
  - description
  - criteria
  - image
  - evidenceRequired: "none" | "optional" | "required"
  - evidenceTypes: ["url", "file", "text"]
  - evidenceInstructions (optional)
  - approvalMethod: "self" | "review" | "claimCode"
  - claimCode (if approvalMethod is "claimCode")

Application (for review-required badges)
  - id
  - badgeId
  - applicantEmail
  - evidence: [{ type, value, description }]
  - status: "pending" | "approved" | "rejected"
  - submittedAt
  - reviewedAt (optional)
  - reviewedBy (optional)
  - reviewNotes (optional)

Assertion (IssuedBadge)
  - id
  - badgeId
  - issuerId (who issued it - may differ from badge owner)
  - recipientEmail
  - issuedAt
  - evidence (optional)
  - applicationId (if issued via review)
```

---

## References

- [Open Badge Factory - User Roles](https://support.openbadgefactory.com/en/support/solutions/articles/80001152706-obf-user-roles)
- [Open Badge Factory - Sub-organisations](https://support.openbadgefactory.com/en/support/solutions/articles/80001153479-sub-organisations)
- [Badge Wiki - Badge platforms](https://badge.wiki/wiki/Badge_platforms)

---

_Document created: January 2026_
