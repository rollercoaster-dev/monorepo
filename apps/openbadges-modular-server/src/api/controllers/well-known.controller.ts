import type { JsonWebKeySet, JsonWebKey } from '../../core/key.service';
import { KeyService } from '../../core/key.service';
import { config } from '../../config/config';
import { logger } from '../../utils/logging/logger.service';

export interface DidVerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk: JsonWebKey;
}

export interface DidDocument {
  '@context': string[];
  id: string;
  verificationMethod: DidVerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
}

export interface DidDocumentResponse {
  status: number;
  body: DidDocument | { error: string };
}

export class WellKnownController {
  async getDidDocument(): Promise<DidDocumentResponse> {
    try {
      logger.debug('Retrieving DID document');
      const jwks: JsonWebKeySet = await KeyService.getJwkSet();
      const baseUrl = config.openBadges.baseUrl;
      const host = new URL(baseUrl).host;
      const did = 'did:web:' + host;

      const verificationMethods: DidVerificationMethod[] = jwks.keys.map(
        (key, index) => {
          const keyId = key.kid || 'key-' + index;
          return {
            id: did + '#' + keyId,
            type: 'JsonWebKey2020',
            controller: did,
            publicKeyJwk: key,
          };
        }
      );

      const verificationMethodIds = verificationMethods.map((vm) => vm.id);

      const didDocument: DidDocument = {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/jws-2020/v1',
        ],
        id: did,
        verificationMethod: verificationMethods,
        authentication: verificationMethodIds,
        assertionMethod: verificationMethodIds,
      };

      logger.info('DID document retrieved successfully', {
        did,
        verificationMethodCount: verificationMethods.length,
        keyIds: jwks.keys.map((key) => key.kid).filter(Boolean),
      });

      return { status: 200, body: didDocument };
    } catch (error) {
      logger.error('Failed to retrieve DID document', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 500,
        body: { error: 'Internal server error while retrieving DID document' },
      };
    }
  }
}
