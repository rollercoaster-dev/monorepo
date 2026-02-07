// tests/integration/plugin.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "vue";
import OpenBadgesUIPlugin from "@/plugin";

describe("OpenBadgesUIPlugin", () => {
  let app: ReturnType<typeof createApp>;
  // Use any type for the spy to avoid TypeScript errors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let componentSpy: any;

  beforeEach(() => {
    // Create a new Vue app for each test
    app = createApp({});

    // Spy on the component registration
    componentSpy = vi.spyOn(app, "component");
  });

  it("should register all components when installed", () => {
    // Install the plugin
    app.use(OpenBadgesUIPlugin);

    // Check that all components were registered with the expected names
    // Note: In Bun/Vitest environment, Vue SFC imports may resolve to file paths
    // So we check that the component name is registered and something was provided
    expect(componentSpy).toHaveBeenCalledWith(
      "BadgeDisplay",
      expect.anything(),
    );
    expect(componentSpy).toHaveBeenCalledWith("BadgeList", expect.anything());
    expect(componentSpy).toHaveBeenCalledWith(
      "ProfileViewer",
      expect.anything(),
    );
    expect(componentSpy).toHaveBeenCalledWith(
      "BadgeVerification",
      expect.anything(),
    );
    expect(componentSpy).toHaveBeenCalledWith(
      "BadgeIssuerForm",
      expect.anything(),
    );
    expect(componentSpy).toHaveBeenCalledWith(
      "IssuerDashboard",
      expect.anything(),
    );
    expect(componentSpy).toHaveBeenCalledWith(
      "FontSelector",
      expect.anything(),
    );
    expect(componentSpy).toHaveBeenCalledWith(
      "ThemeSelector",
      expect.anything(),
    );
    expect(componentSpy).toHaveBeenCalledWith(
      "AccessibilitySettings",
      expect.anything(),
    );
  });

  it("should register all components with the correct names", () => {
    // Install the plugin
    app.use(OpenBadgesUIPlugin);

    // Check that all components were registered with the correct names
    const expectedComponents = [
      "BadgeDisplay",
      "BadgeList",
      "ProfileViewer",
      "BadgeVerification",
      "BadgeIssuerForm",
      "IssuerDashboard",
      "FontSelector",
      "ThemeSelector",
      "AccessibilitySettings",
    ];

    // Note: In Bun/Vitest environment, Vue SFC imports may resolve to file paths
    // So we check that something was provided (could be object or string path)
    expectedComponents.forEach((componentName) => {
      expect(componentSpy).toHaveBeenCalledWith(
        componentName,
        expect.anything(),
      );
    });

    // Check the total number of component registrations
    expect(componentSpy).toHaveBeenCalledTimes(expectedComponents.length);
  });
});
