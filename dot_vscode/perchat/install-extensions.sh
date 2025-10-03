#!/usr/bin/env bash
set -euo pipefail

# Usage: ./install-extensions.sh [extensions.txt] [vsix-map.json]
EXT_LIST_FILE="${1:-extensions-normalized.txt}"
VSIX_MAP_FILE="${2:-vsix-map.json}"
WORKDIR="$(pwd)"
DOWNLOAD_DIR="${WORKDIR}/.vsix-cache"
mkdir -p "$DOWNLOAD_DIR"

have_cmd() { command -v "$1" >/dev/null 2>&1; }

for c in jq curl; do
  if ! have_cmd "$c"; then
    echo "ERROR: Missing required command: $c" >&2
    exit 1
  fi
done

if ! have_cmd code-server; then
  echo "ERROR: code-server not found on PATH." >&2
  exit 1
fi

OVSX_CMD="npx -y ovsx"
if have_cmd ovsx; then
  OVSX_CMD="ovsx"
fi

# Read vsix map if present
VSIX_MAP="{}"
if [[ -f "$VSIX_MAP_FILE" ]]; then
  VSIX_MAP="$(cat "$VSIX_MAP_FILE")"
fi

trim() { sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }

EASY_INSTALLED=()
SPECIAL_NEEDED=()
FAILED=()

echo "==> Reading list from $EXT_LIST_FILE"
while IFS= read -r raw; do
  line="$(echo "$raw" | trim)"
  [[ -z "$line" || "$line" =~ ^# ]] && continue

  id="$line"
  echo "----"
  echo "Checking Open VSX for: $id"

  set +e
  OPENVSX_JSON="$($OVSX_CMD get "$id" --json 2>/dev/null)"
  OVSX_STATUS=$?
  set -e

  if [[ $OVSX_STATUS -eq 0 && -n "$OPENVSX_JSON" ]]; then
    echo "Installing from Open VSX: $id"
    code-server --install-extension "$id" || {
      echo "Install failed from Open VSX for $id"; FAILED+=("$id"); continue;
    }
    EASY_INSTALLED+=("$id")
    continue
  fi

  echo "Not found on Open VSX: $id"
  VSIX_URL="$(echo "$VSIX_MAP" | jq -r --arg id "$id" '.[$id] // empty')"
  if [[ -n "$VSIX_URL" ]]; then
    file="${DOWNLOAD_DIR}/$(basename "$VSIX_URL")"
    if [[ ! -f "$file" ]]; then
      echo "Downloading VSIX for $id from $VSIX_URL"
      curl -fsSL "$VSIX_URL" -o "$file" || {
        echo "Download failed for $id"; FAILED+=("$id"); continue;
      }
    fi
    echo "Installing VSIX: $file"
    code-server --install-extension "$file" || {
      echo "VSIX install failed for $id"; FAILED+=("$id"); continue;
    }
    EASY_INSTALLED+=("$id (vsix)")
  else
    echo "No VSIX mapping for $id. Marking as special-handling."
    SPECIAL_NEEDED+=("$id")
  fi
done < "$EXT_LIST_FILE"

echo
echo "================ Summary ================"
echo "✅ Installed from Open VSX / VSIX:"
printf ' - %s\n' "${EASY_INSTALLED[@]:-}"

echo
echo "⚠️  Special handling (no Open VSX / VSIX URL missing):"
printf ' - %s\n' "${SPECIAL_NEEDED[@]:-}"

echo
echo "❌ Failed installs:"
printf ' - %s\n' "${FAILED[@]:-}"

echo
echo "To re-run only the special-handling set, create a vsix-map.json with URLs for them."
