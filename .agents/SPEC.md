# SPEC: crew-owned daily health check for a Mars transit

Brief: NASA Space Apps 2026, "Create Health Monitoring Software for Astronauts on Space Missions".
Evidence: [RESEARCH.md](./RESEARCH.md). Time budget: about 48 hours. Team: 5 developers (Rust and frontend).

## Goal

Build a desktop tool that one astronaut uses each mission day for about 5 minutes.
The tool records a daily self-check, shows the drift from the personal pre-flight baseline, and gives one escalation level with an action.

Escalation levels, in order:
1. `ok`: no action.
2. `self_care`: the tool gives an action that the crew member does alone.
3. `tell_cmo`: tell the Crew Medical Officer.
4. `flight_surgeon`: export a summary packet for the flight surgeon on Earth.

Why: on a Mars transit a message takes up to 20 minutes one way. The crew gets no trend of its own data today. NASA lists computed medical decision support as an open gap (Med10).

## User

- One crew member for each installation. No accounts, no profiles.
- All data stays on the device. Nothing leaves the device unless the user exports a packet.
- The user is not a physician. Each measurement and each result has a short explanation.
- UI language: English.

## Stack

- Cargo workspace. Rust 1.95.
- `crates/core`: pure logic. No file I/O, no network, no Tauri dependency. Input and output are plain data.
- `app`: Tauri 2 + Svelte 5 + Vite + TypeScript. Package manager: pnpm.
- Persistence: one JSON file in the Tauri app data directory. Write to a temporary file, then rename.
- Charts: one small SVG line component. Add no chart library.
- Random data: deterministic for a given seed on all platforms.

## Files

```
Cargo.toml                      workspace
rules/rules.toml                declarative rules, one source URL each
crates/core/src/lib.rs
crates/core/src/model.rs        DailyCheck, Symptom, BodyRegion, PvtResult, VisionResult, Assessment
crates/core/src/validate.rs     range checks for all user input
crates/core/src/baseline.rs     median, MAD, robust score
crates/core/src/rules.rs        rule types, TOML parse from &str, evaluation
crates/core/src/pvt.rs          PVT-B scoring from raw reaction times
crates/core/src/scenario.rs     seeded mission generator
crates/core/src/packet.rs       escalation summary
crates/core/tests/scenarios.rs  scenario assertions
app/src-tauri/src/main.rs
app/src-tauri/src/store.rs      JSON file load and atomic save
app/src-tauri/src/commands.rs   IPC commands
app/src/                        Svelte UI
.agents/DEMO.md                 manual demo script
```

IPC commands: `get_day`, `save_daily_check`, `save_pvt`, `save_vision_test`, `evaluate`, `series`, `export_packet`, `load_scenario`, `get_settings`, `set_settings`.

Freeze `model.rs` and the command signatures first. The work lanes depend on them.

## Data

Daily check (one for each mission day):
- Sleep start and end, sleep quality 0-10, sleep aid taken (yes or no).
- Scales 0-10: mood, stress, tiredness, workload.
- Fluid intake in litres. Exercise minutes: resistive and aerobic.
- Symptoms: kind, severity 1-3, body region, treated (yes or no), improved after treatment (yes or no).
- Symptom kinds: headache, congestion, skin rash, back pain, nausea, dizziness, vision change, other.
- Red-flag kinds: chest pain, fainting, sudden vision loss, fever, blood in urine, swelling on one side of the neck or face.

PVT-B (optional, one each day):
- Duration 3 minutes. Interval between stimuli: random 1 to 4 seconds.
- The frontend measures each reaction time with `performance.now()` from the stimulus frame to the input event.
- The frontend sends the raw reaction times. The core calculates mean reaction time, lapses, and false starts.
- Lapse: reaction time at or above 355 ms. False start: input before the stimulus or reaction time below 100 ms. Keep the two values as named constants.

Vision test (one each week, each eye):
- Calibration: the user adjusts a rectangle on the screen to the size of a bank card (85.6 mm). Viewing distance: 40 cm.
- Near acuity: tumbling E, steps of 0.1 logMAR, 5 trials for each size, stop below 3 correct.
- Amsler grid: distortion yes or no, and the marked cells.

Mission clock: the settings hold the launch date. Mission day = date minus launch date. Negative days are pre-flight days. One time zone. No daylight saving time.

## Baseline and drift

- Baseline: median and MAD of the 14 pre-flight days, for each numeric indicator.
- Drift score = (mean of the last 7 days - baseline median) / (1.4826 x MAD).
- Each indicator has a bad direction. Only drift in the bad direction counts.
- Default levels: score at or above 2 = `self_care`, at or above 3 = `tell_cmo`. These two values are design selections, not NASA limits. Keep them in `rules.toml`.

## Rules

Each rule in `rules.toml` has: `id`, `indicator`, `kind` (`absolute`, `drift`, `symptom_duration`, `symptom_recurrence`, `red_flag`), `threshold`, `window_days`, `min_days`, `level`, `action`, `explanation`, `body_region`, `source`.
The assessment for a day is the list of rules that fire. The day level is the highest level in the list.

Initial rule set:

