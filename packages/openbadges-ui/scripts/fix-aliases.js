#!/usr/bin/env bun
/* eslint-disable no-console, no-undef */
// Post-build script to replace path aliases in type declarations

const fs = require("fs");
const path = require("path");

const typesDir = path.join(__dirname, "../dist/types");

// Alias replacements
const replacements = {
  "@components/": "./components/",
  "@composables/": "./composables/",
  "@services/": "./services/",
  "@utils/": "./utils/",
  "@types/": "./types/",
  "@/": "./",
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Use simple string replacement - aliases are hardcoded constants, not user input
  for (const [alias, replacement] of Object.entries(replacements)) {
    if (content.includes(alias)) {
      content = content.split(alias).join(replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Fixed aliases in: ${path.relative(typesDir, filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith(".d.ts")) {
      processFile(filePath);
    }
  }
}

if (fs.existsSync(typesDir)) {
  console.log("Fixing path aliases in type declarations...");
  walkDir(typesDir);
  console.log("Done!");
} else {
  console.error(`Types directory not found: ${typesDir}`);
  process.exit(1);
}
