use std::ops::Range;

use astro_vitals_core::baseline::{
    baseline, mad, median, robust_score, sleep_hours, value, window_mean,
};
use astro_vitals_core::mission::mission_day;
use astro_vitals_core::model::{
    AmslerCell, Assessment, Baseline, BodyRegion, Calibration, DailyAnswers, DailyCheck, Document,
    EyeResult, Indicator, IndicatorState, IndicatorStatus, Level, PvtInput, PvtResult, PvtTrial,
    RedFlagKind, RuleSubject, RulesError, Symptom, SymptomKind, ValidationError, VisionResult,
};
use astro_vitals_core::rules::{self, RuleKind, RuleSet, evaluate};
use astro_vitals_core::{pvt, validate};
use chrono::{NaiveDate, TimeDelta};

const RULES_TOML: &str = include_str!("../../../rules/rules.toml");
const DRIFT_TABLE: &str = "[drift]\nself_care = 2.0\ntell_cmo = 3.0\n";

fn launch() -> NaiveDate {
    NaiveDate::from_ymd_opt(2027, 1, 1).unwrap()
}

fn day(n: i32) -> NaiveDate {
    launch() + TimeDelta::days(n.into())
}

fn ymd(y: i32, m: u32, d: u32) -> NaiveDate {
    NaiveDate::from_ymd_opt(y, m, d).unwrap()
}

fn rule_toml(id: &str, fields: &str) -> String {
    format!(
        r#"
[[rules]]
id = "{id}"
{fields}
action = "Act."
explanation = "Why."
source = "https://example.org/source"
"#
    )
}

fn parse(src: &str) -> Result<RuleSet, RulesError> {
    rules::parse(&format!("{DRIFT_TABLE}{src}"))
}

fn rule_set(src: &str) -> RuleSet {
    parse(src).unwrap_or_else(|e| panic!("{e}"))
}

fn real_rules() -> RuleSet {
    rules::parse(RULES_TOML).unwrap()
}

fn doc() -> Document {
    Document::new(day(-14))
}

fn answers() -> DailyAnswers {
    DailyAnswers {
        sleep_start_min: 1380,
        sleep_end_min: 420,
        sleep_quality: 7,
        sleep_aid: false,
        mood: 7,
        stress: 3,
        tiredness: 3,
        workload: 5,
        fluid_l: 2.5,
        exercise_resistive_min: 30,
        exercise_aerobic_min: 30,
    }
}

fn check(n: i32) -> DailyCheck {
    DailyCheck {
        answers: Some(answers()),
        ..DailyCheck::empty(day(n))
    }
}

fn put(doc: &mut Document, days: Range<i32>, edit: impl Fn(&mut DailyAnswers)) {
    for n in days {
        let mut check = check(n);
        edit(check.answers.as_mut().unwrap());
        doc.checks.insert(day(n), check);
    }
}

fn sleep_min(minutes: u16) -> impl Fn(&mut DailyAnswers) {
    move |a| a.sleep_end_min = (1380 + minutes) % 1440
}

fn eye(acuity_logmar: f64, amsler_distortion: bool) -> EyeResult {
    EyeResult {
        acuity_logmar,
        amsler_distortion,
        amsler_cells: Vec::new(),
    }
}

fn vision(doc: &mut Document, n: i32, left: EyeResult, right: EyeResult) {
    let date = day(n);
    doc.vision.insert(date, VisionResult { date, left, right });
}

fn ids(a: &Assessment) -> Vec<&str> {
    a.fired.iter().map(|f| f.rule_id.as_str()).collect()
}

fn status(a: &Assessment, indicator: Indicator) -> &IndicatorStatus {
    a.indicators
        .iter()
        .find(|i| i.indicator == indicator)
        .unwrap()
}

fn fields(result: Result<(), ValidationError>) -> Vec<String> {
    match result {
        Ok(()) => Vec::new(),
        Err(e) => e.errors.into_iter().map(|f| f.field).collect(),
    }
}

fn stress_mission() -> Document {
    let mut d = doc();
    put(&mut d, -14..10, |_| {});
    for n in -14i32..10 {
        let stress = if n >= 0 {
            9
        } else if n.rem_euclid(2) == 0 {
            3
        } else {
            4
        };
        d.checks
            .get_mut(&day(n))
            .unwrap()
            .answers
            .as_mut()
            .unwrap()
            .stress = stress;
    }
    d
}

