#!/usr/bin/env bun
/**
 * Generates a sitemap from Vue Router's file-based pages directory.
 * Scans apps/openbadges-system/src/client/pages/ and converts the
 * file structure to URL paths following unplugin-vue-router conventions.
 *
 * Output: JSON with static and dynamic routes.
 *
 * Usage:
 *   bun scripts/generate-sitemap.ts
 *   bun scripts/generate-sitemap.ts --format=list   # one route per line
 */

import { resolve, relative } from "path";
import { Glob } from "bun";

const PAGES_DIR = resolve(
  import.meta.dir,
  "../apps/openbadges-system/src/client/pages",
);

interface Sitemap {
  static: string[];
  dynamic: string[];
}

function filePathToRoute(filePath: string): {
  route: string;
  isDynamic: boolean;
} {
  // Get path relative to pages dir, remove .vue extension
  let route = relative(PAGES_DIR, filePath).replace(/\.vue$/, "");

  // Remove index segments (index.vue → parent directory route)
  route = route.replace(/\/index$/, "").replace(/^index$/, "");

  // Convert [param] to :param and detect dynamic routes
  const isDynamic = route.includes("[");
  route = route.replace(/\[([^\]]+)\]/g, ":$1");

  // Ensure leading slash
  route = "/" + route;

  // Normalize double slashes
  route = route.replace(/\/+/g, "/");

  return { route, isDynamic };
}

async function generateSitemap(): Promise<Sitemap> {
  const sitemap: Sitemap = { static: [], dynamic: [] };
  const glob = new Glob("**/*.vue");

  for await (const file of glob.scan({ cwd: PAGES_DIR })) {
    const fullPath = resolve(PAGES_DIR, file);
    const { route, isDynamic } = filePathToRoute(fullPath);

    if (isDynamic) {
      sitemap.dynamic.push(route);
    } else {
      sitemap.static.push(route);
    }
  }

  // Deduplicate and sort for consistent output
  sitemap.static = [...new Set(sitemap.static)].sort();
  sitemap.dynamic = [...new Set(sitemap.dynamic)].sort();

  return sitemap;
}

const sitemap = await generateSitemap();
const format = process.argv.includes("--format=list") ? "list" : "json";

if (format === "list") {
  console.log("# Static routes");
  sitemap.static.forEach((r) => console.log(r));
  console.log("\n# Dynamic routes (need IDs)");
  sitemap.dynamic.forEach((r) => console.log(r));
} else {
  console.log(JSON.stringify(sitemap, null, 2));
}
