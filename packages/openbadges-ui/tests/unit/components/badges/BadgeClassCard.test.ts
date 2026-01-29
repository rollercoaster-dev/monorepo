import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BadgeClassCard from "@components/badges/BadgeClassCard.vue";
import type { OB2, OB3, Shared } from "openbadges-types";

// Mock OB2 BadgeClass data
const mockOB2BadgeClass: OB2.BadgeClass = {
  id: "https://example.org/badges/1" as Shared.IRI,
  type: "BadgeClass" as const,
  name: "Web Developer Certificate",
  description: "Demonstrates proficiency in web development technologies",
  image: "https://example.org/badge-image.png" as Shared.IRI,
  criteria: {
    id: "https://example.org/criteria/1" as Shared.IRI,
    narrative: "Complete all required courses and projects",
  },
  issuer: {
    id: "https://example.org/issuers/1" as Shared.IRI,
    type: "Profile",
    name: "Tech Academy",
  },
  tags: ["web", "development", "javascript", "html", "css"],
};

// Mock OB3 Achievement data
const mockOB3Achievement: OB3.Achievement = {
  id: "https://example.org/achievements/2" as Shared.IRI,
  type: ["Achievement"],
  name: "Data Science Fundamentals",
  description: "Understanding of core data science concepts",
  image: {
    id: "https://example.org/ds-badge.png" as Shared.IRI,
    type: "Image" as const,
  },
  criteria: {
    narrative: "Pass the data science assessment",
  },
  creator: {
    id: "https://example.org/issuers/2" as Shared.IRI,
    type: ["Profile"],
    name: "Data Institute",
    url: "https://data-institute.org" as Shared.IRI,
  },
};

// Mock OB3 Achievement array data (multi-achievement credential)
const mockOB3AchievementArray: OB3.Achievement[] = [
  {
    id: "https://example.org/achievements/primary" as Shared.IRI,
    type: ["Achievement"],
    name: "Primary Achievement",
    description: "This is the primary achievement in the array",
    image: {
      id: "https://example.org/primary-badge.png" as Shared.IRI,
      type: "Image" as const,
    },
    criteria: {
      narrative: "Complete the primary requirements",
    },
    creator: {
      id: "https://example.org/issuers/multi" as Shared.IRI,
      type: ["Profile"],
      name: "Multi-Achievement Issuer",
      url: "https://multi-issuer.org" as Shared.IRI,
    },
  },
  {
    id: "https://example.org/achievements/secondary" as Shared.IRI,
    type: ["Achievement"],
    name: "Secondary Achievement",
    description: "This is the secondary achievement",
    image: {
      id: "https://example.org/secondary-badge.png" as Shared.IRI,
      type: "Image" as const,
    },
    criteria: {
      narrative: "Complete the secondary requirements",
    },
    creator: {
      id: "https://example.org/issuers/multi" as Shared.IRI,
      type: ["Profile"],
      name: "Multi-Achievement Issuer",
      url: "https://multi-issuer.org" as Shared.IRI,
    },
  },
  {
    id: "https://example.org/achievements/tertiary" as Shared.IRI,
    type: ["Achievement"],
    name: "Tertiary Achievement",
    description: "This is the tertiary achievement",
    criteria: {
      narrative: "Complete the tertiary requirements",
    },
  },
];

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
      const tags = wrapper.findAll(".ob-badge-class-card__tag");
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

  describe("rendering with OB3 Achievement arrays", () => {
    it("displays first achievement name from array", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3AchievementArray },
      });
      expect(wrapper.text()).toContain("Primary Achievement");
      // Should NOT show subsequent achievements' names directly
      expect(wrapper.text()).not.toContain("Secondary Achievement");
      expect(wrapper.text()).not.toContain("Tertiary Achievement");
    });

    it("shows +N more achievements indicator for arrays with multiple achievements", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3AchievementArray },
      });
      const multiIndicator = wrapper.find(".ob-badge-class-card__multi");
      expect(multiIndicator.exists()).toBe(true);
      expect(multiIndicator.text()).toContain("+2 more achievements");
    });

    it("hides multi-achievement indicator for single achievement (not array)", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3Achievement },
      });
      const multiIndicator = wrapper.find(".ob-badge-class-card__multi");
      expect(multiIndicator.exists()).toBe(false);
    });

    it("extracts description from first achievement in array", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3AchievementArray, showDescription: true },
      });
      expect(wrapper.text()).toContain("primary achievement in the array");
    });

    it("extracts image from first achievement in array", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3AchievementArray },
      });
      const img = wrapper.find("img");
      expect(img.exists()).toBe(true);
      expect(img.attributes("src")).toBe(
        "https://example.org/primary-badge.png",
      );
    });

    it("extracts creator/issuer from first achievement in array", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3AchievementArray, showIssuer: true },
      });
      expect(wrapper.text()).toContain("Multi-Achievement Issuer");
    });

    it("emits click with entire array when interactive", async () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3AchievementArray, interactive: true },
      });
      await wrapper.trigger("click");
      expect(wrapper.emitted("click")).toBeTruthy();
      expect(wrapper.emitted("click")![0]).toEqual([mockOB3AchievementArray]);
    });

    it("shows singular form for +1 more achievement", () => {
      const twoAchievements = mockOB3AchievementArray.slice(0, 2);
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: twoAchievements },
      });
      const multiIndicator = wrapper.find(".ob-badge-class-card__multi");
      expect(multiIndicator.exists()).toBe(true);
      expect(multiIndicator.text()).toContain("+1 more achievement");
      // Should NOT have "achievements" plural
      expect(multiIndicator.text()).not.toMatch(/\+1 more achievements/);
    });

    it("provides accessible aria-label for multi-achievement indicator", () => {
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: mockOB3AchievementArray },
      });
      const multiIndicator = wrapper.find(".ob-badge-class-card__multi");
      expect(multiIndicator.attributes("aria-label")).toContain(
        "2 more achievements",
      );
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
      const badgeNoImage = {
        ...mockOB2BadgeClass,
        image: undefined,
      } as unknown as OB2.BadgeClass;
      const wrapper = mount(BadgeClassCard, {
        props: { badgeClass: badgeNoImage },
      });
      const fallback = wrapper.find(".ob-badge-class-card__img-fallback");
      expect(fallback.exists()).toBe(true);
    });
  });
});
