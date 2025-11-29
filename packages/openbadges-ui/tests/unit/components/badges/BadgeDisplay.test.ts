import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BadgeDisplay from "@/components/badges/BadgeDisplay.vue";
import { typedAssertion } from "../../../test-utils";

describe("BadgeDisplay.vue", () => {
  const mockBadge = typedAssertion({
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: "http://example.org/badge1",
    recipient: {
      identity: "test@example.org",
      type: "email",
      hashed: false,
    },
    badge: {
      type: "BadgeClass",
      id: "http://example.org/badgeclass1",
      name: "Test Badge",
      description: "A test badge description",
      image: "http://example.org/badge.png",
      criteria: {
        narrative: "Test criteria",
      },
      issuer: {
        type: "Profile",
        id: "http://example.org/issuer",
        name: "Test Issuer",
      },
    },
    issuedOn: "2023-01-01T00:00:00Z",
    expires: "2024-01-01T00:00:00Z",
    verification: {
      type: "hosted",
    },
  });

  it("renders badge information correctly", () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
      },
    });

    // Check if badge name is displayed
    expect(wrapper.find(".manus-badge-title").text()).toBe("Test Badge");

    // Check if badge description is displayed
    expect(wrapper.find(".manus-badge-description").text()).toBe(
      "A test badge description",
    );

    // Check if issuer name is displayed
    expect(wrapper.find(".manus-badge-issuer").text()).toContain("Test Issuer");

    // Check if issue date is displayed
    expect(wrapper.find(".manus-badge-date").text()).toContain("Jan 1, 2023");

    // Check if image is displayed with correct src
    const img = wrapper.find(".manus-badge-img");
    expect(img.attributes("src")).toBe("http://example.org/badge.png");
    expect(img.attributes("alt")).toBe("Badge: Test Badge");
  });

  it("respects showDescription prop", async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showDescription: false,
      },
    });

    // Description should not be displayed
    expect(wrapper.find(".manus-badge-description").exists()).toBe(false);
  });

  it("respects showIssuedDate prop", async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showIssuedDate: false,
      },
    });

    // Issue date should not be displayed
    expect(wrapper.find(".manus-badge-date").exists()).toBe(false);
  });

  it("respects showExpiryDate prop", async () => {
    // First check that expiry is not shown by default
    const wrapper1 = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
      },
    });
    expect(wrapper1.find(".manus-badge-expiry").exists()).toBe(false);

    // Now check that expiry is shown when showExpiryDate is true
    const wrapper2 = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showExpiryDate: true,
      },
    });
    expect(wrapper2.find(".manus-badge-expiry").exists()).toBe(true);
    expect(wrapper2.find(".manus-badge-expiry").text()).toContain(
      "Jan 1, 2024",
    );
  });

  it("emits click event when interactive", async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        interactive: true,
      },
    });

    await wrapper.trigger("click");

    // Check if click event was emitted with the badge
    const clickEvents = wrapper.emitted("click");
    expect(clickEvents).toBeTruthy();
    if (clickEvents) {
      expect(clickEvents[0][0]).toEqual(mockBadge);
    }
  });

  it("does not emit click event when not interactive", async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        interactive: false,
      },
    });

    await wrapper.trigger("click");

    // Check that no click event was emitted
    expect(wrapper.emitted("click")).toBeFalsy();
  });

  it("has correct accessibility attributes when interactive", () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        interactive: true,
      },
    });

    const badgeElement = wrapper.find(".manus-badge-display");
    expect(badgeElement.attributes("tabindex")).toBe("0");
    expect(badgeElement.classes()).toContain("is-interactive");
  });

  it("does not have interactive accessibility attributes when not interactive", () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        interactive: false,
      },
    });

    const badgeElement = wrapper.find(".manus-badge-display");
    expect(badgeElement.attributes("tabindex")).toBeUndefined();
    expect(badgeElement.classes()).not.toContain("is-interactive");
  });

  it("shows verification component when showVerification is true", async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
      },
      global: {
        stubs: {
          BadgeVerification: true,
        },
      },
    });

    // Initially, the toggle button should be visible but not the verification component
    expect(wrapper.find(".manus-badge-verification-toggle").exists()).toBe(
      true,
    );
    expect(wrapper.find(".manus-badge-verification-container").exists()).toBe(
      false,
    );

    // Click the toggle button
    await wrapper
      .find(".manus-badge-verification-toggle-button")
      .trigger("click");

    // Now the verification component should be visible
    expect(wrapper.find(".manus-badge-verification-container").exists()).toBe(
      true,
    );
  });

  it("emits verified event when verification is complete", async () => {
    // Mock the BadgeVerification component
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
        autoVerify: true,
      },
      global: {
        stubs: {
          BadgeVerification: {
            template: '<div class="badge-verification-stub"></div>',
            mounted() {
              this.$emit("verified", true);
            },
          },
        },
      },
    });

    // Toggle verification details to show the verification component
    await wrapper
      .find(".manus-badge-verification-toggle-button")
      .trigger("click");

    // Check if the verified event was emitted
    const verifiedEvents = wrapper.emitted("verified");
    expect(verifiedEvents).toBeTruthy();
    if (verifiedEvents) {
      expect(verifiedEvents[0]).toEqual([true]);
    }
  });

  it("does not emit verified event when verification fails", async () => {
    // Mock the BadgeVerification component
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showVerification: true,
        autoVerify: true,
      },
      global: {
        stubs: {
          BadgeVerification: {
            template: '<div class="badge-verification-stub"></div>',
            mounted() {
              this.$emit("verified", false);
            },
          },
        },
      },
    });

    // Toggle verification details to show the verification component
    await wrapper
      .find(".manus-badge-verification-toggle-button")
      .trigger("click");

    // Check that the verified event was emitted with false
    const verifiedEventsFail = wrapper.emitted("verified");
    expect(verifiedEventsFail).toBeTruthy();
    if (verifiedEventsFail) {
      expect(verifiedEventsFail[0]).toEqual([false]);
    }
  });

  it("applies contentDensity prop and class", () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        contentDensity: "compact",
      },
    });
    expect(wrapper.find(".manus-badge-display").classes()).toContain(
      "density-compact",
    );
    wrapper.setProps({ contentDensity: "spacious" });
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.find(".manus-badge-display").classes()).toContain(
        "density-spacious",
      );
    });
  });

  it("hides non-essential info in simplifiedView", () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        simplifiedView: true,
        showDescription: true,
        showIssuedDate: true,
        showExpiryDate: true,
        showVerification: true,
      },
    });
    // Description, issuer, dates, and verification should be hidden
    expect(wrapper.find(".manus-badge-description").exists()).toBe(false);
    expect(wrapper.find(".manus-badge-issuer").exists()).toBe(false);
    expect(wrapper.find(".manus-badge-date").exists()).toBe(false);
    expect(wrapper.find(".manus-badge-expiry").exists()).toBe(false);
    expect(wrapper.find(".manus-badge-verification-toggle").exists()).toBe(
      false,
    );
  });
});
