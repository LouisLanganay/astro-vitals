use astro_vitals_core::baseline::{mad, median, robust_score, sleep_hours, value, window_mean};
use astro_vitals_core::model::{
    BodyRegion, Document, ExpectedLevel, Indicator, Level, Packet, RedFlagKind, RuleSubject,
    ScenarioId, SymptomKind,
};
use astro_vitals_core::packet;
use astro_vitals_core::rules::{self, ANY_SYMPTOM, RuleKind, RuleSet, evaluate};
use astro_vitals_core::scenario::{
    self, DEFAULT_SEED, DISTORTION_DAY, HEADACHE_DAY, MISSION_DAYS, SLEEP_DECREASE_DAY,
};
use chrono::{NaiveDate, TimeDelta};

const RULES_TOML: &str = include_str!("../../../rules/rules.toml");

fn today() -> NaiveDate {
    NaiveDate::from_ymd_opt(2027, 3, 1).unwrap()
}

fn rule_set() -> RuleSet {
    rules::parse(RULES_TOML).unwrap()
}

fn generate(id: ScenarioId) -> Document {
    scenario::generate(id, DEFAULT_SEED, today())
}

fn date(doc: &Document, mission_day: i32) -> NaiveDate {
    doc.settings.launch_date + TimeDelta::days(mission_day.into())
}

fn levels(doc: &Document) -> Vec<Level> {
    let rules = rule_set();
    (0..MISSION_DAYS)
        .map(|n| evaluate(doc, &rules, date(doc, n)).level)
        .collect()
}

fn first_days(levels: &[Level]) -> Vec<ExpectedLevel> {
    let mut first: Vec<ExpectedLevel> = Vec::new();
    for (n, level) in levels.iter().enumerate() {
        if first.iter().all(|e| e.level != *level) {
            first.push(ExpectedLevel {
                level: *level,
                first_mission_day: n as i32,
            });
        }
    }
    first
}

fn has_headache(doc: &Document, mission_day: i32) -> bool {
    doc.checks[&date(doc, mission_day)]
        .symptoms
        .iter()
        .any(|s| s.kind == SymptomKind::Headache)
}

#[test]
fn each_rule_has_source_action_and_explanation() {
    let set = rule_set();
    assert_eq!(set.drift.self_care, 2.0);
    assert_eq!(set.drift.tell_cmo, 3.0);
    for rule in &set.rules {
        assert!(rule.source.starts_with("https://"), "{}", rule.id);
        assert!(!rule.action.trim().is_empty(), "{}", rule.id);
        assert!(!rule.explanation.trim().is_empty(), "{}", rule.id);
        assert!(
            rule.kind != RuleKind::RedFlag || rule.body_region.is_some(),
            "{}",
            rule.id
        );
    }
}

#[test]
fn the_rule_file_has_each_rule_of_the_spec_table() {
    use Level::{FlightSurgeon, SelfCare, TellCmo};
    use RuleKind::{
        Absolute, Drift, RedFlag, SymptomDuration, SymptomRecurrence, SymptomUnresolved,
        VisionChange, VisionPersistent,
    };
    let set = rule_set();
    let mut table = vec![
        ("sleep_hours", Absolute, SelfCare),
        ("sleep_hours", Absolute, TellCmo),
        ("fluid_l", Absolute, SelfCare),
        ("exercise_min", Absolute, SelfCare),
        (ANY_SYMPTOM, SymptomDuration, TellCmo),
        (ANY_SYMPTOM, SymptomRecurrence, TellCmo),
        (ANY_SYMPTOM, SymptomUnresolved, TellCmo),
    ];
    for indicator in [
        "pvt_lapses",
        "pvt_mean_rt_ms",
        "mood",
        "stress",
        "tiredness",
    ] {
        table.push((indicator, Drift, SelfCare));
        table.push((indicator, Drift, TellCmo));
    }
    for indicator in ["amsler_left", "amsler_right", "acuity_left", "acuity_right"] {
        table.push((indicator, VisionChange, TellCmo));
        table.push((indicator, VisionPersistent, FlightSurgeon));
    }
    let flags: Vec<String> = RedFlagKind::ALL
        .iter()
        .map(|k| {
            serde_json::to_value(k)
                .unwrap()
                .as_str()
                .unwrap()
                .to_owned()
        })
        .collect();
    for flag in &flags {
        table.push((flag, RedFlag, FlightSurgeon));
    }
    for (indicator, kind, level) in table {
        assert!(
            set.rules
                .iter()
                .any(|r| r.indicator == indicator && r.kind == kind && r.level == level),
            "no rule for {indicator} {kind:?} {level:?}"
        );
    }
}

