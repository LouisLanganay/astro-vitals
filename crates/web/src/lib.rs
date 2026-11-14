use std::sync::OnceLock;

use astro_vitals_core::model::{
    AppError, DailyCheck, Document, Indicator, Notice, PacketExport, PvtInput, RulesError,
    ScenarioId, Settings, VisionResult,
};
use astro_vitals_core::rules::RuleSet;
use astro_vitals_core::{baseline, mission, packet, pvt, rules, scenario, validate};
use chrono::NaiveDate;
use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::{Map, Value, json};

pub const RULES_TOML: &str = include_str!("../../../rules/rules.toml");
pub const CORRUPT_LABEL: &str = "browser storage, key astro-vitals.document.corrupt";

#[derive(Deserialize)]
pub struct Request {
    pub command: String,
    #[serde(default)]
    pub args: Option<Map<String, Value>>,
    pub today: NaiveDate,
    #[serde(default)]
    pub doc: Option<Value>,
    #[serde(default)]
    pub corrupt_backup: Option<String>,
}

struct Session {
    doc: Document,
    changed: bool,
    corrupt: bool,
    corrupt_backup: Option<String>,
    today: NaiveDate,
}

fn rule_set() -> Result<&'static RuleSet, AppError> {
    static RULES: OnceLock<Result<RuleSet, RulesError>> = OnceLock::new();
    RULES
        .get_or_init(|| rules::parse(RULES_TOML))
        .as_ref()
        .map_err(|e| e.clone().into())
}

fn arg<T: DeserializeOwned>(args: &Map<String, Value>, name: &str) -> Result<T, AppError> {
    let value = args.get(name).cloned().unwrap_or(Value::Null);
    serde_json::from_value(value).map_err(|e| AppError::Internal {
        message: format!("The argument {name} is not correct: {e}"),
    })
}

fn to_value<T: serde::Serialize>(value: T) -> Result<Value, AppError> {
    serde_json::to_value(value).map_err(|e| AppError::Internal {
        message: e.to_string(),
    })
}

impl Session {
    fn open(request: &Request) -> Session {
        let parsed = request
            .doc
            .clone()
            .filter(|v| !v.is_null())
            .map(serde_json::from_value::<Document>);
        let (doc, corrupt) = match parsed {
            Some(Ok(doc)) => (doc, false),
            Some(Err(_)) => (Document::new(request.today), true),
            None => (Document::new(request.today), false),
        };
        Session {
            doc,
            changed: false,
            corrupt,
            corrupt_backup: request.corrupt_backup.clone(),
            today: request.today,
        }
    }

    fn replace(&mut self, doc: Document) {
        self.doc = doc;
        self.changed = true;
    }

    fn run(&mut self, command: &str, args: &Map<String, Value>) -> Result<Value, AppError> {
        let rules = rule_set()?;
        let today = self.today;
        match command {
            "get_day" => {
                let date: Option<NaiveDate> = arg(args, "date")?;
                let notices = self
                    .corrupt_backup
                    .clone()
                    .or_else(|| self.corrupt.then(|| CORRUPT_LABEL.to_string()))
                    .map(|backup_path| Notice::DataFileCorrupt { backup_path })
                    .into_iter()
                    .collect();
                to_value(mission::day_view(
                    &self.doc,
                    date.unwrap_or(today),
                    today,
                    notices,
                ))
            }
            "save_daily_check" => {
                let check: DailyCheck = arg(args, "check")?;
                validate::daily_check(&check, today)?;
                let mut doc = self.doc.clone();
                doc.checks.insert(check.date, check);
                self.replace(doc);
                Ok(Value::Null)
            }
            "save_pvt" => {
                let input: PvtInput = arg(args, "input")?;
                validate::pvt_input(&input, today)?;
                let result = pvt::score(&input);
                let mut doc = self.doc.clone();
                doc.pvt.insert(result.date, result.clone());
                self.replace(doc);
                to_value(result)
            }
            "save_vision_test" => {
                let result: VisionResult = arg(args, "result")?;
                validate::vision_result(&result, self.doc.settings.calibration.as_ref(), today)?;
                let mut doc = self.doc.clone();
                doc.vision.insert(result.date, result);
                self.replace(doc);
                Ok(Value::Null)
            }
            "evaluate" => {
                let date: Option<NaiveDate> = arg(args, "date")?;
                to_value(rules::evaluate(&self.doc, rules, date.unwrap_or(today)))
            }
            "series" => {
                let indicator: Indicator = arg(args, "indicator")?;
                to_value(baseline::series(&self.doc, indicator, today))
            }
            "export_packet" => {
                let path: Option<String> = arg(args, "path")?;
                let packet = packet::build(&self.doc, rules, today);
                let json = packet::to_json(&packet);
                to_value(PacketExport {
                    packet,
                    bytes: json.len() as u32,
                    json,
                    path,
                })
            }
            "load_scenario" => {
                let id: ScenarioId = arg(args, "id")?;
                let calibration = self.doc.settings.calibration;
                let mut doc = scenario::generate(id, scenario::DEFAULT_SEED, today);
                doc.settings.calibration = calibration;
                self.replace(doc);
                to_value(scenario::info(id))
            }
            "get_settings" => to_value(self.doc.settings.clone()),
            "rules" => to_value(rules::catalog(rules)),
            "set_settings" => {
                let settings: Settings = arg(args, "settings")?;
                validate::settings(&settings)?;
                let mut doc = self.doc.clone();
                doc.settings = settings;
                self.replace(doc);
                Ok(Value::Null)
            }
            other => Err(AppError::Internal {
                message: format!("The command {other} is not known."),
            }),
        }
    }
}

