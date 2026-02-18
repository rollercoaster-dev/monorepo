/**
 * Tests for buildUnsignedCredential and buildDid
 *
 * openbadges-core (and its dep jose) are ESM-only and cannot be loaded by Jest's
 * CJS runtime. We mock serializeOB3 to return a predictable object so we can
 * verify our data-mapping logic without re-testing the library itself.
 */
import { buildUnsignedCredential, buildDid } from '../credentialBuilder';
import type { CredentialInput } from '../credentialBuilder';

jest.mock('@rollercoaster-dev/openbadges-core', () => ({
  serializeOB3: jest.fn((assertion, badgeClass, issuer) => ({
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'],
    id: assertion.id,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer,
    validFrom: assertion.issuedOn,
    credentialSubject: {
      id: assertion.recipient.identity,
      type: ['AchievementSubject'],
      achievement: {
        id: badgeClass.id,
        type: ['Achievement'],
        name: badgeClass.name,
        description: badgeClass.description,
        image: badgeClass.image,
        criteria: badgeClass.criteria,
        issuer: badgeClass.issuer,
      },
    },
    evidence: assertion.evidence,
  })),
}));

const BASE_INPUT: CredentialInput = {
  goal: { id: 'goal-01', title: 'Learn React Native', description: 'Build a mobile app' },
  evidence: [],
  issuerDid: 'did:key:abc123',
  publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'abc123' },
  credentialId: 'urn:uuid:cred-01',
  issuedOn: '2026-02-18T00:00:00.000Z',
};

describe('buildDid', () => {
  it('returns a string starting with did:key:', () => {
    const did = buildDid({ kty: 'OKP', crv: 'Ed25519', x: 'somekey' });
    expect(did).toMatch(/^did:key:/);
  });

  it('uses the x value from the JWK', () => {
    const did = buildDid({ kty: 'OKP', crv: 'Ed25519', x: 'mykey' });
    expect(did).toBe('did:key:mykey');
  });

  it('throws when x is absent', () => {
    expect(() => buildDid({ kty: 'OKP', crv: 'Ed25519' })).toThrow('missing x coordinate');
  });
});

describe('buildUnsignedCredential', () => {
  it('returns an OB3 VerifiableCredential structure', () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    const type = cred['type'] as string[];
    expect(type).toContain('VerifiableCredential');
    expect(cred['@context']).toBeDefined();
  });

  it('maps goal title to achievement name', () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    const subject = cred['credentialSubject'] as Record<string, unknown>;
    const achievement = subject['achievement'] as Record<string, unknown>;
    expect(achievement['name']).toBe('Learn React Native');
  });

  it('maps goal description to achievement description', () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    const subject = cred['credentialSubject'] as Record<string, unknown>;
    const achievement = subject['achievement'] as Record<string, unknown>;
    expect(achievement['description']).toBe('Build a mobile app');
  });

  it('falls back to a default description when goal description is null', () => {
    const cred = buildUnsignedCredential({
      ...BASE_INPUT,
      goal: { ...BASE_INPUT.goal, description: null },
    });
    const subject = cred['credentialSubject'] as Record<string, unknown>;
    const achievement = subject['achievement'] as Record<string, unknown>;
    expect(achievement['description']).toContain('Learn React Native');
  });

  it('includes the credential id', () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    expect(cred['id']).toBe('urn:uuid:cred-01');
  });

  it('includes evidence rows when provided', () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [
        { id: 'ev-01', type: 'photo', uri: 'file:///photo.jpg', description: 'My photo' },
      ],
    };
    const cred = buildUnsignedCredential(input);
    const evidence = cred['evidence'] as unknown[];
    expect(evidence).toHaveLength(1);
    expect((evidence[0] as Record<string, unknown>)['name']).toBe('My photo');
  });

  it('uses evidence type as name fallback when description is null', () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [{ id: 'ev-02', type: 'text', uri: 'content:text;hello', description: null }],
    };
    const cred = buildUnsignedCredential(input);
    const evidence = cred['evidence'] as unknown[];
    expect((evidence[0] as Record<string, unknown>)['name']).toBe('text');
  });

  it('falls back to "Evidence" when both description and type are null', () => {
    const input: CredentialInput = {
      ...BASE_INPUT,
      evidence: [{ id: 'ev-03', type: null, uri: 'content:empty', description: null }],
    };
    const cred = buildUnsignedCredential(input);
    const evidence = cred['evidence'] as unknown[];
    expect((evidence[0] as Record<string, unknown>)['name']).toBe('Evidence');
  });

  it('passes issuedOn through to the credential', () => {
    const cred = buildUnsignedCredential(BASE_INPUT);
    expect(cred['validFrom']).toBe('2026-02-18T00:00:00.000Z');
  });
});
