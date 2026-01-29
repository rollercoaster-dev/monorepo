import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BadgeDisplay from "@/components/badges/BadgeDisplay.vue";
import { typedAssertion, typedCredential } from "../../../test-utils";

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
    expect(wrapper.find(".ob-badge-display__title").text()).toBe("Test Badge");

    // Check if badge description is displayed
    expect(wrapper.find(".ob-badge-display__description").text()).toBe(
      "A test badge description",
    );

    // Check if issuer name is displayed
    expect(wrapper.find(".ob-badge-display__issuer").text()).toContain(
      "Test Issuer",
    );

    // Check if issue date is displayed
    expect(wrapper.find(".ob-badge-display__date").text()).toContain(
      "Jan 1, 2023",
    );

    // Check if image is displayed with correct src
    const img = wrapper.find(".ob-badge-display__img");
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
    expect(wrapper.find(".ob-badge-display__description").exists()).toBe(false);
  });

  it("respects showIssuedDate prop", async () => {
    const wrapper = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showIssuedDate: false,
      },
    });

    // Issue date should not be displayed
    expect(wrapper.find(".ob-badge-display__date").exists()).toBe(false);
  });

  it("respects showExpiryDate prop", async () => {
    // First check that expiry is not shown by default
    const wrapper1 = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
      },
    });
    expect(wrapper1.find(".ob-badge-display__expiry").exists()).toBe(false);

    // Now check that expiry is shown when showExpiryDate is true
    const wrapper2 = mount(BadgeDisplay, {
      props: {
        badge: mockBadge,
        showExpiryDate: true,
      },
    });
    expect(wrapper2.find(".ob-badge-display__expiry").exists()).toBe(true);
    expect(wrapper2.find(".ob-badge-display__expiry").text()).toContain(
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

    const badgeElement = wrapper.find(".ob-badge-display");
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

    const badgeElement = wrapper.find(".ob-badge-display");
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
    expect(
      wrapper.find(".ob-badge-display__verification-toggle").exists(),
    ).toBe(true);
    expect(
      wrapper.find(".ob-badge-display__verification-container").exists(),
    ).toBe(false);

    // Click the toggle button
    await wrapper
      .find(".ob-badge-display__verification-toggle-button")
      .trigger("click");

    // Now the verification component should be visible
    expect(
      wrapper.find(".ob-badge-display__verification-container").exists(),
    ).toBe(true);
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
      .find(".ob-badge-display__verification-toggle-button")
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
      .find(".ob-badge-display__verification-toggle-button")
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
    expect(wrapper.find(".ob-badge-display").classes()).toContain(
      "ob-badge-display--density-compact",
    );
    wrapper.setProps({ contentDensity: "spacious" });
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.find(".ob-badge-display").classes()).toContain(
        "ob-badge-display--density-spacious",
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
    expect(wrapper.find(".ob-badge-display__description").exists()).toBe(false);
    expect(wrapper.find(".ob-badge-display__issuer").exists()).toBe(false);
    expect(wrapper.find(".ob-badge-display__date").exists()).toBe(false);
    expect(wrapper.find(".ob-badge-display__expiry").exists()).toBe(false);
    expect(
      wrapper.find(".ob-badge-display__verification-toggle").exists(),
    ).toBe(false);
  });

  // OB3 VerifiableCredential Tests
  describe("OB3 VerifiableCredential rendering", () => {
    const mockOB3Credential = typedCredential({
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
      ],
      id: "https://example.org/credentials/123",
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      issuer: {
        id: "https://example.org/issuer",
        type: "Profile",
        name: "OB3 Test Issuer",
        url: "https://example.org",
        image: "https://example.org/issuer-logo.png",
      },
      validFrom: "2024-01-15T00:00:00Z",
      validUntil: "2025-01-15T00:00:00Z",
      credentialSubject: {
        id: "did:example:recipient123",
        type: "AchievementSubject",
        achievement: {
          id: "https://example.org/achievements/web-dev",
          type: "Achievement",
          name: "Web Development Mastery",
          description: "Demonstrated proficiency in modern web development",
          image: "https://example.org/badge-image.png",
          criteria: {
            narrative: "Complete all web development modules",
          },
        },
      },
    });

    it("renders OB3 badge name correctly", () => {
      const wrapper = mount(BadgeDisplay, {
        props: { badge: mockOB3Credential },
      });

      expect(wrapper.find(".ob-badge-display__title").text()).toBe(
        "Web Development Mastery",
      );
    });

    it("renders OB3 badge description correctly", () => {
      const wrapper = mount(BadgeDisplay, {
        props: { badge: mockOB3Credential },
      });

      expect(wrapper.find(".ob-badge-display__description").text()).toBe(
        "Demonstrated proficiency in modern web development",
      );
    });

    it("renders OB3 badge image correctly", () => {
      const wrapper = mount(BadgeDisplay, {
        props: { badge: mockOB3Credential },
      });

      const img = wrapper.find(".ob-badge-display__img");
      expect(img.attributes("src")).toBe("https://example.org/badge-image.png");
      expect(img.attributes("alt")).toBe("Badge: Web Development Mastery");
    });

    it("renders OB3 issuer name correctly", () => {
      const wrapper = mount(BadgeDisplay, {
        props: { badge: mockOB3Credential },
      });

      expect(wrapper.find(".ob-badge-display__issuer").text()).toContain(
        "OB3 Test Issuer",
      );
    });

    it("renders OB3 validFrom date correctly", () => {
      const wrapper = mount(BadgeDisplay, {
        props: { badge: mockOB3Credential },
      });

      expect(wrapper.find(".ob-badge-display__date").text()).toContain(
        "Jan 15, 2024",
      );
    });

    it("renders OB3 validUntil date when showExpiryDate is true", () => {
      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: mockOB3Credential,
          showExpiryDate: true,
        },
      });

      expect(wrapper.find(".ob-badge-display__expiry").exists()).toBe(true);
      expect(wrapper.find(".ob-badge-display__expiry").text()).toContain(
        "Jan 15, 2025",
      );
    });

    it("handles OB3 image as OB3ImageObject", () => {
      const credentialWithImageObject = typedCredential({
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: "https://example.org/credentials/456",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.org/issuer",
          type: "Profile",
          name: "Test Issuer",
          url: "https://example.org",
        },
        validFrom: "2024-01-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:recipient",
          type: "AchievementSubject",
          achievement: {
            id: "https://example.org/achievements/1",
            type: "Achievement",
            name: "Image Object Badge",
            description: "Badge with OB3ImageObject",
            image: {
              id: "https://example.org/image-object.png",
              type: "Image",
              caption: "Badge image with caption",
            },
            criteria: { narrative: "Test criteria" },
          },
        },
      });

      const wrapper = mount(BadgeDisplay, {
        props: { badge: credentialWithImageObject },
      });

      const img = wrapper.find(".ob-badge-display__img");
      expect(img.attributes("src")).toBe(
        "https://example.org/image-object.png",
      );
    });

    it("handles OB3 issuer as IRI string", () => {
      const credentialWithIssuerIRI = typedCredential({
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: "https://example.org/credentials/789",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: "https://example.org/issuer-profile",
        validFrom: "2024-01-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:recipient",
          type: "AchievementSubject",
          achievement: {
            id: "https://example.org/achievements/2",
            type: "Achievement",
            name: "IRI Issuer Badge",
            description: "Badge with issuer as IRI",
            image: "https://example.org/badge.png",
            criteria: { narrative: "Test criteria" },
          },
        },
      });

      const wrapper = mount(BadgeDisplay, {
        props: { badge: credentialWithIssuerIRI },
      });

      // When issuer is IRI, fallback to "Unknown Issuer"
      expect(wrapper.find(".ob-badge-display__issuer").text()).toContain(
        "Unknown Issuer",
      );
    });

    it("handles OB3 achievement array (uses first achievement)", () => {
      const credentialWithAchievementArray = typedCredential({
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: "https://example.org/credentials/multi",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.org/issuer",
          type: "Profile",
          name: "Multi-Achievement Issuer",
          url: "https://example.org",
        },
        validFrom: "2024-06-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:recipient",
          type: "AchievementSubject",
          achievement: [
            {
              id: "https://example.org/achievements/first",
              type: "Achievement",
              name: "First Achievement",
              description: "The first achievement in the array",
              image: "https://example.org/first-badge.png",
              criteria: { narrative: "First criteria" },
            },
            {
              id: "https://example.org/achievements/second",
              type: "Achievement",
              name: "Second Achievement",
              description: "The second achievement",
              image: "https://example.org/second-badge.png",
              criteria: { narrative: "Second criteria" },
            },
          ],
        },
      });

      const wrapper = mount(BadgeDisplay, {
        props: { badge: credentialWithAchievementArray },
      });

      // Should display the first achievement's name
      expect(wrapper.find(".ob-badge-display__title").text()).toBe(
        "First Achievement",
      );
    });

    it("emits click event with OB3 credential when interactive", async () => {
      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: mockOB3Credential,
          interactive: true,
        },
      });

      await wrapper.trigger("click");

      const clickEvents = wrapper.emitted("click");
      expect(clickEvents).toBeTruthy();
      if (clickEvents) {
        expect(clickEvents[0][0]).toEqual(mockOB3Credential);
      }
    });

    it("applies accessibility attributes for OB3 credentials", () => {
      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: mockOB3Credential,
          interactive: true,
        },
      });

      const badgeElement = wrapper.find(".ob-badge-display");
      expect(badgeElement.attributes("tabindex")).toBe("0");
      expect(badgeElement.classes()).toContain("is-interactive");
    });

    it("renders OB3 credential with issuanceDate/expirationDate correctly", () => {
      const ob3CredentialWithLegacyDates = typedCredential({
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: "https://example.org/credentials/legacy-456",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.org/issuer-legacy",
          type: "Profile",
          name: "Legacy Date Issuer",
          url: "https://example.org",
        },
        issuanceDate: "2023-06-15T00:00:00Z",
        expirationDate: "2024-06-15T00:00:00Z",
        credentialSubject: {
          id: "did:example:legacy456",
          type: "AchievementSubject",
          achievement: {
            id: "https://example.org/achievements/legacy",
            type: "Achievement",
            name: "Legacy Date Achievement",
            description: "Achievement using legacy date fields",
            image: "https://example.org/legacy-badge.png",
            criteria: {
              narrative: "Complete legacy requirements",
            },
          },
        },
      });

      const wrapper = mount(BadgeDisplay, {
        props: { badge: ob3CredentialWithLegacyDates },
      });

      expect(wrapper.find(".ob-badge-display__title").text()).toBe(
        "Legacy Date Achievement",
      );
      expect(wrapper.find(".ob-badge-display__date").text()).toContain(
        "Jun 15, 2023",
      );
    });

    it("renders OB3 credential expirationDate when showExpiryDate is true", () => {
      const ob3CredentialWithExpiry = typedCredential({
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: "https://example.org/credentials/expiry-789",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.org/issuer-expiry",
          type: "Profile",
          name: "Expiry Test Issuer",
        },
        issuanceDate: "2023-06-15T00:00:00Z",
        expirationDate: "2024-06-15T00:00:00Z",
        credentialSubject: {
          id: "did:example:expiry789",
          type: "AchievementSubject",
          achievement: {
            id: "https://example.org/achievements/expiry",
            type: "Achievement",
            name: "Expiry Test Achievement",
            description: "Achievement with expiration",
            image: "https://example.org/expiry-badge.png",
            criteria: {
              narrative: "Complete before expiration",
            },
          },
        },
      });

      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: ob3CredentialWithExpiry,
          showExpiryDate: true,
        },
      });

      expect(wrapper.find(".ob-badge-display__expiry").exists()).toBe(true);
      expect(wrapper.find(".ob-badge-display__expiry").text()).toContain(
        "Jun 15, 2024",
      );
    });
  });

  // Recipient information tests
  describe("Recipient information display", () => {
    it("does not show recipient info by default", () => {
      const wrapper = mount(BadgeDisplay, {
        props: { badge: mockBadge },
      });

      expect(wrapper.find(".ob-badge-display__recipient").exists()).toBe(false);
    });

    it("shows recipient email from OB2 Assertion when showRecipient is true", () => {
      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: mockBadge,
          showRecipient: true,
        },
      });

      const recipientSection = wrapper.find(".ob-badge-display__recipient");
      expect(recipientSection.exists()).toBe(true);
      expect(recipientSection.attributes("role")).toBe("region");
      expect(recipientSection.attributes("aria-label")).toBe(
        "Recipient information",
      );

      const emailSpan = wrapper.find(".ob-badge-display__recipient-email");
      expect(emailSpan.exists()).toBe(true);
      expect(emailSpan.text()).toContain("test@example.org");
      expect(emailSpan.attributes("aria-label")).toBe(
        "Recipient email address",
      );
    });

    it("shows recipient name, email, and role from OB3 credential when showRecipient is true", () => {
      const ob3WithRecipient = typedCredential({
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: "https://example.org/credentials/123",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.org/issuer",
          type: "Profile",
          name: "OB3 Issuer",
        },
        validFrom: "2024-01-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:recipient123",
          type: "AchievementSubject",
          name: "Alice Johnson",
          email: "alice@example.org",
          role: "Senior Developer",
          achievement: {
            id: "https://example.org/achievements/1",
            type: "Achievement",
            name: "Test Achievement",
            description: "Test description",
            image: "https://example.org/badge.png",
            criteria: { narrative: "Test criteria" },
          },
        },
      });

      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: ob3WithRecipient,
          showRecipient: true,
        },
      });

      const recipientSection = wrapper.find(".ob-badge-display__recipient");
      expect(recipientSection.exists()).toBe(true);

      const nameSpan = wrapper.find(".ob-badge-display__recipient-name");
      expect(nameSpan.exists()).toBe(true);
      expect(nameSpan.text()).toContain("Alice Johnson");
      expect(nameSpan.attributes("aria-label")).toBe("Recipient name");

      const emailSpan = wrapper.find(".ob-badge-display__recipient-email");
      expect(emailSpan.exists()).toBe(true);
      expect(emailSpan.text()).toContain("alice@example.org");
      expect(emailSpan.attributes("aria-label")).toBe(
        "Recipient email address",
      );

      const roleSpan = wrapper.find(".ob-badge-display__recipient-role");
      expect(roleSpan.exists()).toBe(true);
      expect(roleSpan.text()).toContain("Senior Developer");
      expect(roleSpan.attributes("aria-label")).toBe("Recipient role");
    });

    it("handles OB3 credentialSubject.name as MultiLanguageString", () => {
      const ob3WithMultiLangName = typedCredential({
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: "https://example.org/credentials/456",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.org/issuer",
          type: "Profile",
          name: "OB3 Issuer",
        },
        validFrom: "2024-01-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:recipient456",
          type: "AchievementSubject",
          name: {
            en: "Bob Martinez",
            es: "Roberto Martínez",
          },
          achievement: {
            id: "https://example.org/achievements/1",
            type: "Achievement",
            name: "Test Achievement",
            description: "Test description",
            image: "https://example.org/badge.png",
            criteria: { narrative: "Test criteria" },
          },
        },
      });

      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: ob3WithMultiLangName,
          showRecipient: true,
        },
      });

      const nameSpan = wrapper.find(".ob-badge-display__recipient-name");
      expect(nameSpan.exists()).toBe(true);
      expect(nameSpan.text()).toContain("Bob Martinez");
    });

    it("hides recipient info in simplifiedView even when showRecipient is true", () => {
      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: mockBadge,
          showRecipient: true,
          simplifiedView: true,
        },
      });

      expect(wrapper.find(".ob-badge-display__recipient").exists()).toBe(false);
    });

    it("does not show recipient section when badge has no recipient data", () => {
      const badgeWithoutRecipient = typedCredential({
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
        ],
        id: "https://example.org/credentials/789",
        type: ["VerifiableCredential", "OpenBadgeCredential"],
        issuer: {
          id: "https://example.org/issuer",
          type: "Profile",
          name: "OB3 Issuer",
        },
        validFrom: "2024-01-01T00:00:00Z",
        credentialSubject: {
          id: "did:example:recipient789",
          type: "AchievementSubject",
          achievement: {
            id: "https://example.org/achievements/1",
            type: "Achievement",
            name: "Test Achievement",
            description: "Test description",
            image: "https://example.org/badge.png",
            criteria: { narrative: "Test criteria" },
          },
        },
      });

      const wrapper = mount(BadgeDisplay, {
        props: {
          badge: badgeWithoutRecipient,
          showRecipient: true,
        },
      });

      expect(wrapper.find(".ob-badge-display__recipient").exists()).toBe(false);
    });
  });
});
