#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$ROOT_DIR/tmp/integration-test-builder"

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
cp "$ROOT_DIR/integration-test-builder/integration.ts.template" "$TMP_DIR/main.ts"

pnpm --dir "$ROOT_DIR" run build

pnpm --dir "$ROOT_DIR" pack --pack-destination "$TMP_DIR"
tarball="$(basename "$TMP_DIR"/kysely-sqlcommenter-*.tgz)"

cd "$TMP_DIR"
cat > package.json <<'JSON'
{
  "name": "kysely-sqlcommenter-smoke",
  "version": "0.0.0",
  "type": "module",
  "private": true
}
JSON
pnpm add "./$tarball" kysely tsx typescript @types/node
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2020",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "files": ["main.ts"]
}
JSON
pnpm exec tsc --project tsconfig.json
pnpm exec tsx main.ts