pub fn handle(input: &str) -> String {
    let request: Request = match serde_json::from_str(input) {
        Ok(request) => request,
        Err(e) => {
            let error = AppError::Internal {
                message: format!("The request is not correct: {e}"),
            };
            return json!({ "error": error }).to_string();
        }
    };
    let mut session = Session::open(&request);
    let args = request.args.clone().unwrap_or_default();
    let result = session.run(&request.command, &args);
    let mut response = match result {
        Ok(value) => json!({ "ok": value }),
        Err(error) => json!({ "error": error }),
    };
    if session.changed {
        response["doc"] = json!(session.doc);
    }
    if session.corrupt {
        response["corrupt"] = Value::Bool(true);
    }
    response.to_string()
}

#[unsafe(no_mangle)]
extern "C" fn alloc(len: usize) -> *mut u8 {
    Box::into_raw(vec![0u8; len].into_boxed_slice()) as *mut u8
}

#[unsafe(no_mangle)]
unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    drop(unsafe { Box::from_raw(std::ptr::slice_from_raw_parts_mut(ptr, len)) });
}

#[unsafe(no_mangle)]
unsafe extern "C" fn call(ptr: *const u8, len: usize) -> u64 {
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let output = match std::str::from_utf8(bytes) {
        Ok(input) => handle(input),
        Err(e) => json!({ "error": AppError::Internal { message: e.to_string() } }).to_string(),
    };
    let output = output.into_bytes().into_boxed_slice();
    let out_len = output.len() as u64;
    let out_ptr = Box::into_raw(output) as *mut u8 as usize as u64;
    (out_ptr << 32) | out_len
}

#[cfg(test)]
mod tests {
    use super::*;

    fn send(command: &str, args: Value, doc: &Value) -> Value {
        let request = json!({
            "command": command,
            "args": args,
            "today": "2026-11-14",
            "doc": doc,
        });
        serde_json::from_str(&handle(&request.to_string())).unwrap()
    }

    #[test]
    fn scenario_then_daily_check_changes_the_document() {
        let response = send("load_scenario", json!({ "id": "sleep_debt" }), &Value::Null);
        assert_eq!(response["ok"]["id"], "sleep_debt");
        let doc = response["doc"].clone();
        assert!(doc.is_object());

        let assessment = send("evaluate", json!({ "date": null }), &doc);
        assert!(assessment["ok"]["level"].is_string());
        assert!(assessment.get("doc").is_none());

        let view = send("get_day", json!({ "date": null }), &doc);
        assert_eq!(view["ok"]["date"], "2026-11-14");

        let check = json!({
            "date": "2026-11-14",
            "answers": {
                "sleep_start_min": 1380, "sleep_end_min": 420, "sleep_quality": 7,
                "sleep_aid": false, "mood": 6, "stress": 2, "tiredness": 3, "workload": 5,
                "fluid_l": 3.0, "exercise_resistive_min": 45, "exercise_aerobic_min": 45
            },
            "symptoms": [],
            "red_flags": []
        });
        let saved = send("save_daily_check", json!({ "check": check }), &doc);
        assert_eq!(saved["ok"], Value::Null);
        assert_eq!(saved["doc"]["checks"]["2026-11-14"], check);

        let mut bad = check.clone();
        bad["answers"]["mood"] = json!(11);
        let refused = send("save_daily_check", json!({ "check": bad }), &doc);
        assert_eq!(refused["error"]["kind"], "validation");
        assert!(refused.get("doc").is_none());

        let catalog = send("rules", Value::Null, &doc);
        assert!(catalog.get("ok").is_some_and(|v| !v.is_null()));
        assert!(catalog.get("doc").is_none());

        let packet = send("export_packet", json!({ "path": "p.json" }), &doc);
        assert_eq!(packet["ok"]["path"], "p.json");
        assert!(packet["ok"]["bytes"].as_u64().unwrap() as usize <= packet::MAX_BYTES);
    }

    #[test]
    fn corrupt_document_gives_a_new_document() {
        let response = send("get_settings", Value::Null, &json!({ "version": "x" }));
        assert_eq!(response["corrupt"], true);
        assert!(response["ok"]["launch_date"].is_string());
    }

    #[test]
    fn unknown_command_and_bad_request_give_an_error() {
        let response = send("format_disk", json!({}), &Value::Null);
        assert_eq!(response["error"]["kind"], "internal");
        let bad: Value = serde_json::from_str(&handle("{")).unwrap();
        assert_eq!(bad["error"]["kind"], "internal");
    }

    #[test]
    fn memory_cycle() {
        let input = json!({ "command": "get_settings", "today": "2026-11-14" }).to_string();
        let ptr = alloc(input.len());
        unsafe {
            std::ptr::copy_nonoverlapping(input.as_ptr(), ptr, input.len());
            let packed = call(ptr, input.len());
            dealloc(ptr, input.len());
            let len = (packed & 0xffff_ffff) as usize;
            assert!(len > 0);
        }
    }
}
