#!/usr/bin/env bash
# Usage: ./scripts/sync-shared.sh /path/to/cloud-api-repo
set -e
SRC="$1/packages/shared/src"
DEST="src/backend/shared"
cp "$SRC"/enums.js "$SRC"/hlc.js "$SRC"/fold.js "$SRC"/validation.js "$SRC"/priority.js "$SRC"/index.js "$DEST"/
echo "Synced shared/ from $SRC → $DEST"
