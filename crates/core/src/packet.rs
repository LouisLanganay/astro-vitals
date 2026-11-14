use chrono::{Days, NaiveDate};

use crate::baseline::{baseline, value};
use crate::model::{
    DatedRedFlag, DatedSymptom, Document, Indicator, IndicatorBaseline, PACKET_VERSION, Packet,
    PacketIndicator, RuleSubject,
};
use crate::rules::{RuleSet, evaluate};

pub const MAX_BYTES: usize = 16 * 1024;
pub const WINDOW_DAYS: u32 = 14;

pub fn build(doc: &Document, rules: &RuleSet, today: NaiveDate) -> Packet {
    let assessment = evaluate(doc, rules, today);
    let days: Vec<NaiveDate> = (0..u64::from(WINDOW_DAYS))
        .rev()
        .filter_map(|back| today.checked_sub_days(Days::new(back)))
        .collect();
    let checks = || days.iter().filter_map(|d| doc.checks.get(d));
    let flagged = Indicator::ALL
        .into_iter()
        .filter(|i| {
            assessment
                .fired
                .iter()
                .any(|f| f.subject == RuleSubject::Indicator(*i))
        })
        .map(|indicator| PacketIndicator {
            indicator,
            values: days.iter().map(|d| value(doc, indicator, *d)).collect(),
        })
        .collect();
    let mut packet = Packet {
        version: PACKET_VERSION,
        date: today,
        mission_day: assessment.mission_day,
        level: assessment.level,
        fired: assessment.fired,
        flagged,
        symptoms: checks()
            .flat_map(|c| {
                c.symptoms.iter().map(|s| DatedSymptom {
                    date: c.date,
                    symptom: s.clone(),
                })
            })
            .collect(),
        red_flags: checks()
            .flat_map(|c| {
                c.red_flags.iter().map(|k| DatedRedFlag {
                    date: c.date,
                    kind: *k,
                })
            })
            .collect(),
        baselines: Indicator::ALL
            .into_iter()
            .filter_map(|indicator| {
                Some(IndicatorBaseline {
                    indicator,
                    baseline: baseline(doc, indicator)?,
                })
            })
            .collect(),
    };
    if to_json(&packet).len() > MAX_BYTES {
        for f in &mut packet.fired {
            f.explanation.clear();
        }
    }
    while to_json(&packet).len() > MAX_BYTES && !packet.symptoms.is_empty() {
        packet.symptoms.drain(..(packet.symptoms.len() / 8).max(1));
    }
    packet
}

pub fn to_json(packet: &Packet) -> String {
    let pretty = serde_json::to_string_pretty(packet).unwrap_or_default();
    if pretty.len() <= MAX_BYTES {
        pretty
    } else {
        serde_json::to_string(packet).unwrap_or_default()
    }
}
