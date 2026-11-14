# Fleet setup

## Prepare

Run once in this checkout before the launch.
- `pnpm --dir app install --frozen-lockfile`: makes `app/node_modules` and fills the pnpm store.
- `cargo build --workspace --all-targets`: fills `~/.cargo/registry` and `target/` (2.3 GB, 40 s from zero).

## Worktree

- Frontend and shell sessions: `pnpm --dir app install --frozen-lockfile --offline`. It links from the pnpm store in less than 1 s.
- Do not link or copy `target/`. A full build takes 40 s. The core alone takes less.
- Do not link `app/node_modules`: Vite writes a cache in it.

## Checks

- `crates/core/`, `rules/`: `cargo test -p astro-vitals-core`
- `app/src-tauri/`: `cargo test -p astro-vitals` (it also compiles the binary). The shell session runs `pnpm --dir app build` first if `app/dist` is absent.
- `app/src/`: `pnpm --dir app check && pnpm --dir app build`

## Shared resources

- Port 1420 (`pnpm --dir app tauri dev`): only this checkout uses it. Sessions do not start the app.
- The Tauri app data directory: only this checkout uses it. Shell tests use a temporary directory from `std::env::temp_dir()` with the process id in its name.

## Main only

- `cargo test --workspace`
- `pnpm --dir app tauri dev`: the window starts without an error.
- The manual steps in `.agents/DEMO.md`.
