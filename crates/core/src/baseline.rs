use serde::{Deserialize, Serialize};

use crate::model::{Direction, Indicator, MissionData, MissionDay, Series, SeriesPoint};

pub const PREFLIGHT_DAYS: i32 = 14;
pub const MIN_PREFLIGHT_DAYS: usize = 7;
pub const DRIFT_WINDOW_DAYS: u32 = 7;
pub const DEFAULT_DRIFT_MIN_DAYS: usize = 4;
pub const MAD_SCALE: f64 = 1.4826;

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Baseline {
    pub median: f64,
    pub mad: f64,
    pub n: usize,
}

pub fn median(values: &[f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    let mut sorted = values.to_vec();
    sorted.sort_by(f64::total_cmp);
    let n = sorted.len();
    Some((sorted[(n - 1) / 2] + sorted[n / 2]) / 2.0)
}

pub fn mad(values: &[f64]) -> Option<f64> {
    let center = median(values)?;
    let deviations: Vec<f64> = values.iter().map(|v| (v - center).abs()).collect();
    median(&deviations)
}

pub fn mean(values: &[f64]) -> Option<f64> {
    if values.is_empty() {
        None
    } else {
        Some(values.iter().sum::<f64>() / values.len() as f64)
    }
}

pub fn robust_score(mean: f64, median: f64, mad: f64, min_scale: f64) -> f64 {
    let scale = (MAD_SCALE * mad).max(min_scale).max(f64::MIN_POSITIVE);
    (mean - median) / scale
}

pub fn window_start(end_day: MissionDay, window_days: u32) -> MissionDay {
    let span = i32::try_from(window_days).unwrap_or(i32::MAX);
    end_day.saturating_sub(span).saturating_add(1)
}

pub fn window_values(
    data: &MissionData,
    indicator: Indicator,
    end_day: MissionDay,
    window_days: u32,
) -> Vec<f64> {
    (window_start(end_day, window_days)..=end_day)
        .filter_map(|day| indicator.value(data, day))
        .collect()
}

pub fn mean_7d(data: &MissionData, indicator: Indicator, day: MissionDay) -> Option<f64> {
    mean(&window_values(data, indicator, day, DRIFT_WINDOW_DAYS))
}

pub fn baseline(data: &MissionData, indicator: Indicator) -> Option<Baseline> {
    let values = window_values(data, indicator, -1, PREFLIGHT_DAYS.unsigned_abs());
    Some(Baseline {
        median: median(&values)?,
        mad: mad(&values)?,
        n: values.len(),
    })
}

pub fn drift_score(
    data: &MissionData,
    indicator: Indicator,
    day: MissionDay,
    min_days: usize,
) -> Option<f64> {
    let base = baseline(data, indicator)?;
    drift_score_from(&base, data, indicator, day, min_days)
}

pub fn drift_score_from(
    base: &Baseline,
    data: &MissionData,
    indicator: Indicator,
    day: MissionDay,
    min_days: usize,
) -> Option<f64> {
    if base.n < MIN_PREFLIGHT_DAYS {
        return None;
    }
    let values = window_values(data, indicator, day, DRIFT_WINDOW_DAYS);
    if values.len() < min_days.max(1) {
        return None;
    }
    let recent = mean(&values)?;
    let raw = robust_score(recent, base.median, base.mad, indicator.min_scale());
    match indicator.bad_direction() {
        Direction::High => Some(raw),
        Direction::Low => Some(-raw),
    }
}

pub fn series(
    data: &MissionData,
    indicator: Indicator,
    from: MissionDay,
    to: MissionDay,
) -> Series {
    let points = (from..=to)
        .map(|day| SeriesPoint {
            day,
            value: indicator.value(data, day),
            mean_7d: mean_7d(data, indicator, day),
        })
        .collect();
    Series {
        indicator,
        points,
        baseline_median: baseline(data, indicator).map(|b| b.median),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::DailyCheck;

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    fn check(day: MissionDay, sleep_min: u16, stress: u8) -> DailyCheck {
        DailyCheck {
            day,
            sleep_start_min: 1380,
            sleep_end_min: (1380 + sleep_min) % 1440,
            sleep_quality: 7,
            sleep_aid: false,
            mood: 7,
            stress,
            tiredness: 3,
            workload: 5,
            fluid_l: 2.5,
            resistive_min: 40,
            aerobic_min: 50,
            symptoms: Vec::new(),
        }
    }

    fn mission(preflight_days: i32, flight_sleep_min: u16, flight_stress: u8) -> MissionData {
        let mut data = MissionData::default();
        for day in -preflight_days..0 {
            data.upsert_check(check(day, 480, 3));
        }
        for day in 0..10 {
            data.upsert_check(check(day, flight_sleep_min, flight_stress));
        }
        data
    }

    #[test]
    fn median_odd_and_even() {
        assert_eq!(median(&[3.0, 1.0, 2.0]), Some(2.0));
        assert_eq!(median(&[4.0, 1.0, 3.0, 2.0]), Some(2.5));
        assert_eq!(median(&[]), None);
    }

    #[test]
    fn mad_known_values() {
        assert_eq!(mad(&[1.0, 1.0, 2.0, 2.0, 4.0, 6.0, 9.0]), Some(1.0));
        assert_eq!(mad(&[2.0, 4.0, 6.0, 8.0]), Some(2.0));
        assert_eq!(mad(&[5.0, 5.0, 5.0]), Some(0.0));
        assert_eq!(mad(&[]), None);
    }

    #[test]
    fn robust_score_uses_mad() {
        let score = robust_score(7.0, 5.0, 1.0, 0.5);
        assert!(close(score, 2.0 / 1.4826));
    }

    #[test]
    fn mad_zero_uses_min_scale() {
        let score = robust_score(6.0, 5.0, 0.0, 0.5);
        assert!(score.is_finite());
        assert!(close(score, 2.0));
    }

    #[test]
    fn baseline_from_preflight_days() {
        let data = mission(14, 480, 3);
        let base = baseline(&data, Indicator::SleepHours);
        assert_eq!(
            base,
            Some(Baseline {
                median: 8.0,
                mad: 0.0,
                n: 14,
            })
        );
    }

    #[test]
    fn drift_sign_is_positive_for_bad_direction() {
        let data = mission(14, 360, 7);
        let sleep = drift_score(&data, Indicator::SleepHours, 9, 4);
        let stress = drift_score(&data, Indicator::Stress, 9, 4);
        assert!(close(sleep.unwrap_or(0.0), 8.0));
        assert!(close(stress.unwrap_or(0.0), 8.0));
    }

    #[test]
    fn drift_sign_is_negative_for_good_direction() {
        let data = mission(14, 600, 1);
        let sleep = drift_score(&data, Indicator::SleepHours, 9, 4);
        let stress = drift_score(&data, Indicator::Stress, 9, 4);
        assert!(sleep.unwrap_or(0.0) < 0.0);
        assert!(stress.unwrap_or(0.0) < 0.0);
    }

    #[test]
    fn drift_off_with_few_preflight_days() {
        let data = mission(6, 360, 7);
        assert_eq!(drift_score(&data, Indicator::SleepHours, 9, 4), None);
    }

    #[test]
    fn drift_needs_min_days_in_window() {
        let mut data = mission(14, 360, 7);
        data.checks.retain(|c| c.day < 0 || c.day > 7);
        assert_eq!(drift_score(&data, Indicator::SleepHours, 9, 4), None);
        assert!(drift_score(&data, Indicator::SleepHours, 9, 2).is_some());
    }

    #[test]
    fn window_values_skip_missing_days() {
        let mut data = mission(14, 480, 3);
        data.checks.retain(|c| c.day != 5);
        assert_eq!(window_values(&data, Indicator::Stress, 9, 7).len(), 6);
        assert_eq!(mean_7d(&data, Indicator::Stress, 9), Some(3.0));
    }

    #[test]
    fn series_has_one_point_per_day() {
        let data = mission(14, 480, 3);
        let result = series(&data, Indicator::SleepHours, -14, 12);
        assert_eq!(result.points.len(), 27);
        assert_eq!(result.baseline_median, Some(8.0));
        assert_eq!(result.points[26].value, None);
        assert_eq!(result.points[26].mean_7d, Some(8.0));
    }
}
