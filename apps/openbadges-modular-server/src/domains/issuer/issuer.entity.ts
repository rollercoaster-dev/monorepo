/**
 * Version-agnostic Issuer entity for Open Badges API
 *
 * This file defines the Issuer domain entity that can represent both
 * Open Badges 2.0 and 3.0 specifications.
 */

import type { OB2, OB3, Shared } from 'openbadges-types';
import type { IssuerData } from '../../utils/types/badge-data.types';
import { BadgeVersion } from '../../utils/version/badge-version';
import { BadgeSerializerFactory } from '../../utils/version/badge-serializer';
import { VC_V2_CONTEXT_URL } from '@/constants/urls';
import { createOrGenerateIRI } from '@utils/types/iri-utils';
import { generateDidWeb } from '../../utils/did';

/**
 * Issuer entity representing an organization or individual that issues badges
 * Compatible with both Open Badges 2.0 and 3.0
 */
export class Issuer
  implements
    Omit<Partial<OB2.Profile>, 'image'>,
    Omit<Partial<OB3.Issuer>, 'image'>
{
  id: Shared.IRI;
  type: string = 'Issuer';
  name: string | Shared.MultiLanguageString;
  url: Shared.IRI;
  email?: string;
  description?: string | Shared.MultiLanguageString;
  image?: Shared.IRI | OB2.Image | Shared.OB3ImageObject;
  telephone?: string;
  publicKey?: Record<string, unknown>;
  [key: string]: unknown;

  /**
   * Returns the DID (Decentralized Identifier) for this issuer.
   * Generated from the issuer's URL using the did:web method.
   * @returns The DID string or null if URL is invalid
   */
  get did(): string | null {
    return generateDidWeb(this.url as string);
  }

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: Partial<Issuer>) {
    Object.assign(this, data);
  }

  /**
   * Factory method to create a new Issuer instance
   * @param data The issuer data
   * @returns A new Issuer instance
   */
  static create(data: Partial<Issuer>): Issuer {
    if (!data.id) {
      data.id = createOrGenerateIRI();
    }
    if (!data.type) {
      data.type = 'Issuer';
    }
    return new Issuer(data);
  }

  /**
   * Converts the issuer to a plain object
   * @param version The badge version to use (defaults to 3.0)
   * @returns A plain object representation of the issuer
   */
  toObject(version: BadgeVersion = BadgeVersion.V3): OB2.Profile | OB3.Issuer {
    let nameValue: string | Shared.MultiLanguageString = this.name;
    let descriptionValue: string | Shared.MultiLanguageString =
      this.description || '';

    if (version === BadgeVersion.V2) {
      nameValue =
        typeof this.name === 'string'
          ? this.name
          : Object.values(this.name)[0] || '';
      descriptionValue =
        typeof this.description === 'string'
          ? this.description
          : this.description
            ? Object.values(this.description)[0] || ''
            : '';
    }

    const baseObject = {
      id: this.id,
      name: nameValue,
      url: this.url,
      email: this.email,
      description: descriptionValue,
      image: this.image,
    };

    if (version === BadgeVersion.V2) {
      return {
        ...baseObject,
        type: 'Issuer',
      } as OB2.Profile;
    } else {
      // OB3 Issuer - include DID if available
      const ob3Response: Record<string, unknown> = {
        ...baseObject,
        type: 'Issuer',
        telephone: this.telephone,
      };
      const did = this.did;
      if (did) {
        ob3Response.did = did;
      }
      return ob3Response as OB3.Issuer;
    }
  }

  /**
   * Returns a partial representation of the issuer's internal state.
   * @returns A shallow copy of the issuer object as Partial<Issuer>.
   */
  toPartial(): Partial<Issuer> {
    return { ...this };
  }

  /**
   * Converts the issuer to a JSON-LD representation in the specified version
   * @param version The badge version to use (defaults to 3.0)
   * @returns A JSON-LD representation of the issuer
   */
  toJsonLd(version: BadgeVersion = BadgeVersion.V3): Record<string, unknown> {
    const serializer = BadgeSerializerFactory.createSerializer(version);

    let nameValue: string | Shared.MultiLanguageString;
    let descriptionValue: string | Shared.MultiLanguageString;

    if (version === BadgeVersion.V2) {
      nameValue =
        typeof this.name === 'string'
          ? this.name
          : Object.values(this.name)[0] || '';
      descriptionValue =
        typeof this.description === 'string'
          ? this.description
          : this.description
            ? Object.values(this.description)[0] || ''
            : '';
    } else {
      nameValue = this.name;
      descriptionValue = this.description || '';
    }

    const dataForSerializer: IssuerData = {
      id: this.id,
      name: nameValue,
      url: this.url as Shared.IRI,
      email: this.email,
      description: descriptionValue,
      image: this.image,
      telephone: version === BadgeVersion.V3 ? this.telephone : undefined,
      type: 'Issuer',
    };

    const jsonLd = serializer.serializeIssuer(dataForSerializer);

    if (version === BadgeVersion.V3) {
      if (!Array.isArray(jsonLd['@context'])) {
        jsonLd['@context'] = [jsonLd['@context']].filter(Boolean);
      }

      if (
        !jsonLd['@context'].includes(
          'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
        )
      ) {
        jsonLd['@context'].push(
          'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'
        );
      }

      if (!jsonLd['@context'].includes(VC_V2_CONTEXT_URL)) {
        jsonLd['@context'].push(VC_V2_CONTEXT_URL);
      }

      // Add DID for OB3
      const did = this.did;
      if (did) {
        jsonLd.did = did;
      }
    }

    return jsonLd;
  }

  /**
   * Gets a property value
   * @param property The property name
   * @returns The property value or undefined if not found
   */
  getProperty(property: string): unknown {
    return this[property];
  }
}
