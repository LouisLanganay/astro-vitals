use std::io;
use std::path::Path;
use std::sync::{Mutex, MutexGuard, PoisonError};

use astro_vitals_core::model::{
    AppError, Assessment, DailyCheck, DayView, Document, Indicator, Notice, Packet, PacketExport,
    PvtInput, PvtResult, RulesError, ScenarioId, ScenarioInfo, Series, Settings, VisionResult,
};
use astro_vitals_core::rules::{RuleCatalog, RuleSet};
use astro_vitals_core::{baseline, mission, packet, pvt, rules, scenario, validate};
use chrono::NaiveDate;
use tauri::State;

use crate::store::{Store, write_atomic};

pub const RULES_TOML: &str = include_str!("../../../rules/rules.toml");

pub struct AppState {
    pub store: Mutex<Store>,
    pub rules: Result<RuleSet, RulesError>,
}

impl AppState {
    pub fn load(data_dir: &Path) -> io::Result<AppState> {
        Ok(AppState {
            store: Mutex::new(Store::open(data_dir, today())?),
            rules: rules::parse(RULES_TOML),
        })
    }

    fn rules(&self) -> Result<&RuleSet, AppError> {
        self.rules.as_ref().map_err(|e| e.clone().into())
    }

    fn store(&self) -> MutexGuard<'_, Store> {
        self.store.lock().unwrap_or_else(PoisonError::into_inner)
    }

    fn update(&self, change: impl FnOnce(&mut Document)) -> Result<(), AppError> {
        let mut store = self.store();
        let mut doc = store.doc().clone();
        change(&mut doc);
        Ok(store.replace(doc)?)
    }

    fn get_day(&self, date: Option<NaiveDate>, today: NaiveDate) -> Result<DayView, AppError> {
        self.rules()?;
        let store = self.store();
        let notices = store
            .corrupt_backup()
            .map(|path| Notice::DataFileCorrupt {
                backup_path: path.display().to_string(),
            })
            .into_iter()
            .collect();
        Ok(mission::day_view(
            store.doc(),
            date.unwrap_or(today),
            today,
            notices,
        ))
    }

    fn save_daily_check(&self, check: DailyCheck, today: NaiveDate) -> Result<(), AppError> {
        self.rules()?;
        let launch = self.store().doc().settings.launch_date;
        validate::daily_check(&check, launch, today)?;
        self.update(|doc| {
            doc.checks.insert(check.date, check);
        })
    }

    fn save_pvt(&self, input: PvtInput, today: NaiveDate) -> Result<PvtResult, AppError> {
        self.rules()?;
        let launch = self.store().doc().settings.launch_date;
        validate::pvt_input(&input, launch, today)?;
        let result = pvt::score(&input);
        self.update(|doc| {
            doc.pvt.insert(result.date, result.clone());
        })?;
        Ok(result)
    }

    fn save_vision_test(&self, result: VisionResult, today: NaiveDate) -> Result<(), AppError> {
        self.rules()?;
        let settings = self.store().doc().settings.clone();
        validate::vision_result(
            &result,
            settings.calibration.as_ref(),
            settings.launch_date,
            today,
        )?;
        self.update(|doc| {
            doc.vision.insert(result.date, result);
        })
    }

    fn evaluate(&self, date: Option<NaiveDate>, today: NaiveDate) -> Result<Assessment, AppError> {
        let rules = self.rules()?;
        let store = self.store();
        Ok(rules::evaluate(store.doc(), rules, date.unwrap_or(today)))
    }

    fn series(&self, indicator: Indicator, today: NaiveDate) -> Result<Series, AppError> {
        self.rules()?;
        let store = self.store();
        Ok(baseline::series(store.doc(), indicator, today))
    }

    fn export_packet(
        &self,
        path: Option<String>,
        today: NaiveDate,
    ) -> Result<PacketExport, AppError> {
        let rules = self.rules()?;
        let packet = packet::build(self.store().doc(), rules, today);
        let json = packet::to_json(&packet);
        export(packet, json, path)
    }

    fn load_scenario(&self, id: ScenarioId, today: NaiveDate) -> Result<ScenarioInfo, AppError> {
        self.rules()?;
        let scenario = scenario::generate(id, scenario::DEFAULT_SEED, today);
        self.update(|doc| replace_data(doc, scenario))?;
        Ok(scenario::info(id))
    }

    fn get_settings(&self) -> Result<Settings, AppError> {
        self.rules()?;
        Ok(self.store().doc().settings.clone())
    }

    fn set_settings(&self, settings: Settings) -> Result<(), AppError> {
        self.rules()?;
        validate::settings(&settings)?;
        self.update(|doc| doc.settings = settings)
    }

    fn rule_catalog(&self) -> Result<RuleCatalog, AppError> {
        Ok(rules::catalog(self.rules()?))
    }
}

