import { describe, expect, it } from "bun:test";
import {
  inferCodeArea,
  getPackageName,
  inferCodeAreasFromFiles,
  getPrimaryCodeArea,
} from "./file-analyzer";

describe("file-analyzer", () => {
  describe("inferCodeArea", () => {
    it("should infer claude-knowledge area", () => {
      expect(inferCodeArea("packages/claude-knowledge/src/hooks.ts")).toBe(
        "claude-knowledge",
      );
      expect(
        inferCodeArea("packages/claude-knowledge/src/utils/git-parser.ts"),
      ).toBe("claude-knowledge");
    });

    it("should infer logging area from rd-logger", () => {
      expect(inferCodeArea("packages/rd-logger/src/index.ts")).toBe("logging");
    });

    it("should infer API area from server paths", () => {
      expect(
        inferCodeArea("apps/openbadges-modular-server/src/api/routes.ts"),
      ).toBe("API");
    });

    it("should infer Database area from db paths", () => {
      expect(
        inferCodeArea("apps/openbadges-modular-server/src/db/queries.ts"),
      ).toBe("Database");
    });

    it("should infer Components area from component paths", () => {
      expect(
        inferCodeArea("apps/openbadges-system/src/components/Badge.vue"),
      ).toBe("Components");
    });

    it("should infer Testing area from test files", () => {
      expect(inferCodeArea("src/utils/helper.test.ts")).toBe("Testing");
      expect(inferCodeArea("src/utils/helper.spec.ts")).toBe("Testing");
      expect(inferCodeArea("src/__tests__/helper.ts")).toBe("Testing");
    });

    it("should infer Configuration area from config files", () => {
      expect(inferCodeArea("tsconfig.json")).toBe("Configuration");
      expect(inferCodeArea("vite.config.ts")).toBe("Configuration");
      expect(inferCodeArea("package.json")).toBe("Configuration");
    });

    it("should infer Documentation area from markdown files", () => {
      expect(inferCodeArea("README.md")).toBe("Documentation");
      expect(inferCodeArea("docs/guide.md")).toBe("Documentation");
    });

    it("should infer CI/CD area from workflow files", () => {
      expect(inferCodeArea(".github/workflows/ci.yml")).toBe("CI/CD");
    });

    it("should infer Claude Config area from .claude files", () => {
      expect(inferCodeArea(".claude/settings.json")).toBe("Claude Config");
    });

    it("should return undefined for unrecognized paths", () => {
      expect(inferCodeArea("random/unknown/file.xyz")).toBeUndefined();
      expect(inferCodeArea("")).toBeUndefined();
    });

    it("should handle Windows-style paths", () => {
      expect(inferCodeArea("packages\\claude-knowledge\\src\\hooks.ts")).toBe(
        "claude-knowledge",
      );
    });
  });

  describe("getPackageName", () => {
    it("should extract package name from packages directory", () => {
      expect(getPackageName("packages/claude-knowledge/src/index.ts")).toBe(
        "claude-knowledge",
      );
      expect(getPackageName("packages/rd-logger/src/index.ts")).toBe(
        "rd-logger",
      );
      expect(getPackageName("packages/openbadges-types/src/index.ts")).toBe(
        "openbadges-types",
      );
    });

    it("should extract app name from apps directory", () => {
      expect(
        getPackageName("apps/openbadges-modular-server/src/index.ts"),
      ).toBe("openbadges-modular-server");
      expect(getPackageName("apps/openbadges-system/src/App.vue")).toBe(
        "openbadges-system",
      );
    });

    it("should return undefined for root files", () => {
      expect(getPackageName("package.json")).toBeUndefined();
      expect(getPackageName("tsconfig.json")).toBeUndefined();
    });

    it("should return undefined for scripts directory", () => {
      expect(getPackageName("scripts/build.ts")).toBeUndefined();
    });

    it("should handle empty input", () => {
      expect(getPackageName("")).toBeUndefined();
    });

    it("should handle Windows-style paths", () => {
      expect(getPackageName("packages\\rd-logger\\src\\index.ts")).toBe(
        "rd-logger",
      );
    });
  });

  describe("inferCodeAreasFromFiles", () => {
    it("should return unique areas sorted by frequency", () => {
      const files = [
        "packages/claude-knowledge/src/hooks.ts",
        "packages/claude-knowledge/src/types.ts",
        "packages/rd-logger/src/index.ts",
        "packages/claude-knowledge/src/utils/git-parser.ts",
      ];
      const areas = inferCodeAreasFromFiles(files);
      // claude-knowledge appears 3 times, logging once
      expect(areas[0]).toBe("claude-knowledge");
      expect(areas).toContain("logging");
    });

    it("should return empty array for empty input", () => {
      expect(inferCodeAreasFromFiles([])).toEqual([]);
    });

    it("should return empty array for unrecognized files", () => {
      expect(inferCodeAreasFromFiles(["random/file.xyz"])).toEqual([]);
    });

    it("should handle mixed recognized and unrecognized files", () => {
      const files = [
        "packages/claude-knowledge/src/hooks.ts",
        "random/unknown/file.xyz",
      ];
      const areas = inferCodeAreasFromFiles(files);
      expect(areas).toEqual(["claude-knowledge"]);
    });
  });

  describe("getPrimaryCodeArea", () => {
    it("should return the most common area", () => {
      const files = [
        "packages/claude-knowledge/src/hooks.ts",
        "packages/claude-knowledge/src/types.ts",
        "packages/rd-logger/src/index.ts",
      ];
      expect(getPrimaryCodeArea(files)).toBe("claude-knowledge");
    });

    it("should return undefined for empty input", () => {
      expect(getPrimaryCodeArea([])).toBeUndefined();
    });

    it("should return undefined for unrecognized files", () => {
      expect(getPrimaryCodeArea(["random/file.xyz"])).toBeUndefined();
    });
  });
});
