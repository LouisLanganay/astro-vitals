use std::collections::HashSet;

use serde::{Deserialize, Serialize};

use crate::model::{DailyCheck, EyeResult, PvtSubmission, VisionTest, MINUTES_PER_DAY};

pub const MAX_SCALE: u8 = 10;
pub const MAX_FLUID_L: f64 = 10.0;
pub const MAX_EXERCISE_MIN: u16 = 600;
pub const MIN_SEVERITY: u8 = 1;
pub const MAX_SEVERITY: u8 = 3;
pub const MAX_REACTION_MS: f64 = 30_000.0;
pub const MIN_LOGMAR: f64 = -0.3;
pub const MAX_LOGMAR: f64 = 1.6;
pub const AMSLER_SIZE: u8 = 20;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

fn push(errors: &mut Vec<ValidationError>, field: impl Into<String>, message: impl Into<String>) {
    errors.push(ValidationError {
        field: field.into(),
        message: message.into(),
    });
}

fn finish(errors: Vec<ValidationError>) -> Result<(), Vec<ValidationError>> {
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

pub fn validate_check(check: &DailyCheck) -> Result<(), Vec<ValidationError>> {
    let mut errors = Vec::new();
    let clock_fields = [
        ("sleep_start_min", check.sleep_start_min),
        ("sleep_end_min", check.sleep_end_min),
    ];
    for (field, value) in clock_fields {
        if value >= MINUTES_PER_DAY {
            push(&mut errors, field, "must be 0 to 1439 min after midnight");
        }
    }
    if check.sleep_start_min < MINUTES_PER_DAY && check.sleep_end_min < MINUTES_PER_DAY {
        let hours = check.sleep_hours();
        if hours <= 0.0 || hours > 24.0 {
            push(
                &mut errors,
                "sleep_end_min",
                "sleep must be more than 0 h and not more than 24 h",
            );
        }
    }
    let scales = [
        ("sleep_quality", check.sleep_quality),
        ("mood", check.mood),
        ("stress", check.stress),
        ("tiredness", check.tiredness),
        ("workload", check.workload),
    ];
    for (field, value) in scales {
        if value > MAX_SCALE {
            push(&mut errors, field, format!("must be 0 to {MAX_SCALE}"));
        }
    }
    if !(0.0..=MAX_FLUID_L).contains(&check.fluid_l) {
        push(
            &mut errors,
            "fluid_l",
            format!("must be 0 to {MAX_FLUID_L} L"),
        );
    }
    let exercise = [
        ("resistive_min", check.resistive_min),
        ("aerobic_min", check.aerobic_min),
    ];
    for (field, value) in exercise {
        if value > MAX_EXERCISE_MIN {
            push(
                &mut errors,
                field,
                format!("must be 0 to {MAX_EXERCISE_MIN} min"),
            );
        }
    }
    let mut kinds = HashSet::new();
    for symptom in &check.symptoms {
        if !(MIN_SEVERITY..=MAX_SEVERITY).contains(&symptom.severity) {
            push(
                &mut errors,
                "symptoms",
                format!("{:?}: severity must be 1 to 3", symptom.kind),
            );
        }
        if !kinds.insert(symptom.kind) {
            push(
                &mut errors,
                "symptoms",
                format!("{:?}: log each kind one time each day", symptom.kind),
            );
        }
    }
    finish(errors)
}

pub fn validate_pvt(submission: &PvtSubmission) -> Result<(), Vec<ValidationError>> {
    let mut errors = Vec::new();
    if submission.reaction_times_ms.is_empty() {
        push(&mut errors, "reaction_times_ms", "record at least 1 trial");
    }
    let out_of_range = submission
        .reaction_times_ms
        .iter()
        .filter(|&&rt| !(0.0..=MAX_REACTION_MS).contains(&rt))
        .count();
    if out_of_range > 0 {
        push(
            &mut errors,
            "reaction_times_ms",
            format!("each reaction time must be 0 to {MAX_REACTION_MS} ms"),
        );
    }
    finish(errors)
}

pub fn validate_vision(test: &VisionTest) -> Result<(), Vec<ValidationError>> {
    let mut errors = Vec::new();
    check_eye(&mut errors, "left", &test.left);
    check_eye(&mut errors, "right", &test.right);
    finish(errors)
}

fn check_eye(errors: &mut Vec<ValidationError>, eye: &str, result: &EyeResult) {
    if !(MIN_LOGMAR..=MAX_LOGMAR).contains(&result.acuity_logmar) {
        push(
            errors,
            format!("{eye}.acuity_logmar"),
            format!("must be {MIN_LOGMAR} to {MAX_LOGMAR} logMAR"),
        );
    }
    let outside = result
        .amsler_cells
        .iter()
        .any(|cell| cell[0] >= AMSLER_SIZE || cell[1] >= AMSLER_SIZE);
    if outside {
        push(
            errors,
            format!("{eye}.amsler_cells"),
            format!("each cell must be 0 to {} on each axis", AMSLER_SIZE - 1),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{BodyRegion, Symptom, SymptomKind};

    fn valid_check() -> DailyCheck {
        DailyCheck {
            day: 4,
            sleep_start_min: 1380,
            sleep_end_min: 420,
            sleep_quality: 7,
            sleep_aid: false,
            mood: 7,
            stress: 3,
            tiredness: 3,
            workload: 5,
            fluid_l: 2.5,
            resistive_min: 40,
            aerobic_min: 50,
            symptoms: vec![Symptom {
                kind: SymptomKind::Headache,
                severity: 2,
                region: BodyRegion::Head,
                treated: false,
                improved: false,
            }],
        }
    }

    fn fields(result: Result<(), Vec<ValidationError>>) -> Vec<String> {
        match result {
            Ok(()) => Vec::new(),
            Err(errors) => errors.into_iter().map(|e| e.field).collect(),
        }
    }

    fn eye(acuity_logmar: f64, amsler_cells: Vec<[u8; 2]>) -> EyeResult {
        EyeResult {
            acuity_logmar,
            amsler_distortion: !amsler_cells.is_empty(),
            amsler_cells,
        }
    }

    #[test]
    fn valid_check_passes() {
        assert_eq!(validate_check(&valid_check()), Ok(()));
    }

    #[test]
    fn sleep_minutes_out_of_range() {
        let mut check = valid_check();
        check.sleep_start_min = 1440;
        check.sleep_end_min = 2000;
        assert_eq!(
            fields(validate_check(&check)),
            ["sleep_start_min", "sleep_end_min"]
        );
    }

    #[test]
    fn zero_sleep_is_rejected() {
        let mut check = valid_check();
        check.sleep_end_min = check.sleep_start_min;
        assert_eq!(fields(validate_check(&check)), ["sleep_end_min"]);
    }

    #[test]
    fn scales_fluid_and_exercise_out_of_range() {
        let mut check = valid_check();
        check.mood = 11;
        check.workload = 200;
        check.fluid_l = -0.5;
        check.aerobic_min = 601;
        assert_eq!(
            fields(validate_check(&check)),
            ["mood", "workload", "fluid_l", "aerobic_min"]
        );
    }

    #[test]
    fn fluid_must_be_finite() {
        let mut check = valid_check();
        check.fluid_l = f64::NAN;
        assert_eq!(fields(validate_check(&check)), ["fluid_l"]);
        check.fluid_l = f64::INFINITY;
        assert_eq!(fields(validate_check(&check)), ["fluid_l"]);
    }

    #[test]
    fn symptom_severity_and_duplicates() {
        let mut check = valid_check();
        let mut second = check.symptoms[0].clone();
        second.severity = 0;
        check.symptoms.push(second);
        assert_eq!(fields(validate_check(&check)), ["symptoms", "symptoms"]);
    }

    #[test]
    fn pvt_ranges() {
        let good = PvtSubmission {
            day: 1,
            reaction_times_ms: vec![250.0, 30_000.0, 0.0],
            early_inputs: 0,
        };
        assert_eq!(validate_pvt(&good), Ok(()));
        let empty = PvtSubmission {
            reaction_times_ms: Vec::new(),
            ..good.clone()
        };
        assert_eq!(fields(validate_pvt(&empty)), ["reaction_times_ms"]);
        let bad = PvtSubmission {
            reaction_times_ms: vec![250.0, 30_000.5, -1.0, f64::NAN],
            ..good
        };
        assert_eq!(fields(validate_pvt(&bad)), ["reaction_times_ms"]);
    }

    #[test]
    fn vision_ranges() {
        let good = VisionTest {
            day: 7,
            left: eye(0.0, Vec::new()),
            right: eye(1.6, vec![[0, 19], [19, 0]]),
        };
        assert_eq!(validate_vision(&good), Ok(()));
        let bad = VisionTest {
            day: 7,
            left: eye(1.7, Vec::new()),
            right: eye(f64::NAN, vec![[20, 0]]),
        };
        let expected = [
            "left.acuity_logmar",
            "right.acuity_logmar",
            "right.amsler_cells",
        ];
        assert_eq!(fields(validate_vision(&bad)), expected);
    }
}
