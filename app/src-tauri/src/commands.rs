use std::io;
use std::path::Path;
use std::sync::Mutex;

use astro_vitals_core::model::{
    AppError, Assessment, DailyCheck, DayView, Indicator, PacketExport, PvtInput, PvtResult,
    RulesError, ScenarioId, ScenarioInfo, Series, Settings, VisionResult,
};
use astro_vitals_core::rules::RuleSet;
use chrono::NaiveDate;
use tauri::State;

use crate::store::Store;

pub const RULES_TOML: &str = include_str!("../../../rules/rules.toml");

pub struct AppState {
    pub store: Mutex<Store>,
    pub rules: Result<RuleSet, RulesError>,
}

impl AppState {
    pub fn load(data_dir: &Path) -> io::Result<AppState> {
        let _ = RULES_TOML;
        Ok(AppState {
            store: Mutex::new(Store::open(data_dir, today())?),
            rules: Err(RulesError {
                rule_id: None,
                message: "not implemented".into(),
            }),
        })
    }
}

pub fn today() -> NaiveDate {
    chrono::Local::now().date_naive()
}

fn not_implemented(command: &str) -> AppError {
    AppError::Internal {
        message: format!("{command}: not implemented"),
    }
}

#[tauri::command]
pub fn get_day(state: State<'_, AppState>, date: Option<NaiveDate>) -> Result<DayView, AppError> {
    let _ = (state, date);
    Err(not_implemented("get_day"))
}

#[tauri::command]
pub fn save_daily_check(state: State<'_, AppState>, check: DailyCheck) -> Result<(), AppError> {
    let _ = (state, check);
    Err(not_implemented("save_daily_check"))
}

#[tauri::command]
pub fn save_pvt(state: State<'_, AppState>, input: PvtInput) -> Result<PvtResult, AppError> {
    let _ = (state, input);
    Err(not_implemented("save_pvt"))
}

#[tauri::command]
pub fn save_vision_test(state: State<'_, AppState>, result: VisionResult) -> Result<(), AppError> {
    let _ = (state, result);
    Err(not_implemented("save_vision_test"))
}

#[tauri::command]
pub fn evaluate(
    state: State<'_, AppState>,
    date: Option<NaiveDate>,
) -> Result<Assessment, AppError> {
    let _ = (state, date);
    Err(not_implemented("evaluate"))
}

#[tauri::command]
pub fn series(state: State<'_, AppState>, indicator: Indicator) -> Result<Series, AppError> {
    let _ = (state, indicator);
    Err(not_implemented("series"))
}

#[tauri::command]
pub fn export_packet(
    state: State<'_, AppState>,
    path: Option<String>,
) -> Result<PacketExport, AppError> {
    let _ = (state, path);
    Err(not_implemented("export_packet"))
}

#[tauri::command]
pub fn load_scenario(state: State<'_, AppState>, id: ScenarioId) -> Result<ScenarioInfo, AppError> {
    let _ = (state, id);
    Err(not_implemented("load_scenario"))
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, AppError> {
    let _ = state;
    Err(not_implemented("get_settings"))
}

#[tauri::command]
pub fn set_settings(state: State<'_, AppState>, settings: Settings) -> Result<(), AppError> {
    let _ = (state, settings);
    Err(not_implemented("set_settings"))
}
