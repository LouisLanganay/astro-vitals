use std::ops::Range;

use astro_vitals_core::baseline::{min_scale, series, sleep_hours, value};
use astro_vitals_core::mission::{day_view, due_tasks, mission_day, status, streak};
use astro_vitals_core::model::{
    AmslerCell, Assessment, Baseline, BodyRegion, Calibration, DailyAnswers, DailyCheck, Document,
    DueTask, EyeResult, FiredRule, Indicator, IndicatorState, IndicatorStatus, Level, Notice,
    Packet, PvtInput, PvtResult, PvtTrial, RedFlagKind, RuleSubject, RulesError, Symptom,
    SymptomKind, TaskKind, ValidationError, VisionResult,
};
use astro_vitals_core::rules::{self, RuleSet, evaluate};
use astro_vitals_core::{packet, pvt, validate};
use chrono::{NaiveDate, TimeDelta};

const RULES_TOML: &str = include_str!("../../../rules/rules.toml");

const RULE: &str = r#"id = "x"
indicator = "sleep_hours"
kind = "absolute"
threshold = 6.0
window_days = 7
level = "self_care"
action = "a"
explanation = "e"
source = "https://example.org"
"#;

fn launch() -> NaiveDate {
    NaiveDate::from_ymd_opt(2027, 1, 1).unwrap()
}

fn day(n: i32) -> NaiveDate {
    launch() + TimeDelta::days(n.into())
}

fn rule_set() -> RuleSet {
    rules::parse(RULES_TOML).unwrap()
}

fn doc() -> Document {
    let doc = Document::new(day(-14));
    assert_eq!(doc.settings.launch_date, launch());
    doc
}

