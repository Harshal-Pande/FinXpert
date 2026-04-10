#!/usr/bin/env bash
# Run FinXpert like production locally: Nest API + Next.js (full website).
# Requires: PostgreSQL (DATABASE_URL in backend/.env), backend deps, frontend deps.
# Usage: from repo root — npm run simulate   OR   bash scripts/simulate-website.sh
# If you see EMFILE (too many open files), run once: npm run setup:macos-dev

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Avoid EMFILE (too many open files) when Next + Nest watchers run together on macOS.
ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true

# Next defaults to 3000; if that is taken it would steal 3001 and clash with Nest. Pin a safe port.
NEXT_PORT="${NEXT_PORT:-3020}"

echo ""
echo "FinXpert — simulating full stack"
echo "  API (Nest):  http://localhost:3001/api  (health: http://localhost:3001/health)"
echo "  Web (Next):  http://localhost:${NEXT_PORT}   (override with NEXT_PORT=3000 npm run simulate)"
echo "  Dashboard:   http://localhost:${NEXT_PORT}/dashboard"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

cleanup() {
  echo ""
  echo "Stopping…"
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(cd "$ROOT/backend" && npm run start:dev) &
(cd "$ROOT/frontend" && npm run dev -- -p "$NEXT_PORT") &
wait