fn stress_drift(fields: &str) -> RuleSet {
    let base = "indicator = \"stress\"\nkind = \"drift\"\nthreshold = 2.0\nlevel = \"self_care\"\n";
    rule_set(&rule_toml("stress_drift", &format!("{base}{fields}")))
}

#[test]
fn mad_gives_known_values() {
    assert_eq!(mad(&[1.0, 1.0, 2.0, 2.0, 4.0, 6.0, 9.0]), Some(1.0));
    assert_eq!(mad(&[2.0, 4.0, 6.0, 8.0]), Some(2.0));
    assert_eq!(median(&[2.0, 4.0, 6.0, 8.0]), Some(5.0));
    let score = robust_score(7.0, 5.0, 1.0, 0.5);
    assert!((score - 2.0 / 1.4826).abs() < 1e-9);
    let score = robust_score(6.0, 5.0, 0.0, 0.5);
    assert!(score.is_finite());
    assert_eq!(score, 2.0);
}

#[test]
fn the_baseline_uses_the_preflight_days() {
    let mut d = doc();
    put(&mut d, -14..0, |_| {});
    put(&mut d, 0..10, sleep_min(360));
    assert_eq!(
        baseline(&d, Indicator::SleepHours),
        Some(Baseline {
            median: 8.0,
            mad: 0.0,
            days: 14
        })
    );
}

#[test]
fn sleep_hours_at_midnight_and_zero_length() {
    assert_eq!(sleep_hours(1410, 0), 0.5);
    assert_eq!(sleep_hours(300, 300), 0.0);
}

#[test]
fn a_window_mean_skips_missing_days() {
    let mut d = doc();
    put(&mut d, -14..10, |_| {});
    d.checks.remove(&day(5));
    assert_eq!(window_mean(&d, Indicator::Stress, day(9), 7, 1), Some(3.0));
    assert_eq!(window_mean(&d, Indicator::Stress, day(9), 7, 6), Some(3.0));
    assert_eq!(window_mean(&d, Indicator::Stress, day(9), 7, 7), None);
}

#[test]
fn value_reads_the_pvt_result_of_the_day() {
    let mut d = doc();
    d.checks.insert(day(1), check(1));
    d.pvt.insert(
        day(1),
        PvtResult {
            date: day(1),
            stimuli: 40,
            mean_rt_ms: Some(280.0),
            lapses: 2,
            false_starts: 1,
        },
    );
    assert_eq!(value(&d, Indicator::ExerciseMin, day(1)), Some(60.0));
    assert_eq!(value(&d, Indicator::PvtLapses, day(1)), Some(2.0));
    assert_eq!(value(&d, Indicator::PvtMeanRtMs, day(1)), Some(280.0));
    assert_eq!(value(&d, Indicator::PvtFalseStarts, day(1)), Some(1.0));
    assert_eq!(value(&d, Indicator::Mood, day(2)), None);
    assert_eq!(value(&d, Indicator::PvtLapses, day(2)), None);
}

#[test]
fn mission_day_counts_calendar_days() {
    assert_eq!(mission_day(launch(), ymd(2027, 1, 1)), 0);
    assert_eq!(mission_day(launch(), ymd(2026, 12, 31)), -1);
    assert_eq!(mission_day(launch(), ymd(2026, 12, 18)), -14);
    assert_eq!(mission_day(launch(), ymd(2027, 3, 1)), 59);
    assert_eq!(mission_day(ymd(2028, 2, 28), ymd(2028, 3, 1)), 2);
}

