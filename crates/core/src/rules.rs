use chrono::NaiveDate;
use serde::Deserialize;

use crate::model::{Assessment, BodyRegion, Document, Level, RulesError};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuleKind {
    Absolute,
    Drift,
    SymptomDuration,
    SymptomRecurrence,
    RedFlag,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct DriftLevels {
    pub self_care: f64,
    pub tell_cmo: f64,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
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

pub fn parse(src: &str) -> Result<RuleSet, RulesError> {
    let _ = src;
    todo!()
}

pub fn evaluate(doc: &Document, rules: &RuleSet, date: NaiveDate) -> Assessment {
    let _ = (doc, rules, date);
    todo!()
}
