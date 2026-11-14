use chrono::{Days, NaiveDate};

use crate::mission::mission_day;
use crate::model::{
    BASELINE_DAYS, Baseline, Document, Indicator, MEAN_WINDOW_DAYS, MINUTES_PER_DAY, Series,
    SeriesPoint,
};

pub const MAD_SCALE: f64 = 1.4826;

pub fn median(values: &[f64]) -> Option<f64> {
    let mut v = values.to_vec();
    v.sort_by(f64::total_cmp);
    let n = v.len();
    match n {
        0 => None,
        _ if n % 2 == 1 => Some(v[n / 2]),
        _ => Some((v[n / 2 - 1] + v[n / 2]) / 2.0),
    }
}

pub fn mad(values: &[f64]) -> Option<f64> {
    let m = median(values)?;
    median(&values.iter().map(|x| (x - m).abs()).collect::<Vec<_>>())
}

pub fn min_scale(indicator: Indicator) -> f64 {
    match indicator {
        Indicator::SleepHours => 0.5,
        Indicator::FluidL => 0.25,
        Indicator::ExerciseMin => 10.0,
        Indicator::PvtMeanRtMs => 15.0,
        Indicator::PvtLapses => 1.5,
        Indicator::AcuityLeft | Indicator::AcuityRight => 0.1,
        _ => 1.0,
    }
}

pub fn robust_score(value: f64, median: f64, mad: f64, min_scale: f64) -> f64 {
    (value - median) / (MAD_SCALE * mad).max(min_scale)
}

pub fn sleep_hours(start_min: u16, end_min: u16) -> f64 {
    let day = i32::from(MINUTES_PER_DAY);
    f64::from((i32::from(end_min) - i32::from(start_min)).rem_euclid(day)) / 60.0
}

pub fn value(doc: &Document, indicator: Indicator, date: NaiveDate) -> Option<f64> {
    let answers = || doc.checks.get(&date)?.answers.as_ref();
    let pvt = || doc.pvt.get(&date);
    let vision = || doc.vision.get(&date);
    let flag = |b: bool| if b { 1.0 } else { 0.0 };
    match indicator {
        Indicator::SleepHours => answers().map(|a| sleep_hours(a.sleep_start_min, a.sleep_end_min)),
        Indicator::SleepQuality => answers().map(|a| f64::from(a.sleep_quality)),
        Indicator::Mood => answers().map(|a| f64::from(a.mood)),
        Indicator::Stress => answers().map(|a| f64::from(a.stress)),
        Indicator::Tiredness => answers().map(|a| f64::from(a.tiredness)),
        Indicator::Workload => answers().map(|a| f64::from(a.workload)),
        Indicator::FluidL => answers().map(|a| a.fluid_l),
        Indicator::ExerciseMin => answers()
            .map(|a| f64::from(a.exercise_resistive_min) + f64::from(a.exercise_aerobic_min)),
        Indicator::PvtMeanRtMs => pvt()?.mean_rt_ms,
        Indicator::PvtLapses => pvt().map(|p| f64::from(p.lapses)),
        Indicator::PvtFalseStarts => pvt().map(|p| f64::from(p.false_starts)),
        Indicator::AcuityLeft => vision().map(|v| v.left.acuity_logmar),
        Indicator::AcuityRight => vision().map(|v| v.right.acuity_logmar),
        Indicator::AmslerLeft => vision().map(|v| flag(v.left.amsler_distortion)),
        Indicator::AmslerRight => vision().map(|v| flag(v.right.amsler_distortion)),
    }
}

fn window_values(
    doc: &Document,
    indicator: Indicator,
    end: NaiveDate,
    window_days: u32,
) -> Vec<f64> {
    (0..u64::from(window_days))
        .filter_map(|back| value(doc, indicator, end.checked_sub_days(Days::new(back))?))
        .collect()
}

fn preflight_values(doc: &Document, indicator: Indicator) -> Vec<f64> {
    match doc.settings.launch_date.pred_opt() {
        Some(last) => window_values(doc, indicator, last, BASELINE_DAYS),
        None => Vec::new(),
    }
}

pub fn preflight_days(doc: &Document) -> u32 {
    preflight_values(doc, Indicator::Mood).len() as u32
}

pub fn baseline(doc: &Document, indicator: Indicator) -> Option<Baseline> {
    let values = preflight_values(doc, indicator);
    Some(Baseline {
        median: median(&values)?,
        mad: mad(&values)?,
        days: values.len() as u32,
    })
}

pub fn window_mean(
    doc: &Document,
    indicator: Indicator,
    end: NaiveDate,
    window_days: u32,
    min_days: u32,
) -> Option<f64> {
    let values = window_values(doc, indicator, end, window_days);
    if values.is_empty() || (values.len() as u32) < min_days {
        return None;
    }
    Some(values.iter().sum::<f64>() / values.len() as f64)
}

pub fn series(doc: &Document, indicator: Indicator, today: NaiveDate) -> Series {
    let first = [
        doc.checks.keys().next(),
        doc.pvt.keys().next(),
        doc.vision.keys().next(),
    ]
    .into_iter()
    .flatten()
    .min()
    .copied();
    let points = first
        .into_iter()
        .flat_map(|first| first.iter_days().take_while(|d| *d <= today))
        .map(|date| SeriesPoint {
            date,
            mission_day: mission_day(doc.settings.launch_date, date),
            value: value(doc, indicator, date),
            mean_7d: window_mean(doc, indicator, date, MEAN_WINDOW_DAYS, 1),
        })
        .collect();
    Series {
        indicator,
        baseline: baseline(doc, indicator),
        points,
    }
}
