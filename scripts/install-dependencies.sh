#!/bin/bash
# Install dependencies for Rollercoaster.dev monorepo
# Runs on SessionStart in Claude Code (both local and web)

set -e  # Exit on error

# Color output for better readability
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  YELLOW='\033[1;33m'
  NC='\033[0m' # No Color
else
  GREEN=''
  BLUE=''
  YELLOW=''
  NC=''
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎢 Rollercoaster.dev Monorepo - Dependency Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detect environment
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  echo -e "${YELLOW}📡 Running in Claude Code Web environment${NC}"
  ENV_TYPE="web"
else
  echo -e "${YELLOW}💻 Running in local environment${NC}"
  ENV_TYPE="local"
fi

# Navigate to project root
if [ -n "$CLAUDE_PROJECT_DIR" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  echo -e "${GREEN}✓${NC} Changed to project directory: $CLAUDE_PROJECT_DIR"
else
  # Fallback to script location
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
  cd "$SCRIPT_DIR/.."
  echo -e "${GREEN}✓${NC} Changed to project directory: $(pwd)"
fi

echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}⚠${NC}  pnpm not found. Installing pnpm..."

  if [ "$ENV_TYPE" = "web" ]; then
    # In web environment, use npm to install pnpm globally
    npm install -g pnpm@10.20.0
  else
    # Local environment - suggest manual installation
    echo -e "${YELLOW}⚠${NC}  Please install pnpm manually:"
    echo "   npm install -g pnpm@10.20.0"
    echo "   or visit: https://pnpm.io/installation"
    exit 1
  fi
else
  PNPM_VERSION=$(pnpm --version)
  echo -e "${GREEN}✓${NC} pnpm detected (version: $PNPM_VERSION)"
fi

echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
  echo -e "${BLUE}📦 node_modules found - running pnpm install to update...${NC}"
else
  echo -e "${BLUE}📦 node_modules not found - running fresh install...${NC}"
fi

echo ""

# Run pnpm install
echo -e "${BLUE}Installing dependencies with pnpm...${NC}"
pnpm install

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Dependency installation complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Set environment variables for the session (only in SessionStart hooks)
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo -e "${BLUE}Setting up environment variables...${NC}"

  # Load .env if it exists (for local development)
  if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Loading environment variables from .env file"
    # Export variables from .env to CLAUDE_ENV_FILE
    while IFS='=' read -r key value; do
      # Skip comments and empty lines
      [[ $key =~ ^#.*$ ]] && continue
      [[ -z $key ]] && continue

      # Remove quotes from value if present
      value="${value%\"}"
      value="${value#\"}"

      echo "export $key='$value'" >> "$CLAUDE_ENV_FILE"
    done < .env
  else
    echo -e "${YELLOW}ℹ${NC}  No .env file found - using defaults"
    echo -e "${YELLOW}ℹ${NC}  For Claude Code Web: Configure env vars in the Web UI"
  fi

  # Set common development variables
  echo "export NODE_ENV=${NODE_ENV:-development}" >> "$CLAUDE_ENV_FILE"
  echo "export LOG_LEVEL=${LOG_LEVEL:-info}" >> "$CLAUDE_ENV_FILE"

  echo -e "${GREEN}✓${NC} Environment variables configured"
  echo ""
fi

echo -e "${BLUE}You can now start development with:${NC}"
echo "  pnpm dev      # Start all apps"
echo "  pnpm build    # Build all packages"
echo "  pnpm test     # Run all tests"
echo ""
