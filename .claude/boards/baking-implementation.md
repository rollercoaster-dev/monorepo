# GitHub Project Board Reference

This document references the GitHub Project board used for tracking monorepo development.

---

## Project Board

**Name**: Monorepo Development
**Number**: 11
**URL**: https://github.com/orgs/rollercoaster-dev/projects/11

---

## Status Columns

| Status      | Description                                              | Color  |
| ----------- | -------------------------------------------------------- | ------ |
| Backlog     | Not yet ready to start (blocked or needs prioritization) | Gray   |
| Next        | Ready to pick up - dependencies met                      | Blue   |
| In Progress | Currently being worked on                                | Yellow |
| In Review   | PR created, awaiting review                              | Purple |
| Done        | Merged to main                                           | Green  |

---

## Agent Board Commands

### Add Issue to Project

```bash
gh project item-add 11 --owner rollercoaster-dev --url <issue-url>
```

### Update Issue Status

```bash
# Get item ID first
gh project item-list 11 --owner rollercoaster-dev --format json | jq '.items[] | select(.content.number == <issue-number>)'

# Update status
gh project item-edit --project-id PVT_kwDOB1lz3c4BI2yZ --id <item-id> --field-id PVTSSF_lADOB1lz3c4BI2yZzg5MUx4 --single-select-option-id <option-id>
```

### Status Option IDs

| Status      | Option ID  |
| ----------- | ---------- |
| Backlog     | `8b7bb58f` |
| Next        | `266160c2` |
| In Progress | `3e320f16` |
| In Review   | `51c2af7b` |
| Done        | `56048761` |

**Project IDs:**

- Project ID: `PVT_kwDOB1lz3c4BI2yZ`
- Status Field ID: `PVTSSF_lADOB1lz3c4BI2yZzg5MUx4`

Query current option IDs (if they change):

```bash
gh api graphql -f query='
query {
  organization(login: "rollercoaster-dev") {
    projectV2(number: 11) {
      field(name: "Status") {
        ... on ProjectV2SingleSelectField {
          options { id name }
        }
      }
    }
  }
}'
```

---

## Dependency Graph (Badge Baking Sprint)

```
Track A (Keys) - Can start immediately
PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6

Track B (PNG Baking) - Can start immediately
PR 7 → PR 8 → PR 9

Track C (SVG Baking) - Can start after PR 7
PR 7 → PR 10 → PR 11

Track D (Unified Baking) - Needs PR 9 + PR 11
PR 12 → PR 13

Track E (Verification) - Can start immediately
PR 14 → PR 15 + PR 16 → PR 17 → PR 18 → PR 19

Track F (E2E + Docs) - Needs all above
PR 20 → PR 21
```

## Parallel Work Opportunities

**Right Now (No Dependencies) - Status: Next:**

- #108: Key management types
- #114: Baking service types
- #121: Verification service types

**After #108:**

- #109: Key generation service

**After #114:**

- #115: PNG chunk utilities
- #117: SVG parsing utilities

**After #121:**

- #122: Proof verification
- #123: Issuer verification

---

## Issue to PR Mapping

| PR  | Issue | Title                        |
| --- | ----- | ---------------------------- |
| 1   | #108  | Key management types         |
| 2   | #109  | Key generation service       |
| 3   | #110  | Key storage service          |
| 4   | #111  | JWKS endpoint                |
| 5   | #112  | DID:web endpoint             |
| 6   | #113  | Issuer DID update            |
| 7   | #114  | Baking service types         |
| 8   | #115  | PNG chunk utilities          |
| 9   | #116  | PNG baking service           |
| 10  | #117  | SVG parsing utilities        |
| 11  | #118  | SVG baking service           |
| 12  | #119  | Unified baking service       |
| 13  | #120  | Bake credential endpoint     |
| 14  | #121  | Verification service types   |
| 15  | #122  | Proof verification           |
| 16  | #123  | Issuer verification          |
| 17  | #124  | Unified verification service |
| 18  | #125  | Verify credential endpoint   |
| 19  | #126  | Verify baked image endpoint  |
| 20  | #127  | E2E tests                    |
| 21  | #128  | API documentation            |

---

_Last Updated: 2025-11-23_
