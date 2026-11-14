use std::cmp::Reverse;
use std::collections::HashSet;
use std::fmt;

use serde::{Deserialize, Serialize};

use crate::baseline;
use crate::model::{
    Assessment, BodyRegion, Direction, Eye, FiredRule, Indicator, IndicatorState, IndicatorStatus,
    Level, MissionData, MissionDay, Settings, Symptom, SymptomKind, VisionTest,
};

pub const MAX_WINDOW_DAYS: u32 = 365;
pub const DEFAULT_SUSTAIN_DAYS: u32 = 1;
pub const DEFAULT_VISION_STEP_LOGMAR: f64 = 0.2;
const LOGMAR_TOLERANCE: f64 = 1e-9;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuleKind {
    Absolute,
    Drift,
    SymptomDuration,
    SymptomRecurrence,
    SymptomUnresolved,
    RedFlag,
    VisionChange,
    VisionPersistent,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Rule {
    pub id: String,
    pub indicator: Indicator,
    pub kind: RuleKind,
    #[serde(default)]
    pub threshold: Option<f64>,
    #[serde(default)]
    pub window_days: Option<u32>,
    #[serde(default)]
    pub min_days: Option<u32>,
    #[serde(default)]
    pub sustain_days: Option<u32>,
    pub level: Level,
    #[serde(default)]
    pub action: String,
    #[serde(default)]
    pub explanation: String,
    #[serde(default)]
    pub body_region: Option<BodyRegion>,
    #[serde(default)]
    pub source: String,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct RuleSet {
    pub rules: Vec<Rule>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuleError {
    pub rule_id: Option<String>,
    pub message: String,
}

impl RuleError {
    fn new(rule_id: Option<String>, message: impl Into<String>) -> Self {
        Self {
            rule_id,
            message: message.into(),
        }
    }
}

impl fmt::Display for RuleError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.rule_id {
            Some(id) => write!(f, "rule `{id}`: {}", self.message),
            None => write!(f, "rules: {}", self.message),
        }
    }
}

impl std::error::Error for RuleError {}

pub fn parse_rules(src: &str) -> Result<RuleSet, RuleError> {
    let table: toml::Table =
        toml::from_str(src).map_err(|e| RuleError::new(None, e.to_string()))?;
    let items = match table.get("rules").and_then(toml::Value::as_array) {
        Some(items) => items,
        None => return Err(RuleError::new(None, "the file has no [[rules]] array")),
    };
    let mut ids: HashSet<String> = HashSet::new();
    let mut rules = Vec::with_capacity(items.len());
    for (index, item) in items.iter().enumerate() {
        let id = item
            .get("id")
            .and_then(toml::Value::as_str)
            .map(str::to_string);
        let rule = item
            .clone()
            .try_into::<Rule>()
            .map_err(|e| RuleError::new(id, format!("entry {}: {e}", index + 1)))?;
        check_rule(&rule).map_err(|message| RuleError::new(Some(rule.id.clone()), message))?;
        if !ids.insert(rule.id.clone()) {
            return Err(RuleError::new(Some(rule.id), "the id is not unique"));
        }
        rules.push(rule);
    }
    Ok(RuleSet { rules })
}

fn check_rule(rule: &Rule) -> Result<(), String> {
    if rule.id.trim().is_empty() {
        return Err("`id` is empty".to_string());
    }
    let texts = [
        ("source", &rule.source),
        ("action", &rule.action),
        ("explanation", &rule.explanation),
    ];
    for (name, text) in texts {
        if text.trim().is_empty() {
            return Err(format!("`{name}` is empty"));
        }
    }
    let indicator_fits = match rule.kind {
        RuleKind::Absolute | RuleKind::Drift => rule.indicator.is_numeric(),
        RuleKind::SymptomDuration | RuleKind::SymptomRecurrence | RuleKind::SymptomUnresolved => {
            rule.indicator == Indicator::Symptom
        }
        RuleKind::RedFlag => rule.indicator == Indicator::RedFlag,
        RuleKind::VisionChange | RuleKind::VisionPersistent => rule.indicator == Indicator::Vision,
    };
    if !indicator_fits {
        return Err(format!(
            "indicator {:?} is not valid for kind {:?}",
            rule.indicator, rule.kind
        ));
    }
    let needs_threshold = match rule.kind {
        RuleKind::Absolute => rule.indicator != Indicator::ExerciseMin,
        RuleKind::Drift
        | RuleKind::SymptomDuration
        | RuleKind::SymptomRecurrence
        | RuleKind::VisionChange => true,
        RuleKind::SymptomUnresolved | RuleKind::RedFlag | RuleKind::VisionPersistent => false,
    };
    if needs_threshold && rule.threshold.is_none() {
        return Err("`threshold` is missing".to_string());
    }
    if rule.threshold.is_some_and(|t| !t.is_finite()) {
        return Err("`threshold` must be a finite number".to_string());
    }
    let needs_window = matches!(rule.kind, RuleKind::Absolute | RuleKind::SymptomRecurrence);
    if needs_window && rule.window_days.is_none() {
        return Err("`window_days` is missing".to_string());
    }
    let counts = [
        ("window_days", rule.window_days),
        ("min_days", rule.min_days),
        ("sustain_days", rule.sustain_days),
    ];
    for (name, value) in counts {
        if value.is_some_and(|v| v == 0 || v > MAX_WINDOW_DAYS) {
            return Err(format!("`{name}` must be 1 to {MAX_WINDOW_DAYS}"));
        }
    }
    if rule.window_days.is_some() && rule.min_days > rule.window_days {
        return Err("`min_days` must not be more than `window_days`".to_string());
    }
    if rule.kind == RuleKind::Drift
        && rule
            .window_days
            .is_some_and(|w| w != baseline::DRIFT_WINDOW_DAYS)
    {
        return Err(format!(
            "`window_days` must be {} for a drift rule",
            baseline::DRIFT_WINDOW_DAYS
        ));
    }
    if rule.kind == RuleKind::Drift && rule.min_days > Some(baseline::DRIFT_WINDOW_DAYS) {
        return Err(format!(
            "`min_days` must not be more than {} for a drift rule",
            baseline::DRIFT_WINDOW_DAYS
        ));
    }
    Ok(())
}

pub fn evaluate(
    day: MissionDay,
    data: &MissionData,
    rules: &RuleSet,
    settings: &Settings,
) -> Assessment {
    let mut fired = Vec::new();
    let mut short: HashSet<Indicator> = HashSet::new();
    let mut evaluable: HashSet<Indicator> = HashSet::new();
    for rule in &rules.rules {
        match rule.kind {
            RuleKind::Absolute => {
                if absolute(day, data, rule, settings, &mut fired) {
                    evaluable.insert(rule.indicator);
                } else {
                    short.insert(rule.indicator);
                }
            }
            RuleKind::Drift => fired.extend(drift(day, data, rule)),
            RuleKind::SymptomDuration => fired.extend(symptom_duration(day, data, rule)),
            RuleKind::SymptomRecurrence => fired.extend(symptom_recurrence(day, data, rule)),
            RuleKind::SymptomUnresolved => fired.extend(symptom_unresolved(day, data, rule)),
            RuleKind::RedFlag => fired.extend(red_flag(day, data, rule)),
            RuleKind::VisionChange => fired.extend(vision_change(day, data, rule)),
            RuleKind::VisionPersistent => fired.extend(vision_persistent(day, data, rule)),
        }
    }
    fired.sort_by_key(|f| Reverse(f.level));
    let level = fired.iter().map(|f| f.level).max().unwrap_or(Level::Ok);
    let indicators = Indicator::numeric()
        .iter()
        .map(|&indicator| {
            let all_short = short.contains(&indicator) && !evaluable.contains(&indicator);
            let min_days = drift_min_days(rules, indicator);
            indicator_status(day, data, indicator, &fired, all_short, min_days)
        })
        .collect();
    let preflight_days = Indicator::numeric()
        .iter()
        .filter_map(|&indicator| baseline::baseline(data, indicator))
        .map(|b| b.n)
        .max()
        .unwrap_or(0);
    Assessment {
        day,
        level,
        fired,
        indicators,
        drift_enabled: preflight_days >= baseline::MIN_PREFLIGHT_DAYS,
        preflight_days: u32::try_from(preflight_days).unwrap_or(u32::MAX),
    }
}

fn drift_min_days(rules: &RuleSet, indicator: Indicator) -> usize {
    rules
        .rules
        .iter()
        .filter(|r| r.kind == RuleKind::Drift && r.indicator == indicator)
        .map(|r| r.min_days.map_or(baseline::DEFAULT_DRIFT_MIN_DAYS, |m| m as usize))
        .min()
        .unwrap_or(baseline::DEFAULT_DRIFT_MIN_DAYS)
}

fn indicator_status(
    day: MissionDay,
    data: &MissionData,
    indicator: Indicator,
    fired: &[FiredRule],
    all_short: bool,
    drift_min_days: usize,
) -> IndicatorStatus {
    let base = baseline::baseline(data, indicator);
    let mean_7d = baseline::mean_7d(data, indicator, day);
    let level = fired
        .iter()
        .filter(|f| f.indicator == indicator)
        .map(|f| f.level)
        .max();
    let state = if level.is_some() {
        IndicatorState::Flagged
    } else if mean_7d.is_none() || all_short {
        IndicatorState::NotEnoughData
    } else {
        IndicatorState::Ok
    };
    let drift_score =
        base.and_then(|b| baseline::drift_score_from(&b, data, indicator, day, drift_min_days));
    IndicatorStatus {
        indicator,
        state,
        level: level.unwrap_or(Level::Ok),
        baseline_median: base.map(|b| b.median),
        baseline_mad: base.map(|b| b.mad),
        mean_7d,
        drift_score,
    }
}

fn fire(
    rule: &Rule,
    value: Option<f64>,
    symptom: Option<SymptomKind>,
    body_region: Option<BodyRegion>,
) -> FiredRule {
    FiredRule {
        rule_id: rule.id.clone(),
        indicator: rule.indicator,
        level: rule.level,
        action: rule.action.clone(),
        explanation: rule.explanation.clone(),
        source: rule.source.clone(),
        body_region: body_region.or(rule.body_region),
        symptom,
        value,
    }
}

fn absolute(
    day: MissionDay,
    data: &MissionData,
    rule: &Rule,
    settings: &Settings,
    fired: &mut Vec<FiredRule>,
) -> bool {
    let window = rule.window_days.unwrap_or(1);
    let min_days = rule.min_days.unwrap_or(window).max(1) as usize;
    let values = baseline::window_values(data, rule.indicator, day, window);
    if values.len() < min_days {
        return false;
    }
    let mean = match baseline::mean(&values) {
        Some(mean) => mean,
        None => return false,
    };
    let threshold = match (rule.threshold, rule.indicator) {
        (Some(threshold), _) => threshold,
        (None, Indicator::ExerciseMin) => settings.exercise_prescription_min,
        (None, _) => return true,
    };
    let past_threshold = match rule.indicator.bad_direction() {
        Direction::Low => mean < threshold,
        Direction::High => mean > threshold,
    };
    if past_threshold {
        fired.push(fire(rule, Some(mean), None, None));
    }
    true
}

fn drift(day: MissionDay, data: &MissionData, rule: &Rule) -> Option<FiredRule> {
    let threshold = rule.threshold?;
    let base = baseline::baseline(data, rule.indicator)?;
    let min_days = rule
        .min_days
        .map_or(baseline::DEFAULT_DRIFT_MIN_DAYS, |m| m as usize);
    let sustain = rule.sustain_days.unwrap_or(DEFAULT_SUSTAIN_DAYS).max(1);
    let today = baseline::drift_score_from(&base, data, rule.indicator, day, min_days)?;
    if today < threshold {
        return None;
    }
    for back in 1..sustain {
        let earlier = day.saturating_sub(back as i32);
        let score = baseline::drift_score_from(&base, data, rule.indicator, earlier, min_days)?;
        if score < threshold {
            return None;
        }
    }
    Some(fire(rule, Some(today), None, None))
}

fn find_symptom(data: &MissionData, day: MissionDay, kind: SymptomKind) -> Option<&Symptom> {
    data.check(day)?.symptoms.iter().find(|s| s.kind == kind)
}

fn symptoms_on(data: &MissionData, day: MissionDay) -> &[Symptom] {
    match data.check(day) {
        Some(check) => check.symptoms.as_slice(),
        None => &[],
    }
}

fn symptom_duration(day: MissionDay, data: &MissionData, rule: &Rule) -> Vec<FiredRule> {
    let mut out = Vec::new();
    let threshold = match rule.threshold {
        Some(threshold) => threshold,
        None => return out,
    };
    for &kind in SymptomKind::all() {
        let latest = match find_symptom(data, day, kind) {
            Some(symptom) => symptom,
            None => continue,
        };
        let mut count: u32 = 0;
        let mut current = day;
        while find_symptom(data, current, kind).is_some() {
            count += 1;
            current -= 1;
        }
        if f64::from(count) > threshold {
            out.push(fire(
                rule,
                Some(f64::from(count)),
                Some(kind),
                Some(latest.region),
            ));
        }
    }
    out
}

fn symptom_recurrence(day: MissionDay, data: &MissionData, rule: &Rule) -> Vec<FiredRule> {
    let mut out = Vec::new();
    let (threshold, window) = match (rule.threshold, rule.window_days) {
        (Some(threshold), Some(window)) => (threshold, window),
        _ => return out,
    };
    let start = baseline::window_start(day, window);
    for &kind in SymptomKind::all() {
        let mut episodes: u32 = 0;
        let mut previous = false;
        let mut region = None;
        for current in start..=day {
            let found = find_symptom(data, current, kind);
            if let Some(symptom) = found {
                if !previous {
                    episodes += 1;
                }
                region = Some(symptom.region);
            }
            previous = found.is_some();
        }
        if episodes > 0 && f64::from(episodes) >= threshold {
            out.push(fire(rule, Some(f64::from(episodes)), Some(kind), region));
        }
    }
    out
}

fn symptom_fire(rule: &Rule, symptom: &Symptom) -> FiredRule {
    let value = Some(f64::from(symptom.severity));
    fire(rule, value, Some(symptom.kind), Some(symptom.region))
}

fn symptom_unresolved(day: MissionDay, data: &MissionData, rule: &Rule) -> Vec<FiredRule> {
    symptoms_on(data, day)
        .iter()
        .filter(|s| s.treated && !s.improved)
        .map(|s| symptom_fire(rule, s))
        .collect()
}

fn red_flag(day: MissionDay, data: &MissionData, rule: &Rule) -> Vec<FiredRule> {
    symptoms_on(data, day)
        .iter()
        .filter(|s| s.kind.is_red_flag())
        .map(|s| symptom_fire(rule, s))
        .collect()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Finding {
    Distortion,
    Acuity,
}

fn reference_test(data: &MissionData) -> Option<&VisionTest> {
    data.vision
        .iter()
        .filter(|t| t.day < 0)
        .max_by_key(|t| t.day)
        .or_else(|| data.vision.iter().min_by_key(|t| t.day))
}

fn tests_after(data: &MissionData, after: MissionDay, day: MissionDay) -> Vec<&VisionTest> {
    let mut tests: Vec<&VisionTest> = data
        .vision
        .iter()
        .filter(|t| t.day > after && t.day <= day)
        .collect();
    tests.sort_by_key(|t| t.day);
    tests
}

fn findings(reference: &VisionTest, test: &VisionTest, step: f64) -> Vec<(Eye, Finding)> {
    let mut out = Vec::new();
    let pairs = [
        (Eye::Left, &reference.left, &test.left),
        (Eye::Right, &reference.right, &test.right),
    ];
    for (eye, before, now) in pairs {
        if now.amsler_distortion && !before.amsler_distortion {
            out.push((eye, Finding::Distortion));
        }
        if now.acuity_logmar >= before.acuity_logmar + step - LOGMAR_TOLERANCE {
            out.push((eye, Finding::Acuity));
        }
    }
    out
}

fn acuity_change(reference: &VisionTest, test: &VisionTest) -> f64 {
    let left = test.left.acuity_logmar - reference.left.acuity_logmar;
    let right = test.right.acuity_logmar - reference.right.acuity_logmar;
    left.max(right)
}

fn vision_change(day: MissionDay, data: &MissionData, rule: &Rule) -> Option<FiredRule> {
    let step = rule.threshold?;
    let reference = reference_test(data)?;
    let tests = tests_after(data, reference.day, day);
    let latest = *tests.last()?;
    if findings(reference, latest, step).is_empty() {
        return None;
    }
    let value = Some(acuity_change(reference, latest));
    Some(fire(rule, value, None, Some(BodyRegion::Eyes)))
}

fn vision_persistent(day: MissionDay, data: &MissionData, rule: &Rule) -> Option<FiredRule> {
    let step = rule.threshold.unwrap_or(DEFAULT_VISION_STEP_LOGMAR);
    let reference = reference_test(data)?;
    let tests = tests_after(data, reference.day, day);
    if tests.len() < 2 {
        return None;
    }
    let latest = tests[tests.len() - 1];
    let previous = findings(reference, tests[tests.len() - 2], step);
    let repeated = findings(reference, latest, step)
        .iter()
        .any(|finding| previous.contains(finding));
    if !repeated {
        return None;
    }
    let value = Some(acuity_change(reference, latest));
    Some(fire(rule, value, None, Some(BodyRegion::Eyes)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{DailyCheck, EyeResult};

    fn rules(src: &str) -> RuleSet {
        match parse_rules(src) {
            Ok(set) => set,
            Err(error) => panic!("{error}"),
        }
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

    fn check(day: MissionDay) -> DailyCheck {
        DailyCheck {
            day,
            sleep_start_min: 1380,
            sleep_end_min: 420,
            sleep_quality: 7,
            sleep_aid: false,
            mood: 7,
            stress: 3,
            tiredness: 3,
            workload: 5,
            fluid_l: 2.5,
            resistive_min: 30,
            aerobic_min: 30,
            symptoms: Vec::new(),
        }
    }

    fn sleep_check(day: MissionDay, sleep_min: u16) -> DailyCheck {
        let mut result = check(day);
        result.sleep_end_min = (1380 + sleep_min) % 1440;
        result
    }

    fn symptom(kind: SymptomKind, region: BodyRegion) -> Symptom {
        Symptom {
            kind,
            severity: 2,
            region,
            treated: false,
            improved: false,
        }
    }

    fn with_symptom(day: MissionDay, kind: SymptomKind) -> DailyCheck {
        let mut result = check(day);
        result.symptoms.push(symptom(kind, BodyRegion::Head));
        result
    }

    fn data_of(checks: impl IntoIterator<Item = DailyCheck>) -> MissionData {
        let mut data = MissionData::default();
        for item in checks {
            data.upsert_check(item);
        }
        data
    }

    fn eye(acuity_logmar: f64, amsler_distortion: bool) -> EyeResult {
        EyeResult {
            acuity_logmar,
            amsler_distortion,
            amsler_cells: Vec::new(),
        }
    }

    fn vision(day: MissionDay, left: EyeResult, right: EyeResult) -> VisionTest {
        VisionTest { day, left, right }
    }

    fn ids(assessment: &Assessment) -> Vec<String> {
        assessment.fired.iter().map(|f| f.rule_id.clone()).collect()
    }

    fn sleep_rules() -> RuleSet {
        let fields = r#"
indicator = "sleep_hours"
kind = "absolute"
threshold = 6.0
window_days = 7
level = "self_care"
"#;
        rules(&rule_toml("sleep_7d", fields))
    }

    fn duration_rules() -> RuleSet {
        let fields = r#"
indicator = "symptom"
kind = "symptom_duration"
threshold = 7
level = "tell_cmo"
"#;
        rules(&rule_toml("long", fields))
    }

    #[test]
    fn parse_all_kinds() {
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
indicator = "symptom"
kind = "symptom_duration"
threshold = 7
level = "tell_cmo"
action = "Tell the CMO."
explanation = "Long symptom."
source = "https://example.org/c"

[[rules]]
id = "red"
indicator = "red_flag"
kind = "red_flag"
level = "flight_surgeon"
body_region = "chest"
action = "Call."
explanation = "Red flag."
source = "https://example.org/d"
"#;
        let set = rules(src);
        assert_eq!(set.rules.len(), 4);
        assert_eq!(set.rules[0].kind, RuleKind::Absolute);
        assert_eq!(set.rules[0].min_days, Some(5));
        assert_eq!(set.rules[1].indicator, Indicator::Stress);
        assert_eq!(set.rules[1].sustain_days, Some(7));
        assert_eq!(set.rules[2].threshold, Some(7.0));
        assert_eq!(set.rules[3].level, Level::FlightSurgeon);
        assert_eq!(set.rules[3].body_region, Some(BodyRegion::Chest));
    }

    #[test]
    fn empty_source_names_the_rule() {
        let src = r#"
[[rules]]
id = "fluid_3d"
indicator = "fluid_l"
kind = "absolute"
threshold = 2.5
window_days = 3
level = "self_care"
action = "Drink."
explanation = "Low fluid."
source = "  "
"#;
        let error = parse_rules(src).unwrap_err();
        assert_eq!(error.rule_id.as_deref(), Some("fluid_3d"));
        assert!(error.to_string().contains("fluid_3d"));
        assert!(error.message.contains("source"));
    }

    #[test]
    fn duplicate_id_is_rejected() {
        let fields = r#"
indicator = "red_flag"
kind = "red_flag"
level = "flight_surgeon"
"#;
        let src = format!("{}{}", rule_toml("red", fields), rule_toml("red", fields));
        let error = parse_rules(&src).unwrap_err();
        assert_eq!(error.rule_id.as_deref(), Some("red"));
        assert!(error.message.contains("unique"));
    }

    #[test]
    fn bad_entries_are_rejected() {
        let missing_threshold = r#"
indicator = "mood"
kind = "drift"
level = "self_care"
"#;
        let wrong_indicator = r#"
indicator = "mood"
kind = "red_flag"
level = "flight_surgeon"
"#;
        let unknown_indicator = r#"
indicator = "sleeep"
kind = "absolute"
threshold = 1.0
window_days = 3
level = "ok"
"#;
        let missing_window = r#"
indicator = "fluid_l"
kind = "absolute"
threshold = 2.5
level = "self_care"
"#;
        let unknown_field = r#"
indicator = "fluid_l"
kind = "absolute"
treshold = 2.5
window_days = 3
level = "self_care"
"#;
        let drift_window = r#"
indicator = "mood"
kind = "drift"
threshold = 2.0
window_days = 14
level = "self_care"
"#;
        let cases = [
            ("drift", missing_threshold),
            ("drift_window", drift_window),
            ("flag", wrong_indicator),
            ("typo", unknown_indicator),
            ("window", missing_window),
            ("field", unknown_field),
        ];
        for (id, fields) in cases {
            let error = parse_rules(&rule_toml(id, fields)).unwrap_err();
            assert_eq!(error.rule_id.as_deref(), Some(id));
        }
        assert!(parse_rules("title = \"no rules\"").is_err());
        assert!(parse_rules("[[rules]\n").is_err());
    }

    #[test]
    fn sleep_absolute_fires_below_threshold() {
        let data = data_of((0..7).map(|d| sleep_check(d, 300)));
        let result = evaluate(6, &data, &sleep_rules(), &Settings::default());
        assert_eq!(ids(&result), ["sleep_7d"]);
        assert_eq!(result.level, Level::SelfCare);
        assert_eq!(result.fired[0].value, Some(5.0));
        let status = &result.indicators[0];
        assert_eq!(status.indicator, Indicator::SleepHours);
        assert_eq!(status.state, IndicatorState::Flagged);
        assert_eq!(status.level, Level::SelfCare);
    }

    #[test]
    fn sleep_absolute_quiet_above_threshold() {
        let data = data_of((0..7).map(|d| sleep_check(d, 480)));
        let result = evaluate(6, &data, &sleep_rules(), &Settings::default());
        assert!(result.fired.is_empty());
        assert_eq!(result.level, Level::Ok);
        assert_eq!(result.indicators[0].state, IndicatorState::Ok);
    }

    #[test]
    fn not_enough_data_does_not_fire() {
        let data = data_of((4..7).map(|d| sleep_check(d, 240)));
        let result = evaluate(6, &data, &sleep_rules(), &Settings::default());
        assert!(result.fired.is_empty());
        assert_eq!(result.level, Level::Ok);
        assert_eq!(result.indicators[0].state, IndicatorState::NotEnoughData);
        let settings = Settings::default();
        let empty = evaluate(6, &MissionData::default(), &sleep_rules(), &settings);
        assert_eq!(empty.indicators.len(), Indicator::numeric().len());
        for status in &empty.indicators {
            assert_eq!(status.state, IndicatorState::NotEnoughData);
        }
    }

    #[test]
    fn red_flag_gives_flight_surgeon() {
        let fields = r#"
indicator = "red_flag"
kind = "red_flag"
level = "flight_surgeon"
"#;
        let set = rules(&rule_toml("red", fields));
        let mut today = check(3);
        today
            .symptoms
            .push(symptom(SymptomKind::ChestPain, BodyRegion::Chest));
        today
            .symptoms
            .push(symptom(SymptomKind::Headache, BodyRegion::Head));
        let data = data_of([today]);
        let result = evaluate(3, &data, &set, &Settings::default());
        assert_eq!(result.level, Level::FlightSurgeon);
        assert_eq!(result.fired.len(), 1);
        assert_eq!(result.fired[0].symptom, Some(SymptomKind::ChestPain));
        assert_eq!(result.fired[0].body_region, Some(BodyRegion::Chest));
        let next = evaluate(4, &data, &set, &Settings::default());
        assert_eq!(next.level, Level::Ok);
    }

    #[test]
    fn symptom_duration_needs_more_than_threshold_days() {
        let data = data_of((0..8).map(|d| with_symptom(d, SymptomKind::Headache)));
        let seven = evaluate(6, &data, &duration_rules(), &Settings::default());
        assert!(seven.fired.is_empty());
        let eight = evaluate(7, &data, &duration_rules(), &Settings::default());
        assert_eq!(eight.level, Level::TellCmo);
        assert_eq!(eight.fired[0].symptom, Some(SymptomKind::Headache));
        assert_eq!(eight.fired[0].body_region, Some(BodyRegion::Head));
        assert_eq!(eight.fired[0].value, Some(8.0));
    }

    #[test]
    fn missing_day_breaks_symptom_duration() {
        let checks = (0..9)
            .filter(|d| *d != 4)
            .map(|d| with_symptom(d, SymptomKind::Nausea));
        let result = evaluate(8, &data_of(checks), &duration_rules(), &Settings::default());
        assert!(result.fired.is_empty());
    }

    #[test]
    fn symptom_recurrence_counts_episodes() {
        let fields = r#"
indicator = "symptom"
kind = "symptom_recurrence"
threshold = 2
window_days = 30
level = "tell_cmo"
"#;
        let set = rules(&rule_toml("again", fields));
        let data = data_of((0..10).map(|d| {
            if d == 1 || d == 2 || d == 6 {
                with_symptom(d, SymptomKind::BackPain)
            } else {
                check(d)
            }
        }));
        let first = evaluate(5, &data, &set, &Settings::default());
        assert!(first.fired.is_empty());
        let second = evaluate(6, &data, &set, &Settings::default());
        assert_eq!(second.fired.len(), 1);
        assert_eq!(second.fired[0].symptom, Some(SymptomKind::BackPain));
        assert_eq!(second.fired[0].value, Some(2.0));
        let later = evaluate(40, &data, &set, &Settings::default());
        assert!(later.fired.is_empty());
    }

    #[test]
    fn symptom_unresolved_fires_when_treated_and_not_improved() {
        let fields = r#"
indicator = "symptom"
kind = "symptom_unresolved"
level = "tell_cmo"
"#;
        let set = rules(&rule_toml("unresolved", fields));
        let mut rash = symptom(SymptomKind::SkinRash, BodyRegion::Arms);
        rash.treated = true;
        let mut today = check(2);
        today.symptoms.push(rash.clone());
        let result = evaluate(2, &data_of([today]), &set, &Settings::default());
        assert_eq!(result.level, Level::TellCmo);
        assert_eq!(result.fired[0].body_region, Some(BodyRegion::Arms));
        rash.improved = true;
        let mut better_day = check(2);
        better_day.symptoms.push(rash);
        let better = evaluate(2, &data_of([better_day]), &set, &Settings::default());
        assert_eq!(better.level, Level::Ok);
    }

    fn stress_mission() -> MissionData {
        data_of((-14..10).map(|d| {
            let mut item = check(d);
            item.stress = if d >= 0 {
                9
            } else if d.rem_euclid(2) == 0 {
                3
            } else {
                4
            };
            item
        }))
    }

    fn stress_drift_rules(sustain_days: u32) -> RuleSet {
        let fields = format!(
            r#"
indicator = "stress"
kind = "drift"
threshold = 2.0
sustain_days = {sustain_days}
level = "self_care"
"#
        );
        rules(&rule_toml("stress_drift", &fields))
    }

    #[test]
    fn drift_needs_sustained_score() {
        let set = stress_drift_rules(3);
        let data = stress_mission();
        let day2 = evaluate(2, &data, &set, &Settings::default());
        assert!(day2.drift_enabled);
        assert_eq!(day2.preflight_days, 14);
        assert!(day2.fired.is_empty());
        let day3 = evaluate(3, &data, &set, &Settings::default());
        assert_eq!(ids(&day3), ["stress_drift"]);
        assert!(day3.fired[0].value.unwrap_or(0.0) >= 2.0);
        let status = day3
            .indicators
            .iter()
            .find(|s| s.indicator == Indicator::Stress);
        assert_eq!(status.map(|s| s.state), Some(IndicatorState::Flagged));
        assert_eq!(status.and_then(|s| s.baseline_median), Some(3.5));
    }

    #[test]
    fn status_drift_score_uses_rule_min_days() {
        let fields = r#"
indicator = "stress"
kind = "drift"
threshold = 2.0
min_days = 3
level = "self_care"
"#;
        let set = rules(&rule_toml("stress_drift", fields));
        let mut data = stress_mission();
        data.checks.retain(|c| c.day < 0 || c.day >= 4);
        let result = evaluate(6, &data, &set, &Settings::default());
        assert_eq!(ids(&result), ["stress_drift"]);
        let status = result
            .indicators
            .iter()
            .find(|s| s.indicator == Indicator::Stress);
        assert!(status.and_then(|s| s.drift_score).is_some());
    }

    #[test]
    fn one_evaluable_absolute_rule_gives_a_state() {
        let short = r#"
indicator = "sleep_hours"
kind = "absolute"
threshold = 5.0
window_days = 3
level = "tell_cmo"
"#;
        let long = r#"
indicator = "sleep_hours"
kind = "absolute"
threshold = 6.0
window_days = 7
min_days = 5
level = "self_care"
"#;
        let src = format!("{}{}", rule_toml("sleep_3d", short), rule_toml("sleep_7d", long));
        let set = rules(&src);
        let data = data_of((4..7).map(|d| sleep_check(d, 480)));
        let result = evaluate(6, &data, &set, &Settings::default());
        assert!(result.fired.is_empty());
        let status = result
            .indicators
            .iter()
            .find(|s| s.indicator == Indicator::SleepHours);
        assert_eq!(status.map(|s| s.state), Some(IndicatorState::Ok));
    }

    #[test]
    fn drift_is_off_with_few_preflight_days() {
        let set = stress_drift_rules(1);
        let mut data = stress_mission();
        data.checks.retain(|c| c.day >= -6);
        let result = evaluate(5, &data, &set, &Settings::default());
        assert!(!result.drift_enabled);
        assert_eq!(result.preflight_days, 6);
        assert!(result.fired.is_empty());
    }

    fn vision_rules() -> RuleSet {
        let change = r#"
indicator = "vision"
kind = "vision_change"
threshold = 0.2
level = "tell_cmo"
"#;
        let persistent = r#"
indicator = "vision"
kind = "vision_persistent"
level = "flight_surgeon"
"#;
        let src = format!(
            "{}{}",
            rule_toml("vision_change", change),
            rule_toml("vision_persistent", persistent)
        );
        rules(&src)
    }

    #[test]
    fn vision_change_and_persistent() {
        let set = vision_rules();
        let settings = Settings::default();
        let mut data = MissionData::default();
        data.upsert_vision(vision(-7, eye(0.0, false), eye(0.1, false)));
        data.upsert_vision(vision(63, eye(0.0, false), eye(0.1, false)));
        data.upsert_vision(vision(70, eye(0.0, true), eye(0.1, false)));
        data.upsert_vision(vision(77, eye(0.0, true), eye(0.1, false)));
        assert_eq!(evaluate(69, &data, &set, &settings).level, Level::Ok);
        let week10 = evaluate(70, &data, &set, &settings);
        assert_eq!(ids(&week10), ["vision_change"]);
        assert_eq!(week10.fired[0].body_region, Some(BodyRegion::Eyes));
        assert_eq!(evaluate(76, &data, &set, &settings).level, Level::TellCmo);
        let week11 = evaluate(77, &data, &set, &settings);
        assert_eq!(week11.level, Level::FlightSurgeon);
        assert_eq!(ids(&week11), ["vision_persistent", "vision_change"]);
    }

    #[test]
    fn vision_acuity_step_and_different_findings() {
        let set = vision_rules();
        let settings = Settings::default();
        let mut data = MissionData::default();
        data.upsert_vision(vision(-3, eye(0.0, false), eye(0.1, false)));
        data.upsert_vision(vision(7, eye(0.1, false), eye(0.3, false)));
        data.upsert_vision(vision(14, eye(0.0, true), eye(0.1, false)));
        let first = evaluate(7, &data, &set, &settings);
        assert_eq!(ids(&first), ["vision_change"]);
        let second = evaluate(14, &data, &set, &settings);
        assert_eq!(ids(&second), ["vision_change"]);
    }

    #[test]
    fn exercise_uses_settings_prescription() {
        let fields = r#"
indicator = "exercise_min"
kind = "absolute"
window_days = 7
level = "self_care"
"#;
        let set = rules(&rule_toml("exercise", fields));
        let data = data_of((0..7).map(check));
        let result = evaluate(6, &data, &set, &Settings::default());
        assert_eq!(ids(&result), ["exercise"]);
        assert_eq!(result.fired[0].value, Some(60.0));
        let low = Settings {
            exercise_prescription_min: 45.0,
            ..Settings::default()
        };
        assert!(evaluate(6, &data, &set, &low).fired.is_empty());
    }

    #[test]
    fn rule_body_region_is_copied() {
        let fields = r#"
indicator = "fluid_l"
kind = "absolute"
threshold = 3.0
window_days = 3
level = "self_care"
body_region = "abdomen"
"#;
        let set = rules(&rule_toml("fluid", fields));
        let data = data_of((0..3).map(check));
        let result = evaluate(2, &data, &set, &Settings::default());
        assert_eq!(result.fired[0].body_region, Some(BodyRegion::Abdomen));
    }
}
