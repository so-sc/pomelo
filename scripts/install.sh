#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Configuration
# ==============================================================================
APP_ROOT="${APP_ROOT:-/opt/pomelo}"
GITHUB_REPO="so-sc/pomelo"
GITHUB_API="https://api.github.com/repos/$GITHUB_REPO"
SERVICE_NAME="pomelod"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# ==============================================================================
# Terminal Colors & Logging
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}    $1"; }
log_success() { echo -e "${GREEN}[  OK  ]${NC}  $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $1" >&2; }
fatal()       { log_error "$1"; exit 1; }
log_step()    { echo ""; echo -e "${BOLD}${CYAN}──── $1 ────${NC}"; }

prompt() {
  echo -en "${BOLD}${MAGENTA}  ▸ ${NC}${1} "
}

# ==============================================================================
# Banner
# ==============================================================================
print_banner() {
  echo ""
  echo -e "${BOLD}${GREEN}  ╔═══════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${GREEN}  ║               ${NC}${BOLD}Pomelo Installer${GREEN}                ║${NC}"
  echo -e "${BOLD}${GREEN}  ╚═══════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${DIM}Self-hosted competitive programming platform${NC}"
  echo -e "  ${DIM}https://github.com/$GITHUB_REPO${NC}"
  echo ""
}

# ==============================================================================
# Help
# ==============================================================================
# ==============================================================================
# Argument Parsing
# ==============================================================================
ARCHIVE_FLAG=""
ACTION="install"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      print_banner
      echo -e "${BOLD}Usage:${NC}"
      echo "  sudo bash install.sh                          Install from GitHub"
      echo "  sudo bash install.sh --archive <path.tar.gz>  Install from local archive"
      echo "  sudo bash install.sh --uninstall              Remove Pomelo"
      echo ""
      echo -e "${BOLD}Options:${NC}"
      echo "  --archive <path>   Path to a pre-built tar.gz archive (skips download)"
      echo "  --uninstall        Remove Pomelo and clean up systemd service"
      echo ""
      echo -e "${BOLD}Environment Variables:${NC}"
      echo "  APP_ROOT           Installation root directory (default: /opt/pomelo)"
      echo ""
      exit 0
      ;;
    --archive)
      if [[ -z "${2:-}" ]]; then
        fatal "--archive requires a path argument."
      fi
      ARCHIVE_FLAG="$2"
      shift 2
      ;;
    --uninstall)
      ACTION="uninstall"
      shift
      ;;
    *)
      fatal "Unknown option: $1. Use --help for usage."
      ;;
  esac
done

# ==============================================================================
# Uninstall Mode
# ==============================================================================
if [[ "$ACTION" == "uninstall" ]]; then
  print_banner
  log_step "Uninstalling Pomelo"

  echo ""
  echo -e "  ${YELLOW}This will remove the Pomelo installation from this system.${NC}"
  echo -e "  ${DIM}Installation root: $APP_ROOT${NC}"
  echo ""
  prompt "Are you sure? [y/N]:"
  read -r confirm < /dev/tty
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "  Aborted."
    exit 0
  fi

  # Stop and remove systemd service
  if [[ -f "$SERVICE_FILE" ]]; then
    log_info "Stopping $SERVICE_NAME service..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
    systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload 2>/dev/null || true
    log_success "Systemd service removed."
  fi

  # Remove CLI symlink
  if [[ -L "/usr/local/bin/pomelo" ]]; then
    rm -f /usr/local/bin/pomelo
    log_success "CLI symlink removed."
  fi

  # Teardown Docker containers
  if command -v docker &>/dev/null && [[ -f "$APP_ROOT/app/docker/app/docker-compose.yaml" ]]; then
    log_info "Stopping Docker containers and removing ephemeral volumes..."
    POMELO_ROOT="$APP_ROOT" docker compose --project-name pomelo \
      -f "$APP_ROOT/app/docker/app/docker-compose.yaml" \
      -f "$APP_ROOT/app/docker/judge0/docker-compose.yaml" \
      down -v >/dev/null 2>&1 || true
    log_success "Docker containers and ephemeral volumes removed."
  fi

  # Remove app directory
  if [[ -d "$APP_ROOT/app" ]]; then
    rm -rf "$APP_ROOT/app"
    log_success "Application files removed."
  fi

  # Remove runtime directory
  if [[ -d "$APP_ROOT/runtime" ]]; then
    rm -rf "$APP_ROOT/runtime"
    log_success "Runtime files removed."
  fi

  echo ""
  prompt "Also remove data and config? (database, uploads, configs) [y/N]:"
  read -r remove_data < /dev/tty


  if [[ "$remove_data" == "y" || "$remove_data" == "Y" ]]; then
    rm -rf "$APP_ROOT/data" "$APP_ROOT/config"
    log_success "Data and config removed."
    # Remove empty root if nothing left
    rmdir "$APP_ROOT" 2>/dev/null || true
  else
    log_info "Data and config preserved at $APP_ROOT/"
  fi

  echo ""
  log_success "Pomelo has been uninstalled."
  echo ""
  exit 0
