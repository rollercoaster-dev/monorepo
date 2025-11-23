/**
 * Key Management Types
 */

export type KeyAlgorithm =
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'EdDSA';

export type KeyType = 'RSA' | 'EC' | 'OKP';

export type KeyUse = 'sig' | 'enc';

export type KeyOperation =
  | 'sign'
  | 'verify'
  | 'encrypt'
  | 'decrypt'
  | 'wrapKey'
  | 'unwrapKey'
  | 'deriveKey'
  | 'deriveBits';

export type EllipticCurve =
  | 'P-256'
  | 'P-384'
  | 'P-521'
  | 'Ed25519'
  | 'Ed448'
  | 'X25519'
  | 'X448';

export type KeyStatus = 'active' | 'inactive' | 'compromised' | 'expired';

export interface JWK {
  kty: KeyType;
  use?: KeyUse;
  key_ops?: KeyOperation[];
  alg?: KeyAlgorithm;
  kid?: string;
  x5u?: string;
  x5c?: string[];
  x5t?: string;
  'x5t#S256'?: string;
  n?: string;
  e?: string;
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
  crv?: EllipticCurve;
  x?: string;
  y?: string;
}

export interface JWKS {
  keys: JWK[];
}

export interface KeyPair {
  id: string;
  algorithm: KeyAlgorithm;
  privateKey: string;
  publicKey: string;
  publicKeyJwk: JWK;
  status: KeyStatus;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
}
