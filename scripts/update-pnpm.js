#!/usr/bin/env node

/**
 * Update pnpm to the latest version in package.json
 *
 * Usage: pnpm run update-pnpm
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');

console.log('🔍 Checking for latest pnpm version...\n');

try {
  // Get latest pnpm version
  const latestVersion = execSync('npm view pnpm version', { encoding: 'utf-8' }).trim();

  // Read current package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.packageManager?.replace('pnpm@', '') || 'unknown';

  console.log(`📦 Current version: ${currentVersion}`);
  console.log(`✨ Latest version:  ${latestVersion}\n`);

  if (currentVersion === latestVersion) {
    console.log('✅ Already on the latest version!\n');
    process.exit(0);
  }

  // Update packageManager field
  packageJson.packageManager = `pnpm@${latestVersion}`;

  // Write back to package.json
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`✅ Updated package.json to pnpm@${latestVersion}\n`);
  console.log('📋 Next steps:');
  console.log('   1. Run: pnpm install');
  console.log('   2. Test that everything works');
  console.log(`   3. Commit: git commit -am "chore: update pnpm to ${latestVersion}"\n`);

} catch (error) {
  console.error('❌ Error updating pnpm version:', error.message);
  process.exit(1);
}