fi

# ==============================================================================
# Main Installation Flow
# ==============================================================================
print_banner

# --- 0. Existing Installation Check ---
if command -v pomelo &>/dev/null || [[ -d "$APP_ROOT/app" && -n "$(ls -A "$APP_ROOT/app" 2>/dev/null)" ]]; then
  log_warn "An existing installation of Pomelo was detected."
  prompt "Would you like to uninstall it before proceeding? [y/N]: "
  read -r do_uninstall < /dev/tty
  if [[ "$do_uninstall" == "y" || "$do_uninstall" == "Y" ]]; then
    log_info "Running uninstall process..."
    if command -v pomelo &>/dev/null; then
      pomelo uninstall
    else
      bash "$0" --uninstall
    fi
    
    # Check if it was successfully uninstalled
    hash -r 2>/dev/null || true
    if command -v pomelo &>/dev/null || [[ -d "$APP_ROOT/app" && -n "$(ls -A "$APP_ROOT/app" 2>/dev/null)" ]]; then
      fatal "Uninstall was aborted or failed. Cannot proceed with installation."
    fi
    
    # Wait for the daemon to fully stop and release ports
    log_info "Waiting for ports to be released..."
    sleep 2
  else
    log_info "Installation aborted by user."
    exit 0
  fi
fi

log_step "Checking prerequisites"

if [[ "$(uname -s)" != "Linux" ]]; then
  fatal "This installer only supports Linux."
fi

need_cmd() {
  if command -v "$1" &>/dev/null; then
    local ver
    ver=$("$1" --version 2>/dev/null | head -1 || true)
    log_success "$1 ${DIM}($ver)${NC}"
  else
    fatal "Missing required command: $1"
  fi
}

need_cmd curl
need_cmd tar
need_cmd docker

# Check systemd availability
if command -v systemctl &>/dev/null; then
  log_success "systemd ${DIM}(available)${NC}"
  HAS_SYSTEMD=true
else
  log_warn "systemd not found — daemon will not be persistent across reboots."
  HAS_SYSTEMD=false
fi

# --- 1.5. Port Collision Checks ---
log_step "Checking port availability"

# Returns 0 if port is in use, 1 if free
port_in_use() {
  local port=$1
  if command -v ss &>/dev/null; then
    ss -tuln | awk '{print $5}' | grep -E -q ":${port}$"
  elif command -v netstat &>/dev/null; then
    netstat -tuln | awk '{print $4}' | grep -E -q ":${port}$"
  else
    bash -c "timeout 1 echo >/dev/tcp/127.0.0.1/${port}" 2>/dev/null
  fi
}

