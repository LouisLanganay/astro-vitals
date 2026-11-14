use chrono::NaiveDate;

use crate::model::{Document, ScenarioId, ScenarioInfo};

pub const DEFAULT_SEED: u64 = 2026;
pub const MISSION_DAYS: i32 = 120;

pub fn info(id: ScenarioId) -> ScenarioInfo {
    let _ = id;
    todo!()
}

pub fn generate(id: ScenarioId, seed: u64, today: NaiveDate) -> Document {
    let _ = (id, seed, today);
    todo!()
}
