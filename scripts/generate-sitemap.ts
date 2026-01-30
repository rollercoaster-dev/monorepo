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

import { resolve } from "path";
import { Glob } from "bun";

const PAGES_DIR = resolve(
  import.meta.dir,
  "../apps/openbadges-system/src/client/pages",
);

interface Sitemap {
  static: string[];
  dynamic: string[];
}

function filePathToRoute(relativePath: string): {
  route: string;
  isDynamic: boolean;
} {
  let route = relativePath.replace(/\.vue$/, "");
  route = route.replace(/\/index$/, "").replace(/^index$/, "");

  const isDynamic = route.includes("[");
  route = route.replace(/\[([^\]]+)\]/g, ":$1");

  route = ("/" + route).replace(/\/+/g, "/");

  return { route, isDynamic };
}

async function generateSitemap(): Promise<Sitemap> {
  const sitemap: Sitemap = { static: [], dynamic: [] };
  const glob = new Glob("**/*.vue");

  for await (const file of glob.scan({ cwd: PAGES_DIR })) {
    const { route, isDynamic } = filePathToRoute(file);

    if (isDynamic) {
      sitemap.dynamic.push(route);
    } else {
      sitemap.static.push(route);
    }
  }

  sitemap.static = [...new Set(sitemap.static)].sort();
  sitemap.dynamic = [...new Set(sitemap.dynamic)].sort();

  return sitemap;
}

const sitemap = await generateSitemap();
const format = process.argv.includes("--format=list") ? "list" : "json";

if (format === "list") {
  console.log("# Static routes");
  for (const r of sitemap.static) console.log(r);
  console.log("\n# Dynamic routes (need IDs)");
  for (const r of sitemap.dynamic) console.log(r);
} else {
  console.log(JSON.stringify(sitemap, null, 2));
}
