# Contracts

This guide gives the meaning of the frozen contracts. The code has no comments.
A change to a frozen file needs an agreement of all lanes.

## Crates and commands

- `astro-vitals-core` (`crates/core`, lib `astro_vitals_core`): pure logic. Dependencies: `serde`, `serde_json`, `toml`, `chrono` (no clock).
- `astro-vitals` (`app/src-tauri`, binary): Tauri 2 shell. Dependencies: the core, `tauri`, `tauri-plugin-dialog`, `chrono` with `clock`.
- Checks: `cargo test --workspace`, `cargo build -p astro-vitals`, `pnpm --dir app build`, `pnpm --dir app check` (svelte-check), `pnpm --dir app tauri dev`.
- Do not add a dependency in a lane. `Cargo.lock` and `app/pnpm-lock.yaml` are shared files. Write a seeded generator by hand (for example SplitMix64).
- The scaffold build shows dead-code warnings for `store.rs` and `AppState`. They go when the shell lane uses the items.

## Files that no lane edits

`Cargo.toml`, `Cargo.lock`, `crates/core/src/model.rs`, `app/package.json`, `app/pnpm-lock.yaml`, `app/vite.config.ts`, `app/tsconfig.json`, `app/svelte.config.js`, `app/index.html`, `app/src/main.ts`, `app/src/App.svelte`, `app/src/app.css`, all of `app/src/lib/` (`types.ts`, `api.ts`, `errors.ts`, `labels.ts`, `format.ts`, `state.svelte.ts`, `LevelBadge.svelte`, `FiredRuleCard.svelte`), `app/src-tauri/Cargo.toml`, `app/src-tauri/tauri.conf.json`, `app/src-tauri/capabilities/`, `app/src-tauri/icons/`.

## Lane files

- `core`: `crates/core/src/{validate,baseline,rules,pvt,scenario,packet,mission}.rs`, `crates/core/tests/`, `rules/rules.toml`. Keep each public signature. `Rule`, `RuleKind`, `DriftLevels` and the fields of `RuleSet` in `rules.rs` are not frozen: only the name `RuleSet`, `parse` and `evaluate` are.
- `shell`: `app/src-tauri/src/{main,store,commands}.rs`. Keep the 10 command signatures and the argument names.
- `ui-daily`: `app/src/screens/daily/` (`Home`, `DailyCheck`, `Trends`, `Settings`, `PacketExport`). Put new parts (the SVG line chart) in this directory.
- `ui-tests`: `app/src/screens/tests/` (`Pvt`, `VisionTest`, `BodyFigure`). Put new parts in this directory.

## Wire format

- All names are snake_case on the wire. TypeScript interfaces use the same field names. No rename.
- A date is `chrono::NaiveDate` = string `YYYY-MM-DD` (`IsoDate`). A time of day is minutes after midnight (`sleep_start_min`, `sleep_end_min`, 0 to 1439). `format.ts` has `timeToMin` and `minToTime` for `<input type="time">`.
- Each command argument name is one word: `date`, `check`, `input`, `result`, `indicator`, `path`, `id`, `settings`.
- Each command returns `Result<T, AppError>`. `invoke` rejects with the `AppError` object. Use `toAppError(e)` in a `catch`.

## Decisions

1. Mission day, due tasks, streak: `get_day(date | null)` returns `DayView`. `DayView.mission` is `MissionStatus { today, mission_day, due, streak, notices }` and always describes today. `today` is the system date in the shell (`commands::today()`). The core computes with `mission::{mission_day, due_tasks, streak, status, day_view}`. The shared state keeps the `DayView` of today in `app.day`.
   - Mission day = `date - settings.launch_date` in days. Day 0 is the launch date. A negative day is a pre-flight day.
   - A new document sets `launch_date = today + 14 days`, so the first 14 days are the baseline days (`Document::new`).
   - `DueTask { kind, optional }`: `daily_check` is due when today has no complete check. `vision_test` is due when the last test is 7 or more days old or absent. `pvt` is due with `optional: true` when today has no PVT result.
   - Streak: consecutive days with a complete daily check. Count back from today. If today has no complete check, start from yesterday.
