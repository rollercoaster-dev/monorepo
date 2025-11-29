import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BadgeClassCard from "@components/badges/BadgeClassCard.vue";

// Mock OB2 BadgeClass data
const mockOB2BadgeClass = {
  id: "https://example.org/badges/1",
  type: "BadgeClass" as const,
  name: "Web Developer Certificate",
  description: "Demonstrates proficiency in web development technologies",
  image: "https://example.org/badge-image.png",
  criteria: {
    narrative: "Complete all required courses and projects",
  },
  issuer: {
    id: "https://example.org/issuers/1",
    name: "Tech Academy",
  },
  tags: ["web", "development", "javascript", "html", "css"],
};

// Mock OB3 Achievement data
const mockOB3Achievement = {
  id: "https://example.org/achievements/2",
  type: ["Achievement"] as [string, ...string[]],
  name: "Data Science Fundamentals",
  description: "Understanding of core data science concepts",
  image: {
    id: "https://example.org/ds-badge.png",
    type: "Image" as const,
  },
  criteria: {
    narrative: "Pass the data science assessment",
  },
  creator: {
    id: "https://example.org/issuers/2",
    name: "Data Institute",
  },
};

describe("BadgeClassCard", () => {
  describe("rendering with OB2 data", () => {
    it("renders badge name", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass },
      });
      expect(wrapper.text()).toContain("Web Developer Certificate");
    });

    it("renders badge description when showDescription is true", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, showDescription: true },
      });
      expect(wrapper.text()).toContain("Demonstrates proficiency");
    });

    it("hides description when showDescription is false", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, showDescription: false },
      });
      expect(wrapper.text()).not.toContain("Demonstrates proficiency");
    });

    it("renders issuer name when showIssuer is true", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, showIssuer: true },
      });
      expect(wrapper.text()).toContain("Tech Academy");
    });

    it("renders tags when showTags is true", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, showTags: true },
      });
      expect(wrapper.text()).toContain("web");
      expect(wrapper.text()).toContain("javascript");
    });

    it("limits tags to 5 with overflow indicator", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, showTags: true },
      });
      const tags = wrapper.findAll(".manus-badge-class-tag");
      // 5 visible tags + overflow indicator if more than 5
      expect(tags.length).toBeLessThanOrEqual(6);
    });

    it("renders criteria when showCriteria is true", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, showCriteria: true },
      });
      expect(wrapper.text()).toContain("Complete all required");
    });
  });

  describe("rendering with OB3 data", () => {
    it("renders OB3 achievement name", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3Achievement },
      });
      expect(wrapper.text()).toContain("Data Science Fundamentals");
    });

    it("renders creator name from OB3 data", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3Achievement, showIssuer: true },
      });
      expect(wrapper.text()).toContain("Data Institute");
    });

    it("renders image from OB3 Image object", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3Achievement },
      });
      const img = wrapper.find("img");
      expect(img.exists()).toBe(true);
      expect(img.attributes("src")).toBe("https://example.org/ds-badge.png");
    });
  });

  describe("interactivity", () => {
    it("emits click event when interactive and clicked", async () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, interactive: true },
      });
      await wrapper.trigger("click");
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")![0]).toEqual([mockOB2BadgeClass]);
    });

    it("does not emit click when not interactive", async () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, interactive: false },
      });
      await wrapper.trigger("click");
      expect(wrapper.emitted("click")).toBeFalsy();
    });

    it("has tabindex when interactive", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, interactive: true },
      });
      expect(wrapper.attributes("tabindex")).toBe("0");
    });

    it("emits click on Enter key when interactive", async () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, interactive: true },
      });
      await wrapper.trigger("keydown.enter");
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")![0]).toEqual([mockOB2BadgeClass]);
    });

    it("emits click on Space key when interactive", async () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, interactive: true },
      });
      await wrapper.trigger("keydown.space");
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")![0]).toEqual([mockOB2BadgeClass]);
    });

    it("does not emit click on Enter key when not interactive", async () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, interactive: false },
      });
      await wrapper.trigger("keydown.enter");
      expect(wrapper.emitted("click")).toBeFalsy();
    });
  });

  describe("density", () => {
    it("applies compact density class", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, density: "compact" },
      });
      expect(wrapper.classes()).toContain("density-compact");
    });

    it("applies spacious density class", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB2BadgeClass, density: "spacious" },
      });
      expect(wrapper.classes()).toContain("density-spacious");
    });
  });

  describe("fallback image", () => {
    it("shows fallback when no image provided", () => {
      const badgeNoImage = { ...mockOB2BadgeClass, image: undefined };
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: badgeNoImage },
      });
      const fallback = wrapper.find(".manus-badge-class-img-fallback");
      expect(fallback.exists()).toBe(true);
    });
  });
});
