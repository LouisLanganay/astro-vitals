# CONTEXT

## Purpose

astro-vitals is a desktop tool for one astronaut on a Mars transit.
The user records a daily self-check. The tool shows the drift from the pre-flight baseline and gives one escalation level with an action.
All data stays on the device. Specification: [SPEC.md](./SPEC.md). Evidence: [RESEARCH.md](./RESEARCH.md).

## Stack

- Rust 1.95, edition 2024, Cargo workspace (resolver 3).
- `astro-vitals-core` (`crates/core`, lib `astro_vitals_core`): pure logic. Dependencies: `serde`, `serde_json`, `toml` 1, `chrono` 0.4 without clock.
- `astro-vitals` (`app/src-tauri`): Tauri 2 binary with `tauri-plugin-dialog`.
- Frontend (`app`): Svelte 5, Vite 8, TypeScript 6, pnpm 12.
- `cargo tauri` is not installed. Use `pnpm --dir app tauri`.

## Commands

- Install: `pnpm --dir app install --frozen-lockfile`
- Build: `cargo build --workspace` and `pnpm --dir app build`
- Test: `cargo test --workspace`. Core only: `cargo test -p astro-vitals-core`
- Type check of the frontend: `pnpm --dir app check`
- Run: `pnpm --dir app tauri dev` (fixed port 1420, one instance at a time)
- Lint: none.

## Map

- `crates/core/src/model.rs`: the frozen data model. `app/src/lib/types.ts` is its mirror.
- `crates/core/src/`: `validate`, `baseline`, `rules`, `pvt`, `scenario`, `packet`, `mission` (mission day, due tasks, streak, day view).
- `crates/core/tests/`: scenario assertions.
- `rules/rules.toml`: declarative rules. The shell embeds it with `include_str!`.
- `app/src-tauri/src/`: `main.rs`, `store.rs` (JSON file, atomic save), `commands.rs` (10 IPC commands).
- `app/src/lib/`: shared frontend parts: `types.ts`, `api.ts`, `errors.ts`, `labels.ts`, `format.ts`, `state.svelte.ts`, `LevelBadge.svelte`, `FiredRuleCard.svelte`.
- `app/src/App.svelte`, `app/src/app.css`: navigation shell, banners, shared CSS.
- `app/src/screens/daily/`: Home, DailyCheck, Trends, Settings, PacketExport.
- `app/src/screens/tests/`: Pvt, VisionTest, BodyFigure.
- `.agents/`: files for agents. Area guide: [CONTRACTS.md](./CONTRACTS.md) gives the meaning of each frozen contract.
- `.agents/fleet/SETUP.md`: setup of `/fleet` sessions.

## Entry points

- `app/src-tauri/src/main.rs`: the Tauri binary.
- `app/src/main.ts`: the frontend. It mounts `App.svelte`.
- `app/index.html`: the Vite entry.

## Conventions

- No code comments. All text is ASD-STE100 Simplified Technical English.
- The core has no file I/O, no network, no clock and no Tauri dependency. The shell gives it the date.
- Wire names are snake_case with no rename. A date is a `YYYY-MM-DD` string. A time of day is minutes after midnight.
- Each command returns `Result<T, AppError>`. Each command argument name is one word.
- Assessments are not stored. `evaluate` computes each time.
- The frontend calls `refresh()` after each save and uses `navigate(screen, params)`.
- Shell: the command logic is in private `AppState` methods that take `today`. Tests call these methods, not the `#[tauri::command]` functions.
- Shell tests need `app/dist` (run `pnpm --dir app build` first). They use `store::tests::temp_dir(name)`.
- Store: `data.json` in the app data directory. A corrupt file becomes `data.corrupt-<n>.json`. `write_atomic` uses `<file name>.<pid>.tmp`. `Store::open` writes no file until the first save.
- Rule kinds in `rules.toml`: `absolute`, `drift`, `vision`, `symptom_duration`, `symptom_recurrence`, `symptom_not_improved`, `red_flag`. Unknown fields are an error.
- A `drift` rule with no `threshold` takes the `[drift]` value of its level. The `exercise_min` rule with no `threshold` takes the setting.
- `rules::parse` rejects a `red_flag` rule that has no `body_region` or a level other than `flight_surgeon`.
- A `vision` rule uses the last `min_days` tests, not a window of days.
- A scenario has data for mission days -14 to 119. Mission day 120 (today) has no data.
- Core tests: `crates/core/tests/scenarios.rs` (SPEC Verification, rule content) and `edge_cases.rs` (SPEC Edge cases).
- Manual demo: [DEMO.md](./DEMO.md).
- Do not add a dependency without an agreement: `Cargo.lock` and `app/pnpm-lock.yaml` are shared.
- Commit messages: `chore: ...`, `docs: ...`, `feat: ...`, `fix: ...`.