| Indicator | Condition | Level | Source |
|---|---|---|---|
| Sleep | 7-day mean below 6 h | `self_care` | Jones 2022 |
| Sleep | 3-day mean below 5 h | `tell_cmo` | Jones 2022 |
| PVT-B lapses, mean reaction time | drift score | by score | design selection |
| Mood, stress, tiredness | drift score for 7 days | `self_care` | Mars-500 |
| Mood, stress, tiredness | drift score at or above 2 for 14 days | `tell_cmo` | design selection |
| Fluid | 3-day mean below 2.5 L | `self_care` | OCHMO MTB-003 |
| Exercise | 7-day total below the prescription (setting, default 90 min each day) | `self_care` | HRP fitness risk |
| A symptom | present more than 7 consecutive days | `tell_cmo` | Crucian, notable event |
| A symptom | 2 or more separate episodes in 30 days | `tell_cmo` | Crucian; the count is a design selection |
| A symptom | treated and not improved | `tell_cmo` | Crucian, notable event |
| Vision | new Amsler distortion, or acuity 0.2 logMAR worse than baseline | `tell_cmo` | design selection |
| Vision | the same finding in 2 consecutive weekly tests | `flight_surgeon` | design selection |
| Red flag | present | `flight_surgeon` | OCHMO VTE and urinary briefs |

Rules marked "design selection" need a medical review. The UI shows a statement: prototype, not a medical device.

## Acceptance criteria

1. `cargo test --workspace` passes. `pnpm --dir app build` passes. `cargo tauri dev` starts the app.
2. `crates/core` has no dependency on Tauri, on the file system, or on the network.
3. The home screen shows the mission day, the day level, the fired rules with action and explanation, and the tasks that are due.
4. The user completes the daily check without the PVT-B in less than 2 minutes. Saved data is present after a restart.
5. The PVT-B runs for 3 minutes and shows mean reaction time, lapses, and false starts. Loss of window focus cancels the test and saves nothing.
6. The vision test refuses to start without calibration. It stores acuity and Amsler results for each eye.
7. The body figure has these regions: head, eyes, neck, chest, abdomen, back, arms, hands, legs, feet. A click on a region shows its symptoms, its indicators, and its level. The user can log a symptom from a region.
8. The trend screen shows each numeric indicator across the mission with the baseline median and the 7-day mean.
9. Each status uses color, an icon, and a text label.
10. Each fired rule shows its explanation and its source URL.
11. The daily check is due each mission day. The vision test is due each 7 days. The home screen shows the streak: consecutive days with a completed daily check. No operating system notification.
12. `export_packet` writes one JSON file of 16 KB or less: mission day, day level, fired rules, 14-day values of the flagged indicators, symptoms of the last 14 days, baseline values. The user sees the content before the export.
13. `load_scenario` replaces the stored data with a seeded mission and sets the mission day. Three scenarios exist: `healthy`, `sleep_debt`, `vision`. Each scenario states the first mission day of each expected level.
14. Each rule in `rules.toml` has a non-empty `source`, `action`, and `explanation`. A test checks this.
15. After the scaffold, run the `context` skill to write `.agents/CONTEXT.md`.

## Edge cases

- Missing days: a rule fires only if the window has `min_days` days with data. If not, the indicator state is "not enough data", not `ok`.
- Fewer than 7 pre-flight days: drift rules are off. Absolute rules stay on. The UI states this.
- MAD = 0: use a minimum scale for each indicator. Do not divide by zero.
- Sleep that goes through midnight: the duration is correct.
- A second save for the same day replaces the first. An edit of a past day causes a new evaluation.
- Input out of range (sleep above 24 h, negative fluid, scale above 10): `validate.rs` rejects it and the UI shows the field.
- A red flag sets `flight_surgeon` immediately. No window and no `min_days` apply.
- PVT-B: no response for 30 seconds ends the trial as a lapse. A cancelled test stores nothing.
- An invalid `rules.toml` stops the start with an error that names the rule `id`.
- A corrupt data file: keep the file, rename it, start with empty data, and tell the user.
- Export cancelled or path not writable: show the error. Leave no partial file.
- A launch date in the future: all days are pre-flight days.

## Out of scope

- Backend, network, accounts, crew profiles, a Crew Medical Officer view, a simulated ground link.
- Real devices, wearable import, simulated sensor streams, camera measurement.
- LLM or other machine learning.
- Radiation dose, cabin CO2, food log, body mass, bone, team conflict questionnaire, journal, medication inventory.
- Rolling in-flight baseline.
- `no_std` build, embedded build, mobile build.
- Operating system notifications, points, badges. Only the streak counter is in scope.
- Encryption of the data file. Translation.
- Medical diagnosis and drug dose advice.

## Verification

1. `cargo test --workspace`. `crates/core/tests/scenarios.rs` asserts for 120 mission days:
   - `healthy`: the day level is `ok` on each day.
   - `sleep_debt`: sleep decreases from day 40 and headaches start on day 50. The first `self_care` day and the first `tell_cmo` day agree with the scenario definition.
   - `vision`: Amsler distortion in weeks 10 and 11. The level is `tell_cmo` after week 10 and `flight_surgeon` after week 11.
   - The same seed gives the same data.
   - The baseline functions give known results on fixed input, with MAD = 0 included.
   - The packet for the `sleep_debt` scenario is 16 KB or less.
2. `pnpm --dir app build`.
3. Do the steps in `.agents/DEMO.md` by hand: load `sleep_debt`, read the home screen, open the body figure, open the trends, do one daily check, do one PVT-B, export a packet, restart, confirm the data.

## Work lanes

Five lanes can run in parallel after `model.rs` and the command signatures are frozen:
1. Core: baseline, rules engine, validation.
2. Core: scenarios, packet, tests, rule content with sources.
3. App shell: Tauri setup, store, commands.
4. UI: daily check, home screen, trends.
5. UI: PVT-B, vision test, body figure.