2. Symptom without a daily check: `DailyCheck { date, answers: DailyAnswers | null, symptoms, red_flags }`. `answers = null` means "the questionnaire is not complete". `DayView.check` is never null: it is an empty check when the day has no data. The body figure does: `const d = await getDay(date); await saveDailyCheck({ ...d.check, symptoms: [...d.check.symptoms, s] }); await refresh();`. Only a check with `answers` counts for the streak, the due task and the numeric indicators. `save_daily_check` replaces the stored check of that date.
3. Region data: `Assessment.regions` has one `RegionStatus` for each of the 10 regions, in the order of `BodyRegion::ALL`. `RegionStatus { region, level, symptoms, indicators, fired }` is complete: the symptoms of the assessment date in that region, the `IndicatorStatus` of each indicator with `Indicator::body_region() == region`, the fired rules with `body_region == region`, and `level` = the highest level of these fired rules (`ok` if none). For a symptom rule, `FiredRule.body_region` is the region of the symptom. `FiredRule.subject` tells which indicator, symptom kind or red flag fired.
4. Packet preview: `export_packet(path | null)` returns `PacketExport { packet, json, bytes, path }`. With `path = null` it writes nothing: this is the preview. `json` is the exact file content and `bytes` is its size. With a path it writes `json` with `store::write_atomic` and returns the path. The UI gets the path from `api.pickExportPath(defaultName)` (the save dialog of `tauri-plugin-dialog`). A `null` result means that the user cancelled. The packet is always for today.
5. Validation field: `AppError { kind: "validation", errors: FieldError[] }`. `FieldError.field` is the path of the field in the input payload, with the wire names: `answers.sleep_quality`, `symptoms[0].severity`, `date`, `trials[3].rt_ms`, `left.acuity_logmar`, `launch_date`, `calibration.px_per_mm`. A missing calibration at `save_vision_test` gives the field `calibration`. A date after today gives the field `date`. A date before the first baseline day (launch date minus `BASELINE_DAYS`, or today if it is earlier) also gives the field `date`. The UI uses `fieldMessage(error, 'answers.mood')`.
6. Corrupt data file: `Store::open` renames the file, starts with an empty document and keeps the backup path. Each `get_day` then returns `Notice { kind: "data_file_corrupt", backup_path }` in `mission.notices` until the process stops. `App.svelte` shows the banner with a local "Dismiss" button. No lane adds UI for this.
   Invalid `rules.toml`: `AppState.rules` is `Result<RuleSet, RulesError>`. When it is `Err`, each of the 10 commands returns `AppError { kind: "rules", rule_id, message }`. `App.svelte` then shows a blocking screen with the rule id in place of the navigation. A test in the shell or the core must parse the embedded file, so that a bad file fails `cargo test`.
7. Rules source: `commands::RULES_TOML = include_str!("../../../rules/rules.toml")` in `app/src-tauri/src/commands.rs`. `AppState::load` calls `astro_vitals_core::rules::parse(RULES_TOML)`. The core tests use the same `include_str!` in `crates/core/tests/scenarios.rs`.
8. Drift off: `Assessment.drift_enabled` and `Assessment.preflight_days` (pre-flight days with a complete check). `drift_enabled = preflight_days >= MIN_PREFLIGHT_DAYS (7)`. `App.svelte` shows the statement on each screen. An indicator that only has drift rules then has the state `not_enough_data`.

## Other semantics

