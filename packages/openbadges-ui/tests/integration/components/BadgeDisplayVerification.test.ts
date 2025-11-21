// tests/integration/components/BadgeDisplayVerification.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import BadgeDisplay from '@/components/badges/BadgeDisplay.vue';
import BadgeVerification from '@/components/badges/BadgeVerification.vue';
import { createMockOB2Badge } from '../utils';

// Mock the BadgeVerificationService
vi.mock('@/services/BadgeVerificationService');

// Import the mocked service after the mock is defined
import { BadgeVerificationService } from '@/services/BadgeVerificationService';
import type { VerificationResult } from '@/services/BadgeVerificationService';

// Define interface for the mocked service
interface MockedVerifyBadge {
  mockResolvedValueOnce: (result: VerificationResult) => unknown;
  mockRejectedValueOnce: (error: Error) => unknown;
}

describe('BadgeDisplay and BadgeVerification Integration', () => {
  const mockBadge = createMockOB2Badge();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show verification component when toggled', async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
      },
      global: {
        stubs: {
          // Use a shallow stub for BadgeVerification to focus on the integration
          BadgeVerification: true,
        },
      },
    });

    // Initially, the verification component should not be visible
    expect(wrapper.find('.manus-badge-verification-container').exists()).toBe(false);

    // Click the toggle button to show verification
    await wrapper.find('.manus-badge-verification-toggle-button').trigger('click');

    // Now the verification component should be visible
    expect(wrapper.find('.manus-badge-verification-container').exists()).toBe(true);
  });

  it('should pass badge to verification component', async () => {
    // Use a real BadgeVerification component for this test
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
      },
    });

    // Click the toggle button to show verification
    await wrapper.find('.manus-badge-verification-toggle-button').trigger('click');

    // Get the BadgeVerification component
    const verificationComponent = wrapper.findComponent(BadgeVerification);

    // Check that the badge was passed correctly
    expect(verificationComponent.props('badge')).toEqual(mockBadge);
  });

  it('should propagate verified event from BadgeVerification to BadgeDisplay', async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
      },
    });

    // Click the toggle button to show verification
    await wrapper.find('.manus-badge-verification-toggle-button').trigger('click');

    // Get the BadgeVerification component
    const verificationComponent = wrapper.findComponent(BadgeVerification);

    // Trigger the verified event on the BadgeVerification component
    verificationComponent.vm.$emit('verified', true);

    // Wait for Vue to update
    await nextTick();

    // Check that BadgeDisplay propagated the event
    expect(wrapper.emitted('verified')).toBeTruthy();
    const emitted = wrapper.emitted('verified');
    expect(emitted).not.toBeUndefined();
    expect(emitted?.[0]).toEqual([true]);
  });

  it('should auto-verify badge when autoVerify is true', async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
        autoVerify: true,
      },
    });

    // Setup mock to return a valid result
    (BadgeVerificationService.verifyBadge as unknown as MockedVerifyBadge).mockResolvedValueOnce({
      isValid: true,
      errors: [],
      warnings: [],
      verificationMethod: 'hosted' as const,
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
    });

    // Click the toggle button to show verification
    await wrapper.find('.manus-badge-verification-toggle-button').trigger('click');

    // Wait for all promises to resolve
    await flushPromises();

    // Verify that the BadgeVerificationService was called
    expect(BadgeVerificationService.verifyBadge).toHaveBeenCalledWith(mockBadge);

    // Check that the verified event was emitted
    expect(wrapper.emitted('verified')).toBeTruthy();
  });

  it('should show verification status correctly', async () => {
    // Mock a successful verification
    (BadgeVerificationService.verifyBadge as unknown as MockedVerifyBadge).mockResolvedValueOnce({
      isValid: true,
      errors: [],
      warnings: [],
      verificationMethod: 'hosted' as const,
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
    });

    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
      },
    });

    // Click the toggle button to show verification
    await wrapper.find('.manus-badge-verification-toggle-button').trigger('click');

    // Get the BadgeVerification component
    const verificationComponent = wrapper.findComponent(BadgeVerification);

    // Click the verify button
    await verificationComponent.find('button.ob-badge-verification-button').trigger('click');

    // Wait for all promises to resolve
    await flushPromises();

    // Check that the verification status shows as valid
    expect(verificationComponent.find('.ob-badge-verification-valid').exists()).toBe(true);
    expect(verificationComponent.find('.ob-badge-verification-valid').text()).toContain('Verified');
  });

  it('should show verification details when verification is complete', async () => {
    // Mock a successful verification with some warnings
    (BadgeVerificationService.verifyBadge as unknown as MockedVerifyBadge).mockResolvedValueOnce({
      isValid: true,
      errors: [],
      warnings: ['This is a test warning'],
      verificationMethod: 'hosted' as const,
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
    });

    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
      },
    });

    // Click the toggle button to show verification
    await wrapper.find('.manus-badge-verification-toggle-button').trigger('click');

    // Get the BadgeVerification component
    const verificationComponent = wrapper.findComponent(BadgeVerification);

    // Click the verify button
    await verificationComponent.find('button.ob-badge-verification-button').trigger('click');

    // Wait for all promises to resolve
    await flushPromises();

    // Check that verification details are displayed
    expect(verificationComponent.find('.ob-badge-verification-method').exists()).toBe(true);
    expect(verificationComponent.find('.ob-badge-verification-method').text()).toContain('Hosted');

    // Check that warnings are displayed
    expect(verificationComponent.find('.ob-badge-verification-warnings').exists()).toBe(true);
    expect(verificationComponent.find('.ob-badge-verification-warnings').text()).toContain(
      'This is a test warning'
    );
  });

  it('should handle verification failure correctly', async () => {
    // Mock a failed verification
    (BadgeVerificationService.verifyBadge as unknown as MockedVerifyBadge).mockResolvedValueOnce({
      isValid: false,
      errors: ['Invalid badge format'],
      warnings: [],
      verificationMethod: 'hosted' as const,
      expirationStatus: 'valid',
      revocationStatus: 'valid',
      structureValidation: {
        isValid: false,
        errors: ['Invalid badge format'],
        warnings: [],
      },
      contentValidation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    });

    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
      },
    });

    // Click the toggle button to show verification
    await wrapper.find('.manus-badge-verification-toggle-button').trigger('click');

    // Get the BadgeVerification component
    const verificationComponent = wrapper.findComponent(BadgeVerification);

    // Click the verify button
    await verificationComponent.find('button.ob-badge-verification-button').trigger('click');

    // Wait for all promises to resolve
    await flushPromises();

    // Check that the verification status shows as invalid
    expect(verificationComponent.find('.ob-badge-verification-invalid').exists()).toBe(true);
    expect(verificationComponent.find('.ob-badge-verification-invalid').text()).toContain(
      'Invalid'
    );

    // Check that errors are displayed
    expect(verificationComponent.find('.ob-badge-verification-errors').exists()).toBe(true);
    expect(verificationComponent.find('.ob-badge-verification-errors').text()).toContain(
      'Invalid badge format'
    );

    // Check that the verified event was emitted with false
    expect(wrapper.emitted('verified')).toBeTruthy();
    const emitted = wrapper.emitted('verified');
    expect(emitted).not.toBeUndefined();
    expect(emitted?.[0]).toEqual([false]);
  });
});
