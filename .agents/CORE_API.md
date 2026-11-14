# Core API (`crates/core`, crate `astro_core`)

This file is the reference for the frozen core types and the `rules.toml` format.
The UI lanes, the app shell, and the rules author read it.
The crate has no file I/O, no network, and no Tauri dependency.
All serde names are `snake_case`. JSON over IPC uses the same names.

## Modules

| Module | Content |
|---|---|
| `model` | All data types. Frozen. |
| `validate` | Range checks for user input. |
| `baseline` | Median, MAD, robust score, baseline, drift score, series. |
| `rules` | Rule types, `parse_rules`, `evaluate`. |
| `pvt` | PVT-B scoring from raw reaction times. |
| `clock` | Mission day from ISO dates. |

## Types (`model`)

- `MissionDay = i32`. Day 0 is the launch date. A negative day is a pre-flight day.
- `Level`: `ok` < `self_care` < `tell_cmo` < `flight_surgeon`.
- `SymptomKind`: `headache`, `congestion`, `skin_rash`, `back_pain`, `nausea`, `dizziness`, `vision_change`, `other`.
  Red-flag kinds: `chest_pain`, `fainting`, `sudden_vision_loss`, `fever`, `blood_in_urine`, `neck_face_swelling`.
  `SymptomKind::all()` gives all 14 kinds. `is_red_flag()` is true for the last 6.
- `BodyRegion`: `head`, `eyes`, `neck`, `chest`, `abdomen`, `back`, `arms`, `hands`, `legs`, `feet`.
- `Symptom { kind, severity (1-3), region, treated, improved }`.
- `DailyCheck { day, sleep_start_min, sleep_end_min, sleep_quality, sleep_aid, mood, stress, tiredness, workload, fluid_l, resistive_min, aerobic_min, symptoms }`.
  - Sleep times are minutes after local midnight, 0 to 1439.
  - An end time at or before the start time is on the next day. `sleep_hours()` gives the duration.
  - `exercise_min()` gives `resistive_min + aerobic_min`.
- `PvtSubmission { day, reaction_times_ms, early_inputs }`: raw input from the frontend.
  Send a 30 s no-response trial as `30000.0`. `early_inputs` counts inputs before the stimulus.
- `PvtResult { day, trials, mean_rt_ms, lapses, false_starts }`: output of `pvt::score`.
- `Eye`: `left`, `right`. `EyeResult { acuity_logmar, amsler_distortion, amsler_cells: [[x, y], ...] }`.
- `VisionTest { day, left, right }`.
- `Settings { launch_date: "YYYY-MM-DD", exercise_prescription_min }`. Default: `"2027-01-01"`, `90.0`.
- `MissionData { checks, pvt, vision }`. Use `upsert_check`, `upsert_pvt`, `upsert_vision`.
  A second save for the same day replaces the first. The lists stay sorted by day.
- `IndicatorState`: `not_enough_data`, `ok`, `flagged`.
- `IndicatorStatus { indicator, state, level, baseline_median, baseline_mad, mean_7d, drift_score }`.
- `FiredRule { rule_id, indicator, level, action, explanation, source, body_region, symptom, value }`.
- `Assessment { day, level, fired, indicators, drift_enabled, preflight_days }`.
  - `fired` is sorted from the highest level to the lowest level.
  - `indicators` has one entry for each numeric indicator, in the order of the table below.
- `SeriesPoint { day, value, mean_7d }`. `Series { indicator, points, baseline_median }`.

## Functions

| Function | Result |
|---|---|
| `rules::parse_rules(&str)` | `Result<RuleSet, RuleError>`. `RuleError { rule_id, message }`. `Display` names the rule id. |
| `rules::evaluate(day, &MissionData, &RuleSet, &Settings)` | `Assessment` for that day. |
| `baseline::series(&MissionData, indicator, from, to)` | `Series`, one point for each day from `from` to `to`. |
| `baseline::baseline(&MissionData, indicator)` | `Option<Baseline { median, mad, n }>` from days -14 to -1. |
| `pvt::score(&PvtSubmission)` | `PvtResult`. |
| `validate::validate_check`, `validate_pvt`, `validate_vision` | `Result<(), Vec<ValidationError { field, message }>>`. |
| `clock::mission_day(date, launch)` | `Result<i32, ClockError>`. Dates are `YYYY-MM-DD`. |
| `clock::date_for_day(launch, day)` | `Result<String, ClockError>`: the date of a mission day. |

## Indicators