- `IndicatorState` = `not_enough_data` or a level. `LevelBadge` takes an `IndicatorState`, so a `Level` works too.
- Indicators (15): `sleep_hours`, `sleep_quality`, `mood`, `stress`, `tiredness`, `workload`, `fluid_l`, `exercise_min` (resistive + aerobic), `pvt_mean_rt_ms`, `pvt_lapses`, `pvt_false_starts`, `acuity_left`, `acuity_right`, `amsler_left`, `amsler_right` (1 = distortion, 0 = none). `Indicator::{bad_direction, body_region, unit}` in `model.rs` and `INDICATOR_INFO` in `labels.ts` hold the same static data.
- Assessments are not stored. `evaluate(date | null)` computes each time, so an edit of a past day gives a new evaluation.
- `series(indicator)` returns one point for each day from the first stored day to today. `value` and `mean_7d` are `null` when there is no data. `Series.baseline.median` is the baseline line.
- PVT: the frontend sends `PvtInput { date, trials }`. A trial is `{kind:"response", rt_ms}`, `{kind:"premature"}` (input before the stimulus) or `{kind:"timeout"}` (no input for 30 s). `save_pvt` returns the `PvtResult`. `mean_rt_ms` is `null` when no valid response exists. `stimuli` = trials that are not premature. The store keeps only the result. Constants: `pvt.rs` and `types.ts` (`PVT_*`).
- Vision: the frontend runs the test and sends the final `VisionResult { date, left, right }`. The calibration is `Settings.calibration { px_per_mm }`: the vision screen reads it with `getSettings()` and writes it with `setSettings({ ...settings, calibration })`. `save_vision_test` refuses when the calibration is absent. `load_scenario` keeps the current `settings.calibration`.
- Scenario: `scenario::generate(id, seed, today)` returns a full `Document` with `launch_date = today - MISSION_DAYS`. `scenario::info(id)` is valid for `DEFAULT_SEED`. `load_scenario(id)` uses `DEFAULT_SEED`, replaces the document and returns the `ScenarioInfo` (current mission day, first mission day of each expected level).
- Symptom: `improved` is `null` when not treated or not known. The rule "treated and not improved" fires on `treated && improved == false`.
- Navigation: `navigate(screen, { date?, region?, indicator? })` and `app.route` in `state.svelte.ts`. Screens: `home`, `daily_check`, `trends`, `settings`, `export`, `pvt`, `vision`, `body`.
- Refresh: call `await refresh()` after each successful save, `set_settings` and `load_scenario`. It loads `app.day` and `app.assessment` again and increments `app.revision`. A screen that holds its own data reads `app.revision` in a `$effect` to load again.
- Shared CSS classes in `app.css`: `card`, `row`, `grid`, `btn`, `btn primary`, `field` (with `.help` and `.error`), `banner info|warn|error`, `muted`. Level colors: `--level-ok`, `--level-self-care`, `--level-tell-cmo`, `--level-flight-surgeon`, `--level-none`.
- The source URL of a rule shows as text (`FiredRuleCard`). The app has no plugin that opens a browser.

## rules.toml format

The file has one `[drift]` table (`self_care`, `tell_cmo`: the default drift thresholds) and one `[[rules]]` table for each rule.
Fields: `id`, `indicator`, `kind`, `threshold`, `window_days`, `min_days`, `sustain_days`, `level`, `action`, `explanation`, `body_region`, `source`. An unknown field is an error. Each error names the rule `id`.

| Kind | Indicator | Fires when |
|---|---|---|
| `absolute` | numeric | The mean of `window_days` is past `threshold` in the bad direction. `exercise_min` with no `threshold` uses the setting. |
| `drift` | numeric | The 7-day drift score is at or above `threshold` on each of the last `sustain_days` days (default 1). With no `threshold`: the `[drift]` value of the level. |
| `symptom_duration` | `any` or a symptom kind | The symptom is present on more than `threshold` consecutive days. |
| `symptom_recurrence` | `any` or a symptom kind | `threshold` or more episodes in `window_days`. A day with no check ends an episode. |
| `symptom_unresolved` | `any` or a symptom kind | The check of the day has a symptom with `treated = true` and `improved = false`. |
| `red_flag` | a red flag kind | The check of the day has that red flag. Level `flight_surgeon` and a `body_region` are necessary. |
| `vision_change` | `acuity_*`, `amsler_*` | The last test has a finding that the reference test does not have. |
| `vision_persistent` | `acuity_*`, `amsler_*` | Each of the last 2 tests has the finding. |

- Limits: `window_days`, `min_days`, `sustain_days` from 1 to 365. `min_days` is not more than `window_days`. A `drift` window is always 7 days. `sustain_days` is only for `drift`.
- Vision reference: the latest pre-flight test. Only later tests count. An acuity finding is `threshold` logMAR or more above the reference. With no pre-flight test, the reference is "no distortion" and the acuity rules are `not_enough_data`.
- Packet above 16 384 bytes: `packet::build` removes, in this order, `explanation`, `action` and `source` of the fired rules (lowest level first), then the oldest values and symptoms, then the baselines.
