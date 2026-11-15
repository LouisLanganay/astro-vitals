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
- `app/src/lib/`: shared frontend parts: `types.ts`, `api.ts`, `errors.ts`, `labels.ts`, `format.ts`, `state.svelte.ts`, `symptoms.ts`, `LevelBadge.svelte`, `FiredRuleCard.svelte`.
- `app/src/App.svelte`, `app/src/app.css`: navigation shell, banners, shared CSS.
- `app/src/screens/daily/`: Home, DailyCheck, Trends, Settings, PacketExport.
- `app/src/screens/tests/`: Pvt, VisionTest, BodyFigure.
- `app/src/screens/daily/DotSlider.svelte`: the 0 to 10 slider made of dots (`role="slider"`, pointer and keyboard). `FeelFace.svelte`: the dot face of "How you feel". It shows the 4 values together: mouth for mood, eyebrows for stress, eyes for tiredness, drops for workload.
- `app/src/lib/figure.svelte.ts`: the male or female choice of the body figure, kept in `localStorage`.
- `app/src/lib/symptoms.ts`: a day with no record starts with the symptoms of the previous day. The Body screen and the Daily check use it, because the symptom duration rule stops when the record of the day does not contain the symptom.
- `app/src/web/start.ts`: the bridge of the web demo. It keeps the document in `localStorage`. It loads `sleep_debt` on the first visit.
- `app/public/`: the favicon, the home screen icons, `manifest.webmanifest` and `og.png` (the share image). The logo is the dot planet. `app/src-tauri/icons/` has the same logo for the desktop.
- `app/src/landing/`: the welcome page of the web demo. The ship has 5 zones with a panel on hover or tap (`ZONES` in `ship.ts`). At the end, the dashboard shows through an iris: a `clip-path` animation on `#app`, never a `transform` (it breaks the fixed bars). `gate.ts` decides if it shows, `run.ts` mounts it, `ship.ts` builds the dot spacecraft, `scene.ts` draws it with WebGL (no library) and flies the camera into the airlock.
- `.agents/`: files for agents. Area guide: [CONTRACTS.md](./CONTRACTS.md) gives the meaning of each frozen contract.
- `.agents/fleet/SETUP.md`: setup of `/fleet` sessions.

## Entry points

- `app/src-tauri/src/main.rs`: the Tauri binary.
- `app/src/main.ts`: the frontend. It mounts `App.svelte`. In `web` mode, it shows the landing first, one time for each browser tab. `#landing` forces it, `#app` skips it.
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
- Rule kinds in `rules.toml`: `absolute`, `drift`, `symptom_duration`, `symptom_recurrence`, `symptom_unresolved`, `red_flag`, `vision_change`, `vision_persistent`. Unknown fields are an error. Format: [CONTRACTS.md](./CONTRACTS.md), section "rules.toml format".
- A `drift` rule with no `threshold` takes the `[drift]` value of its level. The `exercise_min` rule with no `threshold` takes the setting.
- `rules::parse` rejects a `red_flag` rule that has no `body_region` or a level other than `flight_surgeon`.
- Vision rules compare with the latest pre-flight test. `vision_change` uses the last test, `vision_persistent` the last 2 tests.
- A scenario has data for mission days -14 to 119. Mission day 120 (today) has no data.
- Core tests: `crates/core/tests/scenarios.rs` (SPEC Verification, rule content) and `edge_cases.rs` (SPEC Edge cases).
- Sections have no box: the last block of `app.css` removes the card background and adds a thin line and a small title in capitals. Do not add a box around a section again.
- CI and Pages run on one self-hosted runner, the Mac of Louis. When it is offline, no check and no deployment run: do the checks by hand before a merge.
- Touch screens: `app/index.html` sets `initial-scale=1.15` with no `width`. A phone or a tablet browser then shows all the interface 15% larger. A desktop browser and the Tauri window ignore it.
- The vision calibration is in CSS pixels. `app/src/lib/scale.ts` keeps the page scale of the calibration in `localStorage`. A calibration made at another scale is not used: the screen asks for a new one.
- Manual demo: [DEMO.md](./DEMO.md).
- Do not add a dependency without an agreement: `Cargo.lock` and `app/pnpm-lock.yaml` are shared.
- Commit messages: `chore: ...`, `docs: ...`, `feat: ...`, `fix: ...`.

## Mobile app

- `mobile/`: Expo SDK 58, expo-router (routes in `mobile/src/app/`), TypeScript strict, bun. Android first. `mobile/android` and `mobile/ios` are prebuild output and are not in git.
- The engine is the real Rust core. `mobile/scripts/build-core.sh` builds `crates/web` to `wasm32-unknown-unknown` (target dir `target/mobile-core`, size profile), lowers the new wasm features with `wasm-opt`, and converts the module to JavaScript with Binaryen `wasm2js`. Output: `mobile/src/core/engine.generated.js` (committed, so `expo start` works without Rust).
- Hermes has no WebAssembly. `wasm2js` cannot return an i64, so the app calls `call_ptr(ptr, len)` and `call_len()` in `crates/web`, not `call`.
- `mobile/src/core/session.ts` is the port of `app/src/web/start.ts`: same request, same document, same corrupt document behaviour. `storage.ts` keeps `data.json` in the document directory (write a temp file, then move). `storage.web.ts` uses `localStorage`.
- `mobile/src/lib/types.ts`, `labels.ts`, `errors.ts`, `format.ts`, `icons.ts` are copies of the files in `app/src/lib/`. `bodyShape.ts` is a copy of `app/src/screens/tests/bodyShape.ts` with the dot points added.
- Commands in `mobile/`: `bun install --frozen-lockfile`, `bun run core` (needs Rust with the wasm32 target), `bun test` (compares `engine.generated.js` with the real `.wasm`), `bunx tsc --noEmit`, `bunx expo export -p web`.
- The Expo CLI needs Node 22.13 or later. With an older Node, use `bun --bun x expo ...`.
- CI: `.github/workflows/android.yml` builds a release APK (arm64-v8a, debug signing) on a push that changes `mobile/**`. Artifact: `astro-vitals-apk`.
- The vision test is not in the mobile app.
