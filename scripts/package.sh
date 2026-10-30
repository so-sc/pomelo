#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -euo pipefail

# ==============================================================================
# Configuration & Globals
# ==============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEFAULT_OUTPUT_FILE="build.tar.gz"
OUTPUT_FILE="${1:-$DEFAULT_OUTPUT_FILE}"

# ==============================================================================
# Terminal Colors & Logging
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC}    $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $1" >&2; }
fatal()       { log_error "$1"; exit 1; }

log_step() {
  echo ""
  echo -e "${BOLD}${CYAN}──── $1 ────${NC}"
}

# ==============================================================================
# Help Message
# ==============================================================================
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  echo -e "${BOLD}${CYAN}Pomelo Packaging CLI${NC}"
  echo ""
  echo "Builds the entire project and creates a minimal production tarball"
  echo "containing only pre-built artifacts and Docker files."
  echo ""
  echo -e "${BOLD}No pnpm/npm install required to deploy from the archive.${NC}"
  echo ""
  echo -e "Usage: ${DIM}$(basename "$0") [OUTPUT_FILE]${NC}"
  echo "  OUTPUT_FILE   Destination path for the tarball (default: $DEFAULT_OUTPUT_FILE)"
  echo ""
  echo -e "${DIM}Archive contents:${NC}"
  echo "  admin/bin/         Compiled pomelo & pomelod binaries"
  echo "  admin/dist/        Admin UI (Vite build)"
  echo "  server/dist/       Fully-bundled server (single JS file)"
  echo "  client/.next/      Next.js standalone build"
  echo "  client/public/     Client static assets"
  echo "  docker/            Docker Compose files"
  echo "  config/            Caddy & Citron configs"
  echo "  server/Dockerfile  Production Dockerfiles"
  echo "  client/Dockerfile"
  echo ""
  exit 0
fi

# ==============================================================================
# Prerequisite Checks
# ==============================================================================
log_step "Checking prerequisites"

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    fatal "$1 is not installed. Please install $1 first."
  fi
  local version
  version=$("$1" --version 2>/dev/null | head -1 || echo "unknown")
  log_info "Found $1: ${DIM}$version${NC}"
}

check_cmd pnpm
check_cmd node
check_cmd bun
check_cmd git
check_cmd tar

# ==============================================================================
# Main Execution
# ==============================================================================
cd "$PROJECT_ROOT"

# --- 1. Install dependencies (needed for build tools) ---
log_step "Installing dependencies"
pnpm install || fatal "Failed to install dependencies."
log_success "Dependencies installed."

# --- 2. Build the entire workspace ---
log_step "Building all workspaces"
pnpm run build || fatal "Build failed."
log_success "All workspaces built."

# --- 3. Verify build artifacts exist ---
log_step "Verifying build artifacts"

verify_file() {
  if [[ -f "$1" ]]; then
    local size
    size=$(du -sh "$1" 2>/dev/null | cut -f1)
    log_info "  ✓ $1 ${DIM}($size)${NC}"
  else
    fatal "Expected build artifact not found: $1"
  fi
}

verify_dir() {
  if [[ -d "$1" ]]; then
    local count size
    count=$(find "$1" -type f | wc -l)
    size=$(du -sh "$1" 2>/dev/null | cut -f1)
    log_info "  ✓ $1 ${DIM}($count files, $size)${NC}"
  else
    fatal "Expected build directory not found: $1"
  fi
}

verify_file "admin/bin/pomelo"
verify_file "admin/bin/pomelod"
verify_dir  "admin/dist"
verify_file "server/dist/index.js"
verify_dir  "client/.next/standalone"
verify_dir  "client/.next/static"
verify_dir  "client/public"

log_success "All build artifacts verified."

# --- 4. Stage the minimal archive ---
log_step "Staging production files"
PKG_DIR=$(mktemp -d)
trap 'rm -rf "$PKG_DIR"' EXIT

# --- Admin: compiled binaries + UI ---
mkdir -p "$PKG_DIR/admin/bin"
cp admin/bin/pomelo   "$PKG_DIR/admin/bin/"
cp admin/bin/pomelod  "$PKG_DIR/admin/bin/"
cp -r admin/dist      "$PKG_DIR/admin/dist"

# --- Server: fully-bundled single JS file + Dockerfile ---
mkdir -p "$PKG_DIR/server/dist"
cp server/dist/index.js  "$PKG_DIR/server/dist/"
cp server/Dockerfile     "$PKG_DIR/server/"

# --- Client: Next.js standalone + Dockerfile ---
mkdir -p "$PKG_DIR/client/.next"
cp -r client/.next/standalone  "$PKG_DIR/client/.next/standalone"
cp -r client/.next/static      "$PKG_DIR/client/.next/static"
cp -r client/public             "$PKG_DIR/client/public"
cp client/Dockerfile            "$PKG_DIR/client/"
# Next.js standalone copies local .env files; remove them to prevent dev leaks
rm -f "$PKG_DIR/client/.next/standalone/.env"*
rm -f "$PKG_DIR/client/.next/standalone/client/.env"*

