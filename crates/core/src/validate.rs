use chrono::{Datelike, NaiveDate};

use crate::model::{
    AMSLER_GRID_SIZE, Calibration, DailyCheck, EyeResult, FLUID_MAX_L, FieldError, MINUTES_PER_DAY,
    PvtInput, PvtTrial, SCALE_MAX, SEVERITY_MAX, SEVERITY_MIN, Settings, ValidationError,
    VisionResult,
};
use crate::pvt::TIMEOUT_MS;

pub const ACUITY_MIN_LOGMAR: f64 = -0.5;
pub const ACUITY_MAX_LOGMAR: f64 = 2.0;
pub const PX_PER_MM_MAX: f64 = 100.0;
pub const LAUNCH_YEAR_MIN: i32 = 2000;
pub const LAUNCH_YEAR_MAX: i32 = 2200;

#[derive(Default)]
struct Errors(Vec<FieldError>);

impl Errors {
    fn check(&mut self, ok: bool, field: impl Into<String>, message: impl Into<String>) {
        if !ok {
            self.0.push(FieldError {
                field: field.into(),
                message: message.into(),
            });
        }
    }

    fn date(&mut self, date: NaiveDate, today: NaiveDate) {
        self.check(date <= today, "date", "must not be after today");
    }

    fn calibration(&mut self, calibration: &Calibration) {
        self.check(
            calibration.px_per_mm > 0.0 && calibration.px_per_mm <= PX_PER_MM_MAX,
            "calibration.px_per_mm",
            format!("must be above 0 and at most {PX_PER_MM_MAX}"),
        );
    }

    fn eye(&mut self, name: &str, eye: &EyeResult) {
        self.check(
            (ACUITY_MIN_LOGMAR..=ACUITY_MAX_LOGMAR).contains(&eye.acuity_logmar),
            format!("{name}.acuity_logmar"),
            format!("must be {ACUITY_MIN_LOGMAR} to {ACUITY_MAX_LOGMAR}"),
        );
        for (i, cell) in eye.amsler_cells.iter().enumerate() {
            self.check(
                cell.row < AMSLER_GRID_SIZE && cell.col < AMSLER_GRID_SIZE,
                format!("{name}.amsler_cells[{i}]"),
                format!("must be in the grid of {AMSLER_GRID_SIZE} by {AMSLER_GRID_SIZE}"),
            );
        }
    }

    fn finish(self) -> Result<(), ValidationError> {
        if self.0.is_empty() {
            Ok(())
        } else {
            Err(ValidationError { errors: self.0 })
        }
    }
}

pub fn daily_check(check: &DailyCheck, today: NaiveDate) -> Result<(), ValidationError> {
    let mut e = Errors::default();
    e.date(check.date, today);
    if let Some(a) = &check.answers {
        for (field, minutes) in [
            ("answers.sleep_start_min", a.sleep_start_min),
            ("answers.sleep_end_min", a.sleep_end_min),
        ] {
            e.check(
                minutes < MINUTES_PER_DAY,
                field,
                format!("must be 0 to {}", MINUTES_PER_DAY - 1),
            );
        }
        for (field, scale) in [
            ("answers.sleep_quality", a.sleep_quality),
            ("answers.mood", a.mood),
            ("answers.stress", a.stress),
            ("answers.tiredness", a.tiredness),
            ("answers.workload", a.workload),
        ] {
            e.check(
                scale <= SCALE_MAX,
                field,
                format!("must be 0 to {SCALE_MAX}"),
            );
        }
        e.check(
            (0.0..=FLUID_MAX_L).contains(&a.fluid_l),
            "answers.fluid_l",
            format!("must be 0 to {FLUID_MAX_L}"),
        );
        for (field, minutes) in [
            ("answers.exercise_resistive_min", a.exercise_resistive_min),
            ("answers.exercise_aerobic_min", a.exercise_aerobic_min),
        ] {
            e.check(
                minutes <= MINUTES_PER_DAY,
                field,
                format!("must be 0 to {MINUTES_PER_DAY}"),
            );
        }
    }
    for (i, s) in check.symptoms.iter().enumerate() {
        e.check(
            (SEVERITY_MIN..=SEVERITY_MAX).contains(&s.severity),
            format!("symptoms[{i}].severity"),
            format!("must be {SEVERITY_MIN} to {SEVERITY_MAX}"),
        );
    }
    e.finish()
}

pub fn pvt_input(input: &PvtInput, today: NaiveDate) -> Result<(), ValidationError> {
    let mut e = Errors::default();
    e.date(input.date, today);
    e.check(
        !input.trials.is_empty(),
        "trials",
        "must have one trial or more",
    );
    for (i, trial) in input.trials.iter().enumerate() {
        if let PvtTrial::Response { rt_ms } = *trial {
            e.check(
                (0.0..=TIMEOUT_MS).contains(&rt_ms),
                format!("trials[{i}].rt_ms"),
                format!("must be 0 to {TIMEOUT_MS}"),
            );
        }
    }
    e.finish()
}

pub fn vision_result(
    result: &VisionResult,
    calibration: Option<&Calibration>,
    today: NaiveDate,
) -> Result<(), ValidationError> {
    let mut e = Errors::default();
    match calibration {
        Some(c) => e.calibration(c),
        None => e.check(false, "calibration", "calibrate the screen first"),
    }
    e.date(result.date, today);
    e.eye("left", &result.left);
    e.eye("right", &result.right);
    e.finish()
}

pub fn settings(settings: &Settings) -> Result<(), ValidationError> {
    let mut e = Errors::default();
    e.check(
        (LAUNCH_YEAR_MIN..=LAUNCH_YEAR_MAX).contains(&settings.launch_date.year()),
        "launch_date",
        format!("the year must be {LAUNCH_YEAR_MIN} to {LAUNCH_YEAR_MAX}"),
    );
    e.check(
        settings.exercise_prescription_min <= u32::from(MINUTES_PER_DAY),
        "exercise_prescription_min",
        format!("must be 0 to {MINUTES_PER_DAY}"),
    );
    if let Some(c) = &settings.calibration {
        e.calibration(c);
    }
    e.finish()
}
