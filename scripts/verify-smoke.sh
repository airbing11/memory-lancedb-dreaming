#!/usr/bin/env bash
# Pre-publish smoke check for memory-lancedb-dreaming (run on Ubuntu with OpenClaw)
set -euo pipefail

TGZ="${1:-memory-lancedb-dreaming-0.2.3.tgz}"
PLUGIN_DIR="${OPENCLAW_PLUGINS_DIR:-$HOME/.openclaw/plugins}/memory-lancedb-dreaming"
PASS=0
FAIL=0

ok() { echo "  ✅ $1"; PASS=$((PASS + 1)); }
bad() { echo "  ❌ $1"; FAIL=$((FAIL + 1)); }

echo "==> memory-lancedb-dreaming pre-publish smoke test"
echo "    tarball: $TGZ"
echo ""

# 1. tarball integrity
if [[ -f "$TGZ" ]]; then ok "tarball exists"; else bad "tarball missing: $TGZ"; fi
VER=$(tar -xOf "$TGZ" package/package.json 2>/dev/null | grep '"version"' | head -1 || true)
if echo "$VER" | grep -q '0.2.3'; then ok "version 0.2.3 in package.json"; else bad "version mismatch: $VER"; fi

# 2. README sections
if tar -xOf "$TGZ" package/README.md | grep -qE "## (为什么需要|痛点)|memory 插槽"; then ok "README value-prop section present"; else bad "README value-prop section missing"; fi
if tar -xOf "$TGZ" package/README.md | grep -q "梦境日报"; then ok "README daily report section present"; else bad "README daily report missing"; fi

# 3. v0.2.0 artifacts
for f in scripts/install.sh dist/run-metadata.js dist/cron.js dist/daily-report/index.js; do
  if tar -tzf "$TGZ" "package/$f" &>/dev/null; then ok "bundle contains $f"; else bad "missing $f"; fi
done

# 4. install script (dry run to temp dir)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
tar -xzf "$TGZ" -C "$TMP"
SRC="$TMP/package"
[[ -d "$SRC" ]] || SRC="$TMP"
if [[ -f "$SRC/scripts/install.sh" ]]; then ok "install.sh executable content"; else bad "install.sh not found"; fi

# 5. installed plugin checks (if already installed)
if [[ -f "$PLUGIN_DIR/dist/index.js" ]]; then
  ok "plugin dir exists: $PLUGIN_DIR"
  if grep -q "removeLegacyConflictCronJobs" "$PLUGIN_DIR/dist/cron.js" 2>/dev/null; then
    ok "conflict cron cleanup in dist"
  else
    bad "conflict cron cleanup not in installed dist (re-install with install.sh)"
  fi
  if grep -q "recordDreamingRun" "$PLUGIN_DIR/dist/index.js" 2>/dev/null; then
    ok "lastRunAt recording in dist"
  else
    bad "lastRunAt not in installed dist"
  fi
else
  echo "  ⚠️  plugin not installed at $PLUGIN_DIR — skip runtime dist checks"
fi

# 6. gateway log hints (optional)
LOG_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}/logs"
if ls "$LOG_DIR"/* &>/dev/null 2>&1; then
  if grep -h "memory-lancedb-dreaming" "$LOG_DIR"/* 2>/dev/null | tail -3 | grep -q "cronHook=ready"; then
    ok "recent logs show cronHook=ready"
  else
    echo "  ⚠️  no cronHook=ready in recent logs (restart gateway after install)"
  fi
fi

echo ""
echo "==> result: $PASS passed, $FAIL failed"
if [[ $FAIL -gt 0 ]]; then
  echo "NO-GO: fix failures before publishing"
  exit 1
fi
echo "GO: safe to publish after optional dreaming_trigger smoke on production"
exit 0
