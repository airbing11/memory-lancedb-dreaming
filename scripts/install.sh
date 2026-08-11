#!/usr/bin/env bash
# Install memory-lancedb-dreaming from tarball into ~/.openclaw/plugins/
set -euo pipefail

PLUGIN_ID="memory-lancedb-dreaming"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
INSTALL_DIR="${OPENCLAW_PLUGINS_DIR:-$OPENCLAW_HOME/plugins}/$PLUGIN_ID"
TGZ="${1:-memory-lancedb-dreaming-0.3.17.tgz}"

if [[ ! -f "$TGZ" ]]; then
  echo "error: tarball not found: $TGZ" >&2
  echo "usage: $0 [path/to/memory-lancedb-dreaming-0.3.17.tgz]" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "==> extracting $TGZ"
tar -xzf "$TGZ" -C "$TMP_DIR"

SRC="$TMP_DIR/package"
if [[ ! -d "$SRC" ]]; then
  SRC="$TMP_DIR"
fi

echo "==> installing to $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -r "$SRC"/. "$INSTALL_DIR"/

echo "==> npm install (production)"
(cd "$INSTALL_DIR" && npm install --omit=dev)

echo ""
echo "Done. Next steps:"
echo "1. Add to openclaw.json plugins.load.paths:"
echo "   \"$INSTALL_DIR\""
echo "2. Configure plugins.entries.$PLUGIN_ID with:"
echo "   hooks.allowConversationAccess: true"
echo "   subagent.allowModelOverride: true  (if rem.model is set)"
echo "3. Restart gateway: openclaw gateway stop && openclaw gateway run"
echo ""
echo "Do NOT install under ~/.openclaw/workspace/ — it breaks load.paths validation."
