#!/bin/bash
# Generate RSA key pair for JWT testing
# Usage: ./scripts/generate-test-keys.sh [output_directory]
#
# Creates platform-private.pem and platform-public.pem for JWTService testing.
# Keys are idempotent - existing keys are preserved.

set -e

OUTPUT_DIR="${1:-apps/openbadges-system/keys}"

# Color output (only if terminal supports it)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  GREEN=''
  BLUE=''
  NC=''
fi

echo -e "${BLUE}Generating test RSA keys in ${OUTPUT_DIR}${NC}"

# Create directory
mkdir -p "$OUTPUT_DIR"

# Check if keys already exist
if [ -f "$OUTPUT_DIR/platform-private.pem" ] && [ -f "$OUTPUT_DIR/platform-public.pem" ]; then
  echo -e "${GREEN}Keys already exist, skipping generation${NC}"
  exit 0
fi

# Generate 2048-bit RSA private key
openssl genrsa -out "$OUTPUT_DIR/platform-private.pem" 2048 2>/dev/null

# Extract public key
openssl rsa -in "$OUTPUT_DIR/platform-private.pem" -pubout -out "$OUTPUT_DIR/platform-public.pem" 2>/dev/null

# Set restrictive permissions on private key
chmod 600 "$OUTPUT_DIR/platform-private.pem"
chmod 644 "$OUTPUT_DIR/platform-public.pem"

echo -e "${GREEN}Test keys generated successfully:${NC}"
echo "  - $OUTPUT_DIR/platform-private.pem"
echo "  - $OUTPUT_DIR/platform-public.pem"
