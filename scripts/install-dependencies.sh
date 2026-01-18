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
  # Local environment - skip dependency setup (already installed)
  echo -e "${GREEN}✓${NC} Local environment detected - skipping dependency setup"
  echo -e "${YELLOW}ℹ${NC}  Run 'bun install && bun run build' manually if needed"
  exit 0
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

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
  echo -e "${YELLOW}⚠${NC}  Bun not found. Installing Bun..."

  if [ "$ENV_TYPE" = "web" ]; then
    # In web environment, install Bun
    curl -fsSL https://bun.sh/install | bash

    # Add Bun to PATH for current session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
  else
    # Local environment - suggest manual installation
    echo -e "${YELLOW}⚠${NC}  Please install Bun manually:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    echo "   or visit: https://bun.sh"
    exit 1
  fi
else
  BUN_VERSION=$(bun --version)
  echo -e "${GREEN}✓${NC} Bun detected (version: $BUN_VERSION)"

  # Note: Version requirements are enforced by package.json "engines" field
  # Bun will check compatibility automatically during install
fi

echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
  echo -e "${YELLOW}⚠${NC}  GitHub CLI (gh) not found. Installing..."

  if [ "$ENV_TYPE" = "web" ]; then
    # In web environment, install gh binary directly (no root required)
    GH_VERSION_TAG="v2.63.2"
    GH_ARCHIVE="gh_${GH_VERSION_TAG#v}_linux_amd64.tar.gz"
    GH_URL="https://github.com/cli/cli/releases/download/${GH_VERSION_TAG}/${GH_ARCHIVE}"
    GH_INSTALL_DIR="$HOME/.local"

    mkdir -p "$GH_INSTALL_DIR/bin"

    echo -e "${BLUE}Downloading GitHub CLI ${GH_VERSION_TAG}...${NC}"
    if curl -fsSL "$GH_URL" -o "/tmp/${GH_ARCHIVE}" 2>/dev/null; then
      tar -xzf "/tmp/${GH_ARCHIVE}" -C /tmp
      cp "/tmp/gh_${GH_VERSION_TAG#v}_linux_amd64/bin/gh" "$GH_INSTALL_DIR/bin/"
      chmod +x "$GH_INSTALL_DIR/bin/gh"
      rm -rf "/tmp/${GH_ARCHIVE}" "/tmp/gh_${GH_VERSION_TAG#v}_linux_amd64"

      # Add to PATH for current session
      export PATH="$GH_INSTALL_DIR/bin:$PATH"

      if command -v gh &> /dev/null; then
        GH_VERSION=$(gh --version | head -n 1)
        echo -e "${GREEN}✓${NC} GitHub CLI installed ($GH_VERSION)"
      else
        echo -e "${YELLOW}⚠${NC}  GitHub CLI installation failed"
        echo -e "${YELLOW}ℹ${NC}  Alternative: Use GitHub API via curl with GH_TOKEN"
      fi
    else
      echo -e "${YELLOW}⚠${NC}  GitHub CLI download blocked (binary downloads restricted)"
      echo -e "${YELLOW}ℹ${NC}  Alternative: Use ./scripts/github-api.sh with GH_TOKEN"
      echo "     ./scripts/github-api.sh help    # Show available commands"
    fi
  else
    # Local environment - suggest manual installation
    echo -e "${YELLOW}ℹ${NC}  Please install GitHub CLI manually:"
    echo "   brew install gh    # macOS"
    echo "   or visit: https://cli.github.com"
  fi
else
  GH_VERSION=$(gh --version | head -n 1)
  echo -e "${GREEN}✓${NC} GitHub CLI detected ($GH_VERSION)"
fi

# Ensure common binary paths are in PATH for current session
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"

echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
  echo -e "${BLUE}📦 node_modules found - running bun install to update...${NC}"
else
  echo -e "${BLUE}📦 node_modules not found - running fresh install...${NC}"
fi

echo ""

# Run bun install
echo -e "${BLUE}Installing dependencies with Bun...${NC}"
bun install

echo ""

# Build workspace packages (required for tests to work)
# CI does this before running tests, so we need to do it here too
echo -e "${BLUE}Building workspace packages...${NC}"
if bun run build 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Workspace packages built successfully"
else
  echo -e "${YELLOW}⚠${NC}  Build had warnings (packages may still work)"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Setup complete! Packages installed and built.${NC}"
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
  echo "export BUN_ENV=${BUN_ENV:-development}" >> "$CLAUDE_ENV_FILE"

  # Ensure common binary paths are in PATH
  # - ~/.local/bin: user-installed binaries (gh in web environment)
  # - /opt/homebrew/bin: Homebrew on Apple Silicon
  # - /usr/local/bin: Homebrew on Intel Mac / common Unix location
  echo "export PATH=\"/opt/homebrew/bin:/usr/local/bin:\$HOME/.local/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"

  # GitHub CLI authentication via GH_TOKEN
  if [ -n "$GH_TOKEN" ]; then
    echo "export GH_TOKEN='$GH_TOKEN'" >> "$CLAUDE_ENV_FILE"
    echo -e "${GREEN}✓${NC} GitHub CLI authentication configured via GH_TOKEN"
  else
    echo -e "${YELLOW}ℹ${NC}  GH_TOKEN not set - configure in Web UI for GitHub issue/PR access"
  fi

  echo -e "${GREEN}✓${NC} Environment variables configured"
  echo ""
fi

echo -e "${BLUE}You can now start development with:${NC}"
echo "  bun dev       # Start all apps"
echo "  bun build     # Build all packages"
echo "  bun test      # Run all tests"
echo ""
