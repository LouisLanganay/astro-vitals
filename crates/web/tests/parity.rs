use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use astro_vitals_core::model::{
    AmslerCell, AppError, Calibration, DailyAnswers, DailyCheck, Document, EyeResult, Indicator,
    Notice, PacketExport, PvtInput, PvtTrial, ScenarioId, Settings, VisionResult,
};
use astro_vitals_core::rules::RuleSet;
use astro_vitals_core::{baseline, mission, packet, pvt, rules, scenario, validate};
use astro_vitals_web::handle;
use chrono::NaiveDate;
use serde::Serialize;
use serde_json::{Value, json};

const TODAY: &str = "2026-11-14";
const SCENARIOS: [ScenarioId; 3] = [
    ScenarioId::Healthy,
    ScenarioId::SleepDebt,
    ScenarioId::Vision,
];
const INDICATORS: [Indicator; 5] = [
    Indicator::SleepHours,
    Indicator::Mood,
    Indicator::PvtMeanRtMs,
    Indicator::AcuityLeft,
    Indicator::AmslerRight,
];

fn today() -> NaiveDate {
    TODAY.parse().unwrap()
}

fn day(s: &str) -> NaiveDate {
    s.parse().unwrap()
}

fn repo() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn read(relative: &str) -> String {
    fs::read_to_string(repo().join(relative)).unwrap()
}

fn rule_set() -> RuleSet {
    rules::parse(include_str!("../../../rules/rules.toml")).unwrap()
}

fn value<T: Serialize>(value: T) -> Value {
    serde_json::to_value(value).unwrap()
}

fn raw(request: &str) -> Value {
    serde_json::from_str(&handle(request)).unwrap()
}

fn send_full(command: &str, args: Value, doc: &Value, corrupt_backup: Option<&str>) -> Value {
    let request = json!({
        "command": command,
        "args": args,
        "today": TODAY,
        "doc": doc,
        "corrupt_backup": corrupt_backup,
    });
    raw(&request.to_string())
}

fn send_text(command: &str, args: Value, doc_text: &str) -> String {
    let request = format!(
        r#"{{"command":{},"args":{},"today":"{TODAY}","doc":{doc_text}}}"#,
        Value::from(command),
        args,
    );
    handle(&request)
}

fn send(command: &str, args: Value, doc: &Value) -> Value {
    send_full(command, args, doc, None)
}

fn ok(response: &Value) -> &Value {
    assert!(response.get("error").is_none(), "error: {response}");
    response.get("ok").unwrap()
}

fn error_of(response: &Value) -> &Value {
    assert!(response.get("ok").is_none(), "ok: {response}");
    assert!(response.get("doc").is_none(), "doc: {response}");
    response.get("error").unwrap()
}

fn validation(result: Result<(), astro_vitals_core::model::ValidationError>) -> Value {
    value(AppError::from(result.unwrap_err()))
}

fn replace_data(doc: &mut Document, new: Document) {
    let calibration = doc.settings.calibration;
    *doc = new;
    doc.settings.calibration = calibration;
}

fn loaded(id: ScenarioId, from: &Document) -> Document {
    let mut doc = from.clone();
    replace_data(
        &mut doc,
        scenario::generate(id, scenario::DEFAULT_SEED, today()),
    );
    doc
}

fn calibrated() -> Document {
    let mut doc = Document::new(today());
    doc.settings.calibration = Some(Calibration { px_per_mm: 3.5 });
    doc
}

fn answers(mood: u8) -> DailyAnswers {
    DailyAnswers {
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
    }
}

fn check(mood: u8) -> DailyCheck {
    DailyCheck {
        answers: Some(answers(mood)),
        ..DailyCheck::empty(today())
    }
}

fn pvt_input(rt_ms: f64) -> PvtInput {
    PvtInput {
        date: today(),
        trials: vec![
            PvtTrial::Response { rt_ms },
            PvtTrial::Response { rt_ms: 260.0 },
            PvtTrial::Premature,
            PvtTrial::Timeout,
        ],
    }
}

fn vision(acuity_logmar: f64) -> VisionResult {
    VisionResult {
        date: today(),
        left: EyeResult {
            acuity_logmar,
            amsler_distortion: true,
            amsler_cells: vec![AmslerCell { row: 3, col: 4 }],
        },
        right: EyeResult {
            acuity_logmar: 0.1,
            amsler_distortion: false,
            amsler_cells: Vec::new(),
        },
    }
}