#[test]
fn drift_counts_only_in_the_bad_direction() {
    let src = format!(
        "{}{}",
        rule_toml(
            "sleep_drift",
            "indicator = \"sleep_hours\"\nkind = \"drift\"\nthreshold = 2.0\nlevel = \"self_care\"\n"
        ),
        rule_toml(
            "stress_drift",
            "indicator = \"stress\"\nkind = \"drift\"\nthreshold = 2.0\nlevel = \"self_care\"\n"
        )
    );
    let set = rule_set(&src);

    let mut bad = doc();
    put(&mut bad, -14..0, |_| {});
    put(&mut bad, 0..10, |a| {
        sleep_min(360)(a);
        a.stress = 8;
    });
    let a = evaluate(&bad, &set, day(9));
    assert_eq!(ids(&a), ["sleep_drift", "stress_drift"]);
    assert_eq!(status(&a, Indicator::SleepHours).drift_score, Some(-4.0));
    assert_eq!(status(&a, Indicator::Stress).drift_score, Some(5.0));
    assert_eq!(a.fired[0].value, Some(-4.0));
    assert_eq!(
        status(&a, Indicator::SleepHours).state,
        IndicatorState::SelfCare
    );

    let mut good = doc();
    put(&mut good, -14..0, |_| {});
    put(&mut good, 0..10, |a| {
        sleep_min(600)(a);
        a.stress = 0;
    });
    let a = evaluate(&good, &set, day(9));
    assert!(a.fired.is_empty());
    assert_eq!(status(&a, Indicator::SleepHours).drift_score, Some(4.0));
    assert_eq!(status(&a, Indicator::Stress).drift_score, Some(-3.0));
    assert_eq!(status(&a, Indicator::SleepHours).state, IndicatorState::Ok);
    assert_eq!(status(&a, Indicator::Stress).state, IndicatorState::Ok);
}

#[test]
fn drift_with_sustain_days_needs_the_score_on_each_day() {
    let data = stress_mission();
    let once = stress_drift("");
    assert!(evaluate(&data, &once, day(1)).fired.is_empty());
    assert_eq!(ids(&evaluate(&data, &once, day(2))), ["stress_drift"]);

    let set = stress_drift("sustain_days = 3\n");
    for n in 2..4 {
        let a = evaluate(&data, &set, day(n));
        assert!(a.drift_enabled);
        assert_eq!(a.preflight_days, 14);
        assert!(a.fired.is_empty(), "day {n}");
    }
    let a = evaluate(&data, &set, day(4));
    assert_eq!(ids(&a), ["stress_drift"]);
    assert!(a.fired[0].value.unwrap() >= 2.0);
    let stress = status(&a, Indicator::Stress);
    assert_eq!(stress.state, IndicatorState::SelfCare);
    assert_eq!(stress.baseline.map(|b| b.median), Some(3.5));
}

#[test]
fn the_status_drift_score_uses_the_rule_min_days() {
    let set = stress_drift("min_days = 3\n");
    let mut data = stress_mission();
    for n in 0..4 {
        data.checks.remove(&day(n));
    }
    let a = evaluate(&data, &set, day(6));
    assert_eq!(ids(&a), ["stress_drift"]);
    let stress = status(&a, Indicator::Stress);
    assert_eq!(stress.drift_score, Some(5.5));
    assert_eq!(stress.state, IndicatorState::SelfCare);

    data.checks.remove(&day(4));
    let a = evaluate(&data, &set, day(6));
    assert!(a.fired.is_empty());
    let stress = status(&a, Indicator::Stress);
    assert_eq!(stress.drift_score, None);
    assert_eq!(stress.state, IndicatorState::NotEnoughData);
}

#[test]
fn an_absolute_rule_fires_below_the_threshold_and_needs_min_days() {
    let fields = "indicator = \"sleep_hours\"\nkind = \"absolute\"\nthreshold = 6.0\nwindow_days = 7\nmin_days = 5\nlevel = \"self_care\"\n";
    let set = rule_set(&rule_toml("sleep_7d", fields));

    let mut d = doc();
    put(&mut d, 0..7, sleep_min(300));
    let a = evaluate(&d, &set, day(6));
    assert_eq!(ids(&a), ["sleep_7d"]);
    assert_eq!(a.level, Level::SelfCare);
    assert_eq!(a.fired[0].value, Some(5.0));
    assert_eq!(
        a.fired[0].subject,
        RuleSubject::Indicator(Indicator::SleepHours)
    );
    assert_eq!(
        status(&a, Indicator::SleepHours).state,
        IndicatorState::SelfCare
    );

    let mut d = doc();
    put(&mut d, 0..7, sleep_min(480));
    let a = evaluate(&d, &set, day(6));
    assert!(a.fired.is_empty());
    assert_eq!(a.level, Level::Ok);
    assert_eq!(status(&a, Indicator::SleepHours).state, IndicatorState::Ok);

    let mut d = doc();
    put(&mut d, 4..7, sleep_min(240));
    let a = evaluate(&d, &set, day(6));
    assert!(a.fired.is_empty());
    assert_eq!(a.level, Level::Ok);
    assert_eq!(
        status(&a, Indicator::SleepHours).state,
        IndicatorState::NotEnoughData
    );

    let empty = evaluate(&doc(), &set, day(6));
    assert_eq!(empty.indicators.len(), Indicator::ALL.len());
    assert!(
        empty
            .indicators
            .iter()
            .all(|i| i.state == IndicatorState::NotEnoughData)
    );
}

