use crate::model::{PvtInput, PvtResult};

pub const LAPSE_MS: f64 = 355.0;
pub const FALSE_START_MS: f64 = 100.0;
pub const TIMEOUT_MS: f64 = 30_000.0;
pub const DURATION_MS: f64 = 180_000.0;
pub const INTERVAL_MIN_MS: f64 = 1_000.0;
pub const INTERVAL_MAX_MS: f64 = 4_000.0;

pub fn score(input: &PvtInput) -> PvtResult {
    let _ = input;
    todo!()
}
