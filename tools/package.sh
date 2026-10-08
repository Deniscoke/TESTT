#!/usr/bin/env bash
# Deterministic build of the .aseprite-extension (a ZIP of src/).
# Same commit -> byte-identical output: sorted file list, fixed mtimes and
# permissions, no extra attributes (zip -X), no directory entries (zip -D).
# Usage: tools/package.sh [output-dir]   (default: dist)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-$ROOT/dist}"
VERSION="$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' "$ROOT/src/package.json")"
[ -n "$VERSION" ] || { echo "cannot read version from src/package.json" >&2; exit 1; }
NAME="pixel-proofreader-$VERSION.aseprite-extension"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

cd "$ROOT/src"
FILES="$(find . -type f \( -name '*.lua' -o -name 'package.json' \) | sed 's|^\./||' | LC_ALL=C sort)"
for f in $FILES; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$f" "$STAGE/$f"
  chmod 0644 "$STAGE/$f"
  TZ=UTC touch -d '2000-01-01 00:00:00' "$STAGE/$f"
done

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/$NAME"
cd "$STAGE"
printf '%s\n' $FILES | TZ=UTC zip -X -D -q -9 "$OUT_DIR/$NAME" -@
cd "$OUT_DIR"
sha256sum "$NAME" > "$NAME.sha256"
echo "$OUT_DIR/$NAME"
cat "$NAME.sha256"
