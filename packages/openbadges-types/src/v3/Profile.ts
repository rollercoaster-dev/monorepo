/**
 * @module
 * @description Defines the TypeScript interface for the Open Badges V3 Profile
 * @see https://www.imsglobal.org/spec/ob/v3p0/#profile
 */

/**
 * A Profile is a collection of information that describes the entity or organization using Open Badges. Issuers must be represented as Profiles, and endorsers, or other entities may also be represented using this vocabulary. Each Profile that represents an Issuer may be referenced in many BadgeClasses that it has defined. Anyone can create and host an Issuer file to start issuing Open Badges. Issuers may also serve as recipients of Open Badges, often identified within an Assertion by specific properties, like their url or contact email address.
 */
/**
 * Represents the Profile structure in Open Badges V3.
 * @see https://www.imsglobal.org/spec/ob/v3p0/#profile
 */
export interface Profile {
  /**
   * Unique URI for the Issuer/Profile file.
   */
  id: string;
  /**
   * @minItems 1
   */
  type: [string, ...string[]];
  /**
   * The name of the entity or organization.
   */
  name?: string;
  /**
   * The homepage or social media profile of the entity, whether individual or institutional. Should be a URL/URI Accessible via HTTP.
   */
  url?: string;
  /**
   * A phone number.
   */
  phone?: string;
  /**
   * A short description of the issuer entity or organization.
   */
  description?: string;
  endorsement?: {
    /**
     * @minItems 2
     */
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      string,
      ...(
        | string
        | {
            [k: string]: unknown;
          }
      )[],
    ];
    type: [string, ...string[]];
    /**
     * Unambiguous reference to the credential.
     */
    id: string;
    /**
     * The name of the credential for display purposes in wallets. For example, in a list of credentials and in detail views.
     */
    name: string;
    /**
     * The short description of the credential for display purposes in wallets.
     */
    description?: string;
    /**
     * A collection of information about the subject of the endorsement.
     */
    credentialSubject: {
      /**
       * The identifier of the individual, entity, ... that is endorsed.
       */
      id: string;
      /**
       * @minItems 1
       */
      type: [string, ...string[]];
      /**
       * Allows endorsers to make a simple claim...
       */
      endorsementComment?: string;
      [k: string]: unknown;
    };
    /**
     * Timestamp of when the credential was awarded. `validFrom` is used to determine the most recent version of a Credential in conjunction with `issuer` and `id`. Consequently, the only way to update a Credental is to update the `validFrom`, losing the date when the Credential was originally awarded. `awardedDate` is meant to keep this original date.
     */
    awardedDate?: string;
    /**
     * A description of the individual, entity, or organization that issued the credential. Either a URI or a simplified Profile object MUST be supplied.
     */
    issuer:
      | string
      | {
          /**
           * Unique URI for the Issuer/Profile file.
           */
          id: string;
          /**
           * @minItems 1
           */
          type: [string, ...string[]];
          name?: string;
          [k: string]: unknown;
        };
    /**
     * Timestamp of when the credential becomes valid.
     */
    validFrom: string;
    /**
     * If the credential has some notion of validity period, this indicates a timestamp when a credential should no longer be considered valid. After this time, the credential should be considered invalid.
     */
    validUntil?: string;
    proof?: {
      /**
       * Signature suite used to produce proof.
       */
      type: string;
      /**
       * Date the proof was created.
       */
      created?: string;
      /**
       * The suite used to create the proof.
       */
      cryptosuite?: string;
      /**
       * A value chosen by the verifier to mitigate authentication proof replay attacks.
       */
      challenge?: string;
      /**
       * The domain of the proof to restrict its use to a particular target.
       */
      domain?: string;
      /**
       * A value chosen by the creator of proof to randomize proof values for privacy purposes.
       */
      nonce?: string;
      /**
       * The purpose of the proof to be used with `verificationMethod`. MUST be 'assertionMethod'.
       */
      proofPurpose?: string;
      /**
       * Value of the proof.
       */
      proofValue?: string;
      /**
       * The URL of the public key that can verify the signature.
       */
      verificationMethod?: string;
      [k: string]: unknown;
    }[];
    credentialSchema?: {
      /**
       * The value MUST be a URI identifying the schema file. One instance of `CredentialSchema` MUST have an `id` that is the URL of the JSON Schema for this credential defined by this specification.
       */
      id: string;
      /**
       * The value MUST identify the type of data schema validation. One instance of `CredentialSchema` MUST have a `type` of 'JsonSchemaValidator2019'.
       */
      type: string;
      [k: string]: unknown;
    }[];
    /**
     * The information in CredentialStatus is used to discover information about the current status of a verifiable credential, such as whether it is suspended or revoked.
     */
    credentialStatus?: {
      /**
       * The value MUST be the URL of the issuer's credential status method.
       */
      id: string;
      /**
       * The name of the credential status method.
       */
      type: string;
      [k: string]: unknown;
    };
    /**
     * The information in RefreshService is used to refresh the verifiable credential.
     */
    refreshService?: {
      /**
       * The value MUST be the URL of the issuer's refresh service.
       */
      id: string;
      /**
       * The name of the refresh service method.
       */
      type: string;
      [k: string]: unknown;
    };
    termsOfUse?: {
      /**
       * The value MUST be a URI identifying the term of use.
       */
      id?: string;
      /**
       * The value MUST identify the type of the terms of use.
       */
      type: string;
      [k: string]: unknown;
    }[];
    [k: string]: unknown;
  }[];
  endorsementJwt?: string[];
  /**
   * Metadata about images that represent assertions...
   */
  image?: {
    /**
     * The URI or Data URI of the image.
     */
    id: string;
    /**
     * MUST be the IRI 'Image'.
     */
    type: "Image";
    /**
     * The caption for the image.
     */
    caption?: string;
  };
  /**
   * An email address.
   */
  email?: string;
  /**
   * An address for the described entity.
   */
  address?: {
    /**
     * @minItems 1
     */
    type: [string, ...string[]];
    /**
     * A country.
     */
    addressCountry?: string;
    /**
     * A country code. The value must be a ISO 3166-1 alpha-2 country code [[ISO3166-1]].
     */
    addressCountryCode?: string;
    /**
     * A region within the country.
     */
    addressRegion?: string;
    /**
     * A locality within the region.
     */
    addressLocality?: string;
    /**
     * A street address within the locality.
     */
    streetAddress?: string;
    /**
     * A post office box number for PO box addresses.
     */
    postOfficeBoxNumber?: string;
    /**
     * A postal code.
     */
    postalCode?: string;
    /**
     * The geographic coordinates of a location.
     */
    geo?: {
      /**
       * The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'GeoCoordinates'.
       */
      type: "GeoCoordinates";
      /**
       * The latitude of the location [[WGS84]].
       */
      latitude: number;
      /**
       * The longitude of the location [[WGS84]].
       */
      longitude: number;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  otherIdentifier?: {
    /**
     * The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'IdentifierEntry'.
     */
    type: "IdentifierEntry";
    /**
     * An identifier.
     */
    identifier: string;
    /**
     * The identifier type.
     */
    identifierType:
      | (
          | "name"
          | "sourcedId"
          | "systemId"
          | "productId"
          | "userName"
          | "accountId"
          | "emailAddress"
          | "nationalIdentityNumber"
          | "isbn"
          | "issn"
          | "lisSourcedId"
          | "oneRosterSourcedId"
          | "sisSourcedId"
          | "ltiContextId"
          | "ltiDeploymentId"
          | "ltiToolId"
          | "ltiPlatformId"
          | "ltiUserId"
          | "identifier"
        )
      | string;
  }[];
  /**
   * If the entity is an organization, `official` is the name of an authorized official of the organization.
   */
  official?: string;
  /**
   * A description of the individual, entity, or organization that issued the credential...
   */
  parentOrg?:
    | string
    | {
        /**
         * ...
         */
        id: string;
        /**
         * @minItems 1
         */
        type: [string, ...string[]];
        name?: string;
        [k: string]: unknown;
      };
  /**
   * Family name. In the western world, often referred to as the 'last name' of a person.
   */
  familyName?: string;
  /**
   * Given name. In the western world, often referred to as the 'first name' of a person.
   */
  givenName?: string;
  /**
   * Additional name. Includes what is often referred to as 'middle name' in the western world.
   */
  additionalName?: string;
  /**
   * Patronymic name.
   */
  patronymicName?: string;
  /**
   * Honorific prefix(es) preceding a person's name (e.g. 'Dr', 'Mrs' or 'Mr').
   */
  honorificPrefix?: string;
  /**
   * Honorific suffix(es) following a person's name (e.g. 'M.D, PhD').
   */
  honorificSuffix?: string;
  /**
   * Family name prefix. As used in some locales, this is the leading part of a family name (e.g. 'de' in the name 'de Boer').
   */
  familyNamePrefix?: string;
  /**
   * Birthdate of the person.
   */
  dateOfBirth?: string;
  [k: string]: unknown;
}
