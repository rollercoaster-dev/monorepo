#!/bin/bash

# GitHub Project Setup Script - OpenBadges System
# This script sets up the GitHub Project for OpenBadges development workflow

set -e

echo "🚀 Setting up GitHub Project for OpenBadges System Development..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first.${NC}"
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI. Please run 'gh auth login' first.${NC}"
    exit 1
fi

# Check for required scopes
echo -e "${BLUE}🔍 Checking GitHub CLI permissions...${NC}"
if ! gh auth status 2>&1 | grep -q "project"; then
    echo -e "${YELLOW}⚠️  Missing project permissions. Refreshing authentication...${NC}"
    echo "Please authorize the additional permissions when prompted."
    gh auth refresh -s project,read:project,write:project
fi

# Variables
ORG="rollercoaster-dev"
REPO="openbadges-system"
PROJECT_TITLE="OpenBadges System Development"
PROJECT_DESCRIPTION="Main project board for tracking OpenBadges digital credential system development progress"

echo -e "${BLUE}📋 Creating GitHub Project...${NC}"

# Create the project
PROJECT_URL=$(gh project create \
    --title "$PROJECT_TITLE" \
    --owner "$ORG" \
    --format json | jq -r '.url')

if [ -z "$PROJECT_URL" ] || [ "$PROJECT_URL" = "null" ]; then
    echo -e "${RED}❌ Failed to create project. Please check permissions and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project created: $PROJECT_URL${NC}"

# Extract project number from URL
PROJECT_NUMBER=$(echo "$PROJECT_URL" | grep -o '[0-9]*$')

echo -e "${BLUE}🔧 Configuring project fields and views...${NC}"

echo -e "${YELLOW}📝 Manual setup required for advanced features:${NC}"
echo ""
echo "Please complete the following setup manually in the GitHub web interface:"
echo "1. Go to: $PROJECT_URL"
echo "2. Add custom fields:"
echo "   - Task ID (Text)"
echo "   - Component (Single select: Authentication, Badge Management, Verification, User Management, API, Frontend, Compliance, Security, Documentation)"
echo "   - Priority (Single select: Critical, High, Medium, Low)"
echo "   - OpenBadges Version (Single select: 2.x, 3.0, Both, N/A)"
echo "   - Story Points (Number)"
echo "   - Sprint End (Date)"
echo "   - Security Review Required (Checkbox)"
echo "   - Compliance Review Required (Checkbox)"
echo ""
echo "3. Configure board columns:"
echo "   - 📋 Backlog"
echo "   - 🔍 Compliance Review"
echo "   - 🎯 Sprint Ready"
echo "   - 🔄 In Progress"
echo "   - 🛡️ Security Review"
echo "   - 👀 Code Review"
echo "   - 🧪 Testing"
echo "   - ✅ Done"
echo ""
echo "4. Set up automation rules:"
echo "   - Auto-add new issues to Backlog"
echo "   - Move assigned issues to In Progress"
echo "   - Move issues with PRs to Code Review"
echo "   - Move security-labeled issues to Security Review"
echo "   - Move compliance-labeled issues to Compliance Review"
echo "   - Move merged PRs to Done"

# Link repository to project
echo -e "${BLUE}🔗 Linking repository to project...${NC}"

echo -e "${YELLOW}📝 Repository linking:${NC}"
echo "Please manually link the repository in project settings:"
echo "1. Go to project settings"
echo "2. Add repository: $ORG/$REPO"
echo "3. Enable auto-add for issues and pull requests"

# Create labels for the repository
echo -e "${BLUE}🏷️  Creating OpenBadges-specific repository labels...${NC}"

# Define OpenBadges-specific labels
declare -A LABELS=(
    # Task types
    ["task"]="0052CC"
    ["enhancement"]="0E8A16"
    ["bug"]="B60205"
    ["documentation"]="0075CA"
    
    # OpenBadges components
    ["component: authentication"]="1D76DB"
    ["component: badge-management"]="5319E7"
    ["component: verification"]="F9D0C4"
    ["component: user-management"]="C2E0C6"
    ["component: api"]="BFD4F2"
    ["component: frontend"]="D4C5F9"
    ["component: compliance"]="FBCA04"
    ["component: security"]="B60205"
    ["component: documentation"]="0075CA"
    
    # Priority levels (security-focused)
    ["priority: critical"]="B60205"
    ["priority: high"]="D93F0B"
    ["priority: medium"]="FBCA04"
    ["priority: low"]="0E8A16"
    
    # Status labels
    ["status: todo"]="D4C5F9"
    ["status: in-progress"]="FBCA04"
    ["status: blocked"]="B60205"
    ["status: done"]="0E8A16"
    
    # OpenBadges-specific labels
    ["openbadges-compliance"]="FFD700"
    ["openbadges-2x"]="87CEEB"
    ["openbadges-3"]="98FB98"
    ["security-review"]="FF6347"
    ["compliance-review"]="DDA0DD"
    
    # Review types
    ["needs-security-review"]="FF4500"
    ["needs-compliance-review"]="9370DB"
    ["cryptographic"]="DC143C"
    ["specification"]="4169E1"
)