# Prompt user to choose an alternative port when the default is taken.
# Sets the named variable (3rd arg) to the chosen port.
# All interactive output goes to stderr so callers can safely use the result.
resolve_port() {
  local default_port=$1
  local desc=$2
  local -n _result_ref=$3
  local chosen=$default_port

  if port_in_use "$default_port"; then
    log_warn "Port ${default_port} (${desc}) is already in use."
    while true; do
      prompt "Alternative port for ${desc} [default: ${default_port}]: "
      read -r alt_port < /dev/tty
      if [[ -z "$alt_port" ]]; then
        chosen=$default_port
        break
      fi
      if ! [[ "$alt_port" =~ ^[0-9]+$ ]] || [[ "$alt_port" -lt 1 ]] || [[ "$alt_port" -gt 65535 ]]; then
        log_error "Invalid port number. Enter a value between 1 and 65535."
        continue
      fi
      if port_in_use "$alt_port"; then
        log_error "Port $alt_port is also in use. Try another."
        continue
      fi
      chosen=$alt_port
      break
    done
    if [[ "$chosen" != "$default_port" ]]; then
      log_success "Using port ${chosen} for ${desc}."
    else
      log_warn "Keeping port ${default_port} (must free before start)"
    fi
  else
    log_success "Port ${default_port} (${desc}) is available."
  fi
  _result_ref=$chosen
}

resolve_port 80   "HTTP / Caddy"    CADDY_HTTP_PORT
echo ""
resolve_port 443  "HTTPS / Caddy"   CADDY_HTTPS_PORT
echo ""
resolve_port 8462 "Pomelo Admin UI" ADMIN_PORT
echo ""

# --- MongoDB port: non-blocking, auto-configure external mode if taken ---
MONGO_DB_MODE="internal"
MONGO_URI="mongodb://mongo:27017/pomelo"

if port_in_use 27017; then
  log_warn "Port 27017 (MongoDB) is already in use."
  log_warn "Pomelo will use ${BOLD}external${NC} database mode, connecting to the existing MongoDB at localhost:27017."
  MONGO_DB_MODE="external"
  MONGO_URI="mongodb://localhost:27017/pomelo"
else
  log_success "Port 27017 (MongoDB) is available."
fi

# --- 2. Permission Check ---
if [[ "$EUID" -ne 0 ]]; then
  if [[ ! -w "$(dirname "$APP_ROOT")" ]] && [[ ! -d "$APP_ROOT" || ! -w "$APP_ROOT" ]]; then
    fatal "No write access to $APP_ROOT. Re-run with: ${BOLD}sudo bash install.sh${NC}"
  fi
  if [[ "$HAS_SYSTEMD" == true ]]; then
    log_warn "Not running as root — systemd service will be skipped."
    HAS_SYSTEMD=false
  fi
fi

# --- 3. Resolve Archive ---
ARCHIVE_PATH=""

if [[ -n "$ARCHIVE_FLAG" ]]; then
  # --- Local archive via --archive flag ---
  log_step "Using local archive"

  # Expand ~ and resolve path
  ARCHIVE_FLAG="${ARCHIVE_FLAG/#\~/$HOME}"

  if [[ ! -f "$ARCHIVE_FLAG" ]]; then
    fatal "File not found: $ARCHIVE_FLAG"
  fi

  # Validate it's a gzip archive
  if ! file "$ARCHIVE_FLAG" 2>/dev/null | grep -qi 'gzip\|tar'; then
    fatal "Not a valid tar.gz archive: $ARCHIVE_FLAG"
  fi

  ARCHIVE_PATH="$ARCHIVE_FLAG"
  ARCHIVE_SIZE=$(du -sh "$ARCHIVE_PATH" 2>/dev/null | cut -f1)
  log_success "Archive: ${BOLD}$ARCHIVE_PATH${NC} ${DIM}($ARCHIVE_SIZE)${NC}"

