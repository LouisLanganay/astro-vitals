use serde::{Deserialize, Serialize};

pub type MissionDay = i32;

pub const MINUTES_PER_DAY: u16 = 1440;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Level {
    Ok,
    SelfCare,
    TellCmo,
    FlightSurgeon,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SymptomKind {
    Headache,
    Congestion,
    SkinRash,
    BackPain,
    Nausea,
    Dizziness,
    VisionChange,
    Other,
    ChestPain,
    Fainting,
    SuddenVisionLoss,
    Fever,
    BloodInUrine,
    NeckFaceSwelling,
}

static SYMPTOM_KINDS: [SymptomKind; 14] = [
    SymptomKind::Headache,
    SymptomKind::Congestion,
    SymptomKind::SkinRash,
    SymptomKind::BackPain,
    SymptomKind::Nausea,
    SymptomKind::Dizziness,
    SymptomKind::VisionChange,
    SymptomKind::Other,
    SymptomKind::ChestPain,
    SymptomKind::Fainting,
    SymptomKind::SuddenVisionLoss,
    SymptomKind::Fever,
    SymptomKind::BloodInUrine,
    SymptomKind::NeckFaceSwelling,
];

impl SymptomKind {
    pub fn is_red_flag(self) -> bool {
        matches!(
            self,
            Self::ChestPain
                | Self::Fainting
                | Self::SuddenVisionLoss
                | Self::Fever
                | Self::BloodInUrine
                | Self::NeckFaceSwelling
        )
    }

    pub fn all() -> &'static [SymptomKind] {
        &SYMPTOM_KINDS
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BodyRegion {
    Head,
    Eyes,
    Neck,
    Chest,
    Abdomen,
    Back,
    Arms,
    Hands,
    Legs,
    Feet,
}

static BODY_REGIONS: [BodyRegion; 10] = [
    BodyRegion::Head,
    BodyRegion::Eyes,
    BodyRegion::Neck,
    BodyRegion::Chest,
    BodyRegion::Abdomen,
    BodyRegion::Back,
    BodyRegion::Arms,
    BodyRegion::Hands,
    BodyRegion::Legs,
    BodyRegion::Feet,
];

impl BodyRegion {
    pub fn all() -> &'static [BodyRegion] {
        &BODY_REGIONS
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Symptom {
    pub kind: SymptomKind,
    pub severity: u8,
    pub region: BodyRegion,
    pub treated: bool,
    pub improved: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DailyCheck {
    pub day: MissionDay,
    pub sleep_start_min: u16,
    pub sleep_end_min: u16,
    pub sleep_quality: u8,
    pub sleep_aid: bool,
    pub mood: u8,
    pub stress: u8,
    pub tiredness: u8,
    pub workload: u8,
    pub fluid_l: f64,
    pub resistive_min: u16,
    pub aerobic_min: u16,
    #[serde(default)]
    pub symptoms: Vec<Symptom>,
}

impl DailyCheck {
    pub fn sleep_hours(&self) -> f64 {
        let start = i32::from(self.sleep_start_min);
        let end = i32::from(self.sleep_end_min);
        let minutes = (end - start).rem_euclid(i32::from(MINUTES_PER_DAY));
        f64::from(minutes) / 60.0
    }

    pub fn exercise_min(&self) -> f64 {
        f64::from(self.resistive_min) + f64::from(self.aerobic_min)
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PvtSubmission {
    pub day: MissionDay,
    pub reaction_times_ms: Vec<f64>,
    pub early_inputs: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PvtResult {
    pub day: MissionDay,
    pub trials: u32,
    pub mean_rt_ms: f64,
    pub lapses: u32,
    pub false_starts: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Eye {
    Left,
    Right,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EyeResult {
    pub acuity_logmar: f64,
    pub amsler_distortion: bool,
    #[serde(default)]
    pub amsler_cells: Vec<[u8; 2]>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VisionTest {
    pub day: MissionDay,
    pub left: EyeResult,
    pub right: EyeResult,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Settings {
    pub launch_date: String,
    pub exercise_prescription_min: f64,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            launch_date: "2027-01-01".to_string(),
            exercise_prescription_min: 90.0,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct MissionData {
    #[serde(default)]
    pub checks: Vec<DailyCheck>,
    #[serde(default)]
    pub pvt: Vec<PvtResult>,
    #[serde(default)]
    pub vision: Vec<VisionTest>,
}

impl MissionData {
    pub fn upsert_check(&mut self, check: DailyCheck) {
        match self.checks.iter().position(|c| c.day == check.day) {
            Some(index) => self.checks[index] = check,
            None => {
                self.checks.push(check);
                self.checks.sort_by_key(|c| c.day);
            }
        }
    }

    pub fn upsert_pvt(&mut self, result: PvtResult) {
        match self.pvt.iter().position(|p| p.day == result.day) {
            Some(index) => self.pvt[index] = result,
            None => {
                self.pvt.push(result);
                self.pvt.sort_by_key(|p| p.day);
            }
        }
    }

    pub fn upsert_vision(&mut self, test: VisionTest) {
        match self.vision.iter().position(|v| v.day == test.day) {
            Some(index) => self.vision[index] = test,
            None => {
                self.vision.push(test);
                self.vision.sort_by_key(|v| v.day);
            }
        }
    }

    pub fn check(&self, day: MissionDay) -> Option<&DailyCheck> {
        self.checks.iter().find(|c| c.day == day)
    }

    pub fn pvt_result(&self, day: MissionDay) -> Option<&PvtResult> {
        self.pvt.iter().find(|p| p.day == day)
    }

    pub fn vision_test(&self, day: MissionDay) -> Option<&VisionTest> {
        self.vision.iter().find(|v| v.day == day)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    Low,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Indicator {
    SleepHours,
    SleepQuality,
    Mood,
    Stress,
    Tiredness,
    Workload,
    FluidL,
    ExerciseMin,
    PvtMeanRt,
    PvtLapses,
    Symptom,
    RedFlag,
    Vision,
}

static NUMERIC_INDICATORS: [Indicator; 10] = [
    Indicator::SleepHours,
    Indicator::SleepQuality,
    Indicator::Mood,
    Indicator::Stress,
    Indicator::Tiredness,
    Indicator::Workload,
    Indicator::FluidL,
    Indicator::ExerciseMin,
    Indicator::PvtMeanRt,
    Indicator::PvtLapses,
];

impl Indicator {
    pub fn numeric() -> &'static [Indicator] {
        &NUMERIC_INDICATORS
    }

    pub fn is_numeric(self) -> bool {
        !matches!(self, Self::Symptom | Self::RedFlag | Self::Vision)
    }

    pub fn bad_direction(self) -> Direction {
        match self {
            Self::SleepHours
            | Self::SleepQuality
            | Self::Mood
            | Self::FluidL
            | Self::ExerciseMin => Direction::Low,
            _ => Direction::High,
        }
    }

    pub fn min_scale(self) -> f64 {
        match self {
            Self::SleepHours => 0.25,
            Self::SleepQuality
            | Self::Mood
            | Self::Stress
            | Self::Tiredness
            | Self::Workload => 0.5,
            Self::FluidL => 0.1,
            Self::ExerciseMin => 5.0,
            Self::PvtMeanRt => 10.0,
            Self::PvtLapses => 0.5,
            Self::Symptom | Self::RedFlag | Self::Vision => 1.0,
        }
    }

    pub fn value(self, data: &MissionData, day: MissionDay) -> Option<f64> {
        match self {
            Self::SleepHours => data.check(day).map(DailyCheck::sleep_hours),
            Self::SleepQuality => data.check(day).map(|c| f64::from(c.sleep_quality)),
            Self::Mood => data.check(day).map(|c| f64::from(c.mood)),
            Self::Stress => data.check(day).map(|c| f64::from(c.stress)),
            Self::Tiredness => data.check(day).map(|c| f64::from(c.tiredness)),
            Self::Workload => data.check(day).map(|c| f64::from(c.workload)),
            Self::FluidL => data.check(day).map(|c| c.fluid_l),
            Self::ExerciseMin => data.check(day).map(DailyCheck::exercise_min),
            Self::PvtMeanRt => {
                let pvt = data.pvt_result(day)?;
                Some(pvt.mean_rt_ms).filter(|v| *v > 0.0)
            }
            Self::PvtLapses => data.pvt_result(day).map(|p| f64::from(p.lapses)),
            Self::Symptom | Self::RedFlag | Self::Vision => None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IndicatorState {
    NotEnoughData,
    Ok,
    Flagged,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IndicatorStatus {
    pub indicator: Indicator,
    pub state: IndicatorState,
    pub level: Level,
    pub baseline_median: Option<f64>,
    pub baseline_mad: Option<f64>,
    pub mean_7d: Option<f64>,
    pub drift_score: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FiredRule {
    pub rule_id: String,
    pub indicator: Indicator,
    pub level: Level,
    pub action: String,
    pub explanation: String,
    pub source: String,
    pub body_region: Option<BodyRegion>,
    pub symptom: Option<SymptomKind>,
    pub value: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Assessment {
    pub day: MissionDay,
    pub level: Level,
    pub fired: Vec<FiredRule>,
    pub indicators: Vec<IndicatorStatus>,
    pub drift_enabled: bool,
    pub preflight_days: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SeriesPoint {
    pub day: MissionDay,
    pub value: Option<f64>,
    pub mean_7d: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Series {
    pub indicator: Indicator,
    pub points: Vec<SeriesPoint>,
    pub baseline_median: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn check(day: MissionDay, start: u16, end: u16) -> DailyCheck {
        DailyCheck {
            day,
            sleep_start_min: start,
            sleep_end_min: end,
            sleep_quality: 7,
            sleep_aid: false,
            mood: 7,
            stress: 3,
            tiredness: 3,
            workload: 5,
            fluid_l: 2.5,
            resistive_min: 40,
            aerobic_min: 50,
            symptoms: Vec::new(),
        }
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-9
    }

    #[test]
    fn sleep_through_midnight() {
        assert!(close(check(0, 1380, 420).sleep_hours(), 8.0));
        assert!(close(check(0, 1410, 0).sleep_hours(), 0.5));
    }

    #[test]
    fn sleep_on_same_side_of_midnight() {
        assert!(close(check(0, 60, 450).sleep_hours(), 6.5));
        assert!(close(check(0, 300, 300).sleep_hours(), 0.0));
    }

    #[test]
    fn upsert_replaces_same_day() {
        let mut data = MissionData::default();
        data.upsert_check(check(2, 1380, 420));
        data.upsert_check(check(0, 1380, 420));
        data.upsert_check(check(2, 1380, 300));
        assert_eq!(data.checks.len(), 2);
        assert_eq!(data.checks[0].day, 0);
        assert_eq!(data.check(2).map(|c| c.sleep_end_min), Some(300));
    }

    #[test]
    fn indicator_values() {
        let mut data = MissionData::default();
        data.upsert_check(check(1, 1380, 420));
        data.upsert_pvt(PvtResult {
            day: 1,
            trials: 40,
            mean_rt_ms: 280.0,
            lapses: 2,
            false_starts: 1,
        });
        assert_eq!(Indicator::ExerciseMin.value(&data, 1), Some(90.0));
        assert_eq!(Indicator::PvtLapses.value(&data, 1), Some(2.0));
        assert_eq!(Indicator::PvtMeanRt.value(&data, 1), Some(280.0));
        assert_eq!(Indicator::Mood.value(&data, 2), None);
        assert_eq!(Indicator::Symptom.value(&data, 1), None);
    }

    #[test]
    fn red_flags_and_lists() {
        let red: Vec<SymptomKind> = SymptomKind::all()
            .iter()
            .copied()
            .filter(|k| k.is_red_flag())
            .collect();
        assert_eq!(red.len(), 6);
        assert!(!SymptomKind::Headache.is_red_flag());
        assert_eq!(BodyRegion::all().len(), 10);
        assert_eq!(Indicator::numeric().len(), 10);
        assert!(Indicator::numeric().iter().all(|i| i.is_numeric()));
    }

    #[test]
    fn level_order() {
        assert!(Level::Ok < Level::SelfCare);
        assert!(Level::SelfCare < Level::TellCmo);
        assert!(Level::TellCmo < Level::FlightSurgeon);
    }
}
