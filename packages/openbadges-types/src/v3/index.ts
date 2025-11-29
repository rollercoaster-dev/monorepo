export * from './guards';
import type { IRI, DateTime, MarkdownText, MultiLanguageString, OB3ImageObject } from '../shared/common';
import type { JsonLdObject } from '../shared/jsonld';

/**
 * VerifiableCredential interface for Open Badges 3.0
 * Based on the W3C Verifiable Credentials Data Model v2.0
 */
export interface VerifiableCredential extends JsonLdObject {
  '@context': string | string[] | Record<string, unknown>;
  id: IRI;
  type: 'VerifiableCredential' | string | string[];
  issuer: IRI | Issuer;
  issuanceDate: DateTime;
  expirationDate?: DateTime;
  credentialSubject: CredentialSubject;
  proof?: Proof;
  credentialStatus?: CredentialStatus;
  refreshService?: RefreshService;
  termsOfUse?: TermsOfUse | TermsOfUse[];
  evidence?: Evidence | Evidence[];
  [key: string]: unknown;
}

/**
 * Issuer interface for Open Badges 3.0
 * Represents the entity issuing the credential
 */
export interface Issuer extends JsonLdObject {
  id: IRI;
  type: string | string[];
  name: string | MultiLanguageString;
  description?: string | MultiLanguageString;
  url: IRI;
  image?: IRI | OB3ImageObject;
  email?: string;
  telephone?: string;
  [key: string]: unknown;
}

/**
 * IdentityObject interface for Open Badges 3.0
 * Represents the identity of a badge recipient (hashed or plaintext)
 * See OB3 context for full field list
 */
export interface IdentityObject {
  identityHash: string;
  identityType?: string;
  hashed?: boolean;
  salt?: string; // Required if hashed is true
}

/**
 * CredentialSubject interface for Open Badges 3.0
 * Represents the entity receiving the credential and their achievements
 */
export interface CredentialSubject {
  id?: IRI;
  type?: string | string[];
  achievement: Achievement | Achievement[];
  name?: string | MultiLanguageString;
  email?: string;
  role?: string; // Optional, per OB3 context
  identifier?: IdentityObject[]; // Optional, per OB3 context
  [key: string]: unknown;
}

/**
 * Achievement interface for Open Badges 3.0
 * Represents the achievement being recognized
 * @see https://www.imsglobal.org/spec/ob/v3p0/#achievement
 */
export interface Achievement extends JsonLdObject {
  id: IRI;
  type: string | string[];
  name: string | MultiLanguageString;
  /** Required per OB3 spec Section 4.3 */
  description: string | MultiLanguageString;
  /** Required per OB3 spec Section 4.3 */
  criteria: Criteria;
  image?: IRI | OB3ImageObject;
  creator?: IRI | Issuer;
  alignments?: Alignment[];
  resultDescriptions?: ResultDescription[];
  [key: string]: unknown;
}

/**
 * Proof interface for Open Badges 3.0
 * Contains cryptographic proof information
 */
export interface Proof {
  type: string;
  created: DateTime;
  verificationMethod: IRI;
  proofPurpose: string;
  proofValue?: string;
  jws?: string;
  [key: string]: unknown;
}

/**
 * Evidence interface for Open Badges 3.0
 * Describes the evidence for the achievement
 */
export interface Evidence {
  id?: IRI;
  type?: string | string[];
  narrative?: string | MarkdownText;
  name?: string | MultiLanguageString;
  description?: string | MultiLanguageString;
  genre?: string;
  audience?: string;
  [key: string]: unknown;
}

/**
 * Criteria interface for Open Badges 3.0
 * Describes the criteria for earning the achievement
 */
export interface Criteria {
  id?: IRI;
  type?: string | string[];
  narrative?: string | MarkdownText;
  [key: string]: unknown;
}

/**
 * Alignment interface for Open Badges 3.0
 * Describes an alignment to an educational standard or skill framework
 */
export interface Alignment {
  targetName: string;
  targetUrl: IRI;
  targetDescription?: string;
  targetFramework?: string;
  targetCode?: string;
  [key: string]: unknown;
}

/**
 * ResultDescription interface for Open Badges 3.0
 * Describes possible results for an achievement
 * Extend as needed for additional OB3 spec fields
 */
export interface ResultDescription {
  id?: IRI;
  type?: string | string[];
  name?: string | MultiLanguageString;
  description?: string | MultiLanguageString;
  // Add more fields from OB3 spec as needed
  [key: string]: unknown;
}

/**
 * Results interface for Open Badges 3.0
 * Represents the results achieved by the recipient
 * Extend as needed for additional OB3 spec fields
 */
export interface Results {
  id?: IRI;
  type?: string | string[];
  resultDescription?: IRI | ResultDescription;
  status?: string;
  value?: string | number;
  // Add more fields from OB3 spec as needed
  [key: string]: unknown;
}

/**
 * CredentialStatus interface for Open Badges 3.0
 * Represents the status of a credential (e.g., revoked)
 */
export interface CredentialStatus {
  id: IRI;
  type: string;
  statusPurpose?: string;
  statusList?: IRI;
  [key: string]: unknown;
}

/**
 * RefreshService interface for Open Badges 3.0
 * Provides a way to refresh the credential
 */
export interface RefreshService {
  id: IRI;
  type: string;
  [key: string]: unknown;
}

/**
 * TermsOfUse interface for Open Badges 3.0
 * Describes the terms of use for the credential
 */
export interface TermsOfUse {
  id?: IRI;
  type: string;
  [key: string]: unknown;
}
