import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(currentDir, "../../../src/components");

/** Recursively find all .vue files, excluding .story.vue */
function findVueFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findVueFiles(full));
    } else if (full.endsWith(".vue") && !full.endsWith(".story.vue")) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Collects all <style> blocks from .vue files under src/components/.
 * Returns an array of { file, css } objects.
 */
function collectStyleBlocks(): { file: string; css: string }[] {
  const vueFiles = findVueFiles(componentsDir);
  const results: { file: string; css: string }[] = [];

  for (const file of vueFiles) {
    const content = readFileSync(file, "utf-8");
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
    let match;
    while ((match = styleRegex.exec(content)) !== null) {
      results.push({
        file: relative(componentsDir, file),
        css: match[1],
      });
    }
  }

  return results;
}

describe("Token coverage", () => {
  const styleBlocks = collectStyleBlocks();

  it("should find style blocks to test", () => {
    expect(styleBlocks.length).toBeGreaterThan(0);
  });

  it("should not have hardcoded hex colors in var() fallbacks", () => {
    const hexInVar = /var\([^)]*,\s*#[0-9a-fA-F]{3,8}\s*\)/g;
    const violations: string[] = [];

    for (const { file, css } of styleBlocks) {
      const matches = css.match(hexInVar);
      if (matches) {
        for (const m of matches) {
          violations.push(`${file}: ${m.trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("should not have hardcoded rgba() in var() fallbacks", () => {
    const rgbaInVar = /var\([^)]*,\s*rgba?\([^)]*\)[^)]*\)/g;
    const violations: string[] = [];

    for (const { file, css } of styleBlocks) {
      const matches = css.match(rgbaInVar);
      if (matches) {
        for (const m of matches) {
          violations.push(`${file}: ${m.trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("should not have hardcoded pixel fallbacks in spacing vars", () => {
    const pxInSpaceVar = /var\(--ob-space-[^,]+,\s*\d+px\s*\)/g;
    const violations: string[] = [];

    for (const { file, css } of styleBlocks) {
      const matches = css.match(pxInSpaceVar);
      if (matches) {
        for (const m of matches) {
          violations.push(`${file}: ${m.trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("should not have hardcoded pixel fallbacks in border-radius vars", () => {
    const pxInRadiusVar = /var\(--ob-border-radius-[^,]+,\s*\d+px\s*\)/g;
    const violations: string[] = [];

    for (const { file, css } of styleBlocks) {
      const matches = css.match(pxInRadiusVar);
      if (matches) {
        for (const m of matches) {
          violations.push(`${file}: ${m.trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("should not use manus- class prefix", () => {
    const manusPrefix = /\.manus-/g;
    const violations: string[] = [];

    for (const { file, css } of styleBlocks) {
      const matches = css.match(manusPrefix);
      if (matches) {
        violations.push(`${file}: found ${matches.length} manus- class(es)`);
      }
    }

    expect(violations).toEqual([]);
  });
});