fn answers() -> DailyAnswers {
    DailyAnswers {
        sleep_start_min: 1380,
        sleep_end_min: 420,
        sleep_quality: 8,
        sleep_aid: false,
        mood: 7,
        stress: 2,
        tiredness: 2,
        workload: 5,
        fluid_l: 3.0,
        exercise_resistive_min: 50,
        exercise_aerobic_min: 45,
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

fn rash(treated: bool, improved: Option<bool>) -> Symptom {
    Symptom {
        kind: SymptomKind::SkinRash,
        severity: 1,
        region: BodyRegion::Arms,
        treated,
        improved,
    }
}

fn log(doc: &mut Document, n: i32, symptom: Symptom) {
    doc.checks
        .entry(day(n))
        .or_insert_with(|| DailyCheck::empty(day(n)))
        .symptoms
        .push(symptom);
}

fn eye(acuity_logmar: f64, amsler_distortion: bool) -> EyeResult {
    EyeResult {
        acuity_logmar,
        amsler_distortion,
        amsler_cells: Vec::new(),
    }
}

fn vision(doc: &mut Document, n: i32, left: EyeResult) {
    vision_2(doc, n, left, eye(0.0, false));
}

fn vision_2(doc: &mut Document, n: i32, left: EyeResult, right: EyeResult) {
    let date = day(n);
    doc.vision.insert(date, VisionResult { date, left, right });
}

fn at(doc: &Document, n: i32) -> Assessment {
    evaluate(doc, &rule_set(), day(n))
}

fn ids(a: &Assessment) -> Vec<&str> {
    a.fired.iter().map(|f| f.rule_id.as_str()).collect()
}

fn indicator(a: &Assessment, indicator: Indicator) -> &IndicatorStatus {
    a.indicators
        .iter()
        .find(|i| i.indicator == indicator)
        .unwrap()
}

fn state(a: &Assessment, i: Indicator) -> IndicatorState {
    indicator(a, i).state
}

fn fields(result: Result<(), ValidationError>) -> Vec<String> {
    match result {
        Ok(()) => Vec::new(),
        Err(e) => e.errors.into_iter().map(|f| f.field).collect(),
    }
}

fn parse_one(body: &str) -> Result<RuleSet, RulesError> {
    rules::parse(&format!(
        "[drift]\nself_care = 2.0\ntell_cmo = 3.0\n\n[[rules]]\n{body}"
    ))
}

#[test]
fn a_window_with_fewer_than_min_days_gives_not_enough_data() {
    let short = |a: &mut DailyAnswers| {
        a.sleep_end_min = 180;
        a.fluid_l = 1.0;
    };
    let mut d = doc();
    put(&mut d, 6..7, short);
    let a = at(&d, 6);
    assert_eq!(a.level, Level::Ok);
    assert!(a.fired.is_empty());
    assert_eq!(indicator(&a, Indicator::SleepHours).value, Some(4.0));
    for i in [Indicator::SleepHours, Indicator::FluidL, Indicator::Mood] {
        assert_eq!(state(&a, i), IndicatorState::NotEnoughData);
    }
    assert_eq!(state(&a, Indicator::Workload), IndicatorState::Ok);
    assert_eq!(
        state(&at(&d, 20), Indicator::Workload),
        IndicatorState::NotEnoughData
    );

    put(&mut d, 5..6, short);
    let a = at(&d, 6);
    assert!(a.fired.is_empty());
    assert_eq!(state(&a, Indicator::FluidL), IndicatorState::NotEnoughData);

    put(&mut d, 4..5, short);
    let a = at(&d, 6);
    assert_eq!(ids(&a), ["sleep_3d_below_5h", "fluid_3d_below_2_5l"]);
    assert_eq!(a.level, Level::TellCmo);
    assert_eq!(state(&a, Indicator::FluidL), IndicatorState::SelfCare);

    put(&mut d, 2..4, short);
    assert!(ids(&at(&d, 6)).contains(&"sleep_7d_below_6h"));
}

#[test]
fn an_indicator_with_only_drift_rules_and_one_value_is_not_enough_data() {
    let mut d = doc();
    put(&mut d, -14..0, |_| {});
    put(&mut d, 10..11, |a| a.mood = 0);
    let a = at(&d, 10);
    assert!(a.drift_enabled);
    assert!(a.fired.is_empty());
    assert_eq!(indicator(&a, Indicator::Mood).mean_7d, Some(0.0));
    for i in [Indicator::Mood, Indicator::Stress, Indicator::Tiredness] {
        assert_eq!(state(&a, i), IndicatorState::NotEnoughData, "{i:?}");
    }
    assert_eq!(indicator(&a, Indicator::Mood).drift_score, None);
    put(&mut d, 7..10, |a| a.mood = 0);
    let a = at(&d, 10);
    assert_eq!(ids(&a), ["mood_drift_7d"]);
    assert_eq!(state(&a, Indicator::Mood), IndicatorState::SelfCare);
    assert_eq!(state(&a, Indicator::Stress), IndicatorState::Ok);
}

#[test]
fn a_drift_for_14_days_must_stay_on_each_of_the_last_8_days() {
    let set = rule_set();
    for id in ["mood_drift_14d", "stress_drift_14d", "tiredness_drift_14d"] {
        let rule = set.rules.iter().find(|r| r.id == id).unwrap();
        assert_eq!((rule.sustain_days, rule.window_days), (Some(8), Some(7)));
    }

    let mut d = doc();
    put(&mut d, -14..10, |_| {});
    put(&mut d, 10..14, |a| a.mood = 0);
    let a = at(&d, 13);
    assert_eq!(indicator(&a, Indicator::Mood).drift_score, Some(-4.0));
    assert_eq!(ids(&a), ["mood_drift_7d"]);
    assert_eq!(a.level, Level::SelfCare);

    put(&mut d, 0..14, |a| a.mood = 0);
    assert_eq!(at(&d, 0).level, Level::Ok);
    assert_eq!(ids(&at(&d, 1)), ["mood_drift_7d"]);
    assert_eq!(ids(&at(&d, 7)), ["mood_drift_7d"]);
    assert_eq!(ids(&at(&d, 8)), ["mood_drift_14d", "mood_drift_7d"]);

    assert_eq!(ids(&at(&d, 13)), ["mood_drift_14d", "mood_drift_7d"]);
    for n in 4..10 {
        d.checks.remove(&day(n));
    }
    assert_eq!(ids(&at(&d, 13)), ["mood_drift_7d"]);
}

#[test]
fn fewer_than_7_preflight_days_set_the_drift_rules_off() {
    let mut d = doc();
    put(&mut d, -6..0, |_| {});
    put(&mut d, 0..14, |a| {
        a.mood = 2;
        a.sleep_end_min = 240;
    });
    let a = at(&d, 13);
    assert_eq!((a.preflight_days, a.drift_enabled), (6, false));
    assert_eq!(ids(&a), ["sleep_7d_below_6h"]);
    assert_eq!(state(&a, Indicator::Mood), IndicatorState::NotEnoughData);
    assert_eq!(state(&a, Indicator::SleepHours), IndicatorState::SelfCare);
    assert!(a.indicators.iter().all(|i| i.drift_score.is_none()));

    put(&mut d, -7..-6, |_| {});
    let a = at(&d, 13);
    assert_eq!((a.preflight_days, a.drift_enabled), (7, true));
    assert_eq!(
        ids(&a),
        ["mood_drift_14d", "sleep_7d_below_6h", "mood_drift_7d"]
    );
    assert_eq!(state(&a, Indicator::Mood), IndicatorState::TellCmo);
    assert_eq!(indicator(&a, Indicator::Mood).drift_score, Some(-5.0));
}

#[test]
fn a_mad_of_zero_uses_the_minimum_scale() {
    assert!(Indicator::ALL.iter().all(|i| min_scale(*i) > 0.0));
    let mut d = doc();
    put(&mut d, -14..0, |_| {});
    put(&mut d, 0..7, |a| a.tiredness = 5);
    let a = at(&d, 6);
    let tiredness = indicator(&a, Indicator::Tiredness);
    assert_eq!(
        tiredness.baseline,
        Some(Baseline {
            median: 2.0,
            mad: 0.0,
            days: 14
        })
    );
    assert_eq!(tiredness.mean_7d, Some(5.0));
    assert_eq!(tiredness.drift_score, Some(3.0));
    assert_eq!(tiredness.state, IndicatorState::SelfCare);
    assert_eq!(ids(&a), ["tiredness_drift_7d"]);

    put(&mut d, 0..7, |a| a.tiredness = 0);
    let a = at(&d, 6);
    assert_eq!(indicator(&a, Indicator::Tiredness).drift_score, Some(-2.0));
    assert_eq!(state(&a, Indicator::Tiredness), IndicatorState::Ok);
    assert_eq!(a.level, Level::Ok);
}

#[test]
fn sleep_through_midnight_has_the_correct_duration() {
    assert_eq!(sleep_hours(1380, 420), 8.0);
    assert_eq!(sleep_hours(1410, 330), 6.0);
    assert_eq!(sleep_hours(30, 450), 7.0);
    assert_eq!(sleep_hours(0, 1439), 1439.0 / 60.0);
    let mut d = doc();
    put(&mut d, 0..1, |_| {});
    assert_eq!(value(&d, Indicator::SleepHours, day(0)), Some(8.0));
    assert_eq!(value(&d, Indicator::ExerciseMin, day(0)), Some(95.0));
    assert_eq!(value(&d, Indicator::SleepHours, day(1)), None);
}

#[test]
fn validation_rejects_input_out_of_range_and_names_the_field() {
    let today = day(10);
    assert_eq!(validate::daily_check(&check(10), today), Ok(()));
    assert_eq!(
        validate::daily_check(&DailyCheck::empty(day(10)), today),
        Ok(())
    );

    let mut bad = check(11);
    let a = bad.answers.as_mut().unwrap();
    a.sleep_start_min = 1500;
    a.fluid_l = -0.5;
    a.mood = 11;
    a.exercise_aerobic_min = 2000;
    bad.symptoms.push(Symptom {
        severity: 4,
        ..rash(false, None)
    });
    let error = validate::daily_check(&bad, today).unwrap_err();
    assert_eq!(
        error.to_string(),
        "date: must not be after today; answers.sleep_start_min: must be 0 to 1439; \
         answers.mood: must be 0 to 10; answers.fluid_l: must be 0 to 15; \
         answers.exercise_aerobic_min: must be 0 to 1440; symptoms[0].severity: must be 1 to 3"
    );
    let mut zero = check(10);
    zero.answers.as_mut().unwrap().sleep_end_min = 1380;
    assert_eq!(
        fields(validate::daily_check(&zero, today)),
        ["answers.sleep_end_min"]
    );
    let mut two = check(10);
    two.symptoms.push(rash(false, None));
    two.symptoms.push(Symptom {
        region: BodyRegion::Legs,
        ..rash(false, None)
    });
    assert_eq!(validate::daily_check(&two, today), Ok(()));
    let mut d = doc();
    d.checks.insert(day(10), two);
    let a = at(&d, 10);
    for region in [BodyRegion::Arms, BodyRegion::Legs] {
        let status = a.regions.iter().find(|r| r.region == region).unwrap();
        assert_eq!(status.symptoms.len(), 1);
    }

    let mut nan = check(10);
    nan.answers.as_mut().unwrap().fluid_l = f64::NAN;
    assert_eq!(
        fields(validate::daily_check(&nan, today)),
        ["answers.fluid_l"]
    );

    let trials = vec![
        PvtTrial::Response { rt_ms: 250.0 },
        PvtTrial::Timeout,
        PvtTrial::Response { rt_ms: -1.0 },
    ];
    let input = PvtInput {
        date: day(11),
        trials,
    };
    assert_eq!(
        fields(validate::pvt_input(&input, today)),
        ["date", "trials[2].rt_ms"]
    );
    let empty = PvtInput {
        date: day(10),
        trials: Vec::new(),
    };
    assert_eq!(fields(validate::pvt_input(&empty, today)), ["trials"]);

    let calibration = Calibration { px_per_mm: 4.0 };
    let mut result = VisionResult {
        date: day(10),
        left: eye(0.1, false),
        right: eye(0.0, false),
    };
    assert_eq!(
        validate::vision_result(&result, Some(&calibration), today),
        Ok(())
    );
    assert_eq!(
        fields(validate::vision_result(&result, None, today)),
        ["calibration"]
    );
    result.left.acuity_logmar = 9.0;
    result.right.amsler_cells = vec![
        AmslerCell { row: 0, col: 19 },
        AmslerCell { row: 20, col: 0 },
    ];
    assert_eq!(
        fields(validate::vision_result(&result, Some(&calibration), today)),
        ["left.acuity_logmar", "right.amsler_cells[1]"]
    );

    let mut settings = doc().settings;
    assert_eq!(validate::settings(&settings), Ok(()));
    settings.launch_date = NaiveDate::from_ymd_opt(1200, 1, 1).unwrap();
    settings.exercise_prescription_min = 5000;
    settings.calibration = Some(Calibration { px_per_mm: 0.0 });
    assert_eq!(
        fields(validate::settings(&settings)),
        [
            "launch_date",
            "exercise_prescription_min",
            "calibration.px_per_mm"
        ]
    );
}

#[test]
fn a_red_flag_sets_flight_surgeon_with_no_window() {
    let mut d = doc();
    let mut flagged = DailyCheck::empty(day(3));
    flagged.red_flags.push(RedFlagKind::ChestPain);
    d.checks.insert(day(3), flagged);
    let a = at(&d, 3);
    assert_eq!(a.level, Level::FlightSurgeon);
    assert_eq!(ids(&a), ["red_flag_chest_pain"]);
    assert_eq!(
        a.fired[0].subject,
        RuleSubject::RedFlag(RedFlagKind::ChestPain)
    );
    let regions: Vec<BodyRegion> = a.regions.iter().map(|r| r.region).collect();
    assert_eq!(regions, BodyRegion::ALL);
    for region in &a.regions {
        let chest = region.region == BodyRegion::Chest;
        assert_eq!(region.level == Level::FlightSurgeon, chest);
        assert_eq!(region.fired.len(), usize::from(chest));
    }
    assert_eq!(
        a.regions.iter().map(|r| r.indicators.len()).sum::<usize>(),
        Indicator::ALL.len()
    );
    assert_eq!(at(&d, 4).level, Level::Ok);

    for kind in RedFlagKind::ALL {
        let mut d = doc();
        let mut flagged = DailyCheck::empty(day(-10));
        flagged.red_flags.push(kind);
        d.checks.insert(day(-10), flagged);
        let a = at(&d, -10);
        assert_eq!(a.level, Level::FlightSurgeon, "{kind:?}");
        assert_eq!(a.fired[0].subject, RuleSubject::RedFlag(kind));
        let flagged = a.regions.iter().filter(|r| r.level == a.level);
        assert_eq!(flagged.count(), 1, "{kind:?}");
    }
}

#[test]
fn a_pvt_timeout_is_a_lapse() {
    assert_eq!((pvt::LAPSE_MS, pvt::FALSE_START_MS), (355.0, 100.0));
    let input = PvtInput {
        date: day(0),
        trials: vec![
            PvtTrial::Response { rt_ms: 250.0 },
            PvtTrial::Response { rt_ms: 354.9 },
            PvtTrial::Response { rt_ms: 355.0 },
            PvtTrial::Response { rt_ms: 99.9 },
            PvtTrial::Response { rt_ms: 100.0 },
            PvtTrial::Premature,
            PvtTrial::Timeout,
        ],
    };
    assert_eq!(
        pvt::score(&input),
        PvtResult {
            date: day(0),
            stimuli: 6,
            mean_rt_ms: Some((250.0 + 354.9 + 355.0 + 100.0) / 4.0),
            lapses: 2,
            false_starts: 2,
        }
    );
    let none = PvtInput {
        date: day(0),
        trials: vec![PvtTrial::Timeout, PvtTrial::Premature],
    };
    let result = pvt::score(&none);
    assert_eq!(
        (result.stimuli, result.mean_rt_ms, result.lapses),
        (1, None, 1)
    );
}

#[test]
fn an_invalid_rule_file_gives_an_error_that_names_the_rule_id() {
    assert_eq!(parse_one(RULE).unwrap().rules.len(), 1);
    for (from, to) in [
        ("source = \"https://example.org\"\n", ""),
        ("source = \"https://example.org\"", "source = \"\""),
        ("action = \"a\"", "action = \" \""),
        ("explanation = \"e\"", "explanation = \"\""),
        ("kind = \"absolute\"", "kind = \"relative\""),
        ("kind = \"absolute\"", "kind = \"red_flag\""),
        ("kind = \"absolute\"", "kind = \"vision\""),
        ("kind = \"absolute\"", "kind = \"vision_change\""),
        ("kind = \"absolute\"", "kind = \"symptom_not_improved\""),
        ("indicator = \"sleep_hours\"", "indicator = \"sleep\""),
        ("threshold = 6.0\n", ""),
        ("threshold = 6.0", "threshold = nan"),
        ("threshold = 6.0", "treshold = 6.0"),
        ("window_days = 7\n", ""),
        ("window_days = 7", "window_days = 0"),
        ("window_days = 7", "window_days = 366"),
        ("window_days = 7", "window_days = 7\nmin_days = 0"),
        ("window_days = 7", "window_days = 7\nmin_days = 8"),
        ("window_days = 7", "window_days = 7\nsustain_days = 8"),
        ("threshold = 6.0", "threshold = inf"),
        ("level = \"self_care\"", "level = \"ok\""),
        ("level = \"self_care\"", "level = \"high\""),
    ] {
        assert!(RULE.contains(from));
        let error = parse_one(&RULE.replace(from, to)).unwrap_err();
        assert_eq!(error.rule_id.as_deref(), Some("x"), "{to}: {error}");
        assert!(error.to_string().starts_with("rule x: "), "{error}");
    }
    let drift = RULE.replace("kind = \"absolute\"", "kind = \"drift\"");
    let sustained = format!("{drift}sustain_days = 8\nmin_days = 4\n");
    let rule = parse_one(&sustained).unwrap().rules.remove(0);
    assert_eq!((rule.sustain_days, rule.min_days), (Some(8), Some(4)));
    assert!(parse_one(&drift.replace("window_days = 7\n", "")).is_ok());
    let acuity = RULE
        .replace("sleep_hours", "acuity_left")
        .replace("absolute", "vision_persistent");
    assert!(parse_one(&acuity).is_ok());
    let amsler = acuity
        .replace("acuity_left", "amsler_left")
        .replace("threshold = 6.0\n", "");
    assert!(parse_one(&amsler).is_ok());
    for body in [
        drift.replace("window_days = 7", "window_days = 14"),
        format!("{drift}min_days = 8\n"),
        format!("{drift}sustain_days = 0\n"),
        format!("{drift}sustain_days = 366\n"),
        acuity.replace("threshold = 6.0\n", ""),
        format!("{acuity}sustain_days = 2\n"),
    ] {
        let error = parse_one(&body).unwrap_err();
        assert_eq!(error.rule_id.as_deref(), Some("x"), "{body}: {error}");
    }

    let two = parse_one(&format!("{RULE}\n[[rules]]\n{RULE}")).unwrap_err();
    assert_eq!(two.rule_id.as_deref(), Some("x"));

    let no_id = parse_one(&RULE.replace("id = \"x\"\n", "")).unwrap_err();
    assert_eq!(no_id.rule_id, None);
    assert!(no_id.message.contains("rule number 1"));
    for src in [
        "[[rules",
        "",
        "[drift]\nself_care = 2.0\ntell_cmo = 3.0\n",
        "[drift]\nself_care = 3.0\ntell_cmo = 2.0\nrules = []\n",
    ] {
        assert_eq!(rules::parse(src).unwrap_err().rule_id, None, "{src}");
    }
}

#[test]
fn a_symptom_for_more_than_7_consecutive_days_fires() {
    let mut d = doc();
    for n in 0..8 {
        log(&mut d, n, rash(false, None));
    }
    assert_eq!(at(&d, 6).level, Level::Ok);
    let a = at(&d, 7);
    assert_eq!(ids(&a), ["symptom_longer_than_7_days"]);
    let rule = &a.fired[0];
    assert_eq!(rule.subject, RuleSubject::Symptom(SymptomKind::SkinRash));
    assert_eq!(rule.body_region, Some(BodyRegion::Arms));
    assert_eq!(rule.value, Some(8.0));
    let arms = &a.regions[6];
    assert_eq!(
        (
            arms.region,
            arms.level,
            arms.symptoms.len(),
            arms.fired.len()
        ),
        (BodyRegion::Arms, Level::TellCmo, 1, 1)
    );

    assert_eq!(ids(&at(&d, 8)), ["symptom_longer_than_7_days"]);
    d.checks.insert(day(8), check(8));
    assert_eq!(at(&d, 8).level, Level::Ok);

    d.checks.remove(&day(3));
    assert_eq!(ids(&at(&d, 7)), ["symptom_recurrent_30_days"]);
}

#[test]
fn a_headache_on_days_0_to_9_gives_tell_cmo_on_day_10_before_the_check() {
    let mut d = doc();
    for n in 0..10 {
        let headache = Symptom {
            kind: SymptomKind::Headache,
            region: BodyRegion::Head,
            ..rash(false, None)
        };
        log(&mut d, n, headache);
    }
    let a = at(&d, 10);
    assert_eq!(a.level, Level::TellCmo);
    assert_eq!(ids(&a), ["symptom_longer_than_7_days"]);
    assert_eq!(
        a.fired[0].subject,
        RuleSubject::Symptom(SymptomKind::Headache)
    );
    assert_eq!(a.fired[0].value, Some(10.0));
    assert_eq!(a.regions[0].level, Level::TellCmo);
    assert_eq!(at(&d, 11).level, Level::Ok);
}

#[test]
fn a_symptom_with_2_separate_episodes_in_30_days_fires() {
    let mut d = doc();
    for n in (0..4).chain(5..9) {
        log(&mut d, n, rash(false, None));
    }
    assert_eq!(at(&d, 4).level, Level::Ok);
    for n in [5, 8] {
        let a = at(&d, n);
        assert_eq!(ids(&a), ["symptom_recurrent_30_days"]);
        assert_eq!(a.fired[0].value, Some(2.0));
        assert_eq!(a.fired[0].body_region, Some(BodyRegion::Arms));
    }
    assert_eq!(at(&d, 32).level, Level::TellCmo);
    assert_eq!(at(&d, 33).level, Level::Ok);

    let mut d = doc();
    log(&mut d, 0, rash(false, None));
    d.checks.insert(day(1), check(1));
    log(&mut d, 2, rash(false, None));
    assert_eq!(at(&d, 1).level, Level::Ok);
    assert_eq!(ids(&at(&d, 2)), ["symptom_recurrent_30_days"]);
}

#[test]
fn a_symptom_that_is_treated_and_not_improved_fires() {
    for (treated, improved, fires) in [
        (true, Some(false), true),
        (true, Some(true), false),
        (true, None, false),
        (false, None, false),
    ] {
        let mut d = doc();
        log(&mut d, 0, rash(treated, improved));
        let a = at(&d, 0);
        let expected: &[&str] = if fires {
            &["symptom_treated_not_improved"]
        } else {
            &[]
        };
        assert_eq!(ids(&a), expected);
    }
}

#[test]
fn vision_rules_compare_the_last_tests_with_the_last_preflight_test() {
    let mut d = doc();
    vision(&mut d, -14, eye(0.0, false));
    vision(&mut d, -7, eye(0.1, false));
    vision(&mut d, 0, eye(0.3, false));
    let a = at(&d, 3);
    assert_eq!(ids(&a), ["acuity_left_worse"]);
    assert_eq!(a.fired[0].value, Some(0.3));
    assert_eq!(state(&a, Indicator::AcuityLeft), IndicatorState::TellCmo);
    assert_eq!(state(&a, Indicator::AcuityRight), IndicatorState::Ok);
    assert_eq!(a.regions[1].level, Level::TellCmo);

    vision(&mut d, 7, eye(0.3, false));
    let a = at(&d, 40);
    assert_eq!(ids(&a), ["acuity_left_worse_2_tests", "acuity_left_worse"]);
    assert_eq!(a.level, Level::FlightSurgeon);

    vision(&mut d, 14, eye(0.2, false));
    assert_eq!(at(&d, 14).level, Level::Ok);
}

#[test]
fn a_distortion_in_the_preflight_tests_is_not_a_new_finding() {
    let mut d = doc();
    vision(&mut d, -14, eye(0.0, true));
    vision(&mut d, -7, eye(0.0, true));
    for n in [-14, -7, -1] {
        let a = at(&d, n);
        assert_eq!(a.level, Level::Ok, "day {n}");
        assert_eq!(
            state(&a, Indicator::AmslerLeft),
            IndicatorState::NotEnoughData
        );
    }
    vision_2(&mut d, 0, eye(0.0, true), eye(0.0, false));
    vision_2(&mut d, 7, eye(0.0, true), eye(0.0, true));
    assert_eq!(at(&d, 0).level, Level::Ok);
    assert_eq!(state(&at(&d, 0), Indicator::AmslerLeft), IndicatorState::Ok);
    assert_eq!(ids(&at(&d, 7)), ["amsler_right_distortion"]);
}

#[test]
fn a_distortion_with_no_preflight_test_fires() {
    let mut d = doc();
    vision(&mut d, 0, eye(0.9, true));
    let a = at(&d, 0);
    assert_eq!(ids(&a), ["amsler_left_distortion"]);
    assert_eq!(
        state(&a, Indicator::AcuityLeft),
        IndicatorState::NotEnoughData
    );
    assert_eq!(state(&a, Indicator::AmslerRight), IndicatorState::Ok);
    vision(&mut d, 7, eye(0.9, true));
    let a = at(&d, 7);
    assert_eq!(
        ids(&a),
        ["amsler_left_distortion_2_tests", "amsler_left_distortion"]
    );
    assert_eq!(a.level, Level::FlightSurgeon);
}

#[test]
fn the_exercise_rule_uses_the_prescription_of_the_settings() {
    let mut d = doc();
    put(&mut d, 0..7, |a| {
        a.exercise_resistive_min = 40;
        a.exercise_aerobic_min = 40;
    });
    let a = at(&d, 6);
    assert_eq!(ids(&a), ["exercise_7d_below_prescription"]);
    assert_eq!(a.fired[0].value, Some(80.0));
    assert_eq!(a.fired[0].body_region, Some(BodyRegion::Legs));
    d.settings.exercise_prescription_min = 80;
    assert_eq!(at(&d, 6).level, Level::Ok);
}

#[test]
fn mission_day_streak_and_due_tasks() {
    assert_eq!(mission_day(launch(), day(0)), 0);
    assert_eq!(mission_day(launch(), day(-14)), -14);
    assert_eq!(mission_day(launch(), day(120)), 120);

    let mut d = doc();
    let today = day(-14);
    let first = status(&d, today, Vec::new());
    assert_eq!((first.mission_day, first.streak), (-14, 0));
    assert_eq!(at(&d, -14).mission_day, -14);
    let all = [
        (TaskKind::DailyCheck, false),
        (TaskKind::Pvt, true),
        (TaskKind::VisionTest, false),
    ]
    .map(|(kind, optional)| DueTask { kind, optional });
    assert_eq!(first.due, all);

    put(&mut d, 0..5, |_| {});
    assert_eq!(streak(&d, day(4)), 5);
    assert_eq!(streak(&d, day(5)), 5);
    assert_eq!(streak(&d, day(6)), 0);
    log(&mut d, 5, rash(false, None));
    assert_eq!(streak(&d, day(5)), 5);
    assert_eq!(due_tasks(&d, day(5))[0].kind, TaskKind::DailyCheck);
    d.checks.remove(&day(2));
    assert_eq!(streak(&d, day(4)), 2);

    let result = pvt::score(&PvtInput {
        date: day(4),
        trials: vec![PvtTrial::Response { rt_ms: 250.0 }],
    });
    d.pvt.insert(day(4), result.clone());
    vision(&mut d, -3, eye(0.0, false));
    assert_eq!(due_tasks(&d, day(3)), all[1..2]);
    assert_eq!(due_tasks(&d, day(4)), all[2..]);
    vision(&mut d, -2, eye(0.0, false));
    assert_eq!(due_tasks(&d, day(4)), []);

    let notice = Notice::DataFileCorrupt {
        backup_path: "b".into(),
    };
    let view = day_view(&d, day(2), day(4), vec![notice.clone()]);
    assert_eq!(view.check, DailyCheck::empty(day(2)));
    assert_eq!((view.mission_day, view.pvt, view.vision), (2, None, None));
    assert_eq!(view.mission, status(&d, day(4), vec![notice]));
    assert_eq!(view.mission.today, day(4));
    let view = day_view(&d, day(4), day(4), Vec::new());
    assert_eq!((view.check, view.pvt), (check(4), Some(result)));
}

#[test]
fn a_series_has_one_point_for_each_day_from_the_first_stored_day() {
    assert!(series(&doc(), Indicator::Mood, day(5)).points.is_empty());
    let mut d = doc();
    put(&mut d, -14..3, |_| {});
    let s = series(&d, Indicator::Mood, day(9));
    assert_eq!(s.baseline.map(|b| (b.median, b.days)), Some((7.0, 14)));
    assert_eq!(s.points.len(), 24);
    let point = |n: usize| {
        (
            s.points[n].mission_day,
            s.points[n].value,
            s.points[n].mean_7d,
        )
    };
    assert_eq!(s.points[0].date, day(-14));
    assert_eq!(point(0), (-14, Some(7.0), Some(7.0)));
    assert_eq!(point(22), (8, None, Some(7.0)));
    assert_eq!(point(23), (9, None, None));
    assert_eq!(series(&d, Indicator::PvtLapses, day(9)).baseline, None);
}

#[test]
fn a_packet_is_16_kb_or_less_for_all_input() {
    let bad = eye(0.4, true);
    let mut d = doc();
    put(&mut d, -14..0, |_| {});
    put(&mut d, 0..21, |a| {
        a.sleep_end_min = 180;
        a.mood = 0;
        a.stress = 10;
        a.tiredness = 10;
        a.fluid_l = 1.0;
        a.exercise_resistive_min = 0;
        a.exercise_aerobic_min = 0;
    });
    for n in -14..21 {
        let (mean_rt_ms, lapses) = if n < 0 { (250.0, 1) } else { (500.0, 20) };
        let result = PvtResult {
            date: day(n),
            stimuli: 60,
            mean_rt_ms: Some(mean_rt_ms),
            lapses,
            false_starts: 0,
        };
        d.pvt.insert(day(n), result);
    }
    vision(&mut d, -7, eye(0.0, false));
    vision_2(&mut d, 7, bad.clone(), bad.clone());
    vision_2(&mut d, 14, bad.clone(), bad);
    for n in 0..21 {
        for kind in SymptomKind::ALL.into_iter().filter(|_| n != 4) {
            let symptom = Symptom {
                kind,
                region: BodyRegion::Head,
                ..rash(true, Some(false))
            };
            log(&mut d, n, symptom);
        }
        d.checks.get_mut(&day(n)).unwrap().red_flags = RedFlagKind::ALL.to_vec();
    }

    let key = |f: &FiredRule| (f.rule_id.clone(), f.level, f.subject);
    let a = at(&d, 20);
    assert_eq!(a.fired.len(), 52);
    let p = packet::build(&d, &rule_set(), day(20));
    let json = packet::to_json(&p);
    assert!(json.len() <= packet::MAX_BYTES, "{} bytes", json.len());
    assert_eq!(serde_json::from_str::<Packet>(&json).unwrap(), p);
    assert_eq!(
        p.fired.iter().map(key).collect::<Vec<_>>(),
        a.fired.iter().map(key).collect::<Vec<_>>()
    );
    assert_eq!(p.level, Level::FlightSurgeon);
    assert_eq!(p.red_flags.len(), 14 * 6);
    assert_eq!(p.flagged.len(), 12);
    assert_eq!(p.symptoms.len(), 8);
    assert!(p.symptoms.iter().all(|s| s.date == day(20)));

    let mut d = doc();
    for n in 0..14 {
        for _ in 0..400 {
            log(&mut d, n, rash(true, Some(false)));
        }
    }
    let p = packet::build(&d, &rule_set(), day(13));
    assert!(packet::to_json(&p).len() <= packet::MAX_BYTES);
    assert_eq!(p.fired.len(), 2);
    assert!(!p.symptoms.is_empty() && p.symptoms.len() < 400);
    assert!(p.symptoms.iter().all(|s| s.date == day(13)));
}
