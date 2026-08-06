#!/bin/sh
# Xcode Cloud post-clone script (repository root location).
#
# Xcode Cloud looks for `ci_scripts/` either at the repository root or next to
# the Xcode project. We keep the real logic in one place and delegate to it, so
# both locations behave identically.
set -e

REPO_ROOT=${CI_PRIMARY_REPOSITORY_PATH:-"$(cd "$(dirname "$0")/.." && pwd)"}
sh "$REPO_ROOT/ios/App/ci_scripts/ci_post_clone.sh"
