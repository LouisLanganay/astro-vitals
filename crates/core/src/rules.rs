use std::collections::BTreeMap;

use chrono::{Days, NaiveDate};
use serde::{Deserialize, Serialize};

use crate::baseline::{baseline, min_scale, preflight_days, robust_score, value, window_mean};
use crate::mission::mission_day;
use crate::model::{
    Assessment, BodyRegion, Direction, Document, FiredRule, Indicator, IndicatorState,
    IndicatorStatus, Level, MEAN_WINDOW_DAYS, MIN_PREFLIGHT_DAYS, RedFlagKind, RegionStatus,
    RuleSubject, RulesError, Symptom, SymptomKind,
};

pub const ANY_SYMPTOM: &str = "any";
pub const EPSILON: f64 = 1e-9;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuleKind {
    Absolute,
    Drift,
    Vision,
    SymptomDuration,
    SymptomRecurrence,
    SymptomNotImproved,
    RedFlag,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct DriftLevels {
    pub self_care: f64,
    pub tell_cmo: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Rule {
    pub id: String,
    pub indicator: String,
    pub kind: RuleKind,
    pub threshold: Option<f64>,
    pub window_days: Option<u32>,
    pub min_days: Option<u32>,
    pub level: Level,
    pub action: String,
    pub explanation: String,
    pub body_region: Option<BodyRegion>,
    pub source: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct RuleSet {
    pub drift: DriftLevels,
    pub rules: Vec<Rule>,
}

fn named<T: Copy + Serialize>(all: &[T], name: &str) -> Option<T> {
    all.iter()
        .copied()
        .find(|x| serde_json::to_value(x).is_ok_and(|v| v == name))
}

fn indicator(name: &str) -> Option<Indicator> {
    named(&Indicator::ALL, name)
}

fn symptom_kinds(name: &str) -> Vec<SymptomKind> {
    if name == ANY_SYMPTOM {
        SymptomKind::ALL.to_vec()
    } else {
        named(&SymptomKind::ALL, name).into_iter().collect()
    }
}

fn red_flag(name: &str) -> Option<RedFlagKind> {
    named(&RedFlagKind::ALL, name)
}

fn is_vision(indicator: Indicator) -> bool {
    indicator.body_region() == BodyRegion::Eyes
}

fn check(rule: &Rule) -> Result<(), String> {
    for (name, text) in [
        ("action", &rule.action),
        ("explanation", &rule.explanation),
        ("source", &rule.source),
    ] {
        if text.trim().is_empty() {
            return Err(format!("`{name}` is empty"));
        }
    }
    if rule.level == Level::Ok {
        return Err("`level` must not be `ok`".into());
    }
    if rule.threshold.is_some_and(|t| !t.is_finite()) {
        return Err("`threshold` must be a finite number".into());
    }
    if rule.window_days == Some(0) {
        return Err("`window_days` must be 1 or more".into());
    }
    let need = |present: bool, name: &str| {
        if present {
            Ok(())
        } else {
            Err(format!("`{name}` is necessary for this kind"))
        }
    };
    let ind = indicator(&rule.indicator);
    let subject_ok = match rule.kind {
        RuleKind::Absolute => {
            need(rule.window_days.is_some(), "window_days")?;
            need(
                rule.threshold.is_some() || ind == Some(Indicator::ExerciseMin),
                "threshold",
            )?;
            ind.is_some()
        }
        RuleKind::Drift => {
            need(rule.window_days.is_some(), "window_days")?;
            need(
                rule.threshold.is_some() || rule.level != Level::FlightSurgeon,
                "threshold",
            )?;
            ind.is_some()
        }
        RuleKind::Vision => {
            need(rule.threshold.is_some(), "threshold")?;
            ind.is_some_and(is_vision)
        }
        RuleKind::SymptomDuration => {
            need(rule.threshold.is_some(), "threshold")?;
            !symptom_kinds(&rule.indicator).is_empty()
        }
        RuleKind::SymptomRecurrence => {
            need(rule.threshold.is_some(), "threshold")?;
            need(rule.window_days.is_some(), "window_days")?;
            !symptom_kinds(&rule.indicator).is_empty()
        }
        RuleKind::SymptomNotImproved => !symptom_kinds(&rule.indicator).is_empty(),
        RuleKind::RedFlag => {
            if rule.level != Level::FlightSurgeon {
                return Err("a red flag rule must have the level `flight_surgeon`".into());
            }
            need(rule.body_region.is_some(), "body_region")?;
            red_flag(&rule.indicator).is_some()
        }
    };
    if subject_ok {
        Ok(())
    } else {
        Err(format!(
            "`indicator` = \"{}\" is not valid for this kind",
            rule.indicator
        ))
    }
}

fn error(rule_id: Option<&str>, message: impl Into<String>) -> RulesError {
    RulesError {
        rule_id: rule_id.map(str::to_owned),
        message: message.into(),
    }
}

pub fn parse(src: &str) -> Result<RuleSet, RulesError> {
    let mut table: toml::Table = toml::from_str(src).map_err(|e| error(None, e.to_string()))?;
    let drift: DriftLevels = table
        .remove("drift")
        .ok_or_else(|| error(None, "the [drift] table is missing"))?
        .try_into()
        .map_err(|e: toml::de::Error| error(None, format!("[drift]: {}", e.message())))?;
    if !(drift.self_care > 0.0 && drift.tell_cmo >= drift.self_care) {
        return Err(error(
            None,
            "[drift]: `self_care` must be above 0 and `tell_cmo` must not be below `self_care`",
        ));
    }
    let Some(toml::Value::Array(items)) = table.remove("rules") else {
        return Err(error(None, "the [[rules]] list is missing"));
    };
    let mut rules: Vec<Rule> = Vec::new();
    for (n, item) in items.into_iter().enumerate() {
        let id = item
            .get("id")
            .and_then(toml::Value::as_str)
            .filter(|id| !id.trim().is_empty())
            .map(str::to_owned)
            .ok_or_else(|| error(None, format!("rule number {} has no `id`", n + 1)))?;
        let rule: Rule = item
            .try_into()
            .map_err(|e: toml::de::Error| error(Some(&id), e.message()))?;
        if rules.iter().any(|r| r.id == id) {
            return Err(error(Some(&id), "the `id` occurs two times"));
        }
        check(&rule).map_err(|message| error(Some(&id), message))?;
        rules.push(rule);
    }
    Ok(RuleSet { drift, rules })
}

fn drift_score(
    doc: &Document,
    indicator: Indicator,
    date: NaiveDate,
    window_days: u32,
    min_days: u32,
) -> Option<f64> {
    let b = baseline(doc, indicator)
        .filter(|b| preflight_days(doc) >= MIN_PREFLIGHT_DAYS && b.days >= MIN_PREFLIGHT_DAYS)?;
    let mean = window_mean(doc, indicator, date, window_days, min_days)?;
    Some(robust_score(mean, b.median, b.mad, min_scale(indicator)))
}

fn indicator_rule(
    doc: &Document,
    set: &RuleSet,
    rule: &Rule,
    indicator: Indicator,
    date: NaiveDate,
) -> Option<(bool, f64)> {
    let low = indicator.bad_direction() == Direction::Low;
    let min_days = rule.min_days.unwrap_or(1);
    match rule.kind {
        RuleKind::Absolute => {
            let limit = rule
                .threshold
                .unwrap_or(f64::from(doc.settings.exercise_prescription_min));
            let mean = window_mean(doc, indicator, date, rule.window_days?, min_days)?;
            Some((if low { mean < limit } else { mean >= limit }, mean))
        }
        RuleKind::Drift => {
            let limit = rule.threshold.unwrap_or(match rule.level {
                Level::TellCmo => set.drift.tell_cmo,
                _ => set.drift.self_care,
            });
            let score = drift_score(doc, indicator, date, rule.window_days?, min_days)?;
            let bad = if low { -score } else { score };
            Some((bad >= limit - EPSILON, score))
        }
        RuleKind::Vision => {
            let limit = rule.threshold?;
            let reference = match indicator {
                Indicator::AmslerLeft | Indicator::AmslerRight => 0.0,
                _ => baseline(doc, indicator)?.median,
            };
            let tests = min_days.max(1) as usize;
            let last: Vec<f64> = doc
                .vision
                .range(..=date)
                .rev()
                .take(tests)
                .filter_map(|(d, _)| value(doc, indicator, *d))
                .collect();
            if last.len() < tests {
                return None;
            }
            let finding = last.iter().all(|v| v - reference >= limit - EPSILON);
            Some((finding, last[0]))
        }
        _ => None,
    }
}

fn find(doc: &Document, date: NaiveDate, kind: SymptomKind) -> Option<&Symptom> {
    doc.checks
        .get(&date)?
        .symptoms
        .iter()
        .find(|s| s.kind == kind)
}

fn symptom_rule(
    doc: &Document,
    rule: &Rule,
    kind: SymptomKind,
    date: NaiveDate,
) -> Option<(BodyRegion, Option<f64>)> {
    match rule.kind {
        RuleKind::SymptomDuration => {
            let start = if doc.checks.contains_key(&date) {
                date
            } else {
                date.pred_opt()?
            };
            let run: Vec<&Symptom> = start
                .iter_days()
                .rev()
                .map_while(|d| find(doc, d, kind))
                .collect();
            let days = run.len() as f64;
            (days > rule.threshold?).then(|| (run[0].region, Some(days)))
        }
        RuleKind::SymptomRecurrence => {
            let back = Days::new(u64::from(rule.window_days?.saturating_sub(1)));
            let from = date.checked_sub_days(back)?;
            let mut episodes = 0.0;
            let mut present = false;
            let mut region = None;
            for check in doc.checks.range(from..=date).map(|(_, c)| c) {
                let symptom = check.symptoms.iter().find(|s| s.kind == kind);
                if symptom.is_some() && !present {
                    episodes += 1.0;
                }
                present = symptom.is_some();
                region = symptom.map(|s| s.region).or(region);
            }
            (episodes >= rule.threshold?).then_some((region?, Some(episodes)))
        }
        RuleKind::SymptomNotImproved => doc
            .checks
            .get(&date)?
            .symptoms
            .iter()
            .find(|s| s.kind == kind && s.treated && s.improved == Some(false))
            .map(|s| (s.region, None)),
        _ => None,
    }
}

fn fire(
    rule: &Rule,
    subject: RuleSubject,
    body_region: Option<BodyRegion>,
    value: Option<f64>,
) -> FiredRule {
    FiredRule {
        rule_id: rule.id.clone(),
        level: rule.level,
        action: rule.action.clone(),
        explanation: rule.explanation.clone(),
        body_region,
        source: rule.source.clone(),
        subject,
        value,
    }
}

pub fn evaluate(doc: &Document, rules: &RuleSet, date: NaiveDate) -> Assessment {
    let preflight_days = preflight_days(doc);
    let mut fired = Vec::new();
    let mut states: BTreeMap<Indicator, IndicatorState> = BTreeMap::new();

    for rule in &rules.rules {
        match rule.kind {
            RuleKind::Absolute | RuleKind::Drift | RuleKind::Vision => {
                let Some(ind) = indicator(&rule.indicator) else {
                    continue;
                };
                let state = states.entry(ind).or_insert(IndicatorState::NotEnoughData);
                let Some((fires, value)) = indicator_rule(doc, rules, rule, ind, date) else {
                    continue;
                };
                let level = if fires { rule.level } else { Level::Ok };
                if Some(level) > state.level() {
                    *state = level.into();
                }
                if fires {
                    let region = rule.body_region.unwrap_or(ind.body_region());
                    fired.push(fire(
                        rule,
                        RuleSubject::Indicator(ind),
                        Some(region),
                        Some(value),
                    ));
                }
            }
            RuleKind::SymptomDuration
            | RuleKind::SymptomRecurrence
            | RuleKind::SymptomNotImproved => {
                for kind in symptom_kinds(&rule.indicator) {
                    if let Some((region, value)) = symptom_rule(doc, rule, kind, date) {
                        fired.push(fire(rule, RuleSubject::Symptom(kind), Some(region), value));
                    }
                }
            }
            RuleKind::RedFlag => {
                let flags = doc.checks.get(&date).map(|c| c.red_flags.as_slice());
                if let Some(kind) = red_flag(&rule.indicator)
                    && flags.is_some_and(|f| f.contains(&kind))
                {
                    fired.push(fire(
                        rule,
                        RuleSubject::RedFlag(kind),
                        rule.body_region,
                        None,
                    ));
                }
            }
        }
    }
    fired.sort_by_key(|f| std::cmp::Reverse(f.level));

    let indicators: Vec<IndicatorStatus> = Indicator::ALL
        .iter()
        .map(|&ind| {
            let mean_7d = window_mean(doc, ind, date, MEAN_WINDOW_DAYS, 1);
            let no_rule = if mean_7d.is_some() {
                IndicatorState::Ok
            } else {
                IndicatorState::NotEnoughData
            };
            IndicatorStatus {
                indicator: ind,
                region: ind.body_region(),
                state: states.get(&ind).copied().unwrap_or(no_rule),
                value: value(doc, ind, date),
                mean_7d,
                baseline: baseline(doc, ind),
                drift_score: drift_score(doc, ind, date, MEAN_WINDOW_DAYS, 1),
            }
        })
        .collect();

    let symptoms = doc.checks.get(&date).map(|c| c.symptoms.as_slice());
    let regions = BodyRegion::ALL
        .iter()
        .map(|&region| {
            let fired: Vec<FiredRule> = fired
                .iter()
                .filter(|f| f.body_region == Some(region))
                .cloned()
                .collect();
            RegionStatus {
                region,
                level: fired.iter().map(|f| f.level).max().unwrap_or(Level::Ok),
                symptoms: symptoms
                    .unwrap_or_default()
                    .iter()
                    .filter(|s| s.region == region)
                    .cloned()
                    .collect(),
                indicators: indicators
                    .iter()
                    .filter(|i| i.region == region)
                    .cloned()
                    .collect(),
                fired,
            }
        })
        .collect();

    Assessment {
        date,
        mission_day: mission_day(doc.settings.launch_date, date),
        level: fired.iter().map(|f| f.level).max().unwrap_or(Level::Ok),
        fired,
        indicators,
        regions,
        preflight_days,
        drift_enabled: preflight_days >= MIN_PREFLIGHT_DAYS,
    }
}
