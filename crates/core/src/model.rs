use std::collections::BTreeMap;
use std::fmt;

use chrono::{Days, NaiveDate};
use serde::{Deserialize, Serialize};

pub const DOCUMENT_VERSION: u32 = 1;
pub const PACKET_VERSION: u32 = 1;
pub const BASELINE_DAYS: u32 = 14;
pub const MIN_PREFLIGHT_DAYS: u32 = 7;
pub const MEAN_WINDOW_DAYS: u32 = 7;
pub const VISION_INTERVAL_DAYS: u32 = 7;
pub const DEFAULT_EXERCISE_MIN: u32 = 90;
pub const MINUTES_PER_DAY: u16 = 1440;
pub const SCALE_MAX: u8 = 10;
pub const SEVERITY_MIN: u8 = 1;
pub const SEVERITY_MAX: u8 = 3;
pub const FLUID_MAX_L: f64 = 15.0;
pub const CARD_WIDTH_MM: f64 = 85.6;
pub const VIEWING_DISTANCE_CM: f64 = 40.0;
pub const LOGMAR_STEP: f64 = 0.1;
pub const ACUITY_TRIALS_PER_SIZE: u32 = 5;
pub const ACUITY_MIN_CORRECT: u32 = 3;
pub const AMSLER_GRID_SIZE: u8 = 20;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Level {
    Ok,
    SelfCare,
    TellCmo,
    FlightSurgeon,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IndicatorState {
    NotEnoughData,
    Ok,
    SelfCare,
    TellCmo,
    FlightSurgeon,
}

impl From<Level> for IndicatorState {
    fn from(level: Level) -> Self {
        match level {
            Level::Ok => Self::Ok,
            Level::SelfCare => Self::SelfCare,
            Level::TellCmo => Self::TellCmo,
            Level::FlightSurgeon => Self::FlightSurgeon,
        }
    }
}

impl IndicatorState {
    pub fn level(self) -> Option<Level> {
        match self {
            Self::NotEnoughData => None,
            Self::Ok => Some(Level::Ok),
            Self::SelfCare => Some(Level::SelfCare),
            Self::TellCmo => Some(Level::TellCmo),
            Self::FlightSurgeon => Some(Level::FlightSurgeon),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
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

impl BodyRegion {
    pub const ALL: [BodyRegion; 10] = [
        Self::Head,
        Self::Eyes,
        Self::Neck,
        Self::Chest,
        Self::Abdomen,
        Self::Back,
        Self::Arms,
        Self::Hands,
        Self::Legs,
        Self::Feet,
    ];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
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
}

impl SymptomKind {
    pub const ALL: [SymptomKind; 8] = [
        Self::Headache,
        Self::Congestion,
        Self::SkinRash,
        Self::BackPain,
        Self::Nausea,
        Self::Dizziness,
        Self::VisionChange,
        Self::Other,
    ];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RedFlagKind {
    ChestPain,
    Fainting,
    SuddenVisionLoss,
    Fever,
    BloodInUrine,
    OneSidedSwelling,
}

impl RedFlagKind {
    pub const ALL: [RedFlagKind; 6] = [
        Self::ChestPain,
        Self::Fainting,
        Self::SuddenVisionLoss,
        Self::Fever,
        Self::BloodInUrine,
        Self::OneSidedSwelling,
    ];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    Low,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
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
    PvtMeanRtMs,
    PvtLapses,
    PvtFalseStarts,
    AcuityLeft,
    AcuityRight,
    AmslerLeft,
    AmslerRight,
}

impl Indicator {
    pub const ALL: [Indicator; 15] = [
        Self::SleepHours,
        Self::SleepQuality,
        Self::Mood,
        Self::Stress,
        Self::Tiredness,
        Self::Workload,
        Self::FluidL,
        Self::ExerciseMin,
        Self::PvtMeanRtMs,
        Self::PvtLapses,
        Self::PvtFalseStarts,
        Self::AcuityLeft,
        Self::AcuityRight,
        Self::AmslerLeft,
        Self::AmslerRight,
    ];

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

    pub fn body_region(self) -> BodyRegion {
        match self {
            Self::FluidL => BodyRegion::Abdomen,
            Self::ExerciseMin => BodyRegion::Legs,
            Self::AcuityLeft | Self::AcuityRight | Self::AmslerLeft | Self::AmslerRight => {
                BodyRegion::Eyes
            }
            _ => BodyRegion::Head,
        }
    }

    pub fn unit(self) -> &'static str {
        match self {
            Self::SleepHours => "h",
            Self::SleepQuality | Self::Mood | Self::Stress | Self::Tiredness | Self::Workload => {
                "0-10"
            }
            Self::FluidL => "L",
            Self::ExerciseMin => "min",
            Self::PvtMeanRtMs => "ms",
            Self::PvtLapses | Self::PvtFalseStarts => "count",
            Self::AcuityLeft | Self::AcuityRight => "logMAR",
            Self::AmslerLeft | Self::AmslerRight => "0-1",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Symptom {
    pub kind: SymptomKind,
    pub severity: u8,
    pub region: BodyRegion,
    pub treated: bool,
    pub improved: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DailyAnswers {
    pub sleep_start_min: u16,
    pub sleep_end_min: u16,
    pub sleep_quality: u8,
    pub sleep_aid: bool,
    pub mood: u8,
    pub stress: u8,
    pub tiredness: u8,
    pub workload: u8,
    pub fluid_l: f64,
    pub exercise_resistive_min: u16,
    pub exercise_aerobic_min: u16,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DailyCheck {
    pub date: NaiveDate,
    pub answers: Option<DailyAnswers>,
    pub symptoms: Vec<Symptom>,
    pub red_flags: Vec<RedFlagKind>,
}

impl DailyCheck {
    pub fn empty(date: NaiveDate) -> Self {
        Self {
            date,
            answers: None,
            symptoms: Vec::new(),
            red_flags: Vec::new(),
        }
    }

    pub fn is_complete(&self) -> bool {
        self.answers.is_some()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum PvtTrial {
    Response { rt_ms: f64 },
    Premature,
    Timeout,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PvtInput {
    pub date: NaiveDate,
    pub trials: Vec<PvtTrial>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PvtResult {
    pub date: NaiveDate,
    pub stimuli: u32,
    pub mean_rt_ms: Option<f64>,
    pub lapses: u32,
    pub false_starts: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Calibration {
    pub px_per_mm: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AmslerCell {
    pub row: u8,
    pub col: u8,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EyeResult {
    pub acuity_logmar: f64,
    pub amsler_distortion: bool,
    pub amsler_cells: Vec<AmslerCell>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VisionResult {
    pub date: NaiveDate,
    pub left: EyeResult,
    pub right: EyeResult,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Settings {
    pub launch_date: NaiveDate,
    pub exercise_prescription_min: u32,
    pub calibration: Option<Calibration>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Document {
    pub version: u32,
    pub settings: Settings,
    pub checks: BTreeMap<NaiveDate, DailyCheck>,
    pub pvt: BTreeMap<NaiveDate, PvtResult>,
    pub vision: BTreeMap<NaiveDate, VisionResult>,
}

impl Document {
    pub fn new(today: NaiveDate) -> Self {
        Self {
            version: DOCUMENT_VERSION,
            settings: Settings {
                launch_date: today + Days::new(BASELINE_DAYS as u64),
                exercise_prescription_min: DEFAULT_EXERCISE_MIN,
                calibration: None,
            },
            checks: BTreeMap::new(),
            pvt: BTreeMap::new(),
            vision: BTreeMap::new(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(tag = "type", content = "value", rename_all = "snake_case")]
pub enum RuleSubject {
    Indicator(Indicator),
    Symptom(SymptomKind),
    RedFlag(RedFlagKind),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FiredRule {
    pub rule_id: String,
    pub level: Level,
    pub action: String,
    pub explanation: String,
    pub body_region: Option<BodyRegion>,
    pub source: String,
    pub subject: RuleSubject,
    pub value: Option<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Baseline {
    pub median: f64,
    pub mad: f64,
    pub days: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IndicatorStatus {
    pub indicator: Indicator,
    pub region: BodyRegion,
    pub state: IndicatorState,
    pub value: Option<f64>,
    pub mean_7d: Option<f64>,
    pub baseline: Option<Baseline>,
    pub drift_score: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegionStatus {
    pub region: BodyRegion,
    pub level: Level,
    pub symptoms: Vec<Symptom>,
    pub indicators: Vec<IndicatorStatus>,
    pub fired: Vec<FiredRule>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Assessment {
    pub date: NaiveDate,
    pub mission_day: i32,
    pub level: Level,
    pub fired: Vec<FiredRule>,
    pub indicators: Vec<IndicatorStatus>,
    pub regions: Vec<RegionStatus>,
    pub preflight_days: u32,
    pub drift_enabled: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct SeriesPoint {
    pub date: NaiveDate,
    pub mission_day: i32,
    pub value: Option<f64>,
    pub mean_7d: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Series {
    pub indicator: Indicator,
    pub baseline: Option<Baseline>,
    pub points: Vec<SeriesPoint>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskKind {
    DailyCheck,
    Pvt,
    VisionTest,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct DueTask {
    pub kind: TaskKind,
    pub optional: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Notice {
    DataFileCorrupt { backup_path: String },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MissionStatus {
    pub today: NaiveDate,
    pub mission_day: i32,
    pub due: Vec<DueTask>,
    pub streak: u32,
    pub notices: Vec<Notice>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DayView {
    pub date: NaiveDate,
    pub mission_day: i32,
    pub check: DailyCheck,
    pub pvt: Option<PvtResult>,
    pub vision: Option<VisionResult>,
    pub mission: MissionStatus,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PacketIndicator {
    pub indicator: Indicator,
    pub values: Vec<Option<f64>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IndicatorBaseline {
    pub indicator: Indicator,
    pub baseline: Baseline,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DatedSymptom {
    pub date: NaiveDate,
    pub symptom: Symptom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct DatedRedFlag {
    pub date: NaiveDate,
    pub kind: RedFlagKind,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Packet {
    pub version: u32,
    pub date: NaiveDate,
    pub mission_day: i32,
    pub level: Level,
    pub fired: Vec<FiredRule>,
    pub flagged: Vec<PacketIndicator>,
    pub symptoms: Vec<DatedSymptom>,
    pub red_flags: Vec<DatedRedFlag>,
    pub baselines: Vec<IndicatorBaseline>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PacketExport {
    pub packet: Packet,
    pub json: String,
    pub bytes: u32,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScenarioId {
    Healthy,
    SleepDebt,
    Vision,
}

impl ScenarioId {
    pub const ALL: [ScenarioId; 3] = [Self::Healthy, Self::SleepDebt, Self::Vision];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExpectedLevel {
    pub level: Level,
    pub first_mission_day: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ScenarioInfo {
    pub id: ScenarioId,
    pub description: String,
    pub mission_day: i32,
    pub expected: Vec<ExpectedLevel>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidationError {
    pub errors: Vec<FieldError>,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for (i, e) in self.errors.iter().enumerate() {
            if i > 0 {
                write!(f, "; ")?;
            }
            write!(f, "{}: {}", e.field, e.message)?;
        }
        Ok(())
    }
}

impl std::error::Error for ValidationError {}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RulesError {
    pub rule_id: Option<String>,
    pub message: String,
}

impl fmt::Display for RulesError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.rule_id {
            Some(id) => write!(f, "rule {id}: {}", self.message),
            None => write!(f, "rules: {}", self.message),
        }
    }
}

impl std::error::Error for RulesError {}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum AppError {
    Validation {
        errors: Vec<FieldError>,
    },
    Rules {
        rule_id: Option<String>,
        message: String,
    },
    Storage {
        message: String,
    },
    Internal {
        message: String,
    },
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Validation { errors } => ValidationError {
                errors: errors.clone(),
            }
            .fmt(f),
            Self::Rules { rule_id, message } => RulesError {
                rule_id: rule_id.clone(),
                message: message.clone(),
            }
            .fmt(f),
            Self::Storage { message } => write!(f, "storage: {message}"),
            Self::Internal { message } => write!(f, "internal: {message}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<ValidationError> for AppError {
    fn from(e: ValidationError) -> Self {
        Self::Validation { errors: e.errors }
    }
}

impl From<RulesError> for AppError {
    fn from(e: RulesError) -> Self {
        Self::Rules {
            rule_id: e.rule_id,
            message: e.message,
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        Self::Storage {
            message: e.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn date(s: &str) -> NaiveDate {
        s.parse().unwrap()
    }

    #[test]
    fn levels_are_in_order() {
        assert!(Level::Ok < Level::SelfCare);
        assert!(Level::SelfCare < Level::TellCmo);
        assert!(Level::TellCmo < Level::FlightSurgeon);
    }

    #[test]
    fn wire_names_are_snake_case() {
        assert_eq!(json!(Level::FlightSurgeon), json!("flight_surgeon"));
        assert_eq!(
            json!(IndicatorState::NotEnoughData),
            json!("not_enough_data")
        );
        assert_eq!(json!(Indicator::PvtMeanRtMs), json!("pvt_mean_rt_ms"));
        assert_eq!(json!(ScenarioId::SleepDebt), json!("sleep_debt"));
        assert_eq!(
            json!(PvtTrial::Response { rt_ms: 250.0 }),
            json!({"kind": "response", "rt_ms": 250.0})
        );
        assert_eq!(json!(PvtTrial::Timeout), json!({"kind": "timeout"}));
        assert_eq!(
            json!(RuleSubject::Symptom(SymptomKind::SkinRash)),
            json!({"type": "symptom", "value": "skin_rash"})
        );
        assert_eq!(
            json!(AppError::Validation {
                errors: vec![FieldError {
                    field: "answers.mood".into(),
                    message: "must be 0 to 10".into()
                }]
            }),
            json!({"kind": "validation", "errors": [{"field": "answers.mood", "message": "must be 0 to 10"}]})
        );
        assert_eq!(
            json!(Notice::DataFileCorrupt {
                backup_path: "x".into()
            }),
            json!({"kind": "data_file_corrupt", "backup_path": "x"})
        );
    }

    #[test]
    fn document_round_trip_keeps_date_keys() {
        let today = date("2026-11-14");
        let mut doc = Document::new(today);
        assert_eq!(doc.settings.launch_date, date("2026-11-28"));
        let mut check = DailyCheck::empty(today);
        check.symptoms.push(Symptom {
            kind: SymptomKind::Headache,
            severity: 2,
            region: BodyRegion::Head,
            treated: true,
            improved: Some(false),
        });
        assert!(!check.is_complete());
        doc.checks.insert(today, check);
        let text = serde_json::to_string(&doc).unwrap();
        assert!(text.contains("\"2026-11-14\":{"));
        let back: Document = serde_json::from_str(&text).unwrap();
        assert_eq!(back, doc);
    }

    #[test]
    fn each_indicator_has_static_data() {
        for i in Indicator::ALL {
            assert!(!i.unit().is_empty());
            let _ = (i.bad_direction(), i.body_region());
        }
        assert_eq!(Indicator::SleepHours.bad_direction(), Direction::Low);
        assert_eq!(Indicator::AmslerLeft.body_region(), BodyRegion::Eyes);
    }
}
