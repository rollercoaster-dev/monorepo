import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import BadgeVerification from '@/components/badges/BadgeVerification.vue';
import { BadgeVerificationService } from '@/services/BadgeVerificationService';
import { createDateTime, createIRI, type OB2 } from 'openbadges-types';

// Mock the BadgeVerificationService
vi.mock('@/services/BadgeVerificationService', () => ({
  BadgeVerificationService: {
    verifyBadge: vi.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      verificationMethod: 'hosted',
      expirationStatus: 'valid',
      revocationStatus: 'valid',
      structureValidation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
      contentValidation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    }),
  },
}));

describe('BadgeVerification.vue', () => {
  const mockBadge: OB2.Assertion = {
    '@context': 'https://w3id.org/openbadges/v2',
    type: 'Assertion',
    id: createIRI('http://example.org/badge1'),
    recipient: {
      identity: 'test@example.org',
      type: 'email',
      hashed: false,
    },
    badge: {
      type: 'BadgeClass',
      id: createIRI('http://example.org/badgeclass1'),
      name: 'Test Badge',
      description: 'A test badge description',
      image: createIRI('http://example.org/badge.png'),
      criteria: {
        id: createIRI('http://example.org/criteria'),
        narrative: 'Test criteria narrative',
      },
      issuer: {
        type: 'Profile',
        id: createIRI('http://example.org/issuer'),
        name: 'Test Issuer',
      },
    },
    issuedOn: createDateTime('2023-01-01T00:00:00Z'),
    verification: {
      type: 'hosted',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders verification status correctly', async () => {
    const wrapper = mount(BadgeVerification, {
      props: {
        badge: mockBadge,
        showStatus: true,
        showDetails: true,
        autoVerify: false,
      },
    });

    // Initially, no verification has been performed
    expect(wrapper.find('button.ob-badge-verification-button').text()).toBe('Verify Badge');
    expect(wrapper.find('.ob-badge-verification-result').exists()).toBe(false);

    // Click the verify button
    await wrapper.find('button.ob-badge-verification-button').trigger('click');

    // Wait for verification to complete
    await vi.waitFor(() => {
      return wrapper.find('.ob-badge-verification-valid').exists();
    });

    // Verification result should be displayed
    expect(wrapper.find('.ob-badge-verification-valid').exists()).toBe(true);
    expect(wrapper.find('.ob-badge-verification-valid').text()).toContain('Verified');
    expect(wrapper.find('.ob-badge-verification-button').text()).toBe('Verify Again');
  });

  it('auto-verifies when autoVerify prop is true', async () => {
    const wrapper = mount(BadgeVerification, {
      props: {
        badge: mockBadge,
        autoVerify: true,
        showStatus: true,
      },
    });

    // Verify that verifyBadge was called
    expect(BadgeVerificationService.verifyBadge).toHaveBeenCalledWith(mockBadge);

    // Manually trigger the promise resolution
    await flushPromises();
    await nextTick();

    // Verification result should be displayed
    expect(wrapper.find('.ob-badge-verification-valid').exists()).toBe(true);
  });

  it('emits verified event when verification is complete', async () => {
    const wrapper = mount(BadgeVerification, {
      props: {
        badge: mockBadge,
      },
    });

    // Click the verify button
    await wrapper.find('button.ob-badge-verification-button').trigger('click');

    // Wait for verification to complete
    await vi.waitFor(() => {
      return wrapper.find('.ob-badge-verification-valid').exists();
    });

    // Check if the verified event was emitted
    expect(wrapper.emitted('verified')).toBeTruthy();
    expect(wrapper.emitted('verified')![0]).toEqual([true]);
  });

  it('displays verification details when showDetails is true', async () => {
    const wrapper = mount(BadgeVerification, {
      props: {
        badge: mockBadge,
        showDetails: true,
      },
    });

    // Click the verify button
    await wrapper.find('button.ob-badge-verification-button').trigger('click');

    // Wait for verification to complete
    await vi.waitFor(() => {
      return wrapper.find('.ob-badge-verification-details').exists();
    });

    // Verification details should be displayed
    expect(wrapper.find('.ob-badge-verification-method').exists()).toBe(true);
    expect(wrapper.find('.ob-badge-verification-method').text()).toContain('Hosted');
    expect(wrapper.find('.ob-badge-verification-expiration').exists()).toBe(true);
    expect(wrapper.find('.ob-badge-verification-revocation').exists()).toBe(true);
  });

  it('respects showStatus prop', () => {
    const wrapper = mount(BadgeVerification, {
      props: {
        badge: mockBadge,
        showStatus: false,
      },
    });

    // Verification status should not be displayed
    expect(wrapper.find('.ob-badge-verification-status').exists()).toBe(false);
  });

  it('respects showLastVerified prop', async () => {
    const wrapper = mount(BadgeVerification, {
      props: {
        badge: mockBadge,
        showLastVerified: false,
      },
    });

    // Click the verify button
    await wrapper.find('button.ob-badge-verification-button').trigger('click');

    // Wait for verification to complete
    await vi.waitFor(() => {
      return wrapper.find('.ob-badge-verification-valid').exists();
    });

    // Last verified timestamp should not be displayed
    expect(wrapper.find('.ob-badge-verification-timestamp').exists()).toBe(false);
  });
});