for label in "${!LABELS[@]}"; do
    color="${LABELS[$label]}"
    if gh label create "$label" --color "$color" --repo "$ORG/$REPO" 2>/dev/null; then
        echo -e "${GREEN}✅ Created label: $label${NC}"
    else
        echo -e "${YELLOW}⚠️  Label already exists or failed to create: $label${NC}"
    fi
done

# Add existing issues to the project
echo -e "${BLUE}📋 Adding existing issues to project...${NC}"

# Get all open issues
ISSUES=$(gh issue list --repo "$ORG/$REPO" --state open --json number --jq '.[].number')

for issue_number in $ISSUES; do
    echo -e "${YELLOW}📝 Please manually add issue #$issue_number to the project${NC}"
done

# Create milestones for OpenBadges development
echo -e "${BLUE}🎯 Creating OpenBadges development milestones...${NC}"

# Sprint 1 - Foundation
if ! gh api "repos/$ORG/$REPO/milestones" --jq '.[].title' | grep -q "Sprint 1 - OpenBadges Foundation"; then
    echo -e "${BLUE}📅 Creating Sprint 1 milestone...${NC}"
    gh api "repos/$ORG/$REPO/milestones" -X POST \
        -f title="Sprint 1 - OpenBadges Foundation" \
        -f description="Core OpenBadges foundation including authentication, basic badge management, and specification compliance setup" \
        -f due_on="2025-02-15T00:00:00Z" > /dev/null
    echo -e "${GREEN}✅ Sprint 1 milestone created${NC}"
else
    echo -e "${GREEN}✅ Sprint 1 milestone already exists${NC}"
fi

# Sprint 2 - Verification Engine
if ! gh api "repos/$ORG/$REPO/milestones" --jq '.[].title' | grep -q "Sprint 2 - Verification Engine"; then
    echo -e "${BLUE}📅 Creating Sprint 2 milestone...${NC}"
    gh api "repos/$ORG/$REPO/milestones" -X POST \
        -f title="Sprint 2 - Verification Engine" \
        -f description="Cryptographic verification engine, badge validation, and security implementation" \
        -f due_on="2025-03-15T00:00:00Z" > /dev/null
    echo -e "${GREEN}✅ Sprint 2 milestone created${NC}"
else
    echo -e "${GREEN}✅ Sprint 2 milestone already exists${NC}"
fi

# Sprint 3 - API & Integration
if ! gh api "repos/$ORG/$REPO/milestones" --jq '.[].title' | grep -q "Sprint 3 - API & Integration"; then
    echo -e "${BLUE}📅 Creating Sprint 3 milestone...${NC}"
    gh api "repos/$ORG/$REPO/milestones" -X POST \
        -f title="Sprint 3 - API & Integration" \
        -f description="OpenBadges-compliant API endpoints, Badge Connect integration, and external provider support" \
        -f due_on="2025-04-15T00:00:00Z" > /dev/null
    echo -e "${GREEN}✅ Sprint 3 milestone created${NC}"
else
    echo -e "${GREEN}✅ Sprint 3 milestone already exists${NC}"
fi

echo ""
echo -e "${GREEN}🎉 GitHub Project setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "- Project URL: $PROJECT_URL"
echo "- Repository: https://github.com/$ORG/$REPO"
echo "- Issues created: $(gh issue list --repo "$ORG/$REPO" --state open | wc -l)"
echo "- Labels created: ${#LABELS[@]}"
echo "- Milestones created: 3"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Complete manual project configuration (see instructions above)"
echo "2. Review and organize issues in the project board"
echo "3. Start OpenBadges development using the workflow integration"
echo "4. Monitor automation and adjust as needed"
echo "5. Set up security and compliance review processes"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "- Workflow guide: docs/development/workflow-integration-guide.md"
echo "- GitHub workflow: docs/development/github-workflow.md"
echo "- Task management: docs/development/task-management-guide.md"
echo "- OpenBadges architecture: docs/augment-rules/agent-requested/openbadges-architecture.md"
echo "- Security compliance: docs/augment-rules/agent-requested/security-compliance.md"
echo ""
echo -e "${GREEN}✨ Happy OpenBadges development!${NC}"