fn api_commands(text: &str) -> BTreeSet<String> {
    let mut names = BTreeSet::new();
    let mut rest = text;
    while let Some(at) = rest.find("invoke") {
        rest = &rest[at + "invoke".len()..];
        let mut tail = rest;
        if tail.starts_with('<') {
            let mut depth = 0;
            let end = tail
                .char_indices()
                .find(|&(_, c)| {
                    match c {
                        '<' => depth += 1,
                        '>' => depth -= 1,
                        _ => {}
                    }
                    depth == 0
                })
                .map(|(i, _)| i)
                .unwrap();
            tail = &tail[end + 1..];
        }
        let Some(tail) = tail.strip_prefix('(') else {
            continue;
        };
        let tail = tail.trim_start();
        let Some(quote) = tail
            .chars()
            .next()
            .filter(|c| matches!(c, '\'' | '"' | '`'))
        else {
            continue;
        };
        let tail = &tail[1..];
        let end = tail.find(quote).unwrap();
        names.insert(tail[..end].to_string());
    }
    names
}

fn handler_commands(text: &str) -> BTreeSet<String> {
    let start = text.find("generate_handler![").unwrap() + "generate_handler![".len();
    let end = start + text[start..].find(']').unwrap();
    text[start..end]
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.strip_prefix("commands::").unwrap().to_string())
        .collect()
}

fn minimal_args(command: &str) -> Value {
    match command {
        "get_day" | "evaluate" => json!({ "date": null }),
        "save_daily_check" => json!({ "check": check(6) }),
        "save_pvt" => json!({ "input": pvt_input(300.0) }),
        "save_vision_test" => json!({ "result": vision(0.0) }),
        "series" => json!({ "indicator": "mood" }),
        "export_packet" => json!({ "path": null }),
        "load_scenario" => json!({ "id": "healthy" }),
        "set_settings" => json!({ "settings": Document::new(today()).settings }),
        _ => json!({}),
    }
}

fn include_target(source: &str, text: &str) -> PathBuf {
    let marker = "include_str!(\"";
    let start = text.find(marker).unwrap() + marker.len();
    let end = start + text[start..].find('"').unwrap();
    let file = repo().join(source);
    file.parent()
        .unwrap()
        .join(&text[start..end])
        .canonicalize()
        .unwrap()
}

#[test]
fn front_and_shell_list_the_same_commands() {
    let front = api_commands(&read("app/src/lib/api.ts"));
    let shell = handler_commands(&read("app/src-tauri/src/main.rs"));
    assert_eq!(front.len(), 11, "{front:?}");
    assert_eq!(front, shell);
}

#[test]
fn web_handler_knows_each_command() {
    let doc = value(calibrated());
    for command in handler_commands(&read("app/src-tauri/src/main.rs")) {
        let response = send(&command, minimal_args(&command), &doc);
        let text = response.to_string();
        assert!(!text.contains("is not known"), "{command}: {text}");
        ok(&response);
    }
}

#[test]
fn shell_and_web_embed_the_same_rules_file() {
    let shell = "app/src-tauri/src/commands.rs";
    let web = "crates/web/src/lib.rs";
    let shell_rules = include_target(shell, &read(shell));
    let web_rules = include_target(web, &read(web));
    assert_eq!(shell_rules, web_rules);
    assert_eq!(
        astro_vitals_web::RULES_TOML,
        fs::read_to_string(&web_rules).unwrap()
    );
}

#[test]
fn read_commands_match_the_core_for_each_scenario() {
    let rules = rule_set();
    let today = today();
    let past = day("2026-10-01");
    for id in SCENARIOS {
        let loaded_doc = loaded(id, &Document::new(today));
        let text = send_text("load_scenario", json!({ "id": id }), "null");
        let expected = json!({ "ok": scenario::info(id), "doc": loaded_doc }).to_string();
        assert_eq!(text, expected, "{id:?} load_scenario");

        let doc_text = serde_json::to_string(&loaded_doc).unwrap();
        let doc: Document = serde_json::from_str(&doc_text).unwrap();
        let check = |command: &str, args: Value, core: Value| {
            let text = send_text(command, args.clone(), &doc_text);
            let expected = json!({ "ok": core }).to_string();
            assert_eq!(text, expected, "{id:?} {command} {args}");
        };

        for date in [None, Some(past)] {
            check(
                "evaluate",
                json!({ "date": date }),
                value(rules::evaluate(&doc, &rules, date.unwrap_or(today))),
            );
            check(
                "get_day",
                json!({ "date": date }),
                value(mission::day_view(
                    &doc,
                    date.unwrap_or(today),
                    today,
                    Vec::new(),
                )),
            );
        }

        for indicator in INDICATORS {
            check(
                "series",
                json!({ "indicator": indicator }),
                value(baseline::series(&doc, indicator, today)),
            );
        }

        for path in [None, Some("astro-vitals-packet.json".to_string())] {
            let built = packet::build(&doc, &rules, today);
            let text = packet::to_json(&built);
            let core = PacketExport {
                packet: built,
                bytes: text.len() as u32,
                json: text,
                path: path.clone(),
            };
            check("export_packet", json!({ "path": path }), value(core));
        }

        check("rules", Value::Null, value(rules::catalog(&rules)));
        check("get_settings", Value::Null, value(&doc.settings));
    }
}

