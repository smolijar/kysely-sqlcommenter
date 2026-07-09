#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DIR="$ROOT_DIR/tmp/integration-test-builder"

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
cp "$ROOT_DIR/integration-test-builder/integration.ts.template" "$TMP_DIR/main.ts"

npm run build --prefix "$ROOT_DIR"

tarball="$(npm pack "$ROOT_DIR" --pack-destination "$TMP_DIR" --silent)"

cd "$TMP_DIR"
npm init -y
npm install "./$tarball" kysely tsx typescript @types/node
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
npx tsc --project tsconfig.json
npx tsx main.ts