#[test]
fn one_evaluable_absolute_rule_gives_a_state() {
    let short = "indicator = \"sleep_hours\"\nkind = \"absolute\"\nthreshold = 5.0\nwindow_days = 3\nlevel = \"tell_cmo\"\n";
    let long = "indicator = \"sleep_hours\"\nkind = \"absolute\"\nthreshold = 6.0\nwindow_days = 7\nmin_days = 5\nlevel = \"self_care\"\n";
    let set = rule_set(&format!(
        "{}{}",
        rule_toml("sleep_3d", short),
        rule_toml("sleep_7d", long)
    ));
    let mut d = doc();
    put(&mut d, 4..7, sleep_min(480));
    let a = evaluate(&d, &set, day(6));
    assert!(a.fired.is_empty());
    assert_eq!(status(&a, Indicator::SleepHours).state, IndicatorState::Ok);
}

#[test]
fn the_rule_body_region_replaces_the_indicator_region() {
    let fields = "indicator = \"fluid_l\"\nkind = \"absolute\"\nthreshold = 3.0\nwindow_days = 3\nlevel = \"self_care\"\n";
    let mut d = doc();
    put(&mut d, 0..3, |_| {});

    let set = rule_set(&rule_toml("fluid", fields));
    let a = evaluate(&d, &set, day(2));
    assert_eq!(ids(&a), ["fluid"]);
    assert_eq!(a.fired[0].body_region, Some(BodyRegion::Abdomen));

    let set = rule_set(&rule_toml(
        "fluid",
        &format!("{fields}body_region = \"hands\"\n"),
    ));
    let a = evaluate(&d, &set, day(2));
    assert_eq!(a.fired[0].body_region, Some(BodyRegion::Hands));
    let hands = a
        .regions
        .iter()
        .find(|r| r.region == BodyRegion::Hands)
        .unwrap();
    assert_eq!(hands.level, Level::SelfCare);
}

#[test]
fn an_amsler_distortion_of_the_left_eye_in_2_weekly_tests() {
    let set = real_rules();
    let mut d = doc();
    vision(&mut d, -7, eye(0.0, false), eye(0.1, false));
    vision(&mut d, 63, eye(0.0, false), eye(0.1, false));
    vision(&mut d, 70, eye(0.0, true), eye(0.1, false));
    vision(&mut d, 77, eye(0.0, true), eye(0.1, false));
    assert_eq!(evaluate(&d, &set, day(69)).level, Level::Ok);
    let week10 = evaluate(&d, &set, day(70));
    assert_eq!(ids(&week10), ["amsler_left_distortion"]);
    assert_eq!(week10.fired[0].body_region, Some(BodyRegion::Eyes));
    assert_eq!(evaluate(&d, &set, day(76)).level, Level::TellCmo);
    let week11 = evaluate(&d, &set, day(77));
    assert_eq!(week11.level, Level::FlightSurgeon);
    assert_eq!(
        ids(&week11),
        ["amsler_left_distortion_2_tests", "amsler_left_distortion"]
    );
}

#[test]
fn an_acuity_step_of_0_2_fires_and_2_different_findings_are_not_persistent() {
    let set = real_rules();
    let mut d = doc();
    vision(&mut d, -3, eye(0.0, false), eye(0.1, false));
    vision(&mut d, 7, eye(0.1, false), eye(0.3, false));
    vision(&mut d, 14, eye(0.0, true), eye(0.1, false));
    let first = evaluate(&d, &set, day(7));
    assert_eq!(ids(&first), ["acuity_right_worse"]);
    assert_eq!(first.level, Level::TellCmo);
    let second = evaluate(&d, &set, day(14));
    assert_eq!(ids(&second), ["amsler_left_distortion"]);
    assert_eq!(second.level, Level::TellCmo);
}

#[test]
fn pvt_counts_lapses_and_false_starts() {
    let mut trials: Vec<PvtTrial> = [250.0, 355.0, 80.0, 300.0, 400.0]
        .map(|rt_ms| PvtTrial::Response { rt_ms })
        .to_vec();
    trials.extend([PvtTrial::Premature, PvtTrial::Premature]);
    let result = pvt::score(&PvtInput {
        date: day(3),
        trials,
    });
    assert_eq!(result.date, day(3));
    assert_eq!(result.stimuli, 5);
    assert_eq!(result.lapses, 2);
    assert_eq!(result.false_starts, 3);
    assert_eq!(result.mean_rt_ms, Some(326.25));
}

