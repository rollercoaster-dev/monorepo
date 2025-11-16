# Open Badges Type ↔ Spec Mapping Table

This table tracks the mapping between the official Open Badges 2.0/3.0 specification fields and the TypeScript types in this package. Use it to ensure every field is accounted for and correctly typed.

<!-- SUGGESTION: See 'Suggestions & Maintenance Notes' at the end of this document for ongoing best practices. -->

| Spec Field      | OB Version | JSON-LD Path                | TypeScript Type         | Notes/Comments                |
|-----------------|-----------|-----------------------------|------------------------|-------------------------------|
| `@context`      | 2.0, 3.0  | `@context`                  | `string \| string[]`   | Required for all root objects |
| `id`            | 2.0, 3.0  | `id`                        | `IRI`                  | Branded string                |
| `type`          | 2.0, 3.0  | `type`                      | `string \| string[]`   | Enum or string                |
| `recipient`     | 2.0       | `recipient`                 | `IdentityObject`        | OB2 Assertion                 |
| `issuer`        | 2.0       | `issuer`                    | `Profile \| IRI`        | OB2 BadgeClass                |
| `issuer`        | 3.0       | `issuer`                    | `Issuer`                | OB3 VerifiableCredential      |
| `proof`         | 3.0       | `proof`                     | `Proof`                 | OB3 VerifiableCredential      |
| `credentialStatus` | 3.0    | `credentialStatus`         | `CredentialStatus`      | OB3 VerifiableCredential      |
| `refreshService` | 3.0       | `refreshService`           | `RefreshService`        | OB3 VerifiableCredential      |
| `termsOfUse`    | 3.0       | `termsOfUse`               | `TermsOfUse \| TermsOfUse[]` | OB3 VerifiableCredential      |
| ...             | ...       | ...                         | ...                    | ...                           |

---

## OB2 Assertion Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `@context`         | `@context`    | `string | string[] | Record<string, any>`      | Optional in type, required in JSON-LD|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `'Assertion' | string | string[]`              |                                      |
| `recipient`        | `recipient`   | `IdentityObject`                              |                                      |
| `badge`            | `badge`       | `IRI | BadgeClass`                             |                                      |
| `verification`     | `verification`| `VerificationObject`                          |                                      |
| `issuedOn`         | `issuedOn`    | `DateTime`                                    | ISO 8601 string                      |
| `image`            | `image`       | `IRI | Image`                                  | Optional                             |
| `evidence`         | `evidence`    | `IRI | Evidence | JsonLdArray<IRI | Evidence>` | Optional, array or single            |
| `narrative`        | `narrative`   | `string | MarkdownText`                         | Optional                             |
| `expires`          | `expires`     | `DateTime`                                    | Optional, ISO 8601                   |
| `revoked`          | `revoked`     | `boolean`                                     | Optional                             |
| `revocationReason` | `revocationReason` | `string`                                 | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

- See `src/v2/index.ts` for full interface.
- See `/schemas/ob2-context.json` for JSON-LD mapping.
- Add more fields as needed for full coverage.

---

## OB2 BadgeClass Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `@context`         | `@context`    | `string | string[] | Record<string, any>`      | Optional in type, required in JSON-LD|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `'BadgeClass' | string | string[]`             |                                      |
| `name`             | `name`        | `string`                                       |                                      |
| `description`      | `description` | `string`                                       |                                      |
| `image`            | `image`       | `IRI | Image`                                  |                                      |
| `criteria`         | `criteria`    | `IRI | Criteria`                               |                                      |
| `issuer`           | `issuer`      | `IRI | Profile`                                |                                      |
| `alignment`        | `alignment`   | `AlignmentObject | AlignmentObject[]`          | Optional                             |
| `tags`             | `tags`        | `string[]`                                    | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

- See `src/v2/index.ts` for full interface.
- See `/schemas/ob2-context.json` for JSON-LD mapping.
- Add more fields as needed for full coverage.

- For a full list of fields, see the OB 2.0 and OB 3.0 context/schema files in `/schemas/`.
- Add rows as you review each entity and field.
- Use the Notes/Comments column for edge cases, spec ambiguities, or implementation notes.

---

## OB2 Profile Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `@context`         | `@context`    | `string | string[] | Record<string, any>`      | Optional in type, required in JSON-LD|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `'Profile' | 'Issuer' | string | string[]`     |                                      |
| `name`             | `name`        | `string`                                       |                                      |
| `url`              | `url`         | `IRI`                                         | Optional                             |
| `email`            | `email`       | `string`                                       | Optional                             |
| `description`      | `description` | `string`                                       | Optional                             |
| `image`            | `image`       | `IRI | Image`                                  | Optional                             |
| `telephone`        | `telephone`   | `string`                                       | Optional                             |
| `verification`     | `verification`| `VerificationObject`                           | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

- See `src/v2/index.ts` for full interface.
- See `/schemas/ob2-context.json` for JSON-LD mapping.
- Add more fields as needed for full coverage.

---