# --- Docker Compose files ---
mkdir -p "$PKG_DIR/docker/app"
mkdir -p "$PKG_DIR/docker/citron"
cp docker/app/docker-compose.yaml    "$PKG_DIR/docker/app/"
cp docker/citron/docker-compose.yaml "$PKG_DIR/docker/citron/"

# --- Config defaults ---
mkdir -p "$PKG_DIR/config/caddy"
mkdir -p "$PKG_DIR/config/citron"
cp config/caddy/Caddyfile      "$PKG_DIR/config/caddy/"
cp config/citron/citron.conf     "$PKG_DIR/config/citron/"
cp config/citron/languages.toml  "$PKG_DIR/config/citron/"

# --- Root-level files ---
cp .dockerignore  "$PKG_DIR/"

log_success "Files staged."

# --- 5. Generate build manifest ---
log_step "Generating build manifest"
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
COMMIT_MSG=$(git log -1 --pretty=%s 2>/dev/null || echo "")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

cat <<EOF > "$PKG_DIR/manifest.json"
{
  "name": "pomelo",
  "version": "$VERSION",
  "buildDate": "$BUILD_DATE",
  "commitHash": "$COMMIT_HASH",
  "branch": "$BRANCH",
  "description": "Pomelo Production Deployment Archive"
}
EOF
log_info "Version: $VERSION | Commit: $COMMIT_HASH ($BRANCH)"

# --- 6. Print archive contents summary ---
log_step "Archive contents"
echo ""
(cd "$PKG_DIR" && find . -type f | sort | while read -r f; do
  size=$(du -sh "$f" 2>/dev/null | cut -f1)
  printf "  %-55s %s\n" "$f" "$size"
done)
echo ""

FILE_COUNT=$(find "$PKG_DIR" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$PKG_DIR" 2>/dev/null | cut -f1)
log_info "Total: $FILE_COUNT files, $TOTAL_SIZE uncompressed"

# --- 7. Sanity checks — ensure no dev/package artifacts leaked ---
log_step "Running sanity checks"
LEAKED=0

check_no_files() {
  local pattern="$1"
  local label="$2"
  local found
  # Exclude client/.next/standalone — Next.js bundles its own minimal runtime deps there
  found=$(find "$PKG_DIR" -name "$pattern" -not -path "*/client/.next/standalone/*" 2>/dev/null | head -5)
  if [[ -n "$found" ]]; then
    log_error "LEAKED $label:"
    echo "$found" | while read -r f; do log_error "  $f"; done
    LEAKED=1
  else
    log_info "  ✓ No $label found"
  fi
}

check_no_dirs() {
  local name="$1"
  local label="$2"
  local found
  # Exclude client/.next/standalone — Next.js bundles its own minimal runtime deps there
  found=$(find "$PKG_DIR" -type d -name "$name" -not -path "*/client/.next/standalone/*" 2>/dev/null | head -5)
  if [[ -n "$found" ]]; then
    log_error "LEAKED $label:"
    echo "$found" | while read -r f; do log_error "  $f"; done
    LEAKED=1
  else
    log_info "  ✓ No $label found"
  fi
}

check_no_files "package.json"    "package.json files"
check_no_files "package-lock.*"  "package-lock files"
check_no_files "pnpm-lock.yaml"  "pnpm-lock files"
check_no_files "tsconfig.json"   "tsconfig files"
check_no_files "*.ts"            "TypeScript source files"
check_no_files "*.tsx"           "TSX source files"
check_no_files "turbo.json"      "turbo config"
check_no_files ".npmrc"          "npmrc files"
check_no_dirs  "node_modules"    "node_modules directories"
check_no_dirs  "src"             "src directories"
check_no_dirs  ".turbo"          ".turbo directories"

if [[ "$LEAKED" -ne 0 ]]; then
  fatal "Sanity check failed — dev/package artifacts found in archive. Aborting."
fi
log_success "All sanity checks passed."

# --- 8. Create the tarball ---
log_step "Creating archive"
tar -czf "$OUTPUT_FILE" -C "$PKG_DIR" . || fatal "Failed to create tar archive."

# Resolve the output path for the final message
if [[ "$OUTPUT_FILE" = /* ]]; then
  ABS_OUTPUT="$OUTPUT_FILE"
else
  ABS_OUTPUT="$PWD/$OUTPUT_FILE"
fi

ARCHIVE_SIZE=$(du -sh "$ABS_OUTPUT" 2>/dev/null | cut -f1)

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  Packaging complete!                                     ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Archive:${NC}  $ABS_OUTPUT"
echo -e "  ${BOLD}Size:${NC}     $ARCHIVE_SIZE"
echo -e "  ${BOLD}Version:${NC}  $VERSION"
echo -e "  ${BOLD}Commit:${NC}   $COMMIT_HASH"
echo ""
echo -e "  ${DIM}Deploy with:${NC}"
echo -e "  ${CYAN}sudo ./scripts/install.sh --archive $OUTPUT_FILE${NC}"
echo ""
