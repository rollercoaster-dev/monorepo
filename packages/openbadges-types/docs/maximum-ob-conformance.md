# Maximum Open Badges Protocol Conformance (Draft)

This document outlines concrete steps to achieve maximum protocol alignment for both Open Badges 2.0 and 3.0 in this package. Use this as a living checklist and workshop space for the team.

---

## Why "Maximum" Conformance?

- Ensures the codebase is not just functionally compatible, but also fully spec-aligned and future-proof.
- Enables easier audits, interoperability, and trust for integrators and users.
- Makes it easier to track and respond to spec changes.

---

## OB2.0: Maximum Conformance Checklist

- [ ] **TypeScript Types**
  - [ ] All OB2 entities and fields mapped 1:1 to the official spec
  - [ ] Mapping table up-to-date (see `docs/ob-mapping-table.md`)
- [ ] **JSON Schema**
  - [ ] Author or obtain an official OB2 JSON Schema (not just JSON-LD context)
  - [ ] Export schema in `src/schemas.ts`
- [ ] **Runtime Validation**
  - [ ] Implement AJV/Zod-based validation for OB2 objects using the schema
  - [ ] Add tests for valid/invalid OB2 objects using schema validation
- [ ] **Test Coverage**
  - [ ] Ensure all sample objects are validated by both type guards and schema
  - [ ] Add edge case and negative tests for all OB2 types
- [ ] **Documentation**
  - [ ] Document validation approach and any spec-to-implementation differences
  - [ ] Update protocol compliance doc with schema validation details

---

## OB3.0: Maximum Conformance Checklist

- [x] **TypeScript Types**
  - [x] All OB3 entities and fields mapped 1:1 to the official spec
  - [x] Mapping table up-to-date
- [x] **JSON Schema**
  - [x] Use official OB3 JSON-LD context for AJV validation
  - [x] Export schema in `src/schemas.ts`
- [x] **Runtime Validation**
  - [x] AJV-based validation for OB3 objects
  - [x] Tests for valid/invalid OB3 objects using schema validation
- [x] **Test Coverage**
  - [x] All sample objects validated by both type guards and schema
  - [x] Edge case and negative tests for all OB3 types
- [x] **Documentation**
  - [x] Validation approach and spec-to-implementation differences documented
  - [x] Protocol compliance doc includes schema validation details

---

## General Steps

- [ ] Review and update mapping table for both OB2 and OB3
- [ ] Add/expand tests for any uncovered edge cases
- [ ] Monitor spec for changes and update types/schemas as needed
- [ ] Encourage contributors to add new sample objects/tests for new types/fields

---

**Next: Use this document as the basis for a GitHub issue and ongoing workshop.**
