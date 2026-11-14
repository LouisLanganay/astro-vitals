use chrono::{Days, NaiveDate, TimeDelta};

use crate::model::{
    AmslerCell, BASELINE_DAYS, BodyRegion, DailyAnswers, DailyCheck, Document, ExpectedLevel,
    EyeResult, Level, MINUTES_PER_DAY, PvtResult, SCALE_MAX, ScenarioId, ScenarioInfo, Symptom,
    SymptomKind, VISION_INTERVAL_DAYS, VisionResult,
};

pub const DEFAULT_SEED: u64 = 2026;
pub const MISSION_DAYS: i32 = 120;
pub const SLEEP_DECREASE_DAY: i32 = 40;
pub const HEADACHE_DAY: i32 = 50;
pub const DISTORTION_DAY: i32 = 70;

const SLEEP_H: f64 = 7.5;
const MAX_DEBT_H: f64 = 2.9;
const STRAIN_START_DEBT_H: f64 = 1.6;

struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    fn range(&mut self, low: f64, high: f64) -> f64 {
        let unit = (self.next() >> 11) as f64 / (1u64 << 53) as f64;
        low + (high - low) * unit
    }
}

pub fn info(id: ScenarioId) -> ScenarioInfo {
    let (description, expected): (&str, &[(Level, i32)]) = match id {
        ScenarioId::Healthy => (
            "All indicators stay near the pre-flight baseline. The level is ok on each day.",
            &[(Level::Ok, 0)],
        ),
        ScenarioId::SleepDebt => (
            "Sleep decreases from mission day 40. A headache starts on mission day 50 and continues.",
            &[
                (Level::Ok, 0),
                (Level::SelfCare, 50),
                (Level::TellCmo, HEADACHE_DAY + 7),
            ],
        ),
        ScenarioId::Vision => (
            "The Amsler grid of the right eye shows distortion in each weekly test from week 10 (mission day 70).",
            &[
                (Level::Ok, 0),
                (Level::TellCmo, DISTORTION_DAY),
                (
                    Level::FlightSurgeon,
                    DISTORTION_DAY + VISION_INTERVAL_DAYS as i32,
                ),
            ],
        ),
    };
    ScenarioInfo {
        id,
        description: description.into(),
        mission_day: MISSION_DAYS,
        expected: expected
            .iter()
            .map(|&(level, first_mission_day)| ExpectedLevel {
                level,
                first_mission_day,
            })
            .collect(),
    }
}

fn sleep_debt_h(day: i32) -> f64 {
    let fast = f64::from((day - SLEEP_DECREASE_DAY + 1).clamp(0, 4));
    let slow = f64::from((day - SLEEP_DECREASE_DAY - 3).max(0));
    (0.35 * fast + 0.03 * slow).min(MAX_DEBT_H)
}

fn scale(value: f64) -> u8 {
    value.floor().clamp(0.0, f64::from(SCALE_MAX)) as u8
}

fn tenth(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

pub fn generate(id: ScenarioId, seed: u64, today: NaiveDate) -> Document {
    let launch = today - Days::new(MISSION_DAYS as u64);
    let mut doc = Document::new(today);
    doc.settings.launch_date = launch;
    let mut rng = Rng(seed);

    for day in -(BASELINE_DAYS as i32)..MISSION_DAYS {
        let date = launch + TimeDelta::days(i64::from(day));
        let debt = if id == ScenarioId::SleepDebt {
            sleep_debt_h(day)
        } else {
            0.0
        };
        let strain = (debt - STRAIN_START_DEBT_H).max(0.0);

        let sleep_start_min = 1330 + rng.range(0.0, 41.0) as u16;
        let sleep_min = ((SLEEP_H - debt + rng.range(-0.25, 0.25)) * 60.0).round() as u16;
        let answers = DailyAnswers {
            sleep_start_min,
            sleep_end_min: (sleep_start_min + sleep_min) % MINUTES_PER_DAY,
            sleep_quality: scale(7.0 - debt + rng.range(0.0, 2.0)),
            sleep_aid: debt > 2.0,
            mood: scale(7.0 - 2.0 * strain + rng.range(0.0, 2.0)),
            stress: scale(2.0 + 1.5 * strain + rng.range(0.0, 2.0)),
            tiredness: scale(2.0 + 2.5 * strain + rng.range(0.0, 2.0)),
            workload: scale(4.0 + rng.range(0.0, 3.0)),
            fluid_l: tenth(2.8 + rng.range(0.0, 0.6)),
            exercise_resistive_min: 50 + rng.range(0.0, 16.0) as u16,
            exercise_aerobic_min: 45 + rng.range(0.0, 16.0) as u16,
        };
        let mut check = DailyCheck {
            date,
            answers: Some(answers),
            symptoms: Vec::new(),
            red_flags: Vec::new(),
        };
        if id == ScenarioId::SleepDebt && day >= HEADACHE_DAY {
            let treated = day >= HEADACHE_DAY + 3;
            check.symptoms.push(Symptom {
                kind: SymptomKind::Headache,
                severity: if day < HEADACHE_DAY + 7 { 1 } else { 2 },
                region: BodyRegion::Head,
                treated,
                improved: treated.then_some(day < HEADACHE_DAY + 10),
            });
        }
        doc.checks.insert(date, check);

        doc.pvt.insert(
            date,
            PvtResult {
                date,
                stimuli: 60 + rng.range(0.0, 10.0) as u32,
                mean_rt_ms: Some(tenth(235.0 + 22.0 * debt + rng.range(0.0, 20.0))),
                lapses: (2.0 * debt + rng.range(0.0, 3.0)) as u32,
                false_starts: rng.range(0.0, 2.0) as u32,
            },
        );

        if day.rem_euclid(VISION_INTERVAL_DAYS as i32) == 0 {
            let healthy = || EyeResult {
                acuity_logmar: 0.0,
                amsler_distortion: false,
                amsler_cells: Vec::new(),
            };
            let right = if id == ScenarioId::Vision && day >= DISTORTION_DAY {
                EyeResult {
                    acuity_logmar: 0.1,
                    amsler_distortion: true,
                    amsler_cells: [(9, 11), (10, 11), (10, 12)]
                        .map(|(row, col)| AmslerCell { row, col })
                        .to_vec(),
                }
            } else {
                healthy()
            };
            doc.vision.insert(
                date,
                VisionResult {
                    date,
                    left: healthy(),
                    right,
                },
            );
        }
    }
    doc
}
