use chrono::NaiveDate;

use crate::model::{Baseline, Document, Indicator, Series};

pub const MAD_SCALE: f64 = 1.4826;

pub fn median(values: &[f64]) -> Option<f64> {
    let _ = values;
    todo!()
}

pub fn mad(values: &[f64]) -> Option<f64> {
    let _ = values;
    todo!()
}

pub fn min_scale(indicator: Indicator) -> f64 {
    let _ = indicator;
    todo!()
}

pub fn robust_score(value: f64, median: f64, mad: f64, min_scale: f64) -> f64 {
    let _ = (value, median, mad, min_scale);
    todo!()
}

pub fn sleep_hours(start_min: u16, end_min: u16) -> f64 {
    let _ = (start_min, end_min);
    todo!()
}

pub fn value(doc: &Document, indicator: Indicator, date: NaiveDate) -> Option<f64> {
    let _ = (doc, indicator, date);
    todo!()
}

pub fn preflight_days(doc: &Document) -> u32 {
    let _ = doc;
    todo!()
}

pub fn baseline(doc: &Document, indicator: Indicator) -> Option<Baseline> {
    let _ = (doc, indicator);
    todo!()
}

pub fn window_mean(
    doc: &Document,
    indicator: Indicator,
    end: NaiveDate,
    window_days: u32,
    min_days: u32,
) -> Option<f64> {
    let _ = (doc, indicator, end, window_days, min_days);
    todo!()
}

pub fn series(doc: &Document, indicator: Indicator, today: NaiveDate) -> Series {
    let _ = (doc, indicator, today);
    todo!()
}
