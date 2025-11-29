import { describe, it, expect } from "vitest";
import type { OB2, Shared } from "@/types";
import { useBadges } from "@composables/useBadges";
import { BadgeService } from "@services/BadgeService";

describe("useBadges", () => {
  it("initial state is empty", () => {
    const {
      badges,
      filterText,
      sortBy,
      sortDirection,
      filteredBadges,
      sortedBadges,
      normalizedBadges,
      badgesByIssuer,
    } = useBadges();
    expect(badges.value).toHaveLength(0);
    expect(filterText.value).toBe("");
    expect(sortBy.value).toBe("issuedOn");
    expect(sortDirection.value).toBe("desc");
    expect(filteredBadges.value).toEqual([]);
    expect(sortedBadges.value).toEqual([]);
    expect(normalizedBadges.value).toEqual([]);
    expect(badgesByIssuer.value).toEqual({});
  });

  it("addBadge and removeBadge work correctly", () => {
    const { badges, addBadge, removeBadge } = useBadges();
    const assertion = BadgeService.createAssertionTemplate(
      BadgeService.createBadgeClassTemplate(),
      "test@example.com",
    );
    addBadge(assertion);
    expect(badges.value).toHaveLength(1);
    expect(badges.value?.[0]).toEqual(assertion);
    removeBadge(assertion.id as string);
    expect(badges.value).toHaveLength(0);
  });

  it("setBadges replaces badges", () => {
    const { badges, setBadges } = useBadges();
    const a = BadgeService.createAssertionTemplate(
      BadgeService.createBadgeClassTemplate(),
      "a@a.com",
    );
    const b = BadgeService.createAssertionTemplate(
      BadgeService.createBadgeClassTemplate(),
      "b@b.com",
    );
    setBadges([a, b]);
    expect(badges.value).toEqual([a, b]);
  });

  it("filterText and filtering works", () => {
    const { filteredBadges, setFilter, setBadges } = useBadges();

    const badge1 = BadgeService.createAssertionTemplate(
      BadgeService.createBadgeClassTemplate(),
      "e1@e.com",
    );
    (badge1.badge as OB2.BadgeClass).name = "Alpha Badge";
    const badge2 = BadgeService.createAssertionTemplate(
      BadgeService.createBadgeClassTemplate(),
      "e2@e.com",
    );
    (badge2.badge as OB2.BadgeClass).name = "Beta Badge";

    setBadges([badge1, badge2]);

    expect(filteredBadges.value).toHaveLength(2);
    setFilter("alpha");
    expect(filteredBadges.value).toHaveLength(1);
    expect(filteredBadges.value[0]).toEqual(badge1);
    setFilter("");
    expect(filteredBadges.value).toHaveLength(2);
  });

  it("sorting by name asc/desc works", () => {
    const { sortedBadges, setSorting, setBadges } = useBadges();

    const bc1 = BadgeService.createBadgeClassTemplate();
    bc1.name = "A";
    const bc2 = BadgeService.createBadgeClassTemplate();
    bc2.name = "B";
    const badgeA: OB2.Assertion = BadgeService.createAssertionTemplate(
      bc1,
      "a@a.com",
    ); // Explicit type
    const badgeB: OB2.Assertion = BadgeService.createAssertionTemplate(
      bc2,
      "b@b.com",
    ); // Explicit type

    setBadges([badgeB, badgeA]);

    setSorting("name", "asc");
    expect(
      sortedBadges.value.map((b) => BadgeService.normalizeBadge(b).name),
    ).toEqual(["A", "B"]);
    setSorting("name", "desc");
    expect(
      sortedBadges.value.map((b) => BadgeService.normalizeBadge(b).name),
    ).toEqual(["B", "A"]);
  });

  it("badgesByIssuer groups correctly", () => {
    const bc1 = BadgeService.createBadgeClassTemplate();
    bc1.name = "X";
    bc1.issuer = {
      id: "urn:issuer:x" as Shared.IRI,
      type: "Profile",
      name: "IssuerX",
    };
    const bc2 = BadgeService.createBadgeClassTemplate();
    bc2.name = "Y";
    bc2.issuer = {
      id: "urn:issuer:y" as Shared.IRI,
      type: "Profile",
      name: "IssuerY",
    };
    const b1 = BadgeService.createAssertionTemplate(bc1, "1@1.com");
    const b2 = BadgeService.createAssertionTemplate(bc2, "2@2.com");
    const { badgesByIssuer } = useBadges([b1, b2]);
    const grouped = badgesByIssuer.value;
    expect(Object.keys(grouped)).toContain("IssuerX");
    expect(Object.keys(grouped)).toContain("IssuerY");
    expect(grouped["IssuerX"]).toHaveLength(1);
    expect(grouped["IssuerY"]).toHaveLength(1);
  });
});