## OB2 IdentityObject Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `type`             | `type`        | `string`                                       | Required                             |
| `identity`         | `identity`    | `string`                                       | Required                             |
| `hashed`           | `hashed`      | `boolean`                                      | Optional                             |
| `salt`             | `salt`        | `string`                                       | Optional, required if hashed=true    |

<!-- SUGGESTION: If OB3 supports hashed identities, add a similar note for salt/hashed fields in OB3 IdentityObject. -->

---

## OB2 Evidence Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `type`             | `type`        | `string | string[]`                             | Optional                             |
| `narrative`        | `narrative`   | `string | MarkdownText`                         | Optional                             |
| `name`             | `name`        | `string`                                       | Optional                             |
| `description`      | `description` | `string`                                       | Optional                             |
| `genre`            | `genre`       | `string`                                       | Optional                             |
| `audience`         | `audience`    | `string`                                       | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

---

## OB2 AlignmentObject Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `targetName`       | `targetName`  | `string`                                       |                                      |
| `targetUrl`        | `targetUrl`   | `IRI`                                          |                                      |
| `targetDescription`| `targetDescription`| `string`                                   | Optional                             |
| `targetFramework`  | `targetFramework`| `string`                                     | Optional                             |
| `targetCode`       | `targetCode`  | `string`                                       | Optional                             |

---

## OB2 Image Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `type`             | `type`        | `string`                                       | Optional                             |
| `caption`          | `caption`     | `string`                                       | Optional                             |
| `author`           | `author`      | `string`                                       | Optional                             |
| `imageData`        | `imageData`   | `string`                                       | Data URI, Optional                   |

---

## OB2 Criteria Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `narrative`        | `narrative`   | `string | MarkdownText`                         | Optional                             |

---

## OB2 RevocationList Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `@context`         | `@context`    | `string | string[] | Record<string, any>`      | Optional in type, required in JSON-LD|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `'RevocationList' | string | string[]`          |                                      |
| `revokedAssertions`| `revokedAssertions`| `string[]`                                 |                                      |

---

## OB2 CryptographicKey Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `@context`         | `@context`    | `string | string[] | Record<string, any>`      | Optional in type, required in JSON-LD|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `'CryptographicKey' | string | string[]`        |                                      |
| `owner`            | `owner`       | `IRI`                                          |                                      |
| `publicKeyPem`     | `publicKeyPem`| `string`                                       | Optional                             |

---

## OB2 Extension Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

---

## OB2 VerificationObject Field Mapping

| Spec Field             | JSON-LD Path         | TypeScript Type                                 | Notes/Comments                       |
|------------------------|---------------------|------------------------------------------------|--------------------------------------|
| `type`                 | `type`              | `'hosted' | 'signed' | string`                 |                                      |
| `verificationProperty` | `verificationProperty`| `string`                                    | Optional                             |
| `startsWith`           | `startsWith`        | `string`                                       | Optional                             |
| `allowedOrigins`       | `allowedOrigins`    | `string | string[]`                             | Optional                             |
| `creator`              | `creator`           | `IRI`                                          | Optional                             |

---

## OB3 VerifiableCredential Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `@context`         | `@context`    | `string | string[] | Record<string, any>`      | Required                             |
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `'VerifiableCredential' | string | string[]`    |                                      |
| `issuer`           | `issuer`      | `IRI | Issuer`                                  |                                      |
| `issuanceDate`     | `issuanceDate`| `DateTime`                                     |                                      |
| `expirationDate`   | `expirationDate`| `DateTime`                                   | Optional                             |
| `credentialSubject`| `credentialSubject`| `CredentialSubject`                        |                                      |
| `proof`            | `proof`       | `Proof`                                        | Optional                             |
| `credentialStatus` | `credentialStatus`| `CredentialStatus`                         | Optional                             |
| `refreshService`   | `refreshService`| `RefreshService`                             | Optional                             |
| `termsOfUse`       | `termsOfUse`  | `TermsOfUse | TermsOfUse[]`                     | Optional                             |
| `evidence`         | `evidence`    | `Evidence | Evidence[]`                         | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

- See `src/v3/index.ts` for full interface.
- See `/schemas/ob3-context.json` for JSON-LD mapping.
- Add more fields as needed for full coverage.

---

## OB3 Issuer Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `string | string[]`                             |                                      |
| `name`             | `name`        | `string | MultiLanguageString`                   |                                      |
| `description`      | `description` | `string | MultiLanguageString`                   | Optional                             |
| `url`              | `url`         | `IRI`                                         |                                      |
| `image`            | `image`       | `IRI | OB3ImageObject`                         | Optional                             |
| `email`            | `email`       | `string`                                       | Optional                             |
| `telephone`        | `telephone`   | `string`                                       | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

---

## OB3 CredentialSubject Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `type`             | `type`        | `string | string[]`                             | Optional                             |
| `achievement`      | `achievement` | `Achievement | Achievement[]`                    |                                      |
| `name`             | `name`        | `string | MultiLanguageString`                   | Optional                             |
| `email`            | `email`       | `string`                                       | Optional                             |
| `role`             | `role`        | `string`                                       | Optional, per OB3 context            |
| `identifier`       | `identifier`  | `IdentityObject[]`                              | Optional, per OB3 context            |
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

