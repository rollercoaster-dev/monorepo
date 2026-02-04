import { describe, expect, it } from "bun:test";
import {
  buildCredential,
  serializeOB3,
} from "../../src/credentials/credential-builder";
import { BadgeVersion, VC_V2_CONTEXT_URL } from "../../src/credentials/version";
import type { Shared } from "openbadges-types";
import type {
  IssuerData,
  BadgeClassData,
  AssertionData,
} from "../../src/credentials/types";

const mockIssuer: IssuerData = {
  id: "https://example.edu/issuer/1" as Shared.IRI,
  name: "Example University",
  url: "https://example.edu" as Shared.IRI,
};

const mockBadgeClass: BadgeClassData = {
  id: "https://example.edu/badges/123" as Shared.IRI,
  name: "Web Development",
  description: "Web dev basics",
  image: "https://example.edu/badges/123/image.png" as Shared.IRI,
  criteria: { narrative: "Complete course" },
  issuer: mockIssuer.id as Shared.IRI,
};

const mockAssertion: AssertionData = {
  id: "https://example.edu/assertions/456" as Shared.IRI,
  badgeClass: mockBadgeClass.id as Shared.IRI,
  recipient: { type: "email", identity: "student@example.edu", hashed: false },
  issuedOn: "2024-01-15T10:00:00Z",
};

describe("buildCredential", () => {
  it("should build OB3 credential by default", () => {
    const result = buildCredential({
      assertion: mockAssertion,
      badgeClass: mockBadgeClass,
      issuer: mockIssuer,
    });
    expect(result.type).toEqual([
      "VerifiableCredential",
      "OpenBadgeCredential",
    ]);
  });

  it("should build OB2 credential when specified", () => {
    const result = buildCredential({
      assertion: mockAssertion,
      badgeClass: mockBadgeClass,
      issuer: mockIssuer,
      version: BadgeVersion.V2,
    });
    expect(result.type).toBe("Assertion");
    expect(result["@context"]).toBe("https://w3id.org/openbadges/v2");
  });

  it("should have correct @context ordering for OB3", () => {
    const result = buildCredential({
      assertion: mockAssertion,
      badgeClass: mockBadgeClass,
      issuer: mockIssuer,
    });
    const context = result["@context"] as string[];
    expect(context[0]).toBe(VC_V2_CONTEXT_URL);
  });
});

describe("serializeOB3", () => {
  it("should create valid VerifiableCredential", () => {
    const result = serializeOB3(mockAssertion, mockBadgeClass, mockIssuer);
    expect(result.type).toEqual([
      "VerifiableCredential",
      "OpenBadgeCredential",
    ]);
    expect(result.validFrom).toBe("2024-01-15T10:00:00Z");
    expect(result.credentialSubject.type).toBe("AchievementSubject");
  });
});