#[test]
fn pvt_with_no_valid_response_has_no_mean() {
    let result = pvt::score(&PvtInput {
        date: day(3),
        trials: vec![
            PvtTrial::Response { rt_ms: 50.0 },
            PvtTrial::Response { rt_ms: 20.0 },
            PvtTrial::Premature,
        ],
    });
    assert_eq!(result.stimuli, 2);
    assert_eq!(result.false_starts, 3);
    assert_eq!(result.lapses, 0);
    assert_eq!(result.mean_rt_ms, None);
}

#[test]
fn validation_names_each_field_out_of_range() {
    let today = day(10);

    let mut c = check(4);
    let a = c.answers.as_mut().unwrap();
    a.sleep_start_min = 1440;
    a.sleep_end_min = 2000;
    assert_eq!(
        fields(validate::daily_check(&c, launch(), today)),
        ["answers.sleep_start_min", "answers.sleep_end_min"]
    );

    let mut c = check(4);
    let a = c.answers.as_mut().unwrap();
    a.mood = 11;
    a.workload = 200;
    a.fluid_l = -0.5;
    a.exercise_aerobic_min = 1441;
    assert_eq!(
        fields(validate::daily_check(&c, launch(), today)),
        [
            "answers.mood",
            "answers.workload",
            "answers.fluid_l",
            "answers.exercise_aerobic_min"
        ]
    );

    let mut c = check(4);
    c.answers.as_mut().unwrap().fluid_l = f64::INFINITY;
    assert_eq!(
        fields(validate::daily_check(&c, launch(), today)),
        ["answers.fluid_l"]
    );

    let mut c = check(4);
    let headache = Symptom {
        kind: SymptomKind::Headache,
        severity: 2,
        region: BodyRegion::Head,
        treated: false,
        improved: None,
    };
    c.symptoms.push(headache.clone());
    c.symptoms.push(Symptom {
        severity: 0,
        ..headache
    });
    assert_eq!(
        fields(validate::daily_check(&c, launch(), today)),
        ["symptoms[1].severity"]
    );

    let response = |rt_ms| PvtTrial::Response { rt_ms };
    let good = PvtInput {
        date: day(1),
        trials: vec![response(250.0), response(30_000.0), response(0.0)],
    };
    assert_eq!(validate::pvt_input(&good, launch(), today), Ok(()));
    let bad = PvtInput {
        date: day(1),
        trials: vec![
            response(250.0),
            response(30_000.5),
            response(-1.0),
            response(f64::NAN),
        ],
    };
    assert_eq!(
        fields(validate::pvt_input(&bad, launch(), today)),
        ["trials[1].rt_ms", "trials[2].rt_ms", "trials[3].rt_ms"]
    );

    let calibration = Calibration { px_per_mm: 4.0 };
    let with_cells = |acuity_logmar, cells: &[(u8, u8)]| EyeResult {
        acuity_logmar,
        amsler_distortion: !cells.is_empty(),
        amsler_cells: cells
            .iter()
            .map(|&(row, col)| AmslerCell { row, col })
            .collect(),
    };
    let good = VisionResult {
        date: day(7),
        left: with_cells(0.0, &[]),
        right: with_cells(1.6, &[(0, 19), (19, 0)]),
    };
    assert_eq!(
        validate::vision_result(&good, Some(&calibration), launch(), today),
        Ok(())
    );
    let bad = VisionResult {
        date: day(7),
        left: with_cells(2.1, &[]),
        right: with_cells(f64::NAN, &[(20, 0)]),
    };
    assert_eq!(
        fields(validate::vision_result(
            &bad,
            Some(&calibration),
            launch(),
            today
        )),
        [
            "left.acuity_logmar",
            "right.acuity_logmar",
            "right.amsler_cells[0]"
        ]
    );
}

