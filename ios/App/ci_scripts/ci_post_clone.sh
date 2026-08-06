#!/bin/sh
# Xcode Cloud post-clone script.
#
# Why this exists:
# The Capacitor iOS project resolves its plugins through a LOCAL Swift package
# (ios/App/CapApp-SPM/Package.swift) whose dependencies point at
# ../../../node_modules/@capacitor/*. Those folders only exist after the Node
# dependencies are installed. Xcode Cloud clones the repo and goes straight to
# Swift Package resolution, so without this script SPM fails with
# "@capacitor/app doesn't exist in the file system".
#
# ci_post_clone.sh runs BEFORE dependency resolution, which is exactly the hook
# we need: install Node, install node_modules, then run `cap sync ios` so the
# native project (public/ web assets, capacitor.config.json, plugin list) is in
# place before Xcode builds.
set -e

REPO_ROOT=${CI_PRIMARY_REPOSITORY_PATH:-"$(cd "$(dirname "$0")/../../.." && pwd)"}
echo "==> Repository root: $REPO_ROOT"
cd "$REPO_ROOT"

# --- 1. Make sure Node is available (Xcode Cloud images ship Homebrew, not Node)
if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node via Homebrew"
  export HOMEBREW_NO_AUTO_UPDATE=1
  export HOMEBREW_NO_INSTALL_CLEANUP=1
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi
echo "==> node $(node -v) / npm $(npm -v)"

# --- 2. Install JS dependencies (this creates node_modules/@capacitor/*)
echo "==> Installing npm dependencies"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# --- 3. Sanity check the packages the local Swift package points at
for pkg in app browser push-notifications share splash-screen status-bar; do
  if [ ! -d "node_modules/@capacitor/$pkg" ]; then
    echo "!! Missing node_modules/@capacitor/$pkg after install" >&2
    exit 1
  fi
done

# --- 4. Generate the native bits Xcode needs (capacitor.config.json, public/, plugins)
echo "==> Running capacitor sync"
npx --yes cap sync ios

echo "==> ci_post_clone.sh finished successfully"