#[test]
fn each_scenario_states_the_first_day_of_each_level() {
    for id in ScenarioId::ALL {
        let info = scenario::info(id);
        assert_eq!(info.id, id);
        assert_eq!(info.mission_day, MISSION_DAYS);
        assert!(!info.description.is_empty());
        let levels = levels(&generate(id));
        assert_eq!(levels.len(), 120);
        assert_eq!(first_days(&levels), info.expected, "{id:?}");
        assert!(levels.windows(2).all(|w| w[0] <= w[1]), "{id:?}");
    }
}

#[test]
fn healthy_is_ok_on_each_day() {
    let doc = generate(ScenarioId::Healthy);
    assert!(levels(&doc).iter().all(|l| *l == Level::Ok));
    assert!(doc.checks.values().all(|c| c.symptoms.is_empty()));
}

#[test]
fn sleep_debt_decreases_sleep_from_day_40_and_starts_headaches_on_day_50() {
    let doc = generate(ScenarioId::SleepDebt);
    let mean = |end: i32| window_mean(&doc, Indicator::SleepHours, date(&doc, end), 7, 7).unwrap();
    let before = mean(SLEEP_DECREASE_DAY - 1);
    assert!(before > 7.0);
    assert!(mean(SLEEP_DECREASE_DAY + 6) < before - 1.0);
    assert!(mean(MISSION_DAYS - 1) < 5.0);
    assert_eq!((SLEEP_DECREASE_DAY, HEADACHE_DAY), (40, 50));
    for n in -14..MISSION_DAYS {
        assert_eq!(has_headache(&doc, n), n >= HEADACHE_DAY, "day {n}");
    }

    let rules = rule_set();
    let levels = levels(&doc);
    let first = |level| levels.iter().position(|l| *l == level).unwrap() as i32;
    let self_care = first(Level::SelfCare);
    let tell_cmo = first(Level::TellCmo);
    assert_eq!((self_care, tell_cmo), (50, 57));
    let before = evaluate(&doc, &rules, date(&doc, self_care - 1));
    assert!(before.fired.is_empty());
    let at = evaluate(&doc, &rules, date(&doc, self_care));
    assert!(at.fired.iter().any(|f| f.rule_id == "sleep_7d_below_6h"));
    let at = evaluate(&doc, &rules, date(&doc, tell_cmo));
    let rule = &at.fired[0];
    assert_eq!(
        at.fired
            .iter()
            .filter(|f| f.level == Level::TellCmo)
            .count(),
        1
    );
    assert_eq!(rule.rule_id, "symptom_longer_than_7_days");
    assert_eq!(rule.subject, RuleSubject::Symptom(SymptomKind::Headache));
    assert_eq!(rule.body_region, Some(BodyRegion::Head));
    assert_eq!(rule.value, Some(8.0));

    let last = evaluate(&doc, &rules, today());
    assert_eq!(last.mission_day, MISSION_DAYS);
    assert_eq!(last.level, Level::TellCmo);
    let ids: Vec<&str> = last.fired.iter().map(|f| f.rule_id.as_str()).collect();
    for id in ["sleep_7d_below_6h", "symptom_longer_than_7_days"] {
        assert!(ids.contains(&id), "{id} in {ids:?}");
    }
}