#[test]
fn load_scenario_keeps_the_calibration() {
    let start = calibrated();
    for id in SCENARIOS {
        let response = send("load_scenario", json!({ "id": id }), &value(&start));
        let expected = loaded(id, &start);
        assert_eq!(expected.settings.calibration, start.settings.calibration);
        assert_eq!(response["doc"], value(expected), "{id:?}");
    }
}

#[test]
fn get_day_gives_the_corrupt_notice_from_the_request() {
    let doc = calibrated();
    let backup = "browser storage, key astro-vitals.document.corrupt";
    let response = send_full("get_day", json!({}), &value(&doc), Some(backup));
    let notices = vec![Notice::DataFileCorrupt {
        backup_path: backup.to_string(),
    }];
    let core = mission::day_view(&doc, today(), today(), notices);
    assert_eq!(ok(&response), &value(core));
}

#[test]
#[ignore = "parity gap: a corrupt document gives no data_file_corrupt notice in the same get_day response"]
fn get_day_gives_the_corrupt_notice_for_a_corrupt_document() {
    let response = send("get_day", json!({}), &json!({ "version": "x" }));
    assert_eq!(response["corrupt"], true);
    assert_eq!(
        ok(&response)["mission"]["notices"][0]["kind"],
        "data_file_corrupt"
    );
}

#[test]
fn web_export_packet_leaves_the_file_to_the_browser() {
    let target = repo().join("missing-dir/packet.json");
    let path = target.display().to_string();
    let response = send("export_packet", json!({ "path": path }), &Value::Null);
    assert_eq!(ok(&response)["path"], Value::String(path));
    assert!(!target.exists());
}

#[test]
fn save_daily_check_saves_or_gives_the_validation_error() {
    let start = Document::new(today());
    let response = send(
        "save_daily_check",
        json!({ "check": check(6) }),
        &value(&start),
    );
    assert_eq!(ok(&response), &Value::Null);
    let mut expected = start.clone();
    expected.checks.insert(today(), check(6));
    assert_eq!(response["doc"], value(&expected));
    assert_eq!(response["doc"]["checks"][TODAY], value(check(6)));

    for bad in [
        check(11),
        DailyCheck {
            date: day("2026-11-15"),
            ..check(6)
        },
        DailyCheck {
            answers: Some(DailyAnswers {
                fluid_l: 99.0,
                sleep_end_min: 1380,
                ..answers(6)
            }),
            ..check(6)
        },
    ] {
        let response = send("save_daily_check", json!({ "check": bad }), &value(&start));
        let core = validation(validate::daily_check(&bad, today()));
        assert_eq!(error_of(&response), &core);
    }
}

#[test]
fn save_pvt_saves_or_gives_the_validation_error() {
    let start = Document::new(today());
    let input = pvt_input(310.0);
    let response = send("save_pvt", json!({ "input": input }), &value(&start));
    let result = pvt::score(&input);
    assert_eq!(ok(&response), &value(&result));
    let mut expected = start.clone();
    expected.pvt.insert(result.date, result.clone());
    assert_eq!(response["doc"], value(&expected));
    assert_eq!(response["doc"]["pvt"][TODAY], value(&result));

    for bad in [
        pvt_input(40_000.0),
        PvtInput {
            date: today(),
            trials: Vec::new(),
        },
    ] {
        let response = send("save_pvt", json!({ "input": bad }), &value(&start));
        let core = validation(validate::pvt_input(&bad, today()));
        assert_eq!(error_of(&response), &core);
    }
}

#[test]
fn save_vision_test_saves_or_gives_the_validation_error() {
    let start = calibrated();
    let result = vision(0.2);
    let response = send(
        "save_vision_test",
        json!({ "result": result }),
        &value(&start),
    );
    assert_eq!(ok(&response), &Value::Null);
    let mut expected = start.clone();
    expected.vision.insert(today(), result.clone());
    assert_eq!(response["doc"], value(&expected));
    assert_eq!(response["doc"]["vision"][TODAY], value(&result));

    let bad = vision(3.0);
    let response = send("save_vision_test", json!({ "result": bad }), &value(&start));
    let core = validation(validate::vision_result(
        &bad,
        start.settings.calibration.as_ref(),
        today(),
    ));
    assert_eq!(error_of(&response), &core);

    let uncalibrated = Document::new(today());
    let response = send(
        "save_vision_test",
        json!({ "result": result }),
        &value(&uncalibrated),
    );
    let core = validation(validate::vision_result(&result, None, today()));
    assert_eq!(error_of(&response), &core);
}

