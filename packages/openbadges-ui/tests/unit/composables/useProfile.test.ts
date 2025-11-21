import { describe, it, expect } from 'vitest';
import { useProfile } from '@/composables/useProfile';
import type { Profile } from '@/types';
import { BadgeService } from '@/services/BadgeService';

describe('useProfile', () => {
  it('initial profile is null if none provided', () => {
    const { profile, isIssuer, isRecipient, displayName } = useProfile();
    expect(profile.value).toBeNull();
    expect(isIssuer.value).toBe(false);
    expect(isRecipient.value).toBe(false);
    expect(displayName.value).toBe('Unknown');
  });

  it('setProfile updates state', () => {
    const mock: Profile = { id: '1', name: 'Test', type: 'Issuer' };
    const { profile, isIssuer, isRecipient, setProfile } = useProfile();
    setProfile(mock);
    expect(profile.value).toEqual(mock);
    expect(isIssuer.value).toBe(true);
    expect(isRecipient.value).toBe(false);
  });

  it('loadProfile simulates loading', async () => {
    const { loadProfile, profile, isLoading } = useProfile();
    const promise = loadProfile('abc', 'Recipient');
    expect(isLoading.value).toBe(true);
    await promise;
    expect(profile.value).not.toBeNull();
    expect(isLoading.value).toBe(false);
  });

  it('clearProfile resets state', () => {
    const { profile, setProfile, clearProfile } = useProfile();
    setProfile({ id: '1', name: 'X', type: 'Recipient' });
    clearProfile();
    expect(profile.value).toBeNull();
  });

  it('extractIssuerFromBadge returns null for no issuer', () => {
    const { extractIssuerFromBadge } = useProfile();
    const assertion = BadgeService.createAssertionTemplate(
      BadgeService.createBadgeClassTemplate(),
      'e@e.com'
    );
    // Remove issuer name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (assertion.badge as any).issuer.name = ''; // Intentionally modify for test
    const result = extractIssuerFromBadge(assertion);
    expect(result).toBeNull();
  });

  it('extractIssuerFromBadge returns Profile when available', () => {
    const { extractIssuerFromBadge } = useProfile();
    const assertion = BadgeService.createAssertionTemplate(
      BadgeService.createBadgeClassTemplate(),
      'e@e.com'
    );

    // Ensure the badgeClass has an issuer with a name for this test case
    if (typeof assertion.badge === 'object' && typeof assertion.badge.issuer === 'object') {
      assertion.badge.issuer.name = 'Test Issuer Name';
    } else {
      // Fail test if badge structure is not as expected
      throw new Error('Test setup error: Assertion badge or issuer is not an object');
    }

    const profile = extractIssuerFromBadge(assertion);
    expect(profile).not.toBeNull();

    // Add type guard for accessing issuer name in assertion
    if (
      profile &&
      typeof assertion.badge === 'object' &&
      typeof assertion.badge.issuer === 'object'
    ) {
      expect(profile.name).toBe(assertion.badge.issuer.name);
    } else {
      // Fail test if profile is null or badge structure is unexpected after extraction
      throw new Error('Test assertion error: Profile is null or badge structure incorrect');
    }
  });
});