---

## OB3 Achievement Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `string | string[]`                             |                                      |
| `name`             | `name`        | `string | MultiLanguageString`                   |                                      |
| `description`      | `description` | `string | MultiLanguageString`                   | Optional                             |
| `achievementType`  | `achievementType` | `string`                                   | Optional                             |
| `criteria`         | `criteria`    | `Criteria`                                    | Optional                             |
| `tag`              | `tag`         | `string[]`                                    | Optional                             |
| `specialization`   | `specialization` | `string`                                    | Optional                             |
| `image`            | `image`       | `IRI | OB3ImageObject`                         | Optional                             |
| `creator`          | `creator`     | `IRI | Issuer`                                 | Optional                             |
| `alignments`       | `alignments`  | `Alignment[]`                                 | Optional                             |
| `resultDescriptions`| `resultDescriptions`| `ResultDescription[]`                    | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                         | Allows extensions                    |

---

## OB3 Proof Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `type`             | `type`        | `string`                                       |                                      |
| `created`          | `created`     | `DateTime`                                     |                                      |
| `verificationMethod`| `verificationMethod`| `IRI`                                     |                                      |
| `proofPurpose`     | `proofPurpose`| `string`                                       |                                      |
| `proofValue`       | `proofValue`  | `string`                                       | Optional                             |
| `jws`              | `jws`         | `string`                                       | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 Evidence Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `type`             | `type`        | `string | string[]`                             | Optional                             |
| `narrative`        | `narrative`   | `string | MarkdownText`                         | Optional                             |
| `name`             | `name`        | `string | MultiLanguageString`                   | Optional                             |
| `description`      | `description` | `string | MultiLanguageString`                   | Optional                             |
| `genre`            | `genre`       | `string`                                       | Optional                             |
| `audience`         | `audience`    | `string`                                       | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 Criteria Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `type`             | `type`        | `string | string[]`                             | Optional                             |
| `narrative`        | `narrative`   | `string | MarkdownText`                         | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 Alignment Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `targetName`       | `targetName`  | `string`                                       |                                      |
| `targetUrl`        | `targetUrl`   | `IRI`                                          |                                      |
| `targetDescription`| `targetDescription`| `string`                                   | Optional                             |
| `targetFramework`  | `targetFramework`| `string`                                     | Optional                             |
| `targetCode`       | `targetCode`  | `string`                                       | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 ResultDescription Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `type`             | `type`        | `string | string[]`                             | Optional                             |
| `name`             | `name`        | `string | MultiLanguageString`                   | Optional                             |
| `description`      | `description` | `string | MultiLanguageString`                   | Optional                             |
| ...                | ...           | ...                                            | Add more fields from OB3 spec as needed |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 Results Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `type`             | `type`        | `string | string[]`                             | Optional                             |
| `resultDescription`| `resultDescription`| `IRI | ResultDescription`                  | Optional                             |
| `status`           | `status`      | `string`                                       | Optional                             |
| `value`            | `value`       | `string | number`                               | Optional                             |
| ...                | ...           | ...                                            | Add more fields from OB3 spec as needed |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 CredentialStatus Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `string`                                       |                                      |
| `statusPurpose`    | `statusPurpose`| `string`                                      | Optional                             |
| `statusList`       | `statusList`  | `IRI`                                          | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 RefreshService Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         |                                      |
| `type`             | `type`        | `string`                                       |                                      |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 TermsOfUse Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Optional                             |
| `type`             | `type`        | `string`                                       |                                      |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3ImageObject Field Mapping

| Spec Field         | JSON-LD Path   | TypeScript Type                                 | Notes/Comments                       |
|--------------------|---------------|------------------------------------------------|--------------------------------------|
| `id`               | `id`          | `IRI`                                         | Required                             |
| `type`             | `type`        | `'Image'`                                      | Required, must be 'Image'            |
| `caption`          | `caption`     | `string \| MultiLanguageString`                | Optional                             |
| `author`           | `author`      | `string`                                       | Optional                             |
| `[key: string]`    | (extensions)  | `any`                                          | Allows extensions                    |

---

## OB3 IdentityObject Field Mapping

| Spec Field     | JSON-LD Path   | TypeScript Type         | Notes/Comments                       |
|----------------|---------------|------------------------|--------------------------------------|
| `identityHash` | `identityHash` | `string`               | Required                             |
| `identityType` | `identityType` | `string`               | Optional                             |
| `hashed`       | `hashed`       | `boolean`              | Optional                             |
| `salt`         | `salt`         | `string`               | Optional, required if hashed=true    |

---

## Suggestions & Maintenance Notes

- **General:** Keep this mapping table up to date as you evolve your types or as the OB2/OB3 specs change. Use the Notes/Comments column for any ambiguities, implementation choices, or spec clarifications.