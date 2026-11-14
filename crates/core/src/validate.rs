use chrono::NaiveDate;

use crate::model::{Calibration, DailyCheck, PvtInput, Settings, ValidationError, VisionResult};

pub fn daily_check(check: &DailyCheck, today: NaiveDate) -> Result<(), ValidationError> {
    let _ = (check, today);
    todo!()
}

pub fn pvt_input(input: &PvtInput, today: NaiveDate) -> Result<(), ValidationError> {
    let _ = (input, today);
    todo!()
}

pub fn vision_result(
    result: &VisionResult,
    calibration: Option<&Calibration>,
    today: NaiveDate,
) -> Result<(), ValidationError> {
    let _ = (result, calibration, today);
    todo!()
}

pub fn settings(settings: &Settings) -> Result<(), ValidationError> {
    let _ = settings;
    todo!()
}
