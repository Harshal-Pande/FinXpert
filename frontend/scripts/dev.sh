#!/usr/bin/env bash
# Next dev opens many files (watchers + HMR). macOS default ulimit is often too low → EMFILE.
set -e
cd "$(dirname "$0")/.."
if ulimit -n 65536 2>/dev/null; then
  :
elif ulimit -n 10240 2>/dev/null; then
  :
else
  echo "dev.sh: could not raise ulimit -n. If you see EMFILE, run: ulimit -n 65536" >&2
fi
# Default port 3020 unless -p/--port is already passed (e.g. npm run dev -- -p 3000)
has_port=0
for a in "$@"; do
  if [[ "$a" == "-p" || "$a" == "--port" ]]; then
    has_port=1
    break
  fi
done
if [[ "$has_port" -eq 0 ]]; then
  set -- -p 3020 "$@"
fi
exec npx next dev "$@"