else
  # --- GitHub Release (default) ---
  log_step "Fetching releases from GitHub"

  log_info "Querying ${DIM}$GITHUB_API/releases${NC} ..."
  releases_json=$(curl -sf "$GITHUB_API/releases" 2>/dev/null || echo "")

  if [[ -z "$releases_json" ]]; then
    fatal "Failed to fetch releases from GitHub. Check your network connection."
  fi

  # Parse tag names from the JSON response
  tags=$(echo "$releases_json" | grep -oP '"tag_name":\s*"\K[^"]+' || true)

  if [[ -z "$tags" ]]; then
    fatal "No releases found for $GITHUB_REPO."
  fi

  latest_tag=$(echo "$tags" | head -1)

  echo ""
  echo -e "  ${BOLD}Available versions:${NC}"
  echo ""
  local_index=1
  while IFS= read -r tag; do
    if [[ "$tag" == "$latest_tag" ]]; then
      echo -e "    ${GREEN}$local_index)${NC}  $tag  ${GREEN}${BOLD}← latest${NC}"
    else
      echo -e "    ${DIM}$local_index)${NC}  $tag"
    fi
    local_index=$((local_index + 1))
  done <<< "$(echo "$tags" | head -10)"

  remaining=$(echo "$tags" | wc -l)
  if [[ "$remaining" -gt 10 ]]; then
    echo -e "    ${DIM}... and $((remaining - 10)) more${NC}"
  fi

  echo ""
  prompt "Enter version to install (press Enter for ${GREEN}$latest_tag${NC}):"
  read -r selected_version < /dev/tty
  selected_version="${selected_version:-$latest_tag}"

  # Validate the selected version exists
  if ! echo "$tags" | grep -qx "$selected_version"; then
    fatal "Version '$selected_version' not found in releases."
  fi

  log_info "Selected version: ${BOLD}$selected_version${NC}"

  # Download the release asset
  DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/$selected_version/pomelo-$selected_version.tar.gz"

  log_step "Downloading release"
  log_info "URL: ${DIM}$DOWNLOAD_URL${NC}"

  TMP_DIR=$(mktemp -d)
  trap 'rm -rf "$TMP_DIR"' EXIT
  ARCHIVE_PATH="$TMP_DIR/pomelo-$selected_version.tar.gz"

  if ! curl -fL --progress-bar "$DOWNLOAD_URL" -o "$ARCHIVE_PATH" 2>&1; then
    fatal "Release asset 'pomelo-$selected_version.tar.gz' not found for version $selected_version."
  fi

  ARCHIVE_SIZE=$(du -sh "$ARCHIVE_PATH" 2>/dev/null | cut -f1)
  log_success "Downloaded ${BOLD}$selected_version${NC} ${DIM}($ARCHIVE_SIZE)${NC}"
fi

# --- 4. Create Directory Structure ---
log_step "Setting up directory structure"

mkdir -p \
  "$APP_ROOT/app" \
  "$APP_ROOT/config" \
  "$APP_ROOT/data/database" \
  "$APP_ROOT/data/uploads" \
  "$APP_ROOT/data/backups" \
  "$APP_ROOT/runtime/logs" \
  "$APP_ROOT/runtime/tmp"

log_success "Directories created at ${DIM}$APP_ROOT${NC}"

# --- 5. Extract Archive ---
log_step "Extracting archive"

# Clear previous installation app files (preserve data/config)
if [[ -d "$APP_ROOT/app" ]] && [[ "$(ls -A "$APP_ROOT/app" 2>/dev/null)" ]]; then
  log_info "Cleaning previous installation files..."
  rm -rf "$APP_ROOT/app"
  mkdir -p "$APP_ROOT/app"
fi

# Detect archive format — GitHub source archives have a top-level directory
# that needs --strip-components=1, while build.tar.gz archives do not.
# NOTE: We avoid `tar | head` here because pipefail + SIGPIPE = exit 141.
first_entry=$(tar -tzf "$ARCHIVE_PATH" 2>/dev/null | head -1 || true)