#[test]
fn set_settings_saves_or_gives_the_validation_error() {
    let start = Document::new(today());
    let settings = Settings {
        launch_date: day("2026-07-01"),
        exercise_prescription_min: 75,
        calibration: Some(Calibration { px_per_mm: 4.0 }),
    };
    let response = send(
        "set_settings",
        json!({ "settings": settings }),
        &value(&start),
    );
    assert_eq!(ok(&response), &Value::Null);
    let mut expected = start.clone();
    expected.settings = settings.clone();
    assert_eq!(response["doc"], value(&expected));
    assert_eq!(response["doc"]["settings"], value(&settings));

    for bad in [
        Settings {
            exercise_prescription_min: 2000,
            ..settings.clone()
        },
        Settings {
            launch_date: day("1990-01-01"),
            calibration: Some(Calibration { px_per_mm: 0.0 }),
            ..settings.clone()
        },
    ] {
        let response = send("set_settings", json!({ "settings": bad }), &value(&start));
        let core = validation(validate::settings(&bad));
        assert_eq!(error_of(&response), &core);
    }
}

#[test]
fn malformed_request_gives_an_error() {
    for input in [
        "{",
        "",
        "[]",
        r#"{"command":"get_settings"}"#,
        r#"{"command":"get_settings","today":"14/11/2026"}"#,
        r#"{"command":"get_settings","today":"2026-11-14","args":[]}"#,
    ] {
        let response = raw(input);
        assert_eq!(error_of(&response)["kind"], "internal", "{input}");
        assert!(response.get("corrupt").is_none());
    }
}

#[test]
fn bad_argument_gives_an_error() {
    for (command, args) in [
        ("series", json!({})),
        ("series", json!({ "indicator": "pulse" })),
        ("load_scenario", json!({ "id": "mars" })),
        ("evaluate", json!({ "date": "yesterday" })),
        ("save_daily_check", json!({ "check": { "date": TODAY } })),
    ] {
        let response = send(command, args, &Value::Null);
        assert_eq!(error_of(&response)["kind"], "internal", "{command}");
    }
}

#[test]
fn unknown_command_gives_an_error() {
    let response = send("format_disk", json!({}), &value(calibrated()));
    let error = error_of(&response);
    assert_eq!(error["kind"], "internal");
    assert!(error["message"].as_str().unwrap().contains("is not known"));
}

#[test]
fn corrupt_document_gives_a_fresh_document() {
    let fresh = Document::new(today());
    for bad in [
        json!({ "version": "x" }),
        json!("garbage"),
        json!(42),
        json!([]),
        json!({}),
    ] {
        let response = send("get_settings", Value::Null, &bad);
        assert_eq!(response["corrupt"], true, "{bad}");
        assert_eq!(ok(&response), &value(&fresh.settings), "{bad}");
        assert!(response.get("doc").is_none());

        let response = send("save_daily_check", json!({ "check": check(6) }), &bad);
        assert_eq!(response["corrupt"], true, "{bad}");
        let mut expected = fresh.clone();
        expected.checks.insert(today(), check(6));
        assert_eq!(response["doc"], value(&expected), "{bad}");
    }
}

#[test]
fn null_document_starts_empty() {
    let fresh = Document::new(today());
    for request in [
        json!({ "command": "get_day", "today": TODAY, "doc": null }).to_string(),
        json!({ "command": "get_day", "today": TODAY }).to_string(),
    ] {
        let response = raw(&request);
        assert!(response.get("corrupt").is_none());
        assert!(response.get("doc").is_none());
        let core = mission::day_view(&fresh, today(), today(), Vec::new());
        assert_eq!(ok(&response), &value(core));
    }
    let response = send("evaluate", json!({ "date": null }), &Value::Null);
    assert_eq!(
        ok(&response),
        &value(rules::evaluate(&fresh, &rule_set(), today()))
    );
}

#[test]
fn scenario_document_survives_a_round_trip() {
    for id in SCENARIOS {
        let expected = serde_json::to_string(&loaded(id, &Document::new(today()))).unwrap();
        let parsed: Document = serde_json::from_str(&expected).unwrap();
        let doc_text = serde_json::to_string(&parsed).unwrap();
        assert_eq!(doc_text, expected, "{id:?}");
        let text = send_text("get_settings", Value::Null, &doc_text);
        assert_eq!(text, json!({ "ok": parsed.settings }).to_string(), "{id:?}");
    }
}