fn replace_data(doc: &mut Document, new: Document) {
    let calibration = doc.settings.calibration;
    *doc = new;
    doc.settings.calibration = calibration;
}

fn export(packet: Packet, json: String, path: Option<String>) -> Result<PacketExport, AppError> {
    if let Some(path) = &path {
        write_atomic(Path::new(path), json.as_bytes())?;
    }
    Ok(PacketExport {
        packet,
        bytes: json.len() as u32,
        json,
        path,
    })
}

pub fn today() -> NaiveDate {
    chrono::Local::now().date_naive()
}

#[tauri::command]
pub fn get_day(state: State<'_, AppState>, date: Option<NaiveDate>) -> Result<DayView, AppError> {
    state.get_day(date, today())
}

#[tauri::command]
pub fn save_daily_check(state: State<'_, AppState>, check: DailyCheck) -> Result<(), AppError> {
    state.save_daily_check(check, today())
}

#[tauri::command]
pub fn save_pvt(state: State<'_, AppState>, input: PvtInput) -> Result<PvtResult, AppError> {
    state.save_pvt(input, today())
}

#[tauri::command]
pub fn save_vision_test(state: State<'_, AppState>, result: VisionResult) -> Result<(), AppError> {
    state.save_vision_test(result, today())
}

#[tauri::command]
pub fn evaluate(
    state: State<'_, AppState>,
    date: Option<NaiveDate>,
) -> Result<Assessment, AppError> {
    state.evaluate(date, today())
}

#[tauri::command]
pub fn series(state: State<'_, AppState>, indicator: Indicator) -> Result<Series, AppError> {
    state.series(indicator, today())
}

#[tauri::command]
pub fn export_packet(
    state: State<'_, AppState>,
    path: Option<String>,
) -> Result<PacketExport, AppError> {
    state.export_packet(path, today())
}

