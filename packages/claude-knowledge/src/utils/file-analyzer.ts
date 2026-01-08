/**
 * File Path Analysis Utilities
 *
 * Analyze file paths to infer code areas and package context.
 */

/**
 * Mapping of directory patterns to code areas.
 * More specific patterns should come before more general ones.
 */
const CODE_AREA_MAPPINGS: Array<{ pattern: RegExp; area: string }> = [
  // Test files (check first - more specific than directory patterns)
  { pattern: /\.test\.[jt]sx?$/, area: "Testing" },
  { pattern: /\.spec\.[jt]sx?$/, area: "Testing" },
  { pattern: /__tests__\//, area: "Testing" },

  // Package-specific areas
  { pattern: /packages\/claude-knowledge\//, area: "claude-knowledge" },
  { pattern: /packages\/rd-logger\//, area: "logging" },
  { pattern: /packages\/openbadges-types\//, area: "openbadges-types" },
  { pattern: /packages\/openbadges-ui\//, area: "openbadges-ui" },
  { pattern: /packages\/shared-config\//, area: "shared-config" },

  // App-specific areas (more specific first)
  { pattern: /apps\/openbadges-modular-server\/src\/api\//, area: "API" },
  { pattern: /apps\/openbadges-modular-server\/src\/db\//, area: "Database" },
  {
    pattern: /apps\/openbadges-modular-server\/src\/services\//,
    area: "Services",
  },
  { pattern: /apps\/openbadges-modular-server\//, area: "openbadges-server" },
  { pattern: /apps\/openbadges-system\/src\/components\//, area: "Components" },
  { pattern: /apps\/openbadges-system\/src\/views\//, area: "Views" },
  { pattern: /apps\/openbadges-system\/src\/stores\//, area: "State" },
  { pattern: /apps\/openbadges-system\//, area: "openbadges-system" },

  // Generic areas
  { pattern: /src\/api\//, area: "API" },
  { pattern: /src\/db\//, area: "Database" },
  { pattern: /src\/services\//, area: "Services" },
  { pattern: /src\/components\//, area: "Components" },
  { pattern: /src\/views\//, area: "Views" },
  { pattern: /src\/stores\//, area: "State" },
  { pattern: /src\/utils\//, area: "Utilities" },
  { pattern: /src\/types\//, area: "Types" },
  { pattern: /src\/hooks\//, area: "Hooks" },

  // Config files
  { pattern: /\.config\.[jt]s$/, area: "Configuration" },
  { pattern: /tsconfig\.json$/, area: "Configuration" },
  { pattern: /package\.json$/, area: "Configuration" },

  // Documentation
  { pattern: /\.md$/, area: "Documentation" },
  { pattern: /docs\//, area: "Documentation" },

  // Scripts
  { pattern: /scripts\//, area: "Scripts" },

  // Workflows
  { pattern: /\.github\/workflows\//, area: "CI/CD" },
  { pattern: /\.claude\//, area: "Claude Config" },
];

/**
 * Infer the code area from a file path.
 * Maps file paths to semantic code areas based on directory structure.
 *
 * @param filePath - File path (relative or absolute)
 * @returns Code area name if matched, undefined otherwise
 */
export function inferCodeArea(filePath: string): string | undefined {
  if (!filePath) return undefined;

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, "/");

  for (const { pattern, area } of CODE_AREA_MAPPINGS) {
    if (pattern.test(normalizedPath)) {
      return area;
    }
  }

  return undefined;
}

/**
 * Extract the package name from a monorepo file path.
 *
 * @param filePath - File path (relative or absolute)
 * @returns Package name if in a package directory, undefined otherwise
 */
export function getPackageName(filePath: string): string | undefined {
  if (!filePath) return undefined;

  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Match packages/<package-name>/...
  const packagesMatch = normalizedPath.match(/packages\/([^/]+)/);
  if (packagesMatch && packagesMatch[1]) {
    return packagesMatch[1];
  }

  // Match apps/<app-name>/...
  const appsMatch = normalizedPath.match(/apps\/([^/]+)/);
  if (appsMatch && appsMatch[1]) {
    return appsMatch[1];
  }

  return undefined;
}

/**
 * Infer code areas from multiple file paths.
 * Returns unique areas, sorted by frequency (most common first).
 *
 * @param filePaths - Array of file paths
 * @returns Array of unique code areas sorted by frequency
 */
export function inferCodeAreasFromFiles(filePaths: string[]): string[] {
  if (!filePaths || filePaths.length === 0) return [];

  // Count frequency of each area
  const areaCounts = new Map<string, number>();

  for (const filePath of filePaths) {
    const area = inferCodeArea(filePath);
    if (area) {
      areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
    }
  }

  // Sort by frequency (descending) and return unique areas
  return Array.from(areaCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([area]) => area);
}

/**
 * Get the primary code area from a list of file paths.
 * Returns the most frequently occurring area.
 *
 * @param filePaths - Array of file paths
 * @returns Most common code area, or undefined if no areas found
 */
export function getPrimaryCodeArea(filePaths: string[]): string | undefined {
  const areas = inferCodeAreasFromFiles(filePaths);
  return areas[0];
}
