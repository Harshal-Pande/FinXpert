#!/usr/bin/env bash
# Persistent macOS dev limits for this repo (see usage).

set -e

MARKER_BEGIN="# <<< Fin-Xpert macOS dev limits (begin)"

usage() {
  cat <<'EOF'
Raise the per-shell open-file limit so Next.js / Node dev does not hit EMFILE on macOS.

Run once from repo root:
  bash scripts/install-macos-ulimit.sh
  npm run setup:macos-dev

Appends an idempotent block to ~/.zshrc. Open a new terminal afterward (or: source ~/.zshrc).
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script is for macOS only. On Linux, raise limits in /etc/security/limits.conf or systemd."
  exit 0
fi

ZSHRC="${ZDOTDIR:-$HOME}/.zshrc"
BLOCK=$(cat <<'BLOCK_EOF'
# <<< Fin-Xpert macOS dev limits (begin)
# Avoid EMFILE (too many open files) for Next.js, Nest, watchers.
if [[ "$(uname -s)" == Darwin ]]; then
  ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true
fi
# <<< Fin-Xpert macOS dev limits (end)
BLOCK_EOF
)

if [[ -f "$ZSHRC" ]] && grep -qF "$MARKER_BEGIN" "$ZSHRC" 2>/dev/null; then
  echo "Already configured: markers found in $ZSHRC"
  echo "Open a new terminal or run: source $ZSHRC"
  exit 0
fi

echo "Appending dev limits block to: $ZSHRC"
{
  echo ""
  echo "$BLOCK"
} >> "$ZSHRC"

echo "Done. Open a new terminal, or run:  source $ZSHRC"
echo ""
echo "Optional (system-wide soft limit; may help GUI apps launched from Finder):"
echo "  sudo launchctl limit maxfiles 65536 200000"
echo "Reboot may reset launchctl limits unless you add a permanent plist; the ~/.zshrc hook is usually enough for npm run dev."
echo ""
