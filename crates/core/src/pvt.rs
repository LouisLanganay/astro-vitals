use crate::model::{PvtResult, PvtSubmission};

pub const LAPSE_MS: f64 = 355.0;
pub const FALSE_START_MS: f64 = 100.0;
pub const NO_RESPONSE_MS: f64 = 30_000.0;

pub fn score(submission: &PvtSubmission) -> PvtResult {
    let mut false_starts = submission.early_inputs;
    let mut lapses: u32 = 0;
    let mut valid: u32 = 0;
    let mut total = 0.0;
    for &rt in &submission.reaction_times_ms {
        if rt < FALSE_START_MS {
            false_starts = false_starts.saturating_add(1);
            continue;
        }
        if rt >= LAPSE_MS {
            lapses = lapses.saturating_add(1);
        }
        if rt >= NO_RESPONSE_MS {
            continue;
        }
        valid = valid.saturating_add(1);
        total += rt;
    }
    let mean_rt_ms = if valid == 0 {
        0.0
    } else {
        total / f64::from(valid)
    };
    let count = submission.reaction_times_ms.len();
    PvtResult {
        day: submission.day,
        trials: u32::try_from(count).unwrap_or(u32::MAX),
        mean_rt_ms,
        lapses,
        false_starts,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn submission(reaction_times_ms: Vec<f64>, early_inputs: u32) -> PvtSubmission {
        PvtSubmission {
            day: 3,
            reaction_times_ms,
            early_inputs,
        }
    }

    #[test]
    fn counts_lapses_and_false_starts() {
        let result = score(&submission(vec![250.0, 355.0, 80.0, 300.0, 400.0], 2));
        assert_eq!(result.day, 3);
        assert_eq!(result.trials, 5);
        assert_eq!(result.lapses, 2);
        assert_eq!(result.false_starts, 3);
        assert!((result.mean_rt_ms - 326.25).abs() < 1e-9);
    }

    #[test]
    fn thresholds_are_inclusive_where_specified() {
        let result = score(&submission(vec![99.9, 100.0, 354.9, 355.0], 0));
        assert_eq!(result.false_starts, 1);
        assert_eq!(result.lapses, 1);
    }

    #[test]
    fn no_response_counts_as_lapse() {
        let result = score(&submission(vec![NO_RESPONSE_MS, 300.0], 0));
        assert_eq!(result.lapses, 1);
        assert_eq!(result.false_starts, 0);
        assert!((result.mean_rt_ms - 300.0).abs() < 1e-9);
    }

    #[test]
    fn no_valid_trial_gives_zero_mean() {
        let result = score(&submission(vec![50.0, 20.0], 1));
        assert_eq!(result.trials, 2);
        assert_eq!(result.false_starts, 3);
        assert_eq!(result.lapses, 0);
        assert!(result.mean_rt_ms.abs() < 1e-12);
    }
}
