use crate::model::{PvtInput, PvtResult, PvtTrial};

pub const LAPSE_MS: f64 = 355.0;
pub const FALSE_START_MS: f64 = 100.0;
pub const TIMEOUT_MS: f64 = 30_000.0;
pub const DURATION_MS: f64 = 180_000.0;
pub const INTERVAL_MIN_MS: f64 = 1_000.0;
pub const INTERVAL_MAX_MS: f64 = 4_000.0;

pub fn score(input: &PvtInput) -> PvtResult {
    let mut result = PvtResult {
        date: input.date,
        stimuli: 0,
        mean_rt_ms: None,
        lapses: 0,
        false_starts: 0,
    };
    let mut valid = Vec::new();
    for trial in &input.trials {
        match *trial {
            PvtTrial::Premature => {
                result.false_starts += 1;
                continue;
            }
            PvtTrial::Timeout => result.lapses += 1,
            PvtTrial::Response { rt_ms } if rt_ms < FALSE_START_MS => result.false_starts += 1,
            PvtTrial::Response { rt_ms } => {
                valid.push(rt_ms);
                if rt_ms >= LAPSE_MS {
                    result.lapses += 1;
                }
            }
        }
        result.stimuli += 1;
    }
    if !valid.is_empty() {
        result.mean_rt_ms = Some(valid.iter().sum::<f64>() / valid.len() as f64);
    }
    result
}
