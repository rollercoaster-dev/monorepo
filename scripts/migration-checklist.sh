#!/bin/bash
# Migration Checklist for Rollercoaster.dev monorepo
# Run before marking a package migration complete
# Based on CodeRabbit review learnings from PR #48

set -e  # Exit on error

# Color output for better readability
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  YELLOW='\033[1;33m'
  RED='\033[0;31m'
  NC='\033[0m' # No Color
else
  GREEN=''
  BLUE=''
  YELLOW=''
  RED=''
  NC=''
fi

# Check if package directory was provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Package directory required${NC}"
  echo ""
  echo "Usage: $0 <package-directory>"
  echo "Example: $0 packages/openbadges-ui"
  exit 1
fi

PACKAGE_DIR="$1"
PACKAGE_NAME=$(basename "$PACKAGE_DIR")

# Verify directory exists
if [ ! -d "$PACKAGE_DIR" ]; then
  echo -e "${RED}Error: Directory not found: $PACKAGE_DIR${NC}"
  exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎢 Migration Checklist for: ${PACKAGE_NAME}${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ISSUES_FOUND=0

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

#
# 1. Lint Check
#
echo -e "${BLUE}📋 Checking lint...${NC}"
if bun --filter "$PACKAGE_NAME" run lint 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Lint passed"
else
  echo -e "${RED}✗${NC} Lint failed - run 'bun --filter $PACKAGE_NAME run lint:fix'"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

#
# 2. Build Check
#
echo -e "${BLUE}🔨 Checking build...${NC}"
if bun --filter "$PACKAGE_NAME" run build 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Build succeeded"

  # Verify types path matches build output
  if [ -f "$PACKAGE_DIR/package.json" ]; then
    TYPES_PATH=$(grep -o '"types":\s*"[^"]*"' "$PACKAGE_DIR/package.json" | sed 's/"types":\s*"\(.*\)"/\1/' || echo "")
    if [ -n "$TYPES_PATH" ] && [ ! -f "$PACKAGE_DIR/$TYPES_PATH" ]; then
      echo -e "${YELLOW}⚠${NC}  Types path in package.json ($TYPES_PATH) doesn't exist after build"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
  fi
else
  echo -e "${RED}✗${NC} Build failed"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

#
# 3. Orphaned Files Check
#
echo -e "${BLUE}🗑️  Checking for orphaned files...${NC}"
ORPHANED=$(find "$PACKAGE_DIR" -type f \( -name "*.fixed" -o -name "*.new" -o -name "*.bak" -o -name "*.orig" \) 2>/dev/null || true)
if [ -n "$ORPHANED" ]; then
  echo -e "${RED}✗${NC} Found orphaned files:"
  echo "$ORPHANED" | while read -r file; do
    echo "    - $file"
  done
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✓${NC} No orphaned files found"
fi
echo ""

#
# 4. Documentation Package Manager Check
#
echo -e "${BLUE}📖 Checking docs for npm/yarn/pnpm references...${NC}"
WRONG_PM=$(grep -rn "npm run\|npm install\|yarn \|yarn install\|pnpm " "$PACKAGE_DIR"/*.md "$PACKAGE_DIR"/docs/*.md 2>/dev/null || true)
if [ -n "$WRONG_PM" ]; then
  echo -e "${YELLOW}⚠${NC}  Found non-bun package manager references:"
  echo "$WRONG_PM" | head -10
  if [ "$(echo "$WRONG_PM" | wc -l)" -gt 10 ]; then
    echo "    ... and more"
  fi
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✓${NC} Documentation uses correct package manager (bun)"
fi
echo ""

#
# 5. CSS @import Ordering Check
#
echo -e "${BLUE}🎨 Checking CSS @import ordering...${NC}"
CSS_ISSUES=0
while IFS= read -r -d '' file; do
  if grep -q "@import" "$file" 2>/dev/null; then
    # Check if any non-comment, non-import content appears before imports
    # Get line number of first @import
    FIRST_IMPORT=$(grep -n "@import" "$file" | head -1 | cut -d: -f1)
    # Get first non-comment, non-empty line (heuristic - may have false positives)
    FIRST_CONTENT=$(grep -n "^[^/*@]" "$file" | grep -v "^\s*$" | head -1 | cut -d: -f1 || echo "999999")

    if [ -n "$FIRST_CONTENT" ] && [ "$FIRST_CONTENT" -lt "$FIRST_IMPORT" ] 2>/dev/null; then
      echo -e "${YELLOW}⚠${NC}  CSS @import not at top: $file"
      CSS_ISSUES=1
    fi
  fi
done < <(find "$PACKAGE_DIR" \( -name "*.css" -o -name "*.scss" \) -print0 2>/dev/null)
if [ $CSS_ISSUES -eq 0 ]; then
  echo -e "${GREEN}✓${NC} CSS @import ordering correct"
else
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

#
# 6. SSR Safety Check (for Vue/React packages)
#
echo -e "${BLUE}🌐 Checking for SSR safety issues...${NC}"
SSR_ISSUES=$(grep -rn "document\.\|window\." "$PACKAGE_DIR/src" --include="*.ts" --include="*.vue" --include="*.tsx" 2>/dev/null | grep -v "typeof document\|typeof window" || true)
if [ -n "$SSR_ISSUES" ]; then
  echo -e "${YELLOW}⚠${NC}  Found potential SSR safety issues (document/window access without guards):"
  echo "$SSR_ISSUES" | head -5
  if [ "$(echo "$SSR_ISSUES" | wc -l)" -gt 5 ]; then
    echo "    ... and more ($(echo "$SSR_ISSUES" | wc -l) total)"
  fi
  echo -e "${YELLOW}   Consider adding: if (typeof document === 'undefined') return;${NC}"
  # Note: This is a warning, not an error - some document access is intentional
else
  echo -e "${GREEN}✓${NC} No obvious SSR safety issues"
fi
echo ""

#
# Summary
#
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ Migration checklist passed! No issues found.${NC}"
else
  echo -e "${YELLOW}⚠️  Found $ISSUES_FOUND issue(s) to address${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

exit $ISSUES_FOUND
