#!/bin/sh
# Serves the repo root on :8765 and runs each browser test against it (needs Google Chrome installed).
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --silent
python3 -m http.server 8765 --bind 127.0.0.1 --directory .. >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
until curl -s -o /dev/null http://127.0.0.1:8765/; do sleep 0.2; done
status=0
for f in *.test.js; do
  echo "== $f"
  node "$f" || status=1
done
exit $status