| Indicator | Value for a day | Bad direction | Minimum scale |
|---|---|---|---|
| `sleep_hours` | `DailyCheck::sleep_hours()` | low | 0.25 |
| `sleep_quality` | `sleep_quality` (0-10) | low | 0.5 |
| `mood` | `mood` (0-10) | low | 0.5 |
| `stress` | `stress` (0-10) | high | 0.5 |
| `tiredness` | `tiredness` (0-10) | high | 0.5 |
| `workload` | `workload` (0-10) | high | 0.5 |
| `fluid_l` | `fluid_l` | low | 0.1 |
| `exercise_min` | `resistive_min + aerobic_min` | low | 5.0 |
| `pvt_mean_rt` | `PvtResult::mean_rt_ms`. No value if it is 0. | high | 10.0 |
| `pvt_lapses` | `PvtResult::lapses` | high | 0.5 |
| `symptom` | not numeric | - | - |
| `red_flag` | not numeric | - | - |
| `vision` | not numeric | - | - |

A day without a check (or without a PVT-B result) has no value. Window means use only the days with a value.

## Baseline and drift

- Baseline: median and MAD (not scaled) of the days -14 to -1 that have a value.
- Drift score = (mean of the last 7 days - baseline median) / max(1.4826 x MAD, minimum scale).
- The sign of the score is changed for a "low" indicator. A positive score is always in the bad direction.
- If an indicator has fewer than 7 pre-flight days with a value, its drift score is `None`.
- `drift_enabled` is true if one or more numeric indicators have 7 or more pre-flight days.
- `preflight_days` is the highest number of pre-flight days with a value for one numeric indicator.

## `rules.toml` format

The file has one top-level array of tables: `[[rules]]`. Each table is one rule.

| Field | Type | Required | Note |
|---|---|---|---|
| `id` | string | yes | Unique. Errors name this id. |
| `indicator` | string | yes | See the indicator table. Must agree with `kind`. |
| `kind` | string | yes | See the kinds below. |
| `threshold` | number | by kind | Finite. |
| `window_days` | integer | by kind | 1 to 365. |
| `min_days` | integer | no | 1 to 365. Not more than `window_days`. For `drift`: not more than 7. |
| `sustain_days` | integer | no | 1 to 365. Only `drift` uses it. Default 1. |
| `level` | string | yes | `ok`, `self_care`, `tell_cmo`, `flight_surgeon`. |
| `action` | string | yes | Not empty. |
| `explanation` | string | yes | Not empty. |
| `body_region` | string | no | Copied to the fired rule when the kind does not set a region. |
| `source` | string | yes | Not empty. A URL. |

An unknown field is an error. Use a TOML comment for notes.

### Kinds

The SPEC lists 5 kinds. The rule table in the SPEC needs 3 more kinds: `symptom_unresolved`, `vision_change`, `vision_persistent`.

| Kind | Indicator | Needs | Fires when |
|---|---|---|---|
| `absolute` | numeric | `threshold`, `window_days` | The mean over `window_days` that end on the day is past `threshold` in the bad direction (low: `<`, high: `>`). |
| `drift` | numeric | `threshold` | The drift score is at or above `threshold` on each of the last `sustain_days` days. |
| `symptom_duration` | `symptom` | `threshold` | A symptom kind is present on more than `threshold` consecutive days that end on the day. |
| `symptom_recurrence` | `symptom` | `threshold`, `window_days` | A symptom kind has `threshold` or more episodes in the last `window_days` days. |
| `symptom_unresolved` | `symptom` | - | The check of the day has a symptom that is treated and not improved. |
| `red_flag` | `red_flag` | - | The check of the day has a red-flag symptom. |
| `vision_change` | `vision` | `threshold` | The latest test has a new Amsler distortion, or acuity `threshold` logMAR worse than the reference. |
| `vision_persistent` | `vision` | - | The latest 2 tests have the same finding (same eye, same type). |

Details:
- `absolute`: the window needs `min_days` days with a value. The default `min_days` is `window_days`.
  With fewer days, the rule does not fire and the indicator state is `not_enough_data`.
  The fired value is the window mean.
- `absolute` on `exercise_min` with no `threshold` uses `Settings::exercise_prescription_min`.
  The mean is for each day, so the rule compares the daily mean with the daily prescription.
- `drift`: the score uses the 7 days that end on the day. The default `min_days` is 4.
  A day with no score stops the sustain count. The fired value is the score of the day.
  The rule does not fire if the indicator has fewer than 7 pre-flight days.
- `symptom_duration`: a day without a check stops the run. One fired rule for each kind.
  The fired value is the run length. `body_region` is the region of the symptom on the day.
- `symptom_recurrence`: an episode is a run of consecutive days with the kind.
  A day without the kind (or without a check) ends the episode. The count uses only the days in the window.
  The rule stays on while 2 episodes are in the window, also on days without the symptom.
  One fired rule for each kind. The fired value is the episode count.
- `symptom_unresolved` and `red_flag`: no window and no `min_days`. One fired rule for each symptom.
  `body_region` is the symptom region. The fired value is the severity.
