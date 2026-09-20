#!/usr/bin/env bash
# Runs ON THE SERVER (piped over SSH). Usage: bash -s -- <app-root>
# Prints, on stdout, the absolute directory that should receive the app's node_modules.
#
# CloudLinux Node.js Selector (cPanel "Setup Node.js App") forbids a real node_modules folder
# in the app root — it must be a symlink into the app's virtual environment:
#   <app-root>/node_modules -> ~/nodevenv/<app-root relative to ~>/<node version>/lib/node_modules
# So: keep/create that symlink and deploy the dependencies through it. On a host without the
# Selector there is no virtual environment, and a plain node_modules folder is used instead.
set -euo pipefail

APP="$1"
mkdir -p "$APP"
cd "$APP"

if [ -L node_modules ]; then
  target=$(readlink -f node_modules)
  mkdir -p "$target"
  echo "node_modules is already a symlink -> $target" >&2
  echo "$target"
  exit 0
fi

venv=""
rel="${APP#"$HOME"/}"
if [ "$rel" != "$APP" ]; then
  # Newest node version's virtual environment, if the app was created in the Selector.
  venv=$(ls -dt "$HOME/nodevenv/$rel"/*/lib/node_modules 2>/dev/null | head -n 1 || true)
fi

if [ -n "$venv" ]; then
  rm -rf node_modules
  ln -s "$venv" node_modules
  echo "Linked node_modules -> $venv" >&2
  echo "$venv"
else
  mkdir -p node_modules
  echo "No Node.js Selector virtual environment found; using a plain node_modules folder." >&2
  echo "$APP/node_modules"
fi