#[test]
fn the_parser_reads_each_kind() {
    let src = r#"
[[rules]]
id = "sleep_7d"
indicator = "sleep_hours"
kind = "absolute"
threshold = 6.0
window_days = 7
min_days = 5
level = "self_care"
action = "Sleep more."
explanation = "Low sleep."
source = "https://example.org/a"

[[rules]]
id = "stress_drift"
indicator = "stress"
kind = "drift"
threshold = 2.0
sustain_days = 7
level = "self_care"
action = "Talk."
explanation = "Stress drift."
source = "https://example.org/b"

[[rules]]
id = "symptom_long"
indicator = "any"
kind = "symptom_duration"
threshold = 7
level = "tell_cmo"
action = "Tell the CMO."
explanation = "Long symptom."
source = "https://example.org/c"

[[rules]]
id = "red"
indicator = "chest_pain"
kind = "red_flag"
level = "flight_surgeon"
body_region = "chest"
action = "Call."
explanation = "Red flag."
source = "https://example.org/d"
"#;
    let set = rule_set(src);
    assert_eq!(set.rules.len(), 4);
    assert_eq!(set.rules[0].kind, RuleKind::Absolute);
    assert_eq!(set.rules[0].min_days, Some(5));
    assert_eq!(set.rules[1].indicator, "stress");
    assert_eq!(set.rules[1].sustain_days, Some(7));
    assert_eq!(set.rules[2].threshold, Some(7.0));
    assert_eq!(set.rules[3].level, Level::FlightSurgeon);
    assert_eq!(set.rules[3].body_region, Some(BodyRegion::Chest));

    let mut d = doc();
    let mut flagged = DailyCheck::empty(day(3));
    flagged.red_flags.push(RedFlagKind::ChestPain);
    d.checks.insert(day(3), flagged);
    assert_eq!(ids(&evaluate(&d, &set, day(3))), ["red"]);
}

#[test]
fn a_parse_error_names_the_rule_id() {
    let valid = rule_toml(
        "valid",
        "indicator = \"fluid_l\"\nkind = \"absolute\"\nthreshold = 2.5\nwindow_days = 3\nlevel = \"self_care\"\n",
    );
    let cases = [
        (
            "drift_fs",
            "indicator = \"mood\"\nkind = \"drift\"\nlevel = \"flight_surgeon\"\n",
        ),
        (
            "flag",
            "indicator = \"mood\"\nkind = \"red_flag\"\nlevel = \"flight_surgeon\"\nbody_region = \"head\"\n",
        ),
        (
            "flag_region",
            "indicator = \"fever\"\nkind = \"red_flag\"\nlevel = \"flight_surgeon\"\n",
        ),
        (
            "flag_level",
            "indicator = \"fever\"\nkind = \"red_flag\"\nlevel = \"tell_cmo\"\nbody_region = \"head\"\n",
        ),
        (
            "typo",
            "indicator = \"sleeep\"\nkind = \"absolute\"\nthreshold = 1.0\nwindow_days = 3\nlevel = \"self_care\"\n",
        ),
        (
            "window",
            "indicator = \"fluid_l\"\nkind = \"absolute\"\nthreshold = 2.5\nlevel = \"self_care\"\n",
        ),
        (
            "symptom_kind",
            "indicator = \"cough\"\nkind = \"symptom_duration\"\nthreshold = 7\nlevel = \"tell_cmo\"\n",
        ),
        (
            "recurrence",
            "indicator = \"any\"\nkind = \"symptom_recurrence\"\nthreshold = 2\nlevel = \"tell_cmo\"\n",
        ),
    ];
    for (id, fields) in cases {
        let error = parse(&format!("{valid}{}", rule_toml(id, fields))).unwrap_err();
        assert_eq!(error.rule_id.as_deref(), Some(id), "{error}");
        assert!(error.to_string().contains(id), "{error}");
    }

    let blank_source = valid.replace("https://example.org/source", "  ");
    let error = parse(&format!(
        "{valid}{}",
        blank_source.replace("valid", "fluid_3d")
    ))
    .unwrap_err();
    assert_eq!(error.rule_id.as_deref(), Some("fluid_3d"));
    assert!(error.message.contains("source"), "{error}");

    let unknown = valid.replace("threshold", "treshold");
    let error = parse(&format!("{valid}{}", unknown.replace("valid", "field"))).unwrap_err();
    assert_eq!(error.rule_id.as_deref(), Some("field"));
    assert!(error.message.contains("treshold"), "{error}");

    let error = parse(&format!("{valid}{valid}")).unwrap_err();
    assert_eq!(error.rule_id.as_deref(), Some("valid"));
    assert!(error.message.contains("`id`"), "{error}");
}
