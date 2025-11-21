import { describe, it, expect } from 'vitest';
import { useBadgeIssuer } from '@/composables/useBadgeIssuer';
import { BadgeService } from '@/services/BadgeService';

describe('useBadgeIssuer', () => {
  it('initial state is invalid and has default values', () => {
    const { state, isValid } = useBadgeIssuer();
    expect(state.recipientEmail).toBe('');
    expect(isValid.value).toBe(false);
  });

  it('validateForm sets errors for missing fields', () => {
    const { state, validateForm } = useBadgeIssuer();
    const result = validateForm();
    expect(result).toBe(false);
    expect(state.errors).toContain('Badge name is required');
    expect(state.errors).toContain('Recipient email is required');
  });

  it('validateForm accepts valid input', () => {
    const { state, validateForm } = useBadgeIssuer();
    // Create a valid badge class using the template and filling required fields
    state.badgeClass = BadgeService.createBadgeClassTemplate();
    state.badgeClass.name = 'Test Badge';
    state.badgeClass.description = 'A badge for testing';
    // Template already provides image.id and issuer.id, need issuer name
    if (typeof state.badgeClass.issuer === 'object') {
      state.badgeClass.issuer.name = 'Test Issuer';
    }
    state.recipientEmail = 'test@example.com';
    const result = validateForm();
    expect(result).toBe(true);
    expect(state.errors.length).toBe(0);
  });

  it('resetForm clears state', () => {
    const { state, resetForm } = useBadgeIssuer();
    state.badgeClass.name = 'Test';
    state.recipientEmail = 'test@example.com';
    resetForm();
    expect(state.badgeClass.name).toBe('');
    expect(state.recipientEmail).toBe('');
    expect(state.errors).toEqual([]);
  });

  it('issueBadge returns null when invalid', async () => {
    const { issueBadge, state } = useBadgeIssuer();
    const result = await issueBadge();
    expect(result).toBeNull();
    expect(state.success).toBe(false);
  });

  it('issueBadge returns assertion when valid', async () => {
    const { issueBadge, state } = useBadgeIssuer();
    // Create a valid badge class using the template and filling required fields
    state.badgeClass = BadgeService.createBadgeClassTemplate();
    state.badgeClass.name = 'Test Badge for Issuing';
    state.badgeClass.description = 'A badge for testing the issue function';
    // Template already provides image.id and issuer.id, need issuer name
    if (typeof state.badgeClass.issuer === 'object') {
      state.badgeClass.issuer.name = 'Test Issuer for Issuing';
    }
    state.recipientEmail = 'test@example.com';
    const result = await issueBadge();
    expect(result).not.toBeNull();
    expect(state.success).toBe(true);
    expect(result?.type).toBe('Assertion');
  });
});
