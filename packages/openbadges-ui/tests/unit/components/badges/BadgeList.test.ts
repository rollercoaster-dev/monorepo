import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import BadgeList from "@/components/badges/BadgeList.vue";
import BadgeDisplay from "@/components/badges/BadgeDisplay.vue";
import {
  createDateTime,
  createIRI,
  type OB2,
  type OB3,
} from "openbadges-types";

describe("BadgeList.vue", () => {
  // Mock OB2 badge
  const mockOB2Badge: OB2.Assertion = {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: createIRI("http://example.org/badge1"),
    recipient: {
      identity: "test@example.org",
      type: "email",
      hashed: false,
    },
    badge: {
      type: "BadgeClass",
      id: createIRI("http://example.org/badgeclass1"),
      name: "Test Badge 1",
      description: "A test badge description",
      image: createIRI("http://example.org/badge1.png"),
      criteria: {
        id: createIRI("http://example.org/criteria"),
        narrative: "Test criteria narrative",
      },
      issuer: {
        type: "Profile",
        id: createIRI("http://example.org/issuer"),
        name: "Test Issuer",
      },
    },
    issuedOn: createDateTime("2023-01-01T00:00:00Z"),
    verification: {
      type: "hosted",
    },
  };

  // Mock OB3 badge
  const mockOB3Badge: OB3.VerifiableCredential = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    id: createIRI("http://example.org/credentials/123"),
    issuer: {
      id: createIRI("http://example.org/issuers/1"),
      name: "Test Issuer",
      type: "Profile",
      url: createIRI("http://example.org/issuers/1"),
    },
    validFrom: createDateTime("2023-02-01T00:00:00Z"),
    credentialSubject: {
      id: createIRI("did:example:123"),
      achievement: {
        id: createIRI("http://example.org/achievements/1"),
        type: "Achievement",
        name: "Test Badge 2",
        description: "Another test badge",
        image: createIRI("http://example.org/badge2.png"),
        criteria: {
          id: createIRI("http://example.org/criteria"),
          narrative: "Test criteria narrative",
        },
      },
    },
  };

  // Create an array of badges for testing
  const mockBadges = [mockOB2Badge, mockOB3Badge];

  it("renders a list of badges correctly", () => {
    const wrapper = mount(BadgeList, {
      props: {
        badges: mockBadges,
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });

    // Check if the correct number of badges are rendered
    const badgeItems = wrapper.findAll(".ob-badge-list__item");
    expect(badgeItems.length).toBe(2);
  });

  it("displays a loading state when loading prop is true", () => {
    const wrapper = mount(BadgeList, {
      props: {
        badges: mockBadges,
        loading: true,
      },
    });

    // Check if loading message is displayed
    expect(wrapper.find(".ob-badge-list__loading").exists()).toBe(true);
    expect(wrapper.find(".ob-badge-list__loading").text()).toContain(
      "Loading badges",
    );
  });

  it("displays an empty state when no badges are provided", () => {
    const wrapper = mount(BadgeList, {
      props: {
        badges: [],
      },
    });

    // Check if empty message is displayed
    expect(wrapper.find(".ob-badge-list__empty").exists()).toBe(true);
    expect(wrapper.find(".ob-badge-list__empty").text()).toContain(
      "No badges found",
    );
  });

  it("uses the correct layout class based on layout prop", () => {
    // Test grid layout
    const gridWrapper = mount(BadgeList, {
      props: {
        badges: mockBadges,
        layout: "grid",
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });
    expect(gridWrapper.classes()).toContain("ob-badge-list--grid-layout");

    // Test list layout
    const listWrapper = mount(BadgeList, {
      props: {
        badges: mockBadges,
        layout: "list",
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });
    expect(listWrapper.classes()).not.toContain("ob-badge-list--grid-layout");
  });

  it("emits badge-click event when a badge is clicked", async () => {
    const wrapper = mount(BadgeList, {
      props: {
        badges: [mockOB2Badge],
        interactive: true,
      },
    });

    // Find the BadgeDisplay component and trigger a click
    const badgeDisplay = wrapper.findComponent(BadgeDisplay);
    await badgeDisplay.trigger("click");

    // Check that badge-click event is emitted with the correct badge
    const badgeClickEvents = wrapper.emitted("badge-click");
    expect(badgeClickEvents).toBeTruthy();
    expect(badgeClickEvents && badgeClickEvents[0][0]).toEqual(mockOB2Badge);
  });

  it("shows pagination when showPagination is true and there are multiple pages", () => {
    const manyBadges = Array(15).fill(mockOB2Badge);

    const wrapper = mount(BadgeList, {
      props: {
        badges: manyBadges,
        pageSize: 5,
        showPagination: true,
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });

    // Check if pagination is displayed
    expect(wrapper.find(".ob-badge-list__pagination").exists()).toBe(true);

    // Check if page info is correct
    expect(wrapper.find(".ob-badge-list__pagination-info").text()).toContain(
      "Page 1 of 3",
    );
  });

  it("does not show pagination when there is only one page", () => {
    const wrapper = mount(BadgeList, {
      props: {
        badges: mockBadges,
        pageSize: 5,
        showPagination: true,
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });

    // Check that pagination is not displayed
    expect(wrapper.find(".ob-badge-list__pagination").exists()).toBe(false);
  });

  it("emits page-change event when pagination buttons are clicked", async () => {
    const manyBadges = Array(15).fill(mockOB2Badge);

    const wrapper = mount(BadgeList, {
      props: {
        badges: manyBadges,
        pageSize: 5,
        showPagination: true,
        currentPage: 1,
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });

    // Click the next page button
    await wrapper
      .find(".ob-badge-list__pagination-button:last-child")
      .trigger("click");

    // Check that page-change event is emitted with the correct page number
    const pageChangeEvents = wrapper.emitted("page-change");
    expect(pageChangeEvents).toBeTruthy();
    expect(pageChangeEvents && pageChangeEvents[0][0]).toBe(2);
  });

  it("respects the pageSize prop for pagination", () => {
    const manyBadges = Array(10).fill(mockOB2Badge);

    // With pageSize 5, should have 2 pages
    const wrapper1 = mount(BadgeList, {
      props: {
        badges: manyBadges,
        pageSize: 5,
        showPagination: true,
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });

    expect(wrapper1.find(".ob-badge-list__pagination-info").text()).toContain(
      "Page 1 of 2",
    );

    // With pageSize 10, should have 1 page
    const wrapper2 = mount(BadgeList, {
      props: {
        badges: manyBadges,
        pageSize: 10,
        showPagination: true,
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });

    // Pagination should not be displayed with only 1 page
    expect(wrapper2.find(".ob-badge-list__pagination").exists()).toBe(false);
  });

  it("uses the provided ariaLabel prop for accessibility", () => {
    const wrapper = mount(BadgeList, {
      props: {
        badges: mockBadges,
        ariaLabel: "Custom badge list label",
      },
      global: {
        stubs: {
          BadgeDisplay: true,
        },
      },
    });

    const listElement = wrapper.find(".ob-badge-list__items");
    expect(listElement.attributes("aria-label")).toBe(
      "Custom badge list label",
    );
  });

  it("filters badges by keyword", async () => {
    const wrapper = mount(BadgeList, {
      props: { badges: mockBadges },
      global: { stubs: { BadgeDisplay: true } },
    });
    const input = wrapper.find(".ob-badge-list__filter-input");
    await input.setValue("Test Badge 1");
    expect(wrapper.findAll(".ob-badge-list__item").length).toBe(1);
  });

  it("shows and changes display density", async () => {
    const wrapper = mount(BadgeList, {
      props: { badges: mockBadges, density: "compact" },
      global: { stubs: { BadgeDisplay: true } },
    });
    expect(wrapper.classes()).toContain("ob-badge-list--density-compact");
    await wrapper.setProps({ density: "spacious" });
    expect(wrapper.classes()).toContain("ob-badge-list--density-spacious");
  });

  it("shows expand/collapse button and toggles details", async () => {
    const wrapper = mount(BadgeList, {
      props: { badges: [mockOB2Badge] },
    });
    const expandBtn = wrapper.find(".badge-expand-btn");
    expect(expandBtn.exists()).toBe(true);
    expect(wrapper.find(".badge-details").exists()).toBe(false);
    await expandBtn.trigger("click");
    expect(wrapper.find(".badge-details").exists()).toBe(true);
    await expandBtn.trigger("click");
    expect(wrapper.find(".badge-details").exists()).toBe(false);
  });

  it("filters by earned status (placeholder logic)", async () => {
    const wrapper = mount(BadgeList, {
      props: { badges: mockBadges },
      global: { stubs: { BadgeDisplay: true } },
    });
    const select = wrapper.find(".ob-badge-list__filter-select");
    await select.setValue("earned");
    expect(wrapper.findAll(".ob-badge-list__item").length).toBe(2); // "earned" placeholder returns all badges
    await select.setValue("not-earned");
    expect(wrapper.findAll(".ob-badge-list__item").length).toBe(0); // "not-earned" placeholder returns no badges
  });

  it("shows focus indicator on badge-summary", async () => {
    const wrapper = mount(BadgeList, {
      props: { badges: [mockOB2Badge] },
    });
    const badgeSummary = wrapper.find(".badge-summary");
    await badgeSummary.trigger("focus");
    // Focus indicator is CSS only, so just check element exists and is focusable
    expect(badgeSummary.attributes("tabindex")).toBe("0");
  });
});