if [[ "$first_entry" == ./* ]] || [[ "$first_entry" == manifest.json ]] || [[ "$first_entry" == admin/* ]]; then
  # Direct archive (from package.sh) — no stripping needed
  tar -xzf "$ARCHIVE_PATH" -C "$APP_ROOT/app"
else
  # GitHub source archive — strip the top-level directory
  tar -xzf "$ARCHIVE_PATH" -C "$APP_ROOT/app" --strip-components=1
fi

log_success "Archive extracted to ${DIM}$APP_ROOT/app${NC}"

# Ensure permissions allow regular users to run the CLI
chmod a+rx "$APP_ROOT"
chmod -R a+rX "$APP_ROOT/app"

# Show manifest if present
if [[ -f "$APP_ROOT/app/manifest.json" ]]; then
  echo ""
  echo -e "  ${DIM}Build Manifest:${NC}"
  while IFS= read -r line; do
    echo -e "  ${DIM}  $line${NC}"
  done < "$APP_ROOT/app/manifest.json"
  echo ""
fi

# --- 6. Configure Binaries ---
log_step "Configuring binaries"

if [[ -f "$APP_ROOT/app/admin/bin/pomelo" ]]; then
  chmod +x "$APP_ROOT/app/admin/bin/pomelo"
  log_success "pomelo CLI marked executable"
else
  log_warn "pomelo CLI binary not found at admin/bin/pomelo"
fi

if [[ -f "$APP_ROOT/app/admin/bin/pomelod" ]]; then
  chmod +x "$APP_ROOT/app/admin/bin/pomelod"
  log_success "pomelod daemon marked executable"
else
  log_warn "pomelod daemon binary not found at admin/bin/pomelod"
fi

# --- 7. Symlink CLI ---
if [[ -f "$APP_ROOT/app/admin/bin/pomelo" ]]; then
  if [[ "$EUID" -eq 0 || -w /usr/local/bin ]]; then
    ln -sfn "$APP_ROOT/app/admin/bin/pomelo" /usr/local/bin/pomelo
    log_success "CLI linked to ${DIM}/usr/local/bin/pomelo${NC}"
  else
    log_warn "Skipping /usr/local/bin symlink (no write access). Add to PATH manually:"
    log_info "  export PATH=\"$APP_ROOT/app/admin/bin:\$PATH\""
  fi
fi

# --- 8. Systemd Service ---
log_step "Setting up daemon"

if [[ "$HAS_SYSTEMD" == true ]] && [[ -f "$APP_ROOT/app/admin/bin/pomelod" ]]; then
  log_info "Creating systemd service: ${DIM}$SERVICE_NAME${NC}"

  # Stop existing service if running
  if systemctl is-active "$SERVICE_NAME" &>/dev/null; then
    log_info "Stopping existing $SERVICE_NAME service..."
    systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  fi

  cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Pomelo Daemon
Documentation=https://github.com/$GITHUB_REPO
After=network-online.target docker.service
Wants=network-online.target docker.service

[Service]
Type=simple
ExecStart=$APP_ROOT/app/admin/bin/pomelod --foreground --root $APP_ROOT
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5
Environment=POMELO_ROOT=$APP_ROOT
Environment=NODE_ENV=production

NoNewPrivileges=false

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME" >/dev/null 2>&1
  systemctl start "$SERVICE_NAME"

  # Wait briefly and verify it started
  sleep 1
  if systemctl is-active "$SERVICE_NAME" &>/dev/null; then
    log_success "Service ${BOLD}$SERVICE_NAME${NC} is active and enabled on boot"
  else
    log_warn "Service may have failed to start. Check: ${DIM}systemctl status $SERVICE_NAME${NC}"
  fi

elif [[ -f "$APP_ROOT/app/admin/bin/pomelod" ]]; then
  # Fallback: start daemon directly (non-persistent)
  log_warn "systemd unavailable — starting daemon in background (non-persistent)."
  export POMELO_ROOT="$APP_ROOT"
  export NODE_ENV=production
  "$APP_ROOT/app/admin/bin/pomelod" --daemon --root "$APP_ROOT"

  sleep 1
  log_success "Daemon started ${DIM}(will not survive reboot)${NC}"
else
  log_warn "pomelod binary not found — skipping daemon setup."
fi

# --- 9. Setup Default Config ---
log_step "Initializing configuration"

if [[ ! -s "$APP_ROOT/config/app.env" ]]; then
  log_info "Generating secure environment variables..."

  gen_secret() {
    openssl rand -hex 32
  }

  AUTH_SECRET=$(gen_secret)
  POSTGRES_PASSWORD=$(gen_secret)
  REDIS_PASSWORD=$(gen_secret)

  cat > "$APP_ROOT/config/app.env" <<EOF
# --- SECRETS & URIS ---
AUTH_SECRET=${AUTH_SECRET}
MONGODB_URI=${MONGO_URI}
JUDGE0_URL=http://judge0-server:2358
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}
EOF

  log_success "Secure app.env generated at ${DIM}$APP_ROOT/config/app.env${NC}"
else
  log_info "Existing config preserved at ${DIM}$APP_ROOT/config/app.env${NC}"
fi

if [[ ! -s "$APP_ROOT/config/config.yaml" ]]; then
  cat > "$APP_ROOT/config/config.yaml" <<YAML_EOF
# Pomelo Platform Configuration
app:
  name: "Pomelo"
  theme: "dark"
  domain: "localhost"
  protocol: "http"

ports:
  admin: ${ADMIN_PORT}
  caddyHttp: ${CADDY_HTTP_PORT}
  caddyHttps: ${CADDY_HTTPS_PORT}

infrastructure:
  database:
    mode: "${MONGO_DB_MODE}"
  judge0:
    mode: "internal"
YAML_EOF
fi

# Copy default Caddyfile if not present
if [[ ! -f "$APP_ROOT/config/Caddyfile" ]] && [[ -f "$APP_ROOT/app/config/caddy/Caddyfile" ]]; then
  cp "$APP_ROOT/app/config/caddy/Caddyfile" "$APP_ROOT/config/Caddyfile"
  log_success "Default Caddyfile installed"
fi

# Copy default judge0.conf if not present
if [[ ! -f "$APP_ROOT/config/judge0.conf" ]] && [[ -f "$APP_ROOT/app/config/judge0/judge0.conf" ]]; then
  cp "$APP_ROOT/app/config/judge0/judge0.conf" "$APP_ROOT/config/judge0.conf"
  log_success "Default judge0.conf installed"
fi

# ==============================================================================
# Done
# ==============================================================================
echo ""
echo -e "${BOLD}${GREEN}  ╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}  ║          ${NC}${BOLD}Installation Complete! 🎉${GREEN}            ║${NC}"
echo -e "${BOLD}${GREEN}  ╚═══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Install root:${NC}   $APP_ROOT"
if [[ "$HAS_SYSTEMD" == true ]]; then
echo -e "  ${BOLD}Daemon:${NC}         systemd (${GREEN}persistent${NC})"
else
echo -e "  ${BOLD}Daemon:${NC}         background process (${YELLOW}non-persistent${NC})"
fi
echo -e "  ${BOLD}Admin UI:${NC}       ${CYAN}http://127.0.0.1:${ADMIN_PORT}${NC}"
echo -e "  ${BOLD}CLI:${NC}            ${DIM}pomelo --help${NC}"
echo ""
echo -e "  ${BOLD}Quick Start:${NC}"
echo -e "    ${CYAN}pomelo start${NC}        Start all services"
echo -e "    ${CYAN}pomelo status${NC}       Check service status"
echo -e "    ${CYAN}pomelo logs${NC}         View logs"
echo -e "    ${CYAN}pomelo ui${NC}           Open the admin panel"
echo ""
if [[ "$HAS_SYSTEMD" == true ]]; then
echo -e "  ${BOLD}Service Management:${NC}"
echo -e "    ${DIM}systemctl status $SERVICE_NAME${NC}    View daemon status"
echo -e "    ${DIM}systemctl restart $SERVICE_NAME${NC}   Restart daemon"
echo -e "    ${DIM}journalctl -u $SERVICE_NAME -f${NC}    Follow daemon logs"
echo ""
fi
echo -e "  ${BOLD}Uninstall:${NC}"
echo -e "    ${DIM}pomelo uninstall${NC}"
echo ""
