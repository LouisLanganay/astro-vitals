use std::collections::BTreeSet;

use astro_vitals_core::model::{
    BodyRegion, DailyAnswers, DailyCheck, Document, EyeResult, Indicator, Level, RedFlagKind,
    ScenarioId, Symptom, SymptomKind, VisionResult,
};
use astro_vitals_core::rules::{self, Rule, RuleKind, RuleSet, evaluate};
use astro_vitals_core::scenario::{self, DEFAULT_SEED, MISSION_DAYS};
use chrono::{NaiveDate, TimeDelta};

const NOT_COVERED_BY_SCENARIOS: &[&str] = &[
    "stress_drift_7d",
    "stress_drift_14d",
    "fluid_3d_below_2_5l",
    "exercise_7d_below_prescription",
    "symptom_recurrent_30_days",
    "amsler_left_distortion",
    "acuity_left_worse",
    "acuity_right_worse",
    "amsler_left_distortion_2_tests",
    "acuity_left_worse_2_tests",
    "acuity_right_worse_2_tests",
    "red_flag_chest_pain",
    "red_flag_fainting",
    "red_flag_sudden_vision_loss",
    "red_flag_fever",
    "red_flag_blood_in_urine",
    "red_flag_one_sided_swelling",
];

fn load() -> RuleSet {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../rules/rules.toml");
    let src = std::fs::read_to_string(path).unwrap_or_else(|e| panic!("{path}: {e}"));
    rules::parse(&src).unwrap_or_else(|e| panic!("{e}"))
}

fn all_ids(set: &RuleSet) -> BTreeSet<String> {
    set.rules.iter().map(|r| r.id.clone()).collect()
}

fn fired_ids(doc: &Document, set: &RuleSet, days: impl Iterator<Item = i32>) -> BTreeSet<String> {
    days.flat_map(|n| {
        let date = doc.settings.launch_date + TimeDelta::days(n.into());
        evaluate(doc, set, date).fired
    })
    .map(|f| f.rule_id)
    .collect()
}

fn scenario_ids(set: &RuleSet, id: ScenarioId) -> BTreeSet<String> {
    let today = NaiveDate::from_ymd_opt(2027, 3, 1).unwrap();
    let doc = scenario::generate(id, DEFAULT_SEED, today);
    fired_ids(&doc, set, 0..MISSION_DAYS)
}

fn launch() -> NaiveDate {
    NaiveDate::from_ymd_opt(2027, 1, 1).unwrap()
}

fn day(n: i32) -> NaiveDate {
    launch() + TimeDelta::days(n.into())
}

fn doc() -> Document {
    Document::new(day(-14))
}

fn put(doc: &mut Document, days: std::ops::Range<i32>, edit: impl Fn(&mut DailyAnswers)) {
    for n in days {
        let mut answers = DailyAnswers {
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
        };
        edit(&mut answers);
        let check = DailyCheck {
            answers: Some(answers),
            ..DailyCheck::empty(day(n))
        };
        doc.checks.insert(day(n), check);
    }
}

fn named<T: serde::de::DeserializeOwned>(name: &str) -> T {
    serde_json::from_value(serde_json::Value::String(name.into())).unwrap()
}

fn healthy_eye() -> EyeResult {
    EyeResult {
        acuity_logmar: 0.0,
        amsler_distortion: false,
        amsler_cells: Vec::new(),
    }
}

fn vision_finding(indicator: Indicator, tests: i32) -> Document {
    let bad = match indicator {
        Indicator::AcuityLeft | Indicator::AcuityRight => EyeResult {
            acuity_logmar: 0.3,
            ..healthy_eye()
        },
        _ => EyeResult {
            amsler_distortion: true,
            ..healthy_eye()
        },
    };
    let left_eye = matches!(indicator, Indicator::AcuityLeft | Indicator::AmslerLeft);
    let mut d = doc();
    for n in std::iter::once(-7).chain((0..tests).map(|t| 7 * t)) {
        let (left, right) = match (n >= 0, left_eye) {
            (false, _) => (healthy_eye(), healthy_eye()),
            (true, true) => (bad.clone(), healthy_eye()),
            (true, false) => (healthy_eye(), bad.clone()),
        };
        let date = day(n);
        d.vision.insert(date, VisionResult { date, left, right });
    }
    d
}

