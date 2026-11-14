#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
root="$(cd "$here/.." && pwd)"
target_dir="${CORE_TARGET_DIR:-$root/target/mobile-core}"
work="$target_dir/wasm2js"
out="$here/src/core/engine.generated.js"
bin="$here/node_modules/.bin"

mkdir -p "$work"

CARGO_TARGET_DIR="$target_dir" \
CARGO_PROFILE_RELEASE_OPT_LEVEL=s \
CARGO_PROFILE_RELEASE_LTO=true \
CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1 \
CARGO_PROFILE_RELEASE_PANIC=abort \
  cargo build --manifest-path "$root/Cargo.toml" -p astro-vitals-web --target wasm32-unknown-unknown --release

wasm="$target_dir/wasm32-unknown-unknown/release/astro_vitals_web.wasm"

"$bin/wasm-opt" "$wasm" \
  --enable-bulk-memory --enable-nontrapping-float-to-int --enable-sign-ext \
  --enable-mutable-globals --enable-multivalue --enable-reference-types \
  --llvm-memory-copy-fill-lowering --llvm-nontrapping-fptoint-lowering \
  --signext-lowering --alignment-lowering -Os -o "$work/lowered.wasm"

"$bin/wasm2js" "$work/lowered.wasm" -Os -o "$work/engine.mjs"

node "$here/scripts/wrap-core.mjs" "$work/engine.mjs" "$out"
cp "$wasm" "$work/astro_vitals_web.wasm"
echo "Wrote $out ($(wc -c < "$out") bytes)"
