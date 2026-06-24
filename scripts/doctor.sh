#!/usr/bin/env bash
# Quick environment self-check for memory-lancedb-dreaming.
# For the full runtime check (hooks, LanceDB slot, cron, idle streak), call the
# `dreaming_doctor` tool from your agent after the gateway is running.
set -euo pipefail

PLUGIN_ID="memory-lancedb-dreaming"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
INSTALL_DIR="${OPENCLAW_PLUGINS_DIR:-$OPENCLAW_HOME/plugins}/$PLUGIN_ID"

pass() { printf '  [PASS] %s\n' "$1"; }
warn() { printf '  [WARN] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1"; }

echo "== memory-lancedb-dreaming doctor =="

# 1. Node present
if command -v node >/dev/null 2>&1; then
  pass "node $(node --version)"
else
  fail "node not found on PATH"
fi

# 2. OpenClaw CLI present
if command -v openclaw >/dev/null 2>&1; then
  pass "openclaw $(openclaw --version 2>/dev/null || echo '(version unknown)')"
else
  warn "openclaw CLI not found on PATH"
fi

# 3. Plugin installed under plugins/ (not workspace/)
if [[ -f "$INSTALL_DIR/dist/index.js" ]]; then
  pass "plugin dist present at $INSTALL_DIR/dist/index.js"
else
  fail "missing $INSTALL_DIR/dist/index.js (install under ~/.openclaw/plugins/, run npm install --omit=dev)"
fi

if [[ "$INSTALL_DIR" == *"/workspace/"* ]]; then
  fail "plugin installed under workspace/ — move it to ~/.openclaw/plugins/"
fi

# 4. Stale workspace paths in config
if command -v grep >/dev/null 2>&1; then
  if grep -rqs "workspace/$PLUGIN_ID" "$OPENCLAW_HOME" --include="*.json" 2>/dev/null; then
    fail "found stale workspace/$PLUGIN_ID path in config — clean openclaw.json, openclaw.json.last-good, plugins/installs.json"
  else
    pass "no stale workspace/$PLUGIN_ID path in config"
  fi
fi

# 5. Entry-level hooks/subagent flags present in config (best-effort text check)
CONFIG_FILE="$OPENCLAW_HOME/openclaw.json"
if [[ -f "$CONFIG_FILE" ]]; then
  if grep -qs "allowConversationAccess" "$CONFIG_FILE"; then
    pass "allowConversationAccess present in openclaw.json"
  else
    warn "allowConversationAccess not found in openclaw.json — cron dreaming hook may be blocked"
  fi
else
  warn "openclaw.json not found at $CONFIG_FILE"
fi

echo ""
echo "Next: run the full runtime check from your agent:"
echo "  dreaming_doctor"
echo "  dreaming_status"