#[test]
fn vision_shows_distortion_in_weeks_10_and_11() {
    let doc = generate(ScenarioId::Vision);
    assert_eq!(DISTORTION_DAY, 70);
    for (n, test) in doc.vision.values().enumerate() {
        let mission_day = (n as i32 - 2) * 7;
        assert_eq!(test.date, date(&doc, mission_day));
        assert!(!test.left.amsler_distortion);
        assert_eq!(test.right.amsler_distortion, mission_day >= 70);
    }
    assert_eq!(
        value(&doc, Indicator::AmslerRight, date(&doc, 70)),
        Some(1.0)
    );
    assert_eq!(
        value(&doc, Indicator::AmslerRight, date(&doc, 77)),
        Some(1.0)
    );
    for (n, level) in levels(&doc).into_iter().enumerate() {
        let expected = match n {
            0..70 => Level::Ok,
            70..77 => Level::TellCmo,
            _ => Level::FlightSurgeon,
        };
        assert_eq!(level, expected, "day {n}");
    }
    let last = evaluate(&doc, &rule_set(), today());
    assert_eq!(last.level, Level::FlightSurgeon);
    assert_eq!(last.regions[1].region, BodyRegion::Eyes);
    assert_eq!(last.regions[1].level, Level::FlightSurgeon);
}

#[test]
fn the_same_seed_gives_the_same_data() {
    for id in ScenarioId::ALL {
        let doc = generate(id);
        assert_eq!(doc, generate(id));
        assert_ne!(doc, scenario::generate(id, DEFAULT_SEED + 1, today()));
        assert_eq!(doc.settings.launch_date, date(&doc, 0));
        assert_eq!(date(&doc, MISSION_DAYS), today());
        assert_eq!(doc.checks.len(), 134);
        assert!(doc.checks.values().all(|c| c.is_complete()));
        assert!(!doc.checks.contains_key(&today()));
    }
    let doc = generate(ScenarioId::Healthy);
    let first = doc.checks[&date(&doc, -14)].answers.clone().unwrap();
    assert_eq!(
        (first.sleep_start_min, first.sleep_end_min, first.mood),
        (1365, 374, 7)
    );
}

#[test]
fn the_baseline_functions_give_known_results() {
    assert_eq!(median(&[]), None);
    assert_eq!(mad(&[]), None);
    assert_eq!(median(&[3.0, 1.0, 2.0]), Some(2.0));
    assert_eq!(median(&[4.0, 1.0, 3.0, 2.0]), Some(2.5));
    assert_eq!(mad(&[1.0, 2.0, 3.0, 4.0, 100.0]), Some(1.0));
    assert_eq!(mad(&[5.0, 5.0, 5.0]), Some(0.0));
    assert_eq!(robust_score(8.0, 5.0, 2.0, 0.5), 3.0 / (1.4826 * 2.0));
    assert_eq!(robust_score(7.0, 5.0, 0.0, 1.0), 2.0);
    assert_eq!(robust_score(3.0, 5.0, 0.0, 1.0), -2.0);
    assert_eq!(sleep_hours(1380, 420), 8.0);
    assert_eq!(sleep_hours(60, 450), 6.5);
}

#[test]
fn the_sleep_debt_packet_is_16_kb_or_less() {
    let doc = generate(ScenarioId::SleepDebt);
    let packet = packet::build(&doc, &rule_set(), today());
    let json = packet::to_json(&packet);
    assert_eq!(packet::MAX_BYTES, 16 * 1024);
    assert!(json.len() <= packet::MAX_BYTES, "{} bytes", json.len());
    assert_eq!(serde_json::from_str::<Packet>(&json).unwrap(), packet);
    assert_eq!(packet.mission_day, MISSION_DAYS);
    assert_eq!(packet.level, Level::TellCmo);
    assert!(!packet.fired.is_empty());
    assert!(packet.fired.iter().all(|f| !f.explanation.is_empty()));
    assert!(
        packet
            .flagged
            .iter()
            .any(|f| f.indicator == Indicator::SleepHours)
    );
    assert!(packet.flagged.iter().all(|f| f.values.len() == 14));
    assert_eq!(packet.symptoms.len(), 13);
    assert_eq!(packet.baselines.len(), Indicator::ALL.len());
    println!("sleep_debt packet: {} bytes", json.len());
}