- `vision_change` and `vision_persistent`: the reference test is the latest pre-flight test (day < 0).
  If no pre-flight test exists, the reference is the first test. Only tests after the reference and on or before the day count.
  The acuity finding is: acuity >= reference acuity + step. `vision_persistent` uses `threshold` as the step, default 0.2.
  `body_region` is `eyes`. The fired value is the largest acuity change of the 2 eyes.
- The day level is the highest level of the fired rules. With no fired rule, the level is `ok`.
- The indicator state is `flagged` if a fired rule has that indicator.
  It is `not_enough_data` if the 7-day window has no value, or an `absolute` rule on it has too few days.

### Examples (one of each kind)

```toml
[[rules]]
id = "sleep_mean_7d"
indicator = "sleep_hours"
kind = "absolute"
threshold = 6.0
window_days = 7
min_days = 5
level = "self_care"
action = "Go to bed earlier. Keep the same sleep time each day."
explanation = "Your mean sleep for the last 7 days is less than 6 hours."
source = "https://example.org/jones-2022"

[[rules]]
id = "stress_drift_self_care"
indicator = "stress"
kind = "drift"
threshold = 2.0
sustain_days = 7
level = "self_care"
action = "Use a stress control method. Talk to a crew member."
explanation = "Your stress is higher than your pre-flight baseline for 7 days."
source = "https://example.org/mars-500"

[[rules]]
id = "symptom_long"
indicator = "symptom"
kind = "symptom_duration"
threshold = 7
level = "tell_cmo"
action = "Tell the Crew Medical Officer."
explanation = "A symptom is present for more than 7 days."
source = "https://example.org/crucian"

[[rules]]
id = "symptom_recurrent"
indicator = "symptom"
kind = "symptom_recurrence"
threshold = 2
window_days = 30
level = "tell_cmo"
action = "Tell the Crew Medical Officer."
explanation = "A symptom came back 2 or more times in 30 days."
source = "https://example.org/crucian"

[[rules]]
id = "symptom_not_improved"
indicator = "symptom"
kind = "symptom_unresolved"
level = "tell_cmo"
action = "Tell the Crew Medical Officer."
explanation = "A treated symptom did not improve."
source = "https://example.org/crucian"

[[rules]]
id = "red_flag"
indicator = "red_flag"
kind = "red_flag"
level = "flight_surgeon"
action = "Tell the Crew Medical Officer now. Export a packet for the flight surgeon."
explanation = "This symptom can be a sign of a serious condition."
source = "https://example.org/ochmo"

[[rules]]
id = "vision_new_finding"
indicator = "vision"
kind = "vision_change"
threshold = 0.2
level = "tell_cmo"
action = "Tell the Crew Medical Officer. Do the vision test again in 7 days."
explanation = "Your vision test shows a change from your pre-flight test."
source = "https://example.org/design-selection"

[[rules]]
id = "vision_same_finding_twice"
indicator = "vision"
kind = "vision_persistent"
threshold = 0.2
level = "flight_surgeon"
action = "Export a packet for the flight surgeon."
explanation = "Two vision tests in sequence show the same change."
source = "https://example.org/design-selection"
```

The example URLs are placeholders. The rules author puts the real URLs in `rules/rules.toml`.

## Validation fields

`ValidationError.field` is the struct field name. The UI uses it to mark the input.

| Function | Fields | Limits |
|---|---|---|
| `validate_check` | `sleep_start_min`, `sleep_end_min` | 0 to 1439. Sleep must be more than 0 h. |
| | `sleep_quality`, `mood`, `stress`, `tiredness`, `workload` | 0 to 10 |
| | `fluid_l` | 0 to 10 L, finite |
| | `resistive_min`, `aerobic_min` | 0 to 600 |
| | `symptoms` | Severity 1 to 3. One entry for each kind on a day. |
| `validate_pvt` | `reaction_times_ms` | 1 or more values. Each value 0 to 30000, finite. |
| `validate_vision` | `left.acuity_logmar`, `right.acuity_logmar` | -0.3 to 1.6, finite |
| | `left.amsler_cells`, `right.amsler_cells` | Each coordinate 0 to 19 |

A zero sleep duration (start equal to end) gives an error on `sleep_end_min`.

## PVT-B scoring

- `pvt::LAPSE_MS = 355.0`. A reaction time at or above this value is a lapse.
- `pvt::FALSE_START_MS = 100.0`. A reaction time below this value is a false start.
- `false_starts = early_inputs + count(rt < 100)`.
- `mean_rt_ms` is the mean of all reaction times at or above 100 ms. A 30000 ms no-response trial is in the mean.
- `mean_rt_ms` is 0 if no valid trial exists. Then `pvt_mean_rt` has no value for that day.
- `trials` is the number of reaction times.

## Mission clock

- `clock::mission_day("2027-01-10", "2027-01-01")` gives `9`. A date before launch gives a negative day.
- The functions reject a bad format, a month out of 1-12, and a day that is not in the month.
- One time zone. No daylight saving time.