#[tauri::command]
pub fn load_scenario(state: State<'_, AppState>, id: ScenarioId) -> Result<ScenarioInfo, AppError> {
    state.load_scenario(id, today())
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<Settings, AppError> {
    state.get_settings()
}

#[tauri::command]
pub fn set_settings(state: State<'_, AppState>, settings: Settings) -> Result<(), AppError> {
    state.set_settings(settings)
}

#[tauri::command]
pub fn rules(state: State<'_, AppState>) -> Result<RuleCatalog, AppError> {
    state.rule_catalog()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::DATA_FILE;
    use crate::store::tests::{names, temp_dir};
    use astro_vitals_core::model::{Calibration, DailyAnswers, EyeResult, Level};
    use std::fs;

    fn day(s: &str) -> NaiveDate {
        s.parse().unwrap()
    }

    fn state(dir: &Path, today: NaiveDate) -> AppState {
        AppState {
            store: Mutex::new(Store::open(dir, today).unwrap()),
            rules: Err(RulesError {
                rule_id: Some("bad_rule".into()),
                message: "no source".into(),
            }),
        }
    }

    fn ready(dir: &Path, today: NaiveDate) -> AppState {
        AppState {
            rules: rules::parse(RULES_TOML),
            ..state(dir, today)
        }
    }

    #[test]
    fn scenario_flow_with_the_embedded_rules() {
        let dir = temp_dir("flow");
        let today = day("2026-11-14");
        let state = ready(&dir, today);
        assert_eq!(state.rules.as_ref().err(), None);

        let info = state.load_scenario(ScenarioId::SleepDebt, today).unwrap();
        let view = state.get_day(None, today).unwrap();
        assert_eq!(view.date, today);
        assert_eq!(view.mission_day, info.mission_day);
        assert_eq!(view.mission.mission_day, info.mission_day);

        let expected = info
            .expected
            .iter()
            .filter(|e| e.first_mission_day <= view.mission_day)
            .max_by_key(|e| e.first_mission_day)
            .unwrap();
        let assessment = state.evaluate(None, today).unwrap();
        assert_eq!(assessment.date, today);
        assert_eq!(assessment.level, expected.level);

        let series = state.series(Indicator::SleepHours, today).unwrap();
        assert_eq!(series.indicator, Indicator::SleepHours);
        assert!(series.baseline.is_some());
        assert_eq!(series.points.last().unwrap().date, today);
        assert!(series.points.iter().any(|p| p.value.is_some()));

        let preview = state.export_packet(None, today).unwrap();
        assert_eq!(preview.path, None);
        assert_eq!(preview.bytes as usize, preview.json.len());
        assert!(preview.bytes as usize <= packet::MAX_BYTES);
        assert_eq!(preview.packet.level, assessment.level);
        assert_eq!(names(&dir), [DATA_FILE]);

        let file = dir.join("packet.json").display().to_string();
        let written = state.export_packet(Some(file.clone()), today).unwrap();
        assert_eq!(written.path, Some(file.clone()));
        assert_eq!(written.json, preview.json);
        assert_eq!(fs::read_to_string(&file).unwrap(), written.json);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn daily_check_is_validated_then_saved() {
        let dir = temp_dir("daily");
        let today = day("2026-11-14");
        let state = ready(&dir, today);
        let check = |mood: u8| DailyCheck {
            answers: Some(DailyAnswers {
                sleep_start_min: 1380,
                sleep_end_min: 420,
                sleep_quality: 7,
                sleep_aid: false,
                mood,
                stress: 2,
                tiredness: 3,
                workload: 5,
                fluid_l: 3.0,
                exercise_resistive_min: 45,
                exercise_aerobic_min: 45,
            }),
            ..DailyCheck::empty(today)
        };

        let Err(AppError::Validation { errors }) = state.save_daily_check(check(11), today) else {
            panic!("a scale above 10 must give a validation error");
        };
        let fields: Vec<&str> = errors.iter().map(|e| e.field.as_str()).collect();
        assert_eq!(fields, ["answers.mood"]);
        assert!(names(&dir).is_empty());
        assert_eq!(
            state.get_day(None, today).unwrap().check,
            DailyCheck::empty(today)
        );

        state.save_daily_check(check(6), today).unwrap();
        let stored = Store::open(&dir, today).unwrap();
        assert_eq!(stored.doc().checks[&today], check(6));

        state.save_daily_check(check(4), today).unwrap();
        let stored = Store::open(&dir, today).unwrap();
        assert_eq!(stored.doc().checks.len(), 1);
        assert_eq!(stored.doc().checks[&today], check(4));
        let view = state.get_day(None, today).unwrap();
        assert_eq!(view.check, check(4));
        assert_eq!(view.mission.streak, 1);
        assert_eq!(names(&dir), [DATA_FILE]);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn each_command_gives_the_rules_error() {
        let dir = temp_dir("rules-error");
        let today = day("2026-11-14");
        let state = state(&dir, today);
        let eye = EyeResult {
            acuity_logmar: 0.0,
            amsler_distortion: false,
            amsler_cells: Vec::new(),
        };
        let vision = VisionResult {
            date: today,
            left: eye.clone(),
            right: eye,
        };
        let pvt = PvtInput {
            date: today,
            trials: Vec::new(),
        };
        let settings = Document::new(today).settings;
        let path = dir.join("packet.json").display().to_string();
        let errors = [
            state.get_day(None, today).err(),
            state
                .save_daily_check(DailyCheck::empty(today), today)
                .err(),
            state.save_pvt(pvt, today).err(),
            state.save_vision_test(vision, today).err(),
            state.evaluate(None, today).err(),
            state.series(Indicator::Mood, today).err(),
            state.export_packet(Some(path), today).err(),
            state.load_scenario(ScenarioId::Healthy, today).err(),
            state.get_settings().err(),
            state.set_settings(settings).err(),
            state.rule_catalog().err(),
        ];
        let expected = AppError::Rules {
            rule_id: Some("bad_rule".into()),
            message: "no source".into(),
        };
        for error in errors {
            assert_eq!(error, Some(expected.clone()));
        }
        assert!(names(&dir).is_empty());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn rule_catalog_lists_the_embedded_rules() {
        let dir = temp_dir("catalog");
        let today = day("2026-11-14");
        let state = ready(&dir, today);
        let catalog = state.rule_catalog().unwrap();
        let set = state.rules().unwrap();
        assert_eq!(catalog.drift, set.drift);
        let ids: Vec<&str> = catalog.rules.iter().map(|r| r.id.as_str()).collect();
        let expected: Vec<&str> = set.rules.iter().map(|r| r.id.as_str()).collect();
        assert_eq!(ids, expected);
        assert!(names(&dir).is_empty());
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn new_data_keeps_the_calibration() {
        let dir = temp_dir("scenario");
        let today = day("2026-11-14");
        let state = state(&dir, today);
        let calibration = Some(Calibration { px_per_mm: 3.5 });
        state
            .update(|doc| {
                doc.settings.calibration = calibration;
                doc.checks.insert(today, DailyCheck::empty(today));
            })
            .unwrap();
        let mut new = Document::new(day("2026-07-01"));
        new.settings.exercise_prescription_min = 60;
        let mut expected = new.clone();
        expected.settings.calibration = calibration;
        state.update(|doc| replace_data(doc, new)).unwrap();
        assert_eq!(state.store().doc(), &expected);
        assert_eq!(Store::open(&dir, today).unwrap().doc(), &expected);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn export_writes_only_to_a_writable_path() {
        let dir = temp_dir("export");
        let packet = Packet {
            version: 1,
            date: day("2026-11-14"),
            mission_day: 3,
            level: Level::Ok,
            fired: Vec::new(),
            flagged: Vec::new(),
            symptoms: Vec::new(),
            red_flags: Vec::new(),
            baselines: Vec::new(),
        };
        let json = String::from("{\"level\":\"ok\"}");

        let preview = export(packet.clone(), json.clone(), None).unwrap();
        assert_eq!(preview.path, None);
        assert_eq!(preview.json, json);
        assert_eq!(preview.bytes as usize, json.len());
        assert!(names(&dir).is_empty());

        let missing = dir.join("missing").join("packet.json");
        let error = export(
            packet.clone(),
            json.clone(),
            Some(missing.display().to_string()),
        );
        assert!(matches!(error, Err(AppError::Storage { .. })));
        assert!(names(&dir).is_empty());

        let file = dir.join("packet.json").display().to_string();
        let written = export(packet.clone(), json.clone(), Some(file.clone())).unwrap();
        assert_eq!(written.path, Some(file.clone()));
        assert_eq!(written.packet, packet);
        assert_eq!(fs::read_to_string(&file).unwrap(), json);
        assert_eq!(names(&dir), ["packet.json"]);
        fs::remove_dir_all(&dir).unwrap();
    }
}
