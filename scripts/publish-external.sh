#!/bin/bash
#
# Publish external/ to the shared folder every installed app reads from.
#
# This is the release step for everything except the bootstrap. Teammates pick
# it up on their next launch, with no new .app. See
# docs/adr/0001-engine-runs-outside-the-app-bundle.md.
#
#   ./scripts/publish-external.sh --dry-run    show what would change, touch nothing
#   ./scripts/publish-external.sh              publish
#
# There is no --pull. The repository is the only source of truth and publishing
# is one-directional: nothing on the volume is ever authored there, so there is
# nothing to pull back. See docs/adr/0002-the-repository-is-the-only-source-of-truth.md.
#
# Written for bash 3.2, which is what macOS ships -- hence plain string flags
# rather than arrays, which are unsafe when empty under `set -u` on that version.
#
set -euo pipefail

#
# The parallel development target. v2.5 continues to serve the team from its own
# folder, untouched, until parity is proven -- the two apps have different bundle
# identifiers and different published trees, so they coexist. See the combination
# plan, section 5.
#
SHARED="/Volumes/Chats_Marketing/Design WIP/- 2019 Design WIP/Design Team/AERS Autobuilder/Universal Builder"
MOUNT="/Volumes/Chats_Marketing"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL="$REPO/external"

#
# Per-user build state and local dev settings. These are written beside the
# engine when it runs outside the app, and must never reach the volume: they are
# one person's last brief path, not part of the product.
#
EXCLUDES=(
    --exclude=".*"
    --exclude="PREVIOUS_REQUIRED_DATA.json"
    --exclude="database/"
    --exclude="dev_settings.json"
)

DRY=""

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY="--dry-run" ;;
        *) echo "Unknown option: $arg" >&2; exit 2 ;;
    esac
done

#
# Guard the mount before touching anything.
#
# /Volumes is writable on macOS, so if the share is not mounted rsync will
# happily CREATE the folder tree on the boot disk. That silently "succeeds",
# publishes to nowhere, and leaves a stub folder that blocks the real share from
# mounting later. Checking the directory exists is not enough -- it has to be a
# real mount point.
#
if ! mount | grep -q " on ${MOUNT} "; then
    echo "The Chats_Marketing volume is not mounted." >&2
    echo "Connect to it in Finder first -- publishing without it would write to the local disk." >&2
    exit 1
fi

if [ ! -d "$LOCAL" ]; then
    echo "No external/ folder at:" >&2
    echo "  $LOCAL" >&2
    exit 1
fi

#
# The gate.
#
# Publishing puts this code in front of the whole team at once, so it happens
# only when the engine still produces the output it is expected to. An intended
# change is accepted with `npm run test:accept` and committed, which makes the
# change reviewable before it ships rather than after.
#
echo "Checking the engine still builds what it is expected to..."
if ! (cd "$REPO" && npm test --silent); then
    echo >&2
    echo "Tests failed. Not publishing." >&2
    echo "If the change in output is intended, record it:" >&2
    echo "  npm run test:accept                          for the golden cases" >&2
    echo "  node tests/layouts/layouts.js --accept       for the module layouts" >&2
    echo "then review and commit the new expected files." >&2
    exit 1
fi
echo

if [ -n "$DRY" ]; then
    echo "DRY RUN -- nothing will be written."
    echo
fi

if [ ! -d "$SHARED" ]; then
    if [ -n "$DRY" ]; then
        echo "Target does not exist yet and would be created:"
        echo "  $SHARED"
        echo
    else
        echo "Creating the published folder: $SHARED"
        mkdir -p "$SHARED"
    fi
fi

echo "-> $SHARED"
rsync -av --delete $DRY "${EXCLUDES[@]}" "$LOCAL/" "$SHARED/"
echo

#
# A stamp of what is published, written outside the mirror so --delete leaves it
# alone. Under ADR 0001 a teammate's failure happens against this tree and not
# against anything on their Mac, so "which commit is out there right now" is the
# first question worth being able to answer.
#
if [ -z "$DRY" ]; then
    COMMIT="$(cd "$REPO" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
    DIRTY=""
    if ! (cd "$REPO" && git diff --quiet HEAD 2>/dev/null); then DIRTY=" (uncommitted changes)"; fi

    cat > "$SHARED/.published.json" <<EOF
{
    "publishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "publishedBy": "$(whoami)@$(hostname -s)",
    "commit": "$COMMIT$DIRTY"
}
EOF

    echo "Published $COMMIT$DIRTY. Teammates pick this up on their next launch."
fi
