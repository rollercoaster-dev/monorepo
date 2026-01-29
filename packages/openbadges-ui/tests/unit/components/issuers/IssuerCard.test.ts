import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import IssuerCard from "@components/issuers/IssuerCard.vue";
import type { OB2, OB3, Shared } from "openbadges-types";

// Mock OB2 issuer data
const mockOB2Issuer: OB2.Profile = {
  id: "https://example.org/issuers/1" as Shared.IRI,
  type: "Profile" as const,
  name: "Test University",
  url: "https://test-university.edu" as Shared.IRI,
  email: "badges@test-university.edu",
  description: "A test university issuing digital credentials",
  image: "https://example.org/logo.png" as Shared.IRI,
};

// Mock OB3 issuer data (Profile)
const mockOB3Issuer: OB3.Profile = {
  id: "https://example.org/issuers/2",
  type: ["Profile"] as [string, ...string[]],
  name: "Digital Academy",
  url: "https://digital-academy.org",
  email: "info@digital-academy.org",
  description: "Online learning platform for digital skills",
  image: {
    id: "https://example.org/academy-logo.png",
    type: "Image" as const,
  },
};

describe("IssuerCard", () => {
  describe("rendering with OB2 data", () => {
    it("renders issuer name", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer },
      });
      expect(wrapper.text()).toContain("Test University");
    });

    it("renders issuer description when showDescription is true", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, showDescription: true },
      });
      expect(wrapper.text()).toContain("A test university");
    });

    it("hides description when showDescription is false", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, showDescription: false },
      });
      expect(wrapper.text()).not.toContain("A test university");
    });

    it("renders contact info when showContact is true", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, showContact: true },
      });
      expect(wrapper.text()).toContain("https://test-university.edu");
      expect(wrapper.text()).toContain("badges@test-university.edu");
    });

    it("hides contact info when showContact is false", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, showContact: false },
      });
      expect(wrapper.text()).not.toContain("https://test-university.edu");
    });
  });

  describe("rendering with OB3 data", () => {
    it("renders OB3 issuer name", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB3Issuer },
      });
      expect(wrapper.text()).toContain("Digital Academy");
    });

    it("renders image from OB3 Image object", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB3Issuer },
      });
      const img = wrapper.find("img");
      expect(img.exists()).toBe(true);
      expect(img.attributes("src")).toBe(
        "https://example.org/academy-logo.png",
      );
    });
  });

  describe("interactivity", () => {
    it("emits click event when interactive and clicked", async () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, interactive: true },
      });
      await wrapper.trigger("click");
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")![0]).toEqual([mockOB2Issuer]);
    });

    it("does not emit click when not interactive", async () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, interactive: false },
      });
      await wrapper.trigger("click");
      expect(wrapper.emitted("click")).toBeFalsy();
    });

    it("has tabindex when interactive", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, interactive: true },
      });
      expect(wrapper.attributes("tabindex")).toBe("0");
    });

    it("emits click on Enter key when interactive", async () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, interactive: true },
      });
      await wrapper.trigger("keydown.enter");
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")![0]).toEqual([mockOB2Issuer]);
    });

    it("emits click on Space key when interactive", async () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, interactive: true },
      });
      await wrapper.trigger("keydown.space");
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")![0]).toEqual([mockOB2Issuer]);
    });

    it("does not emit click on Enter key when not interactive", async () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, interactive: false },
      });
      await wrapper.trigger("keydown.enter");
      expect(wrapper.emitted("click")).toBeFalsy();
    });
  });

  describe("density", () => {
    it("applies compact density class", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, density: "compact" },
      });
      expect(wrapper.classes()).toContain("ob-issuer-card--density-compact");
    });

    it("applies spacious density class", () => {
      const wrapper = mount(IssuerCard, {
        props: { issuer: mockOB2Issuer, density: "spacious" },
      });
      expect(wrapper.classes()).toContain("ob-issuer-card--density-spacious");
    });
  });

  describe("fallback avatar", () => {
    it("shows fallback when no image provided", () => {
      const issuerNoImage = { ...mockOB2Issuer, image: undefined };
      const wrapper = mount(IssuerCard, {
        props: { issuer: issuerNoImage },
      });
      const fallback = wrapper.find(".ob-issuer-card__img-fallback");
      expect(fallback.exists()).toBe(true);
      expect(wrapper.text()).toContain("T"); // First letter of "Test University"
    });
  });
});
