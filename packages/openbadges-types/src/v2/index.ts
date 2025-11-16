export * from './guards';
import type { IRI, DateTime, MarkdownText } from '../shared/common';
import type { JsonLdObject, JsonLdArray } from '../shared/jsonld';

/**
 * IdentityObject interface for Open Badges 2.0
 * Represents the identity of a badge recipient
 */
export interface IdentityObject {
  type: string;
  identity: string;
  hashed?: boolean;
  salt?: string;
}

/**
 * VerificationObject interface for Open Badges 2.0
 * Contains instructions for third parties to verify this assertion
 */
export interface VerificationObject {
  type: 'hosted' | 'signed' | string;
  verificationProperty?: string;
  startsWith?: string;
  allowedOrigins?: string | string[];
  creator?: IRI;
}

/**
 * Evidence interface for Open Badges 2.0
 * Describes the work that the recipient did to earn the achievement
 */
export interface Evidence {
  id?: IRI;
  type?: string | string[];
  narrative?: string | MarkdownText;
  name?: string;
  description?: string;
  genre?: string;
  audience?: string;
  [key: string]: unknown;
}

/**
 * AlignmentObject interface for Open Badges 2.0
 * Describes an alignment to an educational standard or other skill framework
 */
export interface AlignmentObject {
  targetName: string;
  targetUrl: IRI;
  targetDescription?: string;
  targetFramework?: string;
  targetCode?: string;
}

/**
 * Image interface for Open Badges 2.0
 * Represents an image associated with a badge
 */
export interface Image {
  id?: IRI;
  type?: string;
  caption?: string;
  author?: string;
  imageData?: string; // Data URI
}

/**
 * Criteria interface for Open Badges 2.0
 * Describes the criteria for earning the badge
 */
export interface Criteria {
  id?: IRI;
  narrative?: string | MarkdownText;
}

/**
 * BadgeClass interface for Open Badges 2.0
 * Represents the type of achievement being awarded
 */
export interface BadgeClass extends JsonLdObject {
  '@context'?: string | string[] | Record<string, unknown>;
  id: IRI;
  type: 'BadgeClass' | string | string[];
  name: string;
  description: string;
  image: IRI | Image;
  criteria: IRI | Criteria;
  issuer: IRI | Profile;
  alignment?: AlignmentObject | AlignmentObject[];
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Profile interface for Open Badges 2.0
 * Represents an issuer of badges
 */
export interface Profile extends JsonLdObject {
  '@context'?: string | string[] | Record<string, unknown>;
  id: IRI;
  type: 'Profile' | 'Issuer' | string | string[];
  name: string;
  url?: IRI;
  email?: string;
  description?: string;
  image?: IRI | Image;
  telephone?: string;
  verification?: VerificationObject;
  [key: string]: unknown;
}

/**
 * Assertion interface for Open Badges 2.0
 * Represents an awarded badge to a specific recipient
 */
export interface Assertion extends JsonLdObject {
  '@context'?: string | string[] | Record<string, unknown>;
  id: IRI;
  type: 'Assertion' | string | string[];
  recipient: IdentityObject;
  badge: IRI | BadgeClass;
  verification: VerificationObject;
  issuedOn: DateTime;
  image?: IRI | Image;
  evidence?: IRI | Evidence | JsonLdArray<IRI | Evidence>;
  narrative?: string | MarkdownText;
  expires?: DateTime;
  revoked?: boolean;
  revocationReason?: string;
  [key: string]: unknown;
}

/**
 * RevocationList interface for Open Badges 2.0
 * Contains a list of revoked assertions
 */
export interface RevocationList extends JsonLdObject {
  '@context'?: string | string[] | Record<string, unknown>;
  id: IRI;
  type: 'RevocationList' | string | string[];
  revokedAssertions: string[];
}

/**
 * CryptographicKey interface for Open Badges 2.0
 * Represents a cryptographic key used for verification
 */
export interface CryptographicKey extends JsonLdObject {
  '@context'?: string | string[] | Record<string, unknown>;
  id: IRI;
  type: 'CryptographicKey' | string | string[];
  owner: IRI;
  publicKeyPem?: string;
}

/**
 * Extension interface for Open Badges 2.0
 * Represents an extension to the Open Badges specification
 */
export interface Extension {
  [key: string]: unknown;
}