fn hand_built(rule: &Rule) -> Option<(Document, i32)> {
    let mut d = doc();
    match (rule.kind, rule.id.as_str()) {
        (RuleKind::RedFlag, _) => {
            let mut check = DailyCheck::empty(day(3));
            check.red_flags.push(named::<RedFlagKind>(&rule.indicator));
            d.checks.insert(day(3), check);
            Some((d, 3))
        }
        (RuleKind::VisionChange, _) => Some((vision_finding(named(&rule.indicator), 1), 0)),
        (RuleKind::VisionPersistent, _) => Some((vision_finding(named(&rule.indicator), 2), 7)),
        (_, "stress_drift_7d" | "stress_drift_14d") => {
            put(&mut d, -14..0, |_| {});
            put(&mut d, 0..14, |a| a.stress = 9);
            Some((d, 13))
        }
        (_, "fluid_3d_below_2_5l") => {
            put(&mut d, 0..3, |a| a.fluid_l = 1.0);
            Some((d, 2))
        }
        (_, "exercise_7d_below_prescription") => {
            put(&mut d, 0..7, |a| {
                a.exercise_resistive_min = 40;
                a.exercise_aerobic_min = 40;
            });
            Some((d, 6))
        }
        (_, "symptom_recurrent_30_days") => {
            put(&mut d, 0..3, |_| {});
            for n in [0, 2] {
                d.checks.get_mut(&day(n)).unwrap().symptoms.push(Symptom {
                    kind: SymptomKind::BackPain,
                    severity: 1,
                    region: BodyRegion::Back,
                    treated: false,
                    improved: None,
                });
            }
            Some((d, 2))
        }
        _ => None,
    }
}

#[test]
fn each_rule_has_an_id_action_explanation_and_source() {
    let set = load();
    assert!(!set.rules.is_empty());
    for rule in &set.rules {
        assert!(!rule.id.trim().is_empty());
        assert!(!rule.action.trim().is_empty(), "{}", rule.id);
        assert!(!rule.explanation.trim().is_empty(), "{}", rule.id);
        assert!(rule.source.starts_with("http"), "{}", rule.id);
    }
}

#[test]
fn healthy_fires_no_rule() {
    let set = load();
    assert_eq!(
        scenario_ids(&set, ScenarioId::Healthy),
        BTreeSet::new(),
        "healthy is ok on each day"
    );
}

#[test]
fn the_scenarios_fire_each_rule_except_the_listed_ones() {
    let set = load();
    let all = all_ids(&set);
    let listed: BTreeSet<String> = NOT_COVERED_BY_SCENARIOS
        .iter()
        .map(|id| id.to_string())
        .collect();
    assert_eq!(listed.len(), NOT_COVERED_BY_SCENARIOS.len());
    for id in &listed {
        assert!(all.contains(id), "{id} is not in rules.toml");
    }
    let fired: BTreeSet<String> = ScenarioId::ALL
        .into_iter()
        .flat_map(|id| scenario_ids(&set, id))
        .collect();
    let expected: BTreeSet<String> = all.difference(&listed).cloned().collect();
    assert_eq!(fired, expected);
}

#[test]
fn a_hand_built_mission_fires_each_rule_not_covered_by_the_scenarios() {
    let set = load();
    for id in NOT_COVERED_BY_SCENARIOS {
        let rule = set.rules.iter().find(|r| r.id == *id).unwrap();
        let (doc, n) = hand_built(rule).unwrap_or_else(|| panic!("no hand-built data for {id}"));
        let a = evaluate(&doc, &set, day(n));
        let fired = a.fired.iter().find(|f| f.rule_id == *id);
        assert!(
            fired.is_some(),
            "{id} does not fire: {:?}",
            a.fired.iter().map(|f| &f.rule_id).collect::<Vec<_>>()
        );
        assert_eq!(fired.unwrap().level, rule.level, "{id}");
        assert!(a.level >= rule.level, "{id}");
        if rule.kind == RuleKind::RedFlag {
            assert_eq!(a.level, Level::FlightSurgeon, "{id}");
            assert_eq!(fired.unwrap().body_region, rule.body_region, "{id}");
        }
    }
}
