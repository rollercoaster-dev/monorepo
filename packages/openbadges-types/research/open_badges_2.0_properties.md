# Assertion Properties

| Property | Expected Type | Description |
|----------|--------------|-------------|
| id | IRI | Unique IRI for the Assertion. If using hosted verification, this should be the URL where the assertion is accessible. For signed Assertions, it is recommended to use a UUID in the urn:uuid namespace. |
| type | JSON-LD type (Multiple values allowed) | Valid JSON-LD representation of the Assertion type. In most cases, this will simply be the string "Assertion". An array including "Assertion" and other string elements that are either URLs or compact IRIs within the current context are allowed. |
| recipient | IdentityObject | The recipient of the achievement. |
| badge | @id: BadgeClass | IRI or document that describes the type of badge being awarded. If an HTTP/HTTPS IRI, the endpoint should be a BadgeClass. |
| verification | VerificationObject | Instructions for third parties to verify this assertion. |
| issuedOn | DateTime | Timestamp of when the achievement was awarded. |
| image | @id: Image | IRI or document representing an image representing this user's achievement. This must be a PNG or SVG image, and should be prepared via the Baking specification. An 'unbaked' image for the badge is defined in the BadgeClass and should not be duplicated here. |
| evidence | @id: Evidence (Multiple values allowed) | IRI or document describing the work that the recipient did to earn the achievement. This can be a page that links out to other pages if linking directly to the work is infeasible. |
| narrative | Text or Markdown Text | A narrative that connects multiple pieces of evidence. Likely only present at this location if evidence is a multi-value array. |
| expires | DateTime | If the achievement has some notion of expiry, this indicates a timestamp when a badge should no longer be considered valid. After this time, the badge should be considered expired. |
| revoked | Boolean | Defaults to false. If Assertion is not referenced from a revokedAssertions list and may be omitted. If revoked is true, only revoked and id are required properties, and many issuers strip a hosted Assertion down to only those properties when revoked. |
| revocationReason | Text | Optional published reason for revocation, if revoked. |

# BadgeClass Properties

| Property | Expected Type | Description |
|----------|--------------|-------------|
| id | IRI | Unique IRI for the BadgeClass. If using hosted verification, this should be the URL where the BadgeClass is accessible. |
| type | JSON-LD type (Multiple values allowed) | Valid JSON-LD representation of the BadgeClass type. In most cases, this will simply be the string "BadgeClass". An array including "BadgeClass" and other string elements that are either URLs or compact IRIs within the current context are allowed. |
| name | Text | The name of the achievement. |
| description | Text | A short description of the achievement. |
| image | @id: Image | IRI or document representing an image representing this achievement. This must be a PNG or SVG image. |
| criteria | @id: Criteria or Text | IRI or document describing the criteria for the achievement. If linked to a URL, the URL should be the authoritative source for the criteria. |
| issuer | @id: Profile | IRI or document describing the individual, entity, or organization that issued the badge. |
| alignment | AlignmentObject (Multiple values allowed) | Objects describing educational standards or other skill frameworks relevant to the achievement. |
| tags | Text (Multiple values allowed) | Tags that describe the type of achievement. |

# Profile Properties

| Property | Expected Type | Description |
|----------|--------------|-------------|
| id | IRI | Unique IRI for the Profile. If using hosted verification, this should be the URL where the Profile is accessible. |
| type | JSON-LD type (Multiple values allowed) | Valid JSON-LD representation of the Profile type. In most cases, this will simply be the string "Profile" or "Issuer". |
| name | Text | The name of the entity or organization. |
| description | Text | A short description of the issuer. |
| url | URL | The homepage or website of the entity. |
| email | Text | The email address of the entity. |
| telephone | Text | The telephone number of the entity. |
| image | @id: Image | IRI or document representing an image representing the entity. |
| verification | VerificationObject | Instructions for third parties to verify assertions from this issuer. |

# IdentityObject Properties

| Property | Expected Type | Description |
|----------|--------------|-------------|
| type | Text | The type of identity. Common values are "email", "url", "telephone", or "id". |
| identity | Text | The value of the identity. |
| hashed | Boolean | Whether the identity value is hashed. |
| salt | Text | If the identity is hashed, this should contain the string used to salt the hash. |
