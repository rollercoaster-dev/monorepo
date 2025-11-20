// src/composables/useBadgeIssuer.ts
import { reactive, computed } from 'vue';
import type { ComputedRef } from 'vue';
import type { OB2 } from '@/types';
import { BadgeService } from '@services/BadgeService';

export interface BadgeIssuerState {
  // Badge Class fields
  badgeClass: OB2.BadgeClass;
  // Recipient fields
  recipientEmail: string;
  // Form state
  isSubmitting: boolean;
  errors: string[];
  success: boolean;
}

/**
 * Composable for badge issuance functionality
 * Provides reactive state and methods for creating and issuing badges
 */
export function useBadgeIssuer(): {
  state: BadgeIssuerState;
  isValid: ComputedRef<boolean>;
  resetForm: () => void;
  validateForm: () => boolean;
  issueBadge: () => Promise<OB2.Assertion | null>;
} {
  // Initialize state with default values
  const state = reactive<BadgeIssuerState>({
    badgeClass: BadgeService.createBadgeClassTemplate(),
    recipientEmail: '',
    isSubmitting: false,
    errors: [],
    success: false,
  });

  // Computed properties
  const isValid = computed(() => {
    const badgeClassErrors = BadgeService.validateBadgeClass(state.badgeClass);
    return badgeClassErrors.length === 0 && !!state.recipientEmail;
  });

  // Methods
  const resetForm = () => {
    state.badgeClass = BadgeService.createBadgeClassTemplate();
    state.recipientEmail = '';
    state.errors = [];
    state.success = false;
  };

  const validateForm = (): boolean => {
    state.errors = [];

    // Validate badge class
    const badgeClassErrors = BadgeService.validateBadgeClass(state.badgeClass);
    state.errors.push(...badgeClassErrors);

    // Validate recipient email
    if (!state.recipientEmail) {
      state.errors.push('Recipient email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.recipientEmail)) {
      state.errors.push('Invalid email format');
    }

    return state.errors.length === 0;
  };

  const issueBadge = async (): Promise<OB2.Assertion | null> => {
    state.isSubmitting = true;
    state.errors = [];
    state.success = false;

    try {
      if (!validateForm()) {
        state.isSubmitting = false;
        return null;
      }

      // Create assertion from badge class and recipient
      const assertion = BadgeService.createAssertionTemplate(
        state.badgeClass,
        state.recipientEmail
      );

      // In a real implementation, this would likely call an API
      // For now, we just return the created assertion

      state.success = true;
      return assertion;
    } catch (error) {
      if (error instanceof Error) {
        state.errors.push(error.message);
      } else {
        state.errors.push('An unknown error occurred');
      }
      return null;
    } finally {
      state.isSubmitting = false;
    }
  };

  // Return state and methods
  return {
    state,
    isValid,
    resetForm,
    validateForm,
    issueBadge,
  };
}
