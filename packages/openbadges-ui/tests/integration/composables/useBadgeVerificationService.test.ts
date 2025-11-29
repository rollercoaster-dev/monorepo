import { describe, it, expect, beforeEach } from "vitest";
import { useBadgeVerification } from "@/composables/useBadgeVerification";
import { nextTick } from "vue";
import { createMockOB2Badge, createMockOB3Badge } from "../utils";
import { vi } from "vitest";
import { createDateTime } from "@/utils/type-helpers";
import type { OB2 } from "openbadges-types";

// Mock OB2 badge
const baseBadge = createMockOB2Badge().badge as OB2.BadgeClass;
const validOB2Badge = createMockOB2Badge({
  issuedOn: createDateTime("2025-01-01T00:00:00Z"),
  expires: createDateTime("2026-01-01T00:00:00Z"),
  badge: {
    type: "BadgeClass",
    id: baseBadge.id,
    name: baseBadge.name,
    description: baseBadge.description,
    image: baseBadge.image,
    criteria: { narrative: "The criteria for earning this badge" },
    issuer: baseBadge.issuer,
  },
});

// Mock OB3 badge
const validOB3Badge = createMockOB3Badge();

vi.mock("openbadges-types", () => ({
  validateBadge: vi.fn().mockImplementation((badge) => {
    const isOB2 =
      badge &&
      typeof badge === "object" &&
      "type" in badge &&
      badge.type === "Assertion";
    const isOB3 =
      badge &&
      typeof badge === "object" &&
      "@context" in badge &&
      "type" in badge &&
      Array.isArray(badge.type) &&
      badge.type.includes("VerifiableCredential");
    if (isOB2) {
      return { isValid: true, errors: [], warnings: [], version: "OB2" };
    } else if (isOB3) {
      return { isValid: true, errors: [], warnings: [], version: "OB3" };
    } else {
      return {
        isValid: false,
        errors: ["Invalid badge format"],
        warnings: [],
        version: undefined,
      };
    }
  }),
  isBadge: vi.fn().mockReturnValue(true),
  isOB2Profile: vi.fn().mockReturnValue(true),
}));

describe("useBadgeVerification (integration)", () => {
  let composable: ReturnType<typeof useBadgeVerification>;

  beforeEach(() => {
    composable = useBadgeVerification();
    composable.clearVerification();
  });

  it("verifies a valid OB2 badge and updates state", async () => {
    const result = await composable.verifyBadge(validOB2Badge);
    await nextTick();
    expect(result.isValid).toBe(true);
    expect(composable.isValid.value).toBe(true);
    expect(composable.errors.value).toEqual([]);
    expect(composable.verificationMethod.value).toBe("hosted");
    expect(composable.state.value.badge).toEqual(validOB2Badge);
    expect(composable.hasBeenVerified.value).toBe(true);
  });

  it("verifies a valid OB3 badge and updates state", async () => {
    const result = await composable.verifyBadge(validOB3Badge);
    await nextTick();
    expect(result.badgeVersion).toBe("OB3");
    expect(composable.state.value.badge).toEqual(validOB3Badge);
    expect(composable.hasBeenVerified.value).toBe(true);
    // OB3 may have warnings but should be valid
    expect(result.structureValidation.isValid).toBe(true);
  });

  it("handles an invalid badge and reports errors", async () => {
    const invalidBadge = { id: "not-a-valid-badge" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await composable.verifyBadge(invalidBadge as any);
    await nextTick();
    expect(result.isValid).toBe(false);
    expect(composable.isValid.value).toBe(false);
    expect(composable.errors.value.length).toBeGreaterThan(0);
    expect(composable.state.value.badge).toEqual(invalidBadge);
  });

  it("can clear the verification state", async () => {
    await composable.verifyBadge(validOB2Badge);
    composable.clearVerification();
    expect(composable.state.value.result).toBeNull();
    expect(composable.state.value.badge).toBeNull();
    expect(composable.hasBeenVerified.value).toBe(false);
  });
});
