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
# lib-dev/ is the dev library -- experimental library files for local testing,
# read in place of lib/ only while its toggle is on. Anchored to the top of the
# tree. Never published, so no one else's app, and no offline cache, can see it.
# See dev-library-plan.md.
#
# lib-test/ is the test library -- a frozen library the snapshot suites build
# against instead of lib/. It belongs to the tests and the app never reads it.
# Anchored the same way. See test-library-plan.md.
#
EXCLUDES=(
    --exclude=".*"
    --exclude="PREVIOUS_REQUIRED_DATA.json"
    --exclude="database/"
    --exclude="dev_settings.json"
    --exclude="/lib-dev/"
    --exclude="/lib-test/"
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
# The gate, in three parts.
#
# Publishing puts this code in front of the whole team at once, so it happens
# only when the engine still does what it is supposed to and the library still
# builds. Each part deserves different treatment -- see
# docs/adr/0011-snapshots-build-against-a-test-library.md.
#
# The invariants say what correct IS, written against the decisions rather than
# against today's output. Nothing about editing the library can move them, so a
# failure here is always a real one and is never waived.
#
echo "Checking the rules the engine is supposed to follow..."
if ! (cd "$REPO" && npm run test:invariants --silent); then
    echo >&2
    echo "An invariant failed. Not publishing." >&2
    echo "These assert what correct means, so this is a defect rather than a change" >&2
    echo "in output -- there is nothing to accept. Fix it first." >&2
    exit 1
fi
echo

#
# The smoke test builds every golden brief against the real library and runs
# every real module's layout. It asks whether the library builds, not what it
# produces, so editing a module's copy or colours never trips it -- but a
# module that throws or will not parse does, and that would reach every brief
# that uses it. Nothing to accept here either.
#
echo "Checking that the real library builds..."
if ! (cd "$REPO" && npm run test:library --silent); then
    echo >&2
    echo "The real library failed to build. Not publishing." >&2
    echo "A real brief would fail to build, so this is a defect rather than a change" >&2
    echo "in output -- there is nothing to accept. Fix the module named above first." >&2
    exit 1
fi
echo

#
# The snapshots say what the engine currently produces. They build against the
# test library, external/lib-test/, so editing lib/ cannot move them: only an
# engine change, or a deliberate edit to lib-test/, can. Any difference stops
# the publish until it is read and accepted.
#
echo "Checking what the engine builds against the recorded baselines..."
if ! (cd "$REPO" && npm run test:snapshots --silent); then
    echo >&2
    echo "The engine's output changed. Not publishing." >&2
    echo "Read the differences above. If they are what you intended, record them:" >&2
    echo "  npm run test:accept" >&2
    echo "then review and commit the new expected files and inputs.json." >&2
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

STAMP="$SHARED/.published.json"
WHO="$(whoami)@$(hostname -s)"

#
# Mark the tree as mid-publish before rsync touches it.
#
# rsync is not atomic: while it runs the tree is half old and half new. Every
# app reads this stamp before a build, and while it says "publishing" it builds
# from its local copy and never copies this tree into it. The previous version
# is kept, so nothing mistakes the half-written tree for a new one. If rsync
# fails, set -e leaves the stamp saying "publishing", and every app keeps
# building from its local copy until the next good publish. See
# local-copy-plan.md.
#
if [ -z "$DRY" ]; then
    PREVIOUS_VERSION="$(node -e 'try { process.stdout.write(String(require(process.argv[1]).version || "")) } catch (_) {}' "$STAMP")"
    PREVIOUS_SHELL="$(node -e 'try { process.stdout.write(String(require(process.argv[1]).shellHash || "")) } catch (_) {}' "$STAMP")"

    cat > "$STAMP" <<EOF
{
    "version": "$PREVIOUS_VERSION",
    "shellHash": "$PREVIOUS_SHELL",
    "state": "publishing",
    "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "publishedBy": "$WHO"
}
EOF
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
# It is also what every app compares its local copy against. `version` is new
# on every publish, and an app whose copy carries the same one builds from the
# copy rather than over the network. `shellHash` covers the part of the tree an
# app loads once per launch -- main_external.js and ui/ -- and when it differs
# from the running app's, the app offers a restart. app/local_copy.js computes
# it, so the script and the app cannot disagree on how.
#
if [ -z "$DRY" ]; then
    COMMIT="$(cd "$REPO" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
    DIRTY=""
    if ! (cd "$REPO" && git diff --quiet HEAD 2>/dev/null); then DIRTY=" (uncommitted changes)"; fi

    PUBLISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    SHELL_HASH="$(node "$REPO/app/local_copy.js" shell-hash "$LOCAL")"

    cat > "$STAMP" <<EOF
{
    "publishedAt": "$PUBLISHED_AT",
    "publishedBy": "$WHO",
    "commit": "$COMMIT$DIRTY",
    "version": "$PUBLISHED_AT",
    "shellHash": "$SHELL_HASH",
    "state": "published"
}
EOF

    echo "Published $COMMIT$DIRTY. Teammates pick this up on their next build."
fi
