/* Local replica of .github/workflows/security-scan.yml secret scan */
const fs = require('fs');
const path = require('path');

const secretPatterns = [
  // Match both quoted and unquoted values
  { name: 'API Key', pattern: /api[_-]?key\s*[:=]\s*['"]?\w{20,}['"]?/gi },
  { name: 'Password', pattern: /password\s*[:=]\s*['"]?\w{8,}['"]?/gi },
  { name: 'Secret', pattern: /secret\s*[:=]\s*['"]?\w{20,}['"]?/gi },
  { name: 'Token', pattern: /token\s*[:=]\s*['"]?\w{20,}['"]?/gi },
  { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g },
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g }
];

const excludePatterns = [
  /\.git\//,
  /node_modules\//,
  /\.pnpm\//,
  /dist\//,
  /build\//,
  /coverage\//,
  /keys\//,
  /__tests__\//,
  /\.test\./,
  /docs\//
];

const allowedExtensions = new Set([
  '.ts', '.js', '.cjs', '.mjs', '.json', '.yml', '.yaml', '.env', '.sh', '.bash', '.zsh'
]);

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);
  let findings = [];

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative('.', fullPath);

    if (excludePatterns.some((p) => p.test(relativePath))) continue;

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findings = findings.concat(scanDirectory(fullPath));
    } else if (stat.isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      if (!allowedExtensions.has(ext)) continue;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const { name, pattern } of secretPatterns) {
          // Use matchAll to find ALL occurrences, not just the first
          const matches = [...content.matchAll(pattern)];
          for (const match of matches) {
            const line = content.substring(0, match.index).split('\n').length;
            findings.push({ file: relativePath, type: name, line, snippet: match[0] });
          }
        }
      } catch {
        // ignore unreadable files
      }
    }
  }

  return findings;
}

const results = scanDirectory('.');
if (results.length) {
  console.log('Findings:');
  for (const f of results) console.log(`${f.file}:${f.line} - ${f.type} -> ${f.snippet}`);
  process.exitCode = 1;
} else {
  console.log('No potential secrets detected by local scan.');
}

