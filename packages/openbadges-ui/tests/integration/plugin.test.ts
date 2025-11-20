// tests/integration/plugin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from 'vue';
import OpenBadgesUIPlugin from '@/plugin';
import BadgeDisplay from '@/components/badges/BadgeDisplay.vue';
import BadgeList from '@/components/badges/BadgeList.vue';
import ProfileViewer from '@/components/badges/ProfileViewer.vue';
import BadgeVerification from '@/components/badges/BadgeVerification.vue';
import BadgeIssuerForm from '@/components/issuing/BadgeIssuerForm.vue';
import IssuerDashboard from '@/components/issuing/IssuerDashboard.vue';
import FontSelector from '@/components/accessibility/FontSelector.vue';
import ThemeSelector from '@/components/accessibility/ThemeSelector.vue';
import AccessibilitySettings from '@/components/accessibility/AccessibilitySettings.vue';

// Mock PrimeVue
vi.mock('primevue/config', () => ({
  default: {},
}));

describe('OpenBadgesUIPlugin', () => {
  let app: ReturnType<typeof createApp>;
  // Use any type for the spy to avoid TypeScript errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let componentSpy: any;

  beforeEach(() => {
    // Create a new Vue app for each test
    app = createApp({});

    // Spy on the component registration
    componentSpy = vi.spyOn(app, 'component');
  });

  it('should register all components when installed', () => {
    // Install the plugin
    app.use(OpenBadgesUIPlugin);

    // Check that all components were registered
    expect(componentSpy).toHaveBeenCalledWith('BadgeDisplay', BadgeDisplay);
    expect(componentSpy).toHaveBeenCalledWith('BadgeList', BadgeList);
    expect(componentSpy).toHaveBeenCalledWith('ProfileViewer', ProfileViewer);
    expect(componentSpy).toHaveBeenCalledWith('BadgeVerification', BadgeVerification);
    expect(componentSpy).toHaveBeenCalledWith('BadgeIssuerForm', BadgeIssuerForm);
    expect(componentSpy).toHaveBeenCalledWith('IssuerDashboard', IssuerDashboard);
    expect(componentSpy).toHaveBeenCalledWith('FontSelector', FontSelector);
    expect(componentSpy).toHaveBeenCalledWith('ThemeSelector', ThemeSelector);
    expect(componentSpy).toHaveBeenCalledWith('AccessibilitySettings', AccessibilitySettings);
  });

  it('should register all components with the correct names', () => {
    // Install the plugin
    app.use(OpenBadgesUIPlugin);

    // Check that all components were registered with the correct names
    const expectedComponents = [
      'BadgeDisplay',
      'BadgeList',
      'ProfileViewer',
      'BadgeVerification',
      'BadgeIssuerForm',
      'IssuerDashboard',
      'FontSelector',
      'ThemeSelector',
      'AccessibilitySettings',
    ];

    expectedComponents.forEach((componentName) => {
      expect(componentSpy).toHaveBeenCalledWith(componentName, expect.any(Object));
    });

    // Check the total number of component registrations
    expect(componentSpy).toHaveBeenCalledTimes(expectedComponents.length);
  });
});
